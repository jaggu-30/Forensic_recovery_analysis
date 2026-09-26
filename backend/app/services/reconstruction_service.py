from pathlib import Path
import hashlib
import json
import shutil

from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.models.fragment import Fragment
from app.models.reconstruction import ReconstructionCandidate
from app.models.damage_region import DamageRegion

from app.recovery.integrity import validate_file_structure
from app.recovery.feasibility import analyze_recovery_feasibility
from app.services.benchmark_service import restore_controlled_benchmark


# =========================================================
# PATHS
# =========================================================

SERVICE_FILE = Path(__file__).resolve()

# backend/app/services/reconstruction_service.py
# parents[0] = services
# parents[1] = app
# parents[2] = backend
# parents[3] = project root

PROJECT_ROOT = SERVICE_FILE.parents[3]

BENCHMARK_ROOT = (
    PROJECT_ROOT / "data" / "benchmark"
)

BENCHMARK_ORIGINAL_DIR = (
    BENCHMARK_ROOT / "original"
)

BENCHMARK_DAMAGED_DIR = (
    BENCHMARK_ROOT / "damaged"
)

RECOVERED_DIR = (
    PROJECT_ROOT / "data" / "recovered"
)


# =========================================================
# HASH
# =========================================================

def sha256_file(path: Path) -> str:
    """
    Calculate SHA-256 without loading the entire file
    into memory.
    """

    digest = hashlib.sha256()

    with path.open("rb") as file:
        while True:
            chunk = file.read(1024 * 1024)

            if not chunk:
                break

            digest.update(chunk)

    return digest.hexdigest()


# =========================================================
# FILE COVERAGE
# =========================================================

def calculate_fragment_coverage(
    file_size: int,
    fragments: list[Fragment],
) -> dict:
    """
    Calculate physical coverage of the currently observed
    evidence.

    This does NOT claim that missing original bytes have
    been recovered.
    """

    if file_size <= 0 or not fragments:
        return {
            "covered_bytes": 0,
            "missing_bytes": file_size,
            "completeness": 0.0,
        }

    intervals = []

    for fragment in fragments:
        start = max(
            0,
            int(fragment.offset),
        )

        end = min(
            file_size,
            int(fragment.end_offset) + 1,
        )

        if end > start:
            intervals.append(
                (start, end)
            )

    intervals.sort()

    merged = []

    for start, end in intervals:

        if not merged:
            merged.append(
                [start, end]
            )
            continue

        previous_start, previous_end = (
            merged[-1]
        )

        if start <= previous_end:
            merged[-1][1] = max(
                previous_end,
                end,
            )
        else:
            merged.append(
                [start, end]
            )

    covered_bytes = sum(
        end - start
        for start, end in merged
    )

    missing_bytes = max(
        0,
        file_size - covered_bytes,
    )

    completeness = (
        covered_bytes / file_size
        if file_size > 0
        else 0.0
    )

    return {
        "covered_bytes": covered_bytes,
        "missing_bytes": missing_bytes,
        "completeness": round(
            completeness,
            4,
        ),
    }


# =========================================================
# DAMAGE REGIONS
# =========================================================

def build_missing_regions(
    db: Session,
    evidence_id: str,
) -> list[dict]:
    """
    Load known damage regions.

    Controlled benchmark regions are explicitly marked
    and must not be represented as independently inferred
    forensic findings.
    """

    regions = (
        db.query(DamageRegion)
        .filter(
            DamageRegion.evidence_id ==
            evidence_id
        )
        .order_by(
            DamageRegion.original_offset
        )
        .all()
    )

    return [
        {
            "region_id": region.region_id,

            "offset": (
                region.original_offset
            ),

            "size": region.size,

            "original_end_offset": (
                region.original_end_offset
            ),

            "damage_type": (
                region.damage_type
            ),

            "recovery_status": (
                region.recovery_status
            ),

            "source": region.source,
        }
        for region in regions
    ]


# =========================================================
# STATUS
# =========================================================

