import React from "react";
export default function ProgressBar({value=0}) {
  return <div className="progress-track"><div className="progress-fill" style={{width:`${value}%`}} /></div>
}
