import React from "react";
export default function StatCard({label,value,sub,icon:Icon,tone=""}) {
  return <div className={`stat-card ${tone}`}>
    <div className="stat-icon">{Icon && <Icon size={18}/>}</div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
}
