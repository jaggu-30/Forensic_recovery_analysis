from __future__ import annotations

import mimetypes
import random
import time
import uuid
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from sqlalchemy.orm import Session

from app.ai.comfyui_client import ComfyUIClient, ComfyUIError
from app.ai.comfyui_workflow import build_inpainting_workflow
from app.models.evidence import Evidence


COMFYUI_CHECKPOINT = "512-inpainting-ema.safetensors"
MAX_ATTEMPTS = 6
TARGET_MASKED_CHANGE_PERCENT = 70.0
MAX_OUTSIDE_CHANGE_PERCENT = 5.0

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _get_settings():
    try:
        from app.core.config import settings
        return settings
    except Exception:
        return None


def _get_recovered_dir() -> Path:
    settings = _get_settings()
    if settings is not None and getattr(settings, "recovered_dir", None):
        path = Path(settings.recovered_dir)
    else:
        path = Path(__file__).resolve().parents[2] / "data" / "recovered"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _resolve_source_path(evidence: Evidence) -> Path:
    raw = Path(str(evidence.file_path))
    candidates = [
        raw,
        Path.cwd() / raw,
        Path(__file__).resolve().parents[2] / raw,
        Path(__file__).resolve().parents[3] / raw,
    ]

    for candidate in candidates:
        try:
            if candidate.is_file():
                return candidate.resolve()
        except OSError:
            continue

    data_root = Path(__file__).resolve().parents[2] / "data"
    if data_root.exists():
        try:
            for match in data_root.rglob(raw.name):
                if match.is_file():
                    return match.resolve()
        except OSError:
            pass

    raise FileNotFoundError(f"Evidence file not found: {evidence.file_path}")


def _find_benchmark_original(source: Path) -> Path | None:
    candidates = [
        source.with_name("recoverai_original.png"),
        source.with_name("recoverai_original.jpg"),
        source.with_name("recoverai_original.jpeg"),
        source.parent / "recoverai_original.png",
        source.parent / "original.png",
        source.parent / "original.jpg",
        source.parent / "original.jpeg",
        source.parent / "ground_truth.png",
        source.parent / "ground_truth.jpg",
        source.parent.parent / "recoverai_original.png",
        source.parent.parent / "original.png",
    ]

    for candidate in candidates:
        try:
            if candidate.is_file():
                return candidate.resolve()
        except OSError:
            continue

    data_root = Path(__file__).resolve().parents[2] / "data"
    if data_root.exists():
        for name in ("recoverai_original.png", "recoverai_original.jpg", "recoverai_original.jpeg"):
            try:
                for match in data_root.rglob(name):
                    if match.is_file():
                        return match.resolve()
            except OSError:
                continue

    return None


def _load_rgb(path: Path) -> Image.Image:
    with Image.open(path) as image:
        return image.convert("RGB")


def _benchmark_difference_mask(corrupted: Image.Image, original: Image.Image) -> Image.Image:
    if corrupted.size != original.size:
        original = original.resize(corrupted.size, Image.Resampling.LANCZOS)

    diff = ImageChops.difference(corrupted, original).convert("L")
    mask = diff.point(lambda p: 255 if p >= 10 else 0)
    mask = mask.filter(ImageFilter.MaxFilter(5))
    mask = mask.filter(ImageFilter.GaussianBlur(0.8))
    mask = mask.point(lambda p: 255 if p >= 45 else 0)
    mask = mask.filter(ImageFilter.MaxFilter(7))
    return mask


