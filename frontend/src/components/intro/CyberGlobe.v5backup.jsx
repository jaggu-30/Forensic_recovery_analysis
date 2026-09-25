import React, { useMemo, useRef } from "react";
import { Line, Points, PointMaterial, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GREEN = "#10b981";
const BLUE = "#2563eb";
const CYAN = "#22d3ee";

function ll(lat, lon, radius = 2.2) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function Atmosphere({ progress }) {
  const opacity = THREE.MathUtils.lerp(0.18, 0.08, progress);
  return (
    <>
      <mesh scale={1.035}>
        <sphereGeometry args={[2.2, 96, 96]} />
        <meshBasicMaterial color={CYAN} transparent opacity={opacity} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh scale={1.065}>
        <sphereGeometry args={[2.2, 96, 96]} />
        <meshBasicMaterial color={GREEN} transparent opacity={0.055} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}

function DigitalLand({ texture, progress }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: texture },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalWorld;
      void main(){
        vUv = uv;
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormalWorld;
      void main(){
        vec4 tex = texture2D(uMap, vUv);
        float lum = dot(tex.rgb, vec3(0.2126,0.7152,0.0722));
        float signal = smoothstep(0.10, 0.30, lum);
        float detail = smoothstep(0.16, 0.55, lum);
        vec3 cyber = mix(vec3(0.03,0.42,0.55), vec3(0.08,0.92,0.63), clamp(vUv.x * 0.75 + 0.18,0.0,1.0));
        float scan = 0.82 + 0.18 * sin((vUv.y * 95.0) + uTime * 1.7);
        vec3 color = cyber * scan;
        float alpha = signal * (0.30 + detail * 0.90) * uOpacity;
        if(alpha < 0.035) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  }), [texture]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uOpacity.value = THREE.MathUtils.lerp(1.0, 0.68, progress);
  });

  return (
    <mesh scale={1.006}>
      <sphereGeometry args={[2.2, 128, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function BaseSphere() {
  return (
    <mesh>
      <sphereGeometry args={[2.2, 128, 128]} />
      <meshStandardMaterial
        color="#020b12"
        roughness={0.68}
        metalness={0.78}
        emissive="#021d25"
        emissiveIntensity={0.85}
      />
    </mesh>
  );
}

function NetworkPoints() {
  const ref = useRef();
  const points = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 720; i++) {
      const lat = -72 + ((i * 37) % 144);
      const lon = -180 + ((i * 71) % 360);
      arr.push(ll(lat, lon, 2.225));
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.018;
  });

  return (
    <group ref={ref}>
      <Points positions={points.flatMap((p) => p.toArray())} stride={3}>
        <PointMaterial transparent color="#67e8f9" size={0.014} sizeAttenuation depthWrite={false} opacity={0.58} blending={THREE.AdditiveBlending} />
      </Points>
    </group>
  );
}

function Grid() {
  const lines = [];
  for (let lat = -60; lat <= 60; lat += 15) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 3) pts.push(ll(lat, lon, 2.218));
    lines.push(<Line key={`lat-${lat}`} points={pts} color={CYAN} transparent opacity={0.08} lineWidth={0.45} />);
  }
  for (let lon = -180; lon < 180; lon += 15) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 3) pts.push(ll(lat, lon, 2.218));
    lines.push(<Line key={`lon-${lon}`} points={pts} color={GREEN} transparent opacity={0.065} lineWidth={0.45} />);
  }
  return <>{lines}</>;
}

function ConnectionLines() {
  const connections = useMemo(() => {
    const pairs = [
      [-20, -55, 25, 5], [5, -45, 25, 40], [25, 40, 35, 110],
      [35, 110, 5, 120], [5, 120, -25, 135], [-25, 135, -35, 150],
      [15, 75, 35, 105], [-5, 45, 15, 75], [45, -5, 35, 105],
      [0, -75, 35, -5],
    ];
    return pairs.map(([a,b,c,d], i) => (
      <Line key={i} points={[ll(a,b,2.238), ll(c,d,2.238)]} color={i % 2 ? GREEN : CYAN} transparent opacity={0.28} lineWidth={0.8} />
    ));
  }, []);
  return <>{connections}</>;
}

function OrbitRings() {
  return (
    <group rotation={[0.34, 0.12, 0.2]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.72, 0.012, 8, 180]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.62} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0.16, Math.PI / 2.7, 0.55]}>
        <torusGeometry args={[2.86, 0.009, 8, 180]} />
        <meshBasicMaterial color={GREEN} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[-0.35, 0.4, 0]}>
        <torusGeometry args={[3.0, 0.006, 8, 180]} />
        <meshBasicMaterial color={BLUE} transparent opacity={0.35} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function ScanArc() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.42;
  });
  return (
    <group ref={ref} rotation={[0.35, 0.25, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.36, 0.02, 8, 120, Math.PI * 0.46]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.95} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function CyberGlobe({ progress }) {
  const group = useRef();
  const texture = useTexture("/assets/cyber-earth-texture.png");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (0.035 + progress * 0.12);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, progress * 0.11, 0.03);
    const scale = THREE.MathUtils.lerp(1.0, 0.82, THREE.MathUtils.smoothstep(progress, 0.12, 0.65));
    group.current.scale.setScalar(scale);
  });

  return (
    <group ref={group} position={[0, -0.15, 0]}>
      <BaseSphere />
      <DigitalLand texture={texture} progress={progress} />
      <Grid />
      <ConnectionLines />
      <NetworkPoints />
      <OrbitRings />
      <ScanArc />
      <Atmosphere progress={progress} />
      <pointLight position={[3.5, 2.5, 4]} color={CYAN} intensity={16} distance={10} />
      <pointLight position={[-3.2, -1.6, 2.5]} color={GREEN} intensity={12} distance={9} />
      <pointLight position={[0, 3.5, -1]} color={BLUE} intensity={7} distance={8} />
    </group>
  );
}
