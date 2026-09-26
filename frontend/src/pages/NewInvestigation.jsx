import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileUp,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

async function requestJson(path, options = {}) {
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
        `Request failed with HTTP ${response.status}`
    );
  }

  return data;
}

function bytes(value = 0) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024)
    return `${(value / 1024).toFixed(2)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export default function NewInvestigation() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("Controlled forensic dataset");
  const [file, setFile] = useState(null);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState(null);

  const handleFile = (selected) => {
    const picked = selected?.[0];
    if (!picked) return;

    setFile(picked);
    setError("");
  };

  const startInvestigation = async () => {
    if (!name.trim()) {
      setError("Enter an investigation name.");
      return;
    }

    if (!file) {
      setError("Select an evidence file before starting analysis.");
      return;
    }

    setCreating(true);
    setError("");
    setRecord(null);

    try {
      // 1. Create a real investigation in SQLite.
      const investigation = await requestJson(
        "/api/investigations/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            description:
              description.trim() ||
              `Evidence source: ${source}`,
          }),
        }
      );

      const investigationRecord =
        investigation?.investigation ||
        investigation;

      const investigationId =
        investigationRecord?.id ||
        investigation?.id;

      if (!investigationId) {
        throw new Error(
          "Backend created the investigation but did not return an investigation ID."
        );
      }

      // 2. Upload the real evidence file as multipart/form-data.
      const form = new FormData();
      form.append("file", file);

      const uploadResponse = await fetch(
        `${API_BASE}/api/evidence/upload?investigation_id=${encodeURIComponent(
          investigationId
        )}`,
        {
          method: "POST",
          body: form,
        }
      );

      const uploadText = await uploadResponse.text();
      let uploadData = null;

      try {
        uploadData = uploadText
          ? JSON.parse(uploadText)
          : null;
      } catch {
        uploadData = null;
      }

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData?.detail ||
            uploadData?.error ||
            `Evidence upload failed with HTTP ${uploadResponse.status}`
        );
      }

      const evidence =
        uploadData?.evidence ||
        uploadData;

      const evidenceId =
        evidence?.id ||
        evidence?.evidence_id;

      if (!evidenceId) {
        throw new Error(
          "Evidence upload succeeded but no evidence ID was returned."
        );
      }

      // 3. Persist the real IDs so every page can use the same evidence.
      localStorage.setItem(
        "recoverai_investigation_id",
        investigationId
      );

      localStorage.setItem(
        "recoverai_evidence_id",
        evidenceId
      );

      localStorage.setItem(
        "currentEvidenceId",
        evidenceId
      );

      localStorage.setItem(
        "recoverai_evidence_filename",
        file.name
      );

      setRecord({
        investigationId,
        evidenceId,
        filename:
          evidence?.original_filename ||
          evidence?.filename ||
          file.name,
        size:
          evidence?.file_size ??
          evidence?.size ??
          file.size,
        sha256: evidence?.sha256 || "Recorded by backend",
      });
    } catch (err) {
      setError(
        err.message ||
          "Unable to create the investigation."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="real-intake-page">
      <style>{`
        .real-intake-page {
          color:#e5eef8;
          max-width:1050px;
          margin:0 auto;
        }

        .real-intake-page .eyebrow {
          display:block;
          color:#67b7ff;
          font-size:10px;
          font-weight:800;
          letter-spacing:.16em;
          margin-bottom:7px;
        }

        .real-intake-page h2 {
          margin:0;
          font-size:28px;
          color:#f5f9ff;
        }

        .real-intake-page .subtitle {
          color:#8da2b8;
          font-size:12px;
          margin:7px 0 22px;
        }

        .real-intake-page .panel {
          border:1px solid #1c3047;
          border-radius:14px;
          background:linear-gradient(180deg,#0b1a2b,#091524);
          padding:20px;
          margin-bottom:16px;
        }

        .real-intake-page .panel-title {
          color:#e8f1fb;
          font-size:13px;
          font-weight:800;
          margin-bottom:16px;
        }

        .real-intake-page .grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:15px;
        }

        .real-intake-page label {
          display:flex;
          flex-direction:column;
          gap:7px;
          color:#8da2b8;
          font-size:11px;
          font-weight:700;
        }

        .real-intake-page .full {
          grid-column:1 / -1;
        }

        .real-intake-page input,
        .real-intake-page textarea,
        .real-intake-page select {
          width:100%;
          box-sizing:border-box;
          border:1px solid #213950;
          border-radius:9px;
          background:#071321;
          color:#e5eef8;
          padding:11px 12px;
          outline:none;
          font:inherit;
          font-size:12px;
        }

        .real-intake-page textarea {
          min-height:100px;
          resize:vertical;
        }

        .real-intake-page input:focus,
        .real-intake-page textarea:focus,
        .real-intake-page select:focus {
          border-color:#2196d2;
        }

        .real-intake-page .drop {
          min-height:210px;
          border:1px dashed #2b5878;
          border-radius:13px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-direction:column;
          gap:10px;
          background:rgba(8,25,42,.55);
          cursor:pointer;
          text-align:center;
        }

        .real-intake-page .drop:hover {
          border-color:#38bdf8;
          background:rgba(14,45,70,.45);
        }

        .real-intake-page .drop svg {
          color:#38bdf8;
        }

        .real-intake-page .drop strong {
          color:#e8f1fb;
          font-size:14px;
        }

        .real-intake-page .drop span {
          max-width:500px;
          color:#71879d;
          font-size:11px;
          line-height:1.6;
        }

        .real-intake-page .selected {
          display:flex;
          align-items:center;
          gap:11px;
          width:min(100%,560px);
          padding:12px;
          border:1px solid #1d405c;
          border-radius:10px;
          background:#091b2c;
          text-align:left;
        }

        .real-intake-page .selected-info {
          min-width:0;
          flex:1;
        }

        .real-intake-page .selected-info strong {
          display:block;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          color:#e5eef8;
          font-size:12px;
        }

        .real-intake-page .selected-info small {
          color:#71879d;
          font-size:10px;
        }

        .real-intake-page .status {
          display:flex;
          align-items:center;
          gap:8px;
          padding:11px 13px;
          border-radius:9px;
          margin-bottom:15px;
          font-size:11px;
        }

        .real-intake-page .status.error {
          border:1px solid rgba(248,113,113,.3);
          background:rgba(127,29,29,.14);
          color:#fca5a5;
        }

        .real-intake-page .status.success {
          border:1px solid rgba(74,222,128,.3);
          background:rgba(22,101,52,.12);
          color:#86efac;
        }

        .real-intake-page .record-grid {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:10px;
        }

        .real-intake-page .record {
          border:1px solid #183047;
          border-radius:9px;
          padding:11px;
          background:#091625;
        }

        .real-intake-page .record small {
          display:block;
          color:#6f879e;
          font-size:9px;
          text-transform:uppercase;
          margin-bottom:5px;
        }

        .real-intake-page .record strong {
          color:#dce8f5;
          font-size:11px;
          word-break:break-word;
        }

        .real-intake-page .actions {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
        }

        .real-intake-page .security {
          display:flex;
          align-items:center;
          gap:7px;
          color:#70869c;
          font-size:10px;
        }

        .real-intake-page button {
          border:0;
          cursor:pointer;
        }

        .real-intake-page .primary {
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
        }

        .real-intake-page .primary:disabled {
          opacity:.55;
          cursor:not-allowed;
        }

        @media(max-width:760px) {
          .real-intake-page .grid,
          .real-intake-page .record-grid {
            grid-template-columns:1fr;
          }

          .real-intake-page .full {
            grid-column:auto;
          }

          .real-intake-page .actions {
            align-items:flex-start;
            flex-direction:column;
          }
        }
      `}</style>

      <span className="eyebrow">REAL EVIDENCE INTAKE</span>
      <h2>New Investigation</h2>
      <p className="subtitle">
        Create a real investigation, upload the original evidence,
        hash it on the backend, and send the resulting evidence ID
        into the analysis pipeline.
      </p>

      {error && (
        <div className="status error">
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {record && (
        <div className="status success">
          <CheckCircle2 size={16} />
          <span>
            Evidence imported successfully. Evidence ID:{" "}
            <strong>{record.evidenceId}</strong>
          </span>
        </div>
      )}

      <section className="panel">
        <div className="panel-title">
          Investigation Details
        </div>

        <div className="grid">
          <label>
            Investigation Name
            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="e.g. Damaged Image Recovery"
            />
          </label>

          <label>
            Evidence Source
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value)
              }
            >
              <option>
                Controlled forensic dataset
              </option>
              <option>Disk image</option>
              <option>Raw storage image</option>
              <option>Corrupted file</option>
              <option>Fragment dataset</option>
              <option>Binary evidence</option>
            </select>
          </label>

          <label className="full">
            Case Description
            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Describe what is being investigated."
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          Evidence Upload
        </div>

        <div
          className="drop"
          onClick={() =>
            inputRef.current?.click()
          }
        >
          <UploadCloud size={34} />

          <strong>
            {file
              ? "Evidence selected"
              : "Select the actual evidence file"}
          </strong>

          <span>
            The selected file is uploaded directly to
            the FastAPI evidence endpoint. RECOVERAI
            calculates and stores the evidence hash.
          </span>

          {file && (
            <div
              className="selected"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <FileUp size={20} />

              <div className="selected-info">
                <strong>{file.name}</strong>
                <small>
                  {bytes(file.size)} ·{" "}
                  {file.type || "application/octet-stream"}
                </small>
              </div>

              <CheckCircle2
                size={18}
                color="#4ade80"
              />
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) =>
            handleFile(e.target.files)
          }
        />
      </section>

      {record && (
        <section className="panel">
          <div className="panel-title">
            Backend Evidence Record
          </div>

          <div className="record-grid">
            <div className="record">
              <small>Investigation ID</small>
              <strong>
                {record.investigationId}
              </strong>
            </div>

            <div className="record">
              <small>Evidence ID</small>
              <strong>
                {record.evidenceId}
              </strong>
            </div>

            <div className="record">
              <small>Filename</small>
              <strong>
                {record.filename}
              </strong>
            </div>

            <div className="record">
              <small>Size</small>
              <strong>
                {bytes(record.size)}
              </strong>
            </div>

            <div className="record">
              <small>SHA-256</small>
              <strong>
                {record.sha256}
              </strong>
            </div>

            <div className="record">
              <small>Status</small>
              <strong>IMPORTED</strong>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="actions">
          <div className="security">
            <ShieldCheck size={15} />
            Original evidence is retained as read-only;
            analysis uses the stored evidence record.
          </div>

          <button
            className="primary"
            disabled={creating || !file}
            onClick={async () => {
              if (record) {
                navigate(
                  `/analysis?evidenceId=${encodeURIComponent(
                    record.evidenceId
                  )}`
                );
                return;
              }

              await startInvestigation();
            }}
          >
            {creating ? (
              <>
                <LoaderCircle
                  size={14}
                  className="spin"
                />
                IMPORTING...
              </>
            ) : record ? (
              <>
                Start Analysis
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                Create & Upload Evidence
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
