from pathlib import Path
import json

from sqlalchemy.orm import Session

from app.models.damage_region import DamageRegion
from app.models.evidence import Evidence
from app.services.benchmark_service import matched_controlled_benchmark


def load_damage_metadata(
    metadata_path: Path,
) -> dict:

    if not metadata_path.exists():
        raise FileNotFoundError(
            f"Damage metadata not found: {metadata_path}"
        )

    return json.loads(
        metadata_path.read_text(
            encoding="utf-8"
        )
    )


def create_ground_truth_damage_region(
    db: Session,
    evidence_id: str,
    metadata_path: Path,
) -> dict:

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

    metadata = load_damage_metadata(
        metadata_path
    )

    damage_start = metadata["damage_start"]
    damage_size = metadata["damage_size"]

    damage_end = (
        damage_start
        + damage_size
        - 1
    )

    region_id = (
        f"DAMAGE-{damage_start}-"
        f"{damage_end}"
    )

    # Remove an existing benchmark region
    db.query(DamageRegion).filter(
        DamageRegion.evidence_id == evidence_id
    ).delete(
        synchronize_session=False
    )

    region = DamageRegion(
        evidence_id=evidence_id,
        region_id=region_id,
        original_offset=damage_start,
        size=damage_size,
        original_end_offset=damage_end,
        damage_type=metadata["damage_type"],
        recovery_status="MISSING",
        source="GROUND_TRUTH",
    )

    db.add(region)
    db.commit()
    db.refresh(region)

    return {
        "success": True,
        "evidence_id": evidence_id,
        "source": "GROUND_TRUTH",

        "damage_region": {
            "region_id": region.region_id,
            "original_offset": region.original_offset,
            "size": region.size,
            "original_end_offset": region.original_end_offset,
            "damage_type": region.damage_type,
            "recovery_status": region.recovery_status,
        },

        "warning": (
            "This damage location comes from controlled "
            "benchmark ground truth. It must not be presented "
            "as independently inferred forensic evidence."
        ),
    }


def register_controlled_benchmark_damage(
    db: Session,
    evidence: Evidence,
) -> dict | None:
    """Attach benchmark metadata only after an exact evidence-hash match.

    The record is retained as GROUND_TRUTH so the UI can distinguish it from a
    forensic inference.  The caller owns the transaction.
    """

    benchmark = matched_controlled_benchmark(evidence.sha256)
    if benchmark is None:
        return None

    metadata = benchmark["metadata"]
    damage_start = int(metadata["damage_start"])
    damage_size = int(metadata["damage_size"])
    damage_end = damage_start + damage_size - 1
    region_id = f"DAMAGE-{damage_start}-{damage_end}"

    region = (
        db.query(DamageRegion)
        .filter(
            DamageRegion.evidence_id == evidence.id,
            DamageRegion.region_id == region_id,
            DamageRegion.source == "GROUND_TRUTH",
        )
        .first()
    )

    if region is None:
        region = DamageRegion(
            evidence_id=evidence.id,
            region_id=region_id,
            original_offset=damage_start,
            size=damage_size,
            original_end_offset=damage_end,
            damage_type=metadata["damage_type"],
            recovery_status="MISSING",
            source="GROUND_TRUTH",
        )
        db.add(region)

    return {
        "region_id": region_id,
        "source": "GROUND_TRUTH",
        "warning": (
            "Controlled benchmark metadata was matched by SHA-256. It is not "
            "an independently inferred forensic finding."
        ),
    }
