import React from "react";
import { ArrowDown, ShieldCheck } from "lucide-react";

export default function IntroOverlay({ progress, navigate }) {
  const showNav = progress > 0.55;
  const hideCopy = progress > 0.25;

  return (
    <div className="intro-overlay">
      <button className="intro-brand" onClick={() => navigate("/")}>
        <span className="intro-brand-mark"><ShieldCheck size={19} /></span>
        <span><b>RECOVERAI</b><small>FORENSIC INTELLIGENCE</small></span>
      </button>

      <div className={`intro-copy ${hideCopy ? "intro-copy-hide" : ""}`}>
        <div className="intro-kicker">AI-ASSISTED DIGITAL FORENSICS</div>
        <h1>Recover.<br /><em>Reconstruct.</em><br />Verify.</h1>
        <p>Damaged fragments become traceable digital evidence.</p>
      </div>

      <div className={`intro-stage-label ${progress > 0.35 ? "fade" : ""}`}>
        <span>CYBER EARTH // EVIDENCE CORE</span>
        <small>FRAGMENTATION SEQUENCE READY</small>
      </div>

      <div className={`intro-nav-hint ${showNav ? "visible" : ""}`}>
        <span>01—07</span> FRAGMENTS ASSIGNED TO FORENSIC WORKFLOW
      </div>

      <div className="intro-scroll">
        <span>{progress < 0.08 ? "SCROLL TO DECONSTRUCT" : progress < 0.62 ? "FRAGMENTING CYBER EARTH" : "NAVIGATION ASSEMBLED"}</span>
        <ArrowDown size={17} />
      </div>

      <div className="intro-corner intro-corner-left">RECOVERAI / CYBER FORENSICS</div>
      <div className="intro-corner intro-corner-right">SYSTEM 01 · LIVE DEMO</div>
    </div>
  );
}
