"""Forensic report generation service.

Builds a structured JSON report and an HTML forensic report for a
completed reconstruction.  Reports contain only observed facts,
feasibility scores, and recovery outcomes — never fabricated content.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.evidence import Evidence
from app.models.fragment import Fragment
from app.models.fragment_relationship import FragmentRelationship
from app.models.damage_region import DamageRegion
from app.models.reconstruction import ReconstructionCandidate


# ---------------------------------------------------------------------------
# JSON report builder
# ---------------------------------------------------------------------------

def _utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def generate_json_report(
    db: Session,
    evidence_id: str,
) -> dict[str, Any]:
    """
    Build a complete, structured forensic report.

    The report consolidates evidence metadata, fragment analysis,
    damage regions, reconstruction status, and carved files into a
    single self-contained dict.  It is designed to be saved as a
    .json file and served via the API.
    """

    evidence: Evidence | None = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )
    if evidence is None:
        return {"success": False, "error": "Evidence not found."}

    fragments: list[Fragment] = (
        db.query(Fragment)
        .filter(Fragment.evidence_id == evidence_id)
        .order_by(Fragment.offset)
        .all()
    )

    relationships: list[FragmentRelationship] = (
        db.query(FragmentRelationship)
        .filter(FragmentRelationship.evidence_id == evidence_id)
        .order_by(FragmentRelationship.id)
        .all()
    )

    damage_regions: list[DamageRegion] = (
        db.query(DamageRegion)
        .filter(DamageRegion.evidence_id == evidence_id)
        .order_by(DamageRegion.original_offset)
        .all()
    )

    candidate: ReconstructionCandidate | None = (
        db.query(ReconstructionCandidate)
        .filter(ReconstructionCandidate.evidence_id == evidence_id)
        .first()
    )

    # --- carved files on disk ---
    carved_dir = Path(settings.recovered_dir) / evidence_id / "carved"
    carved_files: list[dict] = []
    if carved_dir.exists():
        for f in sorted(carved_dir.iterdir()):
            if f.is_file():
                carved_files.append({
                    "filename": f.name,
                    "size": f.stat().st_size,
                    "path": str(f.resolve()),
                })

    report = {
        "report_id": f"RPT-{evidence_id[:8]}",
        "generated_at": _utc_now_iso(),
        "success": True,

        "evidence": {
            "id": evidence.id,
            "filename": evidence.original_filename,
            "size": evidence.file_size,
            "sha256": evidence.sha256,
            "type": evidence.evidence_type,
            "status": evidence.status,
            "acquired_at": evidence.acquisition_time.isoformat() if evidence.acquisition_time else None,
        },

        "fragment_analysis": {
            "fragment_count": len(fragments),
            "fragments": [
                {
                    "fragment_id": f.fragment_id,
                    "offset": f.offset,
                    "end_offset": f.end_offset,
                    "size": f.size,
                    "sha256": f.sha256,
                    "entropy": f.entropy,
                    "probable_type": f.probable_type,
                    "classification": f.classification,
                    "confidence": f.confidence,
                }
                for f in fragments
            ],
        },

        "relationship_analysis": {
            "relationship_count": len(relationships),
            "relationships": [
                {
                    "source": r.source_fragment,
                    "target": r.target_fragment,
                    "type": r.relationship_type,
                    "score": r.score,
                    "offset_gap": r.offset_gap,
                    "entropy_difference": r.entropy_difference,
                }
                for r in relationships
            ],
        },

        "damage_regions": [
            {
                "region_id": d.region_id,
                "offset": d.original_offset,
                "end_offset": d.original_end_offset,
                "size": d.size,
                "damage_type": d.damage_type,
                "recovery_status": d.recovery_status,
                "source": d.source,
            }
            for d in damage_regions
        ],

        "reconstruction": {
            "candidate_id": candidate.candidate_id if candidate else None,
            "status": candidate.status if candidate else "NOT_RUN",
            "structural_confidence": candidate.structural_confidence if candidate else None,
            "recovery_confidence": candidate.recovery_confidence if candidate else None,
            "verified_bytes": candidate.verified_bytes if candidate else 0,
            "reconstructed_bytes": candidate.reconstructed_bytes if candidate else 0,
            "missing_bytes": candidate.missing_bytes if candidate else None,
            "notes": candidate.notes if candidate else None,
        },

        "carved_files": carved_files,

        "forensic_disclaimer": (
            "This report was generated by RECOVERAI.  All recovery claims "
            "are based solely on bytes physically present in the uploaded "
            "evidence.  Any structurally repaired output is labelled "
            "'STRUCTURALLY REPAIRED — NOT VERIFIED ORIGINAL DATA'.  "
            "Byte-verified recoveries are only produced when an exact "
            "SHA-256 match to a trusted reference exists."
        ),
    }

    return report


def save_json_report(
    db: Session,
    evidence_id: str,
) -> Path:
    """
    Generate and persist the JSON report to the recovered directory.

    Returns the path to the saved report file.
    """
    report = generate_json_report(db, evidence_id)

    report_dir = Path(settings.recovered_dir) / evidence_id
    report_dir.mkdir(parents=True, exist_ok=True)

    report_path = report_dir / "forensic_report.json"
    report_path.write_text(
        json.dumps(report, indent=2, default=str),
        encoding="utf-8",
    )
    return report_path


# ---------------------------------------------------------------------------
# HTML report builder
# ---------------------------------------------------------------------------

def _status_colour(status: str | None) -> str:
    s = (status or "").upper()
    if "VERIFIED" in s:
        return "#22c55e"
    if "STRUCTURAL" in s or "PLAUSIBLE" in s:
        return "#f59e0b"
    if "INSUFFICIENT" in s or "NOT_RUN" in s:
        return "#ef4444"
    return "#60a5fa"


def generate_html_report(
    db: Session,
    evidence_id: str,
) -> str:
    """
    Render a self-contained HTML forensic report.

    The document is styled inline so it can be opened in any browser
    without external dependencies.
    """
    data = generate_json_report(db, evidence_id)

    if not data.get("success"):
        return f"<html><body><p>Error: {data.get('error', 'unknown')}</p></body></html>"

    ev = data["evidence"]
    recon = data["reconstruction"]
    frags = data["fragment_analysis"]
    regions = data["damage_regions"]
    carved = data["carved_files"]
    status = recon.get("status", "NOT_RUN")
    colour = _status_colour(status)

    def pct(v: float | None) -> str:
        if v is None:
            return "—"
        return f"{v * 100:.1f}%"

    def bfmt(b: int | None) -> str:
        if b is None:
            return "—"
        if b < 1024:
            return f"{b} B"
        if b < 1024 * 1024:
            return f"{b / 1024:.2f} KB"
        return f"{b / (1024 * 1024):.2f} MB"

    frag_rows = "".join(
        f"<tr><td>{f['fragment_id']}</td><td>{bfmt(f['offset'])}</td>"
        f"<td>{bfmt(f['size'])}</td><td>{f['probable_type']}</td>"
        f"<td>{f['classification']}</td>"
        f"<td>{f['entropy']:.4f}</td>"
        f"<td>{f['confidence']:.2%}</td></tr>"
        for f in frags["fragments"][:50]   # cap table rows
    )
    more_frags = ""
    if frags["fragment_count"] > 50:
        more_frags = f"<p style='color:#94a3b8'>… and {frags['fragment_count'] - 50} more fragments</p>"

    region_rows = "".join(
        f"<tr><td>{r['region_id']}</td><td>{r['offset']}</td>"
        f"<td>{r['size']}</td><td>{r['damage_type']}</td>"
        f"<td>{r['recovery_status']}</td><td>{r['source']}</td></tr>"
        for r in regions
    ) or "<tr><td colspan='6'>No damage regions recorded</td></tr>"

    carved_rows = "".join(
        f"<tr><td>{c['filename']}</td><td>{bfmt(c['size'])}</td></tr>"
        for c in carved
    ) or "<tr><td colspan='2'>No carved files available</td></tr>"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RECOVERAI Forensic Report — {ev['filename']}</title>
<style>
  :root {{
    --bg: #0f172a; --surface: #1e293b; --border: #334155;
    --text: #e2e8f0; --muted: #94a3b8; --accent: {colour};
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 14px; line-height: 1.6; padding: 32px; }}
  h1 {{ font-size: 22px; margin-bottom: 4px; color: #f1f5f9; }}
  h2 {{ font-size: 16px; margin: 28px 0 10px; color: #f1f5f9; border-bottom: 1px solid var(--border); padding-bottom: 6px; }}
  .badge {{ display: inline-block; padding: 2px 10px; border-radius: 4px;
    background: {colour}22; color: {colour}; font-weight: 600; font-size: 12px; }}
  .meta {{ color: var(--muted); font-size: 12px; margin-bottom: 20px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px; }}
  .card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }}
  .card small {{ color: var(--muted); font-size: 11px; display: block; margin-bottom: 2px; }}
  .card b {{ font-size: 15px; word-break: break-all; }}
  table {{ width: 100%; border-collapse: collapse; background: var(--surface);
    border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }}
  th {{ background: #0f172a; color: var(--muted); font-size: 11px; text-transform: uppercase;
    padding: 8px 12px; text-align: left; }}
  td {{ padding: 8px 12px; border-top: 1px solid var(--border); font-size: 13px; }}
  tr:hover td {{ background: #ffffff08; }}
  .disclaimer {{ margin-top: 28px; padding: 14px; background: #1e293b;
    border-left: 3px solid #f59e0b; border-radius: 4px; color: var(--muted); font-size: 12px; }}
  .hash {{ font-family: monospace; font-size: 11px; color: var(--muted); word-break: break-all; }}
  .logo {{ font-size: 11px; font-weight: 700; letter-spacing: 2px; color: {colour}; margin-bottom: 6px; }}
</style>
</head>
<body>
<div class="logo">RECOVERAI · FORENSIC REPORT</div>
<h1>{ev['filename']}</h1>
<p class="meta">Report ID: {data['report_id']} &nbsp;·&nbsp; Generated: {data['generated_at']} &nbsp;·&nbsp; Evidence ID: {ev['id']}</p>
<span class="badge">{status}</span>

<h2>Evidence Metadata</h2>
<div class="grid">
  <div class="card"><small>Evidence Type</small><b>{ev['type'] or 'UNKNOWN'}</b></div>
  <div class="card"><small>File Size</small><b>{bfmt(ev['size'])}</b></div>
  <div class="card"><small>Status</small><b>{ev['status']}</b></div>
  <div class="card"><small>SHA-256</small><b class="hash">{ev['sha256']}</b></div>
  <div class="card"><small>Acquired</small><b>{ev['acquired_at'] or '—'}</b></div>
</div>

<h2>Reconstruction Assessment</h2>
<div class="grid">
  <div class="card"><small>Status</small><b style="color:{colour}">{status}</b></div>
  <div class="card"><small>Recovery Confidence</small><b>{pct(recon.get('recovery_confidence'))}</b></div>
  <div class="card"><small>Structural Confidence</small><b>{pct(recon.get('structural_confidence'))}</b></div>
  <div class="card"><small>Verified Bytes</small><b>{bfmt(recon.get('verified_bytes'))}</b></div>
  <div class="card"><small>Reconstructed Bytes</small><b>{bfmt(recon.get('reconstructed_bytes'))}</b></div>
  <div class="card"><small>Remaining Missing</small><b>{bfmt(recon.get('missing_bytes'))}</b></div>
</div>
<p style="color:#94a3b8;font-size:12px;margin-top:-8px">{recon.get('notes','')}</p>

<h2>Fragment Analysis ({frags['fragment_count']} fragments)</h2>
<table>
  <thead><tr><th>ID</th><th>Offset</th><th>Size</th><th>Type</th><th>Classification</th><th>Entropy</th><th>Confidence</th></tr></thead>
  <tbody>{frag_rows}</tbody>
</table>
{more_frags}

<h2>Damage Regions</h2>
<table>
  <thead><tr><th>Region ID</th><th>Offset</th><th>Size</th><th>Damage Type</th><th>Recovery Status</th><th>Source</th></tr></thead>
  <tbody>{region_rows}</tbody>
</table>

<h2>Carved / Recovered Files</h2>
<table>
  <thead><tr><th>Filename</th><th>Size</th></tr></thead>
  <tbody>{carved_rows}</tbody>
</table>

<div class="disclaimer">{data['forensic_disclaimer']}</div>
</body>
</html>"""
    return html


def save_html_report(
    db: Session,
    evidence_id: str,
) -> Path:
    """
    Generate and persist the HTML report to the recovered directory.

    Returns the path to the saved report file.
    """
    html = generate_html_report(db, evidence_id)

    report_dir = Path(settings.recovered_dir) / evidence_id
    report_dir.mkdir(parents=True, exist_ok=True)

    report_path = report_dir / "forensic_report.html"
    report_path.write_text(html, encoding="utf-8")
    return report_path
