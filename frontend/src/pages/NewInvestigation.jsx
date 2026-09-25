import React, { useState } from "react";
import {
  UploadCloud,
  HardDrive,
  FileImage,
  ShieldCheck,
  ArrowRight,
  FileArchive,
  Database,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import Card from "../components/common/Card";
import Badge from "../components/common/Badge";

export default function NewInvestigation() {
  const [name, setName] = useState(
    "IR-2026-014 — Damaged Storage Analysis"
  );

  const [source, setSource] = useState("Disk image (.img)");
  const [fileName, setFileName] = useState("sample_disk.img");

  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
  };

  const handleStartAnalysis = () => {
    navigate("/analysis");
  };

  return (
    <div className="form-layout">
      {/* Header */}
      <div>
        <span className="eyebrow">EVIDENCE INTAKE</span>

        <h2>New Investigation</h2>

        <p className="muted">
          Create a read-only forensic evidence workspace before
          analysis begins.
        </p>
      </div>

      {/* Investigation Information */}
      <Card>
        <div className="form-grid">
          <label>
            Investigation name

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter investigation name"
            />
          </label>

          <label>
            Evidence source

            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option>Disk image (.img)</option>
              <option>Raw image (.dd)</option>
              <option>Raw image (.raw)</option>
              <option>Binary dataset</option>
              <option>Corrupted file set</option>
            </select>
          </label>

          <label className="full">
            Description

            <textarea
              defaultValue="Controlled demo dataset containing intact, fragmented, corrupted and missing-fragment evidence."
            />
          </label>
        </div>
      </Card>

      {/* Upload */}
      <Card className="upload-zone">
        <UploadCloud size={32} />

        <h3>Drop evidence here</h3>

        <p>
          Supported: .img, .dd, .raw, binary and controlled
          corruption datasets
        </p>

        <input
          id="evidence-file"
          type="file"
          hidden
          accept=".img,.dd,.raw,.bin,.zip,.jpg,.jpeg,.png,.pdf"
          onChange={handleFileChange}
        />

        <label
          htmlFor="evidence-file"
          className="secondary-btn"
        >
          <UploadCloud size={16} />
          Choose Evidence File
        </label>

        <div className="selected-file">
          <FileImage size={17} />

          <span>{fileName}</span>

          <Badge tone="success">READY</Badge>
        </div>
      </Card>

      {/* Evidence Record */}
      <div className="evidence-intake">
        <Card>
          <div className="card-title">
            <span>Evidence Record</span>

            <Badge tone="info">READ ONLY</Badge>
          </div>

          <div className="record-grid">
            <div>
              <small>Evidence ID</small>
              <b>EV-SRC-014</b>
            </div>

            <div>
              <small>Filename</small>
              <b>{fileName}</b>
            </div>

            <div>
              <small>Size</small>
              <b>512 MB</b>
            </div>

            <div>
              <small>SHA-256</small>
              <b className="mono">
                8a2d91c7...f91c
              </b>
            </div>

            <div>
              <small>Acquisition</small>
              <b>25 Sep 2026, 11:32 IST</b>
            </div>

            <div>
              <small>Source</small>
              <b>{source}</b>
            </div>
          </div>
        </Card>
      </div>

      {/* Evidence integrity information */}
      <div className="intake-info-grid">
        <Card>
          <div className="intake-info-item">
            <div className="intake-info-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <b>Original Evidence Protected</b>

              <p>
                The original evidence remains read-only during
                analysis.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="intake-info-item">
            <div className="intake-info-icon">
              <Database size={19} />
            </div>

            <div>
              <b>Working Copy Analysis</b>

              <p>
                Recovery operations are performed on a separate
                working copy.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="intake-info-item">
            <div className="intake-info-icon">
              <FileArchive size={19} />
            </div>

            <div>
              <b>Forensic Preservation</b>

              <p>
                Source metadata and integrity information are
                preserved for analysis.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="form-actions">
        <div className="security-note">
          <ShieldCheck size={16} />

          <span>
            Original evidence remains unchanged; analysis
            operates on a working copy.
          </span>
        </div>

        <button
          className="primary-btn"
          onClick={handleStartAnalysis}
        >
          Start Analysis

          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}