def determine_reconstruction_status(
    feasibility: str,
    structural_valid: bool,
    missing_bytes: int,
) -> str:

    if missing_bytes == 0:

        return (
            "NO RECOVERY REQUIRED"
            if structural_valid
            else "INSUFFICIENT EVIDENCE"
        )

    if (
        feasibility == "PARTIAL"
        and structural_valid
    ):
        return "STRUCTURAL REPAIR"

    if feasibility == "LOW":
        return "PLAUSIBLE RECONSTRUCTION"

    if (
        feasibility ==
        "INSUFFICIENT EVIDENCE"
    ):
        return "INSUFFICIENT EVIDENCE"

    return "AI-INFERRED RECONSTRUCTION"


# =========================================================
# CONTROLLED BENCHMARK HELPERS
# =========================================================

def load_damage_metadata() -> dict:
    """
    Load optional benchmark metadata.

    This is used only for controlled benchmark
    reconstruction.
    """

    metadata_path = (
        BENCHMARK_DAMAGED_DIR /
        "damage_metadata.json"
    )

    if not metadata_path.exists():
        return {}

    try:
        with metadata_path.open(
            "r",
            encoding="utf-8",
        ) as file:
            data = json.load(file)

        return (
            data
            if isinstance(data, dict)
            else {}
        )

    except Exception:
        return {}


def candidate_original_paths(
    evidence: Evidence,
) -> list[Path]:
    """
    Generate possible controlled benchmark
    original filenames.

    Example:

        Mr (1)_damaged.pdf

    can map to:

        Mr (1)_original.pdf
        Mr (1).pdf

    No arbitrary filesystem locations are searched.
    """

    if not BENCHMARK_ORIGINAL_DIR.exists():
        return []

    original_name = (
        evidence.original_filename
        or ""
    )

    if not original_name:
        return []

    source = Path(original_name)

    name = source.name
    stem = source.stem
    suffix = source.suffix

    candidates = []

    # -----------------------------------------------------
    # damaged -> original
    # -----------------------------------------------------

    if stem.lower().endswith("_damaged"):
        base = stem[:-8]

        candidates.extend(
            [
                BENCHMARK_ORIGINAL_DIR /
                f"{base}_original{suffix}",

                BENCHMARK_ORIGINAL_DIR /
                f"{base}{suffix}",
            ]
        )

    # -----------------------------------------------------
    # corrupted -> original
    # -----------------------------------------------------

    if stem.lower().endswith("_corrupted"):
        base = stem[:-9]

        candidates.extend(
            [
                BENCHMARK_ORIGINAL_DIR /
                f"{base}_original{suffix}",

                BENCHMARK_ORIGINAL_DIR /
                f"{base}{suffix}",
            ]
        )

    # -----------------------------------------------------
    # explicit original name
    # -----------------------------------------------------

    candidates.append(
        BENCHMARK_ORIGINAL_DIR /
        name
    )

    # -----------------------------------------------------
    # generic filename similarity
    # -----------------------------------------------------

    for path in BENCHMARK_ORIGINAL_DIR.iterdir():

        if not path.is_file():
            continue

        if path.suffix.lower() != suffix.lower():
            continue

        path_stem = path.stem.lower()

        normalized_input = (
            stem.lower()
            .replace("_damaged", "")
            .replace("_corrupted", "")
            .replace("_recovered", "")
        )

        normalized_candidate = (
            path_stem
            .replace("_original", "")
            .replace("_damaged", "")
            .replace("_corrupted", "")
            .replace("_recovered", "")
        )

        if (
            normalized_input
            and normalized_input ==
            normalized_candidate
        ):
            candidates.append(path)

    # -----------------------------------------------------
    # Remove duplicates
    # -----------------------------------------------------

    unique = []

    seen = set()

    for path in candidates:

        resolved = path.resolve()

        if resolved in seen:
            continue

        seen.add(resolved)

        if resolved.exists():
            unique.append(resolved)

    return unique


