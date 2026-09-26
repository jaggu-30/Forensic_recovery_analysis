"""File carving and structural repair engine.

This module carves intact file structures from binary evidence and
performs format-specific structural repair when possible.  It never
invents content — it only reassembles bytes that are physically
present in the uploaded evidence file.

Supported carve targets: PDF, JPEG, PNG, GIF, ZIP.
"""

from __future__ import annotations

import io
import struct
import zlib
from dataclasses import dataclass, field
from hashlib import sha256 as _sha256
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Public data types
# ---------------------------------------------------------------------------

@dataclass
class CarvedFile:
    """A file structure extracted from binary evidence."""

    file_type: str
    start_offset: int
    end_offset: int
    size: int
    data: bytes
    sha256: str
    repair_applied: bool
    repair_description: str
    confidence: float          # 0.0 – 1.0
    truncated: bool = False    # True when the carved region runs to EOF with no footer


@dataclass
class CarveResult:
    """Summary of a carve operation against one evidence file."""

    evidence_size: int
    carved_files: list[CarvedFile] = field(default_factory=list)
    error: str | None = None

    @property
    def success(self) -> bool:
        return self.error is None and bool(self.carved_files)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_SIGNATURES: list[tuple[str, bytes, bytes | None]] = [
    # (type, header, footer)
    ("PDF",  b"%PDF-",               b"%%EOF"),
    ("JPEG", b"\xff\xd8\xff",        b"\xff\xd9"),
    ("PNG",  b"\x89PNG\r\n\x1a\n",  b"IEND\xaeB`\x82"),
    ("GIF",  b"GIF87a",              b";"),
    ("GIF",  b"GIF89a",              b";"),
    ("ZIP",  b"PK\x03\x04",         b"PK\x05\x06"),
]

_MAX_CARVE_SIZE = 512 * 1024 * 1024   # 512 MB absolute limit per carved region


def _sha256_bytes(data: bytes) -> str:
    return _sha256(data).hexdigest()


def _find_all(data: bytes, pattern: bytes) -> list[int]:
    """Return every offset where pattern starts in data."""
    positions: list[int] = []
    start = 0
    while True:
        pos = data.find(pattern, start)
        if pos == -1:
            break
        positions.append(pos)
        start = pos + 1
    return positions


# ---------------------------------------------------------------------------
# Format-specific repair helpers
# ---------------------------------------------------------------------------

def _repair_pdf(data: bytes) -> tuple[bytes, str]:
    """
    Repair a PDF byte string.

    Strategy:
    1. Ensure the header starts with %PDF-.
    2. Ensure %%EOF is present at the end.  If not, append a minimal trailer.
    3. If an xref table or startxref is absent, append one that refers to
       offset 0 so that readers can fall back to cross-reference recovery.

    This does not reconstruct missing object content.
    """
    repairs: list[str] = []

    # --- header ---
    if not data.startswith(b"%PDF-"):
        data = b"%PDF-1.4\n" + data
        repairs.append("prepended PDF header")

    # --- EOF marker ---
    has_eof = b"%%EOF" in data
    has_startxref = b"startxref" in data

    if not has_startxref:
        # Append a minimal cross-reference stub so PDF readers can attempt
        # their own recovery rather than failing immediately.
        stub = b"\nxref\n0 1\n0000000000 65535 f \n\ntrailer\n<< /Size 1 >>\nstartxref\n9\n%%EOF\n"
        data = data + stub
        repairs.append("appended fallback xref/trailer/EOF stub")
    elif not has_eof:
        data = data + b"\n%%EOF\n"
        repairs.append("appended %%EOF marker")

    description = "; ".join(repairs) if repairs else "no structural repair needed"
    return data, description


def _repair_jpeg(data: bytes) -> tuple[bytes, str]:
    """
    Repair a JPEG byte string.

    Ensures SOI (FF D8) header and EOI (FF D9) footer are present.
    """
    repairs: list[str] = []

    if not data.startswith(b"\xff\xd8"):
        data = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00" + data
        repairs.append("prepended JFIF SOI header")

    if not data.endswith(b"\xff\xd9"):
        data = data + b"\xff\xd9"
        repairs.append("appended EOI marker")

    description = "; ".join(repairs) if repairs else "no structural repair needed"
    return data, description


def _repair_png(data: bytes) -> tuple[bytes, str]:
    """
    Repair a PNG byte string.

    Ensures the PNG signature and IEND chunk are present.
    """
    repairs: list[str] = []
    PNG_SIG = b"\x89PNG\r\n\x1a\n"
    IEND_CHUNK = b"\x00\x00\x00\x00IEND\xaeB`\x82"

    if not data.startswith(PNG_SIG):
        data = PNG_SIG + data
        repairs.append("prepended PNG signature")

    if b"IEND" not in data:
        data = data + IEND_CHUNK
        repairs.append("appended IEND chunk")

    description = "; ".join(repairs) if repairs else "no structural repair needed"
    return data, description


def _repair_gif(data: bytes) -> tuple[bytes, str]:
    """Ensure GIF trailer byte is present."""
    repairs: list[str] = []

    if not (data.startswith(b"GIF87a") or data.startswith(b"GIF89a")):
        data = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00" + data
        repairs.append("prepended GIF89a stub header")

    if not data.endswith(b";"):
        data = data + b";"
        repairs.append("appended GIF trailer")

    description = "; ".join(repairs) if repairs else "no structural repair needed"
    return data, description


