from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.ai.comfyui_client import ComfyUIClient
from app.core.database import get_db
from app.models.evidence import Evidence
from app.services.universal_recovery_service import (
    resolve_evidence_path,
    run_universal_recovery,
)


router = APIRouter(
    prefix="/api/ai-reconstruction",
    tags=["AI Reconstruction"],
)


def _find_result(
    evidence_id: str,
    run: str,
) -> Path | None:
    recovered_dir = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "recovered"
    )

    if not recovered_dir.exists():
        return None

    matches = sorted(
        recovered_dir.glob(
            f"recoverai_result_{evidence_id[:8]}_{run}*"
        ),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    return matches[0] if matches else None


@router.get("/health")
def health():
    try:
        ComfyUIClient().health()
        comfy = "online"
    except Exception:
        comfy = "offline"

    return {
        "success": True,
        "service": "RECOVERAI universal recovery",
        "status": "online",
        "comfyui": comfy,
        "supported": [
            "image",
            "video",
            "pdf",
            "document",
        ],
    }


@router.post("/{evidence_id}")
def run_recovery(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    result = run_universal_recovery(
        db=db,
        evidence_id=evidence_id,
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result,
        )

    return result


@router.get("/{evidence_id}/source-file")
def source_file(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found.",
        )

    try:
        path = resolve_evidence_path(evidence)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    media_type = (
        getattr(evidence, "mime_type", None)
        or mimetypes.guess_type(path.name)[0]
        or "application/octet-stream"
    )

    return FileResponse(
        path=path,
        media_type=media_type,
        headers={
            "Cache-Control": "no-store",
        },
    )


@router.get("/{evidence_id}/source-image")
def source_image_compat(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    return source_file(evidence_id=evidence_id, db=db)


@router.get("/{evidence_id}/result")
def result_file(
    evidence_id: str,
    run: str = Query(..., min_length=4, max_length=64),
):
    path = _find_result(
        evidence_id,
        run,
    )

    if path is None or not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Recovery result not found.",
        )

    media_type = (
        mimetypes.guess_type(path.name)[0]
        or "application/octet-stream"
    )

    return FileResponse(
        path=path,
        media_type=media_type,
        headers={
            "Cache-Control": "no-store",
        },
    )




@router.get("/{evidence_id}/image")
def image_compat(
    evidence_id: str,
    run: str = Query(..., min_length=4, max_length=64),
):
    return result_file(evidence_id=evidence_id, run=run)

def compatibility_image(
    evidence_id: str,
    run: str = Query(..., min_length=4, max_length=64),
):
    path = _find_result(
        evidence_id,
        run,
    )

    if path is None or not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="AI reconstruction image not found.",
        )

    return FileResponse(
        path=path,
        media_type="image/png",
        headers={
            "Cache-Control": "no-store",
        },
    )
