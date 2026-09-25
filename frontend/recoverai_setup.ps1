$ErrorActionPreference = "Stop"

$base = Join-Path (Get-Location) "src"
$dirs = @(
  "$base\components\common",
  "$base\components\layout",
  "$base\components\dashboard",
  "$base\components\analysis",
  "$base\components\fragments",
  "$base\components\evidence",
  "$base\components\reports",
  "$base\pages",
  "$base\data",
  "$base\routes",
  "$base\styles"
)
$dirs | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

@'
import React from "react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
'@ | Set-Content -Encoding UTF8 "$base\main.jsx"

# Fix main.jsx with ReactDOM import
@'
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
'@ | Set-Content -Encoding UTF8 "$base\main.jsx"

@'
import React from "react";
import { NavLink, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck, LayoutDashboard, UploadCloud, ScanSearch, Network,
  Database, FileText, Search, Bell, ChevronRight, Activity, Cpu
} from "lucide-react";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import NewInvestigation from "./pages/NewInvestigation";
import RecoveryAnalysis from "./pages/RecoveryAnalysis";
import FragmentReconstruction from "./pages/FragmentReconstruction";
import RecoveredEvidence from "./pages/RecoveredEvidence";
import InvestigationReport from "./pages/InvestigationReport";

const nav = [
  ["/", "Overview", LayoutDashboard],
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/investigation/new", "New Investigation", UploadCloud],
  ["/analysis", "Recovery Analysis", ScanSearch],
  ["/reconstruction", "Fragment Reconstruction", Network],
  ["/evidence", "Recovered Evidence", Database],
  ["/report", "Investigation Report", FileText],
];

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = nav.find(([path]) => path === location.pathname);
  const title = current?.[1] || "RECOVERAI";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => navigate("/")}>
          <div className="brand-mark"><ShieldCheck size={22} /></div>
          <div>
            <div className="brand-name">RECOVERAI</div>
            <div className="brand-sub">FORENSIC INTELLIGENCE</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">INVESTIGATION</div>
          <nav>
            {nav.map(([path, label, Icon]) => (
              <NavLink key={path} to={path} end={path === "/"}>
                <Icon size={17} />
                <span>{label}</span>
                {location.pathname === path && <span className="nav-active-dot" />}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="system-card">
            <div className="system-top"><span className="status-dot" /> SYSTEM READY</div>
            <div className="system-meta">AI analysis engine online</div>
          </div>
          <div className="sidebar-version">RECOVERAI v0.1 • DEMO MODE</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">RECOVERAI <ChevronRight size={13} /> INVESTIGATION</div>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-btn" aria-label="Search"><Search size={18} /></button>
            <button className="icon-btn" aria-label="Notifications"><Bell size={18} /></button>
            <div className="mode-pill"><span className="status-dot" /> DEMO DATA</div>
          </div>
        </header>

        <div className="page-wrap">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/investigation/new" element={<NewInvestigation />} />
            <Route path="/analysis" element={<RecoveryAnalysis />} />
            <Route path="/reconstruction" element={<FragmentReconstruction />} />
            <Route path="/evidence" element={<RecoveredEvidence />} />
            <Route path="/report" element={<InvestigationReport />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
'@ | Set-Content -Encoding UTF8 "$base\App.jsx"

@'
export const stats = {
  evidenceSources: 3,
  fragmentsDetected: 1842,
  recoverableFiles: 47,
  reconstructedFiles: 31,
  partial: 9,
  unrecoverable: 7,
  relationships: 126,
  averageConfidence: 87,
};

export const files = [
  { id:"EV-001", name:"IMG_4821.jpg", type:"JPEG", size:"4.8 MB", status:"Verified Recovery", integrity:"98%", confidence:94, priority:"High", fragments:5, missing:"18%" },
  { id:"EV-002", name:"report_2024.pdf", type:"PDF", size:"1.7 MB", status:"Structural Repair", integrity:"91%", confidence:89, priority:"High", fragments:8, missing:"9%" },
  { id:"EV-003", name:"archive_07.zip", type:"ZIP", size:"12.4 MB", status:"Plausible Reconstruction", integrity:"76%", confidence:78, priority:"Medium", fragments:19, missing:"24%" },
  { id:"EV-004", name:"IMG_5190.png", type:"PNG", size:"2.1 MB", status:"AI-Inferred Reconstruction", integrity:"64%", confidence:61, priority:"Medium", fragments:7, missing:"36%" },
  { id:"EV-005", name:"unknown.bin", type:"Binary", size:"680 KB", status:"Insufficient Evidence", integrity:"—", confidence:29, priority:"Low", fragments:12, missing:"71%" },
];

export const fragments = Array.from({length: 24}, (_, i) => ({
  id:`FR-${String(i+1).padStart(3,"0")}`,
  type: i % 5 === 0 ? "JPEG" : i % 4 === 0 ? "Metadata" : "Binary",
  offset: `${(i * 184).toLocaleString()} KB`,
  size: `${(84 + (i*17)%190)} KB`,
  entropy: (5.1 + ((i*7)%31)/10).toFixed(2),
  confidence: Math.max(54, 97 - i*2),
  state: i < 15 ? "Verified" : i < 20 ? "Reconstructed" : "Uncertain"
}));

export const pipeline = [
  ["Evidence Scan","Completed",100],
  ["File Signature Detection","Completed",100],
  ["Fragment Detection","Completed",100],
  ["Fragment Classification","Completed",100],
  ["Fragment Relationship Analysis","Running",68],
  ["Recovery Feasibility Analysis","Pending",0],
  ["Reconstruction","Pending",0],
  ["Integrity Verification","Pending",0],
  ["Contradiction Detection","Pending",0],
  ["Evidence Prioritization","Pending",0],
];

export const relationships = [
  ["FR-001","FR-006",0.96],["FR-006","FR-011",0.91],["FR-011","FR-017",0.88],
  ["FR-004","FR-009",0.84],["FR-009","FR-015",0.82],["FR-015","FR-019",0.76],
  ["FR-002","FR-007",0.73],["FR-007","FR-012",0.69],["FR-012","FR-020",0.64],
];

export const recoverySummary = {
  original: 5048576,
  verified: 3891200,
  reconstructed: 709120,
  missing: 448256,
  completeness: 91,
  structural: 94,
  confidence: 89
};
'@ | Set-Content -Encoding UTF8 "$base\data\demoData.js"

@'
import React from "react";
export default function Card({children, className=""}) {
  return <section className={`card ${className}`}>{children}</section>;
}
'@ | Set-Content -Encoding UTF8 "$base\components\common\Card.jsx"

@'
import React from "react";
export default function Badge({children, tone="neutral"}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
'@ | Set-Content -Encoding UTF8 "$base\components\common\Badge.jsx"

@'
import React from "react";
export default function StatCard({label,value,sub,icon:Icon,tone=""}) {
  return <div className={`stat-card ${tone}`}>
    <div className="stat-icon">{Icon && <Icon size={18}/>}</div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
}
'@ | Set-Content -Encoding UTF8 "$base\components\common\StatCard.jsx"

@'
import React from "react";
export default function ProgressBar({value=0}) {
  return <div className="progress-track"><div className="progress-fill" style={{width:`${value}%`}} /></div>
}
'@ | Set-Content -Encoding UTF8 "$base\components\common\ProgressBar.jsx"

@'
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
'@ | Set-Content -Encoding UTF8 "$base\pages\Home.jsx"

@'
import React from "react";
import { Activity, Database, FileCheck2, Network, ShieldCheck, AlertTriangle, Clock3 } from "lucide-react";
import { stats, files } from "../data/demoData";
import StatCard from "../components/common/StatCard";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { useNavigate } from "react-router-dom";

const tone = s => s.includes("Verified") ? "success" : s.includes("Insufficient") ? "danger" : s.includes("AI") ? "warning" : "info";

export default function Dashboard(){
 const nav=useNavigate();
 return <div>
  <div className="page-intro"><div><span className="eyebrow">CURRENT INVESTIGATION</span><h2>Case IR-2026-014</h2><p>Damaged storage image • analysis workspace • Demo dataset</p></div><button className="primary-btn" onClick={()=>nav("/analysis")}>Open Analysis <Activity size={16}/></button></div>
  <div className="stats-grid">
   <StatCard label="Evidence Sources" value={stats.evidenceSources} sub="3 mounted sources" icon={Database}/>
   <StatCard label="Fragments Detected" value={stats.fragmentsDetected.toLocaleString()} sub="+214 in last scan" icon={Network}/>
   <StatCard label="Recoverable Files" value={stats.recoverableFiles} sub="47 candidates" icon={FileCheck2}/>
   <StatCard label="Avg. Recovery Confidence" value={`${stats.averageConfidence}%`} sub="Across analyzed evidence" icon={ShieldCheck}/>
  </div>
  <div className="two-col">
   <Card><div className="card-title"><span>Recovery Overview</span><Badge tone="success">ANALYSIS ACTIVE</Badge></div><div className="overview-big"><b>31</b><span>files reconstructed</span></div><div className="bar-row"><span>Verified Recovery</span><b>31</b></div><div className="mini-bar"><i style={{width:"66%"}}/></div><div className="bar-row"><span>Partial Recovery</span><b>9</b></div><div className="mini-bar"><i style={{width:"19%"}}/></div><div className="bar-row"><span>Unrecoverable</span><b>7</b></div><div className="mini-bar"><i style={{width:"15%"}}/></div></Card>
   <Card><div className="card-title"><span>AI Insights</span><span className="live-label"><i/> LIVE</span></div><div className="insight"><ShieldCheck/><div><b>High-confidence cluster detected</b><p>5 JPEG fragments show strong structural compatibility.</p></div></div><div className="insight"><AlertTriangle/><div><b>2 metadata contradictions</b><p>Timestamp differences require investigator review.</p></div></div><div className="insight"><Clock3/><div><b>Analysis progress</b><p>Relationship analysis is currently running.</p></div></div></Card>
  </div>
  <Card className="table-card"><div className="card-title"><span>Top Priority Evidence</span><button className="text-btn" onClick={()=>nav("/evidence")}>View all</button></div><table><thead><tr><th>Evidence</th><th>Type</th><th>Status</th><th>Integrity</th><th>Confidence</th><th>Priority</th></tr></thead><tbody>{files.slice(0,4).map(f=><tr key={f.id}><td><b>{f.name}</b><small>{f.id}</small></td><td>{f.type}</td><td><Badge tone={tone(f.status)}>{f.status}</Badge></td><td>{f.integrity}</td><td><b>{f.confidence}%</b></td><td><Badge tone={f.priority==="High"?"danger":"warning"}>{f.priority}</Badge></td></tr>)}</tbody></table></Card>
 </div>
}
'@ | Set-Content -Encoding UTF8 "$base\pages\Dashboard.jsx"

@'
import React, {useState} from "react";
import { UploadCloud, HardDrive, FileImage, ShieldCheck, ArrowRight } from "lucide-react";
import Card from "../components/common/Card";
import {useNavigate} from "react-router-dom";

export default function NewInvestigation(){
 const [name,setName]=useState("IR-2026-014 — Damaged Storage Analysis");
 const [source,setSource]=useState("Disk image (.img)");
 const nav=useNavigate();
 return <div className="form-layout">
  <div><span className="eyebrow">EVIDENCE INTAKE</span><h2>New Investigation</h2><p className="muted">Create a read-only forensic evidence workspace before analysis begins.</p></div>
  <Card><div className="form-grid"><label>Investigation name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Evidence source<select value={source} onChange={e=>setSource(e.target.value)}><option>Disk image (.img)</option><option>Raw image (.dd)</option><option>Binary dataset</option><option>Corrupted file set</option></select></label><label className="full">Description<textarea defaultValue="Controlled demo dataset containing intact, fragmented, corrupted and missing-fragment evidence."/></label></div></Card>
  <Card className="upload-zone"><UploadCloud size={32}/><h3>Drop evidence here</h3><p>Supported: .img, .dd, .raw, binary and controlled corruption datasets</p><button className="secondary-btn">Choose Evidence File</button></Card>
  <div className="evidence-intake"><Card><div className="card-title"><span>Evidence Record</span><Badge>READ ONLY</Badge></div><div className="record-grid"><div><small>Evidence ID</small><b>EV-SRC-014</b></div><div><small>Filename</small><b>sample_disk.img</b></div><div><small>Size</small><b>512 MB</b></div><div><small>SHA-256</small><b className="mono">8a2d…f91c</b></div><div><small>Acquisition</small><b>25 Sep 2026, 11:32 IST</b></div></div></Card></div>
  <div className="form-actions"><div className="security-note"><ShieldCheck size={16}/> Original evidence remains unchanged; analysis operates on a working copy.</div><button className="primary-btn" onClick={()=>nav("/analysis")}>Start Analysis <ArrowRight size={17}/></button></div>
 </div>
}
'@ | Set-Content -Encoding UTF8 "$base\pages\NewInvestigation.jsx"

@'
import React from "react";
import { CheckCircle2, Circle, LoaderCircle, Database, Boxes, ShieldCheck, AlertTriangle } from "lucide-react";
import Card from "../components/common/Card";
import ProgressBar from "../components/common/ProgressBar";
import Badge from "../components/common/Badge";
import {pipeline} from "../data/demoData";

export default function RecoveryAnalysis(){
 return <div>
  <div className="page-intro"><div><span className="eyebrow">AI RECOVERY PIPELINE</span><h2>Recovery Analysis</h2><p>Controlled demo analysis of deleted, fragmented and corrupted evidence.</p></div><Badge tone="info">68% ACTIVE</Badge></div>
  <div className="analysis-grid">
   <Card><div className="card-title"><span>Pipeline Execution</span><span className="live-label"><i/> RUNNING</span></div><div className="pipeline">{pipeline.map(([name,status,p],i)=><div className="pipeline-row" key={name}><div className={`pipeline-icon ${status.toLowerCase()}`}>{status==="Completed"?<CheckCircle2 size={15}/>:status==="Running"?<LoaderCircle className="spin" size={15}/>:<Circle size={15}/>}</div><div className="pipeline-main"><div><b>{name}</b><span>{status}</span></div><ProgressBar value={p}/></div></div>)}</div></Card>
   <div className="side-stack"><Card><div className="card-title">Recovery Feasibility</div><div className="feasibility-score">82<span>%</span></div><p className="muted">IMG_4821.jpg</p><div className="metric-line"><span>Fragments found</span><b>4 / 5</b></div><div className="metric-line"><span>Structural information</span><b>High</b></div><div className="metric-line"><span>Metadata</span><b>Partial</b></div><div className="metric-line"><span>Missing data</span><b>18%</b></div><Badge tone="success">HIGH RECOVERABILITY</Badge></Card><Card><div className="card-title">Contradiction Detection</div><div className="contradiction"><AlertTriangle size={17}/><div><b>2 inconsistencies</b><p>Timestamp differences across related fragments.</p></div></div><small className="muted">Possible explanations: different sources, metadata modification, clock discrepancy, relationship uncertainty.</small></Card></div>
  </div>
  <Card><div className="card-title">Scan Telemetry</div><div className="telemetry"><div><small>Bytes scanned</small><b>481.6 MB</b></div><div><small>Fragments</small><b>1,842</b></div><div><small>Candidate files</small><b>47</b></div><div><small>Processing time</small><b>02:18</b></div><div><small>Signatures</small><b>PDF · JPEG · PNG · ZIP</b></div></div></Card>
 </div>
}
'@ | Set-Content -Encoding UTF8 "$base\pages\RecoveryAnalysis.jsx"

@'
import React, {useMemo, useState} from "react";
import {Canvas} from "@react-three/fiber";
import {OrbitControls, Float, Line, Text} from "@react-three/drei";
import {ShieldCheck, MousePointer2} from "lucide-react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import {fragments, relationships} from "../data/demoData";

function Node({p, label, selected, onClick, state}) {
 return <group position={p} onClick={onClick}>
   <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
    <mesh><sphereGeometry args={[selected ? 0.23 : 0.18, 20, 20]}/><meshStandardMaterial emissive={selected ? "#38bdf8" : state==="Verified" ? "#22c55e" : "#64748b"} emissiveIntensity={selected?2.5:1.2} color={selected?"#0ea5e9":"#0f172a"}/></mesh>
   </Float>
   <Text position={[0,0.32,0]} fontSize={0.11} color="#cbd5e1" anchorX="center">{label}</Text>
 </group>
}
function Graph3D({selected,setSelected}) {
 const pts=useMemo(()=>fragments.slice(0,12).map((_,i)=>[Math.cos(i/12*Math.PI*2)*2.4, Math.sin(i/12*Math.PI*2)*1.5, Math.sin(i*1.7)*0.8]),[]);
 return <div className="graph-3d"><Canvas camera={{position:[0,0,6],fov:48}}><ambientLight intensity={0.7}/><pointLight position={[3,3,4]} intensity={18} color="#38bdf8"/><pointLight position={[-3,-2,2]} intensity={8} color="#22c55e"/><gridHelper args={[12,12,"#1e293b","#0f172a"]}/>{pts.map((p,i)=><Node key={i} p={p} label={`FR-${String(i+1).padStart(3,"0")}`} selected={selected===i} onClick={()=>setSelected(i)} state={i<8?"Verified":"Reconstructed"}/>)}{relationships.slice(0,8).map(([a,b,c],i)=>{const ai=parseInt(a.slice(3))-1,bi=parseInt(b.slice(3))-1;return ai<12&&bi<12?<Line key={i} points={[pts[ai],pts[bi]]} color={c>.85?"#38bdf8":"#475569"} lineWidth={c>.85?2:1}/> : null})}<OrbitControls enablePan={false}/></Canvas><div className="graph-overlay"><MousePointer2 size={14}/> Drag to orbit · Scroll to zoom · Click a fragment</div></div>
}
export default function FragmentReconstruction(){
 const [selected,setSelected]=useState(0); const f=fragments[selected];
 return <div><div className="page-intro"><div><span className="eyebrow">FRAGMENT INTELLIGENCE</span><h2>Fragment Reconstruction</h2><p>3D relationship model based on signatures, offsets, entropy and structural compatibility.</p></div><Badge tone="info">126 RELATIONSHIPS</Badge></div>
 <div className="recon-grid"><Card className="graph-card"><div className="card-title"><span>3D Fragment Relationship Graph</span><span className="live-label"><i/> INTERACTIVE</span></div><Graph3D selected={selected} setSelected={setSelected}/></Card>
 <div className="side-stack"><Card><div className="card-title">Selected Fragment</div><div className="fragment-id">{f.id}</div><div className="metric-line"><span>Probable type</span><b>{f.type}</b></div><div className="metric-line"><span>Offset</span><b>{f.offset}</b></div><div className="metric-line"><span>Size</span><b>{f.size}</b></div><div className="metric-line"><span>Entropy</span><b>{f.entropy}</b></div><div className="metric-line"><span>Relationship confidence</span><b>{f.confidence}%</b></div><Badge tone={f.state==="Verified"?"success":"warning"}>{f.state.toUpperCase()}</Badge></Card>
 <Card><div className="card-title">Reconstruction Classes</div>{["Verified Recovery","Structural Repair","Plausible Reconstruction","AI-Inferred Reconstruction","Insufficient Evidence"].map((x,i)=><div className="class-row" key={x}><span className={`class-dot c${i}`}/>{x}</div>)}</Card></div></div>
 <Card><div className="card-title"><span>Fragment Contribution</span><span className="muted">Selected file: IMG_4821.jpg</span></div><div className="contribution"><div className="contribution-track">{fragments.slice(0,5).map((x,i)=><div key={x.id} style={{width:`${[28,22,19,17,14][i]}%`}} title={x.id}>{x.id}</div>)}</div><div className="contribution-legend">{fragments.slice(0,5).map((x,i)=><span key={x.id}><i className={`swatch s${i}`}/>{x.id} · {[28,22,19,17,14][i]}%</span>)}</div></div></Card>
 </div>
}
'@ | Set-Content -Encoding UTF8 "$base\pages\FragmentReconstruction.jsx"

@'
import React,{useState} from "react";
import {Eye, Download, GitBranch, ScanLine, ShieldCheck} from "lucide-react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import {files,recoverySummary} from "../data/demoData";

const tone=s=>s.includes("Verified")?"success":s.includes("Insufficient")?"danger":s.includes("AI")?"warning":"info";
export default function RecoveredEvidence(){
 const [active,setActive]=useState(files[0]); const [pos,setPos]=useState(52);
 return <div><div className="page-intro"><div><span className="eyebrow">EVIDENCE LIBRARY</span><h2>Recovered Evidence</h2><p>Review recovery results, uncertainty, provenance and comparison data.</p></div><div className="toolbar"><button className="secondary-btn"><ScanLine size={16}/> Damage Map</button><button className="secondary-btn"><Download size={16}/> Export</button></div></div>
 <Card className="table-card"><div className="filters"><input placeholder="Search evidence…"/><select><option>All statuses</option><option>Verified Recovery</option><option>Partial</option></select><select><option>All types</option><option>JPEG</option><option>PDF</option><option>ZIP</option></select></div><table><thead><tr><th>Evidence</th><th>Type</th><th>Recovery</th><th>Integrity</th><th>Confidence</th><th>Priority</th><th>Actions</th></tr></thead><tbody>{files.map(f=><tr className={active.id===f.id?"selected-row":""} key={f.id} onClick={()=>setActive(f)}><td><b>{f.name}</b><small>{f.id}</small></td><td>{f.type}</td><td><Badge tone={tone(f.status)}>{f.status}</Badge></td><td>{f.integrity}</td><td>{f.confidence}%</td><td><Badge tone={f.priority==="High"?"danger":"warning"}>{f.priority}</Badge></td><td><button className="table-action"><Eye size={15}/></button><button className="table-action"><GitBranch size={15}/></button></td></tr>)}</tbody></table></Card>
 <div className="evidence-detail-grid"><Card><div className="card-title"><span>Recovery Comparison</span><Badge tone="info">ACTUAL DEMO DATA</Badge></div><div className="comparison"><div className="compare-pane corrupted"><div className="compare-label">CORRUPTED INPUT</div><div className="fake-image damage"><div className="damage-block b1"/><div className="damage-block b2"/><div className="damage-block b3"/><span>IMG_4821.jpg</span></div></div><div className="compare-pane recovered"><div className="compare-label">RECOVERED OUTPUT</div><div className="fake-image recovered-img"><div className="mountain"/><span>91% COMPLETE</span></div></div><div className="slider-line" style={{left:`${pos}%`}}/><input className="compare-slider" type="range" min="10" max="90" value={pos} onChange={e=>setPos(+e.target.value)}/></div><div className="comparison-stats"><span>Original <b>4.8 MB</b></span><span>Verified <b>3.89 MB</b></span><span>Reconstructed <b>709 KB</b></span><span>Missing <b>448 KB</b></span></div></Card>
 <div className="side-stack"><Card><div className="card-title">Evidence DNA</div><div className="dna"><ShieldCheck size={34}/><div><b>{active.name}</b><span>{active.type} · {active.fragments} fragments</span></div></div><div className="hash">SHA-256 · 8a2d91c7…f91c</div><div className="metric-line"><span>Completeness</span><b>{recoverySummary.completeness}%</b></div><div className="metric-line"><span>Structural integrity</span><b>{recoverySummary.structural}%</b></div><div className="metric-line"><span>Recovery confidence</span><b>{recoverySummary.confidence}%</b></div></Card><Card><div className="card-title">Provenance</div><div className="provenance">{["Original Evidence","Storage Block","Fragment","Reconstruction","Validation","Confidence","Final Evidence"].map((x,i)=><div key={x}><i/>{x}{i<6&&<span>›</span>}</div>)}</div></Card></div></div>
 </div>
}
'@ | Set-Content -Encoding UTF8 "$base\pages\RecoveredEvidence.jsx"

@'
import React from "react";
import { FileText, ShieldCheck, Network, Download, CheckCircle2 } from "lucide-react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
export default function InvestigationReport(){
 return <div><div className="page-intro"><div><span className="eyebrow">FORENSIC OUTPUT</span><h2>Investigation Report</h2><p>Structured summary of recovery, reconstruction, validation and evidence provenance.</p></div><button className="primary-btn"><Download size={16}/> Export Report</button></div>
 <div className="report-grid"><Card><div className="report-cover"><div className="report-icon"><FileText size={30}/></div><span className="eyebrow">RECOVERAI FORENSIC REPORT</span><h3>Case IR-2026-014</h3><p>Damaged Storage Analysis</p><Badge tone="success">ANALYSIS COMPLETE — DEMO</Badge></div></Card><Card><div className="card-title">Recovery Summary</div><div className="report-metrics"><div><b>47</b><span>candidate files</span></div><div><b>31</b><span>reconstructed</span></div><div><b>91%</b><span>completeness</span></div><div><b>94%</b><span>structural integrity</span></div></div></Card></div>
 <div className="two-col"><Card><div className="card-title"><ShieldCheck/> Integrity Findings</div><div className="finding"><CheckCircle2/><div><b>31 files passed structural validation</b><p>File signatures, structural markers and parsers were checked where applicable.</p></div></div><div className="finding"><Network/><div><b>126 fragment relationships identified</b><p>Relationships are represented as candidates with confidence rather than absolute certainty.</p></div></div></Card><Card><div className="card-title">Evidence Chain</div><div className="chain">{["Evidence Source","Storage Region","Fragment Cluster","Reconstruction Candidate","Validation","Final Evidence"].map((x,i)=><div key={x}><span>{i+1}</span><b>{x}</b></div>)}</div></Card></div>
 <Card><div className="card-title">Forensic Classification</div><table><thead><tr><th>Classification</th><th>Meaning</th><th>Count</th></tr></thead><tbody><tr><td><Badge tone="success">Verified Recovery</Badge></td><td>Recovered and structurally verified evidence.</td><td>21</td></tr><tr><td><Badge tone="info">Structural Repair</Badge></td><td>Original bytes retained with structural repair.</td><td>10</td></tr><tr><td><Badge tone="warning">Plausible Reconstruction</Badge></td><td>Supported candidate reconstruction requiring review.</td><td>7</td></tr><tr><td><Badge tone="warning">AI-Inferred</Badge></td><td>Inference is explicitly not verified original data.</td><td>2</td></tr><tr><td><Badge tone="danger">Insufficient Evidence</Badge></td><td>Available evidence cannot support a reconstruction.</td><td>7</td></tr></tbody></table></Card>
 </div>
}
'@ | Set-Content -Encoding UTF8 "$base\pages\InvestigationReport.jsx"

@'
import React from "react";
export default function Placeholder(){return null}
'@ | Set-Content -Encoding UTF8 "$base\routes\AppRoutes.jsx"

@'
:root{
 --bg:#07101d;--panel:#0b1626;--panel2:#0e1b2d;--line:#1d2d42;--text:#e7eef8;--muted:#8da0b7;--cyan:#38bdf8;--blue:#2563eb;--green:#22c55e;--amber:#f59e0b;--red:#ef4444;
 font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:var(--bg);
}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 70% -20%,#12304b 0,#07101d 40%);min-width:1100px}button,input,select,textarea{font:inherit}
button{cursor:pointer}.app-shell{display:flex;min-height:100vh}.sidebar{width:246px;position:fixed;inset:0 auto 0 0;background:#06101c;border-right:1px solid var(--line);padding:22px 14px;display:flex;flex-direction:column;z-index:5}.brand{display:flex;gap:11px;align-items:center;padding:4px 10px 28px;cursor:pointer}.brand-mark{width:37px;height:37px;border:1px solid #285a78;background:#0a2132;color:var(--cyan);display:grid;place-items:center;border-radius:9px;box-shadow:0 0 24px #38bdf81a}.brand-name{font-size:15px;font-weight:800;letter-spacing:.12em}.brand-sub{font-size:8px;color:#6f839a;letter-spacing:.16em;margin-top:3px}.sidebar-label,.eyebrow{font-size:10px;letter-spacing:.14em;font-weight:800;color:#68829e}.sidebar-section{padding:0 4px}.sidebar-label{padding:0 9px 10px}.sidebar nav{display:grid;gap:4px}.sidebar nav a{position:relative;text-decoration:none;color:#8093aa;padding:11px 10px;display:flex;align-items:center;gap:11px;border-radius:8px;font-size:12px}.sidebar nav a:hover{background:#0c1c2e;color:#dbeafe}.sidebar nav a.active{background:#10263a;color:#dff6ff;border:1px solid #1b4b66}.nav-active-dot{width:5px;height:5px;border-radius:50%;background:var(--cyan);margin-left:auto;box-shadow:0 0 8px var(--cyan)}.sidebar-bottom{margin-top:auto}.system-card{padding:11px;border:1px solid #183248;background:#081827;border-radius:9px}.system-top{font-size:9px;letter-spacing:.1em;font-weight:800}.status-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 8px #22c55e;margin-right:6px}.system-meta{color:#66809a;font-size:10px;margin-top:5px}.sidebar-version{font-size:8px;color:#45586e;margin:12px 8px 0}.main-area{margin-left:246px;flex:1;min-height:100vh}.topbar{height:86px;border-bottom:1px solid var(--line);background:#07111eeb;backdrop-filter:blur(10px);display:flex;justify-content:space-between;align-items:center;padding:0 34px;position:sticky;top:0;z-index:4}.breadcrumb{display:flex;align-items:center;color:#60758c;font-size:9px;letter-spacing:.12em}.topbar h1{font-size:19px;margin:5px 0 0}.top-actions{display:flex;align-items:center;gap:8px}.icon-btn,.secondary-btn,.primary-btn,.text-btn{border:1px solid var(--line);background:#0b1828;color:#b9c8d8;border-radius:7px;padding:9px 12px;display:inline-flex;align-items:center;gap:8px}.icon-btn{padding:9px}.primary-btn{background:#0e5c86;border-color:#168bc1;color:white;font-weight:700}.primary-btn:hover{background:#1173a5}.secondary-btn:hover,.icon-btn:hover{border-color:#31506c;background:#102237}.text-btn{background:transparent;border:0;color:var(--cyan);padding:4px}.mode-pill{font-size:9px;color:#9eb2c8;border:1px solid var(--line);padding:8px 10px;border-radius:20px;margin-left:6px}.page-wrap{padding:30px 34px 50px;max-width:1600px;margin:auto}.page-intro{display:flex;justify-content:space-between;align-items:end;margin-bottom:22px}.page-intro h2{margin:6px 0 5px;font-size:25px;letter-spacing:-.03em}.page-intro p,.muted{color:var(--muted);font-size:12px;margin:0}.card{background:linear-gradient(145deg,#0b1727,#091321);border:1px solid var(--line);border-radius:10px;padding:19px;box-shadow:0 12px 40px #00000020}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.stat-card{background:#0b1727;border:1px solid var(--line);padding:16px;border-radius:10px;position:relative}.stat-icon{position:absolute;right:15px;top:15px;color:#5d7894}.stat-label{font-size:10px;color:#7d93aa;text-transform:uppercase;letter-spacing:.1em}.stat-value{font-size:27px;font-weight:750;margin-top:9px}.stat-sub{font-size:10px;color:#5e7891;margin-top:4px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.card-title{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:750;color:#dce8f5;margin-bottom:17px}.overview-big{display:flex;gap:9px;align-items:baseline;margin-bottom:20px}.overview-big b{font-size:38px}.overview-big span{font-size:11px;color:var(--muted)}.bar-row,.metric-line{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#91a4ba;margin:11px 0 5px}.bar-row b,.metric-line b{color:#d8e5f3}.mini-bar,.progress-track{height:5px;background:#15253a;border-radius:20px;overflow:hidden}.mini-bar i,.progress-fill{display:block;height:100%;background:linear-gradient(90deg,#12628c,var(--cyan));border-radius:20px}.insight,.contradiction,.finding{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid #17283b}.insight:last-child,.finding:last-child{border-bottom:0}.insight svg,.finding svg{color:var(--cyan);flex:none}.insight b,.finding b{font-size:11px}.insight p,.finding p{margin:4px 0 0;color:#71869c;font-size:10px;line-height:1.5}.live-label{font-size:8px;color:#72d7a0;letter-spacing:.1em}.live-label i{display:inline-block;width:5px;height:5px;background:#22c55e;border-radius:50%;margin-right:5px}.table-card{padding:0;overflow:hidden;margin-bottom:14px}.table-card .card-title{padding:18px 19px 10px;margin:0}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;color:#657b93;font-size:9px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;background:#091522}th,td{padding:12px 15px;border-top:1px solid #15263a}td{color:#9eb0c2}td b{color:#d9e5f1;font-weight:650}td small{display:block;color:#536b83;font-size:9px;margin-top:3px}.badge{display:inline-flex;border:1px solid #304359;padding:4px 7px;border-radius:5px;font-size:8px;font-weight:800;letter-spacing:.04em;color:#aab9c9}.badge-success{color:#70dfa0;border-color:#1e5b43;background:#0b241b}.badge-info{color:#6fc9f7;border-color:#20506b;background:#0a2030}.badge-warning{color:#f4c56b;border-color:#65491e;background:#251c0d}.badge-danger{color:#f28c8c;border-color:#652c2c;background:#251112}.hero-card{min-height:450px;border:1px solid #1b344c;border-radius:13px;background:radial-gradient(circle at 75% 45%,#0d3650 0,#091827 36%,#07111e 72%);position:relative;overflow:hidden;padding:62px}.hero-grid{position:absolute;inset:0;background-image:linear-gradient(#16324a33 1px,transparent 1px),linear-gradient(90deg,#16324a33 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(90deg,#000,transparent 75%);opacity:.4}.hero-copy{position:relative;z-index:2;max-width:620px}.hero-copy h2{font-size:48px;line-height:1.04;margin:18px 0;color:#f3f8fc;letter-spacing:-.04em}.hero-copy h2 span{color:var(--cyan)}.hero-copy p{font-size:14px;line-height:1.8;color:#8ea5bb;max-width:580px}.hero-actions{display:flex;gap:9px;margin-top:27px}.hero-scan{position:absolute;right:110px;top:70px;width:300px;height:300px;display:grid;place-items:center}.scan-ring{position:absolute;border:1px solid #38bdf84d;border-radius:50%;animation:pulse 4s infinite}.r1{width:270px;height:270px}.r2{width:205px;height:205px;animation-delay:1s}.scan-core{width:94px;height:94px;border:1px solid #38bdf880;border-radius:50%;display:grid;place-items:center;color:var(--cyan);background:#0a2434;box-shadow:0 0 70px #38bdf830}.scan-label{position:absolute;bottom:0;text-align:center;color:#607991;font-size:8px;letter-spacing:.16em}.scan-label b{color:#b4c9dc}.section-heading{margin:30px 0 14px}.section-heading h3{font-size:18px;margin:7px 0}.step-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.step-grid .card{min-height:155px}.step-number{font-size:9px;color:#4c718d;margin-bottom:17px}.step-grid h4{margin:12px 0 7px}.step-grid p{font-size:11px;color:#71869c;line-height:1.6;margin:0}.notice{margin-top:14px;border:1px solid #24445b;background:#091b2a;padding:14px 17px;border-radius:9px;display:flex;justify-content:space-between;align-items:center}.notice b{display:block;font-size:11px}.notice span{font-size:10px;color:#71879b}.notice-status{color:#63c5ef!important;letter-spacing:.08em}.form-layout{max-width:980px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-grid label{font-size:10px;color:#7f95aa;text-transform:uppercase;letter-spacing:.08em}.form-grid .full{grid-column:1/-1}.form-grid input,.form-grid select,.form-grid textarea,.filters input,.filters select{display:block;width:100%;margin-top:8px;background:#071320;border:1px solid #1b3046;border-radius:7px;color:#d9e6f3;padding:11px;outline:none}.form-grid textarea{min-height:100px;resize:vertical}.upload-zone{text-align:center;margin-top:14px;padding:38px;border-style:dashed}.upload-zone svg{color:#4b9bc0}.upload-zone h3{margin:12px 0 6px}.upload-zone p{color:#6e8297;font-size:11px;margin-bottom:18px}.record-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}.record-grid small{display:block;color:#60758c;font-size:9px;margin-bottom:5px}.record-grid b{font-size:10px}.mono{font-family:ui-monospace,monospace}.form-actions{display:flex;justify-content:space-between;align-items:center;margin-top:14px}.security-note{font-size:10px;color:#71869c;display:flex;gap:7px;align-items:center}.security-note svg{color:#4fc38b}.analysis-grid,.recon-grid{display:grid;grid-template-columns:1.55fr .75fr;gap:14px;margin-bottom:14px}.pipeline{display:grid;gap:2px}.pipeline-row{display:flex;gap:11px;padding:8px 0}.pipeline-icon{width:27px;height:27px;border-radius:50%;display:grid;place-items:center;background:#112235;color:#71869c}.pipeline-icon.completed{color:#67d99a;background:#0c2a20}.pipeline-icon.running{color:#63c9f4;background:#0b2737}.pipeline-main{flex:1}.pipeline-main>div{display:flex;justify-content:space-between;margin-bottom:7px}.pipeline-main b{font-size:10px}.pipeline-main span{font-size:9px;color:#667d94}.spin{animation:spin 1.2s linear infinite}.side-stack{display:grid;gap:14px}.feasibility-score{font-size:47px;font-weight:800;color:#64d9a0}.feasibility-score span{font-size:20px;color:#55718b}.contradiction svg{color:#f0ad4e}.telemetry{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.telemetry div{padding:13px;background:#081523;border:1px solid #14273b;border-radius:7px}.telemetry small{display:block;color:#61778e;font-size:9px}.telemetry b{display:block;margin-top:6px;font-size:11px}.graph-card{min-height:560px}.graph-3d{height:500px;border:1px solid #142b3f;background:#050d17;border-radius:8px;overflow:hidden;position:relative}.graph-overlay{position:absolute;bottom:10px;left:12px;color:#71869b;font-size:9px;display:flex;gap:6px;align-items:center;background:#07111ddd;padding:6px 8px;border-radius:5px}.fragment-id{font-family:ui-monospace,monospace;font-size:25px;color:var(--cyan);margin-bottom:15px}.class-row{font-size:10px;color:#91a4b8;padding:8px 0;display:flex;align-items:center;gap:9px}.class-dot{width:7px;height:7px;border-radius:50%}.c0{background:#22c55e}.c1{background:#38bdf8}.c2{background:#f59e0b}.c3{background:#a78bfa}.c4{background:#ef4444}.contribution-track{display:flex;height:35px;border-radius:6px;overflow:hidden}.contribution-track div{display:grid;place-items:center;background:#123b55;border-right:1px solid #07111e;font-size:9px;color:#bde9ff}.contribution-track div:nth-child(2){background:#15506c}.contribution-track div:nth-child(3){background:#17607f}.contribution-track div:nth-child(4){background:#1b6f90}.contribution-track div:nth-child(5){background:#2581a1}.contribution-legend{display:flex;gap:17px;flex-wrap:wrap;margin-top:10px}.contribution-legend span{font-size:9px;color:#70869c}.swatch{width:6px;height:6px;border-radius:2px;display:inline-block;margin-right:5px}.s0{background:#123b55}.s1{background:#15506c}.s2{background:#17607f}.s3{background:#1b6f90}.s4{background:#2581a1}.filters{display:grid;grid-template-columns:1fr 150px 150px;gap:8px;padding:15px;border-bottom:1px solid #15263a}.filters input,.filters select{margin:0}.selected-row{background:#0b2031}.table-action{border:0;background:transparent;color:#7190aa;padding:5px}.toolbar{display:flex;gap:7px}.evidence-detail-grid{display:grid;grid-template-columns:1.45fr .7fr;gap:14px}.comparison{height:300px;position:relative;display:flex;overflow:hidden;border:1px solid #1c3247;border-radius:8px}.compare-pane{position:relative;width:50%;overflow:hidden}.compare-label{position:absolute;top:10px;left:10px;z-index:2;background:#06101dcc;padding:5px 7px;border-radius:4px;font-size:8px;letter-spacing:.1em}.fake-image{position:absolute;inset:0;display:grid;place-items:center;color:#dceaf5;font-size:11px}.damage{background:linear-gradient(135deg,#203346,#0b1827 46%,#1b2936)}.recovered-img{background:linear-gradient(160deg,#6c8391 0 27%,#405c6d 28% 44%,#233b49 45% 65%,#0c1a25 66%)}.mountain{width:160px;height:100px;border-left:35px solid transparent;border-right:35px solid transparent;border-bottom:90px solid #1b5369;position:absolute;bottom:40px;left:25%}.damage-block{position:absolute;background:#060b11aa;border:1px solid #e34f4f66}.b1{width:80px;height:70px;left:20%;top:25%}.b2{width:100px;height:38px;right:18%;top:48%}.b3{width:50px;height:80px;left:55%;bottom:10%}.slider-line{position:absolute;top:0;bottom:0;width:2px;background:#fff;z-index:3;pointer-events:none}.compare-slider{position:absolute;inset:auto 0 8px 10%;width:80%;z-index:4;accent-color:#38bdf8}.comparison-stats{display:flex;justify-content:space-between;margin-top:12px;color:#6f8499;font-size:9px}.comparison-stats b{display:block;color:#c9d8e6;margin-top:4px}.dna{display:flex;gap:12px;align-items:center}.dna svg{color:#56d59a}.dna span{display:block;color:#6e8399;font-size:9px;margin-top:3px}.hash{font-family:ui-monospace,monospace;color:#6d849b;background:#07111d;padding:8px;border-radius:5px;font-size:8px;margin:15px 0}.provenance{display:grid;gap:0}.provenance div{display:flex;align-items:center;gap:8px;color:#8da0b5;font-size:9px;padding:8px 0;border-bottom:1px solid #142638}.provenance i{width:6px;height:6px;border-radius:50%;background:#38bdf8}.provenance span{margin-left:auto;color:#3e5d75}.report-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:14px;margin-bottom:14px}.report-cover{text-align:center;padding:26px}.report-icon{width:62px;height:62px;border:1px solid #285a78;background:#0b2637;color:#5fc8f5;display:grid;place-items:center;border-radius:12px;margin:0 auto 18px}.report-cover h3{font-size:25px;margin:10px 0 3px}.report-cover p{color:#70869c;font-size:11px;margin-bottom:17px}.report-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.report-metrics div{padding:15px;background:#081522;border:1px solid #152a3e;text-align:center;border-radius:7px}.report-metrics b{display:block;font-size:22px}.report-metrics span{font-size:8px;color:#657c93;text-transform:uppercase}.chain{display:grid;gap:8px}.chain div{display:flex;gap:10px;align-items:center}.chain span{width:24px;height:24px;border:1px solid #24506a;color:#57c6ef;border-radius:50%;display:grid;place-items:center;font-size:9px}.chain b{font-size:10px}.home{padding-bottom:30px}@keyframes pulse{50%{transform:scale(1.06);opacity:.45}}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1200px){.hero-scan{right:30px;transform:scale(.8)}.hero-copy{max-width:560px}.page-wrap{padding:25px}.stats-grid{grid-template-columns:repeat(2,1fr)}}
'@ | Set-Content -Encoding UTF8 "$base\styles\globals.css"

Write-Host ""
Write-Host "RECOVERAI frontend files created successfully." -ForegroundColor Green
Write-Host "Now run: npm run dev" -ForegroundColor Cyan