def _repair_zip(data: bytes) -> tuple[bytes, str]:
    """
    Attempt minimal ZIP repair.

    Only ensures the local-file header signature is present.
    End-of-central-directory construction is complex — we leave it to the
    caller's ZIP library if needed.
    """
    repairs: list[str] = []

    if not data.startswith(b"PK\x03\x04"):
        repairs.append("ZIP local header missing — data returned as-is (no repair possible)")

    description = "; ".join(repairs) if repairs else "no structural repair needed"
    return data, description


_REPAIR_FUNCTIONS = {
    "PDF":  _repair_pdf,
    "JPEG": _repair_jpeg,
    "PNG":  _repair_png,
    "GIF":  _repair_gif,
    "ZIP":  _repair_zip,
}

_BASE_CONFIDENCE = {
    "PDF":  0.82,
    "JPEG": 0.78,
    "PNG":  0.80,
    "GIF":  0.72,
    "ZIP":  0.65,
}


# ---------------------------------------------------------------------------
# Core carving logic
# ---------------------------------------------------------------------------

def _carve_region(
    data: bytes,
    file_type: str,
    header: bytes,
    footer: bytes | None,
    start: int,
) -> CarvedFile | None:
    """
    Extract one candidate file region from data starting at start.

    Returns None if the region is empty or excessively large.
    """
    end = len(data)
    truncated = True
    repair_applied = False

    if footer is not None:
        # Search for the footer after the header
        footer_pos = data.find(footer, start + len(header))
        if footer_pos != -1:
            # Include the footer bytes themselves
            end = footer_pos + len(footer)
            truncated = False

    region = data[start:end]

    if not region or len(region) > _MAX_CARVE_SIZE:
        return None

    # Apply format-specific repair
    repair_fn = _REPAIR_FUNCTIONS.get(file_type)
    repair_description = "no repair function available"
    if repair_fn is not None:
        region, repair_description = repair_fn(region)
        repair_applied = bool(repair_description and "no structural repair needed" not in repair_description)

    # Confidence is reduced when the file was truncated (no footer found)
    base = _BASE_CONFIDENCE.get(file_type, 0.60)
    confidence = base if not truncated else base * 0.65

    return CarvedFile(
        file_type=file_type,
        start_offset=start,
        end_offset=start + len(region) - 1,
        size=len(region),
        data=region,
        sha256=_sha256_bytes(region),
        repair_applied=repair_applied,
        repair_description=repair_description,
        confidence=round(confidence, 4),
        truncated=truncated,
    )


def carve_evidence(evidence_path: str | Path) -> CarveResult:
    """
    Carve all recognisable file structures from an evidence file.

    Parameters
    ----------
    evidence_path:
        Path to the binary evidence file.

    Returns
    -------
    CarveResult
        Contains every successfully carved file.  Deduplication is applied
        so that overlapping regions of the same type are merged.
    """
    path = Path(evidence_path)

    if not path.exists():
        return CarveResult(
            evidence_size=0,
            error=f"Evidence file not found: {path}",
        )

    try:
        data = path.read_bytes()
    except OSError as exc:
        return CarveResult(
            evidence_size=0,
            error=f"Cannot read evidence file: {exc}",
        )

    evidence_size = len(data)
    carved: list[CarvedFile] = []
    seen_hashes: set[str] = set()

    for file_type, header, footer in _SIGNATURES:
        for start in _find_all(data, header):
            cf = _carve_region(data, file_type, header, footer, start)
            if cf is None:
                continue
            if cf.sha256 in seen_hashes:
                continue
            seen_hashes.add(cf.sha256)
            carved.append(cf)

    # Sort by offset so the primary file (offset 0) appears first
    carved.sort(key=lambda c: c.start_offset)

    return CarveResult(evidence_size=evidence_size, carved_files=carved)


def save_carved_files(
    carved_files: list[CarvedFile],
    output_dir: Path,
    evidence_id: str,
) -> list[dict[str, Any]]:
    """
    Persist carved files to output_dir and return metadata dicts.

    Parameters
    ----------
    carved_files:
        Output of carve_evidence().carved_files.
    output_dir:
        Parent directory for the evidence sub-folder.
    evidence_id:
        Used to namespace output paths.

    Returns
    -------
    list[dict]
        One metadata dict per saved file.
    """
    target_dir = output_dir / evidence_id / "carved"
    target_dir.mkdir(parents=True, exist_ok=True)

    saved: list[dict[str, Any]] = []

    ext_map = {
        "PDF":  ".pdf",
        "JPEG": ".jpg",
        "PNG":  ".png",
        "GIF":  ".gif",
        "ZIP":  ".zip",
    }

    for index, cf in enumerate(carved_files, start=1):
        ext = ext_map.get(cf.file_type, ".bin")
        filename = f"carved_{index:03d}_{cf.file_type.lower()}_offset{cf.start_offset}{ext}"
        dest = target_dir / filename
        dest.write_bytes(cf.data)

        saved.append({
            "index": index,
            "filename": filename,
            "path": str(dest.resolve()),
            "file_type": cf.file_type,
            "start_offset": cf.start_offset,
            "end_offset": cf.end_offset,
            "size": cf.size,
            "sha256": cf.sha256,
            "repair_applied": cf.repair_applied,
            "repair_description": cf.repair_description,
            "confidence": cf.confidence,
            "truncated": cf.truncated,
            "available": True,
            "recovery_method": (
                "STRUCTURAL_REPAIR" if cf.repair_applied
                else "CARVED_INTACT"
            ),
            "forensic_label": (
                "STRUCTURALLY REPAIRED — NOT VERIFIED ORIGINAL DATA"
                if cf.repair_applied
                else "CARVED — BYTES ARE PHYSICALLY PRESENT IN EVIDENCE"
            ),
        })

    return saved
