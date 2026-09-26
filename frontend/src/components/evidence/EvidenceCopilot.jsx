import React, { useEffect, useMemo, useState } from "react";
import {
  Bot,
  ChevronRight,
  FileSearch,
  LoaderCircle,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Database,
  AlertTriangle,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8001";

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
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
        `HTTP ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   NORMALIZE BACKEND DATA
========================================================= */

function normalizeEvidence(data) {
  const e = data?.evidence || data || {};

  return {
    id: e.id || e.evidence_id || "",
    name:
      e.original_filename ||
      e.filename ||
      "Evidence",
    type:
      e.evidence_type ||
      e.mime_type ||
      "Unknown",
    status:
      e.status ||
      e.recovery_status ||
      "ANALYSIS AVAILABLE",
    confidence:
      e.recovery_confidence ??
      e.confidence ??
      0,
    integrity:
      e.integrity ||
      e.integrity_status ||
      "NOT AVAILABLE",
    fragments:
      e.fragment_count ??
      e.fragments_count ??
      e.fragments ??
      0,
    priority:
      e.priority ||
      "NOT ASSIGNED",
    size:
      e.file_size ??
      e.size ??
      0,
    sha256:
      e.sha256 ||
      e.hash ||
      "",
  };
}

function normalizeRecovery(data) {
  const r =
    data?.reconstruction ||
    data ||
    {};

  return {
    status:
      r.status ||
      r.recovery_status ||
      "ANALYSIS AVAILABLE",

    completeness:
      r.completeness ??
      0,

    structural:
      r.structural_confidence ??
      0,

    confidence:
      r.recovery_confidence ??
      0,

    verified:
      r.verified_bytes ??
      0,

    reconstructed:
      r.reconstructed_bytes ??
      0,

    missing:
      r.missing_bytes ??
      0,

    fragments:
      r.fragment_count ??
      0,

    validation:
      r.validation || {},
  };
}

function normalizeDamage(data) {
  const d =
    data?.damage_map ||
    data ||
    {};

  return {
    observed:
      d.observed_bytes ??
      0,

    original:
      d.estimated_original_size ??
      0,

    missing:
      d.known_missing_bytes ??
      d.missing_bytes ??
      0,

    completeness:
      d.completeness ??
      0,

    regions:
      Array.isArray(d.regions)
        ? d.regions
        : [],

    warning:
      d.forensic_warning ||
      "",

    source:
      d.evidence_basis ||
      "",
  };
}

/* =========================================================
   FORMATTERS
========================================================= */

function pct(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "—";
  }

  return `${(n * 100).toFixed(2)}%`;
}

function bytes(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "—";
  }

  if (n < 1024) {
    return `${n} B`;
  }

  if (n < 1048576) {
    return `${(n / 1024).toFixed(2)} KB`;
  }

  return `${(n / 1048576).toFixed(2)} MB`;
}

/* =========================================================
   GROUNDED ANSWER ENGINE
========================================================= */

function buildAnswer(
  question,
  evidence,
  recovery,
  damage
) {
  const q =
    question.toLowerCase();

  if (
    q.includes("confidence") ||
    q.includes("why") ||
    q.includes("recovery confidence")
  ) {
    return {
      title:
        "Recovery confidence analysis",

      text:
        `${evidence.name} currently has a recovery confidence of ${pct(
          recovery.confidence
        )}. The backend classifies the result as "${recovery.status}". Confidence should be interpreted together with structural validation, completeness, and the amount of verified evidence.`,

      points: [
        `Evidence ID: ${evidence.id}`,
        `Recovery status: ${recovery.status}`,
        `Recovery confidence: ${pct(
          recovery.confidence
        )}`,
        `Structural confidence: ${pct(
          recovery.structural
        )}`,
        `Completeness: ${pct(
          recovery.completeness
        )}`,
        `Verified bytes: ${bytes(
          recovery.verified
        )}`,
      ],
    };
  }

  if (
    q.includes("fragment") ||
    q.includes("pieces") ||
    q.includes("parts")
  ) {
    return {
      title:
        "Fragment analysis",

      text:
        `${evidence.name} is associated with ${recovery.fragments || evidence.fragments} fragments in the current backend analysis. Fragment relationships should be interpreted using observed structural signals such as offsets, signatures, adjacency and compatibility. A relationship score is not proof that two fragments originally belonged together.`,

      points: [
        `Evidence: ${evidence.name}`,
        `Fragments detected: ${
          recovery.fragments ||
          evidence.fragments
        }`,
        `File type: ${evidence.type}`,
        "Relationship interpretation: backend-derived",
      ],
    };
  }

  if (
    q.includes("missing") ||
    q.includes("incomplete") ||
    q.includes("completeness")
  ) {
    return {
      title:
        "Missing and incomplete data",

      text:
        `The current recovery assessment reports ${pct(
          recovery.completeness
        )} completeness. Missing bytes and reconstructed bytes remain separate from verified bytes. The system does not treat missing data as recovered unless independent evidence supports reconstruction.`,

      points: [
        `Completeness: ${pct(
          recovery.completeness
        )}`,
        `Verified bytes: ${bytes(
          recovery.verified
        )}`,
        `Reconstructed bytes: ${bytes(
          recovery.reconstructed
        )}`,
        `Missing bytes: ${bytes(
          recovery.missing
        )}`,
      ],
    };
  }

  if (
    q.includes("integrity") ||
    q.includes("structural") ||
    q.includes("valid")
  ) {
    return {
      title:
        "Integrity assessment",

      text:
        `${evidence.name} currently has a structural/integrity assessment of "${evidence.integrity}". Structural validity does not by itself establish byte-for-byte equivalence with the original evidence.`,

      points: [
        `Evidence ID: ${evidence.id}`,
        `Integrity: ${evidence.integrity}`,
        `Recovery status: ${recovery.status}`,
        `Structural confidence: ${pct(
          recovery.structural
        )}`,
        "Original equivalence requires appropriate comparison evidence.",
      ],
    };
  }

  if (
    q.includes("damage") ||
    q.includes("corrupt") ||
    q.includes("corruption")
  ) {
    return {
      title:
        "Damage assessment",

      text:
        `The current backend damage map contains ${damage.regions.length} recorded damage region(s). ${bytes(
          damage.missing
        )} bytes are currently represented as missing by the recovery assessment.`,

      points: [
        `Observed bytes: ${bytes(
          damage.observed
        )}`,
        `Estimated original size: ${bytes(
          damage.original
        )}`,
        `Known missing bytes: ${bytes(
          damage.missing
        )}`,
        `Damage regions: ${damage.regions.length}`,
        damage.source
          ? `Evidence basis: ${damage.source}`
          : "Evidence basis: backend analysis",
      ],
    };
  }

  if (
    q.includes("priority") ||
    q.includes("important") ||
    q.includes("investigate")
  ) {
    return {
      title:
        "Evidence priority",

      text:
        `${evidence.name} currently has a priority classification of "${evidence.priority}". This classification concerns recovery-related characteristics and should not be interpreted as a statement of legal importance.`,

      points: [
        `Current priority: ${evidence.priority}`,
        `Recovery confidence: ${pct(
          recovery.confidence
        )}`,
        `Integrity: ${evidence.integrity}`,
        `Recovery status: ${recovery.status}`,
      ],
    };
  }

  if (
    q.includes("reconstruct") ||
    q.includes("reconstruction")
  ) {
    return {
      title:
        "Reconstruction assessment",

      text:
        `The backend currently reports "${recovery.status}". ${bytes(
          recovery.reconstructed
        )} bytes are classified as reconstructed, while ${bytes(
          recovery.verified
        )} bytes are verified and ${bytes(
          recovery.missing
        )} bytes remain missing.`,

      points: [
        `Recovery status: ${recovery.status}`,
        `Verified: ${bytes(
          recovery.verified
        )}`,
        `Reconstructed: ${bytes(
          recovery.reconstructed
        )}`,
        `Missing: ${bytes(
          recovery.missing
        )}`,
        `Completeness: ${pct(
          recovery.completeness
        )}`,
      ],
    };
  }

  if (
    q.includes("explain") ||
    q.includes("details") ||
    q.includes("about")
  ) {
    return {
      title:
        `Evidence details — ${evidence.name}`,

      text:
        `${evidence.name} is a ${evidence.type} evidence item identified by ${evidence.id}. The backend currently classifies it as "${recovery.status}".`,

      points: [
        `Filename: ${evidence.name}`,
        `Evidence ID: ${evidence.id}`,
        `Type: ${evidence.type}`,
        `Fragments: ${evidence.fragments}`,
        `Recovery: ${recovery.status}`,
        `Integrity: ${evidence.integrity}`,
        `Recovery confidence: ${pct(
          recovery.confidence
        )}`,
        `Priority: ${evidence.priority}`,
      ],
    };
  }

  return {
    title:
      "Evidence-grounded response",

    text:
      `I can currently answer using the recovery metadata available for ${evidence.name}. The question does not map to a supported forensic query, so I will not infer an unsupported conclusion.`,

    points: [
      `Selected evidence: ${evidence.name}`,
      `Evidence ID: ${evidence.id}`,
      `Type: ${evidence.type}`,
      `Status: ${recovery.status}`,
      "INSUFFICIENT EVIDENCE for unsupported conclusions",
    ],
  };
}

/* =========================================================
   INITIAL MESSAGE
========================================================= */

function initialMessage(
  evidence,
  recovery
) {
  return {
    role: "assistant",

    title:
      "Evidence Copilot ready",

    text:
      `I am analyzing ${evidence.name} using the current RECOVERAI backend evidence. Ask me about recovery confidence, fragments, damage, reconstruction, integrity, missing data or evidence priority.`,

    points: [
      `Selected evidence: ${evidence.id}`,
      `Recovery: ${recovery.status}`,
      `Confidence: ${pct(
        recovery.confidence
      )}`,
    ],
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function EvidenceCopilot({
  evidence,
  recoverySummary,
  onClose,
}) {
  const normalizedEvidence =
    useMemo(
      () =>
        normalizeEvidence(
          evidence
        ),
      [evidence]
    );

  const normalizedRecovery =
    useMemo(
      () =>
        normalizeRecovery(
          recoverySummary
        ),
      [recoverySummary]
    );

  const [
    damage,
    setDamage,
  ] = useState({
    regions: [],
    missing: 0,
    completeness: 0,
  });

  const [
    backendLoading,
    setBackendLoading,
  ] = useState(false);

  const [
    backendError,
    setBackendError,
  ] = useState("");

  const [
    question,
    setQuestion,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  /* =====================================================
     LOAD DAMAGE MAP
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadDamage() {
      if (!normalizedEvidence.id) {
        return;
      }

      setBackendLoading(true);
      setBackendError("");

      try {
        const result =
          await api(
            `/api/analysis/${normalizedEvidence.id}/damage-map`
          );

        if (!cancelled) {
          setDamage(
            normalizeDamage(result)
          );
        }
      } catch (error) {
        if (!cancelled) {
          setBackendError(
            error?.message ||
              "Damage data unavailable."
          );
        }
      } finally {
        if (!cancelled) {
          setBackendLoading(false);
        }
      }
    }

    loadDamage();

    return () => {
      cancelled = true;
    };
  }, [normalizedEvidence.id]);

  /* =====================================================
     RESET CONTEXT
  ===================================================== */

  useEffect(() => {
    setMessages([
      initialMessage(
        normalizedEvidence,
        normalizedRecovery
      ),
    ]);

    setQuestion("");
    setLoading(false);
  }, [
    normalizedEvidence.id,
    normalizedEvidence.name,
    normalizedEvidence.type,
    normalizedRecovery.status,
    normalizedRecovery.confidence,
    normalizedRecovery.completeness,
    normalizedEvidence.integrity,
    normalizedEvidence.fragments,
  ]);

  /* =====================================================
     SUGGESTIONS
  ===================================================== */

  const suggestions = useMemo(
    () => [
      `Why is the recovery confidence ${pct(
        normalizedRecovery.confidence
      )}?`,

      `Explain the fragments`,

      "What data is missing?",

      "Explain the damage",

      "Explain the integrity result",

      "Explain the reconstruction",
    ],
    [
      normalizedRecovery.confidence,
    ]
  );

  /* =====================================================
     ASK
  ===================================================== */

  const askQuestion = async (
    value = question
  ) => {
    const trimmed =
      value.trim();

    if (
      !trimmed ||
      loading ||
      backendLoading
    ) {
      return;
    }

    setMessages((previous) => [
      ...previous,

      {
        role: "user",
        text: trimmed,
      },
    ]);

    setQuestion("");
    setLoading(true);

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 350)
    );

    const answer =
      buildAnswer(
        trimmed,
        normalizedEvidence,
        normalizedRecovery,
        damage
      );

    setMessages((previous) => [
      ...previous,

      {
        role: "assistant",
        ...answer,
      },
    ]);

    setLoading(false);
  };

  return (
    <>
      <style>{styles}</style>

      <aside className="evidence-copilot">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="copilot-header">

          <div className="copilot-title">

            <div className="copilot-icon">
              <Bot size={19} />
            </div>

            <div>
              <strong>
                Evidence Copilot
              </strong>

              <span>
                <i />

                {backendLoading
                  ? "Loading evidence"
                  : "Grounded in current evidence"}
              </span>
            </div>

          </div>

          {onClose && (
            <button
              className="copilot-close"
              onClick={onClose}
              type="button"
              aria-label="Close Evidence Copilot"
            >
              <X size={17} />
            </button>
          )}

        </div>

        {/* =================================================
            CONTEXT
        ================================================= */}

        <div className="copilot-context">

          <div className="context-file">

            <FileSearch size={16} />

            <div>

              <strong>
                {normalizedEvidence.name}
              </strong>

              <span>
                {normalizedEvidence.id}
                {" · "}
                {normalizedEvidence.type}
              </span>

            </div>

          </div>

          <div className="context-confidence">

            <span>
              CONFIDENCE
            </span>

            <strong>
              {pct(
                normalizedRecovery.confidence
              )}
            </strong>

          </div>

        </div>

        {/* =================================================
            FORENSIC STATUS
        ================================================= */}

        <div className="copilot-forensic-strip">

          <span>
            STATUS
          </span>

          <b>
            {normalizedRecovery.status}
          </b>

          <span>
            VERIFIED
          </span>

          <b>
            {bytes(
              normalizedRecovery.verified
            )}
          </b>

          <span>
            MISSING
          </span>

          <b className="danger-text">
            {bytes(
              normalizedRecovery.missing
            )}
          </b>

        </div>

        {/* =================================================
            BACKEND ERROR
        ================================================= */}

        {backendError && (
          <div className="copilot-warning">
            <AlertTriangle size={13} />

            <span>
              Damage map unavailable:
              {" "}
              {backendError}
            </span>
          </div>
        )}

        {/* =================================================
            MESSAGES
        ================================================= */}

        <div className="copilot-messages">

          {messages.map(
            (message, index) => (

              <div
                className={`copilot-message ${message.role}`}
                key={`${message.role}-${index}`}
              >

                <div className="message-avatar">

                  {message.role ===
                  "assistant" ? (
                    <Bot size={14} />
                  ) : (
                    <User size={14} />
                  )}

                </div>

                <div className="message-body">

                  {message.title && (
                    <strong className="message-title">
                      {message.title}
                    </strong>
                  )}

                  <p>
                    {message.text}
                  </p>

                  {message.points?.length >
                    0 && (

                    <div className="evidence-support">

                      <div className="support-heading">
                        <ShieldCheck size={13} />
                        Supporting evidence
                      </div>

                      {message.points.map(
                        (
                          point,
                          pointIndex
                        ) => (

                          <div
                            className="support-item"
                            key={
                              pointIndex
                            }
                          >

                            <ChevronRight
                              size={12}
                            />

                            <span>
                              {point}
                            </span>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              </div>

            )
          )}

          {loading && (
            <div className="copilot-message assistant">

              <div className="message-avatar">
                <Bot size={14} />
              </div>

              <div className="message-body">

                <div className="copilot-thinking">

                  <LoaderCircle
                    size={14}
                    className="spin"
                  />

                  Analyzing evidence...

                </div>

              </div>

            </div>
          )}

        </div>

        {/* =================================================
            SUGGESTIONS
        ================================================= */}

        <div className="copilot-suggestions">

          <div className="suggestion-heading">

            <Sparkles size={13} />

            Suggested questions

          </div>

          {suggestions.map(
            (suggestion) => (

              <button
                key={suggestion}
                onClick={() =>
                  askQuestion(
                    suggestion
                  )
                }
                disabled={
                  loading ||
                  backendLoading
                }
                type="button"
              >
                {suggestion}
              </button>

            )
          )}

        </div>

        {/* =================================================
            INPUT
        ================================================= */}

        <div className="copilot-input-area">

          <div className="copilot-input">

            <input
              value={question}
              onChange={(e) =>
                setQuestion(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  askQuestion();
                }
              }}
              placeholder="Ask about this evidence..."
              disabled={
                loading ||
                backendLoading
              }
            />

            <button
              onClick={() =>
                askQuestion()
              }
              disabled={
                !question.trim() ||
                loading ||
                backendLoading
              }
              title="Ask Evidence Copilot"
              type="button"
            >
              <Send size={16} />
            </button>

          </div>

          <small>
            Responses are grounded in
            available evidence. Unsupported
            conclusions are returned as
            insufficient evidence.
          </small>

        </div>

      </aside>
    </>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = `
.evidence-copilot{
  width:100%;
  min-width:0;
  position:sticky;
  top:18px;
  overflow:hidden;
  border:1px solid #1b3852;
  border-radius:14px;
  background:linear-gradient(
    180deg,
    #081522,
    #06111d
  );
  color:#dbe9f5;
  box-shadow:
    0 16px 40px rgba(0,0,0,.28);
}

.evidence-copilot *{
  box-sizing:border-box;
}

.evidence-copilot button,
.evidence-copilot input{
  font:inherit;
}

.copilot-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:14px 15px;
  border-bottom:1px solid #173047;
  background:#0a1928;
}

