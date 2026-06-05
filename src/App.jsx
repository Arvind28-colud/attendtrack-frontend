import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login        from "./components/Login";
import Dashboard    from "./components/Dashboard";
import Employees    from "./components/Employees";
import Register     from "./components/Register";
import Attendance   from "./components/Attendance";
import Reports      from "./components/Reports";
import UserClockPage from "./components/UserclockPage";
import "./App.css";

const TABS = [
  { id:"dashboard",  label:"Dashboard"  },
  { id:"register",   label:"Register"   },
  { id:"employees",  label:"Employees"  },
  { id:"attendance", label:"Attendance" },
  { id:"reports",    label:"Reports"    },
];

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
      <nav className="mobile-nav">
        {TABS.map(t => (
          <button key={t.id} className={`mobile-nav-item ${active===t.id?"active":""}`}
            onClick={() => setActive(t.id)}>
            <span>{t.label}</span>
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