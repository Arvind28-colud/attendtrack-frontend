import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login         from "./components/Login";
import Dashboard     from "./components/Dashboard";
import Employees     from "./components/Employees";
import Register      from "./components/Register";
import Attendance    from "./components/Attendance";
import Reports       from "./components/Reports";
import UserClockPage from "./components/UserClockPage";
import "./App.css";

const TABS = [
  { id:"dashboard",  label:"Dashboard",  icon:"⊞" },
  { id:"register",   label:"Register",   icon:"＋" },
  { id:"employees",  label:"Employees",  icon:"◎" },
  { id:"attendance", label:"Attendance", icon:"▦" },
  { id:"reports",    label:"Reports",    icon:"◈" },
];

// SVG icons for mobile nav — crisp, no CDN
const NAV_ICONS = {
  dashboard:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  register:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="4"/><path d="M10.3 15H6a4 4 0 0 0-4 4v1"/><path d="M19 12v6m-3-3h6"/></svg>,
  employees:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>,
  attendance: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>,
  reports:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
};

function AdminApp() {
  const [admin,  setAdmin]  = useState(null);
  const [active, setActive] = useState("dashboard");

  if (!admin) return <Login onLogin={setAdmin} />;

  const render = () => {
    switch(active) {
      case "dashboard":  return <Dashboard />;
      case "register":   return <Register />;
      case "employees":  return <Employees />;
      case "attendance": return <Attendance />;
      case "reports":    return <Reports />;
      default:           return <Dashboard />;
    }
  };

  return (
    <div className="app">
      {/* Desktop top nav */}
      <nav className="nav">
        <div className="nav-logo">◈ AttendTrack</div>
        {TABS.map(t => (
          <button key={t.id} className={`nav-tab ${active===t.id?"active":""}`}
            onClick={() => setActive(t.id)}>{t.label}</button>
        ))}
        <div className="nav-right">
          <span className="nav-user">👤 {admin.username}</span>
          <button className="btn-logout" onClick={() => setAdmin(null)}>Logout</button>
        </div>
      </nav>

      <main className="content" key={active}>{render()}</main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {TABS.map(t => (
          <button key={t.id}
            className={`mobile-nav-item ${active===t.id?"active":""}`}
            onClick={() => setActive(t.id)}>
            <span className="mobile-nav-icon">{NAV_ICONS[t.id]}</span>
            <span className="mobile-nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<UserClockPage />} />
        <Route path="/admin" element={<AdminApp />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
