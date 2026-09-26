from dataclasses import dataclass
from math import log2
from pathlib import Path


@dataclass
class SignatureMatch:
    file_type: str
    offset: int
    signature: str
    description: str
    classification: str = "UNVERIFIED_SIGNATURE"
    validation: dict | None = None


SIGNATURES = [
    ("JPEG", b"\xFF\xD8\xFF", "JPEG image header"),
    ("PNG", b"\x89PNG\r\n\x1a\n", "PNG image header"),
    ("PDF", b"%PDF-", "PDF document header"),
    ("GIF87A", b"GIF87a", "GIF image header"),
    ("GIF89A", b"GIF89a", "GIF image header"),
    ("ZIP", b"PK\x03\x04", "ZIP/container header"),
    ("RIFF", b"RIFF", "RIFF container header"),
    ("PE", b"MZ", "Windows executable header"),
    ("ELF", b"\x7fELF", "ELF executable header"),
]


def calculate_entropy(data: bytes) -> float:
    if not data:
        return 0.0

    frequencies = [0] * 256

    for byte in data:
        frequencies[byte] += 1

    length = len(data)
    entropy = 0.0

    for count in frequencies:
        if count == 0:
            continue

        probability = count / length
        entropy -= probability * log2(probability)

    return round(entropy, 6)


def read_at(
    path: Path,
    offset: int,
    size: int,
) -> bytes:
    with path.open("rb") as file:
        file.seek(offset)
        return file.read(size)


def validate_pdf(path: Path, offset: int) -> dict:
    data = read_at(path, offset, min(16 * 1024 * 1024, path.stat().st_size - offset))

    eof_position = data.rfind(b"%%EOF")

    return {
        "valid": eof_position != -1,
        "header_valid": data.startswith(b"%PDF-"),
        "eof_marker_found": eof_position != -1,
        "eof_offset": (
            offset + eof_position
            if eof_position != -1
            else None
        ),
        "reason": (
            "PDF header and EOF marker detected."
            if eof_position != -1
            else "PDF header detected but EOF marker was not found."
        ),
    }


def validate_pe(path: Path, offset: int) -> dict:
    file_size = path.stat().st_size

    # DOS header must contain the PE header offset
    if offset + 0x40 > file_size:
        return {
            "valid": False,
            "mz_header_valid": True,
            "pe_signature_found": False,
            "reason": "Insufficient bytes for a complete DOS header.",
        }

    dos_header = read_at(path, offset, 64)

    if not dos_header.startswith(b"MZ"):
        return {
            "valid": False,
            "mz_header_valid": False,
            "pe_signature_found": False,
            "reason": "MZ signature not present.",
        }

    pe_offset = int.from_bytes(
        dos_header[0x3C:0x40],
        byteorder="little",
    )

    absolute_pe_offset = offset + pe_offset

    if absolute_pe_offset + 4 > file_size:
        return {
            "valid": False,
            "mz_header_valid": True,
            "pe_signature_found": False,
            "pe_offset": pe_offset,
            "reason": "PE header offset points outside the file.",
        }

    pe_signature = read_at(
        path,
        absolute_pe_offset,
        4,
    )

    pe_valid = pe_signature == b"PE\x00\x00"

    return {
        "valid": pe_valid,
        "mz_header_valid": True,
        "pe_signature_found": pe_valid,
        "pe_offset": pe_offset,
        "absolute_pe_offset": absolute_pe_offset,
        "reason": (
            "Valid PE signature found."
            if pe_valid
            else "MZ signature found, but PE\\0\\0 signature was not found."
        ),
    }


def validate_signature(
    path: Path,
    file_type: str,
    offset: int,
) -> tuple[str, dict]:

    if file_type == "PDF":
        validation = validate_pdf(path, offset)

        if validation["valid"]:
            return "STRUCTURALLY_VALID", validation

        return "UNVERIFIED_SIGNATURE", validation

    if file_type == "PE":
        validation = validate_pe(path, offset)

        if validation["valid"]:
            return "STRUCTURALLY_VALID", validation

        return "UNVERIFIED_SIGNATURE", validation

    footer_markers = {
        "JPEG": b"\xff\xd9",
        "PNG": b"IEND\xaeB`\x82",
        "GIF87A": b";",
        "GIF89A": b";",
    }
    if file_type in footer_markers:
        validation = validate_container_marker(
            path,
            offset,
            file_type=file_type,
            footer=footer_markers[file_type],
        )
        return (
            "STRUCTURALLY_VALID"
            if validation["valid"]
            else "UNVERIFIED_SIGNATURE",
            validation,
        )

    # Other signatures are currently candidate-level detections.
    return (
        "SIGNATURE_CANDIDATE",
        {
            "valid": None,
            "reason": (
                "Binary signature detected; "
                "deep structural validation not implemented yet."
            ),
        },
    )


