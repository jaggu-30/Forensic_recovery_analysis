import React, { useEffect, useState } from "react";
import RecoveryComparison from "../components/evidence/RecoveryComparison";
import {
  Eye,
  GitBranch,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Bot,
  AlertTriangle,
  FileSearch,
  Database,
  Activity,
  FileCheck2,
  HardDrive
} from "lucide-react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import EvidenceCopilot from "../components/evidence/EvidenceCopilot";
import DamageMap from "../components/evidence/DamageMap";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8001";

/* -------------------------------------------------------
   EVIDENCE ID
------------------------------------------------------- */

const getId = () => {
  const q = new URLSearchParams(window.location.search).get("evidenceId");

  return (
    q ||
    localStorage.getItem("recoverai_evidence_id") ||
    localStorage.getItem("currentEvidenceId") ||
    localStorage.getItem("evidenceId") ||
    ""
  );
};

/* -------------------------------------------------------
   API HELPER
------------------------------------------------------- */

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
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

/* -------------------------------------------------------
   FORMATTERS
------------------------------------------------------- */

const bytes = (value) => {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "—";
  }

  if (n < 1024) {
    return `${n} B`;
  }

  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(2)} KB`;
  }

  if (n < 1024 * 1024 * 1024) {
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const number = (value) => {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US").format(n);
};

const pct = (value) => {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "—";
  }

  return `${(n * 100).toFixed(1)}%`;
};

/* -------------------------------------------------------
   STATUS HELPERS
------------------------------------------------------- */

const getStatusTone = (status = "") => {
  const normalized = String(status).toUpperCase();

  if (
    normalized.includes("VERIFIED") ||
    normalized.includes("COMPLETE")
  ) {
    return "success";
  }

  if (
    normalized.includes("INSUFFICIENT") ||
    normalized.includes("FAILED")
  ) {
    return "danger";
  }

  if (
    normalized.includes("PARTIAL") ||
    normalized.includes("REPAIR") ||
    normalized.includes("RECONSTRUCTION")
  ) {
    return "warning";
  }

  return "info";
};

const getPriority = (confidence) => {
  const value = Number(confidence);

  if (!Number.isFinite(value)) {
    return "Unknown";
  }

  if (value >= 0.9) {
    return "High";
  }

  if (value >= 0.7) {
    return "Medium";
  }

  return "Low";
};

/* -------------------------------------------------------
   MAIN PAGE
------------------------------------------------------- */

export default function RecoveredEvidence() {
  const evidenceId = getId();

  const [evidence, setEvidence] = useState(null);
  const [recon, setRecon] = useState(null);
  const [damageMap, setDamageMap] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [copilotOpen, setCopilotOpen] = useState(true);

  /* -----------------------------------------------------
     LOAD REAL BACKEND DATA
  ----------------------------------------------------- */

  const load = async () => {
    if (!evidenceId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      /* -----------------------------------------------
         Evidence metadata
      ------------------------------------------------ */

      const evidenceResponse = await api(
        `/api/evidence/${evidenceId}`
      );

      /* -----------------------------------------------
         Reconstruction
      ------------------------------------------------ */

      const reconstructionResponse = await api(
        `/api/reconstruction/${evidenceId}`,
        {
          method: "POST"
        }
      );

      /* -----------------------------------------------
         Damage map
      ------------------------------------------------ */

      let damageResponse = null;

      try {
        damageResponse = await api(
          `/api/analysis/${evidenceId}/damage-map`
        );
      } catch (damageError) {
        console.warn(
          "Damage map could not be loaded:",
          damageError
        );
      }

      setEvidence(
        evidenceResponse?.evidence ||
          evidenceResponse ||
          null
      );

      setRecon(
        reconstructionResponse?.reconstruction ||
          reconstructionResponse ||
          null
      );

      setDamageMap(
        damageResponse?.damage_map ||
          damageResponse ||
          null
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to load evidence from the RECOVERAI backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [evidenceId]);

  /* -----------------------------------------------------
     NO EVIDENCE
  ----------------------------------------------------- */

  if (!evidenceId) {
    return (
      <div className="recovered-evidence-page">
        <Card>
          <FileSearch size={30} />

          <h2>No Evidence Selected</h2>

          <p>
            Upload an evidence file first. This page reads
            evidence directly from the RECOVERAI FastAPI
            backend.
          </p>

          <button
            className="secondary-btn"
            onClick={() =>
              (window.location.href =
                "/investigation/new")
            }
          >
            Upload Evidence
          </button>
        </Card>
      </div>
    );
  }

  /* -----------------------------------------------------
     NORMALIZED DATA
  ----------------------------------------------------- */

  const e = evidence || {};
  const r = recon || {};

  const status =
    r.status ||
    r.recovery_status ||
    e.status ||
    "ANALYSIS PENDING";

  const confidence = r.recovery_confidence;
  const completeness = r.completeness;

  const priority = getPriority(confidence);

  const fragmentCount =
    r.fragment_count ??
    r.fragments_count ??
    0;

  const missingBytes =
    r.missing_bytes ??
    r.input_missing_bytes ??
    0;

  const verifiedBytes =
    r.verified_bytes ?? 0;

  const reconstructedBytes =
    r.reconstructed_bytes ?? 0;

  const structuralConfidence =
    r.structural_confidence;

  const validationValid =
    r.validation?.valid === true;

  /* -----------------------------------------------------
     DAMAGE INFORMATION
  ----------------------------------------------------- */

  const damageRegions =
    damageMap?.regions ||
    damageMap?.damage_regions ||
    r.missing_regions ||
    r.missingRegions ||
    [];

  const damageRegionCount = Array.isArray(
    damageRegions
  )
    ? damageRegions.length
    : 0;

  const knownMissingBytes =
    damageMap?.known_missing_bytes ??
    damageMap?.missing_bytes ??
    missingBytes ??
    0;

  /* -----------------------------------------------------
     COPILOT CONTEXT
  ----------------------------------------------------- */

  const copilotEvidence = {
    id: e.id || evidenceId,

    name:
      e.original_filename ||
      e.filename ||
      "Evidence",

    type:
      e.evidence_type ||
      e.mime_type ||
      "Unknown",

    status,

    integrity: validationValid
      ? "Valid"
      : "Checked",

    confidence: Number.isFinite(
      Number(confidence)
    )
      ? Math.round(
          Number(confidence) * 100
        )
      : 0,

    fragments: fragmentCount,

    priority
  };

  /* -----------------------------------------------------
     RENDER
  ----------------------------------------------------- */

  return (
    <div className="recovered-evidence-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-intro">

        <div>
          <span className="eyebrow">
            EVIDENCE LIBRARY · LIVE BACKEND
          </span>

          <h2>Recovered Evidence</h2>

          <p>
            Review real recovery, integrity,
            completeness and damage information
            returned by the RECOVERAI backend.
          </p>
        </div>

        <div className="toolbar">

          <button
            className="secondary-btn"
            onClick={() =>
              document
                .getElementById(
                  "recovery-comparison"
                )
                ?.scrollIntoView({
                  behavior: "smooth"
                })
            }
          >
            <FileCheck2 size={16} />
            Recovery Comparison
          </button>

          <button
            className="secondary-btn"
            onClick={() =>
              document
                .getElementById(
                  "live-damage-map"
                )
                ?.scrollIntoView({
                  behavior: "smooth"
                })
            }
          >
            <ScanLine size={16} />
            Damage Map
          </button>

          <button
            className="secondary-btn"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={
                loading ? "spin" : ""
              }
            />

            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

          {!copilotOpen && (
            <button
              className="secondary-btn"
              onClick={() =>
                setCopilotOpen(true)
              }
            >
              <Bot size={16} />
              Evidence AI
            </button>
          )}

        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="error-box">
          <AlertTriangle size={16} />

          <span>{error}</span>
        </div>
      )}

      {/* =================================================
          WORKSPACE
      ================================================= */}

      <div
        className={
          copilotOpen
            ? "evidence-workspace with-copilot"
            : "evidence-workspace"
        }
      >

        <main className="evidence-main">

          {/* =================================================
              EVIDENCE TABLE
          ================================================= */}

          <Card className="table-card">

            <table>

              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Type</th>
                  <th>Recovery</th>
                  <th>Integrity</th>
                  <th>Confidence</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                <tr className="selected-row">

                  <td>
                    <b>
                      {e.original_filename ||
                        e.filename ||
                        "Evidence"}
                    </b>

                    <small>
                      {e.id || evidenceId}
                    </small>
                  </td>

                  <td>
                    {e.evidence_type ||
                      e.mime_type ||
                      "Unknown"}
                  </td>

                  <td>
                    <Badge
                      tone={getStatusTone(
                        status
                      )}
                    >
                      {status}
                    </Badge>
                  </td>

                  <td>
                    {validationValid
                      ? "Valid"
                      : "Checked"}
                  </td>

                  <td>
                    {pct(confidence)}
                  </td>

                  <td>
                    <Badge
                      tone={
                        priority === "High"
                          ? "danger"
                          : priority ===
                            "Medium"
                          ? "warning"
                          : "info"
                      }
                    >
                      {priority}
                    </Badge>
                  </td>

                  <td>

                    <button
                      className="table-action"
                      title="View evidence"
                      onClick={() =>
                        window.scrollTo({
                          top: 0,
                          behavior: "smooth"
                        })
                      }
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      className="table-action"
                      title="Open reconstruction"
                      onClick={() =>
                        (window.location.href =
                          `/reconstruction?evidenceId=${encodeURIComponent(
                            evidenceId
                          )}`)
                      }
                    >
                      <GitBranch size={15} />
                    </button>

                  </td>

                </tr>

              </tbody>

            </table>

          </Card>

          {/* =================================================
              RECOVERY OVERVIEW
          ================================================= */}

          <div className="evidence-detail-grid">

            <Card>

              <div className="card-title">

                <span>
                  Recovery Statistics
                </span>

                <Badge tone="info">
                  REAL BACKEND DATA
                </Badge>

              </div>

              <div className="recovery-stat-grid">

                <div>
                  <small>
                    Evidence size
                  </small>

                  <b>
                    {bytes(
                      e.file_size ??
                        e.size
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    Verified bytes
                  </small>

                  <b>
                    {bytes(
                      verifiedBytes
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    Reconstructed
                  </small>

                  <b>
                    {bytes(
                      reconstructedBytes
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    Missing
                  </small>

                  <b className="danger">
                    {bytes(
                      missingBytes
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    Completeness
                  </small>

                  <b>
                    {pct(completeness)}
                  </b>
                </div>

                <div>
                  <small>
                    Structural confidence
                  </small>

                  <b>
                    {pct(
                      structuralConfidence
                    )}
                  </b>
                </div>

                <div>
                  <small>
                    Recovery confidence
                  </small>

                  <b>
                    {pct(confidence)}
                  </b>
                </div>

                <div>
                  <small>
                    Fragments
                  </small>

                  <b>
                    {number(
                      fragmentCount
                    )}
                  </b>
                </div>

              </div>

            </Card>

            {/* =================================================
                SIDE INFORMATION
            ================================================= */}

            <div className="side-stack">

              <Card>

                <div className="card-title">
                  Evidence DNA
                </div>

                <div className="dna">

                  <ShieldCheck size={32} />

                  <div>

                    <b>
                      {e.original_filename ||
                        e.filename ||
                        "Evidence"}
                    </b>

                    <span>
                      {e.evidence_type ||
                        e.mime_type ||
                        "Unknown"}

                      {" · "}

                      {number(
                        fragmentCount
                      )}

                      {" fragments"}
                    </span>

                  </div>

                </div>

                <div className="hash">
                  SHA-256 ·{" "}
                  {e.sha256 ||
                    "Not available"}
                </div>

                <div className="metric-line">
                  <span>
                    Completeness
                  </span>

                  <b>
                    {pct(completeness)}
                  </b>
                </div>

                <div className="metric-line">
                  <span>
                    Recovery confidence
                  </span>

                  <b>
                    {pct(confidence)}
                  </b>
                </div>

              </Card>

              <Card>

                <div className="card-title">
                  Provenance
                </div>

                <div className="provenance">

                  {[
                    "Original Evidence",
                    "Storage Block",
                    "Fragment",
                    "Reconstruction",
                    "Validation",
                    "Confidence",
                    "Final Evidence"
                  ].map(
                    (label, index) => (
                      <div
                        key={label}
                      >
                        <i />

                        {label}

                        {index < 6 && (
                          <span>
                            ›
                          </span>
                        )}
                      </div>
                    )
                  )}

                </div>

              </Card>

            </div>

          </div>

          {/* =================================================
              FORENSIC CLASSIFICATION
          ================================================= */}

          <Card>

            <div className="card-title">
              <span>
                Forensic Assessment
              </span>

              <Badge
                tone={getStatusTone(
                  status
                )}
              >
                {status}
              </Badge>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: "12px"
              }}
            >

              <div className="metric-line">
                <span>
                  Structural validity
                </span>

                <b>
                  {validationValid
                    ? "VALID"
                    : "CHECKED"}
                </b>
              </div>

              <div className="metric-line">
                <span>
                  Verified bytes
                </span>

                <b>
                  {bytes(
                    verifiedBytes
                  )}
                </b>
              </div>

              <div className="metric-line">
                <span>
                  Reconstructed bytes
                </span>

                <b>
                  {bytes(
                    reconstructedBytes
                  )}
                </b>
              </div>

              <div className="metric-line">
                <span>
                  Missing bytes
                </span>

                <b className="danger">
                  {bytes(
                    missingBytes
                  )}
                </b>
              </div>

            </div>

            <div className="forensic-note">
              <AlertTriangle size={15} />

              <span>
                RECOVERAI distinguishes
                verified recovery from
                structural repair and
                reconstruction. Missing
                bytes are not represented
                as recovered unless the
                backend verifies them.
              </span>
            </div>

          </Card>

          {/* =================================================
              RECOVERY COMPARISON
          ================================================= */}

          <section
            id="recovery-comparison"
            style={{ marginTop: "20px" }}
          >

            <div className="section-heading">

              <div>

                <span className="eyebrow">
                  RECOVERY VALIDATION
                </span>

                <h3>
                  Recovery Comparison
                </h3>

                <p>
                  Compare the actual evidence
                  state with the backend
                  reconstruction result.
                </p>

              </div>

            </div>

            <RecoveryComparison
              evidenceId={evidenceId}
            />

          </section>

          {/* =================================================
              DAMAGE MAP
          ================================================= */}

          <section
            id="live-damage-map"
            style={{ marginTop: "20px" }}
          >

            <div className="section-heading">

              <div>

                <span className="eyebrow">
                  LIVE FORENSIC ANALYSIS
                </span>

                <h3>
                  Damage Map
                </h3>

                <p>
                  Loaded using the selected
                  evidence ID.
                </p>

              </div>

            </div>

            <DamageMap
              evidenceId={evidenceId}
            />

          </section>

          {/* =================================================
              DAMAGE SUMMARY
          ================================================= */}

          <Card>

            <div className="card-title">

              <span>
                Damage Summary
              </span>

              <Badge tone="warning">
                BACKEND ANALYSIS
              </Badge>

            </div>

            <div className="recovery-stat-grid">

              <div>
                <small>
                  Damage regions
                </small>

                <b>
                  {number(
                    damageRegionCount
                  )}
                </b>
              </div>

              <div>
                <small>
                  Known missing bytes
                </small>

                <b className="danger">
                  {bytes(
                    knownMissingBytes
                  )}
                </b>
              </div>

              <div>
                <small>
                  Observed bytes
                </small>

                <b>
                  {bytes(
                    r.observed_bytes ??
                      e.file_size ??
                      e.size
                  )}
                </b>
              </div>

              <div>
                <small>
                  Reconstructed bytes
                </small>

                <b>
                  {bytes(
                    reconstructedBytes
                  )}
                </b>
              </div>

            </div>

            {r.missing_region_source ===
              "GROUND_TRUTH" && (
              <div className="forensic-note">
                <AlertTriangle
                  size={15}
                />

                <span>
                  The damaged region is
                  associated with controlled
                  benchmark ground truth.
                  This must not be presented
                  as an independently inferred
                  forensic finding.
                </span>
              </div>
            )}

          </Card>

        </main>

        {/* =================================================
            EVIDENCE COPILOT
        ================================================= */}

        {copilotOpen && (
          <EvidenceCopilot
            evidence={
              copilotEvidence
            }
            recoverySummary={{
              completeness:
                Number.isFinite(
                  Number(
                    completeness
                  )
                )
                  ? Math.round(
                      Number(
                        completeness
                      ) * 100
                    )
                  : 0,

              structural:
                Number.isFinite(
                  Number(
                    structuralConfidence
                  )
                )
                  ? Math.round(
                      Number(
                        structuralConfidence
                      ) * 100
                    )
                  : 0,

              confidence:
                Number.isFinite(
                  Number(
                    confidence
                  )
                )
                  ? Math.round(
                      Number(
                        confidence
                      ) * 100
                    )
                  : 0,

              verifiedBytes:
                verifiedBytes,

              reconstructedBytes:
                reconstructedBytes,

              missingBytes:
                missingBytes,

              fragmentCount:
                fragmentCount,

              damageRegionCount:
                damageRegionCount
            }}
            onClose={() =>
              setCopilotOpen(false)
            }
          />
        )}

      </div>

    </div>
  );
}