import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, LoaderCircle, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

function getEvidenceId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("evidenceId") ||
    localStorage.getItem("recoverai_evidence_id") ||
    localStorage.getItem("currentEvidenceId") ||
    localStorage.getItem("evidenceId") || "";
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || `Backend request failed: HTTP ${response.status}`);
  }
  return data;
}

const bytes = (v = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};
const num = (v) => Number.isFinite(Number(v)) ? new Intl.NumberFormat("en-US").format(Number(v)) : "—";
const pct = (v) => Number.isFinite(Number(v)) ? `${(Number(v) * 100).toFixed(1)}%` : "—";

function positionFor(i, total) {
  if (total <= 1) return [0, 0, 0];
  const a = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / (total - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const t = a * i;
  return [Math.cos(t) * r * 4.2, y * 3.2, Math.sin(t) * r * 4.2];
}

function edgeColor(score) {
  const n = Number(score);
  return n >= 0.9 ? "#22c55e" : n >= 0.7 ? "#38bdf8" : "#64748b";
}

function Node({ fragment, position, selected, onSelect }) {
  const confidence = Number(fragment.confidence || 0);
  return (
    <group position={position}>
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(fragment); }}>
        <sphereGeometry args={[selected ? 0.19 : 0.13, 18, 18]} />
        <meshStandardMaterial
          color={selected ? "#ffffff" : confidence >= 0.9 ? "#22c55e" : confidence >= 0.7 ? "#38bdf8" : "#64748b"}
          emissive={selected ? "#38bdf8" : "#082f49"}
          emissiveIntensity={selected ? 0.8 : 0.45}
        />
      </mesh>
      {selected && (
        <Html distanceFactor={10}>
          <div className="fragment-node-label">
            <strong>{fragment.fragment_id}</strong>
            <span>{fragment.probable_type || "Unknown"}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function Graph({ fragments, relationships, selected, onSelect }) {
  const positions = useMemo(() => {
    const map = new Map();
    fragments.forEach((f, i) => map.set(f.fragment_id, positionFor(i, fragments.length)));
    return map;
  }, [fragments]);

  return (
    <Canvas camera={{ position: [0, 0, 15], fov: 48 }}>
      <ambientLight intensity={0.8} />
      <pointLight position={[5, 6, 8]} intensity={12} color="#38bdf8" />
      <pointLight position={[-6, -4, 3]} intensity={7} color="#22c55e" />
      <gridHelper args={[18, 18, "#18324a", "#0d1c2c"]} position={[0, -4.2, 0]} />

      {relationships.map((r, i) => {
        const a = positions.get(r.source_fragment);
        const b = positions.get(r.target_fragment);
        if (!a || !b) return null;
        return (
          <Line
            key={`${r.source_fragment}-${r.target_fragment}-${i}`}
            points={[a, b]}
            color={edgeColor(r.score)}
            lineWidth={Number(r.score) >= 0.9 ? 2 : 1}
            transparent
            opacity={0.72}
          />
        );
      })}

      {fragments.map((f) => {
        const p = positions.get(f.fragment_id);
        return p ? (
          <Node
            key={f.fragment_id}
            fragment={f}
            position={p}
            selected={selected?.fragment_id === f.fragment_id}
            onSelect={onSelect}
          />
        ) : null;
      })}

      <OrbitControls enablePan={false} minDistance={7} maxDistance={24} />
    </Canvas>
  );
}

export default function FragmentReconstruction() {
  const evidenceId = getEvidenceId();
  const [file, setFile] = useState(null);
  const [fragments, setFragments] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [reconstruction, setReconstruction] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRealData = async () => {
    if (!evidenceId) return;
    setLoading(true);
    setError("");

    try {
      const scanResult = await request(`/api/analysis/${evidenceId}/scan`, { method: "POST" });
      const scan = scanResult?.scan || scanResult?.data?.scan || scanResult || {};
      const fs = scanResult?.fragments || scanResult?.data?.fragments || scan.fragments || [];
      const rs = scanResult?.relationships || scanResult?.data?.relationships || scan.relationships || [];
      const fragmentList = Array.isArray(fs) ? fs : fs?.items || [];
      const relationshipList = Array.isArray(rs) ? rs : rs?.items || [];

      setFile({
        filename: scan?.filename || scanResult?.filename || localStorage.getItem("recoverai_evidence_filename") || "Evidence",
        size: scan?.file_size ?? scanResult?.file_size ?? null,
        sha256: scan?.sha256 || scanResult?.sha256 || null,
      });
      setFragments(fragmentList);
      setRelationships(relationshipList);

      const reconstructionResult = await request(`/api/reconstruction/${evidenceId}`, { method: "POST" });
      setReconstruction(reconstructionResult?.reconstruction || reconstructionResult || null);
      setSelected(fragmentList[0] || null);
    } catch (err) {
      setError(err.message || "Unable to load real fragment analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRealData(); }, [evidenceId]);

  if (!evidenceId) {
    return (
      <div className="real-fragment-page">
        <style>{styles}</style>
        <div className="no-evidence">
          <FileSearch size={30} />
          <h2>No Evidence Selected</h2>
          <p>Upload an evidence file first. This page only displays fragments and relationships returned by the backend.</p>
          <button onClick={() => window.location.href = "/investigation/new"}>Upload Evidence</button>
        </div>
      </div>
    );
  }

  const r = reconstruction || {};
  const status = r.status || r.recovery_status || "ANALYSIS PENDING";

  return (
    <div className="real-fragment-page">
      <style>{styles}</style>

      <div className="fragment-header">
        <div>
          <span className="eyebrow">FRAGMENT INTELLIGENCE</span>
          <h2>Fragment Reconstruction</h2>
          <p>Real fragment relationships calculated from the selected evidence by the RECOVERAI backend.</p>
          <div className="evidence-line">
            <span>{file?.filename || "Evidence"}</span>
            {file?.size != null && <span>{bytes(file.size)}</span>}
            {file?.sha256 && <span>SHA-256 {file.sha256.slice(0, 16)}…</span>}
          </div>
        </div>
        <button className="refresh-button" onClick={loadRealData} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          {loading ? "ANALYZING" : "REFRESH ANALYSIS"}
        </button>
      </div>

      {error && <div className="error-box"><XCircle size={17} /><span>{error}</span></div>}

      <div className="stats-grid">
        <div className="stat-card"><small>FRAGMENTS</small><strong>{num(fragments.length)}</strong><span>Detected from evidence</span></div>
        <div className="stat-card"><small>RELATIONSHIPS</small><strong>{num(relationships.length)}</strong><span>Observed structural links</span></div>
        <div className="stat-card"><small>RECOVERY</small><strong>{pct(r.recovery_confidence)}</strong><span>Backend recovery confidence</span></div>
        <div className="stat-card"><small>COMPLETENESS</small><strong>{pct(r.completeness)}</strong><span>Observed evidence completeness</span></div>
      </div>

      <div className="reconstruction-grid">
        <section className="panel graph-panel">
          <div className="panel-header">
            <div><strong>3D Fragment Relationship Graph</strong><span>Click a fragment · drag to orbit · scroll to zoom</span></div>
            <div className="graph-legend">
              <span><i className="green" />Strong ≥ 90%</span>
              <span><i className="blue" />Moderate ≥ 70%</span>
              <span><i className="gray" />Weak</span>
            </div>
          </div>

          <div className="graph">
            {loading && <div className="graph-loading"><LoaderCircle size={24} className="spin" />Loading real fragment relationships…</div>}
            {!loading && !fragments.length && <div className="graph-loading"><AlertTriangle size={24} />No fragments were returned by the backend.</div>}
            {!loading && fragments.length > 0 && <Graph fragments={fragments} relationships={relationships} selected={selected} onSelect={setSelected} />}
          </div>
        </section>

        <div className="side-stack">
          <section className="panel">
            <div className="panel-header simple"><strong>Selected Fragment</strong><ShieldCheck size={16} color="#38bdf8" /></div>
            {selected ? (
              <>
                <div className="fragment-id">{selected.fragment_id}</div>
                <div className="metric-list">
                  <div><span>Probable type</span><b>{selected.probable_type || "Unknown"}</b></div>
                  <div><span>Classification</span><b>{selected.classification || "Unclassified"}</b></div>
                  <div><span>Offset</span><b>{num(selected.offset)}</b></div>
                  <div><span>Size</span><b>{bytes(selected.size)}</b></div>
                  <div><span>Entropy</span><b>{Number.isFinite(Number(selected.entropy)) ? Number(selected.entropy).toFixed(3) : "—"}</b></div>
                  <div><span>SHA-256</span><b className="hash">{selected.sha256 ? `${selected.sha256.slice(0, 18)}…` : "—"}</b></div>
                  <div><span>Confidence</span><b>{pct(selected.confidence)}</b></div>
                </div>
              </>
            ) : <div className="empty-selected">Select a node in the graph.</div>}
          </section>

          <section className="panel">
            <div className="panel-header simple"><strong>Reconstruction Result</strong>{status === "VERIFIED RECOVERY" ? <CheckCircle2 size={16} color="#4ade80" /> : <AlertTriangle size={16} color="#fbbf24" />}</div>
            <div className="result-status">{status}</div>
            <div className="metric-list">
              <div><span>Structural confidence</span><b>{pct(r.structural_confidence)}</b></div>
              <div><span>Recovery confidence</span><b>{pct(r.recovery_confidence)}</b></div>
              <div><span>Verified bytes</span><b>{bytes(r.verified_bytes)}</b></div>
              <div><span>Reconstructed bytes</span><b>{bytes(r.reconstructed_bytes)}</b></div>
              <div><span>Missing bytes</span><b className="danger">{bytes(r.missing_bytes)}</b></div>
            </div>
            {r.explanation && <p className="explanation">{r.explanation}</p>}
            <div className="forensic-classification">
              <div><span>Forensic classification</span><strong>{status}</strong></div>
              <p>RECOVERAI never treats missing bytes as recovered unless the backend has verified those bytes. Structural validity does not prove equivalence to the original evidence.</p>
            </div>
          </section>
        </div>
      </div>

      <section className="panel damage-panel">
        <div className="panel-header">
          <div><strong>Recovery / Missing Regions</strong><span>Regions are shown only when supplied by the backend reconstruction result.</span></div>
        </div>
        {Array.isArray(r.missing_regions || r.missingRegions || r.damage_regions) && (r.missing_regions || r.missingRegions || r.damage_regions).length > 0 ? (
          <div className="region-table-wrap">
            <table className="region-table">
              <thead><tr><th>Region</th><th>Offset</th><th>Size</th><th>Damage</th><th>Status</th><th>Source</th></tr></thead>
              <tbody>
                {(r.missing_regions || r.missingRegions || r.damage_regions).map((region, index) => (
                  <tr key={region.region_id || region.id || index}>
                    <td className="mono">{region.region_id || `REGION-${index + 1}`}</td>
                    <td>{num(region.original_offset)}</td>
                    <td>{bytes(region.size)}</td>
                    <td>{region.damage_type || "UNKNOWN"}</td>
                    <td><span className="region-status">{region.recovery_status || "UNKNOWN"}</span></td>
                    <td>{region.source || "BACKEND"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-region"><CheckCircle2 size={18} /><span>No backend-reported missing region is attached to this reconstruction result.</span></div>
        )}
        {r.missing_region_source === "GROUND_TRUTH" && (
          <div className="forensic-note"><AlertTriangle size={15} /><span>Controlled benchmark ground truth is being used to describe the known damaged region. It must not be represented as an independently inferred forensic finding.</span></div>
        )}
      </section>

      <section className="panel contribution-panel">
        <div className="panel-header"><div><strong>Fragment Contribution</strong><span>Actual backend fragments. Missing bytes are never invented.</span></div></div>
        <div className="fragment-strip">
          {fragments.map((f) => (
            <button key={f.fragment_id} className={selected?.fragment_id === f.fragment_id ? "fragment-chip selected" : "fragment-chip"} onClick={() => setSelected(f)} title={`${f.fragment_id} · ${bytes(f.size)}`}>
              {f.fragment_id}
            </button>
          ))}
        </div>
        <div className="forensic-note"><AlertTriangle size={15} />Relationship scores represent observed structural relationship strength, not probabilities that two fragments originally belonged together.</div>
      </section>

      <section className="panel validation-panel">
        <div className="panel-header">
          <div><strong>Reconstruction Validation</strong><span>Format-specific checks returned by the backend.</span></div>
          {r.validation?.valid === true ? <CheckCircle2 size={17} color="#4ade80" /> : r.validation ? <AlertTriangle size={17} color="#fbbf24" /> : null}
        </div>
        {r.validation ? (
          <>
            <div className="validation-summary">
              <div><span>Structural validity</span><b>{r.validation.valid ? "VALID" : "NOT VALID"}</b></div>
              <div><span>Format</span><b>{r.validation.format || file?.filename?.split(".").pop()?.toUpperCase() || "UNKNOWN"}</b></div>
              <div><span>EOF / terminal marker</span><b>{r.validation.eof_found ? "FOUND" : "NOT FOUND"}</b></div>
            </div>
            {Array.isArray(r.validation.checks) && r.validation.checks.length > 0 && (
              <div className="check-list">
                {r.validation.checks.map((check, index) => (
                  <div className="check-row" key={`${check}-${index}`}><CheckCircle2 size={14} /><span>{String(check).replaceAll("_", " ")}</span></div>
                ))}
              </div>
            )}
          </>
        ) : <div className="empty-region">No validation object was returned by the backend.</div>}
      </section>
    </div>
  );
}

const styles = `
.real-fragment-page{color:#e5eef8}.real-fragment-page .fragment-header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:18px}.real-fragment-page .eyebrow{display:block;color:#67b7ff;font-size:10px;font-weight:800;letter-spacing:.16em;margin-bottom:7px}.real-fragment-page h2{margin:0;color:#f5f9ff;font-size:28px}.real-fragment-page .fragment-header p{margin:7px 0 8px;color:#8196aa;font-size:12px}.real-fragment-page .evidence-line{display:flex;flex-wrap:wrap;gap:8px;color:#71879d;font-size:10px}.real-fragment-page .evidence-line span{border:1px solid #1a3046;background:#091625;border-radius:6px;padding:5px 7px}.real-fragment-page .refresh-button,.real-fragment-page .no-evidence button{display:inline-flex;align-items:center;gap:7px;border:1px solid #1597d4;border-radius:9px;padding:9px 12px;background:#0876ad;color:#fff;font-size:10px;font-weight:800;cursor:pointer}.real-fragment-page .refresh-button:disabled{opacity:.55;cursor:not-allowed}.real-fragment-page .error-box{display:flex;gap:9px;padding:12px;margin-bottom:15px;border:1px solid rgba(248,113,113,.32);border-radius:10px;background:rgba(127,29,29,.14);color:#fca5a5;font-size:11px}.real-fragment-page .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:15px}.real-fragment-page .stat-card,.real-fragment-page .panel{border:1px solid #1c3047;border-radius:13px;background:linear-gradient(180deg,#0b1a2b,#091524)}.real-fragment-page .stat-card{padding:14px}.real-fragment-page .stat-card small{display:block;color:#6f879e;font-size:9px;font-weight:800;letter-spacing:.08em}.real-fragment-page .stat-card strong{display:block;margin:6px 0 4px;color:#55c7ff;font-size:22px}.real-fragment-page .stat-card span{color:#72889e;font-size:9px}.real-fragment-page .reconstruction-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(290px,.7fr);gap:15px}.real-fragment-page .panel{padding:16px}.real-fragment-page .panel-header{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;margin-bottom:13px}.real-fragment-page .panel-header.simple{align-items:center}.real-fragment-page .panel-header strong{display:block;color:#e8f1fb;font-size:12px}.real-fragment-page .panel-header span{display:block;margin-top:5px;color:#6f879e;font-size:9px;line-height:1.5}.real-fragment-page .graph-legend{display:flex;flex-wrap:wrap;gap:9px}.real-fragment-page .graph-legend span{display:flex;align-items:center;gap:4px;color:#71879d;font-size:9px}.real-fragment-page .graph-legend i{width:7px;height:7px;border-radius:50%}.real-fragment-page .graph-legend .green{background:#22c55e}.real-fragment-page .graph-legend .blue{background:#38bdf8}.real-fragment-page .graph-legend .gray{background:#64748b}.real-fragment-page .graph{height:540px;overflow:hidden;border:1px solid #142a40;border-radius:10px;background:#050e18;position:relative}.real-fragment-page .graph-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:#7d93a9;font-size:11px;z-index:2;background:rgba(5,14,24,.88)}.real-fragment-page .fragment-node-label{min-width:115px;padding:7px 9px;border:1px solid #25506c;border-radius:7px;background:#071522;box-shadow:0 8px 24px rgba(0,0,0,.35)}.real-fragment-page .fragment-node-label strong,.real-fragment-page .fragment-node-label span{display:block}.real-fragment-page .fragment-node-label strong{color:#dff4ff;font-size:10px}.real-fragment-page .fragment-node-label span{margin-top:3px;color:#7e9bb2;font-size:9px}.real-fragment-page .side-stack{display:flex;flex-direction:column;gap:15px}.real-fragment-page .fragment-id{color:#55c7ff;font-family:monospace;font-size:18px;font-weight:800;margin:2px 0 12px}.real-fragment-page .metric-list{display:flex;flex-direction:column}.real-fragment-page .metric-list>div{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #162b40}.real-fragment-page .metric-list>div:last-child{border-bottom:0}.real-fragment-page .metric-list span{color:#71879d;font-size:10px}.real-fragment-page .metric-list b{color:#dce8f5;font-size:10px;text-align:right}.real-fragment-page .metric-list .hash{max-width:145px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace}.real-fragment-page .danger{color:#f87171}.real-fragment-page .result-status{display:inline-flex;margin-bottom:10px;padding:6px 8px;border:1px solid #25435c;border-radius:6px;background:#0a2033;color:#55c7ff;font-size:9px;font-weight:800}.real-fragment-page .explanation{margin:11px 0 0;padding-top:11px;border-top:1px solid #162b40;color:#8196aa;font-size:10px;line-height:1.6}.real-fragment-page .contribution-panel{margin-top:15px}.real-fragment-page .fragment-strip{display:flex;flex-wrap:wrap;gap:6px}.real-fragment-page .fragment-chip{border:1px solid #1a344b;border-radius:6px;padding:6px 7px;background:#081625;color:#71879d;font-family:monospace;font-size:8px;cursor:pointer}.real-fragment-page .fragment-chip:hover,.real-fragment-page .fragment-chip.selected{border-color:#249bd2;background:#0b2940;color:#d9f2ff}.real-fragment-page .forensic-classification{margin-top:12px;padding-top:12px;border-top:1px solid #162b40}.real-fragment-page .forensic-classification>div{display:flex;justify-content:space-between;gap:10px;align-items:center}.real-fragment-page .forensic-classification span{color:#71879d;font-size:9px}.real-fragment-page .forensic-classification strong{color:#55c7ff;font-size:9px}.real-fragment-page .forensic-classification p{margin:7px 0 0;color:#8196aa;font-size:9px;line-height:1.55}.real-fragment-page .damage-panel,.real-fragment-page .validation-panel{margin-top:15px}.real-fragment-page .region-table-wrap{overflow:auto;border:1px solid #142a40;border-radius:9px}.real-fragment-page .region-table{width:100%;border-collapse:collapse;min-width:680px}.real-fragment-page .region-table th,.real-fragment-page .region-table td{padding:9px 10px;border-bottom:1px solid #162b40;text-align:left;font-size:9px}.real-fragment-page .region-table th{color:#6f879e;font-size:8px;letter-spacing:.08em}.real-fragment-page .region-table td{color:#d2deea}.real-fragment-page .region-table tr:last-child td{border-bottom:0}.real-fragment-page .mono{font-family:monospace;color:#72cfff}.real-fragment-page .region-status{display:inline-block;padding:4px 6px;border:1px solid #5a4520;border-radius:5px;background:#241b0c;color:#e4b95e;font-size:8px;font-weight:800}.real-fragment-page .empty-region{display:flex;align-items:center;gap:8px;padding:18px;border:1px dashed #1b344a;border-radius:9px;color:#7d93a9;font-size:10px}.real-fragment-page .validation-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.real-fragment-page .validation-summary>div{padding:10px;border:1px solid #172e43;border-radius:8px;background:#081625}.real-fragment-page .validation-summary span{display:block;color:#71879d;font-size:8px}.real-fragment-page .validation-summary b{display:block;margin-top:5px;color:#dce8f5;font-size:10px}.real-fragment-page .check-list{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:10px}.real-fragment-page .check-row{display:flex;align-items:center;gap:7px;padding:8px;border:1px solid #162b40;border-radius:7px;color:#9db0c1;font-size:9px}.real-fragment-page .check-row svg{color:#4ade80;flex:none}.real-fragment-page .forensic-note{display:flex;align-items:flex-start;gap:8px;margin-top:13px;padding:10px;border:1px solid rgba(245,158,11,.25);border-radius:8px;background:rgba(245,158,11,.06);color:#d6ad58;font-size:9px;line-height:1.5}.real-fragment-page .no-evidence{max-width:650px;margin:80px auto;padding:34px;text-align:center;border:1px solid #1c3047;border-radius:15px;background:linear-gradient(180deg,#0b1a2b,#091524);color:#38bdf8}.real-fragment-page .no-evidence h2{margin:13px 0 7px}.real-fragment-page .no-evidence p{margin:0 auto 18px;max-width:500px;color:#8196aa;font-size:11px;line-height:1.7}.real-fragment-page .spin{animation:real-fragment-spin .9s linear infinite}@keyframes real-fragment-spin{to{transform:rotate(360deg)}}@media(max-width:950px){.real-fragment-page .stats-grid{grid-template-columns:repeat(2,1fr)}.real-fragment-page .reconstruction-grid{grid-template-columns:1fr}}@media(max-width:620px){.real-fragment-page .stats-grid{grid-template-columns:1fr}.real-fragment-page .fragment-header{flex-direction:column}}
`;
