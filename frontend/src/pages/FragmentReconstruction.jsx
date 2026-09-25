import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  Line,
  Text,
  Stars,
  ContactShadows,
} from "@react-three/drei";
import { ShieldCheck, MousePointer2, Rotate3D } from "lucide-react";

import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { fragments, relationships } from "../data/demoData";

/* -------------------------------------------------------
   FORENSIC STATE COLORS
------------------------------------------------------- */

const STATE_COLORS = {
  Verified: {
    main: "#22c55e",
    emissive: "#16a34a",
    glow: "#4ade80",
  },

  Reconstructed: {
    main: "#38bdf8",
    emissive: "#0284c7",
    glow: "#7dd3fc",
  },

  "Structural Repair": {
    main: "#06b6d4",
    emissive: "#0891b2",
    glow: "#67e8f9",
  },

  "Plausible Reconstruction": {
    main: "#f59e0b",
    emissive: "#d97706",
    glow: "#fbbf24",
  },

  "AI-Inferred Reconstruction": {
    main: "#a78bfa",
    emissive: "#7c3aed",
    glow: "#c4b5fd",
  },

  "Insufficient Evidence": {
    main: "#ef4444",
    emissive: "#b91c1c",
    glow: "#f87171",
  },
};

/* -------------------------------------------------------
   3D FRAGMENT NODE
------------------------------------------------------- */

function FragmentNode({
  position,
  fragment,
  selected,
  onClick,
}) {
  const state =
    STATE_COLORS[fragment.state] ||
    STATE_COLORS.Reconstructed;

  const radius = selected ? 0.27 : 0.20;

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Float
        speed={selected ? 1.8 : 1.15}
        rotationIntensity={selected ? 0.25 : 0.12}
        floatIntensity={selected ? 0.35 : 0.18}
      >
        {/* Outer glow sphere */}
        <mesh>
          <sphereGeometry
            args={[radius * 1.18, 32, 32]}
          />

          <meshBasicMaterial
            color={state.glow}
            transparent
            opacity={selected ? 0.10 : 0.035}
          />
        </mesh>

        {/* Main forensic sphere */}
        <mesh castShadow receiveShadow>
          <sphereGeometry
            args={[radius, 32, 32]}
          />

          <meshPhysicalMaterial
            color={state.main}
            emissive={state.emissive}
            emissiveIntensity={selected ? 1.8 : 0.55}
            roughness={0.20}
            metalness={0.35}
            clearcoat={1}
            clearcoatRoughness={0.12}
          />
        </mesh>

        {/* Technical outer ring */}
        <mesh
          rotation={[
            Math.PI * 0.45,
            Math.PI * 0.2,
            Math.PI * 0.15,
          ]}
        >
          <torusGeometry
            args={[
              radius * 1.30,
              selected ? 0.014 : 0.008,
              8,
              48,
            ]}
          />

          <meshBasicMaterial
            color={state.glow}
            transparent
            opacity={selected ? 0.85 : 0.32}
          />
        </mesh>

        {/* Selection ring */}
        {selected && (
          <mesh
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
          >
            <torusGeometry
              args={[
                radius * 1.52,
                0.018,
                8,
                64,
              ]}
            />

            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.9}
            />
          </mesh>
        )}
      </Float>

      {/* Fragment label */}
      <Text
        position={[0, radius + 0.25, 0]}
        fontSize={0.105}
        color="#dbeafe"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#020617"
      >
        {fragment.id}
      </Text>

      {/* Confidence underneath */}
      <Text
        position={[0, -(radius + 0.18), 0]}
        fontSize={0.065}
        color={selected ? "#7dd3fc" : "#64748b"}
        anchorX="center"
        anchorY="middle"
      >
        {fragment.confidence}%
      </Text>
    </group>
  );
}

/* -------------------------------------------------------
   RELATIONSHIP EDGE
------------------------------------------------------- */

