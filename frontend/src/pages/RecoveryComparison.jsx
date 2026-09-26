import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FileSearch,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

function getEvidenceId() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get("evidenceId") ||
    localStorage.getItem("recoverai_evidence_id") ||
    localStorage.getItem("currentEvidenceId") ||
    ""
  );
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();

  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail?.error ||
        data?.detail ||
        data?.error ||
        `HTTP ${response.status}`
    );
  }

  return data;
}

function bytes(value) {
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

  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RecoveryComparison({
  evidenceId: propEvidenceId,
}) {
  const evidenceId = propEvidenceId || getEvidenceId();

  const [evidence, setEvidence] = useState({});
  const [reconstruction, setReconstruction] = useState({});
  const [loading, setLoading] = useState(false);

  const [sourceReady, setSourceReady] = useState(false);
  const [sourceFailed, setSourceFailed] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");

  const [sourceRefresh, setSourceRefresh] = useState(Date.now());
  const [outputRefresh, setOutputRefresh] = useState(Date.now());

  const filename = useMemo(
    () =>
      evidence.original_filename ||
      evidence.filename ||
      "Evidence",
    [evidence]
  );

  const mimeType = useMemo(
    () =>
      evidence.mime_type ||
      evidence.evidence_type ||
      "Unknown",
    [evidence]
  );

  const isImage = useMemo(() => {
    return (
      String(mimeType).toLowerCase().includes("image") ||
      /\.(png|jpe?g|webp|bmp)$/i.test(filename)
    );
  }, [mimeType, filename]);

  const sourceImageUrl = useMemo(() => {
    if (!evidenceId || !isImage) {
      return "";
    }

    return `${API}/api/ai-reconstruction/${evidenceId}/source-image?t=${sourceRefresh}`;
  }, [evidenceId, isImage, sourceRefresh]);

  const aiImageUrl = useMemo(() => {
    if (!aiResult?.success || !aiResult?.output_url) {
      return "";
    }

    const separator = aiResult.output_url.includes("?")
      ? "&"
      : "?";

    return `${API}${aiResult.output_url}${separator}t=${outputRefresh}`;
  }, [aiResult, outputRefresh]);

  async function loadEvidence() {
    if (!evidenceId) {
      return;
    }

    setLoading(true);
    setAiError("");
    setSourceFailed(false);
    setSourceReady(false);

    try {
      const [evidenceResponse, reconstructionResponse] =
        await Promise.all([
          api(`/api/evidence/${evidenceId}`),
          api(`/api/reconstruction/${evidenceId}`, {
            method: "POST",
          }),
        ]);

      setEvidence(
        evidenceResponse?.evidence ||
          evidenceResponse ||
          {}
      );

      setReconstruction(
        reconstructionResponse?.reconstruction ||
          reconstructionResponse ||
          {}
      );

      setSourceRefresh(Date.now());
    } catch (error) {
      setAiError(
        error.message ||
          "Unable to load the selected evidence."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setEvidence({});
    setReconstruction({});
    setAiResult(null);
    setAiError("");
    setSourceReady(false);
    setSourceFailed(false);

    loadEvidence();
  }, [evidenceId]);

  async function runAIRecovery() {
    if (!evidenceId || !isImage) {
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiResult(null);

    try {
      const result = await api(
        `/api/ai-reconstruction/${evidenceId}`,
        {
          method: "POST",
        }
      );

      if (!result?.success || !result?.output_url) {
        throw new Error(
          result?.error ||
            "The AI reconstruction did not return an image."
        );
      }

      setAiResult(result);
      setOutputRefresh(Date.now());
    } catch (error) {
      setAiError(
        error.message ||
          "AI recovery failed."
      );
    } finally {
      setAiLoading(false);
    }
  }

  if (!evidenceId) {
    return (
      <section className="rc-page">
        <style>{styles}</style>

        <div className="rc-empty">
          <FileSearch size={34} />
          <h2>No Evidence Selected</h2>
          <p>
            Select an evidence item before opening
            Recovery Comparison.
          </p>
        </div>
      </section>
    );
  }

  const observedSize =
    reconstruction.observed_bytes ??
    evidence.file_size ??
    0;

  const recoveryStatus =
    reconstruction.status ||
    reconstruction.recovery_status ||
    "READY";

  return (
    <section className="rc-page">
      <style>{styles}</style>

      <div className="rc-top">
        <div>
          <div className="rc-kicker">
            FORENSIC VISUAL VALIDATION
          </div>

          <h2>Recovery Comparison</h2>

          <p>
            Compare the actual uploaded evidence with the
            reconstructed result.
          </p>
        </div>
      </div>

      {aiError && (
        <div className="rc-error">
          <AlertTriangle size={15} />
          <span>{aiError}</span>
        </div>
      )}

      <div className="rc-meta">
        <span className="rc-chip">
          {filename}
        </span>

        <span className="rc-chip">
          {bytes(observedSize)}
        </span>

        <span className="rc-chip">
          {recoveryStatus}
        </span>
      </div>

      <div className="rc-comparison">
        {/* INPUT */}
        <div className="rc-panel">
          <div className="rc-panel-head input">
            <span className="rc-dot red" />
            CORRUPTED INPUT
          </div>

          <div className="rc-image-area">
            {isImage && sourceImageUrl && !sourceFailed ? (
              <img
                src={sourceImageUrl}
                alt={`Corrupted evidence: ${filename}`}
                className="rc-image"
                onLoad={() => setSourceReady(true)}
                onError={() => {
                  setSourceReady(false);
                  setSourceFailed(true);
                }}
              />
            ) : (
              <div className="rc-placeholder">
                <FileSearch size={44} />

                <strong>
                  {filename}
                </strong>

                <span>
                  {mimeType}
                </span>

                <small>
                  {bytes(observedSize)}
                </small>
              </div>
            )}

            <div className="rc-image-label">
              {sourceReady
                ? "ACTUAL UPLOADED IMAGE"
                : "INPUT EVIDENCE"}
            </div>
          </div>
        </div>

        {/* CONNECTOR */}
        <div className="rc-middle">
          <div className="rc-arrow-circle">
            →
          </div>

          <span>RECOVERAI</span>

          <div className="rc-line" />
        </div>

        {/* OUTPUT */}
        <div className="rc-panel output">
          <div className="rc-panel-head output-head">
            <span className="rc-dot green" />
            RECOVERY RESULT
          </div>

          <div className="rc-image-area output-area">
            {aiImageUrl ? (
              <img
                src={aiImageUrl}
                alt="RECOVERAI reconstructed result"
                className="rc-image"
              />
            ) : (
              <div className="rc-placeholder">
                <Sparkles size={44} />

                <strong>
                  READY FOR RECOVERY
                </strong>

                <span>
                  Run AI Recovery to generate
                  the reconstructed image.
                </span>
              </div>
            )}

            <div className="rc-image-label output-label">
              {aiImageUrl
                ? "GENERATED RECOVERY OUTPUT"
                : "RECOVERY RESULT"}
            </div>
          </div>

          <div className="rc-output-action">
            <button
              type="button"
              className="rc-run-button"
              onClick={runAIRecovery}
              disabled={
                aiLoading ||
                loading ||
                !isImage
              }
            >
              {aiLoading ? (
                <>
                  <span className="rc-spinner" />
                  RECONSTRUCTING...
                </>
              ) : aiImageUrl ? (
                <>
                  <CheckCircle2 size={15} />
                  RUN AGAIN
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  RUN AI RECOVERY
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = `
.rc-page{
  width:100%;
  max-width:1220px;
  margin:0 auto;
  padding:8px 0 30px;
  color:#e6f1f8;
}

.rc-page *{
  box-sizing:border-box;
}

.rc-top{
  margin-bottom:14px;
}

.rc-kicker{
  color:#59c7ff;
  font-size:9px;
  font-weight:900;
  letter-spacing:.16em;
  margin-bottom:6px;
}

.rc-top h2{
  margin:0;
  color:#f4f8fb;
  font-size:24px;
  font-weight:800;
}

.rc-top p{
  margin:7px 0 0;
  color:#7890a4;
  font-size:10px;
}

.rc-error{
  display:flex;
  align-items:center;
  gap:8px;
  padding:10px 12px;
  margin-bottom:12px;
  border:1px solid #693840;
  border-radius:8px;
  background:#241115;
  color:#ff9c9c;
  font-size:9px;
}

.rc-meta{
  display:flex;
  gap:7px;
  flex-wrap:wrap;
  margin-bottom:12px;
}

.rc-chip{
  padding:6px 9px;
  border:1px solid #1b4058;
  border-radius:999px;
  background:#071623;
  color:#8da8bb;
  font-size:8px;
  font-weight:800;
}

.rc-comparison{
  display:grid;
  grid-template-columns:minmax(0,1fr) 82px minmax(0,1fr);
  gap:10px;
  align-items:stretch;
}

.rc-panel{
  min-width:0;
  overflow:hidden;
  border:1px solid #193b53;
  border-radius:10px;
  background:#071522;
}

.rc-panel.output{
  border-color:#1b4d3a;
}

.rc-panel-head{
  display:flex;
  align-items:center;
  gap:7px;
  height:39px;
  padding:0 12px;
  border-bottom:1px solid #17364d;
  color:#a5b9c8;
  font-size:8px;
  font-weight:900;
  letter-spacing:.08em;
}

.rc-panel-head.output-head{
  border-bottom-color:#214936;
}

.rc-dot{
  width:7px;
  height:7px;
  border-radius:50%;
  flex:0 0 auto;
}

.rc-dot.red{
  background:#ff667d;
  box-shadow:0 0 8px rgba(255,102,125,.4);
}

.rc-dot.green{
  background:#45e39a;
  box-shadow:0 0 8px rgba(69,227,154,.35);
}

.rc-image-area{
  position:relative;
  min-height:480px;
  display:grid;
  place-items:center;
  padding:12px;
  background:#040d15;
}

.rc-image{
  width:100%;
  height:455px;
  object-fit:contain;
  display:block;
  border-radius:7px;
  background:#01060b;
}

.rc-image-label{
  position:absolute;
  top:10px;
  left:10px;
  padding:5px 7px;
  border:1px solid rgba(255,95,116,.28);
  border-radius:5px;
  background:rgba(9,18,28,.92);
  color:#ff8c9d;
  font-size:7px;
  font-weight:900;
}

.output-label{
  border-color:rgba(76,220,157,.25);
  color:#72e8b2;
}

.rc-placeholder{
  text-align:center;
  width:min(80%,320px);
  color:#3f718e;
}

.rc-placeholder svg{
  margin-bottom:10px;
}

.rc-placeholder strong{
  display:block;
  color:#d8e7ef;
  font-size:12px;
}

.rc-placeholder span{
  display:block;
  margin-top:6px;
  color:#647f92;
  font-size:9px;
  line-height:1.5;
}

.rc-placeholder small{
  display:block;
  margin-top:8px;
  color:#4e697b;
  font-size:8px;
}

.rc-middle{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:8px;
  color:#4f7188;
}

.rc-middle span{
  writing-mode:vertical-rl;
  font-size:7px;
  font-weight:900;
  letter-spacing:.13em;
}

.rc-line{
  width:1px;
  flex:1;
  max-height:120px;
  background:linear-gradient(
    180deg,
    transparent,
    #1d5573,
    transparent
  );
}

.rc-arrow-circle{
  width:42px;
  height:42px;
  display:grid;
  place-items:center;
  border:1px solid #276383;
  border-radius:50%;
  background:#071a28;
  color:#58c9ff;
  font-size:21px;
  font-weight:700;
  box-shadow:0 0 18px rgba(44,171,230,.12);
}

.rc-output-action{
  display:flex;
  justify-content:center;
  padding:10px;
  border-top:1px solid #214936;
  background:#06120e;
}

.rc-run-button{
  min-width:180px;
  min-height:34px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  border:1px solid #2c83b0;
  border-radius:7px;
  background:#0b2e43;
  color:#dff4ff;
  font-size:9px;
  font-weight:900;
  cursor:pointer;
}

.rc-run-button:hover{
  background:#0d3c56;
}

.rc-run-button:disabled{
  opacity:.55;
  cursor:not-allowed;
}

.rc-spinner{
  width:13px;
  height:13px;
  border:2px solid rgba(255,255,255,.22);
  border-top-color:#59c7ff;
  border-radius:50%;
  animation:rcSpin .8s linear infinite;
}

@keyframes rcSpin{
  to{
    transform:rotate(360deg);
  }
}

.rc-empty{
  min-height:280px;
  display:grid;
  place-items:center;
  align-content:center;
  gap:8px;
  border:1px dashed #24455c;
  border-radius:10px;
  background:#071522;
  color:#678197;
}

.rc-empty h2{
  margin:8px 0 0;
  color:#dceaf2;
  font-size:18px;
}

.rc-empty p{
  margin:0;
  font-size:9px;
}

@media(max-width:980px){
  .rc-comparison{
    grid-template-columns:1fr;
  }

  .rc-middle{
    flex-direction:row;
    height:62px;
  }

  .rc-middle span{
    writing-mode:horizontal-tb;
  }

  .rc-line{
    width:100%;
    height:1px;
    max-height:none;
  }

  .rc-arrow-circle{
    flex:0 0 auto;
  }
}

@media(max-width:650px){
  .rc-image-area{
    min-height:330px;
  }

  .rc-image{
    height:305px;
  }

  .rc-top h2{
    font-size:20px;
  }
}
`;