.copilot-title{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:0;
}

.copilot-icon{
  width:34px;
  height:34px;
  display:grid;
  place-items:center;
  border:1px solid #1d8fc5;
  border-radius:9px;
  background:#08263a;
  color:#4dc7ff;
}

.copilot-title strong{
  display:block;
  color:#f1f7fc;
  font-size:12px;
  font-weight:800;
}

.copilot-title span{
  display:flex;
  align-items:center;
  gap:5px;
  margin-top:3px;
  color:#718ba0;
  font-size:8px;
}

.copilot-title span i{
  width:5px;
  height:5px;
  border-radius:50%;
  background:#22c55e;
  box-shadow:
    0 0 7px rgba(34,197,94,.8);
}

.copilot-close{
  width:28px;
  height:28px;
  display:grid;
  place-items:center;
  border:1px solid #203b52;
  border-radius:7px;
  background:#091a2a;
  color:#7d95a8;
  cursor:pointer;
}

.copilot-context{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:12px 15px;
  border-bottom:1px solid #173047;
}

.context-file{
  display:flex;
  align-items:center;
  gap:9px;
  min-width:0;
  color:#4fc7ff;
}

.context-file>div{
  min-width:0;
}

.context-file strong{
  display:block;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color:#e6f0f8;
  font-size:10px;
}

