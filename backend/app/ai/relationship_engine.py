from dataclasses import dataclass

from app.recovery.fragment_detector import Fragment


@dataclass
class FragmentRelationship:
    source_fragment: str
    target_fragment: str
    relationship_type: str
    score: float
    support: list[str]
    offset_gap: int
    entropy_difference: float


def calculate_entropy_similarity(
    source_entropy: float,
    target_entropy: float,
) -> float:
    """
    Converts entropy difference into a similarity score.

    Entropy range is approximately 0-8 for byte data.
    """

    difference = abs(
        source_entropy - target_entropy
    )

    similarity = 1.0 - min(
        difference / 8.0,
        1.0,
    )

    return similarity


def calculate_relationship(
    source: Fragment,
    target: Fragment,
) -> FragmentRelationship:

    support = []
    score_components = []

    # ---------------------------------------------------------
    # 1. Offset continuity
    # ---------------------------------------------------------

    expected_offset = source.end_offset + 1

    offset_gap = target.offset - expected_offset

    if offset_gap == 0:
        support.append("contiguous offsets")
        offset_score = 1.0

    elif abs(offset_gap) <= 4096:
        support.append("nearby storage offsets")
        offset_score = 0.65

    else:
        offset_score = 0.0

    score_components.append(
        ("offset", offset_score, 0.40)
    )

    # ---------------------------------------------------------
    # 2. Probable type compatibility
    # ---------------------------------------------------------

    if (
        source.probable_type != "UNKNOWN"
        and source.probable_type
        == target.probable_type
    ):
        support.append(
            f"same probable type: {source.probable_type}"
        )
        type_score = 1.0

    elif (
        source.probable_type == "UNKNOWN"
        or target.probable_type == "UNKNOWN"
    ):
        support.append(
            "one fragment has unknown type"
        )
        type_score = 0.35

    else:
        type_score = 0.0

    score_components.append(
        ("type", type_score, 0.25)
    )

    # ---------------------------------------------------------
    # 3. Entropy similarity
    # ---------------------------------------------------------

    entropy_difference = abs(
        source.entropy - target.entropy
    )

    entropy_similarity = calculate_entropy_similarity(
        source.entropy,
        target.entropy,
    )

    if entropy_difference <= 0.25:
        support.append(
            "very similar entropy"
        )
    elif entropy_difference <= 0.75:
        support.append(
            "compatible entropy"
        )

    score_components.append(
        (
            "entropy",
            entropy_similarity,
            0.20,
        )
    )

    # ---------------------------------------------------------
    # 4. Classification compatibility
    # ---------------------------------------------------------

    if source.classification == target.classification:
        support.append(
            "same region classification"
        )
        classification_score = 1.0
    else:
        classification_score = 0.5

    score_components.append(
        (
            "classification",
            classification_score,
            0.15,
        )
    )

    # ---------------------------------------------------------
    # Final weighted score
    # ---------------------------------------------------------

    score = sum(
        value * weight
        for _, value, weight
        in score_components
    )

    score = round(
        max(0.0, min(score, 1.0)),
        4,
    )

    # ---------------------------------------------------------
    # Relationship type
    # ---------------------------------------------------------

    if offset_gap == 0:
        relationship_type = "ADJACENT"

    elif abs(offset_gap) <= 4096:
        relationship_type = "NEARBY"

    else:
        relationship_type = "CANDIDATE"

    return FragmentRelationship(
        source_fragment=source.fragment_id,
        target_fragment=target.fragment_id,
        relationship_type=relationship_type,
        score=score,
        support=support,
        offset_gap=offset_gap,
        entropy_difference=round(
            entropy_difference,
            6,
        ),
    )


def analyze_fragment_relationships(
    fragments: list[Fragment],
) -> list[FragmentRelationship]:

    if len(fragments) < 2:
        return []

    # Sort by physical storage offset.
    ordered_fragments = sorted(
        fragments,
        key=lambda fragment: fragment.offset,
    )

    relationships = []

    # ---------------------------------------------------------
    # Compare neighboring fragments first.
    #
    # This avoids creating an enormous number of speculative
    # pairwise relationships.
    # ---------------------------------------------------------

    for index in range(
        len(ordered_fragments) - 1
    ):

        source = ordered_fragments[index]
        target = ordered_fragments[index + 1]

        relationship = calculate_relationship(
            source,
            target,
        )

        relationships.append(
            relationship
        )

    return relationships


def summarize_relationships(
    relationships: list[FragmentRelationship],
) -> dict:

    if not relationships:
        return {
            "relationship_count": 0,
            "adjacent_count": 0,
            "nearby_count": 0,
            "candidate_count": 0,
            "average_score": 0.0,
        }

    adjacent_count = sum(
        relationship.relationship_type
        == "ADJACENT"
        for relationship in relationships
    )

    nearby_count = sum(
        relationship.relationship_type
        == "NEARBY"
        for relationship in relationships
    )

    candidate_count = sum(
        relationship.relationship_type
        == "CANDIDATE"
        for relationship in relationships
    )

    average_score = sum(
        relationship.score
        for relationship in relationships
    ) / len(relationships)

    return {
        "relationship_count": len(
            relationships
        ),
        "adjacent_count": adjacent_count,
        "nearby_count": nearby_count,
        "candidate_count": candidate_count,
        "average_score": round(
            average_score,
            4,
        ),
    }