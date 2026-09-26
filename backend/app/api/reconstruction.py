from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.reconstruction_service import reconstruct_evidence


router = APIRouter(
    prefix="/api/reconstruction",
    tags=["Reconstruction"],
)


@router.get("/{evidence_id}/download")
def download_recovered_file(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    """Download only a byte-verified recovery artifact."""

    result = reconstruct_evidence(db, evidence_id)
    output = result.get("recovered_output", {})
    output_path = Path(output.get("path", ""))

    if not output.get("available") or not output_path.is_file():
        raise HTTPException(
            status_code=409,
            detail="No verified recovered file is available for this evidence.",
        )

    return FileResponse(
        path=output_path,
        filename=output["filename"],
        media_type="application/octet-stream",
    )


@router.post("/{evidence_id}")
def reconstruct(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    return reconstruct_evidence(
        db,
        evidence_id,
    )