def scan_signatures(
    file_path: str | Path,
    chunk_size: int = 1024 * 1024,
) -> list[SignatureMatch]:

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Evidence file not found: {path}"
        )

    matches = []

    overlap = max(
        len(signature)
        for _, signature, _ in SIGNATURES
    )

    previous = b""
    absolute_offset = 0

    with path.open("rb") as file:

        while True:
            chunk = file.read(chunk_size)

            if not chunk:
                break

            data = previous + chunk
            base_offset = absolute_offset - len(previous)

            for file_type, signature, description in SIGNATURES:

                search_from = 0

                while True:

                    relative = data.find(
                        signature,
                        search_from,
                    )

                    if relative == -1:
                        break

                    offset = base_offset + relative

                    classification, validation = (
                        validate_signature(
                            path,
                            file_type,
                            offset,
                        )
                    )

                    matches.append(
                        SignatureMatch(
                            file_type=file_type,
                            offset=offset,
                            signature=signature.hex(),
                            description=description,
                            classification=classification,
                            validation=validation,
                        )
                    )

                    search_from = relative + 1

            absolute_offset += len(chunk)

            previous = data[-(overlap - 1):]

    return matches


def analyze_entropy(
    file_path: str | Path,
    block_size: int = 4096,
) -> list[dict]:

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Evidence file not found: {path}"
        )

    results = []
    offset = 0

    with path.open("rb") as file:

        while True:

            block = file.read(block_size)

            if not block:
                break

            entropy = calculate_entropy(block)

            results.append(
                {
                    "offset": offset,
                    "size": len(block),
                    "entropy": entropy,
                }
            )

            offset += len(block)

    return results


def classify_entropy(entropy: float) -> str:

    if entropy < 2.0:
        return "VERY_LOW"

    if entropy < 4.0:
        return "LOW"

    if entropy < 6.0:
        return "MEDIUM"

    if entropy < 7.5:
        return "HIGH"

    return "VERY_HIGH"


def scan_file(file_path: str | Path) -> dict:

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Evidence file not found: {path}"
        )

    file_size = path.stat().st_size

    signatures = scan_signatures(path)

    entropy_blocks = analyze_entropy(path)

    entropy_values = [
        block["entropy"]
        for block in entropy_blocks
    ]

    average_entropy = (
        sum(entropy_values) / len(entropy_values)
        if entropy_values
        else 0.0
    )

    highest_entropy = (
        max(entropy_values)
        if entropy_values
        else 0.0
    )

    lowest_entropy = (
        min(entropy_values)
        if entropy_values
        else 0.0
    )

    validated_count = sum(
        1
        for match in signatures
        if match.classification == "STRUCTURALLY_VALID"
    )

    unverified_count = sum(
        1
        for match in signatures
        if match.classification == "UNVERIFIED_SIGNATURE"
    )

    return {
        "file_size": file_size,
        "bytes_scanned": file_size,

        "signature_count": len(signatures),

        "validated_signature_count": validated_count,

        "unverified_signature_count": unverified_count,

        "signatures": [
            {
                "file_type": match.file_type,
                "offset": match.offset,
                "signature": match.signature,
                "description": match.description,
                "classification": match.classification,
                "validation": match.validation,
            }
            for match in signatures
        ],

        "entropy": {
            "block_size": 4096,
            "block_count": len(entropy_blocks),
            "average": round(
                average_entropy,
                6,
            ),
            "minimum": round(
                lowest_entropy,
                6,
            ),
            "maximum": round(
                highest_entropy,
                6,
            ),
        },
    }


def validate_container_marker(
    path: Path,
    offset: int,
    *,
    file_type: str,
    footer: bytes,
) -> dict:
    """Check minimal start/end markers for common carved-file candidates."""

    data = read_at(path, offset, path.stat().st_size - offset)
    headers = {
        "JPEG": b"\xff\xd8\xff",
        "PNG": b"\x89PNG\r\n\x1a\n",
        "GIF87A": b"GIF87a",
        "GIF89A": b"GIF89a",
    }
    header_valid = data.startswith(headers[file_type])
    footer_position = data.rfind(footer)
    valid = header_valid and footer_position >= 0

    return {
        "valid": valid,
        "header_valid": header_valid,
        "footer_marker_found": footer_position >= 0,
        "footer_offset": offset + footer_position if footer_position >= 0 else None,
        "reason": (
            f"{file_type} header and end marker detected."
            if valid
            else f"{file_type} header detected but no matching end marker was found."
        ),
    }
