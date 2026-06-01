import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useFaceApi } from "../api/faceApi";
import FaceCamera from "./FaceCamera";

const DEPTS = ["Operator"];
const empty = { full_name:"", email:"", phone:"", aadhaar_no:"", department:"", location:"", source:"", shift_hrs:8 };

export default function Employees() {
  const { ready: faceReady, error: faceError } = useFaceApi();
  const [employees, setEmployees] = useState([]);
  const [search,    setSearch]    = useState("");
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState(empty);
  const [newEmpId,  setNewEmpId]  = useState(null);
  const [alert,     setAlert]     = useState(null);
  const [faceAlert, setFaceAlert] = useState(null);

  const load = () => api.getEmployees().then(setEmployees).catch(()=>{});
  useEffect(()=>{ load(); },[]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSaveDetails = async () => {
    setAlert(null);
    if (!form.full_name.trim()) { setAlert({type:"error",msg:"Full name is required."}); return; }
    if (!form.email.trim())     { setAlert({type:"error",msg:"Email is required."}); return; }
    if (form.aadhaar_no.length!==12||!/^\d+$/.test(form.aadhaar_no)) {
      setAlert({type:"error",msg:"Aadhaar must be exactly 12 digits."}); return;
    }
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      setAlert({type:"error",msg:"Phone must be 10 digits."}); return;
    }
    try {
      const res = await api.createEmployee(form);
      setNewEmpId(res.id); setAlert(null); setStep(2);
    } catch(e) { setAlert({type:"error",msg:e.message}); }
  };

  const handleFaceCapture = async (descriptor) => {
    setFaceAlert(null);
    try {
      await api.updateFace(newEmpId, descriptor);
      setFaceAlert({type:"success",msg:"Employee registered successfully!"});
      setTimeout(()=>{ setForm(empty); setStep(1); setNewEmpId(null); setFaceAlert(null); load(); }, 1800);
    } catch(e) {
      await api.deleteEmployee(newEmpId).catch(()=>{});
      setNewEmpId(null);
      setFaceAlert({type:"error",msg:"Failed to save face. Please try again: "+e.message});
      setTimeout(()=>{ setStep(1); setFaceAlert(null); }, 3000);
    }
  };

  const handleCancelFace = async () => {
    if (newEmpId) await api.deleteEmployee(newEmpId).catch(()=>{});
    setNewEmpId(null); setStep(1); setFaceAlert(null); setAlert(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this employee?")) return;
    await api.deleteEmployee(id).catch(()=>{});
    load();
  };

  const filtered = employees.filter(e=>
    `${e.full_name} ${e.email} ${e.department} ${e.phone||""} ${e.location||""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid2">
      <div className="card">
        {step===1 ? (
          <>
            <div className="card-title">Register Employee — Step 1 of 2: Details</div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input placeholder="Your Name" value={form.full_name} onChange={e=>set("full_name",e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" placeholder="youremail@gmail.com" value={form.email} onChange={e=>set("email",e.target.value)} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input placeholder="10-digit number" maxLength={10} value={form.phone} onChange={e=>set("phone",e.target.value.replace(/\D/g,""))} />
              </div>
              <div className="form-group">
                <label className="form-label">Aadhaar Number *</label>
                <input placeholder="12-digit Aadhaar" maxLength={12} value={form.aadhaar_no} onChange={e=>set("aadhaar_no",e.target.value.replace(/\D/g,""))} />
              </div>
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
                <input type="number" min={4} max={12} value={form.shift_hrs} onChange={e=>set("shift_hrs",parseFloat(e.target.value)||8)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <input placeholder="City / Area" value={form.location} onChange={e=>set("location",e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Source (Referred by)</label>
              <input placeholder="Name of person who referred" value={form.source} onChange={e=>set("source",e.target.value)} />
            </div>

            {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
            <button className="btn btn-primary full-width" onClick={handleSaveDetails}>
              Next → Face Registration
            </button>
          </>
        ) : (
          <>
            <div className="card-title">Register Employee — Step 2 of 2: Face Capture</div>
            {!faceReady&&!faceError&&(
              <div className="face-loading"><div className="face-spinner"/><span>Loading face recognition models...</span></div>
            )}
            {faceError&&<div className="alert alert-error">{faceError}</div>}
            {faceReady&&(
              <>
                <div className="alert alert-info">Look directly at the camera — face will be captured automatically.</div>
                <FaceCamera onCapture={handleFaceCapture} showRetake={true} autoCapture={true}/>
              </>
            )}
            {faceAlert&&<div className={`alert alert-${faceAlert.type}`}>{faceAlert.msg}</div>}
            <button className="btn full-width" style={{marginTop:".5rem",color:"var(--red)"}} onClick={handleCancelFace}>
              ← Cancel & go back
            </button>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>All Employees ({employees.length})</span>
          <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:130}} />
        </div>
        <div style={{maxHeight:560,overflowY:"auto"}}>
          {filtered.length===0
            ? <p className="muted">No employees found.</p>
            : filtered.map(e=>(
              <div key={e.id} className="emp-list-row">
                <span className="emp-avatar">{e.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{e.full_name}</div>
                  <div className="muted" style={{fontSize:11}}>{e.department} · {e.phone||"—"} · {e.location||"—"}</div>
                  {e.source&&<div className="muted" style={{fontSize:11}}>Ref: {e.source}</div>}
                </div>
                <button className="btn btn-danger" style={{padding:"4px 8px",fontSize:11}} onClick={()=>handleDelete(e.id)}>Remove</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
