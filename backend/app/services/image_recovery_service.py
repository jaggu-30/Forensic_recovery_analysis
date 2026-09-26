from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from typing import Any

from PIL import Image
from sqlalchemy.orm import Session

from app.models.evidence import Evidence


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

_LAMA = None


class ImageRecoveryError(Exception):
    """Raised when AI image restoration cannot be completed safely."""


def backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def project_root() -> Path:
    return backend_root().parent


def recovered_root() -> Path:
    """Keep recovered artifacts inside the current project's backend/data tree."""
    path = backend_root() / "data" / "recovered" / "ai_inferred"
    path.mkdir(parents=True, exist_ok=True)
    return path


def resolve_evidence_path(evidence: Evidence) -> Path:
    """Resolve an evidence path without changing the existing database model."""
    raw = Path(str(getattr(evidence, "file_path", "")))

    candidates = [
        raw,
        Path.cwd() / raw,
        backend_root() / raw,
        project_root() / raw,
        backend_root() / "data" / "uploads" / raw.name,
        backend_root() / "data" / "evidence" / raw.name,
        project_root() / "data" / "uploads" / raw.name,
        project_root() / "data" / "evidence" / raw.name,
    ]

    seen: set[str] = set()
    for candidate in candidates:
        try:
            key = str(candidate.resolve())
        except OSError:
            key = str(candidate)
        if key in seen:
            continue
        seen.add(key)
        try:
            if candidate.is_file():
                return candidate.resolve()
        except OSError:
            pass

    # Last-resort project search by basename. This does not modify evidence.
    for root in (backend_root() / "data", project_root() / "data"):
        if not root.exists():
            continue
        try:
            for match in root.rglob(raw.name):
                if match.is_file():
                    return match.resolve()
        except OSError:
            continue

    raise ImageRecoveryError(f"Evidence file not found: {getattr(evidence, 'file_path', '')}")


def _get_evidence(db: Session, evidence_id: str) -> tuple[Evidence, Path]:
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )
    if evidence is None:
        raise ImageRecoveryError(f"Evidence not found: {evidence_id}")

    source = resolve_evidence_path(evidence)

    extension = source.suffix.lower()
    mime = str(getattr(evidence, "mime_type", "") or "").lower()
    if extension not in IMAGE_EXTENSIONS and not mime.startswith("image/"):
        raise ImageRecoveryError("AI image restoration is only available for image evidence.")

    return evidence, source


def _get_lama():
    global _LAMA

    if _LAMA is not None:
        return _LAMA

    try:
        from simple_lama_inpainting import SimpleLama
    except ImportError as exc:
        raise ImageRecoveryError(
            "LaMa AI restoration is not installed. "
            "Run: pip install simple-lama-inpainting"
        ) from exc

    try:
        _LAMA = SimpleLama()
    except Exception as exc:
        raise ImageRecoveryError(f"LaMa model could not be loaded: {exc}") from exc

    return _LAMA


