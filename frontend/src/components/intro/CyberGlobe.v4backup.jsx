import React, { useMemo, useRef } from "react";
import { Line, Points, PointMaterial, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GREEN = "#10b981";
const BLUE = "#2563eb";
const CYAN = "#06b6d4";

function ll(lat, lon, radius = 2.22) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function Atmosphere() {
  return (
    <>
      <mesh scale={1.035}>
        <sphereGeometry args={[2.2, 96, 96]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[2.2, 96, 96]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.045} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function DataPoints() {
  const ref = useRef();
  const points = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 480; i++) {
      const lat = -72 + ((i * 29) % 144);
      const lon = -180 + ((i * 67) % 360);
      arr.push(ll(lat, lon, 2.235));
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.045;
  });

  return (
    <group ref={ref}>
      <Points positions={points.flatMap(p => p.toArray())} stride={3}>
        <PointMaterial transparent color="#67e8f9" size={0.018} sizeAttenuation depthWrite={false} opacity={0.65} />
      </Points>
    </group>
  );
}

function Grid() {
  const lines = [];
  for (let lat = -60; lat <= 60; lat += 20) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) pts.push(ll(lat, lon, 2.225));
    lines.push(
      <Line key={`lat-${lat}`} points={pts} color={CYAN} transparent opacity={0.13} lineWidth={0.6} />
    );
  }

  for (let lon = -180; lon < 180; lon += 20) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 4) pts.push(ll(lat, lon, 2.225));
    lines.push(
      <Line key={`lon-${lon}`} points={pts} color={GREEN} transparent opacity={0.11} lineWidth={0.6} />
    );
  }

  return <>{lines}</>;
}

function OrbitRings() {
  return (
    <group rotation={[0.35, 0.1, 0.18]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.72, 0.013, 8, 180]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.52} />
      </mesh>
      <mesh rotation={[0.15, Math.PI / 2.7, 0.55]}>
        <torusGeometry args={[2.86, 0.009, 8, 180]} />
        <meshBasicMaterial color={GREEN} transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[-0.35, 0.4, 0]}>
        <torusGeometry args={[2.98, 0.006, 8, 180]} />
        <meshBasicMaterial color={BLUE} transparent opacity={0.32} />
      </mesh>
    </group>
  );
}

function ScanArc() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.55;
  });
  return (
    <group ref={ref} rotation={[0.35, 0.25, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.36, 0.018, 8, 100, Math.PI * 0.42]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

export default function CyberGlobe({ progress }) {
  const group = useRef();
  const texture = useTexture("/assets/cyber-earth-texture.png");

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (0.055 + progress * 0.16);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, progress * 0.16, 0.035);
    const scale = THREE.MathUtils.lerp(1.0, 0.88, THREE.MathUtils.smoothstep(progress, 0.05, 0.58));
    group.current.scale.setScalar(scale);
  });

  const landOpacity = THREE.MathUtils.lerp(0.98, 0.68, progress);

  return (
    <group ref={group} position={[0, -0.1, 0]}>
      <mesh>
        <sphereGeometry args={[2.2, 128, 128]} />
        <meshStandardMaterial
          map={texture}
          color="#123340"
          emissive="#073b3c"
          emissiveIntensity={0.48}
          metalness={0.62}
          roughness={0.34}
          transparent
          opacity={landOpacity}
        />
      </mesh>

      <mesh scale={1.008}>
        <sphereGeometry args={[2.2, 128, 128]} />
        <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.075} />
      </mesh>

      <Grid />
      <DataPoints />
      <OrbitRings />
      <ScanArc />
      <Atmosphere />

      <pointLight position={[2.7, 2.5, 4]} color={CYAN} intensity={13} distance={9} />
      <pointLight position={[-3, -1.8, 2]} color={GREEN} intensity={10} distance={8} />
    </group>
  );
}
