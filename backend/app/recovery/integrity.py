from pathlib import Path
import hashlib


def calculate_sha256(
    file_path: Path,
) -> str:
    """
    Calculate SHA-256 for an evidence file.
    """

    sha256 = hashlib.sha256()

    with file_path.open(
        "rb"
    ) as file:

        while True:

            chunk = file.read(
                1024 * 1024
            )

            if not chunk:
                break

            sha256.update(
                chunk
            )

    return sha256.hexdigest()


def validate_pdf_structure(
    file_path: Path,
) -> dict:
    """
    Validate basic PDF structural markers.

    This performs conservative structural validation.
    It does NOT claim that missing content has been recovered.
    """

    result = {
        "file": file_path.name,
        "valid": False,
        "header_valid": False,
        "eof_marker_found": False,
        "eof_offset": None,
        "file_size": 0,
        "trailing_bytes": 0,
        "sha256": None,
        "checks": [],
    }

    if not file_path.exists():
        result["checks"].append(
            "FILE_NOT_FOUND"
        )

        return result

    try:
        file_size = file_path.stat().st_size

        result["file_size"] = file_size

        result["sha256"] = (
            calculate_sha256(
                file_path
            )
        )

        with file_path.open(
            "rb"
        ) as file:

            data = file.read()

        # -------------------------------------------------
        # PDF header
        # -------------------------------------------------

        header_valid = data.startswith(
            b"%PDF-"
        )

        result[
            "header_valid"
        ] = header_valid

        if header_valid:

            result["checks"].append(
                "PDF_HEADER_VALID"
            )

        else:

            result["checks"].append(
                "PDF_HEADER_INVALID"
            )

        # -------------------------------------------------
        # PDF EOF marker
        # -------------------------------------------------

        eof_marker = b"%%EOF"

        eof_offset = data.rfind(
            eof_marker
        )

        if eof_offset >= 0:

            result[
                "eof_marker_found"
            ] = True

            result[
                "eof_offset"
            ] = eof_offset

            result["checks"].append(
                "PDF_EOF_MARKER_FOUND"
            )

            trailing_bytes = (
                file_size
                - (
                    eof_offset
                    + len(eof_marker)
                )
            )

            result[
                "trailing_bytes"
            ] = max(
                0,
                trailing_bytes,
            )

        else:

            result["checks"].append(
                "PDF_EOF_MARKER_MISSING"
            )

        # -------------------------------------------------
        # Overall structural validity
        # -------------------------------------------------

        result["valid"] = (
            header_valid
            and result[
                "eof_marker_found"
            ]
        )

        if result["valid"]:

            result["checks"].append(
                "PDF_BASIC_STRUCTURE_VALID"
            )

        else:

            result["checks"].append(
                "PDF_BASIC_STRUCTURE_INVALID"
            )

        return result

    except Exception as exc:

        result["checks"].append(
            "VALIDATION_ERROR"
        )

        result["error"] = str(
            exc
        )

        return result


def validate_signature_structure(
    file_path: Path,
    *,
    file_type: str,
    header: bytes,
    footer: bytes | None = None,
) -> dict:
    """Perform conservative marker validation for non-PDF formats."""

    result = {
        "file": file_path.name,
        "file_type": file_type,
        "valid": False,
        "header_valid": False,
        "footer_valid": None,
        "file_size": 0,
        "sha256": None,
        "checks": [],
    }

    if not file_path.exists():
        result["checks"].append("FILE_NOT_FOUND")
        return result

    try:
        data = file_path.read_bytes()
        result["file_size"] = len(data)
        result["sha256"] = calculate_sha256(file_path)
        result["header_valid"] = data.startswith(header)
        result["checks"].append(
            "SIGNATURE_HEADER_VALID"
            if result["header_valid"]
            else "SIGNATURE_HEADER_INVALID"
        )

        if footer is not None:
            result["footer_valid"] = data.endswith(footer)
            result["checks"].append(
                "FORMAT_FOOTER_VALID"
                if result["footer_valid"]
                else "FORMAT_FOOTER_INVALID"
            )

        result["valid"] = (
            result["header_valid"]
            and (footer is None or result["footer_valid"])
        )
        result["checks"].append(
            "BASIC_STRUCTURE_VALID"
            if result["valid"]
            else "BASIC_STRUCTURE_INVALID"
        )
        return result
    except OSError as exc:
        result["checks"].append("VALIDATION_ERROR")
        result["error"] = str(exc)
        return result


def validate_zip_structure(file_path: Path) -> dict:
    """Validate a ZIP local header and end-of-central-directory record.

    A ZIP comment may follow the EOCD marker, so checking ``endswith(PK\x05\x06)``
    would incorrectly reject valid archives.
    """

    result = {
        "file": file_path.name,
        "file_type": "ZIP_CONTAINER",
        "valid": False,
        "header_valid": False,
        "footer_valid": False,
        "file_size": 0,
        "sha256": None,
        "checks": [],
    }

    if not file_path.exists():
        result["checks"].append("FILE_NOT_FOUND")
        return result

    try:
        data = file_path.read_bytes()
        result["file_size"] = len(data)
        result["sha256"] = calculate_sha256(file_path)
        result["header_valid"] = data.startswith(b"PK\x03\x04")
        result["checks"].append(
            "ZIP_LOCAL_HEADER_VALID"
            if result["header_valid"]
            else "ZIP_LOCAL_HEADER_INVALID"
        )

        eocd_offset = data.rfind(b"PK\x05\x06")
        if eocd_offset >= 0 and eocd_offset + 22 <= len(data):
            comment_length = int.from_bytes(
                data[eocd_offset + 20 : eocd_offset + 22],
                byteorder="little",
            )
            result["footer_valid"] = eocd_offset + 22 + comment_length == len(data)

        result["checks"].append(
            "ZIP_EOCD_VALID"
            if result["footer_valid"]
            else "ZIP_EOCD_INVALID"
        )
        result["valid"] = result["header_valid"] and result["footer_valid"]
        result["checks"].append(
            "BASIC_STRUCTURE_VALID"
            if result["valid"]
            else "BASIC_STRUCTURE_INVALID"
        )
        return result
    except OSError as exc:
        result["checks"].append("VALIDATION_ERROR")
        result["error"] = str(exc)
        return result


def validate_file_structure(
    file_path: Path,
    evidence_type: str | None,
) -> dict:
    """Validate only structural markers appropriate to the detected type."""

    normalized_type = (evidence_type or "").upper()

    if normalized_type == "PDF":
        return validate_pdf_structure(file_path)

    validators = {
        "JPEG": (b"\xff\xd8\xff", b"\xff\xd9"),
        "PNG": (b"\x89PNG\r\n\x1a\n", b"IEND\xaeB`\x82"),
        "GIF": (b"GIF", b";"),
        "PE_EXECUTABLE": (b"MZ", None),
        "ELF_EXECUTABLE": (b"\x7fELF", None),
    }

    if normalized_type == "ZIP_CONTAINER":
        return validate_zip_structure(file_path)

    signature = validators.get(normalized_type)
    if signature is not None:
        return validate_signature_structure(
            file_path,
            file_type=normalized_type,
            header=signature[0],
            footer=signature[1],
        )

    return {
        "file": file_path.name,
        "file_type": normalized_type or "UNKNOWN",
        "valid": False,
        "header_valid": None,
        "footer_valid": None,
        "file_size": file_path.stat().st_size if file_path.exists() else 0,
        "sha256": calculate_sha256(file_path) if file_path.exists() else None,
        "checks": ["NO_FORMAT_VALIDATOR_AVAILABLE"],
    }