.context-file span{
  display:block;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  margin-top:3px;
  color:#647e94;
  font-family:monospace;
  font-size:8px;
}

.context-confidence{
  text-align:right;
  flex:none;
}

.context-confidence span{
  display:block;
  color:#60798f;
  font-size:7px;
  font-weight:800;
  letter-spacing:.08em;
}

.context-confidence strong{
  display:block;
  margin-top:2px;
  color:#4fc7ff;
  font-size:17px;
}

.copilot-forensic-strip{
  display:flex;
  align-items:center;
  gap:7px;
  padding:8px 15px;
  border-bottom:1px solid #173047;
  background:#06121e;
  overflow:hidden;
}

.copilot-forensic-strip span{
  color:#557086;
  font-size:6px;
  font-weight:900;
  white-space:nowrap;
}

.copilot-forensic-strip b{
  color:#86d9ff;
  font-size:7px;
  margin-right:5px;
  white-space:nowrap;
}

.danger-text{
  color:#f87171!important;
}

.copilot-warning{
  display:flex;
  align-items:center;
  gap:6px;
  padding:8px 12px;
  border-bottom:1px solid #4d3b1d;
  background:#171308;
  color:#d9a63e;
  font-size:8px;
}

.copilot-messages{
  max-height:430px;
  overflow:auto;
  padding:13px 15px 4px;
}

