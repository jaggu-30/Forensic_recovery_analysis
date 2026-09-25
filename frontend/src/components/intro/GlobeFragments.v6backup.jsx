import React, { useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const items = [
  ["01", "OVERVIEW", "/", "#22d3ee"],
  ["02", "DASHBOARD", "/dashboard", "#3b82f6"],
  ["03", "INVESTIGATION", "/investigation/new", "#10b981"],
  ["04", "ANALYSIS", "/analysis", "#22d3ee"],
  ["05", "RECONSTRUCTION", "/reconstruction", "#10b981"],
  ["06", "EVIDENCE", "/evidence", "#3b82f6"],
  ["07", "REPORT", "/report", "#10b981"],
];

const starts = [
  [-1.5,1.2,1.6],[-0.55,1.62,1.7],[0.5,1.25,1.65],[-1.65,0.15,1.8],[1.6,0.15,1.8],[-0.8,-1.1,1.7],[0.72,-1.12,1.65]
];

const targets = [
  [-5.15,-1.35,0.15],[-3.45,-1.35,0.18],[-1.72,-1.35,0.2],[0,-1.35,0.25],[1.78,-1.35,0.2],[3.52,-1.35,0.18],[5.18,-1.35,0.15]
];

function ease(t){ return t*t*(3-2*t); }

function NavNode({ item, index, progress, navigate }) {
  const group = useRef();
  const [num,label,path,color] = item;
  const seed = index * 1.7;
  const pieces = useMemo(() => Array.from({length: 12}, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const radius = 0.16 + (i % 3) * 0.028;
    return [Math.cos(a) * radius, Math.sin(a * 1.4) * 0.12, Math.sin(a) * radius];
  }), []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const delay = index * 0.035;
    const t = ease(THREE.MathUtils.clamp((progress - 0.14 - delay) / 0.62, 0, 1));
    const x = THREE.MathUtils.lerp(starts[index][0], targets[index][0], t);
    const y = THREE.MathUtils.lerp(starts[index][1], targets[index][1], t);
    const z = THREE.MathUtils.lerp(starts[index][2], targets[index][2], t);
    group.current.position.x += (x - group.current.position.x) * Math.min(1, delta * 10);
    group.current.position.y += (y - group.current.position.y) * Math.min(1, delta * 10);
    group.current.position.z += (z - group.current.position.z) * Math.min(1, delta * 10);
    const assigned = t > 0.93;
    group.current.rotation.y += delta * (assigned ? 0.9 : 0.34 + index * 0.03);
    group.current.rotation.x += delta * (assigned ? 0.35 : 0.12);
    group.current.rotation.z += delta * 0.08;
    const s = THREE.MathUtils.lerp(0.08, 0.74, t);
    group.current.scale.setScalar(s);
  });

  const assigned = progress > 0.84;
  return (
    <group ref={group} position={starts[index]} onClick={() => navigate(path)}>
      <mesh>
        <icosahedronGeometry args={[0.72, 2]} />
        <meshPhysicalMaterial color="#06121a" emissive={color} emissiveIntensity={assigned ? 2.3 : 1.1} metalness={0.86} roughness={0.2} transmission={0.12} transparent opacity={0.92} />
      </mesh>
      <mesh scale={1.02}>
        <icosahedronGeometry args={[0.74, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[Math.PI/2,0,0]} position={[0,-0.78,0]}>
        <torusGeometry args={[0.66,0.025,8,64]} />
        <meshBasicMaterial color={color} transparent opacity={0.78} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI/2,0,0]} position={[0,-0.78,0]}>
        <torusGeometry args={[0.84,0.008,8,64]} />
        <meshBasicMaterial color={color} transparent opacity={0.42} blending={THREE.AdditiveBlending} />
      </mesh>
      {pieces.map((p,i)=><mesh key={i} position={p}>
        <icosahedronGeometry args={[0.13 + (i%2)*0.025, 0]} />
        <meshBasicMaterial color={i%3===0 ? "#dffcff" : color} transparent opacity={assigned ? 0.62 : 0.28} blending={THREE.AdditiveBlending} />
      </mesh>)}
      <Text position={[0,-1.12,0]} fontSize={0.17} color="#e9fffb" anchorX="center" anchorY="middle" outlineColor="#001015" outlineWidth={0.025}>{num}</Text>
      <Text position={[0,-1.35,0]} fontSize={0.16} color={color} anchorX="center" anchorY="middle" outlineColor="#001015" outlineWidth={0.02}>{label}</Text>
      {assigned && <Text position={[0,1.1,0]} fontSize={0.08} color="#8eddd2" anchorX="center" anchorY="middle">SECTION {num}</Text>}
    </group>
  );
}

export default function GlobeFragments({ progress, navigate }) {
  return <group>{items.map((item,i)=><NavNode key={item[0]} item={item} index={i} progress={progress} navigate={navigate} />)}</group>;
}
