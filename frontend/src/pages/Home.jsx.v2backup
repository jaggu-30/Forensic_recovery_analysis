import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import CyberGlobe from "../components/intro/CyberGlobe";
import GlobeFragments from "../components/intro/GlobeFragments";
import IntroOverlay from "../components/intro/IntroOverlay";

export default function Home() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgress(Math.min(1, Math.max(0, window.scrollY / max)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <main className="intro-page">
      <section className="intro-stage">
        <div className="intro-canvas-wrap">
          <Canvas camera={{ position: [0, 0.05, 6.2], fov: 42 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
            <color attach="background" args={["#f4fbf9"]} />
            <ambientLight intensity={1.8} />
            <directionalLight position={[4, 4, 5]} intensity={4} color="#ffffff" />
            <pointLight position={[-3, 1, 4]} intensity={25} color="#06B6D4" />
            <pointLight position={[3, -2, 2]} intensity={18} color="#10B981" />
            <CyberGlobe progress={progress} />
            <GlobeFragments progress={progress} />
            <Sparkles count={220} scale={[8, 6, 8]} size={1.3} speed={0.15} color="#2563EB" opacity={0.35} />
          </Canvas>
        </div>
        <div className="intro-vignette" />
        <div className="intro-grid-lines" />
        <IntroOverlay progress={progress} onEnter={(path) => navigate(path)} />
      </section>

      <section className="intro-transition">
        <div className="transition-inner">
          <span className="intro-kicker">RECOVERAI FORENSIC WORKSPACE</span>
          <h2>From fragmented storage<br /><em>to traceable evidence.</em></h2>
          <p>Every recovered result is separated from reconstruction, uncertainty and inference.</p>
          <button onClick={() => navigate("/dashboard")}>Open investigation workspace</button>
        </div>
      </section>
    </main>
  );
}
