from app.models.damage_region import DamageRegion
from app.models.fragment import Fragment
from app.models.evidence import Evidence

from app.recovery.damage_analyzer import build_damage_map
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.evidence import Evidence
from app.services.analysis_service import analyze_evidence, get_analysis_results


router = APIRouter(
    prefix="/api/analysis",
    tags=["Analysis"],
)


@router.post("/{evidence_id}/scan")
def scan_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    return {
        "success": True,
        **analyze_evidence(
            db=db,
            evidence_id=evidence_id,
        ),
    }


@router.get("/{evidence_id}/summary")
def analysis_summary(
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
            "filename": evidence.original_filename,
            "size": evidence.file_size,
            "sha256": evidence.sha256,
            "type": evidence.evidence_type,
            "status": evidence.status,
        },
    }


@router.get("/{evidence_id}/results")
def analysis_results(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    return get_analysis_results(db=db, evidence_id=evidence_id)
@router.get("/{evidence_id}/damage-map")
def get_damage_map(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id
        )
        .first()
    )

    if evidence is None:
        return {
            "success": False,
            "error": "Evidence not found.",
        }

    fragments = (
        db.query(Fragment)
        .filter(
            Fragment.evidence_id
            == evidence_id
        )
        .order_by(
            Fragment.offset
        )
        .all()
    )

    damage_regions = (
        db.query(DamageRegion)
        .filter(
            DamageRegion.evidence_id
            == evidence_id
        )
        .order_by(
            DamageRegion.original_offset
        )
        .all()
    )

    return build_damage_map(
        evidence_id=evidence_id,
        file_size=evidence.file_size,
        fragments=fragments,
        damage_regions=damage_regions,
    )
