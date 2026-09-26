from pathlib import Path
import json

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.models.fragment import Fragment
from app.models.fragment_relationship import FragmentRelationship

from app.recovery.fragment_detector import (
    detect_fragments,
    summarize_fragments,
)

from app.recovery.scanner import scan_file

from app.ai.relationship_engine import (
    analyze_fragment_relationships,
    summarize_relationships,
)
from app.services.damage_service import register_controlled_benchmark_damage


def analyze_evidence(
    db: Session,
    evidence_id: str,
) -> dict:

    # ---------------------------------------------------------
    # Find evidence
    # ---------------------------------------------------------

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

    file_path = Path(evidence.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Stored evidence file is missing.",
        )

    benchmark_damage = register_controlled_benchmark_damage(
        db,
        evidence,
    )

    # ---------------------------------------------------------
    # Binary scan
    # ---------------------------------------------------------

    scan_result = scan_file(file_path)

    # ---------------------------------------------------------
    # Fragment detection
    # ---------------------------------------------------------

    fragments = detect_fragments(file_path)

    fragment_summary = summarize_fragments(fragments)

    # ---------------------------------------------------------
    # Fragment relationship analysis
    # ---------------------------------------------------------

    relationships = analyze_fragment_relationships(
        fragments
    )

    relationship_summary = summarize_relationships(
        relationships
    )

    # ---------------------------------------------------------
    # Remove previous analysis results
    # ---------------------------------------------------------

    db.query(Fragment).filter(
        Fragment.evidence_id == evidence.id
    ).delete(
        synchronize_session=False
    )

    db.query(FragmentRelationship).filter(
        FragmentRelationship.evidence_id == evidence.id
    ).delete(
        synchronize_session=False
    )

    # ---------------------------------------------------------
    # Save fragments
    # ---------------------------------------------------------

    for fragment in fragments:

        db_fragment = Fragment(
            fragment_id=fragment.fragment_id,
            evidence_id=evidence.id,
            offset=fragment.offset,
            size=fragment.size,
            end_offset=fragment.end_offset,
            sha256=fragment.sha256,
            entropy=fragment.entropy,
            probable_type=fragment.probable_type,
            classification=fragment.classification,
            confidence=fragment.confidence,
        )

        db.add(db_fragment)

    # ---------------------------------------------------------
    # Save relationships
    # ---------------------------------------------------------

    for relationship in relationships:

        db_relationship = FragmentRelationship(
            evidence_id=evidence.id,
            source_fragment=relationship.source_fragment,
            target_fragment=relationship.target_fragment,
            relationship_type=relationship.relationship_type,
            score=relationship.score,
            offset_gap=relationship.offset_gap,
            entropy_difference=relationship.entropy_difference,
            support=json.dumps(
                relationship.support
            ),
        )

        db.add(db_relationship)

    # ---------------------------------------------------------
    # Update evidence status
    # ---------------------------------------------------------

    evidence.status = "ANALYZED"

    # ---------------------------------------------------------
    # Commit everything
    # ---------------------------------------------------------

    db.commit()

    db.refresh(evidence)

    # ---------------------------------------------------------
    # Return complete analysis
    # ---------------------------------------------------------

    return {
        "evidence_id": evidence.id,
        "filename": evidence.original_filename,

        "classification_model": {
            "name": "EXPLAINABLE_FRAGMENT_FEATURE_MODEL_V1",
            "signals": [
                "validated file signature",
                "block entropy",
                "byte composition",
                "format structural markers",
            ],
            "warning": (
                "Scores express evidence compatibility, not proof of original "
                "file membership."
            ),
        },

        "analysis": scan_result,

        "fragments": {
            "summary": fragment_summary,

            "items": [
                {
                    "fragment_id": fragment.fragment_id,
                    "offset": fragment.offset,
                    "size": fragment.size,
                    "end_offset": fragment.end_offset,
                    "sha256": fragment.sha256,
                    "entropy": fragment.entropy,
                    "probable_type": fragment.probable_type,
                    "classification": fragment.classification,
                    "confidence": fragment.confidence,
                }
                for fragment in fragments
            ],
        },

        "relationships": {
            "summary": relationship_summary,

            "items": [
                {
                    "source_fragment": relationship.source_fragment,
                    "target_fragment": relationship.target_fragment,
                    "relationship_type": relationship.relationship_type,
                    "score": relationship.score,
                    "support": relationship.support,
                    "offset_gap": relationship.offset_gap,
                    "entropy_difference": relationship.entropy_difference,
                }
                for relationship in relationships
            ],
        },
        "benchmark_damage": benchmark_damage,
    }


def get_analysis_results(
    db: Session,
    evidence_id: str,
) -> dict:
    """Return persisted analysis evidence without re-running a scan."""

    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )
    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found.")

    fragments = (
        db.query(Fragment)
        .filter(Fragment.evidence_id == evidence_id)
        .order_by(Fragment.offset)
        .all()
    )
    relationships = (
        db.query(FragmentRelationship)
        .filter(FragmentRelationship.evidence_id == evidence_id)
        .order_by(FragmentRelationship.id)
        .all()
    )

    def decode_support(value: str | None) -> list[str]:
        try:
            return json.loads(value or "[]")
        except json.JSONDecodeError:
            return []

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
        "fragments": {
            "summary": summarize_fragments(fragments),
            "items": [
                {
                    "fragment_id": item.fragment_id,
                    "offset": item.offset,
                    "size": item.size,
                    "end_offset": item.end_offset,
                    "sha256": item.sha256,
                    "entropy": item.entropy,
                    "probable_type": item.probable_type,
                    "classification": item.classification,
                    "confidence": item.confidence,
                }
                for item in fragments
            ],
        },
        "relationships": {
            "summary": summarize_relationships(relationships),
            "items": [
                {
                    "source_fragment": item.source_fragment,
                    "target_fragment": item.target_fragment,
                    "relationship_type": item.relationship_type,
                    "score": item.score,
                    "offset_gap": item.offset_gap,
                    "entropy_difference": item.entropy_difference,
                    "support": decode_support(item.support),
                }
                for item in relationships
            ],
        },
    }
