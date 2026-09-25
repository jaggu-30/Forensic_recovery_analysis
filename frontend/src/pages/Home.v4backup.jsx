import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars, Sparkles } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import CyberGlobe from "../components/intro/CyberGlobe";
import GlobeFragments from "../components/intro/GlobeFragments";
import IntroOverlay from "../components/intro/IntroOverlay";

function Scene({ progress, navigate }) {
  return (
    <Canvas camera={{ position: [0, 0, 8.7], fov: 41 }} dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={["#010609"]} />
      <fog attach="fog" args={["#010609", 9, 20]} />
      <ambientLight intensity={0.28} />
      <pointLight position={[4, 3, 5]} intensity={18} color="#06b6d4" />
      <pointLight position={[-4, -2, 3]} intensity={14} color="#10b981" />
      <Stars radius={90} depth={55} count={2600} factor={1.35} saturation={0} fade speed={0.25} />
      <Sparkles count={240} scale={[16, 12, 12]} size={1.05} speed={0.18} color="#7dd3fc" opacity={0.3} />
      <group>
        <CyberGlobe progress={progress} />
        <GlobeFragments progress={progress} navigate={navigate} />
      </group>
    </Canvas>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgress(THREE.MathUtils.clamp(window.scrollY / max, 0, 1));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="cyber-intro">
      <div className="cyber-intro-sticky">
        <Scene progress={progress} navigate={navigate} />
        <IntroOverlay progress={progress} navigate={navigate} />
        <div className="intro-progress"><span style={{ transform: `scaleX(${progress})` }} /></div>
      </div>
      <div className="cyber-scroll-space" />
    </main>
  );
}
