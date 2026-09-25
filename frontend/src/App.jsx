import React from "react";
import {
  NavLink,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ShieldCheck,
  LayoutDashboard,
  UploadCloud,
  ScanSearch,
  Network,
  Database,
  FileText,
  Search,
  Bell,
  ChevronRight,
  Home as HomeIcon
} from "lucide-react";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import NewInvestigation from "./pages/NewInvestigation";
import RecoveryAnalysis from "./pages/RecoveryAnalysis";
import FragmentReconstruction from "./pages/FragmentReconstruction";
import RecoveredEvidence from "./pages/RecoveredEvidence";
import InvestigationReport from "./pages/InvestigationReport";

const nav = [
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

        <div
          className="brand"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <div className="brand-mark">
            <ShieldCheck size={22} />
          </div>

          <div>
            <div className="brand-name">RECOVERAI</div>
            <div className="brand-sub">
              FORENSIC INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="sidebar-section">

          <div className="sidebar-label">
            INVESTIGATION
          </div>

          <nav>
            {nav.map(([path, label, Icon]) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                <Icon size={17} />

                <span>{label}</span>

                {location.pathname === path && (
                  <span className="nav-active-dot" />
                )}
              </NavLink>
            ))}
          </nav>

        </div>

        <div className="sidebar-bottom">

          <div className="system-card">

            <div className="system-top">
              <span className="status-dot" />
              SYSTEM READY
            </div>

            <div className="system-meta">
              AI analysis engine online
            </div>

          </div>

          <div className="sidebar-version">
            RECOVERAI v0.1 • DEMO MODE
          </div>

        </div>

      </aside>

      <main className="main-area">

        <header className="topbar">

          <div>

            <div className="breadcrumb">
              RECOVERAI
              <ChevronRight size={13} />
              INVESTIGATION
            </div>

            <h1>{title}</h1>

          </div>

          <div className="top-actions">
  <button
    className="back-home-btn"
    onClick={() => navigate("/")}
    title="Back to Home"
  >
    <HomeIcon size={16} />
    <span>BACK TO HOME</span>
  </button>

  <button className="icon-btn" aria-label="Search">
    <Search size={18} />
  </button>

  <button className="icon-btn" aria-label="Notifications">
    <Bell size={18} />
  </button>

  <div className="mode-pill">
    <span className="status-dot" />
    DEMO DATA
  </div>
</div>

        </header>

        <div className="page-wrap">

          <Routes>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/investigation/new"
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

          </Routes>

        </div>

      </main>

    </div>
  );
}

export default function App() {

  const location = useLocation();

  /*
    HOME / INTRO
    stays outside the normal application shell.
  */

  if (location.pathname === "/") {
    return <Home />;
  }

  /*
    All actual RECOVERAI application pages
    use the normal forensic workspace.
  */

  return <AppShell />;
}