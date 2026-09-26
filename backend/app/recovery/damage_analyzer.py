from typing import Any


def build_damage_map(
    *,
    evidence_id: str,
    file_size: int,
    fragments: list[Any],
    damage_regions: list[Any],
) -> dict:
    """
    Build a structured forensic damage map.

    Important:
    - GROUND_TRUTH regions come from controlled benchmark data.
    - INFERRED regions must be supported by observable evidence.
    - This function never invents missing bytes.
    """

    regions = []

    for region in damage_regions:
        start = region.original_offset
        size = region.size
        end = region.original_end_offset

        # Find fragments physically surrounding the
        # damage region. These are contextual fragments,
        # not evidence that they contain the missing bytes.
        related_fragments = []

        for fragment in fragments:
            fragment_start = fragment.offset
            fragment_end = fragment.end_offset

            overlaps = (
                fragment_start <= end
                and fragment_end >= start
            )

            nearby = (
                abs(fragment_end - start) <= 4096
                or abs(fragment_start - end) <= 4096
            )

            if overlaps or nearby:
                related_fragments.append(
                    {
                        "fragment_id": fragment.fragment_id,
                        "offset": fragment.offset,
                        "size": fragment.size,
                        "end_offset": fragment.end_offset,
                        "probable_type": fragment.probable_type,
                        "classification": fragment.classification,
                        "confidence": fragment.confidence,
                    }
                )

        region_data = {
            "region_id": region.region_id,
            "start_offset": start,
            "end_offset": end,
            "size": size,
            "damage_type": region.damage_type,
            "recovery_status": region.recovery_status,
            "source": region.source,
            "related_fragments": related_fragments,
        }

        # Ground-truth regions are known because this is
        # a controlled benchmark.
        if region.source == "GROUND_TRUTH":
            region_data["evidence_basis"] = [
                "CONTROLLED_BENCHMARK_METADATA"
            ]

            region_data["forensic_confidence"] = 1.0

            region_data["interpretation"] = (
                "Known damage region from controlled "
                "benchmark ground truth. This location "
                "must not be presented as independently "
                "inferred forensic evidence."
            )

        else:
            region_data["evidence_basis"] = [
                "OBSERVED_EVIDENCE"
            ]

            region_data["forensic_confidence"] = None

            region_data["interpretation"] = (
                "Potential damage region requiring "
                "additional forensic validation."
            )

        regions.append(region_data)

    # ---------------------------------------------------------
    # Calculate total known missing bytes.
    # ---------------------------------------------------------

    known_missing_bytes = sum(
        region["size"]
        for region in regions
    )

    # ---------------------------------------------------------
    # Calculate currently observed bytes.
    #
    # These are bytes physically present in the evidence.
    # ---------------------------------------------------------

    observed_bytes = file_size

    original_estimated_size = (
        observed_bytes + known_missing_bytes
    )

    completeness = (
        observed_bytes / original_estimated_size
        if original_estimated_size > 0
        else 0.0
    )

    completeness = round(
        completeness,
        4,
    )

    return {
        "success": True,

        "evidence_id": evidence_id,

        "file_size": file_size,

        "estimated_original_size": (
            original_estimated_size
        ),

        "observed_bytes": observed_bytes,

        "known_missing_bytes": (
            known_missing_bytes
        ),

        "reconstructed_bytes": 0,

        "completeness": completeness,

        "region_count": len(regions),

        "regions": regions,

        "forensic_warning": (
            "Damage regions marked GROUND_TRUTH come "
            "from controlled benchmark metadata. They "
            "must not be represented as independently "
            "inferred forensic findings."
        ),
    }