.copilot-message{
  display:flex;
  gap:8px;
  margin-bottom:13px;
}

.message-avatar{
  width:25px;
  height:25px;
  flex:none;
  display:grid;
  place-items:center;
  border:1px solid #1b405a;
  border-radius:7px;
  background:#0a2234;
  color:#4fc7ff;
}

.message-body{
  min-width:0;
  flex:1;
}

.message-title{
  display:block;
  margin:2px 0 5px;
  color:#edf5fb;
  font-size:10px;
  font-weight:800;
}

.message-body p{
  margin:0;
  color:#9bb0c1;
  font-size:9px;
  line-height:1.65;
}

.evidence-support{
  margin-top:9px;
  padding:9px;
  border:1px solid #17344a;
  border-radius:8px;
  background:#071522;
}

.support-heading{
  display:flex;
  align-items:center;
  gap:5px;
  margin-bottom:5px;
  color:#70d0ff;
  font-size:8px;
  font-weight:800;
  text-transform:uppercase;
}

.support-item{
  display:flex;
  align-items:flex-start;
  gap:3px;
  margin-top:4px;
  color:#8399aa;
  font-size:8px;
  line-height:1.45;
}

.copilot-thinking{
  display:flex;
  align-items:center;
  gap:6px;
  color:#7f9aac;
  font-size:9px;
}

