import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function Attendance() {
  const [employees,  setEmployees]  = useState([]);
  const [empFilter,  setEmpFilter]  = useState("");
  const [empDetail,  setEmpDetail]  = useState(null);
  const [filterMode, setFilterMode] = useState("month"); // "month" | "date"
  const [month,      setMonth]      = useState(new Date().toISOString().slice(0,7));
  const [date,       setDate]       = useState(new Date().toISOString().slice(0,10));
  const [records,    setRecords]    = useState([]);

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(()=>{});
    fetchRecords();
  }, []);

  const fetchRecords = async (eid=empFilter, m=month, d=date, mode=filterMode) => {
    const params = {};
    if (eid)  params.emp_id = parseInt(eid);
    if (mode === "month") { if (m) params.month = m; }
    else                  { if (d) params.date_filter = d; }
    const data = await api.getAttendance(params).catch(()=>[]);
    setRecords(data);
  };

  const handleEmpChange = async (id) => {
    setEmpFilter(id);
    if (id) {
      const det = await api.getEmployee(parseInt(id)).catch(()=>null);
      setEmpDetail(det);
    } else {
      setEmpDetail(null);
    }
    fetchRecords(id, month, date, filterMode);
  };

  const handleFilter = () => fetchRecords(empFilter, month, date, filterMode);

  const handleModeChange = (m) => {
    setFilterMode(m);
    fetchRecords(empFilter, month, date, m);
  };

  return (
    <div>
      {/* ── Filters ── */}
      <div className="card">
        <div className="filter-bar" style={{ flexWrap:"wrap", gap:"0.75rem", alignItems:"flex-end" }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Employee</label>
            <select value={empFilter} onChange={e=>handleEmpChange(e.target.value)} style={{ width:220 }}>
              <option value="">All employees</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Filter By</label>
            <div className="toggle-group">
              <button className={`toggle-btn ${filterMode==="month"?"active":""}`} onClick={()=>handleModeChange("month")}>Month</button>
              <button className={`toggle-btn ${filterMode==="date"?"active":""}`}  onClick={()=>handleModeChange("date")}>Specific Date</button>
            </div>
          </div>

          {filterMode === "month"
            ? <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Month</label>
                <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{ width:160 }}/>
              </div>
            : <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Date</label>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:160 }}/>
              </div>
          }

          <button className="btn" style={{ alignSelf:"flex-end" }} onClick={handleFilter}>Filter</button>
        </div>
      </div>

      {/* ── Employee detail panel ── */}
      {empDetail && (
        <div className="card emp-full-detail">
          <div className="card-title">Employee Details</div>
          <div className="detail-grid">
            <div className="emp-big-avatar">
              {empDetail.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div className="detail-fields">
              <div className="detail-row"><span>Full Name</span><strong>{empDetail.full_name}</strong></div>
              <div className="detail-row"><span>Email</span><strong>{empDetail.email}</strong></div>
              <div className="detail-row"><span>Aadhaar</span><strong>{empDetail.aadhaar_no.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3")}</strong></div>
              <div className="detail-row"><span>Department</span><strong>{empDetail.department}</strong></div>
              <div className="detail-row"><span>Shift</span><strong>{empDetail.shift_hrs} hrs/day</strong></div>
            </div>
            <div className="detail-summary">
              <div className="summary-item">
                <div className="summary-num">{records.filter(r=>r.status==="present").length}</div>
                <div className="summary-label">Present</div>
              </div>
              <div className="summary-item">
                <div className="summary-num">{records.filter(r=>r.status==="absent").length}</div>
                <div className="summary-label">Absent</div>
              </div>
              <div className="summary-item">
                <div className="summary-num">{records.reduce((s,r)=>s+parseFloat(r.ot_hrs||0),0).toFixed(1)}h</div>
                <div className="summary-label">OT Hrs</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="card">
        <div className="card-title">
          Attendance Records
          <span className="muted" style={{ fontWeight:400, marginLeft:8 }}>({records.length} records)</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Employee</th><th>Dept</th>
                <th>Clock In</th><th>Clock Out</th>
                <th>Total Hrs</th><th>OT Hrs</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0
                ? <tr><td colSpan={8} className="muted" style={{textAlign:"center",padding:"1.5rem"}}>No records found.</td></tr>
                : records.map((r,i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
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
                        {r.status === "on-duty" ? "Working" : r.status}
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