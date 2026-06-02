import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";

const DEFAULT_SETTINGS = {
  pay_per_day: 500, ot_pay_per_hr: 100,
  food_allowance: 50, food_before_time: "08:00"
};

const LOCATIONS = ["Hyderabad Office"];

function timeBefore(t, limit) { return t ? t <= limit : false; }

// ── Invoice Editor Modal ─────────────────────────────────────────
function InvoiceModal({ invoiceData, settings, onClose }) {
  const [rows, setRows] = useState(invoiceData.employees.map(e => ({
    name:     e.name,
    dept:     e.dept,
    days:     e.present,
    otHrs:    +e.otHrs.toFixed(1),
    dayPay:   +e.dayPay.toFixed(2),
    otPay:    +e.otPay.toFixed(2),
    food:     +e.food.toFixed(2),
    total:    +(e.dayPay + e.otPay + e.food).toFixed(2),
  })));
  const [invoiceNo,  setInvoiceNo]  = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate,setInvoiceDate]= useState(new Date().toISOString().slice(0,10));
  const [notes,      setNotes]      = useState("");
  const printRef = useRef(null);

  const updateRow = (i, field, val) => {
    setRows(r => r.map((row, idx) => {
      if (idx !== i) return row;
      const updated = { ...row, [field]: val };
      updated.total = +(parseFloat(updated.dayPay||0) + parseFloat(updated.otPay||0) + parseFloat(updated.food||0)).toFixed(2);
      return updated;
    }));
  };

  const grandTotal = rows.reduce((s,r) => s + parseFloat(r.total||0), 0).toFixed(2);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("","_blank","width=900,height=700");
    win.document.write(`
      <html><head><title>Invoice - ${invoiceData.source}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',Arial,sans-serif;padding:40px;color:#111;background:#fff}
        h1{font-size:28px;font-weight:800;margin-bottom:4px}
        .sub{color:#666;font-size:13px;margin-bottom:24px}
        .meta{display:flex;justify-content:space-between;margin-bottom:28px;font-size:13px}
        .meta div{display:flex;flex-direction:column;gap:4px}
        .meta b{font-weight:700}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
        th{text-align:left;padding:9px 10px;background:#f4f4f4;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e5e5e5}
        td{padding:9px 10px;border-bottom:1px solid #f0f0f0}
        tr:last-child td{border-bottom:none}
        .grand{background:#111;color:#fff;font-weight:800;font-size:15px}
        .grand td{padding:12px 10px;border-bottom:none}
        .notes{font-size:12px;color:#666;border-top:1px solid #e5e5e5;padding-top:16px;margin-top:8px}
        @media print{body{padding:20px}}
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(()=>{ win.print(); win.close(); }, 400);
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:"var(--white)" }}>
              Invoice — {invoiceData.source}
            </div>
            <div style={{ fontSize:12, color:"var(--text3)", marginTop:2 }}>
              Edit before downloading as PDF
            </div>
          </div>
          <button className="btn" style={{ padding:"6px 12px" }} onClick={onClose}>✕ Close</button>
        </div>

        <div className="modal-body">
          {/* Invoice meta */}
          <div className="form-row" style={{ marginBottom:"1rem" }}>
            <div className="form-group">
              <label className="form-label">Invoice Number</label>
              <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Date</label>
              <input type="date" value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)} />
            </div>
          </div>

          {/* Editable table */}
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:".5rem" }}>
            Employee Pay Details
          </div>
          <div className="table-wrap" style={{ marginBottom:"1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Dept</th><th>Days</th>
                  <th>OT Hrs</th><th>Day Pay (₹)</th>
                  <th>OT Pay (₹)</th><th>Food (₹)</th><th>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i}>
                    <td><input value={r.name} onChange={e=>updateRow(i,"name",e.target.value)} style={{width:120,padding:"4px 6px",fontSize:12}}/></td>
                    <td><input value={r.dept} onChange={e=>updateRow(i,"dept",e.target.value)} style={{width:90,padding:"4px 6px",fontSize:12}}/></td>
                    <td><input type="number" value={r.days} onChange={e=>updateRow(i,"days",e.target.value)} style={{width:55,padding:"4px 6px",fontSize:12}}/></td>
                    <td><input type="number" value={r.otHrs} onChange={e=>updateRow(i,"otHrs",e.target.value)} style={{width:60,padding:"4px 6px",fontSize:12}}/></td>
                    <td><input type="number" value={r.dayPay} onChange={e=>updateRow(i,"dayPay",e.target.value)} style={{width:80,padding:"4px 6px",fontSize:12}}/></td>
                    <td><input type="number" value={r.otPay} onChange={e=>updateRow(i,"otPay",e.target.value)} style={{width:70,padding:"4px 6px",fontSize:12}}/></td>
                    <td><input type="number" value={r.food} onChange={e=>updateRow(i,"food",e.target.value)} style={{width:70,padding:"4px 6px",fontSize:12}}/></td>
                    <td style={{fontWeight:700,color:"var(--white)"}}>₹{r.total}</td>
                  </tr>
                ))}
                <tr style={{ background:"var(--bg3)" }}>
                  <td colSpan={7} style={{ fontWeight:700, color:"var(--white)", fontSize:13 }}>Grand Total</td>
                  <td style={{ fontWeight:800, fontSize:14, color:"var(--white)" }}>₹{grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add any notes..." />
          </div>

          <button className="btn btn-primary full-width" style={{ marginTop:".5rem" }} onClick={handlePrint}>
            ↓ Download as PDF
          </button>
        </div>

        {/* Hidden print template */}
        <div style={{ display:"none" }}>
          <div ref={printRef}>
            <h1>◈ AttendTrack</h1>
            <div className="sub">Attendance & Payroll Invoice</div>
            <div className="meta">
              <div>
                <span><b>Invoice No:</b> {invoiceNo}</span>
                <span><b>Date:</b> {invoiceDate}</span>
                <span><b>Source (Referred by):</b> {invoiceData.source}</span>
              </div>
              <div style={{ textAlign:"right" }}>
                <span><b>Location:</b> Hyderabad Office</span>
                <span><b>Employees:</b> {rows.length}</span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Dept</th><th>Days</th>
                  <th>OT Hrs</th><th>Day Pay</th>
                  <th>OT Pay</th><th>Food Allow.</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i}>
                    <td>{r.name}</td><td>{r.dept}</td><td>{r.days}</td>
                    <td>{r.otHrs}h</td><td>₹{r.dayPay}</td>
                    <td>₹{r.otPay}</td><td>₹{r.food}</td>
                    <td><b>₹{r.total}</b></td>
                  </tr>
                ))}
                <tr className="grand">
                  <td colSpan={7}>Grand Total</td>
                  <td>₹{grandTotal}</td>
                </tr>
              </tbody>
            </table>
            {notes && <div className="notes"><b>Notes:</b> {notes}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Reports component ───────────────────────────────────────
export default function Reports() {
  const [employees,     setEmployees]     = useState([]);
  const [settings,      setSettings]      = useState(DEFAULT_SETTINGS);
  const [mode,          setMode]          = useState("month");
  const [month,         setMonth]         = useState(new Date().toISOString().slice(0,7));
  const [date,          setDate]          = useState(new Date().toISOString().slice(0,10));
  const [locationFilter,setLocationFilter]= useState("Hyderabad Office");
  const [preview,       setPreview]       = useState([]);
  const [alert,         setAlert]         = useState(null);
  const [savingSettings,setSaving]        = useState(false);
  const [invoiceData,   setInvoiceData]   = useState(null);
  const [activeTab,     setActiveTab]     = useState("employees"); // "employees" | "payroll"

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(()=>{});
    api.getSettings().then(setSettings).catch(()=>{});
  }, []);

  // Employees at selected location
  const locationEmployees = locationFilter
    ? employees.filter(e => e.location === locationFilter)
    : employees;

  const buildParams = () => {
    const p = {};
    if (mode === "month") p.month = month; else p.date_filter = date;
    return p;
  };

  const calcPay = (records, s) => {
    const map = {};
    records.forEach(r => {
      if (!map[r.emp_id]) map[r.emp_id] = {
        emp_id: r.emp_id, name: r.full_name, dept: r.department,
        source: r.source||"", location: r.location||"",
        present: 0, totalDays: 0, otHrs: 0, foodDays: 0
      };
      const m = map[r.emp_id];
      m.totalDays++;
      if (r.status === "present" || r.status === "on-duty") {
        m.present++;
        if (timeBefore(r.clock_in, s.food_before_time)) m.foodDays++;
      }
      m.otHrs += parseFloat(r.ot_hrs || 0);
    });
    return Object.values(map).map(m => {
      const dayPay = +(m.present * s.pay_per_day).toFixed(2);
      const otPay  = +(m.otHrs   * s.ot_pay_per_hr).toFixed(2);
      const food   = +(m.foodDays * s.food_allowance).toFixed(2);
      return { ...m, dayPay, otPay, food };
    });
  };

  const handlePreview = async () => {
    setAlert(null);
    const data = await api.getAttendance(buildParams()).catch(()=>null);
    if (!data || data.length === 0) {
      setAlert({ type:"error", msg:"No records found for this period." }); setPreview([]); return;
    }
    const s = await api.getSettings().catch(()=>settings);
    let rows = calcPay(data, s);
    if (locationFilter) rows = rows.filter(r => r.location === locationFilter);
    setPreview(rows);
    setActiveTab("payroll");
  };

  // CSV download — columns: Name, Dept, Source, Location, Total Days, OT Hrs, Day Pay, OT Pay, Food Allowance
  const handleDownloadCSV = () => {
    if (preview.length === 0) { setAlert({ type:"error", msg:"Run Preview first." }); return; }
    const headers = ["Employee Name","Department","Source","Location","Total Days","OT Hours","Day Pay (₹)","OT Pay (₹)","Food Allowance (₹)"];
    const rows = preview.map(p => [
      p.name, p.dept, p.source, p.location,
      p.totalDays, p.otHrs.toFixed(1),
      p.dayPay.toFixed(2), p.otPay.toFixed(2), p.food.toFixed(2)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url;
    a.download = `attendtrack-report-${mode==="month"?month:date}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Group preview by source for invoices
  const sourceGroups = preview.reduce((acc, p) => {
    const src = p.source || "Unknown";
    if (!acc[src]) acc[src] = [];
    acc[src].push(p);
    return acc;
  }, {});

  const handleOpenInvoice = (src) => {
    setInvoiceData({ source: src, employees: sourceGroups[src] });
  };

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setAlert({ type:"success", msg:"Settings saved." });
    } catch(e) {
      setAlert({ type:"error", msg: e.message });
    } finally { setSaving(false); }
  };

  return (
    <div>
      {invoiceData && (
        <InvoiceModal
          invoiceData={invoiceData}
          settings={settings}
          onClose={()=>setInvoiceData(null)}
        />
      )}

      {/* ── Tab switcher ── */}
      <div style={{ display:"flex", gap:".5rem", marginBottom:"1rem" }}>
        <button className={`toggle-btn ${activeTab==="employees"?"active":""}`}
          style={{ border:"1px solid var(--border2)", borderRadius:"var(--r)", padding:"7px 16px" }}
          onClick={()=>setActiveTab("employees")}>
          👥 Employee Cards
        </button>
        <button className={`toggle-btn ${activeTab==="payroll"?"active":""}`}
          style={{ border:"1px solid var(--border2)", borderRadius:"var(--r)", padding:"7px 16px" }}
          onClick={()=>setActiveTab("payroll")}>
          📊 Payroll & Reports
        </button>
      </div>

      {/* ══ TAB 1: Employee Cards by location ══ */}
      {activeTab === "employees" && (
        <div>
          <div className="card">
            <div className="card-title">Filter by Location</div>
            <div className="filter-bar">
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Location</label>
                <select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)} style={{ width:200 }}>
                  <option value="">All Locations</option>
                  {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ alignSelf:"flex-end", color:"var(--text3)", fontSize:13 }}>
                {locationEmployees.length} employee{locationEmployees.length!==1?"s":""} found
              </div>
            </div>
          </div>

          {locationEmployees.length === 0
            ? <div className="card"><p className="muted">No employees at this location.</p></div>
            : (
              <div className="emp-cards-grid">
                {locationEmployees.map(e => (
                  <div key={e.id} className="emp-reg-card" style={{ position:"relative" }}>
                    <button
                      title="Remove employee"
                      onClick={async ()=>{
                        if(!window.confirm(`Remove ${e.full_name}? This cannot be undone.`)) return;
                        try {
                          await api.deleteEmployee(e.id);
                          setEmployees(prev => prev.filter(emp => emp.id !== e.id));
                        } catch(err) { alert("Failed to remove: " + err.message); }
                      }}
                      style={{
                        position:"absolute", top:10, right:10,
                        background:"rgba(255,255,255,.06)", border:"1px solid var(--border2)",
                        borderRadius:6, color:"var(--text3)", fontSize:13,
                        cursor:"pointer", padding:"3px 7px", lineHeight:1,
                      }}
                    >✕</button>
                    <div className="emp-reg-photo">
                      {e.face_image
                        ? <img
                            src={e.face_image.startsWith("data:") ? e.face_image : `data:image/jpeg;base64,${e.face_image}`}
                            alt={e.full_name}
                            style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }}
                            onError={ev=>{ ev.target.style.display="none"; ev.target.nextSibling.style.display="flex"; }}
                          />
                        : null
                      }
                      {!e.face_image && (
                        <span>{e.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</span>
                      )}
                      {e.face_image && (
                        <span style={{display:"none"}}>{e.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="emp-reg-name">{e.full_name}</div>
                    <div className="emp-reg-dept">{e.department}</div>
                    <div className="emp-reg-details">
                      <div className="emp-reg-row"><span>Phone</span><span>{e.phone||"—"}</span></div>
                      <div className="emp-reg-row"><span>Father</span><span>{e.father_name||"—"}</span></div>
                      <div className="emp-reg-row"><span>Email</span><span style={{fontSize:11}}>{e.email||"—"}</span></div>
                      <div className="emp-reg-row"><span>Aadhaar</span><span>{e.aadhaar_no ? e.aadhaar_no.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3") : "—"}</span></div>
                      <div className="emp-reg-row"><span>Source</span><span>{e.source||"—"}</span></div>
                      <div className="emp-reg-row"><span>Location</span><span>{e.location||"—"}</span></div>
                    </div>
                    {e.aadhaar_pdf ? (
                      <div style={{ display:"flex", gap:".4rem", marginTop:".75rem", width:"100%" }}>
                        <button className="btn" style={{ flex:1, fontSize:11, padding:"6px 8px" }}
                          onClick={()=>{
                            const pdfData = e.aadhaar_pdf.startsWith("data:") ? e.aadhaar_pdf : `data:application/pdf;base64,${e.aadhaar_pdf}`;
                            const win = window.open("","_blank");
                            win.document.write(`<html><body style="margin:0"><embed src="${pdfData}" type="application/pdf" width="100%" height="100%"/></body></html>`);
                            win.document.close();
                          }}>
                          👁 View
                        </button>
                        <button className="btn" style={{ flex:1, fontSize:11, padding:"6px 8px" }}
                          onClick={()=>{
                            const link = document.createElement("a");
                            link.href = e.aadhaar_pdf.startsWith("data:") ? e.aadhaar_pdf : `data:application/pdf;base64,${e.aadhaar_pdf}`;
                            link.download = `${e.full_name}-aadhaar.pdf`;
                            link.click();
                          }}>
                          ↓ Download
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop:".75rem", fontSize:11, color:"var(--text3)", textAlign:"center" }}>
                        No Aadhaar PDF uploaded
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ══ TAB 2: Payroll & Reports ══ */}
      {activeTab === "payroll" && (
        <div>
          <div className="grid2">
            {/* Report generator */}
            <div className="card">
              <div className="card-title">Generate Payroll Report</div>
              <div className="toggle-group" style={{ marginBottom:"1rem" }}>
                <button className={`toggle-btn ${mode==="month"?"active":""}`} onClick={()=>setMode("month")}>By Month</button>
                <button className={`toggle-btn ${mode==="date"?"active":""}`}  onClick={()=>setMode("date")}>By Date</button>
              </div>
              {mode==="month"
                ? <div className="form-group"><label className="form-label">Month</label><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></div>
                : <div className="form-group"><label className="form-label">Date</label><input type="date"  value={date}  onChange={e=>setDate(e.target.value)}/></div>
              }
              <div className="form-group">
                <label className="form-label">Location Filter</label>
                <select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)}>
                  <option value="">All Locations</option>
                  {LOCATIONS.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="pay-rates-bar">
                <span>₹{settings.pay_per_day}/day</span>
                <span>₹{settings.ot_pay_per_hr}/OT hr</span>
                <span>Food ₹{settings.food_allowance} (before {settings.food_before_time})</span>
              </div>
              {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
              <div style={{ display:"flex", gap:".5rem" }}>
                <button className="btn" style={{ flex:1 }} onClick={handlePreview}>Preview</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={handleDownloadCSV}>↓ CSV</button>
              </div>
            </div>

            {/* Pay settings */}
            <div className="card">
              <div className="card-title">Pay Settings</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Pay Per Day (₹)</label>
                  <input type="number" min={0} value={settings.pay_per_day} onChange={e=>set("pay_per_day",parseFloat(e.target.value)||0)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">OT Pay Per Hour (₹)</label>
                  <input type="number" min={0} value={settings.ot_pay_per_hr} onChange={e=>set("ot_pay_per_hr",parseFloat(e.target.value)||0)}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Food Allowance Per Day (₹)</label>
                  <input type="number" min={0} value={settings.food_allowance} onChange={e=>set("food_allowance",parseFloat(e.target.value)||0)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Food Allowance Before</label>
                  <input type="time" value={settings.food_before_time} onChange={e=>set("food_before_time",e.target.value)}/>
                </div>
              </div>
              <button className="btn btn-primary full-width" onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
                <div className="card-title" style={{ marginBottom:0 }}>
                  Pay Summary — {preview.length} employee{preview.length!==1?"s":""}
                </div>
                <div style={{ display:"flex", gap:".5rem" }}>
                  {Object.keys(sourceGroups).map(src=>(
                    <button key={src} className="btn" style={{ fontSize:11, padding:"5px 10px" }}
                      onClick={()=>handleOpenInvoice(src)}>
                      📄 Invoice: {src}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th><th>Dept</th><th>Source</th>
                      <th>Location</th><th>Total Days</th><th>OT Hrs</th>
                      <th>Day Pay</th><th>OT Pay</th><th>Food Allow.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p,i)=>(
                      <tr key={i}>
                        <td style={{ fontWeight:600 }}>{p.name}</td>
                        <td>{p.dept}</td>
                        <td>{p.source || <span className="muted">—</span>}</td>
                        <td><span className="badge badge-dept">{p.location||"—"}</span></td>
                        <td>{p.totalDays}</td>
                        <td>{p.otHrs.toFixed(1)}h</td>
                        <td>₹{p.dayPay.toFixed(2)}</td>
                        <td>₹{p.otPay.toFixed(2)}</td>
                        <td>₹{p.food.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
