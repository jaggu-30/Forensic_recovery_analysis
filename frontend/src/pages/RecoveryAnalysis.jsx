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
  <Card><div className="card-title">Scan Telemetry</div><div className="telemetry"><div><small>Bytes scanned</small><b>481.6 MB</b></div><div><small>Fragments</small><b>1,842</b></div><div><small>Candidate files</small><b>47</b></div><div><small>Processing time</small><b>02:18</b></div><div><small>Signatures</small><b>PDF Â· JPEG Â· PNG Â· ZIP</b></div></div></Card>
 </div>
}
