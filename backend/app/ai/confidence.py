"""Small, explainable confidence utilities for forensic classifiers."""

from __future__ import annotations


def bounded_score(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 4)


def weighted_confidence(*components: tuple[float, float]) -> float:
    """Return a normalized weighted score from observable signals only."""

    total_weight = sum(weight for _, weight in components)
    if total_weight <= 0:
        return 0.0

    return bounded_score(
        sum(value * weight for value, weight in components) / total_weight
    )
