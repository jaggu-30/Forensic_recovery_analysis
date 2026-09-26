import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  FileText,
  FileType2,
  Image as ImageIcon,
  RefreshCw,
  Video,
  AlertTriangle,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8001";

function getEvidenceId() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("evidenceId") ||
    localStorage.getItem(
      "recoverai_evidence_id"
    ) ||
    localStorage.getItem(
      "currentEvidenceId"
    ) ||
    ""
  );
}

async function api(
  path,
  options = {}
) {
  const response =
    await fetch(
      `${API}${path}`,
      {
        ...options,
        headers: {
          Accept:
            "application/json",
          ...(options.headers || {}),
        },
      }
    );

  const text =
    await response.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail =
      data?.detail;

    throw new Error(
      (
        typeof detail ===
        "object"
      )
        ? (
            detail?.error ||
            "Recovery failed."
          )
        : (
            detail ||
            data?.error ||
            `HTTP ${response.status}`
          )
    );
  }

  return data;
}

function bust(url) {
  if (!url) {
    return "";
  }

  return (
    `${url}` +
    (
      url.includes("?")
        ? "&"
        : "?"
    ) +
    `t=${Date.now()}`
  );
}

function buildUrl(path) {
  if (!path) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      path
    )
  ) {
    return path;
  }

  return `${API}${path}`;
}

function extension(
  name = ""
) {
  const index =
    name.lastIndexOf(".");

  return index >= 0
    ? name
        .slice(index)
        .toLowerCase()
    : "";
}

function mediaKind(
  filename = "",
  mime = ""
) {
  const type =
    String(mime).toLowerCase();

  const ext =
    extension(filename);

  if (
    type.startsWith(
      "image/"
    ) ||
    [
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".bmp",
      ".gif",
    ].includes(ext)
  ) {
    return "image";
  }

  if (
    type.startsWith(
      "video/"
    ) ||
    [
      ".mp4",
      ".mov",
      ".avi",
      ".mkv",
      ".webm",
      ".m4v",
    ].includes(ext)
  ) {
    return "video";
  }

  if (
    type ===
      "application/pdf" ||
    ext === ".pdf"
  ) {
    return "pdf";
  }

  if (
    type.includes(
      "word"
    ) ||
    type.includes(
      "officedocument"
    ) ||
    [
      ".doc",
      ".docx",
      ".odt",
      ".rtf",
    ].includes(ext)
  ) {
    return "document";
  }

  return "file";
}

function labelForKind(
  kind
) {
  if (kind === "image")
    return "IMAGE";

  if (kind === "video")
    return "VIDEO";

  if (kind === "pdf")
    return "PDF";

  if (kind === "document")
    return "DOCUMENT";

  return "FILE";
}

function MediaPreview({
  kind,
  url,
  filename,
  side,
}) {
  if (
    kind === "image" &&
    url
  ) {
    return (
      <img
        src={url}
        alt={filename}
        className="rc-media"
      />
    );
  }

  if (
    kind === "video" &&
    url
  ) {
    return (
      <video
        key={url}
        src={url}
        className="rc-media rc-video"
        controls
        playsInline
        preload="auto"
      >
        <source
          src={url}
          type={
            filename
              .toLowerCase()
              .endsWith(".webm")
              ? "video/webm"
              : "video/mp4"
          }
        />
        Your browser cannot play
        this video.
      </video>
    );
  }

  if (
    kind === "pdf" &&
    url
  ) {
    return (
      <iframe
        src={url}
        title={
          `${filename} PDF preview`
        }
        className="rc-document-preview"
      />
    );
  }

  if (
    kind === "document" &&
    url
  ) {
    return (
      <iframe
        src={url}
        title={
          `${filename} document preview`
        }
        className="rc-document-preview"
      />
    );
  }

  return (
    <div className="rc-file-placeholder">
      <FileType2 size={42} />

      <strong>
        {filename}
      </strong>

      <span>
        {side === "input"
          ? "Observed evidence"
          : "Recovered artifact"}
      </span>
    </div>
  );
}

