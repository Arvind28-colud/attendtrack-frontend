import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function Dashboard() {
  const [data,     setData]     = useState(null);
  const [todayAtt, setTodayAtt] = useState([]);
  const [error,    setError]    = useState(null);

  useEffect(()=>{
    api.getDashboard().then(setData).catch(e=>setError(e.message));
    api.getTodayAttendance().then(setTodayAtt).catch(()=>{});
  },[]);

  if (error) return <div className="alert alert-error">⚠️ {error} — make sure backend is running on port 8000.</div>;
  if (!data) return <div className="muted" style={{padding:"2rem"}}>Loading dashboard...</div>;

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-label">Total Employees</div>
          <div className="metric-value">{data.total_employees}</div>
          <div className="metric-sub">registered</div>
        </div>
        <div className="metric">
          <div className="metric-label">Present Today</div>
          <div className="metric-value">{data.present}</div>
          <div className="metric-sub">clocked in</div>
        </div>
        <div className="metric metric-light">
          <div className="metric-label">Absent Today</div>
          <div className="metric-value">{data.absent}</div>
          <div className="metric-sub">not yet in</div>
        </div>
        <div className="metric metric-light">
          <div className="metric-label">OT Hours Today</div>
          <div className="metric-value">{data.ot_hours}h</div>
          <div className="metric-sub">overtime</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="card-title">Currently Working</div>
          {data.on_duty.length === 0
            ? <p className="muted">No one currently working.</p>
            : data.on_duty.map(e=>(
              <div key={e.emp_id} className="mini-row">
                <span className="emp-avatar">{e.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
                <span style={{fontWeight:500}}>{e.name}</span>
                <span className="dept-tag">since {e.clock_in}</span>
              </div>
            ))
          }
        </div>
        <div className="card">
          <div className="card-title">Absent Today</div>
          {data.absent_employees.length === 0
            ? <p className="muted">All employees are in!</p>
            : data.absent_employees.map(e=>(
              <div key={e.id} className="mini-row">
                <span className="emp-avatar" style={{background:"#e5e5e5",color:"#525252"}}>{e.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>
                <span style={{fontWeight:500}}>{e.name}</span>
                <span className="badge badge-absent dept-tag">{e.dept}</span>
              </div>
            ))
          }
        </div>
      </div>

      <div className="card">
        <div className="card-title">Today's Activity</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Dept</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>OT</th><th>Status</th></tr></thead>
            <tbody>
              {todayAtt.length === 0
                ? <tr><td colSpan={7} className="muted" style={{textAlign:"center",padding:"1.5rem"}}>No activity today.</td></tr>
                : todayAtt.map((r,i)=>(
                  <tr key={i}>
                    <td>
                      <div className="emp-row">
                        <span className="emp-avatar">{r.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</span>
                        <span style={{fontWeight:500}}>{r.full_name}</span>
                      </div>
                    </td>
                    <td>{r.department}</td>
                    <td>{r.clock_in  || "—"}</td>
                    <td>{r.clock_out || "—"}</td>
                    <td>{r.total_hrs > 0 ? `${r.total_hrs}h` : "—"}</td>
                    <td>{r.ot_hrs > 0 ? <span className="badge badge-ot">{r.ot_hrs}h</span> : "—"}</td>
                    <td>
                      <span className={`badge badge-${r.status==="present"||r.status==="on-duty"?"in":"absent"}`}>
                        {r.status==="on-duty"?"Working":r.status}
                      </span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}