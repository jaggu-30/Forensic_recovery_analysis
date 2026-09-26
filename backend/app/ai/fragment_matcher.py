"""Fragment matcher — cross-evidence fragment similarity and sequencing.

Compares fragments from the same evidence file and attempts to find
the best linear ordering using a greedy nearest-neighbour approach.
No bytes are invented; the matcher only reports which physically present
fragments are most likely to be adjacent.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.recovery.fragment_detector import Fragment


@dataclass
class FragmentMatch:
    """Describes a candidate pairing between two fragments."""

    source_id: str
    target_id: str
    source_offset: int
    target_offset: int
    offset_gap: int
    entropy_delta: float
    type_match: bool
    classification_match: bool
    combined_score: float    # 0.0 – 1.0
    reason: str


def _score_pair(source: Fragment, target: Fragment) -> FragmentMatch:
    """Score a candidate source→target pairing."""

    # 1. Offset adjacency ---------------------------------------------------
    gap = target.offset - (source.end_offset + 1)
    if gap == 0:
        offset_score = 1.00
        adj_reason = "contiguous"
    elif abs(gap) <= 512:
        offset_score = 0.85
        adj_reason = f"near-contiguous (gap {gap})"
    elif abs(gap) <= 4096:
        offset_score = 0.60
        adj_reason = f"close gap ({gap})"
    elif abs(gap) <= 65536:
        offset_score = 0.30
        adj_reason = f"moderate gap ({gap})"
    else:
        offset_score = 0.05
        adj_reason = f"large gap ({gap})"

    # 2. Type compatibility --------------------------------------------------
    type_match = (
        source.probable_type != "UNKNOWN"
        and source.probable_type == target.probable_type
    )
    type_score = 1.0 if type_match else (0.35 if "UNKNOWN" in (source.probable_type, target.probable_type) else 0.0)

    # 3. Entropy similarity -------------------------------------------------
    entropy_delta = abs(source.entropy - target.entropy)
    entropy_score = max(0.0, 1.0 - entropy_delta / 8.0)

    # 4. Classification match -----------------------------------------------
    class_match = source.classification == target.classification
    class_score = 1.0 if class_match else 0.4

    # Weighted combination (mirrors relationship_engine weights)
    combined = (
        offset_score * 0.45
        + type_score * 0.25
        + entropy_score * 0.18
        + class_score * 0.12
    )

    reason_parts = [adj_reason]
    if type_match:
        reason_parts.append(f"type={source.probable_type}")
    if class_match:
        reason_parts.append(f"class={source.classification}")

    return FragmentMatch(
        source_id=source.fragment_id,
        target_id=target.fragment_id,
        source_offset=source.offset,
        target_offset=target.offset,
        offset_gap=gap,
        entropy_delta=round(entropy_delta, 6),
        type_match=type_match,
        classification_match=class_match,
        combined_score=round(max(0.0, min(combined, 1.0)), 4),
        reason=", ".join(reason_parts),
    )


def match_fragments(
    fragments: list[Fragment],
    *,
    min_score: float = 0.25,
    max_gap: int = 65536,
) -> list[FragmentMatch]:
    """
    Find the best candidate successor for every fragment.

    For each fragment, score all other fragments as potential successors
    and keep only pairs whose combined_score >= min_score and whose
    offset_gap <= max_gap.

    Returns a list sorted by combined_score descending.
    """
    if len(fragments) < 2:
        return []

    ordered = sorted(fragments, key=lambda f: f.offset)
    matches: list[FragmentMatch] = []
    seen: set[tuple[str, str]] = set()

    for i, source in enumerate(ordered):
        candidates: list[FragmentMatch] = []

        for j, target in enumerate(ordered):
            if i == j:
                continue
            # Only consider targets that come after the source in the file
            if target.offset <= source.end_offset:
                continue
            gap = target.offset - (source.end_offset + 1)
            if gap > max_gap:
                continue

            pair_key = (source.fragment_id, target.fragment_id)
            if pair_key in seen:
                continue

            m = _score_pair(source, target)
            if m.combined_score >= min_score:
                candidates.append(m)

        if candidates:
            # Keep the best-scoring candidate per source
            best = max(candidates, key=lambda m: m.combined_score)
            seen.add((best.source_id, best.target_id))
            matches.append(best)

    matches.sort(key=lambda m: m.combined_score, reverse=True)
    return matches


def build_sequence(
    fragments: list[Fragment],
    matches: list[FragmentMatch],
) -> list[str]:
    """
    Build the most likely linear sequence of fragment IDs.

    Uses a greedy chain: start from the lowest-offset fragment, then
    repeatedly follow the best-scored match until no further match exists.

    Returns
    -------
    list[str]
        Ordered list of fragment_id values.
    """
    if not fragments:
        return []

    # Index matches by source_id → best match
    best_next: dict[str, FragmentMatch] = {}
    for m in matches:
        if m.source_id not in best_next or m.combined_score > best_next[m.source_id].combined_score:
            best_next[m.source_id] = m

    ordered = sorted(fragments, key=lambda f: f.offset)
    sequence: list[str] = [ordered[0].fragment_id]
    visited: set[str] = {ordered[0].fragment_id}

    current_id = ordered[0].fragment_id
    while current_id in best_next:
        nxt = best_next[current_id]
        if nxt.target_id in visited:
            break
        sequence.append(nxt.target_id)
        visited.add(nxt.target_id)
        current_id = nxt.target_id

    # Append any fragments not reached by the chain, in offset order
    reached = set(sequence)
    for frag in ordered:
        if frag.fragment_id not in reached:
            sequence.append(frag.fragment_id)

    return sequence


def summarize_matches(matches: list[FragmentMatch]) -> dict[str, Any]:
    """Return a summary dict compatible with the reconstruction API response."""
    if not matches:
        return {
            "match_count": 0,
            "contiguous_count": 0,
            "near_contiguous_count": 0,
            "average_score": 0.0,
        }

    contiguous = sum(1 for m in matches if m.offset_gap == 0)
    near_contiguous = sum(1 for m in matches if 0 < abs(m.offset_gap) <= 512)

    return {
        "match_count": len(matches),
        "contiguous_count": contiguous,
        "near_contiguous_count": near_contiguous,
        "average_score": round(
            sum(m.combined_score for m in matches) / len(matches),
            4,
        ),
        "top_matches": [
            {
                "source": m.source_id,
                "target": m.target_id,
                "score": m.combined_score,
                "gap": m.offset_gap,
                "reason": m.reason,
            }
            for m in matches[:5]
        ],
    }
