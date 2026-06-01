import { useState } from "react";
import Login        from "./components/Login";
import ClockStation from "./components/ClockStation";
import Dashboard    from "./components/Dashboard";
import Employees    from "./components/Employees";
import Attendance   from "./components/Attendance";
import Reports      from "./components/Reports";
import "./App.css";

const TABS = [
  { id:"station",    label:"Clock-in",   icon:"ti-fingerprint"      },
  { id:"dashboard",  label:"Dashboard",  icon:"ti-layout-dashboard" },
  { id:"employees",  label:"Employees",  icon:"ti-users"            },
  { id:"attendance", label:"Attendance", icon:"ti-calendar-stats"   },
  { id:"reports",    label:"Reports",    icon:"ti-report-money"     },
];

export default function App() {
  const [admin,  setAdmin]  = useState(null);
  const [active, setActive] = useState("station");
  if (!admin) return <Login onLogin={setAdmin} />;
  const render = () => {
    switch(active){
      case "station":    return <ClockStation />;
      case "dashboard":  return <Dashboard />;
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
        {TABS.map(t=>(
          <button key={t.id} className={`nav-tab ${active===t.id?"active":""}`} onClick={()=>setActive(t.id)}>{t.label}</button>
        ))}
        <div className="nav-right">
          <span className="nav-user">👤 {admin.username}</span>
          <button className="btn-logout" onClick={()=>setAdmin(null)}>Logout</button>
        </div>
      </nav>
      <main className="content" key={active}>{render()}</main>
      <nav className="mobile-nav">
        {TABS.map(t=>(
          <button key={t.id} className={`mobile-nav-item ${active===t.id?"active":""}`} onClick={()=>setActive(t.id)}>
            <i className={`ti ${t.icon}`} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}