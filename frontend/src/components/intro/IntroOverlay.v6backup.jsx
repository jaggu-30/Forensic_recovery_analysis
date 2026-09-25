import React from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

export default function IntroOverlay({ progress, navigate }) {
  const showNav = progress > 0.68;
  const showHero = progress < 0.3;
  return (
    <div className="intro-overlay">
      <button className="intro-brand" onClick={() => navigate("/")}> 
        <span className="intro-brand-mark"><ShieldCheck size={20}/></span>
        <span><b>RECOVERAI</b><small>FORENSIC INTELLIGENCE</small></span>
      </button>

      <div className={`intro-top-nav ${showNav ? "show" : ""}`}>
        {[
          ["OVERVIEW","/"],["DASHBOARD","/dashboard"],["INVESTIGATION","/investigation/new"],["ANALYSIS","/analysis"],["RECONSTRUCTION","/reconstruction"],["EVIDENCE","/evidence"],["REPORT","/report"]
        ].map(([label,path]) => <button key={label} onClick={() => navigate(path)}>{label}</button>)}
      </div>

      <div className={`intro-hero-copy ${showHero ? "" : "hide"}`}>
        <span className="intro-kicker">AI-ASSISTED DIGITAL FORENSICS</span>
        <h1>Recover.<br/><em>Reconstruct.</em><br/>Verify.</h1>
        <p>Intelligent recovery and reconstruction of fragmented digital evidence.</p>
      </div>

      <div className={`intro-center-title ${showNav ? "show" : ""}`}>
        <span>DIGITAL EVIDENCE · AI RECONSTRUCTION · FORENSIC INTELLIGENCE</span>
      </div>

      <div className="intro-platform-badge">DIGITAL EVIDENCE<br/><b>RECOVERY PLATFORM</b></div>
      <div className="intro-status left"><span>SYSTEM ONLINE</span><b>FORENSIC AI ENGINE READY</b></div>
      <div className="intro-status right"><span>FRAGMENT ANALYSIS</span><div className="mini-bar"><i style={{width:`${Math.round(52 + progress*35)}%`}}/></div><b>{Math.round(52 + progress*35)}%</b></div>

      <div className="intro-scroll"><span>{showNav ? "SCROLL TO EXPLORE" : "SCROLL TO FRAGMENT"}</span><ChevronDown size={18}/></div>
      <div className="intro-corner intro-corner-left">RECOVERAI / CYBER FORENSICS</div>
      <div className="intro-corner intro-corner-right">SYSTEM 01 · LIVE DEMO</div>
    </div>
  );
}