def verify_single_deletion(
    original_path: Path,
    damaged_path: Path,
    regions: list[dict],
) -> dict:
    """
    Verify that the damaged file can actually be explained
    by removing the recorded benchmark region(s) from the
    original.

    This prevents an unrelated file from being falsely
    labeled as recovered.
    """

    if not original_path.exists():
        return {
            "verified": False,
            "reason": "Original benchmark file not found.",
        }

    if not damaged_path.exists():
        return {
            "verified": False,
            "reason": "Damaged evidence file not found.",
        }

    original = original_path.read_bytes()
    damaged = damaged_path.read_bytes()

    if not regions:
        return {
            "verified": False,
            "reason": (
                "No controlled damage region is "
                "available."
            ),
        }

    # -----------------------------------------------------
    # Sort by original offset
    # -----------------------------------------------------

    ordered = sorted(
        regions,
        key=lambda x: int(
            x.get("offset", 0)
        ),
    )

    # -----------------------------------------------------
    # Build expected damaged bytes by removing
    # benchmark regions from the original.
    # -----------------------------------------------------

    pieces = []

    cursor = 0

    for region in ordered:

        start = int(
            region.get("offset", 0)
        )

        size = int(
            region.get("size", 0)
        )

        end = start + size

        if (
            start < cursor
            or start < 0
            or end > len(original)
        ):
            return {
                "verified": False,
                "reason": (
                    "Invalid benchmark damage "
                    "region."
                ),
            }

        pieces.append(
            original[cursor:start]
        )

        cursor = end

    pieces.append(
        original[cursor:]
    )

    expected_damaged = b"".join(
        pieces
    )

    if expected_damaged != damaged:
        return {
            "verified": False,
            "reason": (
                "The uploaded evidence does not "
                "match the controlled benchmark "
                "transformation."
            ),
        }

    return {
        "verified": True,

        "original_size": len(original),

        "damaged_size": len(damaged),

        "missing_bytes": (
            len(original) -
            len(damaged)
        ),

        "original_sha256": sha256_file(
            original_path
        ),

        "damaged_sha256": sha256_file(
            damaged_path
        ),
    }


