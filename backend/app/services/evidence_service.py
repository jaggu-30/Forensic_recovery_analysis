from datetime import datetime
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.evidence import Evidence
from app.models.investigation import Investigation


CHUNK_SIZE = 1024 * 1024


def detect_file_signature(file_path: Path) -> tuple[str, str]:
    """
    Detect the probable file type from the binary file signature.

    Returns:
        (evidence_type, mime_type)
    """

    with file_path.open("rb") as file:
        header = file.read(32)

    # JPEG
    if header.startswith(b"\xFF\xD8\xFF"):
        return "JPEG", "image/jpeg"

    # PNG
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "PNG", "image/png"

    # PDF
    if header.startswith(b"%PDF-"):
        return "PDF", "application/pdf"

    # GIF
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return "GIF", "image/gif"

    # ZIP / DOCX / XLSX / PPTX / APK etc.
    if header.startswith(b"PK\x03\x04"):
        return "ZIP_CONTAINER", "application/zip"

    # RIFF / WAV / AVI / WEBP
    if header.startswith(b"RIFF"):
        return "RIFF_CONTAINER", "application/octet-stream"

    # Windows executable
    if header.startswith(b"MZ"):
        return "PE_EXECUTABLE", "application/vnd.microsoft.portable-executable"

    # ELF executable
    if header.startswith(b"\x7fELF"):
        return "ELF_EXECUTABLE", "application/x-executable"

    return "UNKNOWN_BINARY", "application/octet-stream"


async def store_evidence(
    db: Session,
    investigation_id: str,
    upload: UploadFile,
) -> Evidence:

    # ---------------------------------------------------------
    # 1. Verify investigation
    # ---------------------------------------------------------

    investigation = (
        db.query(Investigation)
        .filter(Investigation.id == investigation_id)
        .first()
    )

    if investigation is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found.",
        )

    # ---------------------------------------------------------
    # 2. Validate filename
    # ---------------------------------------------------------

    original_filename = Path(
        upload.filename or "unnamed_evidence"
    ).name

    if not original_filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid evidence filename.",
        )

    # ---------------------------------------------------------
    # 3. Prepare immutable evidence storage
    # ---------------------------------------------------------

    evidence_id = str(uuid4())

    evidence_directory = (
        Path(settings.upload_dir)
        / investigation_id
    )

    evidence_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    stored_filename = (
        f"{evidence_id}_{original_filename}"
    )

    destination = (
        evidence_directory
        / stored_filename
    )

    # ---------------------------------------------------------
    # 4. Stream file + calculate SHA-256
    # ---------------------------------------------------------

    hasher = sha256()
    total_size = 0

    try:
        with destination.open("wb") as output:

            while True:
                chunk = await upload.read(CHUNK_SIZE)

                if not chunk:
                    break

                output.write(chunk)
                hasher.update(chunk)
                total_size += len(chunk)

    except Exception:
        if destination.exists():
            destination.unlink()

        raise

    finally:
        await upload.close()

    # ---------------------------------------------------------
    # 5. Calculate final hash
    # ---------------------------------------------------------

    file_hash = hasher.hexdigest()

    # ---------------------------------------------------------
    # 6. Detect binary signature
    # ---------------------------------------------------------

    evidence_type, detected_mime = detect_file_signature(
        destination
    )

    # ---------------------------------------------------------
    # 7. Create database record
    # ---------------------------------------------------------

    evidence = Evidence(
        id=evidence_id,
        investigation_id=investigation_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_path=str(destination.resolve()),
        file_size=total_size,
        sha256=file_hash,
        mime_type=upload.content_type or detected_mime,
        evidence_type=evidence_type,
        acquisition_time=datetime.utcnow(),
        status="IMPORTED",
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence