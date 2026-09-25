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
 return <div className="graph-3d"><Canvas camera={{position:[0,0,6],fov:48}}><ambientLight intensity={0.7}/><pointLight position={[3,3,4]} intensity={18} color="#38bdf8"/><pointLight position={[-3,-2,2]} intensity={8} color="#22c55e"/><gridHelper args={[12,12,"#1e293b","#0f172a"]}/>{pts.map((p,i)=><Node key={i} p={p} label={`FR-${String(i+1).padStart(3,"0")}`} selected={selected===i} onClick={()=>setSelected(i)} state={i<8?"Verified":"Reconstructed"}/>)}{relationships.slice(0,8).map(([a,b,c],i)=>{const ai=parseInt(a.slice(3))-1,bi=parseInt(b.slice(3))-1;return ai<12&&bi<12?<Line key={i} points={[pts[ai],pts[bi]]} color={c>.85?"#38bdf8":"#475569"} lineWidth={c>.85?2:1}/> : null})}<OrbitControls enablePan={false}/></Canvas><div className="graph-overlay"><MousePointer2 size={14}/> Drag to orbit Â· Scroll to zoom Â· Click a fragment</div></div>
}
export default function FragmentReconstruction(){
 const [selected,setSelected]=useState(0); const f=fragments[selected];
 return <div><div className="page-intro"><div><span className="eyebrow">FRAGMENT INTELLIGENCE</span><h2>Fragment Reconstruction</h2><p>3D relationship model based on signatures, offsets, entropy and structural compatibility.</p></div><Badge tone="info">126 RELATIONSHIPS</Badge></div>
 <div className="recon-grid"><Card className="graph-card"><div className="card-title"><span>3D Fragment Relationship Graph</span><span className="live-label"><i/> INTERACTIVE</span></div><Graph3D selected={selected} setSelected={setSelected}/></Card>
 <div className="side-stack"><Card><div className="card-title">Selected Fragment</div><div className="fragment-id">{f.id}</div><div className="metric-line"><span>Probable type</span><b>{f.type}</b></div><div className="metric-line"><span>Offset</span><b>{f.offset}</b></div><div className="metric-line"><span>Size</span><b>{f.size}</b></div><div className="metric-line"><span>Entropy</span><b>{f.entropy}</b></div><div className="metric-line"><span>Relationship confidence</span><b>{f.confidence}%</b></div><Badge tone={f.state==="Verified"?"success":"warning"}>{f.state.toUpperCase()}</Badge></Card>
 <Card><div className="card-title">Reconstruction Classes</div>{["Verified Recovery","Structural Repair","Plausible Reconstruction","AI-Inferred Reconstruction","Insufficient Evidence"].map((x,i)=><div className="class-row" key={x}><span className={`class-dot c${i}`}/>{x}</div>)}</Card></div></div>
 <Card><div className="card-title"><span>Fragment Contribution</span><span className="muted">Selected file: IMG_4821.jpg</span></div><div className="contribution"><div className="contribution-track">{fragments.slice(0,5).map((x,i)=><div key={x.id} style={{width:`${[28,22,19,17,14][i]}%`}} title={x.id}>{x.id}</div>)}</div><div className="contribution-legend">{fragments.slice(0,5).map((x,i)=><span key={x.id}><i className={`swatch s${i}`}/>{x.id} Â· {[28,22,19,17,14][i]}%</span>)}</div></div></Card>
 </div>
}
