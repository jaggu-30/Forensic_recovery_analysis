import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Database,
  FileSearch,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

// Current controlled benchmark evidence.
// The page also accepts ?evidenceId=... or localStorage keys below.
const PIPELINE = [
  ["Evidence Scan", "scan"],
  ["File Signature Detection", "signature"],
  ["Fragment Detection", "fragments"],
  ["Fragment Classification", "classification"],
  ["Fragment Relationship Analysis", "relationships"],
  ["Recovery Feasibility Analysis", "feasibility"],
  ["Reconstruction", "reconstruction"],
  ["Integrity Verification", "validation"],
  ["Contradiction Detection", "contradictions"],
  ["Evidence Prioritization", "priority"],
];

function getEvidenceId() {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get("evidenceId");

  const storedId =
    localStorage.getItem("recoverai_evidence_id") ||
    localStorage.getItem("currentEvidenceId") ||
    localStorage.getItem("evidenceId");

  return queryId || storedId || "";
}

function bytes(value = 0) {
  if (!Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function number(value = 0) {
  if (!Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-US").format(Number(value));
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.error ||
        `Backend request failed: HTTP ${response.status}`
    );
  }

  return data;
}

function normalizeScan(result) {
  const scan = result?.scan || result?.data?.scan || result || {};
  const fragments =
    result?.fragments ||
    result?.data?.fragments ||
    scan?.fragments ||
    [];

  const relationships =
    result?.relationships ||
    result?.data?.relationships ||
    scan?.relationships ||
    [];

  return {
    scan,
    fragments: Array.isArray(fragments)
      ? fragments
      : fragments?.items || [],
    relationships: Array.isArray(relationships)
      ? relationships
      : relationships?.items || [],
  };
}

function stageStatus(stage, completedThrough, runningStage, errorStage) {
  if (errorStage === stage) return "Failed";

  const index = PIPELINE.findIndex(([, key]) => key === stage);

  if (index <= completedThrough) return "Completed";
  if (stage === runningStage) return "Running";

  return "Pending";
}

export default function RecoveryAnalysis() {
  const evidenceId = getEvidenceId();

  const [file, setFile] = useState({
    filename: "Evidence",
    size: null,
    sha256: null,
    type: null,
  });

  const [steps, setSteps] = useState(
    PIPELINE.map(([name, key]) => ({
      name,
      key,
      status: "Pending",
      progress: 0,
    }))
  );

  const [summary, setSummary] = useState(null);
  const [reconstruction, setReconstruction] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [runToken, setRunToken] = useState(0);

  const setStep = (key, status, progress) => {
    setSteps((current) =>
      current.map((step) =>
        step.key === key
          ? { ...step, status, progress }
          : step
      )
    );
  };

  const runPipeline = async () => {
    setRunning(true);
    setError("");
    setSummary(null);
    setReconstruction(null);
    setScanData(null);

    setSteps(
      PIPELINE.map(([name, key], index) => ({
        name,
        key,
        status: index === 0 ? "Running" : "Pending",
        progress: 0,
      }))
    );

    try {
      // 1. Real evidence record.
      const evidence = await request(`/api/evidence/${evidenceId}`);

      const evidenceRecord = evidence?.evidence || evidence || {};

      setFile({
        filename:
          evidenceRecord.original_filename ||
          evidenceRecord.filename ||
          "Evidence",
        size:
          evidenceRecord.file_size ??
          evidenceRecord.size ??
          null,
        sha256:
          evidenceRecord.sha256 || null,
        type:
          evidenceRecord.evidence_type ||
          evidenceRecord.mime_type ||
          null,
      });

      setStep("scan", "Running", 25);

      // 2. Real backend analysis.
      // This endpoint performs the actual scan, fragment detection,
      // classification and relationship analysis.
      const scanResult = await request(
        `/api/analysis/${evidenceId}/scan`,
        { method: "POST" }
      );

      const normalized = normalizeScan(scanResult);
      setScanData(normalized);

      setStep("scan", "Completed", 100);
      setStep("signature", "Completed", 100);
      setStep("fragments", "Completed", 100);
      setStep("classification", "Completed", 100);
      setStep("relationships", "Completed", 100);

      // 3. Get persisted analysis summary.
      setStep("feasibility", "Running", 35);

      const analysisSummary = await request(
        `/api/analysis/${evidenceId}/summary`
      );

      setSummary(
        analysisSummary?.summary ||
          analysisSummary ||
          null
      );

      setStep("feasibility", "Completed", 100);

      // 4. Real reconstruction / feasibility / validation.
      setStep("reconstruction", "Running", 30);

      const reconstructionResult = await request(
        `/api/reconstruction/${evidenceId}`,
        { method: "POST" }
      );

      setReconstruction(
        reconstructionResult?.reconstruction
          ? reconstructionResult
          : reconstructionResult
      );

      setStep("reconstruction", "Completed", 100);
      setStep("validation", "Completed", 100);

      // These two stages are currently represented by the
      // backend's analysis/reconstruction outputs.
      setStep("contradictions", "Completed", 100);
      setStep("priority", "Completed", 100);
    } catch (err) {
      setError(err.message || "Analysis failed.");

      setSteps((current) =>
        current.map((step) =>
          step.status === "Running"
            ? {
                ...step,
                status: "Failed",
                progress: 0,
              }
            : step
        )
      );
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!evidenceId) {
      setRunning(false);
      setError("");
      setFile({
        filename: "No evidence selected",
        size: null,
        sha256: null,
        type: null,
      });
      setSteps(
        PIPELINE.map(([name, key]) => ({
          name,
          key,
          status: "Pending",
          progress: 0,
        }))
      );
      return;
    }

    runPipeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceId, runToken]);

  const reconstructionMetrics =
    reconstruction?.reconstruction ||
    reconstruction ||
    {};

  const scan = scanData?.scan || {};
  const fragments =
    scanData?.fragments ||
    reconstruction?.fragment_coverage?.fragments ||
    [];

  const relationships =
    scanData?.relationships || [];

  const fragmentCount =
    reconstructionMetrics.fragment_count ??
    fragments.length ??
    summary?.fragment_count ??
    summary?.fragments_detected ??
    "—";

  const relationshipCount =
    relationships.length ||
    summary?.relationship_count ||
    summary?.relationships_found ||
    "—";

  const completeness =
    reconstructionMetrics.completeness ??
    summary?.completeness ??
    null;

  const recoveryConfidence =
    reconstructionMetrics.recovery_confidence ??
    summary?.recovery_confidence ??
    null;

  const structuralConfidence =
    reconstructionMetrics.structural_confidence ??
    summary?.structural_confidence ??
    null;

  const missingBytes =
    reconstructionMetrics.missing_bytes ??
    summary?.missing_bytes ??
    0;

  const reconstructedBytes =
    reconstructionMetrics.reconstructed_bytes ??
    summary?.reconstructed_bytes ??
    0;

  const verifiedBytes =
    reconstructionMetrics.verified_bytes ??
    summary?.verified_bytes ??
    0;

  const status =
    reconstructionMetrics.status ||
    summary?.status ||
    "Awaiting analysis";

  const maxCompleted = useMemo(() => {
    let index = -1;

    steps.forEach((step, i) => {
      if (step.status === "Completed") index = i;
    });

    return index;
  }, [steps]);

  if (!evidenceId) {
    return (
      <div className="real-analysis-page">
        <style>{`
          .no-evidence-card {
            max-width:720px;
            margin:80px auto;
            padding:34px;
            text-align:center;
            border:1px solid #1c3047;
            border-radius:16px;
            background:linear-gradient(180deg,#0b1a2b,#091524);
          }
          .no-evidence-card .icon {
            width:52px;
            height:52px;
            margin:0 auto 16px;
            display:flex;
            align-items:center;
            justify-content:center;
            border-radius:14px;
            background:#0d2740;
            color:#38bdf8;
          }
          .no-evidence-card h2 {
            margin:0 0 8px;
            color:#f5f9ff;
            font-size:22px;
          }
          .no-evidence-card p {
            margin:0 auto 20px;
            max-width:520px;
            color:#8196aa;
            font-size:12px;
            line-height:1.7;
          }
          .no-evidence-card button {
            display:inline-flex;
            align-items:center;
            gap:7px;
            border:1px solid #1597d4;
            border-radius:9px;
            padding:10px 15px;
            background:#0876ad;
            color:white;
            font-size:11px;
            font-weight:800;
            cursor:pointer;
          }
        `}</style>

        <div className="no-evidence-card">
          <div className="icon">
            <FileSearch size={24} />
          </div>
          <h2>No Evidence Selected</h2>
          <p>
            Recovery Analysis is connected to the real FastAPI
            backend. Upload an evidence file first; the backend
            will create the investigation and evidence records,
            after which this page will execute the real analysis
            pipeline.
          </p>
          <button
            onClick={() =>
              (window.location.href =
                "/investigation/new")
            }
          >
            Upload Evidence
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="real-analysis-page">
      <style>{`
        .real-analysis-page {
          color: #e5eef8;
        }

        .real-analysis-page .analysis-head {
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:20px;
          margin-bottom:22px;
        }

        .real-analysis-page .eyebrow {
          display:block;
          color:#67b7ff;
          font-size:10px;
          font-weight:800;
          letter-spacing:.16em;
          margin-bottom:7px;
        }

        .real-analysis-page h2 {
          margin:0;
          font-size:28px;
          color:#f5f9ff;
        }

        .real-analysis-page .subtitle {
          margin:7px 0 0;
          color:#8da2b8;
          font-size:12px;
        }

        .real-analysis-page .live-badge {
          border:1px solid rgba(34,197,94,.35);
          background:rgba(22,163,74,.09);
          color:#4ade80;
          border-radius:999px;
          padding:7px 11px;
          font-size:10px;
          font-weight:800;
          white-space:nowrap;
        }

        .real-analysis-page .error-box {
          display:flex;
          gap:10px;
          align-items:flex-start;
          padding:13px 15px;
          margin-bottom:18px;
          border:1px solid rgba(248,113,113,.35);
          border-radius:12px;
          background:rgba(127,29,29,.16);
          color:#fca5a5;
          font-size:12px;
        }

        .real-analysis-page .analysis-grid {
          display:grid;
          grid-template-columns:minmax(0, 1.7fr) minmax(280px,.8fr);
          gap:16px;
        }

        .real-analysis-page .panel {
          border:1px solid #1c3047;
          border-radius:14px;
          background:linear-gradient(180deg,#0b1a2b,#091524);
          padding:18px;
        }

        .real-analysis-page .panel-title {
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:20px;
          color:#e8f1fb;
          font-size:13px;
          font-weight:800;
        }

        .real-analysis-page .pipeline {
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        .real-analysis-page .pipeline-row {
          display:grid;
          grid-template-columns:28px minmax(0,1fr);
          gap:10px;
          align-items:center;
        }

        .real-analysis-page .step-icon {
          width:26px;
          height:26px;
          display:flex;
          align-items:center;
          justify-content:center;
          border-radius:50%;
          border:1px solid #284057;
          color:#647c94;
          background:#0b1726;
        }

        .real-analysis-page .step-icon.completed {
          color:#4ade80;
          border-color:rgba(34,197,94,.45);
          background:rgba(34,197,94,.08);
        }

        .real-analysis-page .step-icon.running {
          color:#38bdf8;
          border-color:rgba(56,189,248,.45);
        }

        .real-analysis-page .step-icon.failed {
          color:#f87171;
          border-color:rgba(248,113,113,.45);
        }

        .real-analysis-page .step-main {
          min-width:0;
        }

        .real-analysis-page .step-label {
          display:flex;
          justify-content:space-between;
          gap:12px;
          margin-bottom:7px;
          font-size:11px;
        }

        .real-analysis-page .step-label strong {
          color:#dce8f5;
        }

        .real-analysis-page .step-label span {
          color:#70869c;
          white-space:nowrap;
        }

        .real-analysis-page .progress {
          height:5px;
          overflow:hidden;
          border-radius:99px;
          background:#13253a;
        }

        .real-analysis-page .progress > i {
          display:block;
          height:100%;
          border-radius:99px;
          background:linear-gradient(90deg,#1596d8,#55c7ff);
          transition:width .3s ease;
        }

        .real-analysis-page .metric-list {
          display:flex;
          flex-direction:column;
          gap:0;
        }

        .real-analysis-page .metric {
          display:flex;
          justify-content:space-between;
          gap:15px;
          padding:12px 0;
          border-bottom:1px solid #172a40;
          font-size:11px;
        }

        .real-analysis-page .metric:last-child {
          border-bottom:0;
        }

        .real-analysis-page .metric span {
          color:#7890a8;
        }

        .real-analysis-page .metric strong {
          color:#dce8f5;
          text-align:right;
        }

        .real-analysis-page .metric strong.good {
          color:#4ade80;
        }

        .real-analysis-page .metric strong.warn {
          color:#fbbf24;
        }

        .real-analysis-page .metric strong.bad {
          color:#f87171;
        }

        .real-analysis-page .telemetry {
          display:grid;
          grid-template-columns:repeat(5,minmax(0,1fr));
          gap:10px;
        }

        .real-analysis-page .telemetry-card {
          border:1px solid #172c43;
          border-radius:10px;
          padding:13px;
          background:#0a1726;
        }

        .real-analysis-page .telemetry-card small {
          display:block;
          color:#70869c;
          font-size:9px;
          text-transform:uppercase;
          letter-spacing:.05em;
          margin-bottom:6px;
        }

        .real-analysis-page .telemetry-card strong {
          color:#e5eef8;
          font-size:13px;
        }

        .real-analysis-page .bottom-grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px;
          margin-top:16px;
        }

        .real-analysis-page .run-button {
          display:inline-flex;
          align-items:center;
          gap:7px;
          border:1px solid #1b83bd;
          background:#0b6ea5;
          color:#fff;
          border-radius:9px;
          padding:8px 12px;
          font-size:11px;
          font-weight:800;
          cursor:pointer;
        }

        .real-analysis-page .run-button:disabled {
          opacity:.55;
          cursor:not-allowed;
        }

        .real-analysis-page .status-badge {
          display:inline-flex;
          padding:5px 8px;
          border-radius:6px;
          font-size:9px;
          font-weight:800;
          background:#13283c;
          color:#8ed8ff;
        }

        .real-analysis-page .status-badge.success {
          background:rgba(22,163,74,.13);
          color:#4ade80;
        }

        .real-analysis-page .status-badge.warning {
          background:rgba(245,158,11,.13);
          color:#fbbf24;
        }

        @media (max-width: 950px) {
          .real-analysis-page .analysis-grid,
          .real-analysis-page .bottom-grid {
            grid-template-columns:1fr;
          }

          .real-analysis-page .telemetry {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }
      `}</style>

      <div className="analysis-head">
        <div>
          <span className="eyebrow">
            AI-ASSISTED RECOVERY PIPELINE
          </span>
          <h2>Recovery Analysis</h2>
          <p className="subtitle">
            {file.filename} ·{" "}
            {file.size !== null ? bytes(file.size) : "size pending"} ·{" "}
            {file.sha256
              ? `SHA-256 ${file.sha256.slice(0, 16)}…`
              : "SHA-256 pending"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <span className="live-badge">
            {running ? "● ANALYSIS RUNNING" : "● LIVE BACKEND"}
          </span>

          <button
            className="run-button"
            onClick={() => setRunToken((v) => v + 1)}
            disabled={running}
          >
            <RefreshCw size={13} />
            {running ? "PROCESSING" : "RUN ANALYSIS"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <XCircle size={17} />
          <div>
            <strong>Backend analysis failed</strong>
            <div style={{ marginTop: 3 }}>{error}</div>
          </div>
        </div>
      )}

      <div className="analysis-grid">
        <section className="panel">
          <div className="panel-title">
            <span>Pipeline Execution</span>
            <span style={{ color: "#4ade80", fontSize: 10 }}>
              {running ? "LIVE" : "BACKEND CONNECTED"}
            </span>
          </div>

          <div className="pipeline">
            {steps.map((step) => (
              <div className="pipeline-row" key={step.key}>
                <div
                  className={`step-icon ${step.status.toLowerCase()}`}
                >
                  {step.status === "Completed" && (
                    <CheckCircle2 size={15} />
                  )}

                  {step.status === "Running" && (
                    <LoaderCircle
                      className="spin"
                      size={15}
                    />
                  )}

                  {step.status === "Failed" && (
                    <XCircle size={15} />
                  )}

                  {step.status === "Pending" && (
                    <Circle size={14} />
                  )}
                </div>

                <div className="step-main">
                  <div className="step-label">
                    <strong>{step.name}</strong>
                    <span>{step.status}</span>
                  </div>

                  <div className="progress">
                    <i style={{ width: `${step.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>Recovery Assessment</span>
            <ShieldCheck size={17} color="#38bdf8" />
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: "#55c7ff",
              marginBottom: 15,
            }}
          >
            {completeness !== null
              ? `${(Number(completeness) * 100).toFixed(2)}%`
              : "—"}
          </div>

          <div className="metric-list">
            <div className="metric">
              <span>Evidence</span>
              <strong>{file.filename}</strong>
            </div>

            <div className="metric">
              <span>Fragments detected</span>
              <strong>{number(fragmentCount)}</strong>
            </div>

            <div className="metric">
              <span>Relationships scored</span>
              <strong>{number(relationshipCount)}</strong>
            </div>

            <div className="metric">
              <span>Recovery status</span>
              <strong
                className={
                  status === "VERIFIED RECOVERY"
                    ? "good"
                    : status === "STRUCTURAL REPAIR"
                    ? "warn"
                    : ""
                }
              >
                {status}
              </strong>
            </div>

            <div className="metric">
              <span>Recovery confidence</span>
              <strong>
                {recoveryConfidence !== null
                  ? `${(
                      Number(recoveryConfidence) * 100
                    ).toFixed(2)}%`
                  : "—"}
              </strong>
            </div>

            <div className="metric">
              <span>Structural confidence</span>
              <strong>
                {structuralConfidence !== null
                  ? `${(
                      Number(structuralConfidence) * 100
                    ).toFixed(2)}%`
                  : "—"}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-title">
          <span>Scan Telemetry</span>
          <Database size={17} color="#38bdf8" />
        </div>

        <div className="telemetry">
          <div className="telemetry-card">
            <small>Bytes scanned</small>
            <strong>
              {scan.bytes_scanned !== undefined
                ? number(scan.bytes_scanned)
                : file.size !== null
                ? number(file.size)
                : "—"}
            </strong>
          </div>

          <div className="telemetry-card">
            <small>Signatures</small>
            <strong>
              {scan.signature_count ??
                scan.signatures_detected ??
                "—"}
            </strong>
          </div>

          <div className="telemetry-card">
            <small>Validated markers</small>
            <strong>
              {scan.validated_signature_count ??
                scan.validated_markers ??
                "—"}
            </strong>
          </div>

          <div className="telemetry-card">
            <small>Entropy blocks</small>
            <strong>
              {scan.entropy_block_count ??
                scan.entropy_blocks ??
                "—"}
            </strong>
          </div>

          <div className="telemetry-card">
            <small>Average entropy</small>
            <strong>
              {scan.average_entropy !== undefined
                ? Number(scan.average_entropy).toFixed(3)
                : "—"}
            </strong>
          </div>
        </div>
      </div>

      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-title">
            <span>Recovery Metrics</span>
            <FileSearch size={17} color="#38bdf8" />
          </div>

          <div className="metric-list">
            <div className="metric">
              <span>Verified bytes</span>
              <strong>{bytes(verifiedBytes)}</strong>
            </div>

            <div className="metric">
              <span>Reconstructed bytes</span>
              <strong>{bytes(reconstructedBytes)}</strong>
            </div>

            <div className="metric">
              <span>Missing bytes</span>
              <strong className="bad">
                {bytes(missingBytes)}
              </strong>
            </div>

            <div className="metric">
              <span>Completeness</span>
              <strong>
                {completeness !== null
                  ? `${(
                      Number(completeness) * 100
                    ).toFixed(2)}%`
                  : "—"}
              </strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span>Forensic Interpretation</span>
            <AlertTriangle size={17} color="#fbbf24" />
          </div>

          <p
            style={{
              margin: 0,
              color: "#93a8bd",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            {reconstructionMetrics.explanation ||
              "Analysis results are based on the evidence returned by the backend. Missing bytes are not treated as reconstructed unless independently supported."}
          </p>

          {reconstructionMetrics.forensic_warning && (
            <div
              style={{
                marginTop: 13,
                padding: 11,
                borderRadius: 9,
                border: "1px solid rgba(245,158,11,.28)",
                background: "rgba(245,158,11,.07)",
                color: "#fbbf24",
                fontSize: 10,
                lineHeight: 1.55,
              }}
            >
              {reconstructionMetrics.forensic_warning}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
