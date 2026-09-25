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
  { id:"EV-005", name:"unknown.bin", type:"Binary", size:"680 KB", status:"Insufficient Evidence", integrity:"â€”", confidence:29, priority:"Low", fragments:12, missing:"71%" },
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
