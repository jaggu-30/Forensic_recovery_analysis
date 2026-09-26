from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.investigation import Investigation


router = APIRouter(
    prefix="/api/investigations",
    tags=["Investigations"],
)


class InvestigationCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    description: Optional[str] = None


@router.post("/")
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
):
    investigation = Investigation(
        name=payload.name,
        description=payload.description,
    )

    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    return {
        "success": True,
        "investigation": {
            "id": investigation.id,
            "name": investigation.name,
            "description": investigation.description,
            "status": investigation.status,
            "created_at": investigation.created_at,
        },
    }


@router.get("/")
def list_investigations(
    db: Session = Depends(get_db),
):
    investigations = (
        db.query(Investigation)
        .order_by(Investigation.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "count": len(investigations),
        "investigations": [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "status": item.status,
                "created_at": item.created_at,
            }
            for item in investigations
        ],
    }