from __future__ import annotations

import mimetypes
import shutil
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models.evidence import Evidence


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _recovered_dir() -> Path:
    path = _backend_root() / "data" / "recovered"
    path.mkdir(parents=True, exist_ok=True)
    return path


def resolve_evidence_path(evidence: Evidence) -> Path:
    raw = Path(str(evidence.file_path))

    candidates = [
        raw,
        Path.cwd() / raw,
        _backend_root() / raw,
        _backend_root().parent / raw,
        _backend_root() / "data" / "uploads" / raw.name,
        _backend_root() / "data" / "evidence" / raw.name,
        _backend_root() / "data" / "recovered" / raw.name,
    ]

    for candidate in candidates:
        try:
            if candidate.is_file():
                return candidate.resolve()
        except OSError:
            continue

    data_root = _backend_root() / "data"
    if data_root.exists():
        for match in data_root.rglob(raw.name):
            if match.is_file():
                return match.resolve()

    raise FileNotFoundError(
        f"Evidence file not found: {evidence.file_path}"
    )


def _mime(evidence: Evidence, path: Path) -> str:
    value = (
        getattr(evidence, "mime_type", None)
        or mimetypes.guess_type(path.name)[0]
        or "application/octet-stream"
    )
    return str(value).lower()


def classify_type(evidence: Evidence, path: Path) -> str:
    mime = _mime(evidence, path)
    suffix = path.suffix.lower()

    if mime.startswith("image/") or suffix in {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".bmp",
        ".gif",
    }:
        return "image"

    if mime.startswith("video/") or suffix in {
        ".mp4",
        ".mov",
        ".avi",
        ".mkv",
        ".webm",
        ".m4v",
    }:
        return "video"

    if mime == "application/pdf" or suffix == ".pdf":
        return "pdf"

    if suffix in {".docx", ".doc", ".rtf", ".txt", ".odt"}:
        return "document"

    if "wordprocessingml" in mime or "msword" in mime:
        return "document"

    return "file"


def _extract_output_path(value: Any) -> Path | None:
    if isinstance(value, str):
        path = Path(value)
        return path if path.is_file() else None

    if not isinstance(value, dict):
        return None

    direct_keys = (
        "output_path",
        "path",
        "file_path",
        "recovered_path",
    )

    for key in direct_keys:
        candidate = value.get(key)
        if isinstance(candidate, str):
            path = Path(candidate)
            if path.is_file():
                return path

    nested_keys = (
        "recovered_output",
        "recovered_video",
        "result",
        "assembled",
        "output",
    )

    for key in nested_keys:
        candidate = value.get(key)
        path = _extract_output_path(candidate)
        if path is not None:
            return path

    return None


def _copy_result(
    source: Path,
    evidence_id: str,
    run_id: str,
) -> Path:
    extension = source.suffix.lower() or ".bin"
    destination = (
        _recovered_dir()
        / f"recoverai_result_{evidence_id[:8]}_{run_id}{extension}"
    )
    shutil.copy2(source, destination)
    return destination


def _run_image(
    db: Session,
    evidence_id: str,
    run_id: str,
) -> dict[str, Any]:
    from app.services.ai_reconstruction_service import (
        reconstruct_image_with_comfyui,
    )

    result = reconstruct_image_with_comfyui(
        db=db,
        evidence_id=evidence_id,
    )

    if not result.get("success"):
        return result

    output_path = _extract_output_path(result)
    if output_path is None:
        return {
            "success": False,
            "error": "Image reconstruction completed without an output file.",
        }

    copied = _copy_result(
        output_path,
        evidence_id,
        run_id,
    )

    return {
        **result,
        "media_type": "image",
        "output_path": str(copied),
        "output_filename": copied.name,
    }


def _run_video(
    evidence: Evidence,
    source: Path,
    evidence_id: str,
    run_id: str,
) -> dict[str, Any]:
    from app.services.video_reconstruction_service import (
        video_reconstruction_service,
    )

    result = video_reconstruction_service.analyze_video(
        source,
        investigation_id=run_id,
        max_frames=120,
    )

    output_path = _extract_output_path(result)

    if output_path is None:
        return {
            "success": False,
            "media_type": "video",
            "status": "VIDEO RECONSTRUCTION INCOMPLETE",
            "analysis": result,
            "error": (
                "The video pipeline completed analysis but did not return "
                "a reconstructed video file."
            ),
        }

    copied = _copy_result(
        output_path,
        evidence_id,
        run_id,
    )

    return {
        "success": True,
        "media_type": "video",
        "status": "VIDEO RECONSTRUCTION COMPLETED",
        "output_path": str(copied),
        "output_filename": copied.name,
        "output_size_bytes": copied.stat().st_size,
        "analysis": result,
    }


def _run_document_or_pdf(
    db: Session,
    evidence: Evidence,
    evidence_id: str,
    run_id: str,
    media_type: str,
) -> dict[str, Any]:
    from app.services.reconstruction_service import (
        reconstruct_evidence,
    )

    result = reconstruct_evidence(
        db=db,
        evidence_id=evidence_id,
    )

    output_path = _extract_output_path(result)

    if output_path is None:
        return {
            "success": True,
            "media_type": media_type,
            "status": result.get("reconstruction", {}).get(
                "status",
                "STRUCTURAL ASSESSMENT",
            ),
            "output_available": False,
            "analysis": result,
        }

    copied = _copy_result(
        output_path,
        evidence_id,
        run_id,
    )

    return {
        "success": True,
        "media_type": media_type,
        "status": result.get("reconstruction", {}).get(
            "status",
            "RECOVERED",
        ),
        "output_available": True,
        "output_path": str(copied),
        "output_filename": copied.name,
        "output_size_bytes": copied.stat().st_size,
        "analysis": result,
    }


def run_universal_recovery(
    db: Session,
    evidence_id: str,
) -> dict[str, Any]:
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if evidence is None:
        return {
            "success": False,
            "error": "Evidence not found.",
        }

    try:
        source = resolve_evidence_path(evidence)
    except FileNotFoundError as exc:
        return {
            "success": False,
            "error": str(exc),
        }

    media_type = classify_type(
        evidence,
        source,
    )
    run_id = uuid.uuid4().hex[:12]

    try:
        if media_type == "image":
            result = _run_image(
                db,
                evidence_id,
                run_id,
            )
        elif media_type == "video":
            result = _run_video(
                evidence,
                source,
                evidence_id,
                run_id,
            )
        elif media_type == "pdf":
            result = _run_document_or_pdf(
                db,
                evidence,
                evidence_id,
                run_id,
                "pdf",
            )
        elif media_type == "document":
            result = _run_document_or_pdf(
                db,
                evidence,
                evidence_id,
                run_id,
                "document",
            )
        else:
            result = {
                "success": True,
                "media_type": "file",
                "status": "FILE ANALYSIS AVAILABLE",
                "output_available": False,
                "analysis": {
                    "message": "This file type is supported for evidence inspection, but no visual reconstruction engine is assigned to it yet."
                },
            }

        result["evidence_id"] = evidence_id
        result["run_id"] = run_id
        result["input_path"] = str(source)
        result["input_filename"] = source.name

        output_path = _extract_output_path(result)
        if output_path is not None:
            result["output_url"] = (
                f"/api/ai-reconstruction/{evidence_id}/result"
                f"?run={run_id}"
            )
            result["output_available"] = True
        elif "output_available" not in result:
            result["output_available"] = False

        return result

    except Exception as exc:
        return {
            "success": False,
            "evidence_id": evidence_id,
            "run_id": run_id,
            "media_type": media_type,
            "error": str(exc),
        }
