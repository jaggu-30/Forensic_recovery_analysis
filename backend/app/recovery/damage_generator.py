from pathlib import Path
import hashlib
import json


def sha256_file(path: Path) -> str:
    sha256 = hashlib.sha256()

    with path.open("rb") as file:
        while chunk := file.read(1024 * 1024):
            sha256.update(chunk)

    return sha256.hexdigest()


def create_damaged_copy(
    source_path: Path,
    damaged_path: Path,
    damage_start: int,
    damage_size: int,
) -> dict:

    data = source_path.read_bytes()

    original_size = len(data)

    if damage_start < 0:
        raise ValueError("damage_start cannot be negative.")

    if damage_start >= original_size:
        raise ValueError("damage_start is outside the file.")

    damage_end = min(
        damage_start + damage_size,
        original_size,
    )

    damaged_data = (
        data[:damage_start]
        + data[damage_end:]
    )

    damaged_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    damaged_path.write_bytes(damaged_data)

    metadata = {
        "source_file": str(source_path),
        "damaged_file": str(damaged_path),

        "original_size": original_size,
        "damaged_size": len(damaged_data),

        "damage_start": damage_start,
        "damage_end": damage_end,
        "damage_size": damage_end - damage_start,

        "original_sha256": sha256_file(source_path),
        "damaged_sha256": sha256_file(damaged_path),

        "damage_type": "BYTE_RANGE_REMOVAL",
    }

    return metadata


if __name__ == "__main__":

    source = Path(
        "storage/evidence/"
        "051702c7-4574-4d92-a212-84d1236e3e1e/"
        "ceefb980-de63-4232-980f-ce3887cb8e9b_Mr (1).pdf"
    )

    original_copy = Path(
        "../data/benchmark/original/Mr (1)_original.pdf"
    )

    damaged_copy = Path(
        "../data/benchmark/damaged/Mr (1)_damaged.pdf"
    )

    metadata_path = Path(
        "../data/benchmark/damaged/"
        "damage_metadata.json"
    )

    # ---------------------------------------------------------
    # Preserve a ground-truth copy
    # ---------------------------------------------------------

    original_copy.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    original_copy.write_bytes(
        source.read_bytes()
    )

    # ---------------------------------------------------------
    # Controlled damage
    #
    # Remove 4096 bytes from the middle of the PDF.
    # ---------------------------------------------------------

    metadata = create_damaged_copy(
        source_path=source,
        damaged_path=damaged_copy,
        damage_start=90000,
        damage_size=4096,
    )

    metadata_path.write_text(
        json.dumps(
            metadata,
            indent=4,
        ),
        encoding="utf-8",
    )

    print("Controlled damage created successfully.")
    print()
    print(f"Original : {original_copy}")
    print(f"Damaged  : {damaged_copy}")
    print()
    print(f"Original size : {metadata['original_size']}")
    print(f"Damaged size  : {metadata['damaged_size']}")
    print(f"Removed bytes : {metadata['damage_size']}")
    print(f"Damage start : {metadata['damage_start']}")
    print(f"Damage end   : {metadata['damage_end']}")
    print()
    print(
        f"Original SHA-256: "
        f"{metadata['original_sha256']}"
    )
    print(
        f"Damaged SHA-256 : "
        f"{metadata['damaged_sha256']}"
    )