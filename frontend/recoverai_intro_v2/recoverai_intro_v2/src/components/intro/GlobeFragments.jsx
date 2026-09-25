import React, { useMemo, useRef } from "react";
import { Float, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLORS = ["#2563EB", "#06B6D4", "#047857", "#10B981"];

function seeded(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function GlobeFragments({ progress = 0 }) {
  const group = useRef();
  const amount = Math.max(0, Math.min(1, (progress - 0.25) / 0.48));
  const items = useMemo(() => Array.from({ length: 86 }, (_, i) => {
    const u = seeded(i + 2) * 2 - 1;
    const a = seeded(i + 17) * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const base = new THREE.Vector3(1.9 * r * Math.cos(a), 1.9 * u, 1.9 * r * Math.sin(a));
    const dir = base.clone().normalize();
    const distance = 1.1 + seeded(i + 43) * 2.4;
    const target = base.clone().add(dir.multiplyScalar(distance));
    return { base, target, size: 0.035 + seeded(i + 71) * 0.075, color: COLORS[i % COLORS.length], phase: seeded(i + 101) * Math.PI * 2 };
  }), []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.02;
  });

  return (
    <group ref={group}>
      {items.map((item, i) => {
        const eased = amount * amount * (3 - 2 * amount);
        const p = item.base.clone().lerp(item.target, eased);
        p.y += Math.sin(clockless(i) + item.phase) * 0.035 * eased;
        return (
          <Float key={i} speed={0.9 + (i % 5) * 0.1} rotationIntensity={0.7} floatIntensity={0.35}>
            <mesh position={p} rotation={[seeded(i) * 2, seeded(i + 9) * 2, seeded(i + 21) * 2]}>
              <icosahedronGeometry args={[item.size, 0]} />
              <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={amount > 0.55 ? 1.5 : 0.65} roughness={0.3} metalness={0.25} />
            </mesh>
          </Float>
        );
      })}
      {amount > 0.2 && (
        <Line points={[[0, 0, 0], [0, 0, 3.7]]} color="#06B6D4" transparent opacity={0.18 * amount} lineWidth={1} />
      )}
    </group>
  );
}

function clockless(i) {
  return i * 0.7;
}
