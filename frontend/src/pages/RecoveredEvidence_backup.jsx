import DamageMap from "../components/evidence/DamageMap";
import React, { useState } from "react";
import {
  Eye,
  Download,
  GitBranch,
  ScanLine,
  ShieldCheck,
  Bot,
} from "lucide-react";

import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import EvidenceCopilot from "../components/evidence/EvidenceCopilot";
import { files, recoverySummary } from "../data/demoData";

const tone = (status = "") => {
  if (status.includes("Verified")) return "success";
  if (status.includes("Insufficient")) return "danger";
  if (status.includes("AI")) return "warning";
  return "info";
};

export default function RecoveredEvidence() {
  const [active, setActive] = useState(files[0]);
  const [pos, setPos] = useState(52);
  const [copilotOpen, setCopilotOpen] = useState(true);

  return (
    <div className="recovered-evidence-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">EVIDENCE LIBRARY</span>

          <h2>Recovered Evidence</h2>

          <p>
            Review recovery results, uncertainty, provenance and
            comparison data.
          </p>
        </div>

        <div className="toolbar">
          <button className="secondary-btn">
            <ScanLine size={16} />
            Damage Map
          </button>

          <button className="secondary-btn">
            <Download size={16} />
            Export
          </button>

          {!copilotOpen && (
            <button
              className="secondary-btn copilot-open-btn"
              onClick={() => setCopilotOpen(true)}
            >
              <Bot size={16} />
              Evidence AI
            </button>
          )}
        </div>
      </div>

      <div
        className={
          copilotOpen
            ? "evidence-workspace with-copilot"
            : "evidence-workspace"
        }
      >
        <main className="evidence-main">
          <Card className="table-card">
            <div className="filters">
              <input placeholder="Search evidence..." />

              <select>
                <option>All statuses</option>
                <option>Verified Recovery</option>
                <option>Structural Repair</option>
                <option>Plausible Reconstruction</option>
                <option>AI-Inferred Reconstruction</option>
                <option>Insufficient Evidence</option>
              </select>

              <select>
                <option>All types</option>
                <option>JPEG</option>
                <option>PDF</option>
                <option>ZIP</option>
                <option>PNG</option>
                <option>Binary</option>
              </select>
            </div>

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
                {files.map((f) => (
                  <tr
                    className={
                      active.id === f.id ? "selected-row" : ""
                    }
                    key={f.id}
                    onClick={() => setActive(f)}
                  >
                    <td>
                      <b>{f.name}</b>
                      <small>{f.id}</small>
                    </td>

                    <td>{f.type}</td>

                    <td>
                      <Badge tone={tone(f.status)}>
                        {f.status}
                      </Badge>
                    </td>

                    <td>{f.integrity}</td>

                    <td>{f.confidence}%</td>

                    <td>
                      <Badge
                        tone={
                          f.priority === "High"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {f.priority}
                      </Badge>
                    </td>

                    <td>
                      <button
                        className="table-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActive(f);
                        }}
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        className="table-action"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GitBranch size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="evidence-detail-grid">
            <Card>
              <div className="card-title">
                <span>Recovery Comparison</span>

                <Badge tone="info">ACTUAL DEMO DATA</Badge>
              </div>

              <div className="comparison">
                <div className="compare-pane corrupted">
                  <div className="compare-label">
                    CORRUPTED INPUT
                  </div>

                  <div className="fake-image damage">
                    <div className="damage-block b1" />
                    <div className="damage-block b2" />
                    <div className="damage-block b3" />

                    <span>{active.name}</span>
                  </div>
                </div>

                <div className="compare-pane recovered">
                  <div className="compare-label">
                    RECOVERED OUTPUT
                  </div>

                  <div className="fake-image recovered-img">
                    <div className="mountain" />

                    <span>
                      {recoverySummary.completeness}% COMPLETE
                    </span>
                  </div>
                </div>

                <div
                  className="slider-line"
                  style={{ left: `${pos}%` }}
                />

                <input
                  className="compare-slider"
                  type="range"
                  min="10"
                  max="90"
                  value={pos}
                  onChange={(e) => setPos(+e.target.value)}
                />
              </div>

              <div className="comparison-stats">
                <span>
                  Original <b>4.8 MB</b>
                </span>

                <span>
                  Verified <b>3.89 MB</b>
                </span>

                <span>
                  Reconstructed <b>709 KB</b>
                </span>

                <span>
                  Missing <b>448 KB</b>
                </span>
              </div>
            </Card>

            <div className="side-stack">
              <Card>
                <div className="card-title">
                  Evidence DNA
                </div>

                <div className="dna">
                  <ShieldCheck size={34} />

                  <div>
                    <b>{active.name}</b>

                    <span>
                      {active.type} · {active.fragments} fragments
                    </span>
                  </div>
                </div>

                <div className="hash">
                  SHA-256 · 8a2d91c7...f91c
                </div>

                <div className="metric-line">
                  <span>Completeness</span>
                  <b>{recoverySummary.completeness}%</b>
                </div>

                <div className="metric-line">
                  <span>Structural integrity</span>
                  <b>{recoverySummary.structural}%</b>
                </div>

                <div className="metric-line">
                  <span>Recovery confidence</span>
                  <b>{recoverySummary.confidence}%</b>
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
                    "Final Evidence",
                  ].map((x, i) => (
                    <div key={x}>
                      <i />

                      {x}

                      {i < 6 && <span>›</span>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </main>

        {copilotOpen && (
          <EvidenceCopilot
            evidence={active}
            recoverySummary={recoverySummary}
            onClose={() => setCopilotOpen(false)}
          />
        )}
      </div>
    </div>
  );
}