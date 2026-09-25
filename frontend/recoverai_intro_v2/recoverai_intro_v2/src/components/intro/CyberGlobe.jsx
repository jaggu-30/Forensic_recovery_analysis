import React, { useMemo, useRef } from "react";
import { Line, Points, PointMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GREEN = "#047857";
const EMERALD = "#10B981";
const BLUE = "#2563EB";
const CYAN = "#06B6D4";

function latLon(lat, lon, radius = 1.82) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

// Deliberately simplified continent silhouettes. They are used as 3D line geometry,
// not as a flat image texture, so the globe remains genuinely three-dimensional.
const land = {
  northAmerica: [
    [72,-168],[70,-145],[67,-128],[60,-140],[55,-130],[49,-124],[45,-117],[40,-110],[31,-106],[25,-98],[18,-92],[15,-84],[24,-81],[31,-80],[39,-74],[47,-66],[54,-60],[60,-64],[64,-74],[69,-82],[73,-95],[75,-110],[74,-130],[72,-168]
  ],
  southAmerica: [
    [12,-81],[7,-77],[2,-78],[-5,-75],[-12,-72],[-20,-70],[-28,-69],[-37,-67],[-47,-66],[-54,-69],[-52,-61],[-43,-57],[-32,-53],[-20,-50],[-8,-48],[2,-50],[8,-57],[12,-68],[12,-81]
  ],
  europeAsia: [
    [71,-10],[72,10],[70,28],[68,45],[69,65],[72,88],[69,108],[63,126],[58,139],[51,145],[43,141],[37,132],[31,121],[25,114],[20,105],[22,96],[27,86],[31,76],[28,66],[34,55],[40,48],[45,38],[46,28],[52,19],[55,8],[60,0],[66,-7],[71,-10]
  ],
  africa: [
    [37,-17],[35,-5],[32,8],[28,20],[20,31],[11,39],[2,42],[-8,40],[-18,36],[-27,30],[-35,20],[-34,8],[-28,-2],[-18,-8],[-7,-14],[4,-17],[18,-18],[29,-16],[37,-17]
  ],
  australia: [
    [-11,113],[-18,122],[-25,130],[-34,137],[-39,147],[-37,153],[-29,153],[-20,149],[-14,141],[-11,130],[-11,113]
  ],
  japan: [[45,141],[39,143],[34,138],[31,135],[35,132],[40,135],[45,141]],
};

function Continent({ points, color = GREEN }) {
  const positions = points.map(([lat, lon]) => latLon(lat, lon, 1.835));
  return <Line points={positions} color={color} lineWidth={1.8} transparent opacity={0.95} />;
}

function GridRing({ lat }) {
  const points = useMemo(() => {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) pts.push(latLon(lat, lon, 1.825));
    return pts;
  }, [lat]);
  return <Line points={points} color={lat === 0 ? CYAN : "#0ea5a055"} lineWidth={lat === 0 ? 1.25 : 0.55} transparent opacity={0.52} />;
}

function Meridian({ lon }) {
  const points = useMemo(() => {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 4) pts.push(latLon(lat, lon, 1.826));
    return pts;
  }, [lon]);
  return <Line points={points} color="#2563eb66" lineWidth={0.55} transparent opacity={0.42} />;
}

function DataPoints() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = [];
    let seed = 17;
    for (let i = 0; i < 240; i += 1) {
      seed = (seed * 9301 + 49297) % 233280;
      const lat = (seed / 233280) * 150 - 75;
      seed = (seed * 9301 + 49297) % 233280;
      const lon = (seed / 233280) * 360 - 180;
      arr.push(latLon(lat, lon, 1.84));
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.025;
  });

  return (
    <group ref={ref}>
      <Points positions={positions} stride={3} limit={positions.length}>
        <PointMaterial transparent color={CYAN} size={0.018} sizeAttenuation depthWrite={false} opacity={0.7} />
      </Points>
    </group>
  );
}

function ScanArc({ rotation = [0, 0, 0], color = CYAN }) {
  const pts = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 80; i += 1) {
      const a = -Math.PI * 0.34 + (Math.PI * 0.68 * i) / 80;
      arr.push([Math.cos(a) * 2.0, Math.sin(a) * 2.0, 0]);
    }
    return arr;
  }, []);
  return <Line points={pts} rotation={rotation} color={color} lineWidth={2.2} transparent opacity={0.65} />;
}

export default function CyberGlobe({ progress = 0 }) {
  const group = useRef();
  const shell = useRef();
  const scatter = Math.max(0, Math.min(1, (progress - 0.28) / 0.44));

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.06 + progress * 0.8;
    group.current.rotation.x = Math.sin(clock.elapsedTime * 0.18) * 0.025;
    const scale = 1 - scatter * 0.16;
    group.current.scale.setScalar(scale);
    group.current.position.y = scatter * 0.28;
    if (shell.current) shell.current.material.opacity = 0.98 - scatter * 0.9;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1.82, 96, 64]} />
        <meshPhysicalMaterial
          ref={shell}
          color="#eaf8f5"
          roughness={0.42}
          metalness={0.08}
          transmission={0.04}
          transparent
          opacity={0.98}
        />
      </mesh>

      {[0, 30, -30, 60, -60].map((lat) => <GridRing key={lat} lat={lat} />)}
      {[0, 30, 60, 90, 120, 150].map((lon) => <Meridian key={lon} lon={lon} />)}

      <group>
        <Continent points={land.northAmerica} color={BLUE} />
        <Continent points={land.southAmerica} color={CYAN} />
        <Continent points={land.europeAsia} color={GREEN} />
        <Continent points={land.africa} color={EMERALD} />
        <Continent points={land.australia} color={BLUE} />
        <Continent points={land.japan} color={CYAN} />
      </group>

      <DataPoints />
      <ScanArc rotation={[0.2, 0.5, 0.25]} color={CYAN} />
      <ScanArc rotation={[1.05, -0.8, -0.15]} color={EMERALD} />

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.12, 0.008, 8, 180]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[2.08, 0.007, 8, 180]} />
        <meshBasicMaterial color={GREEN} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
