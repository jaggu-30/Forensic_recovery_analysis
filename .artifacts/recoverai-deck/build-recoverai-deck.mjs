import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:\\Users\\user\\Downloads\\RecoverAI";
const skillDir = "C:\\Users\\user\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.909.12148\\skills\\presentations";
const buildDir = path.join(workspaceDir, ".artifacts", "recoverai-deck");
const finalPptx = path.join(workspaceDir, "docs", "presentation", "RECOVERAI_hackathon_architecture_final.pptx");
const runtimePython = "C:\\Users\\user\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

const { resolvePresentationFont, finalizePresentation } = await import(
  pathToFileURL(path.join(skillDir, "container_tools", "artifact_tool_utils.mjs")).href,
);

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(path.dirname(finalPptx), { recursive: true });

const font = resolvePresentationFont();
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

const colors = {
  navy: "#071521",
  navy2: "#0B1D2C",
  ink: "#102536",
  slate: "#527185",
  pale: "#BED4E1",
  white: "#F7FBFD",
  cyan: "#39BDE7",
  cyanSoft: "#AEEAFF",
  green: "#55D6A6",
  amber: "#F2B74A",
  red: "#ED6A5E",
  line: "#244455",
};

function rect(slide, position, fill, line = "none", radius = undefined) {
  return slide.shapes.add({
    geometry: "rect",
    position,
    fill,
    line: line === "none" ? { fill: "none", width: 0 } : { style: "solid", fill: line, width: 1 },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function line(slide, position, color = colors.line, width = 1) {
  return slide.shapes.add({
    geometry: "line",
    position,
    fill: "none",
    line: { style: "solid", fill: color, width },
  });
}

function text(slide, value, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: font,
    fontSize: 22,
    color: colors.white,
    autoFit: "shrinkText",
    ...style,
  };
  return shape;
}

function title(slide, value, subtitle = "") {
  text(slide, value, { left: 68, top: 48, width: 880, height: 52 }, {
    fontSize: 34, bold: true, color: colors.white,
  });
  if (subtitle) {
    text(slide, subtitle, { left: 70, top: 103, width: 900, height: 28 }, {
      fontSize: 16, color: colors.pale,
    });
  }
  line(slide, { left: 68, top: 137, width: 1144, height: 0 }, colors.cyan, 2);
}

function footer(slide, number) {
  text(slide, `RECOVERAI  /  CALMSTACKS 24H HACKATHON  /  ${String(number).padStart(2, "0")}`,
    { left: 68, top: 682, width: 780, height: 20 },
    { fontSize: 11, color: colors.slate, bold: true });
}

function note(slide, value) {
  slide.speakerNotes.textFrame.setText(value);
}

function marker(slide, label, x, y, color) {
  rect(slide, { left: x, top: y + 8, width: 10, height: 10 }, color, "none", 6);
  text(slide, label, { left: x + 20, top: y, width: 240, height: 26 }, {
    fontSize: 15, color: colors.pale, bold: true,
  });
}

// 1. Cover
{
  const slide = deck.slides.add();
  slide.background.fill = colors.navy;
  const imageBytes = await fs.readFile(path.join(buildDir, "cover-forensics.png"));
  slide.images.add({
    blob: imageBytes,
    contentType: "image/png",
    alt: "Abstract digital Earth and forensic evidence signals",
    fit: "cover",
    position: { left: 0, top: 0, width: 1280, height: 720 },
  });
  rect(slide, { left: 0, top: 0, width: 730, height: 720 }, "#03111D/88");
  rect(slide, { left: 68, top: 170, width: 6, height: 256 }, colors.green);
  text(slide, "RECOVERAI", { left: 104, top: 164, width: 510, height: 68 }, {
    fontSize: 56, bold: true, color: colors.white,
  });
  text(slide, "AI-Assisted Intelligent Data Recovery\nand Digital Evidence Reconstruction", { left: 106, top: 244, width: 530, height: 108 }, {
    fontSize: 28, color: colors.cyanSoft, bold: true,
  });
  text(slide, "Cybersecurity & AI track  |  CALMSTACKS 24H Hackathon", { left: 106, top: 382, width: 520, height: 26 }, {
    fontSize: 17, color: colors.pale,
  });
  text(slide, "A forensic recovery prototype that makes its evidence limits visible.", { left: 106, top: 522, width: 500, height: 50 }, {
    fontSize: 20, color: colors.white,
  });
  note(slide, "Cover illustration generated with OpenAI ImageGen for this presentation. All technical facts come from the local RECOVERAI benchmark metadata and source code.");
}

// 2. Problem and thesis
{
  const slide = deck.slides.add();
  slide.background.fill = colors.navy;
  title(slide, "Recovery evidence needs a trust boundary", "Deleted or damaged bytes are not automatically recoverable evidence");
  text(slide, "Traditional recovery tools often stop at file retrieval. Investigators still need to know whether fragments belong together, what is missing, and whether an output can be trusted.",
    { left: 70, top: 176, width: 650, height: 92 }, { fontSize: 25, color: colors.white });
  line(slide, { left: 740, top: 178, width: 0, height: 382 }, colors.line, 2);
  const items = [
    ["Identify", "Signatures, structure, entropy and block-level evidence", colors.cyan],
    ["Relate", "Neighbor offsets, compatible file type and fragment features", colors.green],
    ["Decide", "Verified recovery only when independent bytes support it", colors.amber],
  ];
  items.forEach(([heading, body, color], index) => {
    const y = 188 + index * 122;
    rect(slide, { left: 800, top: y, width: 12, height: 72 }, color, "none", 6);
    text(slide, heading, { left: 840, top: y, width: 260, height: 30 }, { fontSize: 24, bold: true, color });
    text(slide, body, { left: 840, top: y + 35, width: 330, height: 42 }, { fontSize: 17, color: colors.pale });
  });
  text(slide, "Core rule: missing bytes remain missing until a trusted source verifies them.", { left: 70, top: 485, width: 600, height: 56 }, {
    fontSize: 25, bold: true, color: colors.green,
  });
  footer(slide, 2);
  note(slide, "Problem framing comes from the official CALMSTACKS problem statement supplied with this project.");
}

// 3. Pipeline
{
  const slide = deck.slides.add();
  slide.background.fill = colors.navy;
  title(slide, "Evidence analysis pipeline", "Each stage stores concrete facts that investigators can inspect");
  const stages = [
    ["Upload", "SHA-256\nprovenance"],
    ["Scan", "signatures\nstructure"],
    ["Fragments", "4 KiB blocks\nentropy"],
    ["Relations", "offsets\ncompatibility"],
    ["Feasibility", "damage\nconfidence"],
    ["Validation", "verified\nartifact"],
  ];
  const shapes = [];
  stages.forEach(([heading, detail], index) => {
    const x = 70 + index * 192;
    const surface = rect(slide, { left: x, top: 260, width: 150, height: 178 }, colors.navy2, colors.line, "rounded-xl");
    shapes.push(surface);
    text(slide, `0${index + 1}`, { left: x + 18, top: 278, width: 36, height: 26 }, { fontSize: 14, color: colors.cyan, bold: true });
    text(slide, heading, { left: x + 18, top: 318, width: 116, height: 32 }, { fontSize: 21, color: colors.white, bold: true });
    text(slide, detail, { left: x + 18, top: 362, width: 116, height: 48 }, { fontSize: 16, color: colors.pale });
    if (index < stages.length - 1) {
      line(slide, { left: x + 150, top: 349, width: 42, height: 0 }, colors.cyan, 2);
    }
  });
  text(slide, "The client renders backend results. No dashboard metric substitutes a backend analysis record.", { left: 166, top: 525, width: 950, height: 34 }, {
    fontSize: 20, color: colors.cyanSoft, bold: true,
  });
  footer(slide, 3);
  note(slide, "Pipeline labels reflect the implemented FastAPI analysis and reconstruction endpoints in the local project.");
}

// 4. Explainable fragment intelligence
{
  const slide = deck.slides.add();
  slide.background.fill = colors.navy;
  title(slide, "Explainable fragment intelligence", "Observed features produce evidence-compatible classifications and graph candidates");
  const left = rect(slide, { left: 74, top: 200, width: 300, height: 290 }, colors.navy2, colors.line, "rounded-xl");
  text(slide, "Observed block features", { left: 100, top: 225, width: 240, height: 34 }, { fontSize: 24, bold: true, color: colors.white });
  marker(slide, "Validated signature", 104, 285, colors.cyan);
  marker(slide, "Shannon entropy", 104, 335, colors.green);
  marker(slide, "Byte composition", 104, 385, colors.amber);
  marker(slide, "Structural markers", 104, 435, colors.cyan);
  const middle = rect(slide, { left: 486, top: 232, width: 310, height: 225 }, "#0D2B3B", colors.cyan, "rounded-xl");
  text(slide, "Feature model", { left: 520, top: 265, width: 240, height: 36 }, { fontSize: 26, bold: true, color: colors.cyanSoft });
  text(slide, "Classification\nconfidence score\nfragment hash", { left: 520, top: 320, width: 230, height: 96 }, { fontSize: 21, color: colors.white });
  const right = rect(slide, { left: 910, top: 200, width: 290, height: 290 }, colors.navy2, colors.line, "rounded-xl");
  text(slide, "Relationship candidate", { left: 938, top: 225, width: 232, height: 34 }, { fontSize: 24, bold: true, color: colors.white });
  marker(slide, "Offset continuity  40%", 940, 288, colors.cyan);
  marker(slide, "Type match  25%", 940, 338, colors.green);
  marker(slide, "Entropy match  20%", 940, 388, colors.amber);
  marker(slide, "Class match  15%", 940, 438, colors.cyan);
  line(slide, { left: 376, top: 346, width: 108, height: 0 }, colors.cyan, 3);
  line(slide, { left: 798, top: 346, width: 110, height: 0 }, colors.cyan, 3);
  text(slide, "Scores describe compatibility. They never prove original file membership.", { left: 312, top: 550, width: 680, height: 32 }, { fontSize: 21, bold: true, color: colors.amber });
  footer(slide, 4);
  note(slide, "Weights: physical offset continuity 40%, type compatibility 25%, entropy similarity 20%, classification compatibility 15%. Source: backend/app/ai/relationship_engine.py.");
}

// 5. Controlled benchmark
{
  const slide = deck.slides.add();
  slide.background.fill = colors.navy;
  title(slide, "Controlled benchmark recovery", "A 4,096-byte removal creates a known test condition for byte-level verification");
  const items = [
    ["Original PDF", "192,071 bytes", colors.cyan],
    ["Controlled damage", "4,096 bytes removed\noffsets 90,000–94,095", colors.red],
    ["Damaged input", "187,975 bytes", colors.amber],
    ["Recovered artifact", "192,071 bytes\nSHA-256 match", colors.green],
  ];
  items.forEach(([heading, body, color], index) => {
    const x = 74 + index * 286;
    rect(slide, { left: x, top: 244, width: 224, height: 190 }, colors.navy2, color, "rounded-xl");
    rect(slide, { left: x + 24, top: 267, width: 10, height: 10 }, color, "none", 6);
    text(slide, heading, { left: x + 48, top: 254, width: 148, height: 38 }, { fontSize: 21, bold: true, color: colors.white });
    text(slide, body, { left: x + 24, top: 327, width: 175, height: 62 }, { fontSize: 18, color: colors.pale, bold: true });
    if (index < items.length - 1) line(slide, { left: x + 225, top: 338, width: 60, height: 0 }, colors.line, 2);
  });
  text(slide, "Ground truth notice: RECOVERAI recognizes this test only by exact damaged-file SHA-256. The benchmark source supplies the missing bytes and the output must match the trusted original hash.", { left: 92, top: 518, width: 1085, height: 52 }, {
    fontSize: 20, color: colors.cyanSoft,
  });
  footer(slide, 5);
  note(slide, "Benchmark facts: data/benchmark/damaged/damage_metadata.json. The app explicitly labels this source GROUND_TRUTH and does not present it as independent forensic discovery.");
}

// 6. Verification boundaries
{
  const slide = deck.slides.add();
  slide.background.fill = colors.navy;
  title(slide, "Verification boundary and recovery states", "The product separates assessable damage from bytes that can be defended as recovered");
  const states = [
    ["VERIFIED RECOVERY", "Independent source plus SHA-256 match", colors.green],
    ["STRUCTURAL REPAIR", "Format structure can be assessed, but bytes remain unavailable", colors.cyan],
    ["PLAUSIBLE RECONSTRUCTION", "Evidence supports a limited hypothesis, not original bytes", colors.amber],
    ["AI-INFERRED RECONSTRUCTION", "Experimental inference must be labelled and cannot claim original evidence", colors.amber],
    ["INSUFFICIENT EVIDENCE", "No supported original-byte output and no download", colors.red],
  ];
  states.forEach(([heading, body, color], index) => {
    const y = 184 + index * 82;
    rect(slide, { left: 76, top: y, width: 268, height: 52 }, color, "none", "rounded-lg");
    text(slide, heading, { left: 92, top: y + 13, width: 238, height: 25 }, { fontSize: 15, bold: true, color: colors.navy });
    text(slide, body, { left: 386, top: y + 7, width: 440, height: 50 }, { fontSize: 18, color: colors.white });
  });
  text(slide, "Download endpoint", { left: 858, top: 180, width: 220, height: 30 }, { fontSize: 20, bold: true, color: colors.cyanSoft });
  line(slide, { left: 1088, top: 214, width: 0, height: 258 }, colors.line, 2);
  text(slide, "Available only after\na verified artifact exists.\n\nOtherwise the endpoint\nreturns HTTP 409.", { left: 858, top: 244, width: 205, height: 168 }, { fontSize: 18, color: colors.pale });
  footer(slide, 6);
  note(slide, "Recovery states derive from the supplied project requirements. The download route in backend/app/api/reconstruction.py returns HTTP 409 when no verified output is available.");
}

// 7. Product walkthrough
{
  const slide = deck.slides.add();
  slide.background.fill = colors.navy;
  title(slide, "Investigator workflow", "The existing React pages form one evidence journey");
  const pages = [
    ["New Investigation", "Create case and upload evidence"],
    ["Recovery Analysis", "Run scan and reconstruction assessment"],
    ["Fragment Reconstruction", "Inspect scored relationship graph"],
    ["Recovered Evidence", "Review comparison, DNA and damage map"],
    ["Investigation Report", "Export structured evidence summary"],
  ];
  pages.forEach(([heading, body], index) => {
    const x = 54 + index * 235;
    const y = 310;
    rect(slide, { left: x, top: y, width: 198, height: 112 }, index === 3 ? "#0B3040" : colors.navy2, index === 3 ? colors.cyan : colors.line, "rounded-xl");
    text(slide, `0${index + 1}`, { left: x + 18, top: y + 15, width: 34, height: 20 }, { fontSize: 13, bold: true, color: colors.green });
    text(slide, heading, { left: x + 18, top: y + 42, width: 162, height: 25 }, { fontSize: 16, bold: true, color: colors.white });
    text(slide, body, { left: x + 18, top: y + 70, width: 162, height: 28 }, { fontSize: 13, color: colors.pale });
    if (index < pages.length - 1) line(slide, { left: x + 198, top: y + 56, width: 37, height: 0 }, colors.cyan, 2);
  });
  text(slide, "The UI communicates both the recovery result and its evidentiary basis, including missing bytes and provenance.", { left: 162, top: 562, width: 930, height: 34 }, { fontSize: 21, color: colors.cyanSoft, bold: true });
  footer(slide, 7);
  note(slide, "Page names and behavior are from the React application in frontend/src/pages. This slide summarizes the implemented evidence journey.");
}

// 8. Judge-ready demo
{
  const slide = deck.slides.add();
  slide.background.fill = colors.navy;
  title(slide, "Demo proof points", "What the judges can test in the working prototype");
  const proof = [
    ["1", "Upload the damaged benchmark", "Creates investigation, stores evidence and computes SHA-256."],
    ["2", "Open the analysis view", "Shows signatures, fragment count, relationship count and recovery assessment."],
    ["3", "Inspect the damage map", "Shows observed, missing, reconstructed and uncertain regions with a ground-truth label."],
    ["4", "Download the verified output", "Works only for the exact benchmark and confirms a SHA-256 match to the original."],
    ["5", "Try unrelated evidence", "Shows analysis results without inventing a recovery artifact."],
  ];
  proof.forEach(([num, heading, body], index) => {
    const y = 184 + index * 84;
    rect(slide, { left: 84, top: y, width: 46, height: 46 }, index === 3 ? colors.green : colors.cyan, "none", 24);
    text(slide, num, { left: 99, top: y + 10, width: 18, height: 24 }, { fontSize: 18, bold: true, color: colors.navy });
    text(slide, heading, { left: 162, top: y - 2, width: 360, height: 28 }, { fontSize: 22, bold: true, color: colors.white });
    text(slide, body, { left: 162, top: y + 32, width: 680, height: 28 }, { fontSize: 16, color: colors.pale });
  });
  rect(slide, { left: 914, top: 210, width: 238, height: 270 }, "#0D2B3B", colors.cyan, "rounded-xl");
  text(slide, "Forensic promise", { left: 944, top: 250, width: 180, height: 32 }, { fontSize: 23, bold: true, color: colors.cyanSoft });
  text(slide, "RECOVERAI shows\nwhat it knows,\nwhat it can verify,\nand what remains\nunknown.", { left: 944, top: 318, width: 170, height: 136 }, { fontSize: 22, color: colors.white, bold: true });
  footer(slide, 8);
  note(slide, "Demo steps are documented in docs/demo-runbook.md. Facts are local project facts, not external research claims.");
}

const candidatePath = path.join(buildDir, "candidate-recoverai.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);

const requirements = {
  explicitTotalSlideCount: 8,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
};
const fontPolicy = { basis: "design", families: [font] };

const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: finalPptx,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  fontPolicy,
  verifyArtifactToolImport: true,
  receiptPath: path.join(buildDir, "RECOVERAI_hackathon_architecture_final.validation.json"),
});

console.log(JSON.stringify({ finalPptx, result }, null, 2));
