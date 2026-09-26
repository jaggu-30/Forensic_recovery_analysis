from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path

from app.recovery.scanner import (
    calculate_entropy,
    scan_signatures,
)
from app.ai.classifier import classify_fragment


@dataclass
class Fragment:
    fragment_id: str
    offset: int
    size: int
    end_offset: int
    sha256: str
    entropy: float
    probable_type: str
    classification: str
    confidence: float


DEFAULT_BLOCK_SIZE = 4096


def calculate_sha256(data: bytes) -> str:
    return sha256(data).hexdigest()


def probable_type_from_offset(
    offset: int,
    signatures: list,
) -> str:

    valid_candidates = [
        signature
        for signature in signatures
        if (
            signature.offset <= offset
            and signature.classification == "STRUCTURALLY_VALID"
        )
    ]

    if not valid_candidates:
        return "UNKNOWN"

    nearest = max(
        valid_candidates,
        key=lambda item: item.offset,
    )

    return nearest.file_type


def detect_fragments(
    file_path: str | Path,
    block_size: int = DEFAULT_BLOCK_SIZE,
) -> list[Fragment]:

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Evidence file not found: {path}"
        )

    signatures = scan_signatures(path)

    fragments = []

    fragment_number = 1
    offset = 0

    with path.open("rb") as file:

        while True:

            data = file.read(block_size)

            if not data:
                break

            size = len(data)
            end_offset = offset + size - 1

            entropy = calculate_entropy(data)

            probable_type = probable_type_from_offset(
                offset,
                signatures,
            )

            classification, confidence = classify_fragment(
                data,
                entropy=entropy,
                probable_type=probable_type,
            )

            fragment = Fragment(
                fragment_id=f"FRAG-{fragment_number:04d}",
                offset=offset,
                size=size,
                end_offset=end_offset,
                sha256=calculate_sha256(data),
                entropy=entropy,
                probable_type=probable_type,
                classification=classification,
                confidence=confidence,
            )

            fragments.append(fragment)

            fragment_number += 1
            offset += size

    return fragments


def summarize_fragments(
    fragments: list[Fragment],
) -> dict:

    type_counts = {}

    classification_counts = {}

    for fragment in fragments:

        type_counts[fragment.probable_type] = (
            type_counts.get(
                fragment.probable_type,
                0,
            )
            + 1
        )

        classification_counts[
            fragment.classification
        ] = (
            classification_counts.get(
                fragment.classification,
                0,
            )
            + 1
        )

    average_confidence = (
        sum(
            fragment.confidence
            for fragment in fragments
        )
        / len(fragments)
        if fragments
        else 0.0
    )

    return {
        "fragment_count": len(fragments),
        "type_distribution": type_counts,
        "classification_distribution": classification_counts,
        "average_confidence": round(
            average_confidence,
            4,
        ),
    }
