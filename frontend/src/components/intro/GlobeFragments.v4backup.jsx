import React, { useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const items = [
  ["01", "OVERVIEW", "/", "#06b6d4"],
  ["02", "DASHBOARD", "/dashboard", "#2563eb"],
  ["03", "INVESTIGATION", "/investigation/new", "#10b981"],
  ["04", "ANALYSIS", "/analysis", "#06b6d4"],
  ["05", "RECONSTRUCTION", "/reconstruction", "#10b981"],
  ["06", "EVIDENCE", "/evidence", "#2563eb"],
  ["07", "REPORT", "/report", "#10b981"],
];

const starts = [
  [-1.45, 1.15, 1.55], [-0.35, 1.6, 1.75], [0.85, 1.15, 1.65],
  [-1.55, 0.0, 1.85], [1.45, 0.05, 1.8], [-0.85, -1.15, 1.65], [0.65, -1.2, 1.6]
];

const targets = [
  [-4.55, 3.05, 0.35], [-3.0, 3.05, 0.35], [-1.35, 3.05, 0.35],
  [0.25, 3.05, 0.35], [2.0, 3.05, 0.35], [3.5, 3.05, 0.35], [4.8, 3.05, 0.35]
];

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function FragmentCluster({ item, index, progress, navigate }) {
  const group = useRef();
  const [num, label, path, color] = item;
  const pieces = useMemo(() => {
    const r = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      r.push([
        Math.cos(a) * (0.13 + (i % 3) * 0.035),
        Math.sin(a * 1.4) * 0.12,
        Math.sin(a) * (0.13 + (i % 2) * 0.04),
      ]);
    }
    return r;
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;
    const delay = index * 0.045;
    const t = smooth(THREE.MathUtils.clamp((progress - 0.18 - delay) / 0.62, 0, 1));
    const x = THREE.MathUtils.lerp(starts[index][0], targets[index][0], t);
    const y = THREE.MathUtils.lerp(starts[index][1], targets[index][1], t);
    const z = THREE.MathUtils.lerp(starts[index][2], targets[index][2], t);

    group.current.position.x += (x - group.current.position.x) * Math.min(1, delta * 9);
    group.current.position.y += (y - group.current.position.y) * Math.min(1, delta * 9);
    group.current.position.z += (z - group.current.position.z) * Math.min(1, delta * 9);
    group.current.rotation.y += delta * (0.45 + index * 0.05);
    group.current.rotation.x += delta * 0.2;

    const s = THREE.MathUtils.lerp(0.15, 0.88, t);
    group.current.scale.setScalar(s);
  });

  return (
    <group ref={group} position={starts[index]} onClick={() => navigate(path)}>
      {pieces.map((p, i) => (
        <mesh key={i} position={p} rotation={[i * 0.6, i * 0.8, i * 0.35]}>
          <icosahedronGeometry args={[0.24 + (i % 3) * 0.025, 1]} />
          <meshStandardMaterial color="#06131b" emissive={color} emissiveIntensity={1.5} metalness={0.85} roughness={0.22} />
        </mesh>
      ))}
      <mesh scale={1.28}>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.65} />
      </mesh>
      <Text
        position={[0, 0.72, 0]}
        fontSize={0.16}
        color="#dffefa"
        anchorX="center"
        outlineColor="#01080c"
        outlineWidth={0.018}
      >
        {num} · {label}
      </Text>
    </group>
  );
}

export default function GlobeFragments({ progress, navigate }) {
  return (
    <group>
      {items.map((item, i) => (
        <FragmentCluster key={item[0]} item={item} index={i} progress={progress} navigate={navigate} />
      ))}
    </group>
  );
}
