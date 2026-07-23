import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function Attendance() {
  const [employees,  setEmployees]  = useState([]);
  const [empFilter,  setEmpFilter]  = useState("");
  const [empDetail,  setEmpDetail]  = useState(null);
  const [filterMode, setFilterMode] = useState("date"); // "month" | "date"
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

  const handlePrintReport = () => {
    if (!empDetail) return;
    const win = window.open("", "_blank", "width=900,height=700");
    const tableRows = records.map(r => `
      <tr>
        <td>${r.date}</td>
        <td>${r.log_in || "—"}</td>
        <td>${r.log_out || "—"}</td>
        <td>${r.total_hrs > 0 ? r.total_hrs + 'h' : "—"}</td>
        <td>${r.ot_hrs > 0 ? r.ot_hrs + 'h' : "—"}</td>
        <td><span style="font-weight:600;color:${r.status==='present'||r.status==='on-duty'?'#059669':'#dc2626'}">${r.status === 'on-duty' ? 'Working' : r.status}</span></td>
      </tr>`).join("");

    const presentCount = records.filter(r=>r.status==="present"||r.status==="on-duty").length;
    const absentCount = records.filter(r=>r.status==="absent").length;
    const totalOt = records.reduce((s,r)=>s+parseFloat(r.ot_hrs||0),0).toFixed(1);

    win.document.write(`<!DOCTYPE html><html><head><title>Attendance Report - ${empDetail.full_name}</title>
      <style>
        @media print {
          @page { size: auto; margin: 0; }
          body { padding: 2cm !important; }
        }
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;padding:40px;color:#333;background:#fff;font-size:13px;line-height:1.6}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:2px solid #8b5cf6;padding-bottom:16px}
        .title{font-size:22px;font-weight:700;color:#000;letter-spacing:-.5px}
        .subtitle{font-size:12px;color:#666;margin-top:4px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
        .info-block{background:#f8fafc;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0}
        .info-row{display:flex;justify-content:space-between;margin-bottom:4px}
        .info-row:last-child{margin-bottom:0}
        .info-lbl{color:#666;font-weight:500}
        .info-val{color:#000;font-weight:600}
        .summary-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
        .summary-card{text-align:center;padding:12px;background:#f1f5f9;border-radius:8px;border:1px solid #cbd5e1}
        .summary-num{font-size:18px;font-weight:700;color:#000}
        .summary-lbl{font-size:10px;text-transform:uppercase;color:#666;letter-spacing:.05em;margin-top:2px}
        table{width:100%;border-collapse:collapse;margin-bottom:30px}
        table,th,td{border:1px solid #cbd5e1}
        th{background:#f8fafc;padding:10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#475569}
        td{padding:10px;font-size:12px}
        .bottom{margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end}
        .sig-block{text-align:center;font-size:12px;font-weight:700;min-width:180px;border-top:1px solid #000;padding-top:8px}
      </style></head><body>
      <div class="header">
        <div>
          <div class="title">AttendTrack Attendance Report</div>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN')}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:14px;color:#8b5cf6">◈ Timing Technologies</div>
          <div style="font-size:11px;color:#666">Hyderabad, India</div>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-block">
          <div class="info-row"><span class="info-lbl">Employee Name:</span><span class="info-val">${empDetail.full_name}</span></div>
          <div class="info-row"><span class="info-lbl">Father's Name:</span><span class="info-val">${empDetail.father_name || "—"}</span></div>
          <div class="info-row"><span class="info-lbl">Email:</span><span class="info-val">${empDetail.email}</span></div>
          <div class="info-row"><span class="info-lbl">Phone:</span><span class="info-val">${empDetail.phone || "—"}</span></div>
        </div>
        <div class="info-block">
          <div class="info-row"><span class="info-lbl">Project:</span><span class="info-val">${empDetail.project_name || "—"}</span></div>
          <div class="info-row"><span class="info-lbl">Department:</span><span class="info-val">${empDetail.department}</span></div>
          <div class="info-row"><span class="info-lbl">Shift:</span><span class="info-val">${empDetail.shift_hrs} hrs/day</span></div>
          <div class="info-row"><span class="info-lbl">Report Period:</span><span class="info-val">${filterMode === 'month' ? month : date}</span></div>
        </div>
      </div>
      <div class="summary-cards">
        <div class="summary-card"><div class="summary-num">${presentCount}</div><div class="summary-lbl">Days Present</div></div>
        <div class="summary-card"><div class="summary-num">${absentCount}</div><div class="summary-lbl">Days Absent</div></div>
        <div class="summary-card"><div class="summary-num">${totalOt}h</div><div class="summary-lbl">Overtime Hours</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Log In</th>
            <th>Log Out</th>
            <th>Total Hrs</th>
            <th>OT Hrs</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="bottom">
        <div style="font-size:11px;color:#666">* This is a system generated document.</div>
        <div class="sig-block">
          AUTHORISED SIGNATORY
        </div>
      </div>
    </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
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
              {employees.map(e=><option key={e.id} value={e.id}>{e.full_name} ({e.project_name || "No Project"})</option>)}
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
          {empFilter && (
            <button className="btn btn-primary" style={{ alignSelf:"flex-end" }} onClick={handlePrintReport}>
              📄 Attendance Report
            </button>
          )}
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
              <div className="detail-row"><span>Project</span><strong>{empDetail.project_name || "—"}</strong></div>
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
        <div className="table-wrap" style={{ maxHeight: "500px", overflowY: "auto", overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Employee</th><th>Dept</th>
                <th>Log In</th><th>Log Out</th>
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
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{fontWeight:500}}>{r.full_name}</span>
                          {r.project_name && <span className="badge badge-project" style={{ fontSize:10, padding:"2px 6px", marginTop:4, width:"fit-content" }}>{r.project_name}</span>}
                        </div>
                      </div>
                    </td>
                    <td>{r.department}</td>
                    <td>{r.log_in  || "—"}</td>
                    <td>{r.log_out || "—"}</td>
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