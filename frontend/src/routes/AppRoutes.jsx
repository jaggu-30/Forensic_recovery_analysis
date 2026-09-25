import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import NewInvestigation from "../pages/NewInvestigation";
import RecoveryAnalysis from "../pages/RecoveryAnalysis";
import FragmentReconstruction from "../pages/FragmentReconstruction";
import RecoveredEvidence from "../pages/RecoveredEvidence";
import InvestigationReport from "../pages/InvestigationReport";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/overview" element={<Home />} />

      <Route path="/dashboard" element={<Dashboard />} />

      <Route
        path="/new-investigation"
        element={<NewInvestigation />}
      />

      <Route
        path="/analysis"
        element={<RecoveryAnalysis />}
      />

      <Route
        path="/reconstruction"
        element={<FragmentReconstruction />}
      />

      <Route
        path="/evidence"
        element={<RecoveredEvidence />}
      />

      <Route
        path="/report"
        element={<InvestigationReport />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}