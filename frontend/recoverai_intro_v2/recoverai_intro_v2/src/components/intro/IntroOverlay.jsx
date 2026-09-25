import React from "react";
import { ArrowRight, ChevronDown, ShieldCheck } from "lucide-react";

export default function IntroOverlay({ progress, onEnter }) {
  const p = Math.max(0, Math.min(1, progress));
  const heroOpacity = Math.max(0, 1 - p * 2.1);
  const navOpacity = Math.max(0, Math.min(1, (p - 0.68) / 0.2));

  return (
    <>
      <div className="intro-brand">
        <div className="intro-brand-mark"><ShieldCheck size={20} /></div>
        <div><strong>RECOVERAI</strong><span>FORENSIC INTELLIGENCE</span></div>
      </div>

      <div className="intro-copy" style={{ opacity: heroOpacity, transform: `translateY(${p * -45}px)` }}>
        <span className="intro-kicker">AI-ASSISTED DIGITAL FORENSICS</span>
        <h1>Recover.<br /><em>Reconstruct.</em><br />Verify.</h1>
        <p>Intelligent recovery and reconstruction of fragmented digital evidence.</p>
        <div className="intro-rule"><i /><span>TRACEABLE BY DESIGN</span></div>
      </div>

      <div className="intro-scroll" style={{ opacity: Math.max(0, 1 - p * 3) }}>
        <span>SCROLL TO FRAGMENT</span><ChevronDown size={15} />
      </div>

      <div className="intro-nav" style={{ opacity: navOpacity, transform: `translateY(${(1 - navOpacity) * 26}px)` }}>
        <div className="intro-nav-title">EVIDENCE NAVIGATION</div>
        <div className="intro-nav-items">
          {[
            ["OVERVIEW", "/"], ["DASHBOARD", "/dashboard"], ["INVESTIGATION", "/investigation/new"],
            ["ANALYSIS", "/analysis"], ["RECONSTRUCTION", "/reconstruction"], ["EVIDENCE", "/evidence"], ["REPORT", "/report"],
          ].map(([label, path], i) => (
            <button key={path} onClick={() => onEnter(path)} className={`nav-fragment n${i}`}>
              <span>{String(i + 1).padStart(2, "0")}</span>{label}
            </button>
          ))}
        </div>
      </div>

      <div className="intro-bottom" style={{ opacity: Math.max(0, 1 - Math.abs(p - 0.5) * 4) }}>
        <span>RECOVER</span><i /> <span>RECONSTRUCT</span><i /> <span>RELATE</span><i /> <span>VERIFY</span>
      </div>

      {p > 0.82 && (
        <button className="intro-enter" onClick={() => onEnter("/dashboard")}>
          Enter investigation <ArrowRight size={16} />
        </button>
      )}
    </>
  );
}
