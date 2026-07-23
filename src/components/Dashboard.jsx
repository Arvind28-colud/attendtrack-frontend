import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function Dashboard() {
  const [data,        setData]        = useState(null);
  const [todayAtt,    setTodayAtt]    = useState([]);
  const [missedOut,   setMissedOut]   = useState([]); // forgot log-out
  const [error,       setError]       = useState(null);
  const [markModal,   setMarkModal]   = useState(null); // { emp_id, name, log_in, date }
  const [markTime,    setMarkTime]    = useState("18:00");
  const [marking,     setMarking]     = useState(false);
  const [markAlert,   setMarkAlert]   = useState(null);

  const load = () => {
    api.getDashboard().then(setData).catch(e=>setError(e.message));
    api.getTodayAttendance().then(recs => {
      setTodayAtt(recs);
      const now = new Date();
      const missed = recs.filter(r => {
        if (r.status !== "on-duty" || !r.log_in || r.log_out) return false;
        // Parse log_in time and check if 9+ hours have passed
        const [h, m] = r.log_in.split(":").map(Number);
        const clockInMs = new Date();
        clockInMs.setHours(h, m, 0, 0);
        const hoursWorked = (now - clockInMs) / (1000 * 60 * 60);
        return hoursWorked >= 9;
      });
      setMissedOut(missed);
    }).catch(()=>{});
  };

  useEffect(() => { load(); }, []);

  const handleMarkOut = async () => {
    if (!markModal || !markTime) return;
    setMarking(true); setMarkAlert(null);
    try {
      await api.manualClockOut(markModal.emp_id, markModal.date, markTime);
      setMarkAlert({ type:"success", msg:`Logged out ${markModal.name} at ${markTime}` });
      setTimeout(() => { setMarkModal(null); setMarkAlert(null); load(); }, 1200);
    } catch(e) {
      setMarkAlert({ type:"error", msg: e.message });
    }
    setMarking(false);
  };

  if (error) return <div className="alert alert-error">⚠️ {error}</div>;
  if (!data)  return <div className="muted" style={{ padding:"2rem" }}>Loading dashboard...</div>;

  return (
    <div>
      {/* Missed log-out modal */}
      {markModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setMarkModal(null)}>
          <div className="modal-box" style={{ maxWidth:380 }}>
            <div className="modal-header">
              <div style={{ fontWeight:700, fontSize:14, color:"var(--white)" }}>Mark Log-Out</div>
              <button className="btn" style={{ padding:"5px 10px" }} onClick={()=>setMarkModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom:"1rem", fontSize:13, color:"var(--text2)" }}>
                <b style={{ color:"var(--white)" }}>{markModal.name}</b> Logged in at <b style={{ color:"var(--white)" }}>{markModal.log_in}</b> and never logged out.
              </div>
              <div className="form-group">
                <label className="form-label">Log-Out Time</label>
                <input type="time" value={markTime} onChange={e=>setMarkTime(e.target.value)} />
              </div>
              {markAlert && <div className={`alert alert-${markAlert.type}`}>{markAlert.msg}</div>}
              <button className="btn btn-primary full-width" onClick={handleMarkOut} disabled={marking}>
                {marking ? "Saving..." : "✓ Mark as Logged Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missed log-out alert banner */}
      {missedOut.length > 0 && (
        <div style={{
          background:"var(--surface)", border:"1px solid var(--border2)",
          borderRadius:"var(--r-lg)", padding:"1rem 1.25rem",
          marginBottom:"1rem", display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:"1rem", flexWrap:"wrap"
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:28, height:28, borderRadius:6,
              background:"var(--white)", color:"var(--black)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:800, fontSize:14, flexShrink:0
            }}>{missedOut.length}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"var(--white)" }}>
                Forgot to Log Out
              </div>
              <div style={{ fontSize:12, color:"var(--text3)" }}>
                {missedOut.map(r=>`${r.full_name} (${r.project_name || "No Project"})`).join(", ")}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {missedOut.map(r => (
              <button key={r.emp_id} className="btn" style={{ fontSize:11, padding:"5px 10px" }}
                onClick={() => {
                  setMarkModal({ emp_id:r.emp_id, name:r.full_name, log_in:r.log_in, date:r.date });
                  setMarkTime("18:00");
                }}>
                Mark out: {r.full_name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric metric-dark">
          <div className="metric-label">Total Employees</div>
          <div className="metric-value">{data.total_employees}</div>
          <div className="metric-sub">registered</div>
        </div>
        <div className="metric metric-dark">
          <div className="metric-label">Present Today</div>
          <div className="metric-value">{data.present}</div>
          <div className="metric-sub">Logged in</div>
        </div>
        <div className="metric metric-light" style={{ position:"relative" }}>
          <div className="metric-label">Absent Today</div>
          <div className="metric-value">{data.absent}</div>
          <div className="metric-sub">not yet in</div>
        </div>
        <div className="metric metric-light" style={{ position:"relative" }}>
          <div className="metric-label">Forgot Log-Out</div>
          <div className="metric-value">{missedOut.length}</div>
          <div className="metric-sub">need attention</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-title">Currently Working</div>
          <div style={{ maxHeight: "280px", overflowY: "auto", paddingRight: "4px" }}>
            {data.on_duty.length === 0
              ? <p className="muted">No one currently working.</p>
              : data.on_duty.map(e => (
                <div key={e.emp_id} className="mini-row">
                  <span className="emp-avatar">{e.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <span style={{ fontWeight:500 }}>{e.name}</span>
                    {e.project_name && <span style={{ fontSize:10, color:"var(--text3)" }}>{e.project_name}</span>}
                  </div>
                  <span className="dept-tag">since {e.log_in}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Absent Today</div>
          <div style={{ maxHeight: "280px", overflowY: "auto", paddingRight: "4px" }}>
            {data.absent_employees.length === 0
              ? <p className="muted">All employees are in!</p>
              : data.absent_employees.map(e => (
                <div key={e.id} className="mini-row">
                  <span className="emp-avatar">{e.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <span style={{ fontWeight:500 }}>{e.name}</span>
                    {e.project_name && <span style={{ fontSize:10, color:"var(--text3)" }}>{e.project_name}</span>}
                  </div>
                  <span className="badge badge-dept">{e.dept}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Missed log-out section */}
      {missedOut.length > 0 && (
        <div className="card">
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"1rem" }}>
            <div className="card-title" style={{ marginBottom:0 }}>Forgot to Log Out</div>
            <div style={{
              width:20, height:20, borderRadius:4, background:"var(--white)",
              color:"var(--black)", fontSize:11, fontWeight:800,
              display:"flex", alignItems:"center", justifyContent:"center"
            }}>{missedOut.length}</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Employee</th><th>Department</th><th>Log In</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {missedOut.map((r,i) => (
                  <tr key={i}>
                    <td>
                      <div className="emp-row">
                        <span className="emp-avatar">{r.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight:600 }}>{r.full_name}</span>
                          {r.project_name && <span className="badge badge-project" style={{ fontSize:10, padding:"2px 6px", marginTop:4, width:"fit-content" }}>{r.project_name}</span>}
                        </div>
                      </div>
                    </td>
                    <td><span className="muted">{r.department}</span></td>
                    <td>{r.log_in}</td>
                    <td>{r.date}</td>
                    <td>
                      <button className="btn" style={{ fontSize:11, padding:"4px 10px" }}
                        onClick={() => { setMarkModal({ emp_id:r.emp_id, name:r.full_name, log_in:r.log_in, date:r.date }); setMarkTime("18:00"); }}>
                        Mark Out
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's activity */}
      <div className="card">
        <div className="card-title">Today's Activity</div>
        <div className="table-wrap" style={{ maxHeight: "450px", overflowY: "auto" }}>
          <table>
            <thead>
              <tr><th>Employee</th><th>Dept</th><th>Log In</th><th>Log Out</th><th>Hours</th><th>OT</th><th>Status</th></tr>
            </thead>
            <tbody>
              {todayAtt.length === 0
                ? <tr><td colSpan={7} className="muted" style={{ textAlign:"center", padding:"1.5rem" }}>No activity today.</td></tr>
                : todayAtt.map((r,i) => (
                  <tr key={i}>
                    <td>
                      <div className="emp-row">
                        <span className="emp-avatar">{r.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight:500 }}>{r.full_name}</span>
                          {r.project_name && <span className="badge badge-project" style={{ fontSize:10, padding:"2px 6px", marginTop:4, width:"fit-content" }}>{r.project_name}</span>}
                        </div>
                      </div>
                    </td>
                    <td><span className="muted">{r.department}</span></td>
                    <td>{r.log_in||"—"}</td>
                    <td>{r.log_out || <span style={{ color:"#ff6b6b", fontSize:11 }}>⚠ Not logged out</span>}</td>
                    <td>{r.total_hrs>0?`${r.total_hrs}h`:"—"}</td>
                    <td>{r.ot_hrs>0?<span className="badge badge-ot">{r.ot_hrs}h</span>:"—"}</td>
                    <td><span className={`badge badge-${r.status==="present"||r.status==="on-duty"?"in":"absent"}`}>{r.status==="on-duty"?"Working":r.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}