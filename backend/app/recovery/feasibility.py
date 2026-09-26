from typing import Any


def calculate_completeness(
    observed_bytes: int,
    missing_bytes: int,
) -> float:
    """
    Calculate evidence completeness.

    This represents how much of the expected evidence is
    currently available. It does NOT mean that missing
    bytes can be reconstructed.
    """

    total_bytes = observed_bytes + missing_bytes

    if total_bytes <= 0:
        return 0.0

    completeness = observed_bytes / total_bytes

    return round(
        max(0.0, min(1.0, completeness)),
        4,
    )


def classify_feasibility(
    completeness: float,
    structural_valid: bool,
    missing_bytes: int,
) -> str:
    """
    Classify realistic recovery feasibility.

    This classification does not claim that missing bytes
    can be recreated.
    """

    if missing_bytes <= 0 and structural_valid:
        return "HIGH"

    # A complete byte range without a recognisable, valid structure does not
    # establish that recovery is possible. It only means no byte gap was
    # measured inside the file that was uploaded.
    if missing_bytes <= 0:
        return "INSUFFICIENT EVIDENCE"

    if structural_valid and completeness >= 0.90:
        return "PARTIAL"

    if completeness >= 0.50:
        return "LOW"

    return "INSUFFICIENT EVIDENCE"


def calculate_recovery_confidence(
    completeness: float,
    structural_confidence: float,
) -> float:
    """
    Combine evidence completeness and structural confidence.

    This is a confidence in the assessment of the available
    evidence, not a probability that missing bytes can be
    magically recovered.
    """

    confidence = (
        completeness * 0.70
        + structural_confidence * 0.30
    )

    return round(
        max(0.0, min(1.0, confidence)),
        4,
    )


def analyze_recovery_feasibility(
    *,
    observed_bytes: int,
    missing_bytes: int,
    structural_valid: bool,
    structural_confidence: float,
    fragment_count: int,
    missing_regions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:

    missing_regions = missing_regions or []

    completeness = calculate_completeness(
        observed_bytes=observed_bytes,
        missing_bytes=missing_bytes,
    )

    feasibility = classify_feasibility(
        completeness=completeness,
        structural_valid=structural_valid,
        missing_bytes=missing_bytes,
    )

    recovery_confidence = calculate_recovery_confidence(
        completeness=completeness,
        structural_confidence=structural_confidence,
    )

    if missing_bytes == 0:
        explanation = (
            "All expected bytes are available and the "
            "evidence is structurally valid."
        )

    elif structural_valid:
        explanation = (
            f"The evidence is structurally valid, but "
            f"{missing_bytes} bytes are unavailable. "
            "The available evidence supports partial recovery "
            "and structural analysis, but unavailable bytes "
            "must not be treated as reconstructed original data."
        )

    elif missing_bytes > 0:
        explanation = (
            f"The evidence contains {missing_bytes} unavailable "
            "bytes and structural validation is incomplete. "
            "Additional supporting evidence is required."
        )

    else:
        explanation = (
            "Insufficient evidence is available to establish "
            "a reliable recovery assessment."
        )

    return {
        "feasibility": feasibility,

        "observed_bytes": observed_bytes,
        "missing_bytes": missing_bytes,

        "completeness": completeness,

        "fragment_count": fragment_count,

        "structural_valid": structural_valid,
        "structural_confidence": round(
            structural_confidence,
            4,
        ),

        "recovery_confidence": recovery_confidence,

        "missing_regions": missing_regions,

        "explanation": explanation,

        "forensic_warning": (
            "Missing bytes are not considered reconstructed "
            "unless supported by independent evidence."
        ),
    }
