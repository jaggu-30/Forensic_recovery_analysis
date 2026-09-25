import React, { useMemo, useRef } from "react";
import { Line, Points, PointMaterial, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CYAN = "#22d3ee";
const BLUE = "#2563eb";
const GREEN = "#10b981";

function ll(lat, lon, radius = 2.42) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function DigitalSurface({ texture, progress }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main(){
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main(){
        vec3 tex = texture2D(uMap, vUv).rgb;
        float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
        float land = smoothstep(0.06, 0.20, lum);
        float bright = smoothstep(0.16, 0.46, lum);
        float pulse = 0.84 + 0.16 * sin(uTime * 2.0 + vUv.x * 28.0 + vUv.y * 17.0);
        vec3 col = mix(vec3(0.02,0.38,0.62), vec3(0.02,0.95,0.67), vUv.x * 0.72 + 0.2);
        col += vec3(0.02,0.25,0.38) * bright;
        float facing = pow(max(dot(vWorldNormal, normalize(vec3(0.2,0.25,1.0))),0.0), 0.45);
        float alpha = land * (0.52 + bright * 0.82) * pulse * (0.68 + facing * 0.5) * uOpacity;
        if(alpha < 0.018) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  }), [texture]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uOpacity.value = THREE.MathUtils.lerp(1.0, 0.34, THREE.MathUtils.smoothstep(progress, 0.3, 0.86));
  });

  return (
    <mesh scale={1.006}>
      <sphereGeometry args={[2.42, 128, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function EarthBody({ progress }) {
  return (
    <mesh>
      <sphereGeometry args={[2.42, 128, 128]} />
      <meshStandardMaterial
        color="#020a11"
        transparent
        opacity={THREE.MathUtils.lerp(0.98, 0.32, THREE.MathUtils.smoothstep(progress, 0.42, 0.9))}
        roughness={0.42}
        metalness={0.88}
        emissive="#042432"
        emissiveIntensity={1.05}
      />
    </mesh>
  );
}

function Atmosphere({ progress }) {
  const opacity = THREE.MathUtils.lerp(0.24, 0.08, progress);
  return (
    <>
      <mesh scale={1.035}>
        <sphereGeometry args={[2.42, 96, 96]} />
        <meshBasicMaterial color={CYAN} transparent opacity={opacity} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh scale={1.075}>
        <sphereGeometry args={[2.42, 96, 96]} />
        <meshBasicMaterial color={GREEN} transparent opacity={opacity * 0.42} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}

function Grid({ progress }) {
  const opacity = THREE.MathUtils.lerp(0.085, 0.025, progress);
  const lines = [];
  for (let lat = -60; lat <= 60; lat += 15) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) pts.push(ll(lat, lon, 2.435));
    lines.push(<Line key={`lat-${lat}`} points={pts} color={CYAN} transparent opacity={opacity} lineWidth={0.35} />);
  }
  for (let lon = -180; lon < 180; lon += 15) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 4) pts.push(ll(lat, lon, 2.435));
    lines.push(<Line key={`lon-${lon}`} points={pts} color={GREEN} transparent opacity={opacity * 0.82} lineWidth={0.35} />);
  }
  return <>{lines}</>;
}

function NetworkPoints({ progress }) {
  const ref = useRef();
  const points = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 920; i++) {
      const lat = -72 + ((i * 37) % 144);
      const lon = -180 + ((i * 71) % 360);
      arr.push(ll(lat, lon, 2.455));
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.012;
  });

  return (
    <group ref={ref}>
      <Points positions={points.flatMap((p) => p.toArray())} stride={3}>
        <PointMaterial
          transparent
          color={CYAN}
          size={0.018}
          sizeAttenuation
          depthWrite={false}
          opacity={THREE.MathUtils.lerp(0.72, 0.2, progress)}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}

function Connections({ progress }) {
  const pairs = useMemo(() => [
    [-20,-55,25,5],[5,-45,25,40],[25,40,35,110],[35,110,5,120],[5,120,-25,135],
    [-25,135,-35,150],[15,75,35,105],[-5,45,15,75],[45,-5,35,105],[0,-75,35,-5],
    [15,-15,30,30],[-10,15,12,80],[-28,-5,0,55]
  ], []);
  const opacity = THREE.MathUtils.lerp(0.34, 0.1, progress);
  return <>{pairs.map(([a,b,c,d], i) => <Line key={i} points={[ll(a,b,2.468), ll(c,d,2.468)]} color={i % 2 ? GREEN : CYAN} transparent opacity={opacity} lineWidth={0.7} />)}</>;
}

function OrbitRings({ progress }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.035;
  });
  const opacity = THREE.MathUtils.lerp(0.48, 0.12, progress);
  return (
    <group ref={ref} rotation={[0.34,0.12,0.2]}>
      <mesh rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[2.92,0.012,8,220]} />
        <meshBasicMaterial color={CYAN} transparent opacity={opacity} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0.16,Math.PI/2.7,0.55]}>
        <torusGeometry args={[3.04,0.01,8,220]} />
        <meshBasicMaterial color={GREEN} transparent opacity={opacity * 0.82} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[-0.35,0.4,0]}>
        <torusGeometry args={[3.16,0.006,8,220]} />
        <meshBasicMaterial color={BLUE} transparent opacity={opacity * 0.65} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function ScanArc({ progress }) {
  const ref = useRef();
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.z += delta * 0.3; });
  return (
    <group ref={ref} rotation={[0.35,0.25,0]}>
      <mesh rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[2.56,0.018,8,120,Math.PI * 0.42]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.9 - progress * 0.65} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function CyberGlobe({ progress }) {
  const group = useRef();
  const texture = useTexture("/assets/cyber-earth-texture.png");
  texture.colorSpace = THREE.SRGBColorSpace;

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (0.028 + progress * 0.09);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, progress * 0.1, 0.03);
    const scale = THREE.MathUtils.lerp(1.0, 0.83, THREE.MathUtils.smoothstep(progress, 0.42, 0.9));
    group.current.scale.setScalar(scale);
    group.current.position.y = THREE.MathUtils.lerp(-0.12, 0.35, progress);
  });

  return (
    <group ref={group}>
      <EarthBody progress={progress} />
      <DigitalSurface texture={texture} progress={progress} />
      <Grid progress={progress} />
      <Connections progress={progress} />
      <NetworkPoints progress={progress} />
      <OrbitRings progress={progress} />
      <ScanArc progress={progress} />
      <Atmosphere progress={progress} />
      <pointLight position={[3.5,2.5,4]} color={CYAN} intensity={18} distance={11} />
      <pointLight position={[-3,-1.5,2.5]} color={GREEN} intensity={14} distance={10} />
      <pointLight position={[0,3,-1]} color={BLUE} intensity={8} distance={8} />
    </group>
  );
}
