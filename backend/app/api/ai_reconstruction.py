from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.services.universal_recovery_service import (
    reconstruct_universal,
)

try:
    from app.core.database import get_db
except Exception:
    from app.db.database import get_db  # type: ignore


router = APIRouter(
    prefix="/api/ai-reconstruction",
    tags=["AI / Universal Reconstruction"],
)


VIDEO_MIME_TYPES = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".m4v": "video/mp4",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
}

DOCUMENT_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": (
        "application/"
        "vnd.openxmlformats-officedocument."
        "wordprocessingml.document"
    ),
    ".odt": "application/vnd.oasis.opendocument.text",
    ".rtf": "application/rtf",
}


def backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def recovered_dir() -> Path:
    directory = (
        backend_root()
        / "data"
        / "recovered"
    )

    directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    return directory


def resolve_file_path(
    evidence: Evidence,
) -> Path:
    raw = Path(
        str(evidence.file_path)
    )

    candidates = [
        raw,
        Path.cwd() / raw,
        backend_root() / raw,
        backend_root().parent / raw,
        (
            backend_root()
            / "data"
            / "uploads"
            / raw.name
        ),
        (
            backend_root()
            / "data"
            / "evidence"
            / raw.name
        ),
    ]

    for candidate in candidates:
        try:
            if candidate.is_file():
                return candidate.resolve()
        except OSError:
            continue

    data_root = (
        backend_root()
        / "data"
    )

    if data_root.exists():
        matches = list(
            data_root.rglob(
                raw.name
            )
        )

        for match in matches:
            if match.is_file():
                return match.resolve()

    raise FileNotFoundError(
        str(raw)
    )


def resolve_output(
    evidence_id: str,
    run: str,
) -> Path:
    directory = recovered_dir()

    candidates = []

    for path in directory.iterdir():
        if not path.is_file():
            continue

        name = path.name.lower()

        if (
            evidence_id[:8].lower()
            in name
            and run.lower()
            in name
        ):
            candidates.append(
                path
            )

    if not candidates:
        raise FileNotFoundError(
            "Recovery output not found."
        )

    return max(
        candidates,
        key=lambda p: p.stat().st_mtime,
    )


def mime_for_path(
    path: Path,
    fallback: str | None = None,
) -> str:
    suffix = path.suffix.lower()

    if suffix in VIDEO_MIME_TYPES:
        return VIDEO_MIME_TYPES[suffix]

    if suffix in DOCUMENT_MIME_TYPES:
        return DOCUMENT_MIME_TYPES[suffix]

    guessed, _ = mimetypes.guess_type(
        path.name
    )

    return (
        guessed
        or fallback
        or "application/octet-stream"
    )


def range_stream(
    request: Request,
    path: Path,
    media_type: str,
):
    """
    Range-aware streaming for browser video playback.

    Chrome/Edge video playback can request partial MP4
    byte ranges. This route handles those requests explicitly.
    """

    file_size = path.stat().st_size

    range_header = request.headers.get(
        "range"
    )

    common_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "Content-Disposition": (
            f'inline; filename="{path.name}"'
        ),
    }

    if not range_header:
        return FileResponse(
            path=path,
            media_type=media_type,
            headers=common_headers,
        )

    try:
        units, value = (
            range_header.split(
                "=",
                1,
            )
        )

        if units.strip().lower() != "bytes":
            raise ValueError

        start_text, end_text = (
            value.split(
                "-",
                1,
            )
        )

        if start_text:
            start = int(
                start_text
            )
        else:
            suffix_length = int(
                end_text
            )

            start = max(
                0,
                file_size
                - suffix_length,
            )

        if end_text:
            end = int(
                end_text
            )
        else:
            end = file_size - 1

        start = max(
            0,
            start,
        )

        end = min(
            file_size - 1,
            end,
        )

        if (
            start > end
            or start >= file_size
        ):
            return StreamingResponse(
                content=iter(()),
                status_code=416,
                headers={
                    **common_headers,
                    "Content-Range": (
                        f"bytes */{file_size}"
                    ),
                },
            )

        chunk_size = (
            end
            - start
            + 1
        )

        def iterator():
            with path.open(
                "rb"
            ) as handle:
                handle.seek(
                    start
                )

                remaining = (
                    chunk_size
                )

                while remaining > 0:
                    data = handle.read(
                        min(
                            1024 * 1024,
                            remaining,
                        )
                    )

                    if not data:
                        break

                    remaining -= len(
                        data
                    )

                    yield data

        headers = {
            **common_headers,
            "Content-Range": (
                f"bytes {start}-{end}/{file_size}"
            ),
            "Content-Length": str(
                chunk_size
            ),
        }

        return StreamingResponse(
            iterator(),
            status_code=206,
            media_type=media_type,
            headers=headers,
        )

    except (
        ValueError,
        TypeError,
        IndexError,
    ):
        return StreamingResponse(
            content=iter(()),
            status_code=416,
            headers={
                **common_headers,
                "Content-Range": (
                    f"bytes */{file_size}"
                ),
            },
        )


@router.get("/health")
def health():
    return {
        "success": True,
        "status": "online",
        "supported_media": [
            "IMAGE",
            "VIDEO",
            "PDF",
            "DOCUMENT",
        ],
    }


@router.get(
    "/{evidence_id}/source-file"
)
def source_file(
    evidence_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id
            == evidence_id
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found.",
        )

    try:
        path = resolve_file_path(
            evidence
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Source evidence file not found.",
        )

    mime = mime_for_path(
        path,
        getattr(
            evidence,
            "mime_type",
            None,
        ),
    )

    return range_stream(
        request,
        path,
        mime,
    )


@router.post(
    "/{evidence_id}"
)
def universal_reconstruction(
    evidence_id: str,
    db: Session = Depends(get_db),
):
    try:
        result = reconstruct_universal(
            db,
            evidence_id,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": str(exc),
            },
        )

    if not result.get(
        "success"
    ):
        raise HTTPException(
            status_code=400,
            detail=result,
        )

    return result


@router.get(
    "/{evidence_id}/output"
)
def output_file(
    evidence_id: str,
    request: Request,
    run: str = Query(
        ...,
        min_length=4,
        max_length=64,
    ),
):
    try:
        selected = resolve_output(
            evidence_id,
            run,
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Recovery output not found.",
        )

    mime = mime_for_path(
        selected
    )

    return range_stream(
        request,
        selected,
        mime,
    )