function RelationshipEdge({
  start,
  end,
  confidence,
}) {
  const strong = confidence >= 0.85;

  return (
    <>
      <Line
        points={[start, end]}
        color={strong ? "#38bdf8" : "#334155"}
        lineWidth={strong ? 1.7 : 0.8}
        transparent
        opacity={strong ? 0.78 : 0.42}
      />

      {strong && (
        <Line
          points={[start, end]}
          color="#0ea5e9"
          lineWidth={0.35}
          transparent
          opacity={0.35}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------
   3D GRAPH
------------------------------------------------------- */

function Graph3D({
  selected,
  setSelected,
}) {
  const points = useMemo(() => {
    const radiusX = 2.35;
    const radiusY = 1.55;

    return fragments
      .slice(0, 12)
      .map((fragment, index) => {
        const angle =
          (index / 12) * Math.PI * 2;

        const layer =
          index % 3;

        const z =
          Math.sin(index * 1.72) * 0.75 +
          (layer - 1) * 0.18;

        return [
          Math.cos(angle) * radiusX,
          Math.sin(angle) * radiusY,
          z,
        ];
      });
  }, []);

  const graphRelationships = useMemo(() => {
    return relationships
      .slice(0, 12)
      .map(([a, b, confidence]) => {
        const ai =
          parseInt(a.replace("FR-", ""), 10) - 1;

        const bi =
          parseInt(b.replace("FR-", ""), 10) - 1;

        if (
          ai < 0 ||
          bi < 0 ||
          ai >= points.length ||
          bi >= points.length
        ) {
          return null;
        }

        return {
          id: `${a}-${b}`,
          start: points[ai],
          end: points[bi],
          confidence,
        };
      })
      .filter(Boolean);
  }, [points]);

  return (
    <div className="graph-3d forensic-graph">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: [0, 0.25, 6.4],
          fov: 42,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        {/* Deep forensic background */}
        <color
          attach="background"
          args={["#020812"]}
        />

        {/* Ambient illumination */}
        <ambientLight intensity={0.35} />

        {/* Main cyan key light */}
        <pointLight
          position={[3.5, 3.5, 4]}
          intensity={16}
          distance={12}
          color="#38bdf8"
        />

        {/* Green verification light */}
        <pointLight
          position={[-4, -2, 3]}
          intensity={8}
          distance={10}
          color="#22c55e"
        />

        {/* Soft white rim */}
        <directionalLight
          position={[0, 5, 5]}
          intensity={2.5}
          color="#e0f2fe"
          castShadow
        />

        {/* Very subtle star/depth field */}
        <Stars
          radius={15}
          depth={8}
          count={90}
          factor={1.1}
          saturation={0}
          fade
          speed={0.15}
        />

        {/* Relationship network */}
        {graphRelationships.map((edge) => (
          <RelationshipEdge
            key={edge.id}
            start={edge.start}
            end={edge.end}
            confidence={edge.confidence}
          />
        ))}

        {/* Fragment nodes */}
        {fragments
          .slice(0, 12)
          .map((fragment, index) => (
            <FragmentNode
              key={fragment.id}
              position={points[index]}
              fragment={fragment}
              selected={selected === index}
              onClick={() =>
                setSelected(index)
              }
            />
          ))}

        {/* Ground shadow */}
        <ContactShadows
          position={[0, -2.25, 0]}
          opacity={0.22}
          scale={9}
          blur={2.8}
          far={5}
        />

        {/* Camera controls */}
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.055}
          minDistance={4.5}
          maxDistance={9}
          rotateSpeed={0.55}
          zoomSpeed={0.65}
        />
      </Canvas>

      {/* Graph information overlay */}
      <div className="graph-overlay forensic-overlay">
        <div className="graph-help">
          <Rotate3D size={14} />
          <span>Drag to orbit</span>
        </div>

        <div className="graph-help">
          <MousePointer2 size={14} />
          <span>Select fragment</span>
        </div>

        <div className="graph-help">
          <span className="zoom-symbol">+</span>
          <span>Scroll to zoom</span>
        </div>
      </div>

      <div className="graph-status">
        <span />
        LIVE RELATIONSHIP MODEL
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   MAIN PAGE
------------------------------------------------------- */

export default function FragmentReconstruction() {
  const [selected, setSelected] =
    useState(0);

  const selectedFragment =
    fragments[selected];

  return (
    <div className="fragment-reconstruction-page">

      {/* PAGE HEADER */}
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            FRAGMENT INTELLIGENCE
          </span>

          <h2>
            Fragment Reconstruction
          </h2>

          <p>
            Analyze fragment relationships,
            structural compatibility and
            reconstruction confidence in
            three-dimensional evidence space.
          </p>
        </div>

        <div className="reconstruction-header-meta">
          <div className="relationship-counter">
            <span className="counter-dot" />
            126 RELATIONSHIPS
          </div>

          <Badge tone="info">
            3D FORENSIC MODEL
          </Badge>
        </div>
      </div>

      {/* MAIN RECONSTRUCTION AREA */}
      <div className="recon-grid">

        {/* 3D GRAPH */}
        <Card className="graph-card">

          <div className="card-title">
            <div>
              <span>
                3D Fragment Relationship Graph
              </span>

              <small className="graph-subtitle">
                Structural + byte-pattern
                relationship analysis
              </small>
            </div>

            <span className="live-label">
              <i />
              INTERACTIVE
            </span>
          </div>

          <Graph3D
            selected={selected}
            setSelected={setSelected}
          />

        </Card>

        {/* RIGHT INFORMATION PANEL */}
        <div className="side-stack">

          {/* SELECTED FRAGMENT */}
          <Card>

            <div className="card-title">
              <span>
                Selected Fragment
              </span>

              <ShieldCheck
                size={17}
                className="selected-shield"
              />
            </div>

            <div className="fragment-id">
              {selectedFragment.id}
            </div>

            <div className="fragment-state-row">
              <span
                className={`state-indicator ${
                  selectedFragment.state ===
                  "Verified"
                    ? "verified"
                    : "reconstructed"
                }`}
              />

              <span>
                {selectedFragment.state}
              </span>
            </div>

            <div className="metric-line">
              <span>Probable type</span>
              <b>
                {selectedFragment.type}
              </b>
            </div>

            <div className="metric-line">
              <span>Offset</span>
              <b>
                {selectedFragment.offset}
              </b>
            </div>

            <div className="metric-line">
              <span>Size</span>
              <b>
                {selectedFragment.size}
              </b>
            </div>

            <div className="metric-line">
              <span>Entropy</span>
              <b>
                {selectedFragment.entropy}
              </b>
            </div>

            <div className="metric-line">
              <span>
                Relationship confidence
              </span>

              <b className="confidence-value">
                {selectedFragment.confidence}%
              </b>
            </div>

            <div className="fragment-confidence-bar">
              <span
                style={{
                  width: `${selectedFragment.confidence}%`,
                }}
              />
            </div>

            <Badge
              tone={
                selectedFragment.state ===
                "Verified"
                  ? "success"
                  : "warning"
              }
            >
              {selectedFragment.state.toUpperCase()}
            </Badge>

          </Card>

          {/* RECONSTRUCTION CLASSES */}
          <Card>

            <div className="card-title">
              <span>
                Reconstruction Classes
              </span>
            </div>

            <div className="class-list">

              {[
                [
                  "Verified Recovery",
                  "c0",
                ],
                [
                  "Structural Repair",
                  "c1",
                ],
                [
                  "Plausible Reconstruction",
                  "c2",
                ],
                [
                  "AI-Inferred Reconstruction",
                  "c3",
                ],
                [
                  "Insufficient Evidence",
                  "c4",
                ],
              ].map(([label, className]) => (
                <div
                  className="class-row"
                  key={label}
                >
                  <span
                    className={`class-dot ${className}`}
                  />

                  <span>
                    {label}
                  </span>
                </div>
              ))}

            </div>

          </Card>

        </div>
      </div>

      {/* FRAGMENT CONTRIBUTION */}
      <Card className="contribution-card">

        <div className="card-title">

          <div>
            <span>
              Fragment Contribution
            </span>

            <small className="graph-subtitle">
              Contribution to reconstructed
              evidence
            </small>
          </div>

          <span className="muted">
            Selected file:
            {" "}
            <b>IMG_4821.jpg</b>
          </span>

        </div>

        <div className="contribution">

          <div className="contribution-track">

            {fragments
              .slice(0, 5)
              .map((fragment, index) => {

                const percentages = [
                  28,
                  22,
                  19,
                  17,
                  14,
                ];

                return (
                  <div
                    key={fragment.id}
                    className={`contribution-segment segment-${index}`}
                    style={{
                      width: `${percentages[index]}%`,
                    }}
                    title={`${fragment.id}: ${percentages[index]}% contribution`}
                  >
                    <span>
                      {fragment.id}
                    </span>

                    <b>
                      {percentages[index]}%
                    </b>
                  </div>
                );
              })}

          </div>

          <div className="contribution-legend">

            {fragments
              .slice(0, 5)
              .map((fragment, index) => {

                const percentages = [
                  28,
                  22,
                  19,
                  17,
                  14,
                ];

                return (
                  <span
                    key={fragment.id}
                  >
                    <i
                      className={`swatch s${index}`}
                    />

                    {fragment.id}
                    {" · "}
                    {percentages[index]}%
                  </span>
                );
              })}

          </div>

        </div>

      </Card>

    </div>
  );
}