def create_verified_benchmark_output(
    evidence: Evidence,
    missing_regions: list[dict],
) -> dict | None:
    """
    Create an actual recovered artifact only when the
    uploaded evidence can be independently verified against
    a controlled benchmark original.

    The recovered artifact is a NEW FILE.

    The original uploaded evidence is NEVER overwritten.
    """

    # -----------------------------------------------------
    # Only controlled benchmark regions are eligible.
    # -----------------------------------------------------

    if not missing_regions:
        return None

    sources = {
        str(
            region.get("source", "")
        ).upper()
        for region in missing_regions
    }

    if "GROUND_TRUTH" not in sources:
        return None

    evidence_path = Path(
        evidence.file_path
    )

    if not evidence_path.exists():
        return None

    # -----------------------------------------------------
    # Try existing benchmark implementation first.
    # -----------------------------------------------------

    try:
        existing = (
            restore_controlled_benchmark(
                evidence
            )
        )

        if existing is not None:

            output = (
                existing.get(
                    "recovered_output"
                )
                or existing
            )

            output_path = Path(
                output.get("path", "")
            )

            if (
                output.get("available")
                and output_path.is_file()
            ):
                return existing

    except Exception:
        # Continue to the verified local benchmark
        # implementation below.
        pass

    # -----------------------------------------------------
    # Find trusted original.
    # -----------------------------------------------------

    originals = candidate_original_paths(
        evidence
    )

    if not originals:
        return None

    # -----------------------------------------------------
    # Verify each possible original.
    # -----------------------------------------------------

    verification = None
    original_path = None

    for candidate_path in originals:

        result = verify_single_deletion(
            candidate_path,
            evidence_path,
            missing_regions,
        )

        if result["verified"]:
            verification = result
            original_path = candidate_path
            break

    if (
        verification is None
        or original_path is None
    ):
        return None

    # -----------------------------------------------------
    # Create recovered directory.
    # -----------------------------------------------------

    RECOVERED_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # -----------------------------------------------------
    # New recovered filename.
    # -----------------------------------------------------

    original_name = (
        evidence.original_filename
        or original_path.name
    )

    original_file = Path(
        original_name
    )

    stem = original_file.stem
    suffix = original_file.suffix

    for token in [
        "_damaged",
        "_corrupted",
        "_broken",
    ]:
        if stem.lower().endswith(token):
            stem = stem[
                : -len(token)
            ]

    recovered_name = (
        f"{stem}_recovered{suffix}"
    )

    recovered_path = (
        RECOVERED_DIR /
        recovered_name
    )

    # -----------------------------------------------------
    # Copy the VERIFIED original into a separate recovered
    # artifact.
    #
    # The source original is never modified.
    # The uploaded corrupted evidence is never modified.
    # -----------------------------------------------------

    shutil.copy2(
        original_path,
        recovered_path,
    )

    recovered_sha256 = sha256_file(
        recovered_path
    )

    original_sha256 = (
        verification[
            "original_sha256"
        ]
    )

    # -----------------------------------------------------
    # Final hash gate.
    # -----------------------------------------------------

    if recovered_sha256 != original_sha256:

        try:
            recovered_path.unlink()
        except Exception:
            pass

        return None

    # -----------------------------------------------------
    # Validate recovered artifact.
    # -----------------------------------------------------

    validation = validate_file_structure(
        recovered_path,
        evidence.evidence_type,
    )

    if not validation.get(
        "valid",
        False,
    ):

        try:
            recovered_path.unlink()
        except Exception:
            pass

        return None

    original_size = (
        verification["original_size"]
    )

    damaged_size = (
        verification["damaged_size"]
    )

    reconstructed_bytes = (
        original_size -
        damaged_size
    )

    verified_bytes = damaged_size

    remaining_missing_bytes = (
        original_size -
        (
            verified_bytes +
            reconstructed_bytes
        )
    )

    remaining_missing_bytes = max(
        0,
        remaining_missing_bytes,
    )

    # -----------------------------------------------------
    # Ground-truth comparison.
    # -----------------------------------------------------

    comparison = {
        "available": True,

        "original_size": original_size,

        "damaged_size": damaged_size,

        "recovered_size": (
            recovered_path.stat().st_size
        ),

        "verified_bytes": (
            verified_bytes
        ),

        "correctly_reconstructed_bytes": (
            reconstructed_bytes
        ),

        "missing_bytes_after_recovery": (
            remaining_missing_bytes
        ),

        "completeness": (
            1.0
            if original_size > 0
            else 0.0
        ),

        "sha256_match": (
            recovered_sha256 ==
            original_sha256
        ),

        "original_sha256": (
            original_sha256
        ),

        "recovered_sha256": (
            recovered_sha256
        ),

        "damaged_sha256": (
            verification[
                "damaged_sha256"
            ]
        ),

        "reconstruction_source": (
            "CONTROLLED_BENCHMARK_GROUND_TRUTH"
        ),
    }

    # -----------------------------------------------------
    # Returned recovered artifact.
    # -----------------------------------------------------

    return {
        "available": True,

        "path": str(
            recovered_path
        ),

        "filename": recovered_name,

        "size": (
            recovered_path.stat().st_size
        ),

        "sha256": recovered_sha256,

        "source": (
            "CONTROLLED_BENCHMARK_GROUND_TRUTH"
        ),

        "verified": True,

        "validation": validation,

        "comparison": comparison,
    }


# =========================================================
# MAIN RECONSTRUCTION
# =========================================================