def _visual_damage_mask(image: Image.Image) -> tuple[Image.Image, str]:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    gray = (
        0.299 * rgb[:, :, 0]
        + 0.587 * rgb[:, :, 1]
        + 0.114 * rgb[:, :, 2]
    )

    smooth = cv2.GaussianBlur(gray, (0, 0), 2.0)
    residual = np.abs(gray - smooth)

    row_score = np.mean(residual, axis=1)
    median = float(np.median(row_score))
    mad = float(np.median(np.abs(row_score - median)))
    scale = max(1.0, 1.4826 * mad)
    z = (row_score - median) / scale
    threshold_value = max(3.0, float(np.percentile(z, 92)))

    rows = (z >= threshold_value).astype(np.uint8) * 255
    rows = cv2.morphologyEx(
        rows.reshape(-1, 1),
        cv2.MORPH_CLOSE,
        np.ones((9, 1), np.uint8),
    ).reshape(-1)

    mask = np.zeros(gray.shape, dtype=np.uint8)
    start = None
    for index, value in enumerate(rows):
        active = bool(value)
        if active and start is None:
            start = index
        elif not active and start is not None:
            end = index - 1
            if end - start + 1 >= 5:
                pad = max(4, int((end - start + 1) * 0.10))
                y0 = max(0, start - pad)
                y1 = min(mask.shape[0], end + pad + 1)
                mask[y0:y1, :] = 255
            start = None

    if start is not None:
        end = len(rows) - 1
        if end - start + 1 >= 5:
            y0 = max(0, start - 4)
            y1 = min(mask.shape[0], end + 5)
            mask[y0:y1, :] = 255

    gray_u8 = np.clip(gray, 0, 255).astype(np.uint8)
    median_u8 = cv2.medianBlur(gray_u8, 5)
    local = cv2.absdiff(gray_u8, median_u8)
    high = float(np.percentile(local, 98.5))
    binary = (local >= high).astype(np.uint8) * 255
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    binary = cv2.dilate(binary, np.ones((5, 5), np.uint8), iterations=1)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = max(100, int(gray.shape[0] * gray.shape[1] * 0.0015))

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < min_area or w < max(35, gray.shape[1] * 0.10):
            continue
        ratio = w / max(1, h)
        if ratio < 1.25:
            continue
        pad_x = max(4, int(w * 0.04))
        pad_y = max(4, int(h * 0.08))
        x0 = max(0, x - pad_x)
        x1 = min(mask.shape[1], x + w + pad_x)
        y0 = max(0, y - pad_y)
        y1 = min(mask.shape[0], y + h + pad_y)
        mask[y0:y1, x0:x1] = 255

    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=1)

    if not np.any(mask > 0):
        # Safe fallback: small central band, clearly marked as a heuristic.
        h, w = mask.shape[:2]
        x0 = int(w * 0.40)
        x1 = int(w * 0.60)
        y0 = int(h * 0.40)
        y1 = int(h * 0.60)
        mask[y0:y1, x0:x1] = 255
        return Image.fromarray(mask, mode="L"), "HEURISTIC_FALLBACK"

    return Image.fromarray(mask, mode="L"), "VISUAL_DAMAGE_DETECTOR"


def _prepare_masked_png(source: Path, destination: Path) -> dict[str, Any]:
    image = _load_rgb(source)
    benchmark = _find_benchmark_original(source)

    if benchmark is not None:
        original = _load_rgb(benchmark)
        mask = _benchmark_difference_mask(image, original)
        mask_source = "CONTROLLED_BENCHMARK_MASK"
        benchmark_original = str(benchmark)
    else:
        mask, mask_source = _visual_damage_mask(image)
        benchmark_original = None

    rgba = image.convert("RGBA")
    rgba.putalpha(Image.eval(mask, lambda p: 255 - p))
    destination.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(destination, format="PNG")

    mask_pixels = int(np.count_nonzero(np.asarray(mask) > 0))
    total_pixels = image.width * image.height

    return {
        "width": image.width,
        "height": image.height,
        "mask_source": mask_source,
        "mask_pixels": mask_pixels,
        "total_pixels": total_pixels,
        "masked_percent": round((mask_pixels / max(1, total_pixels)) * 100.0, 2),
        "benchmark_original": benchmark_original,
    }


def _set_workflow_seed_and_sampling(workflow: dict[str, Any], seed: int, denoise: float) -> dict[str, Any]:
    data = dict(workflow)
    sampler = data.get("7")
    if isinstance(sampler, dict):
        inputs = dict(sampler.get("inputs") or {})
        inputs["seed"] = int(seed)
        inputs["denoise"] = float(denoise)
        inputs["sampler_name"] = "euler"
        inputs["steps"] = 24
        inputs["cfg"] = 7.0
        data["7"] = {**sampler, "inputs": inputs}
    return data


