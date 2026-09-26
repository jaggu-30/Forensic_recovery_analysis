import { Activity, Database, FileCheck2, Network, ShieldCheck, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import StatCard from "../components/common/StatCard";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { getSelectedEvidence } from "../data/evidenceSession";

const percent = (value) => (value == null ? "—" : `${Math.round(value * 100)}%`);

export default function Dashboard() {
  const navigate = useNavigate();
  const evidence = getSelectedEvidence();
  const analysis = evidence?.analysis;
  const reconstruction = evidence?.reconstruction;
  const result = reconstruction?.reconstruction;
  const summary = analysis?.fragments?.summary;
  const relationshipSummary = analysis?.relationships?.summary;

  if (!evidence) {
    return (
      <div className="empty-analysis-state">
        <span className="eyebrow">INVESTIGATION OVERVIEW</span>
        <h2>No active investigation</h2>
        <p className="muted">Create an investigation to populate this dashboard with evidence-backed metrics.</p>
        <button className="primary-btn" onClick={() => navigate("/new-investigation")}>
          Create Investigation
        </button>
      </div>
    );
  }

  const hasDamage = (result?.input_missing_bytes || 0) > 0;
  return (
    <div>
      <div className="page-intro">
        <div>
          <span className="eyebrow">CURRENT INVESTIGATION</span>
          <h2>{evidence.investigation?.name || "Active Evidence Analysis"}</h2>
          <p>Evidence-backed overview for {evidence.filename}.</p>
        </div>
        <button className="primary-btn" onClick={() => navigate("/analysis")}>
          Open Analysis <Activity size={16} />
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="Evidence Sources" value="1" sub="Current active upload" icon={Database} />
        <StatCard label="Fragments Detected" value={summary?.fragment_count ?? "—"} sub="4 KB observed storage blocks" icon={Network} />
        <StatCard label="Relationships" value={relationshipSummary?.relationship_count ?? "—"} sub="Evidence-supported candidates" icon={FileCheck2} />
        <StatCard label="Recovery Confidence" value={percent(result?.recovery_confidence)} sub="Assessment, not byte certainty" icon={ShieldCheck} />
      </div>

      <div className="two-col">
        <Card>
          <div className="card-title"><span>Recovery Overview</span><Badge tone={result?.status?.includes("VERIFIED") ? "success" : "info"}>{result?.status || "NOT ANALYZED"}</Badge></div>
          <div className="overview-big"><b>{percent(result?.completeness)}</b><span>current recovery completeness</span></div>
          <div className="bar-row"><span>Verified bytes</span><b>{result?.verified_bytes?.toLocaleString?.() ?? "—"}</b></div>
          <div className="mini-bar"><i style={{ width: `${Math.round((result?.completeness || 0) * 100)}%` }} /></div>
          <div className="bar-row"><span>Reconstructed bytes</span><b>{result?.reconstructed_bytes?.toLocaleString?.() ?? "0"}</b></div>
          <div className="mini-bar"><i style={{ width: `${Math.round(((result?.reconstructed_bytes || 0) / Math.max(1, evidence.size || 1)) * 100)}%` }} /></div>
          <div className="bar-row"><span>Input missing bytes</span><b>{result?.input_missing_bytes?.toLocaleString?.() ?? "0"}</b></div>
        </Card>

        <Card>
          <div className="card-title"><span>Investigation Findings</span><span className="live-label"><i /> RECORDED</span></div>
          <div className="insight"><ShieldCheck /><div><b>File type: {evidence.type}</b><p>SHA-256 was captured when evidence was imported.</p></div></div>
          <div className="insight"><Network /><div><b>{relationshipSummary?.relationship_count ?? 0} fragment relationships scored</b><p>Scores represent candidate compatibility, not ownership proof.</p></div></div>
          <div className="insight"><AlertTriangle /><div><b>{hasDamage ? "Missing evidence requires review" : "No missing region recorded"}</b><p>{hasDamage ? "Unavailable bytes remain explicitly identified unless independently verified." : "No supported byte-range damage record is available."}</p></div></div>
        </Card>
      </div>

      <Card className="table-card">
        <div className="card-title"><span>Selected Evidence</span><button className="text-btn" onClick={() => navigate("/evidence")}>Open workspace</button></div>
        <table>
          <thead><tr><th>Evidence</th><th>Type</th><th>Status</th><th>Fragments</th><th>Confidence</th></tr></thead>
          <tbody><tr><td><b>{evidence.filename}</b><small>{evidence.id}</small></td><td>{evidence.type}</td><td><Badge tone={result?.status?.includes("INSUFFICIENT") ? "danger" : "info"}>{result?.status || evidence.status}</Badge></td><td>{summary?.fragment_count ?? "—"}</td><td><b>{percent(result?.recovery_confidence)}</b></td></tr></tbody>
        </table>
      </Card>
    </div>
  );
}