.copilot-suggestions{
  padding:11px 15px;
  border-top:1px solid #173047;
}

.suggestion-heading{
  display:flex;
  align-items:center;
  gap:5px;
  margin-bottom:7px;
  color:#70899d;
  font-size:8px;
  font-weight:800;
  text-transform:uppercase;
}

.copilot-suggestions button{
  display:block;
  width:100%;
  margin-top:5px;
  padding:7px 8px;
  border:1px solid #19364c;
  border-radius:7px;
  background:#081725;
  color:#9eb3c3;
  text-align:left;
  font-size:8px;
  line-height:1.35;
  cursor:pointer;
}

.copilot-suggestions button:hover{
  border-color:#276080;
  background:#0a1e2e;
  color:#cde7f5;
}

.copilot-suggestions button:disabled{
  opacity:.45;
  cursor:not-allowed;
}

.copilot-input-area{
  padding:11px 15px 13px;
  border-top:1px solid #173047;
  background:#07131f;
}

.copilot-input{
  display:flex;
  border:1px solid #203b52;
  border-radius:8px;
  overflow:hidden;
  background:#06111c;
}

.copilot-input input{
  flex:1;
  min-width:0;
  border:0;
  outline:0;
  padding:9px 10px;
  background:transparent;
  color:#dceaf4;
  font-size:9px;
}

.copilot-input button{
  width:34px;
  height:34px;
  display:grid;
  place-items:center;
  border:0;
  border-left:1px solid #19364b;
  background:#09263a;
  color:#4fc7ff;
  cursor:pointer;
}

.copilot-input button:disabled{
  opacity:.4;
  cursor:not-allowed;
}

.copilot-input-area small{
  display:block;
  margin-top:7px;
  color:#506b80;
  font-size:7px;
  line-height:1.45;
}

.spin{
  animation:recoverai-copilot-spin .8s linear infinite;
}

@keyframes recoverai-copilot-spin{
  to{
    transform:rotate(360deg);
  }
}

@media(max-width:600px){

  .copilot-messages{
    max-height:350px;
  }

  .copilot-forensic-strip{
    flex-wrap:wrap;
  }

}
`;