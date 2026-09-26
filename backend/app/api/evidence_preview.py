from pathlib import Path
import mimetypes

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.evidence import Evidence


router = APIRouter(
    prefix="/api/evidence",
    tags=["Evidence Preview"],
)


@router.get("/{evidence_id}/preview")
def preview_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    """
    Return the actual stored evidence file for visual preview.

    This endpoint is read-only. It does not modify the original
    evidence and does not perform any reconstruction.
    """

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

    file_path = Path(evidence.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Evidence file not found: {file_path}",
        )

    mime_type = (
        evidence.mime_type
        or mimetypes.guess_type(file_path.name)[0]
        or "application/octet-stream"
    )

    if not mime_type.startswith("image/"):
        raise HTTPException(
            status_code=415,
            detail=(
                "Visual preview is available only for image evidence."
            ),
        )

    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=file_path.name,
        content_disposition_type="inline",
    )