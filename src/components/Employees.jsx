import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useFaceApi } from "../api/faceApi";
import FaceCamera from "./FaceCamera";

const DEPTS = ["Engineering","HR","Finance","Operations","Sales","Admin"];
const empty = { full_name:"", email:"", aadhaar_no:"", department:"Engineering", shift_hrs:8 };

export default function Employees() {
  const { ready: faceReady, error: faceError } = useFaceApi();
  const [employees, setEmployees] = useState([]);
  const [search,    setSearch]    = useState("");
  const [step,      setStep]      = useState(1);   // 1 = details, 2 = face
  const [form,      setForm]      = useState(empty);
  const [newEmpId,  setNewEmpId]  = useState(null);
  const [alert,     setAlert]     = useState(null);
  const [faceAlert, setFaceAlert] = useState(null);

  const load = () => api.getEmployees().then(setEmployees).catch(() => {});
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Step 1: validate & save details only ─────────────────
  const handleSaveDetails = async () => {
    setAlert(null);
    if (!form.full_name.trim()) { setAlert({ type:"error", msg:"Full name is required." }); return; }
    if (!form.email.trim())     { setAlert({ type:"error", msg:"Email is required." });     return; }
    if (form.aadhaar_no.length !== 12 || !/^\d+$/.test(form.aadhaar_no)) {
      setAlert({ type:"error", msg:"Aadhaar must be exactly 12 digits." }); return;
    }
    try {
      const res = await api.createEmployee(form);
      setNewEmpId(res.id);
      setAlert(null);
      setStep(2);
    } catch(e) {
      setAlert({ type:"error", msg: e.message });
    }
  };

  // ── Step 2: face auto-captured → save descriptor ─────────
  const handleFaceCapture = async (descriptor) => {
    setFaceAlert(null);
    try {
      await api.updateFace(newEmpId, descriptor);
      setFaceAlert({ type:"success", msg:"Employee registered successfully with face!" });
      setTimeout(() => {
        setForm(empty); setStep(1); setNewEmpId(null); setFaceAlert(null);
        load();
      }, 1800);
    } catch(e) {
      // Face save failed — also delete the employee record so no orphan without face
      await api.deleteEmployee(newEmpId).catch(()=>{});
      setNewEmpId(null);
      setFaceAlert({ type:"error", msg:"Failed to save face. Employee removed. Please try again: " + e.message });
      setTimeout(() => { setStep(1); setFaceAlert(null); }, 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this employee and all their attendance records?")) return;
    await api.deleteEmployee(id).catch(() => {});
    load();
  };

  // Cancel step 2 → delete the partial record and go back
  const handleCancelFace = async () => {
    if (newEmpId) await api.deleteEmployee(newEmpId).catch(() => {});
    setNewEmpId(null); setStep(1); setFaceAlert(null); setAlert(null);
  };

  const filtered = employees.filter(e =>
    `${e.full_name} ${e.email} ${e.department}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid2">
      {/* ── Registration card ── */}
      <div className="card">
        {step === 1 ? (
          <>
            <div className="card-title">Register New Employee — Step 1 of 2: Details</div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input placeholder="Your Name" value={form.full_name} onChange={e=>set("full_name",e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" placeholder="youremail@gmail.com" value={form.email} onChange={e=>set("email",e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Aadhaar Number (12 digits)</label>
              <input placeholder="xxxxxxxxxxxx" maxLength={12} value={form.aadhaar_no}
                onChange={e=>set("aadhaar_no",e.target.value.replace(/\D/g,""))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Department</label>
                <select value={form.department} onChange={e=>set("department",e.target.value)}>
                  {DEPTS.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Shift (hrs/day)</label>
                <input type="number" min={4} max={12} value={form.shift_hrs}
                  onChange={e=>set("shift_hrs",parseFloat(e.target.value)||8)} />
              </div>
            </div>
            {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
            <button className="btn btn-primary full-width" onClick={handleSaveDetails}>
              Next → Face Registration
            </button>
          </>
        ) : (
          <>
            <div className="card-title">Step 2 of 2: Face Registration</div>

            {!faceReady && !faceError && (
              <div className="face-loading">
                <div className="face-spinner"/>
                <span>Loading face recognition models, please wait...</span>
              </div>
            )}
            {faceError && <div className="alert alert-error">{faceError}</div>}

            {faceReady && (
              <>
                <div className="alert alert-info" style={{ marginBottom:"0.75rem" }}>
                  Look directly at the camera — face will be captured automatically.
                </div>
                <FaceCamera onCapture={handleFaceCapture} showRetake={true} autoCapture={true} />
              </>
            )}

            {faceAlert && <div className={`alert alert-${faceAlert.type}`}>{faceAlert.msg}</div>}

            <button className="btn full-width" style={{ marginTop:"0.5rem", color:"#991b1b" }} onClick={handleCancelFace}>
              ← Cancel & go back
            </button>
          </>
        )}
      </div>

      {/* ── Employee list ── */}
      <div className="card">
        <div className="card-title" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>All Employees ({employees.length})</span>
          <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:140 }} />
        </div>
        <div style={{ maxHeight:520, overflowY:"auto" }}>
          {filtered.length === 0
            ? <p className="muted">No employees found.</p>
            : filtered.map(e => (
              <div key={e.id} className="emp-list-row">
                <span className="emp-avatar">
                  {e.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{e.full_name}</div>
                  <div className="muted" style={{ fontSize:11 }}>{e.email} · {e.department} · {e.shift_hrs}h shift</div>
                </div>
                <button className="btn btn-danger" style={{ padding:"4px 8px", fontSize:11 }}
                  onClick={()=>handleDelete(e.id)}>Remove</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}