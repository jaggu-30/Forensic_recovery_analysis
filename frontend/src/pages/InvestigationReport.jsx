import React from "react";
import { Download, FileText, Network, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { getSelectedEvidence } from "../data/evidenceSession";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

const percent = (value) => (value == null ? "—" : `${(value * 100).toFixed(2)}%`);
const number = (value) => (value == null ? "—" : Number(value).toLocaleString());

export default function InvestigationReport() {
  const navigate = useNavigate();
  const selected = getSelectedEvidence();
  const [live, setLive] = React.useState(null);
  const [error, setError] = React.useState("");
  const evidenceId = selected?.id || new URLSearchParams(window.location.search).get("evidenceId") || localStorage.getItem("recoverai_evidence_id") || "";

  React.useEffect(() => {
    if (!evidenceId) return;
    (async () => {
      try {
        const [e, r, d] = await Promise.all([
          fetch(`${API}/api/evidence/${evidenceId}`).then(x => x.json()),
          fetch(`${API}/api/reconstruction/${evidenceId}`, { method: "POST" }).then(x => x.json()),
          fetch(`${API}/api/analysis/${evidenceId}/damage-map`).then(x => x.json())
        ]);
        setLive({ evidence: e?.evidence || e, reconstruction: r, damage: d });
      } catch (err) { setError(err.message || "Unable to load live report data."); }
    })();
  }, [evidenceId]);

  const evidence = live?.evidence || selected;
  const reconstruction = live?.reconstruction || evidence?.reconstruction;
  const result = reconstruction?.reconstruction || reconstruction;
  const analysis = evidence?.analysis;
  const damage = live?.damage;

  const downloadReport = () => {
    if (!evidence) return;

    const report = {
      generated_at: new Date().toISOString(),
      investigation: evidence.investigation || null,
      evidence: {
        id: evidence.id,
        filename: evidence.filename,
        type: evidence.type,
        size: evidence.size,
        sha256: evidence.sha256,
      },
      analysis: analysis || null,
      reconstruction: reconstruction || null,
      forensic_notice:
        "This report separates verified recovery from structural repair, plausible reconstruction, AI inference, and insufficient evidence. It does not present unsupported bytes as original evidence.",
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `recoverai-report-${evidence.id}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  if (!evidence) {
    return (
      <div className="empty-analysis-state">
        <span className="eyebrow">FORENSIC OUTPUT</span>
        <h2>No reportable evidence</h2>
        <p className="muted">Upload and analyze evidence before generating a structured report.</p>
        <button className="primary-btn" onClick={() => navigate("/new-investigation")}>
          Open Evidence Intake
        </button>
      </div>
    );
  }

  const validationChecks = reconstruction?.validation?.checks || [];
  const relationshipCount = analysis?.relationships?.summary?.relationship_count ?? 0;
  const fragmentCount = analysis?.fragments?.summary?.fragment_count ?? 0;
  const comparison = reconstruction?.ground_truth_comparison;

  return (
    <div>
      {error && <div className="muted" style={{marginBottom:12}}>{error}</div>}

      <div className="page-intro">
        <div>
          <span className="eyebrow">FORENSIC OUTPUT</span>
          <h2>Investigation Report</h2>
          <p>Structured, machine-readable summary of recovery facts and provenance.</p>
        </div>
        <button className="primary-btn" onClick={downloadReport}>
          <Download size={16} /> Export JSON Report
        </button>
      </div>

      <div className="report-grid">
        <Card>
          <div className="report-cover">
            <div className="report-icon"><FileText size={30} /></div>
            <span className="eyebrow">RECOVERAI FORENSIC REPORT</span>
            <h3>{evidence.investigation?.name || "Evidence Analysis"}</h3>
            <p>{evidence.filename}</p>
            <Badge tone={result?.status?.includes("VERIFIED") ? "success" : result?.status?.includes("INSUFFICIENT") ? "danger" : "info"}>
              {result?.status || "ANALYSIS PENDING"}
            </Badge>
          </div>
        </Card>
        <Card>
          <div className="card-title">Recovery Summary</div>
          <div className="report-metrics">
            <div><b>{number(fragmentCount)}</b><span>fragments</span></div>
            <div><b>{number(relationshipCount)}</b><span>relationships</span></div>
            <div><b>{percent(result?.completeness)}</b><span>completeness</span></div>
            <div><b>{percent(result?.recovery_confidence)}</b><span>confidence</span></div>
          </div>
        </Card>
      </div>

      <div className="two-col">
        <Card>
          <div className="card-title"><ShieldCheck /> Integrity Findings</div>
          {validationChecks.map((check) => (
            <div className="finding" key={check}><CheckCircle2 /><div><b>{check.replaceAll("_", " ")}</b><p>Recorded by the format-specific structural validation step.</p></div></div>
          ))}
          {!validationChecks.length && <p className="muted">No validation result has been recorded yet.</p>}
        </Card>
        <Card>
          <div className="card-title"><Network /> Evidence Chain</div>
          <div className="chain">
            {["Original Evidence", "Storage Blocks", "Fragments", "Relationships", "Reconstruction", "Validation", "Final Assessment"].map((label, index) => (
              <div key={label}><span>{index + 1}</span><b>{label}</b></div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="card-title">Recovery Evidence</div>
        <table>
          <thead><tr><th>Measurement</th><th>Value</th><th>Forensic interpretation</th></tr></thead>
          <tbody>
            <tr><td>Input SHA-256</td><td className="mono">{evidence.sha256}</td><td>Hash recorded at evidence import.</td></tr>
            <tr><td>Verified bytes</td><td>{number(result?.verified_bytes)}</td><td>Bytes supported by the current validation result.</td></tr>
            <tr><td>Reconstructed bytes</td><td>{number(result?.reconstructed_bytes)}</td><td>{comparison?.available ? "Byte-verified against controlled benchmark ground truth." : "No unsupported bytes were generated."}</td></tr>
            <tr><td>Input missing bytes</td><td>{number(result?.input_missing_bytes)}</td><td>Unavailable before any verified recovery output.</td></tr>
            <tr><td>Ground truth comparison</td><td>{comparison?.available ? "AVAILABLE" : "NOT AVAILABLE"}</td><td>{comparison?.available ? `SHA-256 ${comparison.sha256_match ? "MATCH" : "DIFFERENCE"}` : "No trusted original is associated with this evidence."}</td></tr>
            <tr><td>Damage regions</td><td>{number(damage?.region_count)}</td><td>Loaded from the live damage-map endpoint.</td></tr>
            <tr><td>Known missing bytes</td><td>{number(damage?.known_missing_bytes)}</td><td>Missing bytes reported by the current evidence analysis.</td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