def _build_corruption_mask(source: Path):
    """Use the same automatic OpenCV corruption-mask approach as the reference project."""
    import cv2
    import numpy as np

    image = cv2.imread(str(source), cv2.IMREAD_COLOR)
    if image is None:
        raise ImageRecoveryError("The evidence image could not be decoded.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    smooth = cv2.GaussianBlur(gray, (0, 0), 3)
    local_difference = cv2.absdiff(gray, smooth)

    mask = np.where(local_difference > 48, 255, 0).astype(np.uint8)

    horizontal_score = np.mean(local_difference > 38, axis=1)
    vertical_score = np.mean(local_difference > 38, axis=0)

    row_mask = np.zeros_like(gray, dtype=np.uint8)
    col_mask = np.zeros_like(gray, dtype=np.uint8)

    row_mask[horizontal_score > 0.16, :] = 255
    col_mask[:, vertical_score > 0.20] = 255

    row_mask = cv2.dilate(row_mask, np.ones((9, 1), np.uint8), iterations=1)
    col_mask = cv2.dilate(col_mask, np.ones((1, 7), np.uint8), iterations=1)

    mask = cv2.bitwise_or(mask, row_mask)
    mask = cv2.bitwise_or(mask, col_mask)

    median = cv2.medianBlur(gray, 9)
    median_difference = cv2.absdiff(gray, median)
    extreme = (((gray < 10) | (gray > 247)).astype(np.uint8) * 255)
    extreme_mask = np.where(
        (extreme > 0) & (median_difference > 45),
        255,
        0,
    ).astype(np.uint8)

    mask = cv2.bitwise_or(mask, extreme_mask)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=1)

    damage_ratio = float(np.count_nonzero(mask)) / float(mask.size)

    # Prevent an over-broad automatically detected mask from erasing most of an image.
    if damage_ratio > 0.55:
        mask = cv2.erode(mask, np.ones((5, 5), np.uint8), iterations=1)
        damage_ratio = float(np.count_nonzero(mask)) / float(mask.size)

    return image, mask, damage_ratio


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _restore_with_lama(source: Path, target: Path, mask_path: Path) -> dict[str, Any]:
    import cv2
    import numpy as np

    image_bgr, mask, damage_ratio = _build_corruption_mask(source)

    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    image_pil = Image.fromarray(image_rgb).convert("RGB")
    mask_pil = Image.fromarray(mask).convert("L")

    lama = _get_lama()
    result = lama(image_pil, mask_pil).convert("RGB")

    result_np = np.array(result, dtype=np.uint8, copy=True)
    original_np = np.asarray(image_pil, dtype=np.uint8)

    # Preserve every pixel outside the detected corruption mask exactly.
    clean = mask == 0
    result_np[clean] = original_np[clean]

    output = Image.fromarray(result_np, mode="RGB")
    target.parent.mkdir(parents=True, exist_ok=True)
    output.save(target, format="PNG", optimize=True)
    Image.fromarray(mask).save(mask_path, format="PNG")

    return {
        "width": int(image_bgr.shape[1]),
        "height": int(image_bgr.shape[0]),
        "damaged_pixels": int(np.count_nonzero(mask)),
        "damage_ratio": round(damage_ratio * 100, 2),
        "method": "LaMa neural image inpainting with automatic OpenCV corruption-mask detection",
        "model": "LaMa (Resolution-robust Large Mask Inpainting, WACV 2022)",
    }


def restore_image(db: Session, evidence_id: str) -> dict[str, Any]:
    """Run the reference project's image restoration logic on the current project database."""
    evidence, source = _get_evidence(db, evidence_id)

    run = uuid.uuid4().hex[:12]
    stem = Path(str(getattr(evidence, "original_filename", None) or getattr(evidence, "filename", None) or source.name)).stem
    safe_stem = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in stem).strip("_") or "evidence"

    run_dir = recovered_root() / evidence_id / run
    run_dir.mkdir(parents=True, exist_ok=True)

    output = run_dir / f"{safe_stem}_LAMA_INFERRED.png"
    mask_path = run_dir / f"{safe_stem}_CORRUPTION_MASK.png"
    metadata_path = run_dir / f"{safe_stem}_recovery_metadata.json"

    report = _restore_with_lama(source, output, mask_path)

    source_sha256 = getattr(evidence, "sha256", None) or _sha256(source)
    output_sha256 = _sha256(output)

    metadata = {
        "evidence_id": evidence_id,
        "source_filename": source.name,
        "source_path": str(source),
        "source_sha256": source_sha256,
        "output_filename": output.name,
        "output_sha256": output_sha256,
        "mask_filename": mask_path.name,
        "status": "AI-Inferred Reconstruction",
        "verification": "INFERRED — NOT VERIFIED ORIGINAL DATA",
        "recovery_confidence": round(max(0.0, min(0.99, 0.55 + report["damage_ratio"] * 0.002)), 4),
        "warning": "The restored pixels are AI-inferred and must not be presented as verified original evidence.",
        **report,
    }

    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return {
        "success": True,
        "run_id": run,
        "method": report["method"],
        "model": report["model"],
        "classification": "AI-INFERRED RECONSTRUCTION",
        "status": "AI-Inferred Reconstruction",
        "verification": "INFERRED — NOT VERIFIED ORIGINAL DATA",
        "output_path": str(output),
        "output_url": f"/api/ai-reconstruction/{evidence_id}/output?run={run}",
        "output_filename": output.name,
        "mask_path": str(mask_path),
        "mask_filename": mask_path.name,
        "metadata_path": str(metadata_path),
        "source_sha256": source_sha256,
        "output_sha256": output_sha256,
        "width": report["width"],
        "height": report["height"],
        "damaged_pixels": report["damaged_pixels"],
        "damage_ratio": report["damage_ratio"],
        "reconstructed_bytes": 0,
        "verified_bytes": 0,
        "missing_bytes": 0,
        "warning": metadata["warning"],
    }


# Compatibility aliases for easy integration with existing imports.
restore_image_with_lama = restore_image
reconstruct_image = restore_image