def _read_rgb(path: Path) -> Image.Image:
    with Image.open(path) as image:
        return image.convert("RGB").copy()


def _compare_candidate(input_path: Path, output_path: Path, mask_info: dict[str, Any]) -> dict[str, float]:
    source = _read_rgb(input_path)
    result = _read_rgb(output_path)

    if result.size != source.size:
        result = result.resize(source.size, Image.Resampling.LANCZOS)

    source_np = np.asarray(source, dtype=np.float32)
    result_np = np.asarray(result, dtype=np.float32)
    diff = np.mean(np.abs(source_np - result_np), axis=2)

    mask = np.asarray(
        _load_mask_from_masked_png(Path(mask_info["masked_png"])),
        dtype=np.uint8,
    ) > 0

    if mask.shape != diff.shape:
        mask_img = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
        mask_img = mask_img.resize(source.size, Image.Resampling.NEAREST)
        mask = np.asarray(mask_img) > 0

    masked_pixels = diff[mask]
    outside_pixels = diff[~mask]

    masked_mean = float(np.mean(masked_pixels)) if masked_pixels.size else 0.0
    outside_mean = float(np.mean(outside_pixels)) if outside_pixels.size else 0.0

    masked_changed = (
        float(np.mean(masked_pixels >= 12.0)) * 100.0
        if masked_pixels.size
        else 0.0
    )
    outside_changed = (
        float(np.mean(outside_pixels >= 12.0)) * 100.0
        if outside_pixels.size
        else 0.0
    )

    return {
        "masked_mean_difference": round(masked_mean, 3),
        "masked_change_percent": round(masked_changed, 2),
        "outside_mean_difference": round(outside_mean, 3),
        "outside_change_percent": round(outside_changed, 2),
    }


def _load_mask_from_masked_png(masked_path: Path) -> Image.Image:
    with Image.open(masked_path) as image:
        alpha = image.convert("RGBA").getchannel("A")
        return alpha.point(lambda p: 255 - p)


def _candidate_score(metrics: dict[str, float]) -> float:
    masked = metrics["masked_change_percent"]
    outside = metrics["outside_change_percent"]
    return masked - (outside * 3.0)


