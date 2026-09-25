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
    <Canvas camera={{ position: [0, 0, 10.2], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={["#010508"]} />
      <fog attach="fog" args={["#010508", 10, 22]} />
      <ambientLight intensity={0.22} />
      <pointLight position={[4,3,6]} intensity={16} color="#22d3ee" />
      <pointLight position={[-4,-2,3]} intensity={12} color="#10b981" />
      <Stars radius={90} depth={65} count={3400} factor={1.45} saturation={0.15} fade speed={0.22} />
      <Sparkles count={280} scale={[18,14,14]} size={1.2} speed={0.16} color="#67e8f9" opacity={0.34} />
      <CyberGlobe progress={progress} />
      <GlobeFragments progress={progress} navigate={navigate} />
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
        <div className="intro-progress"><span style={{transform:`scaleX(${progress})`}}/></div>
      </div>
      <div className="cyber-scroll-space" />
    </main>
  );
}
