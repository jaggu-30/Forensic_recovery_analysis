"""Explainable fragment classification based on observable byte features.

This deliberately avoids claiming semantic certainty from a black-box model.
Its output is a reproducible evidence-fusion score using magic-byte context,
entropy, byte composition, and format-specific structural markers.
"""

from __future__ import annotations

from app.ai.confidence import weighted_confidence


def extract_byte_features(data: bytes) -> dict[str, float]:
    if not data:
        return {
            "zero_ratio": 0.0,
            "printable_ratio": 0.0,
            "high_bit_ratio": 0.0,
        }

    length = len(data)
    printable = sum(32 <= value <= 126 or value in (9, 10, 13) for value in data)
    high_bit = sum(value >= 128 for value in data)
    zeroes = data.count(0)

    return {
        "zero_ratio": zeroes / length,
        "printable_ratio": printable / length,
        "high_bit_ratio": high_bit / length,
    }


def classify_fragment(
    data: bytes,
    *,
    entropy: float,
    probable_type: str,
) -> tuple[str, float]:
    """Classify a fragment and quantify confidence from its raw bytes."""

    features = extract_byte_features(data)
    type_known = probable_type != "UNKNOWN"
    entropy_signal = min(max(entropy / 8.0, 0.0), 1.0)

    if probable_type == "PDF":
        has_pdf_structure = any(
            marker in data
            for marker in (b"obj", b"endobj", b"xref", b"trailer", b"stream")
        )
        classification = (
            "PDF_STRUCTURAL_REGION"
            if has_pdf_structure or entropy < 5.0
            else "PDF_DATA_REGION"
        )
        confidence = weighted_confidence(
            (1.0 if type_known else 0.0, 0.55),
            (1.0 if has_pdf_structure else 0.55, 0.25),
            (1.0 - features["zero_ratio"], 0.20),
        )
        return classification, confidence

    if probable_type in {"JPEG", "PNG", "GIF87A", "GIF89A"}:
        classification = (
            "IMAGE_DATA_REGION" if entropy >= 6.0 else "IMAGE_STRUCTURAL_REGION"
        )
        confidence = weighted_confidence(
            (1.0 if type_known else 0.0, 0.60),
            (entropy_signal, 0.25),
            (1.0 - features["zero_ratio"], 0.15),
        )
        return classification, confidence

    if features["zero_ratio"] >= 0.80:
        return "SPARSE_OR_ZERO_FILLED_REGION", weighted_confidence(
            (features["zero_ratio"], 0.75),
            (1.0 - entropy_signal, 0.25),
        )

    if entropy >= 7.5:
        return "HIGH_ENTROPY_REGION", weighted_confidence(
            (entropy_signal, 0.70),
            (1.0 - features["printable_ratio"], 0.30),
        )

    if entropy >= 4.0:
        return "BINARY_DATA_REGION", weighted_confidence(
            (entropy_signal, 0.55),
            (1.0 - features["printable_ratio"], 0.25),
            (1.0 - features["zero_ratio"], 0.20),
        )

    return "LOW_ENTROPY_REGION", weighted_confidence(
        (1.0 - entropy_signal, 0.65),
        (features["printable_ratio"], 0.20),
        (features["zero_ratio"], 0.15),
    )
