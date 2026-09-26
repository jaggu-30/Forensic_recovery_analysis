import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Database,
  FileWarning,
  ShieldCheck,
  RefreshCw,
  Activity,
} from "lucide-react";

import "./DamageMap.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8001";

/* =========================================================
   FORMAT HELPERS
========================================================= */

function formatBytes(value = 0) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes)) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatNumber(value = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("en-US");
}

function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${(number * 100).toFixed(2)}%`;
}

/* =========================================================
   OFFSET HELPERS
========================================================= */

function getStartOffset(region) {
  return (
    region?.start_offset ??
    region?.original_offset ??
    region?.offset ??
    0
  );
}

function getEndOffset(region) {
  return (
    region?.end_offset ??
    region?.original_end_offset ??
    (
      Number(getStartOffset(region)) +
      Number(region?.size || 0) -
      1
    )
  );
}

/* =========================================================
   REGION POSITION
========================================================= */

function getRegionPosition(region, originalSize) {
  if (!originalSize) {
    return {
      left: 0,
      width: 0,
      center: 0,
    };
  }

  const startOffset = Number(
    getStartOffset(region)
  );

  const regionSize = Number(
    region?.size || 0
  );

  const left = Math.max(
    0,
    Math.min(
      100,
      (startOffset / originalSize) * 100
    )
  );

  const width = Math.max(
    0.35,
    Math.min(
      100 - left,
      (regionSize / originalSize) * 100
    )
  );

  return {
    left,
    width,
    center: left + width / 2,
  };
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  label,
  value,
  tone = "",
}) {
  return (
    <div className="damage-map__metric">

      <div className="damage-map__metric-label">
        {label}
      </div>

      <div
        className={`damage-map__metric-value ${
          tone
            ? `damage-map__metric-value--${tone}`
            : ""
        }`}
      >
        {value}
      </div>

    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function DamageMap({
  evidenceId,
  apiBaseUrl = API_BASE_URL,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const loadDamageMap = async () => {
    if (!evidenceId) {
      setError(
        "No evidence ID was supplied."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/analysis/${evidenceId}/damage-map`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const text =
        await response.text();

      let result = null;

      try {
        result = text
          ? JSON.parse(text)
          : null;
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            result?.error ||
            `Damage Map request failed with HTTP ${response.status}`
        );
      }

      if (
        result &&
        result.success === false
      ) {
        throw new Error(
          result.error ||
            "Damage Map analysis was unsuccessful."
        );
      }

      const normalized =
        result?.damage_map ||
        result?.data ||
        result;

      if (!normalized) {
        throw new Error(
          "The backend returned an empty Damage Map response."
        );
      }

      setData(normalized);

    } catch (err) {
      setError(
        err?.message ||
          "Unable to load Damage Map data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!evidenceId) {
        setError(
          "No evidence ID was supplied."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/analysis/${evidenceId}/damage-map`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const text =
          await response.text();

        let result = null;

        try {
          result = text
            ? JSON.parse(text)
            : null;
        } catch {
          result = null;
        }

        if (!response.ok) {
          throw new Error(
            result?.detail ||
              result?.error ||
              `Damage Map request failed with HTTP ${response.status}`
          );
        }

        if (
          result &&
          result.success === false
        ) {
          throw new Error(
            result.error ||
              "Damage Map analysis was unsuccessful."
          );
        }

        const normalized =
          result?.damage_map ||
          result?.data ||
          result;

        if (!cancelled) {
          setData(normalized);
        }

      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load Damage Map data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [evidenceId, apiBaseUrl]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <section className="damage-map">

        <div className="damage-map__header">

          <div>

            <p className="damage-map__eyebrow">
              FORENSIC VISUALIZATION
            </p>

            <h2 className="damage-map__title">
              Damage Map
            </h2>

            <p className="damage-map__description">
              Loading observed, missing,
              reconstructed, and uncertain
              evidence regions from the
              analysis engine.
            </p>

          </div>

        </div>

        <div className="damage-map__state">

          <div className="damage-map__state-inner">

            <div className="damage-map__spinner" />

            <div>
              Loading damage analysis...
            </div>

          </div>

        </div>

      </section>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <section className="damage-map">

        <div className="damage-map__header">

          <div>

            <p className="damage-map__eyebrow">
              FORENSIC VISUALIZATION
            </p>

            <h2 className="damage-map__title">
              Damage Map
            </h2>

          </div>

          <button
            className="damage-map__retry"
            onClick={loadDamageMap}
          >
            <RefreshCw size={14} />
            Retry
          </button>

        </div>

        <div className="damage-map__error">

          <div className="damage-map__error-icon">
            <AlertTriangle size={20} />
          </div>

          <div>

            <h3 className="damage-map__error-title">
              Damage Map unavailable
            </h3>

            <p className="damage-map__error-text">
              {error}
            </p>

          </div>

        </div>

      </section>
    );
  }

  /* =========================================================
     NORMALIZED BACKEND DATA
  ========================================================= */

  const originalSize =
    Number(
      data?.estimated_original_size ??
      data?.original_size ??
      data?.file_size ??
      0
    );

  const observedBytes =
    Number(
      data?.observed_bytes ??
      data?.file_size ??
      0
    );

  const missingBytes =
    Number(
      data?.known_missing_bytes ??
      data?.missing_bytes ??
      0
    );

  const reconstructedBytes =
    Number(
      data?.reconstructed_bytes ??
      0
    );

  const completeness =
    Number(
      data?.completeness ??
      (
        originalSize
          ? observedBytes /
            originalSize
          : 0
      )
    );

  const regions =
    Array.isArray(data?.regions)
      ? data.regions
      : Array.isArray(
          data?.damage_regions
        )
      ? data.damage_regions
      : [];

  const regionCount =
    Number(
      data?.region_count ??
      regions.length
    );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="damage-map">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="damage-map__header">

        <div>

          <p className="damage-map__eyebrow">
            FORENSIC VISUALIZATION
          </p>

          <h2 className="damage-map__title">
            Damage Map
          </h2>

          <p className="damage-map__description">
            Visual representation of observed,
            missing, reconstructed, and
            uncertain evidence regions.
          </p>

        </div>

        <div className="damage-map__header-actions">

          <div className="damage-map__live">
            <span className="damage-map__live-dot" />
            Live API
          </div>

          <button
            className="damage-map__refresh"
            onClick={loadDamageMap}
          >
            <RefreshCw size={13} />
            Refresh
          </button>

        </div>

      </div>

      {/* =================================================
          METRICS
      ================================================= */}

      <div className="damage-map__metrics">

        <MetricCard
          label="Observed"
          value={formatBytes(
            observedBytes
          )}
          tone="cyan"
        />

        <MetricCard
          label="Missing"
          value={formatBytes(
            missingBytes
          )}
          tone="red"
        />

        <MetricCard
          label="Reconstructed"
          value={formatBytes(
            reconstructedBytes
          )}
          tone="green"
        />

        <MetricCard
          label="Completeness"
          value={formatPercent(
            completeness
          )}
          tone="amber"
        />

        <MetricCard
          label="Estimated Original"
          value={formatBytes(
            originalSize
          )}
        />

      </div>

      {/* =================================================
          STORAGE REGION MAP
      ================================================= */}

      <div className="damage-map__section">

        <h3 className="damage-map__section-title">
          Storage Region Map
        </h3>

        <p className="damage-map__section-subtitle">
          Evidence coverage relative to
          the estimated original evidence
          size.
        </p>

        <div className="damage-map__storage">

          <div className="damage-map__storage-track">

            <div className="damage-map__storage-observed" />

            {regions.map(
              (region, index) => {

                const position =
                  getRegionPosition(
                    region,
                    originalSize
                  );

                const start =
                  getStartOffset(
                    region
                  );

                const end =
                  getEndOffset(
                    region
                  );

                const source =
                  String(
                    region?.source ||
                      ""
                  ).toUpperCase();

                return (
                  <div
                    key={
                      region?.region_id ||
                      region?.id ||
                      `region-${index}`
                    }
                    className="damage-map__damage-region"
                    style={{
                      left:
                        `${position.left}%`,
                      width:
                        `${position.width}%`,
                    }}
                    title={
                      `${region?.region_id || `REGION-${index + 1}`}: ` +
                      `${formatNumber(start)} - ` +
                      `${formatNumber(end)}`
                    }
                  >

                    <span
                      className="damage-map__region-label"
                    >
                      MISSING
                    </span>

                    {source ===
                      "GROUND_TRUTH" && (
                      <span
                        className="damage-map__ground-truth-marker"
                      >
                        GT
                      </span>
                    )}

                  </div>
                );
              }
            )}

          </div>

          {/* LEGEND */}

          <div className="damage-map__storage-legend">

            <div className="damage-map__legend-item">
              <span className="damage-map__legend-dot damage-map__legend-dot--observed" />
              Observed evidence
            </div>

            <div className="damage-map__legend-item">
              <span className="damage-map__legend-dot damage-map__legend-dot--missing" />
              Missing / damaged
            </div>

            <div className="damage-map__legend-item">
              <span className="damage-map__legend-dot damage-map__legend-dot--reconstructed" />
              Reconstructed
            </div>

            <div className="damage-map__legend-item">
              <span className="damage-map__legend-dot damage-map__legend-dot--uncertain" />
              Uncertain
            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          DAMAGE REGIONS
      ================================================= */}

      <div className="damage-map__section">

        <div className="damage-map__section-heading">

          <div>
            <h3 className="damage-map__section-title">
              Damage Regions
            </h3>

            <p className="damage-map__section-subtitle">
              Backend-reported regions associated
              with missing or damaged evidence.
            </p>
          </div>

          <span className="damage-map__count">
            {regionCount} region
            {regionCount === 1
              ? ""
              : "s"}
          </span>

        </div>

        {regions.length === 0 && (
          <div className="damage-map__empty">

            <ShieldCheck size={18} />

            <div>

              <strong>
                No supported missing region
              </strong>

              <p>
                No byte range is currently
                identified as missing by
                the available analysis.
                This does not independently
                prove that the evidence is
                complete.
              </p>

            </div>

          </div>
        )}

        {regions.map(
          (region, index) => {

            const start =
              getStartOffset(region);

            const end =
              getEndOffset(region);

            const source =
              String(
                region?.source ||
                  "BACKEND"
              ).toUpperCase();

            const isGroundTruth =
              source ===
              "GROUND_TRUTH";

            return (
              <div
                className="damage-map__region-card"
                key={
                  region?.region_id ||
                  region?.id ||
                  `region-${index}`
                }
              >

                <div className="damage-map__region-header">

                  <div className="damage-map__region-id">
                    {region?.region_id ||
                      `REGION-${index + 1}`}
                  </div>

                  <span className="damage-map__status damage-map__status--missing">
                    {region?.recovery_status ||
                      "MISSING"}
                  </span>

                </div>

                <div className="damage-map__region-body">

                  <div className="damage-map__region-grid">

                    <div className="damage-map__detail">

                      <div className="damage-map__detail-label">
                        Original Start Offset
                      </div>

                      <div className="damage-map__detail-value">
                        {formatNumber(
                          start
                        )}{" "}
                        B
                      </div>

                    </div>

                    <div className="damage-map__detail">

                      <div className="damage-map__detail-label">
                        Original End Offset
                      </div>

                      <div className="damage-map__detail-value">
                        {formatNumber(
                          end
                        )}{" "}
                        B
                      </div>

                    </div>

                    <div className="damage-map__detail">

                      <div className="damage-map__detail-label">
                        Region Size
                      </div>

                      <div className="damage-map__detail-value">
                        {formatBytes(
                          region?.size
                        )}
                      </div>

                    </div>

                    <div className="damage-map__detail">

                      <div className="damage-map__detail-label">
                        Damage Type
                      </div>

                      <div className="damage-map__detail-value">
                        {region?.damage_type ||
                          "UNKNOWN"}
                      </div>

                    </div>

                    <div className="damage-map__detail">

                      <div className="damage-map__detail-label">
                        Evidence Source
                      </div>

                      <div className="damage-map__detail-value">
                        {source}
                      </div>

                    </div>

                    <div className="damage-map__detail">

                      <div className="damage-map__detail-label">
                        Interpretation
                      </div>

                      <div className="damage-map__detail-value">
                        {isGroundTruth
                          ? "CONTROLLED BENCHMARK"
                          : "BACKEND ANALYSIS"}
                      </div>

                    </div>

                  </div>

                  {/* FORENSIC WARNING */}

                  <div className="damage-map__warning">

                    <div className="damage-map__warning-icon">
                      <AlertTriangle
                        size={17}
                      />
                    </div>

                    <p className="damage-map__warning-text">

                      {region?.interpretation ||
                        (
                          isGroundTruth
                            ? "This region comes from controlled benchmark ground truth. It identifies the known damaged range for evaluation and must not be represented as an independently inferred forensic finding."
                            : "This region is reported by the available backend analysis. Its interpretation is limited to the evidence and analysis basis returned by the system."
                        )}

                    </p>

                  </div>

                </div>

              </div>
            );
          }
        )}

      </div>

      {/* =================================================
          RELATED FRAGMENTS
      ================================================= */}

      {regions.map(
        (region, regionIndex) => {

          const fragments =
            Array.isArray(
              region?.related_fragments
            )
              ? region.related_fragments
              : [];

          if (!fragments.length) {
            return null;
          }

          return (
            <div
              className="damage-map__section"
              key={
                `${region?.region_id || regionIndex}-fragments`
              }
            >

              <h3 className="damage-map__section-title">
                Related Fragments
              </h3>

              <p className="damage-map__section-subtitle">
                Fragments surrounding the
                reported region. Proximity
                does not mean that these
                fragments contain the missing
                bytes.
              </p>

              <div className="damage-map__fragments">

                {fragments.map(
                  (
                    fragment,
                    index
                  ) => {

                    const fragmentOffset =
                      Number(
                        fragment?.offset ??
                          0
                      );

                    const fragmentEnd =
                      Number(
                        fragment?.end_offset ??
                          (
                            fragmentOffset +
                            Number(
                              fragment?.size ||
                                0
                            ) -
                            1
                          )
                      );

                    const confidence =
                      Number(
                        fragment?.confidence
                      );

                    return (
                      <div
                        className="damage-map__fragment"
                        key={
                          fragment?.fragment_id ||
                          index
                        }
                      >

                        <div className="damage-map__fragment-id">
                          {fragment?.fragment_id ||
                            `FRAGMENT-${index + 1}`}
                        </div>

                        <div className="damage-map__fragment-range">
                          {formatNumber(
                            fragmentOffset
                          )}

                          {" → "}

                          {formatNumber(
                            fragmentEnd
                          )}
                        </div>

                        <div className="damage-map__fragment-meta">

                          Size:{" "}
                          {formatBytes(
                            fragment?.size
                          )}

                          <br />

                          Type:{" "}
                          {fragment?.probable_type ||
                            "Unknown"}

                          <br />

                          Classification:{" "}
                          {fragment?.classification ||
                            "Unknown"}

                          <br />

                          Fragment confidence:{" "}
                          {Number.isFinite(
                            confidence
                          )
                            ? `${(
                                confidence *
                                100
                              ).toFixed(0)}%`
                            : "—"}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </div>
          );
        }
      )}

      {/* =================================================
          FORENSIC FOOTER
      ================================================= */}

      <div className="damage-map__footer">

        <span>
          <Database
            size={12}
            style={{
              verticalAlign:
                "middle",
            }}
          />{" "}
          Evidence size:{" "}
          <strong>
            {formatBytes(
              originalSize
            )}
          </strong>
        </span>

        <span>
          <FileWarning
            size={12}
            style={{
              verticalAlign:
                "middle",
            }}
          />{" "}
          Regions:{" "}
          <strong>
            {regionCount}
          </strong>
        </span>

        <span>
          <Activity
            size={12}
            style={{
              verticalAlign:
                "middle",
            }}
          />{" "}
          Observed:{" "}
          <strong>
            {formatBytes(
              observedBytes
            )}
          </strong>
        </span>

        <span>
          <ShieldCheck
            size={12}
            style={{
              verticalAlign:
                "middle",
            }}
          />{" "}

          {regions.some(
            (region) =>
              String(
                region?.source ||
                  ""
              ).toUpperCase() ===
              "GROUND_TRUTH"
          )
            ? "Controlled benchmark data clearly labeled"
            : "No ground-truth metadata applied"}

        </span>

      </div>

    </section>
  );
}