import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";

const DEFAULT_SETTINGS = {
  pay_per_day: 500, ot_pay_per_hr: 100,
  food_allowance: 50, food_before_time: "08:00"
};

const LOCATIONS = ["Hyderabad Office"];

function timeBefore(t, limit) { return t ? t <= limit : false; }

// ── Signature generator ──────────────────────────────────────────
function makeSignature(name) {
  if (!name) return "";
  const styles = [
    { font:"'Dancing Script', cursive", color:"#ccc",    size:28, slant:"italic"  },
    { font:"'Pacifico', cursive",        color:"#bbb",    size:24, slant:"normal"  },
    { font:"'Sacramento', cursive",      color:"#d4d4d4", size:32, slant:"italic"  },
    { font:"'Great Vibes', cursive",     color:"#c8c8c8", size:30, slant:"italic"  },
  ];
  // pick style deterministically from name
  const idx = name.split("").reduce((s,c) => s + c.charCodeAt(0), 0) % styles.length;
  return styles[idx];
}

// ── Invoice Editor Modal ─────────────────────────────────────────
function InvoiceModal({ invoiceData, settings, onClose, allEmployees, sourcePersons }) {

  const getAccountDetails = () => {
    const src = invoiceData.source;
    if (!src) return { account_name:"", account_number:"", ifsc:"", pan:"" };

    // TTIPL — use first employee's own account (shown per-row in description)
    if (src === "TTIPL") {
      const emp = invoiceData.employees[0];
      if (emp) return {
        account_name:   emp.account_name   || emp.name || "",
        account_number: emp.account_number || "",
        ifsc:           emp.ifsc           || "",
        pan:            emp.pan            || "",
      };
      return { account_name:"", account_number:"", ifsc:"", pan:"" };
    }

    // Look in sourcePersons list first (most reliable)
    const srcPerson = sourcePersons.find(s =>
      s.name.toLowerCase().trim() === src.toLowerCase().trim()
    );
    if (srcPerson) return {
      account_name:   srcPerson.account_name   || srcPerson.name || "",
      account_number: srcPerson.account_number || "",
      ifsc:           srcPerson.ifsc           || "",
      pan:            srcPerson.pan            || "",
    };

    // Fallback — look in employees by full_name
    const srcEmp = allEmployees.find(e =>
      (e.full_name || e.name || "").toLowerCase().trim() === src.toLowerCase().trim()
    );
    if (srcEmp) return {
      account_name:   srcEmp.account_name   || srcEmp.full_name || srcEmp.name || "",
      account_number: srcEmp.account_number || "",
      ifsc:           srcEmp.ifsc           || "",
      pan:            srcEmp.pan            || "",
    };

    return { account_name: src, account_number:"", ifsc:"", pan:"" };
  };

  const initAccount = getAccountDetails();
  const sigStyle    = makeSignature(invoiceData.source);

  const [invoiceNo,  setInvoiceNo]  = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate,setInvoiceDate]= useState(new Date().toISOString().slice(0,10));
  const [account,    setAccount]    = useState(initAccount);
  const [rows, setRows] = useState(invoiceData.employees.map(e => ({
    description: "",
    ot:          "",
    perDay:      settings.pay_per_day || 500,
    totalDays:   e.present || 0,
    fees:        +((e.present || 0) * (settings.pay_per_day || 500)).toFixed(2),
  })));

  const setAcc = (k, v) => setAccount(a => ({ ...a, [k]: v }));
  const updateRow = (i, field, val) => {
    setRows(r => r.map((row, idx) => {
      if (idx !== i) return row;
      const updated = { ...row, [field]: val };
      // auto-calc fees when perDay or totalDays change
      if (field === "perDay" || field === "totalDays") {
        updated.fees = +(parseFloat(updated.perDay||0) * parseFloat(updated.totalDays||0)).toFixed(2);
      }
      return updated;
    }));
  };
  const grandTotal = rows.reduce((s,r) => s + parseFloat(r.fees||0), 0).toFixed(2);

  const handlePrint = () => {
    const win = window.open("","_blank","width=900,height=700");
    const tableRows = rows.map(r => `
      <tr>
        <td>${r.description || ""}</td>
        <td>${r.ot || ""}</td>
        <td>${r.perDay}</td>
        <td>${r.totalDays}</td>
        <td>${r.fees}</td>
      </tr>`).join("");

    // Use account holder name for title, top-left heading, and signatures
    const targetAccountName = account.account_name || invoiceData.source || "";

    win.document.write(`<!DOCTYPE html><html><head><title>Invoice - ${targetAccountName}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;padding:48px;color:#000;background:#fff;font-size:13px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
        .person-name{font-size:20px;font-weight:700;color:#000}
        .inv-info{text-align:right;font-size:12px;line-height:2}
        .inv-info b{font-size:13px;font-weight:700}
        .address{font-size:12px;color:#333;margin-bottom:16px;font-style:italic}
        .bill-to-label{font-size:13px;font-weight:700;font-style:italic;margin-bottom:4px}
        .bill-to-addr{font-size:12px;font-style:italic;color:#333;margin-bottom:20px;line-height:1.6}
        table{width:100%;border-collapse:collapse;margin-bottom:0}
        table,th,td{border:1px solid #000}
        th{background:#fff;padding:8px 10px;text-align:center;font-size:12px;font-weight:700}
        td{padding:8px 10px;font-size:12px;vertical-align:middle}
        td:first-child{text-align:left}
        td:not(:first-child){text-align:center}
        .total-label{font-weight:700;font-size:13px;text-align:right !important}
        .total-val{font-weight:700;font-size:13px}
        .bottom{margin-top:24px;display:flex;justify-content:space-between;align-items:flex-end}
        .acc-block{font-size:12px;line-height:2}
        .acc-block b{font-size:13px;font-weight:700}
        .sig-block{text-align:center;font-size:13px;font-weight:700;min-width:180px}
        .sig-name{font-size:16px;font-weight:700;font-family:'Segoe Script','Brush Script MT',cursive;border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:4px;letter-spacing:.5px}
        .sig-label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#444}
      </style></head><body>
      <div class="header">
        <div class="person-name">${targetAccountName}</div>
        <div class="inv-info">
          <b>INVOICE NO: ${invoiceNo}</b><br/>
          Invoice Date: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})}<br/>
          Address: Hyderabad
        </div>
      </div>
      <div class="bill-to-label">BILL TO:</div>
      <div class="bill-to-addr">Timing Technologies India private Limited, My Home Hub, Hitech City Rd, Patrika Nagar, HITECH City, Hyderabad, Telangana 500081</div>
      <table>
        <thead>
          <tr>
            <th style="width:40%">DESCRIPTION</th>
            <th>OT</th>
            <th>Per day</th>
            <th>Total days</th>
            <th>Fees</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr>
            <td colspan="3" style="border:none"></td>
            <td class="total-label">TOTAL</td>
            <td class="total-val">${grandTotal}</td>
          </tr>
        </tbody>
      </table>
      <div class="bottom">
        <div class="acc-block">
          <b>Account Details:-</b><br/>
          Payee name: ${targetAccountName}<br/>
          Account Number: ${account.account_number}<br/>
          IFSC: ${account.ifsc}<br/>
          PAN: ${account.pan}
        </div>
        <div class="sig-block">
          <div class="sig-name">${targetAccountName}</div>
          <div class="sig-label">SIGNATURE</div>
        </div>
      </div>
    </body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  const BILL_TO = "Timing Technologies India Private Limited, My Home Hub, Hitech City Rd, Patrika Nagar, HITECH City, Hyderabad, Telangana 500081";

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:"#f5f5f7" }}>
              Invoice — {account.account_name || invoiceData.source || "Unknown Source"}
            </div>
            <div style={{ fontSize:12, color:"#636366", marginTop:2 }}>
              Edit then download as PDF
            </div>
          </div>
          <button className="btn" style={{ padding:"6px 12px" }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Invoice No only — no date */}
          <div className="form-group" style={{ marginBottom:"1rem", maxWidth:240 }}>
            <label className="form-label">Invoice No</label>
            <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} />
          </div>

          {/* Bill To — fixed */}
          <div style={{ background:"#2c2c2e", border:"1px solid #3a3a3c", borderRadius:"var(--r)", padding:"10px 12px", marginBottom:"1rem", fontSize:12, color:"#aeaeb2" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", color:"#636366", marginBottom:4 }}>Bill To (fixed)</div>
            {BILL_TO}
          </div>

          {/* Description rows */}
          <div style={{ fontSize:11, fontWeight:700, color:"#636366", textTransform:"uppercase", letterSpacing:".07em", marginBottom:".5rem" }}>
            Description
          </div>
          <div className="table-wrap" style={{ marginBottom:"1rem" }}>
            <table>
              <thead>
                <tr>
                  <th style={{width:"35%"}}>Description</th>
                  <th>OT</th>
                  <th>Per Day (₹)</th>
                  <th>Total Days</th>
                  <th>Fees (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i}>
                    <td><input value={r.description} onChange={e=>updateRow(i,"description",e.target.value)}
                      placeholder="e.g. HYD MUMBAI APRIL 2026" style={{width:"100%",padding:"4px 6px",fontSize:12}}/></td>
                    <td><input value={r.ot} onChange={e=>updateRow(i,"ot",e.target.value)}
                      style={{width:60,padding:"4px 6px",fontSize:12}}/></td>
                    <td><input type="number" value={r.perDay} onChange={e=>updateRow(i,"perDay",e.target.value)}
                      style={{width:80,padding:"4px 6px",fontSize:12}}/></td>
                    <td><input type="number" value={r.totalDays} onChange={e=>updateRow(i,"totalDays",e.target.value)}
                      style={{width:70,padding:"4px 6px",fontSize:12}}/></td>
                    <td style={{fontWeight:700,color:"#f5f5f7"}}>₹{r.fees}</td>
                  </tr>
                ))}
                <tr style={{ background:"#2c2c2e" }}>
                  <td colSpan={4} style={{ fontWeight:700, color:"#f5f5f7", fontSize:13 }}>TOTAL</td>
                  <td style={{ fontWeight:800, fontSize:14, color:"#f5f5f7" }}>₹{grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Account Details — editable, pre-filled from source employee */}
          <div style={{ fontSize:11, fontWeight:700, color:"#636366", textTransform:"uppercase", letterSpacing:".07em", marginBottom:".5rem" }}>
            Account Details
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <input value={account.account_name} onChange={e=>setAcc("account_name",e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input value={account.account_number} onChange={e=>setAcc("account_number",e.target.value)} />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom:"1rem" }}>
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input value={account.ifsc} onChange={e=>setAcc("ifsc",e.target.value.toUpperCase())} />
            </div>
            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input value={account.pan} onChange={e=>setAcc("pan",e.target.value.toUpperCase())} />
            </div>
          </div>

          {/* Signature preview */}
          <div style={{ background:"#232325", border:"1px solid #3a3a3c", borderRadius:"var(--r)", padding:"14px 16px", marginBottom:"1rem" }}>
            <div style={{ fontSize:10, color:"#636366", textTransform:"uppercase", letterSpacing:".07em", marginBottom:12 }}>Signature</div>
            <div style={{
              fontFamily:"'Segoe Script', 'Brush Script MT', cursive",
              fontSize:22,
              color:"#f5f5f7",
              letterSpacing:"1px",
              paddingBottom:8,
              borderBottom:"1px solid #636366",
              display:"inline-block",
              minWidth:200,
            }}>
              {account.account_name || invoiceData.source || "—"}
            </div>
            <div style={{ fontSize:10, color:"#636366", marginTop:5 }}>Authorised Signatory</div>
          </div>

          <button className="btn btn-primary full-width" onClick={handlePrint}>↓ Download as PDF</button>
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
  const [viewPhoto,     setViewPhoto]     = useState(null); // { src, name }
  const [activeTab,     setActiveTab]     = useState("employees"); // "employees" | "payroll"

  const [sourcePersons, setSourcePersons] = useState([]);

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(()=>{});
    api.getSettings().then(setSettings).catch(()=>{});
    api.getSourcePersons().then(setSourcePersons).catch(()=>{});
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

  // CSV download — columns: Name, Dept, Source, Location, Total Days, ...
  const handleDownloadCSV = () => {
    if (preview.length === 0) { setAlert({ type:"error", msg:"Run Preview first." }); return; }
    const headers = ["Employee Name","Department","Source","Location","Total Days","OT Hours","Day Pay","OT Pay","Food Allowance"];
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
          allEmployees={employees}
          sourcePersons={sourcePersons}
          onClose={()=>setInvoiceData(null)}
        />
      )}

      {/* Photo lightbox */}
      {viewPhoto && (
        <div
          onClick={()=>setViewPhoto(null)}
          style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,.9)",
            zIndex:300, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:"1rem", cursor:"pointer"
          }}>
          <img src={viewPhoto.src} alt={viewPhoto.name}
            style={{ maxWidth:"90vw", maxHeight:"80vh", borderRadius:"var(--r-lg)", objectFit:"contain" }} />
          <div style={{ color:"#ccc", fontSize:13 }}>{viewPhoto.name} — click anywhere to close</div>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:".5rem", marginBottom:"1rem" }}>
        <button className={`toggle-btn ${activeTab==="employees"?"active":""}`}
          style={{ border:"1px solid #3a3a3c", borderRadius:"var(--r)", padding:"7px 16px" }}
          onClick={()=>setActiveTab("employees")}>
          👥 Employee Cards
        </button>
        <button className={`toggle-btn ${activeTab==="payroll"?"active":""}`}
          style={{ border:"1px solid #3a3a3c", borderRadius:"var(--r)", padding:"7px 16px" }}
          onClick={()=>setActiveTab("payroll")}>
          📊 Payroll & Reports
        </button>
      </div>

      {/* TAB 1: Employee Cards */}
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
              <div style={{ alignSelf:"flex-end", color:"#636366", fontSize:13 }}>
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
                        background:"rgba(255,255,255,.06)", border:"1px solid #3a3a3c",
                        borderRadius:6, color:"#636366", fontSize:13,
                        cursor:"pointer", padding:"3px 7px", lineHeight:1,
                      }}
                    >✕</button>
                    <div
                      className="emp-reg-photo"
                      onClick={()=>{ if(e.face_image){ setViewPhoto({src:e.face_image, name:e.full_name}); }}}
                      style={{ cursor: e.face_image ? "pointer" : "default", position:"relative" }}
                      title={e.face_image ? "Click to view full photo" : ""}
                    >
                      {e.face_image
                        ? <img
                            src={e.face_image}
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
                      {e.face_image && (
                        <div style={{
                          position:"absolute", bottom:0, right:0,
                          width:20, height:20, borderRadius:"50%",
                          background:"#2c2c2e", border:"1px solid #3a3a3c",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, color:"#636366"
                        }}>⤢</div>
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
                            const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(e.aadhaar_pdf)}&embedded=true`;
                            const win = window.open("","_blank","width=900,height=700");
                            win.document.write(`<!DOCTYPE html><html><head><title>Aadhaar - ${e.full_name}</title>
                              <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#1c1c1e}
                              iframe{width:100vw;height:100vh;border:none}</style></head>
                              <body><iframe src="${viewerUrl}" allowfullscreen></iframe></body></html>`);
                            win.document.close();
                          }}>
                          👁 View
                        </button>
                        <button className="btn" style={{ flex:1, fontSize:11, padding:"6px 8px" }}
                          onClick={async ()=>{
                            try {
                              const res = await fetch(e.aadhaar_pdf);
                              const blob = await res.blob();
                              const blobUrl = URL.createObjectURL(new Blob([blob], { type:"application/pdf" }));
                              const link = document.createElement("a");
                              link.href = blobUrl;
                              link.download = `${e.full_name}-aadhaar.pdf`;
                              link.click();
                              setTimeout(()=>URL.revokeObjectURL(blobUrl), 3000);
                            } catch {
                              window.open(e.aadhaar_pdf, "_blank");
                            }
                          }}>
                          ↓ Download
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop:".75rem", fontSize:11, color:"#636366", textAlign:"center" }}>
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

      {/* TAB 2: Payroll & Reports */}
      {activeTab === "payroll" && (
        <div>
          <div className="grid2">
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