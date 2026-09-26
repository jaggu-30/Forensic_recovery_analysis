import React from "react";
import { ClipboardList, FileCheck2, FolderSearch, Home, LayoutDashboard, Network, Search, ShieldCheck } from "lucide-react";

const nav = [
  ["OVERVIEW", "/", Home],
  ["DASHBOARD", "/dashboard", LayoutDashboard],
  ["INVESTIGATION", "/investigation/new", Search],
  ["ANALYSIS", "/analysis", FolderSearch],
  ["RECONSTRUCTION", "/reconstruction", Network],
  ["EVIDENCE", "/evidence", FileCheck2],
  ["REPORT", "/report", ClipboardList],
];

export default function IntroOverlay({ progress, navigate }) {
  // Keep the fixed HTML navigation hidden while the 3D fragments are travelling.
  // It appears only after the fragments have reached the top zone and disappeared.
  const showNav = progress > 0.965;
  const showHero = progress < 0.28;

  return (
    <div className="intro-overlay">
      <button className="intro-brand" onClick={() => navigate("/")}>
        <span className="intro-brand-mark"><ShieldCheck size={20}/></span>
        <span><b>RECOVERAI</b><small>FORENSIC INTELLIGENCE</small></span>
      </button>

      <div className={`intro-top-nav ${showNav ? "show" : ""}`} aria-hidden={!showNav}>
        {nav.map(([label, path, Icon]) => (
          <button key={label} onClick={() => navigate(path)} tabIndex={showNav ? 0 : -1}>
            <Icon size={15}/><span>{label}</span>
          </button>
        ))}
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
      <div className="intro-scroll"><span>{showNav ? "SCROLL TO EXPLORE" : "SCROLL TO FRAGMENT"}</span><span className="scroll-glyph">↓</span></div>
      <div className="intro-corner intro-corner-left">RECOVERAI / CYBER FORENSICS</div>
      <div className="intro-corner intro-corner-right">SYSTEM 01 · EVIDENCE PLATFORM</div>
    </div>
  );
}
