from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.evidence import Evidence
from app.services.evidence_service import store_evidence


router = APIRouter(
    prefix="/api/evidence",
    tags=["Evidence"],
)


# ---------------------------------------------------------
# Upload Evidence
# ---------------------------------------------------------

@router.post("/upload")
async def upload_evidence(
    investigation_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    evidence = await store_evidence(
        db=db,
        investigation_id=investigation_id,
        upload=file,
    )

    return {
        "success": True,
        "message": "Evidence imported successfully.",
        "evidence": {
            "id": evidence.id,
            "investigation_id": evidence.investigation_id,
            "filename": evidence.original_filename,
            "stored_filename": evidence.stored_filename,
            "size": evidence.file_size,
            "sha256": evidence.sha256,
            "mime_type": evidence.mime_type,
            "type": evidence.evidence_type,
            "acquisition_time": evidence.acquisition_time,
            "status": evidence.status,
        },
    }


# ---------------------------------------------------------
# List Evidence
# ---------------------------------------------------------

@router.get("/investigation/{investigation_id}")
def list_evidence(
    investigation_id: str,
    db: Session = Depends(get_db),
):
    evidence_items = (
        db.query(Evidence)
        .filter(
            Evidence.investigation_id == investigation_id
        )
        .order_by(Evidence.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "count": len(evidence_items),
        "evidence": [
            {
                "id": item.id,
                "filename": item.original_filename,
                "size": item.file_size,
                "sha256": item.sha256,
                "mime_type": item.mime_type,
                "type": item.evidence_type,
                "status": item.status,
                "acquisition_time": item.acquisition_time,
            }
            for item in evidence_items
        ],
    }


# ---------------------------------------------------------
# Get Evidence Metadata
# ---------------------------------------------------------

@router.get("/{evidence_id}")
def get_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if evidence is None:
        return {
            "success": False,
            "message": "Evidence not found.",
        }

    return {
        "success": True,
        "evidence": {
            "id": evidence.id,
            "investigation_id": evidence.investigation_id,
            "filename": evidence.original_filename,
            "stored_filename": evidence.stored_filename,
            "path": evidence.file_path,
            "size": evidence.file_size,
            "sha256": evidence.sha256,
            "mime_type": evidence.mime_type,
            "type": evidence.evidence_type,
            "acquisition_time": evidence.acquisition_time,
            "status": evidence.status,
        },
    }


# ---------------------------------------------------------
# Serve Original Uploaded Evidence
# ---------------------------------------------------------
#
# This endpoint does NOT modify the evidence.
# It only streams the stored file to the frontend.
#
# Frontend:
#
# /api/evidence/{evidence_id}/file
#
# ---------------------------------------------------------

@router.get("/{evidence_id}/file")
def get_evidence_file(
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

    if not evidence.file_path:
        raise HTTPException(
            status_code=404,
            detail="Evidence file path is not available.",
        )

    file_path = Path(
        evidence.file_path
    ).resolve()

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Stored evidence file does not exist.",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail="Stored evidence path is not a file.",
        )

    return FileResponse(
        path=str(file_path),
        media_type=(
            evidence.mime_type
            or "application/octet-stream"
        ),
        filename=(
            evidence.original_filename
            or evidence.stored_filename
            or "evidence"
        ),
        headers={
            "Content-Disposition": (
                f'inline; filename="{evidence.original_filename or "evidence"}"'
            )
        },
    )