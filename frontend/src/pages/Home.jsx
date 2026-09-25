import React from "react";
import { ShieldCheck, ArrowRight, ScanSearch, Network, FileCheck2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "../components/common/Card";

export default function Home(){
  const navigate=useNavigate();
  const steps=[["01","Recover","Identify deleted, damaged and fragmented data.",ScanSearch],["02","Reconstruct","Relate fragments and rebuild viable file candidates.",Network],["03","Verify","Measure integrity, uncertainty and provenance.",FileCheck2]];
  return <div className="home">
    <section className="hero-card">
      <div className="hero-grid"/>
      <div className="hero-copy">
        <div className="eyebrow"><ShieldCheck size={15}/> AI-ASSISTED DIGITAL FORENSICS</div>
        <h2>Recover. Reconstruct.<br/><span>Verify. Understand.</span></h2>
        <p>RECOVERAI analyzes damaged storage, identifies fragments, reconstructs recoverable evidence and makes every conclusion traceable.</p>
        <div className="hero-actions">
          <button className="primary-btn" onClick={()=>navigate("/investigation/new")}>Start Investigation <ArrowRight size={17}/></button>
          <button className="secondary-btn" onClick={()=>navigate("/dashboard")}>View Demo Dashboard</button>
        </div>
      </div>
      <div className="hero-scan">
        <div className="scan-ring r1"/><div className="scan-ring r2"/><div className="scan-core"><ShieldCheck size={42}/></div>
        <div className="scan-label">EVIDENCE<br/><b>ANALYSIS</b></div>
      </div>
    </section>
    <div className="section-heading"><div><span className="eyebrow">FORENSIC WORKFLOW</span><h3>From fragments to defensible evidence</h3></div></div>
    <div className="step-grid">{steps.map(([n,t,d,I])=><Card key={n}><div className="step-number">{n}</div><I size={20}/><h4>{t}</h4><p>{d}</p></Card>)}</div>
    <div className="notice"><div><b>Forensic principle</b><span>AI-generated or inferred content is never presented as verified original evidence.</span></div><span className="notice-status">TRACEABLE BY DESIGN</span></div>
  </div>
}
