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
  <div className="page-intro"><div><span className="eyebrow">CURRENT INVESTIGATION</span><h2>Case IR-2026-014</h2><p>Damaged storage image â€¢ analysis workspace â€¢ Demo dataset</p></div><button className="primary-btn" onClick={()=>nav("/analysis")}>Open Analysis <Activity size={16}/></button></div>
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