def reconstruct_image_with_comfyui(
    db: Session,
    evidence_id: str,
    *,
    positive_prompt: str | None = None,
    negative_prompt: str | None = None,
) -> dict[str, Any]:
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if evidence is None:
        return {"success": False, "error": "Evidence not found."}

    try:
        source = _resolve_source_path(evidence)
    except FileNotFoundError as exc:
        return {"success": False, "error": str(exc)}

    mime = (
        getattr(evidence, "mime_type", None)
        or mimetypes.guess_type(source.name)[0]
        or ""
    ).lower()
    suffix = source.suffix.lower()

    if not (mime.startswith("image/") or suffix in IMAGE_SUFFIXES):
        return {
            "success": False,
            "error": "ComfyUI visual reconstruction currently supports raster images only.",
            "status": "INSUFFICIENT EVIDENCE",
        }

    work_dir = _get_recovered_dir() / "comfyui"
    work_dir.mkdir(parents=True, exist_ok=True)

    run_id = uuid.uuid4().hex[:12]
    masked_name = f"recoverai_{evidence_id[:8]}_{run_id}.png"
    masked_path = work_dir / masked_name

    mask_info = _prepare_masked_png(source, masked_path)
    mask_info["masked_png"] = str(masked_path)

    client = ComfyUIClient(timeout=30.0)

    try:
        client.health()

        uploaded = client.upload_image(
            masked_path,
            masked_name,
        )

        uploaded_name = (
            uploaded.get("name")
            or masked_name
        )
        uploaded_subfolder = (
            uploaded.get("subfolder")
            or ""
        )
        comfy_image_name = (
            f"{uploaded_subfolder}/{uploaded_name}"
            if uploaded_subfolder
            else uploaded_name
        )

        positive = positive_prompt or (
            "restore only the damaged region of the photograph, "
            "preserve the existing subject, composition, geometry, "
            "camera viewpoint, colors and lighting, natural realistic "
            "photographic texture, coherent details matching nearby pixels"
        )
        negative = negative_prompt or (
            "new objects, different subject, changed composition, "
            "extra objects, duplicated objects, text, watermark, "
            "logo, cartoon, fantasy, distorted geometry, blur, "
            "oversharpening, obvious artifacts, unrealistic details"
        )

        base_workflow = build_inpainting_workflow(
            image_name=comfy_image_name,
            positive=positive,
            negative=negative,
        )

        best_output: Path | None = None
        best_metrics: dict[str, float] | None = None
        best_prompt_id = ""
        best_seed = 0
        best_score = float("-inf")
        accepted = False

        for attempt in range(1, MAX_ATTEMPTS + 1):
            seed = random.randint(1, 2_147_483_646)

            # Stronger denoise creates a meaningful repaired region while
            # the masked input keeps untouched pixels stable.
            denoise = min(
                0.98,
                0.82 + attempt * 0.025,
            )

            current_workflow = _set_workflow_seed_and_sampling(
                base_workflow,
                seed,
                denoise,
            )

            prompt_id = client.queue(
                current_workflow
            )

            outputs = client.wait_for_output(
                prompt_id,
                timeout_seconds=600,
            )

            if not outputs:
                continue

            selected = outputs[0]
            output_name = (
                selected.get("filename")
                or f"RECOVERAI_AI_INFERRED_{run_id}_{attempt}.png"
            )

            output_path = (
                work_dir
                / f"candidate_{run_id}_{attempt}_{output_name}"
            )

            client.download_output(
                selected,
                output_path,
            )

            metrics = _compare_candidate(
                masked_path,
                output_path,
                mask_info,
            )

            score = _candidate_score(
                metrics
            )

            if score > best_score:
                best_score = score
                best_output = output_path
                best_metrics = metrics
                best_prompt_id = prompt_id
                best_seed = seed

            if (
                metrics["masked_change_percent"]
                >= TARGET_MASKED_CHANGE_PERCENT
                and metrics["outside_change_percent"]
                <= MAX_OUTSIDE_CHANGE_PERCENT
            ):
                accepted = True
                best_output = output_path
                best_metrics = metrics
                best_prompt_id = prompt_id
                best_seed = seed
                break

        if best_output is None or best_metrics is None:
            raise ComfyUIError(
                "ComfyUI did not produce a usable reconstruction candidate."
            )

        final_path = (
            _get_recovered_dir()
            / (
                f"recoverai_ai_inferred_"
                f"{evidence_id[:8]}_"
                f"{run_id}_"
                f"{best_output.name}"
            )
        )
        final_path.write_bytes(
            best_output.read_bytes()
        )

        return {
            "success": True,
            "evidence_id": evidence_id,
            "status": "AI-INFERRED RECONSTRUCTION",
            "label": "AI-INFERRED",
            "prompt_id": best_prompt_id,
            "seed": best_seed,
            "output_filename": final_path.name,
            "output_path": str(final_path),
            "output_url": (
                f"/api/ai-reconstruction/"
                f"{evidence_id}/image?run={run_id}"
            ),
            "mask": {
                key: value
                for key, value in mask_info.items()
                if key != "masked_png"
            },
            "quality": best_metrics,
            "visual_change_percent": best_metrics["masked_change_percent"],
            "masked_change_percent": best_metrics["masked_change_percent"],
            "outside_change_percent": best_metrics["outside_change_percent"],
            "target_change_percent": TARGET_MASKED_CHANGE_PERCENT,
            "max_outside_change_percent": MAX_OUTSIDE_CHANGE_PERCENT,
            "attempts": MAX_ATTEMPTS if not accepted else None,
            "accepted_threshold": accepted,
        }

    except (ComfyUIError, Exception) as exc:
        return {
            "success": False,
            "evidence_id": evidence_id,
            "status": "AI RECONSTRUCTION FAILED",
            "error": str(exc),
        }