export default function RecoveryComparison({
  evidenceId: propId,
}) {
  const evidenceId =
    propId || getEvidenceId();

  const [
    evidence,
    setEvidence,
  ] = useState(null);

  const [
    sourceUrl,
    setSourceUrl,
  ] = useState("");

  const [
    outputUrl,
    setOutputUrl,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const filename =
    evidence?.original_filename ||
    evidence?.filename ||
    "Evidence";

  const mime =
    evidence?.mime_type ||
    "";

  const kind =
    useMemo(
      () =>
        mediaKind(
          filename,
          mime
        ),
      [filename, mime]
    );

  const loadEvidence =
    useCallback(
      async () => {
        if (!evidenceId) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");
        setOutputUrl("");
        setResult(null);

        try {
          const response =
            await api(
              `/api/evidence/${evidenceId}`
            );

          const item =
            response?.evidence ||
            response ||
            {};

          setEvidence(
            item
          );

          const source =
            `${API}/api/ai-reconstruction/` +
            `${evidenceId}/source-file`;

          setSourceUrl(
            bust(source)
          );
        } catch (
          err
        ) {
          setError(
            err.message ||
              "Unable to load evidence."
          );
        } finally {
          setLoading(false);
        }
      },
      [evidenceId]
    );

  const runRecovery =
    useCallback(
      async () => {
        if (
          !evidenceId ||
          running
        ) {
          return;
        }

        setRunning(true);
        setError("");
        setOutputUrl("");
        setResult(null);

        try {
          const data =
            await api(
              `/api/ai-reconstruction/${evidenceId}`,
              {
                method:
                  "POST",
              }
            );

          setResult(
            data || {}
          );

          let nextUrl =
            "";

          if (
            data?.output_url
          ) {
            nextUrl =
              buildUrl(
                data.output_url
              );
          } else if (
            data?.run_id
          ) {
            nextUrl =
              `${API}/api/ai-reconstruction/` +
              `${evidenceId}/output` +
              `?run=${encodeURIComponent(
                data.run_id
              )}`;
          }

          if (!nextUrl) {
            throw new Error(
              "Recovery completed without returning an output file."
            );
          }

          setOutputUrl(
            bust(nextUrl)
          );
        } catch (
          err
        ) {
          setError(
            err.message ||
              "Recovery failed."
          );
        } finally {
          setRunning(false);
        }
      },
      [
        evidenceId,
        running,
      ]
    );

  useEffect(
    () => {
      loadEvidence();
    },
    [loadEvidence]
  );

  useEffect(
    () => {
      if (
        loading ||
        !sourceUrl ||
        !evidenceId
      ) {
        return;
      }

      const timer =
        setTimeout(
          () => {
            runRecovery();
          },
          300
        );

      return () =>
        clearTimeout(
          timer
        );
    },
    [
      loading,
      sourceUrl,
      evidenceId,
    ]
  );

  return (
    <section className="rc-page">
      <style>
        {styles}
      </style>

      <div className="rc-header">
        <div>
          <div className="rc-kicker">
            FORENSIC RECOVERY COMPARISON
          </div>

          <h2>
            Recovery Comparison
          </h2>

          <p>
            Compare the actual evidence
            with the recovered artifact.
          </p>
        </div>

        <button
          type="button"
          className="rc-refresh"
          onClick={
            runRecovery
          }
          disabled={
            running ||
            loading
          }
        >
          <RefreshCw
            size={14}
            className={
              running
                ? "rc-spin"
                : ""
            }
          />

          {running
            ? "RECOVERING"
            : "REGENERATE"}
        </button>
      </div>

      <div className="rc-meta">
        <span>
          {filename}
        </span>

        <span>
          {labelForKind(
            kind
          )}
        </span>

        <span>
          {running
            ? "PROCESSING"
            : outputUrl
            ? "READY"
            : "WAITING"}
        </span>
      </div>

      {error && (
        <div className="rc-error">
          <AlertTriangle
            size={15}
          />

          <span>
            {error}
          </span>
        </div>
      )}

      <div className="rc-grid">

        {/* INPUT */}
        <div className="rc-panel">
          <div className="rc-title">
            <span className="rc-dot red" />

            CORRUPTED INPUT

            <span className="rc-right">
              {labelForKind(
                kind
              )}
            </span>
          </div>

          <div className="rc-stage">
            {loading ? (
              <div className="rc-loading">
                LOADING EVIDENCE...
              </div>
            ) : (
              <MediaPreview
                kind={kind}
                url={sourceUrl}
                filename={filename}
                side="input"
              />
            )}

            <span className="rc-badge input">
              OBSERVED
            </span>
          </div>
        </div>

        {/* ARROW */}
        <div className="rc-connector">
          <div className="rc-arrow">
            →
          </div>

          <span>
            RECOVERAI
          </span>
        </div>

        {/* OUTPUT */}
        <div className="rc-panel output">
          <div className="rc-title output-title">
            <span className="rc-dot green" />

            RECOVERY RESULT

            <span className="rc-right output-text">
              {outputUrl
                ? "READY"
                : running
                ? "PROCESSING"
                : "WAITING"}
            </span>
          </div>

          <div className="rc-stage output-stage">

            {outputUrl ? (
              <MediaPreview
                kind={kind}
                url={outputUrl}
                filename={filename}
                side="output"
              />
            ) : (
              <div className="rc-output-placeholder">
                {running ? (
                  <>
                    <span className="rc-loader" />

                    <strong>
                      RECOVERING
                    </strong>

                    <span>
                      Preparing the recovered{" "}
                      {labelForKind(
                        kind
                      ).toLowerCase()}
                      .
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={42}
                    />

                    <strong>
                      RECOVERY RESULT
                    </strong>

                    <span>
                      The recovered artifact
                      will appear here.
                    </span>
                  </>
                )}
              </div>
            )}

            <span className="rc-badge output-badge">
              {outputUrl
                ? "RECOVERED"
                : "RESULT"}
            </span>
          </div>

          <div className="rc-footer">
            <div>
              <span>
                METHOD
              </span>

              <strong>
                {result?.method ||
                  (kind === "video"
                    ? "VIDEO FRAME RECOVERY"
                    : kind === "image"
                    ? "IMAGE RECOVERY"
                    : kind === "pdf"
                    ? "PDF RECOVERY"
                    : kind === "document"
                    ? "DOCUMENT RECOVERY"
                    : "FILE RECOVERY")}
              </strong>
            </div>

            <div>
              <span>
                OUTPUT
              </span>

              <strong>
                {outputUrl
                  ? "AVAILABLE"
                  : running
                  ? "PROCESSING"
                  : "PENDING"}
              </strong>
            </div>

            <button
              type="button"
              className="rc-run"
              onClick={
                runRecovery
              }
              disabled={
                running ||
                loading
              }
            >
              <RefreshCw size={12} />

              RUN AGAIN
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
  max-width:1240px;
  margin:0 auto;
  padding:4px 0 30px;
  color:#e8f2f7;
}

.rc-page *{
  box-sizing:border-box;
}

.rc-header{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:16px;
  margin-bottom:11px;
}

.rc-kicker{
  color:#54c9ff;
  font-size:8px;
  font-weight:900;
  letter-spacing:.16em;
  margin-bottom:5px;
}

.rc-header h2{
  margin:0;
  color:#f4f9fc;
  font-size:23px;
  font-weight:800;
}

.rc-header p{
  margin:6px 0 0;
  color:#758d9d;
  font-size:10px;
}

.rc-refresh{
  display:flex;
  align-items:center;
  gap:7px;
  min-height:32px;
  padding:0 11px;
  border:1px solid #255977;
  border-radius:7px;
  background:#081b2a;
  color:#d9eef8;
  font-size:8px;
  font-weight:900;
  cursor:pointer;
}

.rc-refresh:disabled{
  opacity:.52;
  cursor:not-allowed;
}

.rc-error{
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom:10px;
  padding:9px 11px;
  border:1px solid #63353d;
  border-radius:7px;
  background:#211318;
  color:#ff9fa8;
  font-size:9px;
}

.rc-meta{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-bottom:10px;
}

.rc-meta span{
  padding:5px 8px;
  border:1px solid #173950;
  border-radius:999px;
  background:#071520;
  color:#819bad;
  font-size:8px;
  font-weight:800;
}

.rc-grid{
  display:grid;
  grid-template-columns:minmax(0,1fr) 72px minmax(0,1fr);
  gap:9px;
  align-items:stretch;
}

.rc-panel{
  min-width:0;
  overflow:hidden;
  border:1px solid #193b52;
  border-radius:10px;
  background:#071521;
}

.rc-panel.output{
  border-color:#1c503d;
}

.rc-title{
  height:39px;
  display:flex;
  align-items:center;
  gap:7px;
  padding:0 11px;
  border-bottom:1px solid #19384d;
  color:#aec1cd;
  font-size:8px;
  font-weight:900;
  letter-spacing:.08em;
}

.output-title{
  border-bottom-color:#224b3b;
}

.rc-right{
  margin-left:auto;
  color:#648094;
  font-size:7px;
}

.output-text{
  color:#65dca4;
}

.rc-dot{
  width:7px;
  height:7px;
  flex:0 0 auto;
  border-radius:50%;
}

.rc-dot.red{
  background:#ff647c;
}

.rc-dot.green{
  background:#47dfa0;
}

.rc-stage{
  position:relative;
  min-height:480px;
  padding:10px;
  display:grid;
  place-items:center;
  background:#020a11;
}

.output-stage{
  background:#020d09;
}

.rc-media{
  width:100%;
  height:455px;
  display:block;
  object-fit:contain;
  border-radius:6px;
  background:#000;
}

.rc-video{
  object-fit:contain;
}

.rc-document-preview{
  width:100%;
  height:455px;
  border:0;
  border-radius:6px;
  background:#fff;
}

.rc-file-placeholder{
  width:78%;
  min-height:220px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:8px;
  text-align:center;
  border:1px dashed #24485d;
  border-radius:10px;
  background:#06111a;
  color:#5b7b8d;
}

.rc-file-placeholder strong{
  color:#d6e6ee;
  font-size:12px;
  word-break:break-word;
}

.rc-file-placeholder span{
  font-size:9px;
}

.rc-badge{
  position:absolute;
  top:9px;
  left:9px;
  padding:5px 7px;
  border-radius:4px;
  background:rgba(7,16,25,.95);
  font-size:7px;
  font-weight:900;
}

.rc-badge.input{
  border:1px solid rgba(255,99,123,.3);
  color:#ff899a;
}

.rc-badge.output-badge{
  border:1px solid rgba(71,223,160,.3);
  color:#75e6b2;
}

.rc-connector{
  min-height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:8px;
}

.rc-arrow{
  width:42px;
  height:42px;
  display:grid;
  place-items:center;
  border:1px solid #28668a;
  border-radius:50%;
  background:#071b2a;
  color:#5bcaff;
  font-size:21px;
  font-weight:800;
}

.rc-connector span{
  writing-mode:vertical-rl;
  color:#5d8094;
  font-size:6px;
  font-weight:900;
  letter-spacing:.13em;
}

.rc-output-placeholder{
  width:75%;
  min-height:220px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  gap:8px;
  color:#4f9d7e;
}

.rc-output-placeholder strong{
  color:#d9efe5;
  font-size:12px;
}

.rc-output-placeholder span{
  color:#64877a;
  font-size:9px;
  line-height:1.5;
}

.rc-loader{
  width:30px;
  height:30px;
  border:3px solid rgba(67,223,160,.15);
  border-top-color:#48dfa0;
  border-radius:50%;
  animation:rcspin .8s linear infinite;
}

@keyframes rcspin{
  to{
    transform:rotate(360deg);
  }
}

.rc-footer{
  min-height:54px;
  display:grid;
  grid-template-columns:1fr 1fr auto;
  gap:8px;
  align-items:center;
  padding:8px 10px;
  border-top:1px solid #214b3a;
  background:#06120e;
}

.rc-footer span{
  display:block;
  color:#55756a;
  font-size:6px;
  font-weight:900;
}

.rc-footer strong{
  display:block;
  margin-top:3px;
  color:#8be8bd;
  font-size:8px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  max-width:190px;
}

.rc-run{
  min-height:30px;
  padding:0 9px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:5px;
  border:1px solid #2a7d5e;
  border-radius:6px;
  background:#092217;
  color:#98ebc4;
  font-size:7px;
  font-weight:900;
  cursor:pointer;
}

.rc-run:disabled{
  opacity:.5;
  cursor:not-allowed;
}

.rc-loading{
  color:#5f7e91;
  font-size:8px;
  font-weight:900;
  letter-spacing:.1em;
}

.rc-spin{
  animation:rcspin .8s linear infinite;
}

@media(max-width:960px){
  .rc-grid{
    grid-template-columns:1fr;
  }

  .rc-connector{
    min-height:58px;
    flex-direction:row;
  }

  .rc-connector span{
    writing-mode:horizontal-tb;
  }
}

@media(max-width:650px){
  .rc-header{
    align-items:stretch;
    flex-direction:column;
  }

  .rc-stage{
    min-height:320px;
  }

  .rc-media,
  .rc-document-preview{
    height:300px;
  }

  .rc-footer{
    grid-template-columns:1fr 1fr;
  }

  .rc-run{
    grid-column:1 / -1;
  }
}
`;