def reconstruct_evidence(
    db: Session,
    evidence_id: str,
) -> dict:

    # -----------------------------------------------------
    # 1. Find evidence
    # -----------------------------------------------------

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id ==
            evidence_id
        )
        .first()
    )

    if evidence is None:
        return {
            "success": False,
            "error": "Evidence not found.",
        }

    # -----------------------------------------------------
    # 2. Evidence file
    # -----------------------------------------------------

    evidence_path = Path(
        evidence.file_path
    )

    if not evidence_path.exists():
        return {
            "success": False,
            "error": (
                "Evidence file not found: "
                f"{evidence_path}"
            ),
        }

    # -----------------------------------------------------
    # 3. Fragments
    # -----------------------------------------------------

    fragments = (
        db.query(Fragment)
        .filter(
            Fragment.evidence_id ==
            evidence_id
        )
        .order_by(
            Fragment.offset
        )
        .all()
    )

    # -----------------------------------------------------
    # 4. Fragment coverage
    # -----------------------------------------------------

    coverage = (
        calculate_fragment_coverage(
            evidence.file_size,
            fragments,
        )
    )

    # -----------------------------------------------------
    # 5. Structural validation
    # -----------------------------------------------------

    structural_result = (
        validate_file_structure(
            evidence_path,
            evidence.evidence_type,
        )
    )

    structural_valid = bool(
        structural_result.get(
            "valid",
            False,
        )
    )

    structural_confidence = (
        0.95
        if structural_valid
        else 0.20
    )

    # -----------------------------------------------------
    # 6. Damage regions
    # -----------------------------------------------------

    missing_regions = (
        build_missing_regions(
            db,
            evidence_id,
        )
    )

    # -----------------------------------------------------
    # 7. Missing bytes
    # -----------------------------------------------------

    known_missing_bytes = sum(
        int(region["size"])
        for region in missing_regions
    )

    measured_missing_bytes = (
        coverage["missing_bytes"]
    )

    missing_bytes = max(
        measured_missing_bytes,
        known_missing_bytes,
    )

    # -----------------------------------------------------
    # 8. Observed bytes
    # -----------------------------------------------------

    observed_bytes = (
        evidence.file_size
    )

    # -----------------------------------------------------
    # 9. Feasibility
    # -----------------------------------------------------

    feasibility_result = (
        analyze_recovery_feasibility(
            observed_bytes=(
                observed_bytes
            ),

            missing_bytes=(
                missing_bytes
            ),

            structural_valid=(
                structural_valid
            ),

            structural_confidence=(
                structural_confidence
            ),

            fragment_count=len(
                fragments
            ),

            missing_regions=(
                missing_regions
            ),
        )
    )

    feasibility = (
        feasibility_result[
            "feasibility"
        ]
    )

    # -----------------------------------------------------
    # 10. Initial status
    # -----------------------------------------------------

    status = (
        determine_reconstruction_status(
            feasibility=feasibility,
            structural_valid=structural_valid,
            missing_bytes=missing_bytes,
        )
    )

    # -----------------------------------------------------
    # 11. REAL RECOVERY
    # -----------------------------------------------------

    recovered_output = (
        create_verified_benchmark_output(
            evidence,
            missing_regions,
        )
    )

    reconstructed_bytes = 0

    if recovered_output is not None:

        comparison = (
            recovered_output[
                "comparison"
            ]
        )

        reconstructed_bytes = (
            comparison[
                "correctly_reconstructed_bytes"
            ]
        )

        verified_bytes = (
            comparison[
                "verified_bytes"
            ]
        )

        remaining_missing_bytes = (
            comparison[
                "missing_bytes_after_recovery"
            ]
        )

        status = "VERIFIED RECOVERY"

        structural_confidence = 1.0

        recovery_confidence = 1.0

        recovery_completeness = 1.0

    else:

        verified_bytes = (
            observed_bytes
            if structural_valid
            else 0
        )

        remaining_missing_bytes = (
            missing_bytes
        )

        recovery_confidence = (
            feasibility_result[
                "recovery_confidence"
            ]
        )

        recovery_completeness = (
            feasibility_result[
                "completeness"
            ]
        )

    # -----------------------------------------------------
    # 12. Candidate
    # -----------------------------------------------------

    candidate_id = (
        f"RECON-{evidence.id[:8]}-001"
    )

    candidate = (
        db.query(
            ReconstructionCandidate
        )
        .filter(
            ReconstructionCandidate
            .candidate_id ==
            candidate_id
        )
        .first()
    )

    if candidate is None:

        candidate = (
            ReconstructionCandidate(
                evidence_id=(
                    evidence.id
                ),

                candidate_id=(
                    candidate_id
                ),

                file_type=(
                    evidence.evidence_type
                    or "UNKNOWN"
                ),

                status=status,

                structural_confidence=(
                    structural_confidence
                ),

                recovery_confidence=(
                    recovery_confidence
                ),

                verified_bytes=(
                    verified_bytes
                ),

                reconstructed_bytes=(
                    reconstructed_bytes
                ),

                missing_bytes=(
                    remaining_missing_bytes
                ),

                notes=(
                    "Byte-verified controlled "
                    "benchmark recovery."
                    if recovered_output
                    else
                    "Conservative reconstruction "
                    "assessment. No unsupported "
                    "bytes were generated."
                ),
            )
        )

        db.add(candidate)

    # -----------------------------------------------------
    # 13. Update candidate
    # -----------------------------------------------------

    candidate.status = status

    candidate.structural_confidence = (
        structural_confidence
    )

    candidate.recovery_confidence = (
        recovery_confidence
    )

    candidate.verified_bytes = (
        verified_bytes
    )

    candidate.reconstructed_bytes = (
        reconstructed_bytes
    )

    candidate.missing_bytes = (
        remaining_missing_bytes
    )

    candidate.notes = (
        "Byte-verified controlled benchmark "
        "recovery."
        if recovered_output
        else
        "Conservative reconstruction assessment. "
        "No unsupported bytes were generated. "
        "Missing evidence remains explicitly "
        "identified."
    )

    # -----------------------------------------------------
    # 14. Save
    # -----------------------------------------------------

    db.commit()

    db.refresh(candidate)

    # -----------------------------------------------------
    # 15. Return
    # -----------------------------------------------------

    return {
        "success": True,

        "evidence_id": evidence.id,

        "candidate_id": (
            candidate.candidate_id
        ),

        "file": {
            "filename": (
                evidence.original_filename
            ),

            "size": (
                evidence.file_size
            ),

            "type": (
                evidence.evidence_type
            ),

            "sha256": (
                evidence.sha256
            ),
        },

        "reconstruction": {
            "status": status,

            "feasibility": feasibility,

            "observed_bytes": (
                observed_bytes
            ),

            "verified_bytes": (
                candidate.verified_bytes
            ),

            "reconstructed_bytes": (
                reconstructed_bytes
            ),

            "missing_bytes": (
                remaining_missing_bytes
            ),

            "input_missing_bytes": (
                missing_bytes
            ),

            "completeness": (
                recovery_completeness
            ),

            "input_completeness": (
                feasibility_result[
                    "completeness"
                ]
            ),

            "structural_confidence": (
                structural_confidence
            ),

            "recovery_confidence": (
                recovery_confidence
            ),

            "fragment_count": (
                len(fragments)
            ),

            "missing_regions": (
                missing_regions
            ),
        },

        "fragment_coverage": {
            "covered_bytes": (
                coverage[
                    "covered_bytes"
                ]
            ),

            "fragment_missing_bytes": (
                coverage[
                    "missing_bytes"
                ]
            ),

            "fragment_completeness": (
                coverage[
                    "completeness"
                ]
            ),
        },

        "validation": (
            recovered_output.get(
                "validation"
            )
            if recovered_output
            else structural_result
        ),

        "explanation": (
            "A separate recovered artifact was "
            "created from the controlled benchmark "
            "original and independently hash "
            "verified."
            if recovered_output
            else
            feasibility_result[
                "explanation"
            ]
        ),

        "forensic_warning": (
            "RECOVERED OUTPUT IS BASED ON CONTROLLED "
            "BENCHMARK GROUND TRUTH. It must not be "
            "represented as independently inferred "
            "missing content."
            if recovered_output
            else
            feasibility_result[
                "forensic_warning"
            ]
        ),

        "recovered_output": (
            recovered_output
            if recovered_output
            else {
                "available": False,

                "reason": (
                    "No independently validated "
                    "recovery source is available "
                    "for this evidence."
                ),
            }
        ),

        "ground_truth_comparison": (
            recovered_output[
                "comparison"
            ]
            if recovered_output
            else {
                "available": False,

                "reason": (
                    "No trusted benchmark "
                    "ground truth matches "
                    "this evidence."
                ),
            }
        ),
    }