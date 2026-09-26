from app.core.database import SessionLocal

from app.models.fragment import Fragment
from app.models.damage_region import DamageRegion

from app.recovery.damage_analyzer import build_damage_map


EVIDENCE_ID = (
    "36549834-e5ad-4d03-87b5-d6db4daab2ce"
)


db = SessionLocal()

try:

    fragments = (
        db.query(Fragment)
        .filter(
            Fragment.evidence_id
            == EVIDENCE_ID
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
            == EVIDENCE_ID
        )
        .order_by(
            DamageRegion.original_offset
        )
        .all()
    )

    result = build_damage_map(
        evidence_id=EVIDENCE_ID,
        file_size=187975,
        fragments=fragments,
        damage_regions=damage_regions,
    )

    print(
        "\n========== DAMAGE MAP ==========\n"
    )

    print(
        f"Evidence ID: "
        f"{result['evidence_id']}"
    )

    print(
        f"File size: "
        f"{result['file_size']}"
    )

    print(
        f"Estimated original size: "
        f"{result['estimated_original_size']}"
    )

    print(
        f"Observed bytes: "
        f"{result['observed_bytes']}"
    )

    print(
        f"Known missing bytes: "
        f"{result['known_missing_bytes']}"
    )

    print(
        f"Reconstructed bytes: "
        f"{result['reconstructed_bytes']}"
    )

    print(
        f"Completeness: "
        f"{result['completeness']}"
    )

    print(
        f"Regions: "
        f"{result['region_count']}"
    )

    for region in result["regions"]:

        print("\n--- DAMAGE REGION ---")

        print(
            f"ID: "
            f"{region['region_id']}"
        )

        print(
            f"Offset: "
            f"{region['start_offset']} - "
            f"{region['end_offset']}"
        )

        print(
            f"Size: "
            f"{region['size']} bytes"
        )

        print(
            f"Type: "
            f"{region['damage_type']}"
        )

        print(
            f"Status: "
            f"{region['recovery_status']}"
        )

        print(
            f"Source: "
            f"{region['source']}"
        )

        print(
            f"Confidence: "
            f"{region['forensic_confidence']}"
        )

        print(
            "Related fragments:"
        )

        for fragment in (
            region["related_fragments"]
        ):
            print(
                f"  {fragment['fragment_id']} "
                f"{fragment['offset']} → "
                f"{fragment['end_offset']}"
            )

finally:

    db.close()