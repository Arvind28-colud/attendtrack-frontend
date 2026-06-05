import { useState, useEffect, useRef } from "react";
import { api } from "../../../api/client";
import { useFaceApi } from "../../../api/faceApi";
import RegisterCamera from "./RegisterCamera";

export default function UserClockPage() {
  const { ready: faceReady } = useFaceApi();
  const [time,      setTime]      = useState("");
  const [dateStr,   setDateStr]   = useState("");
  const [employees, setEmployees] = useState([]);
  const [allFaces,  setAllFaces]  = useState([]);
  const [selectedId,setSelectedId]= useState("");
  const [todayRec,  setTodayRec]  = useState(null);
  const [step,      setStep]      = useState("select"); // select | capture | result
  const [alert,     setAlert]     = useState(null);
  const [capturedDesc, setCapturedDesc] = useState(null);
  const [camKey,    setCamKey]    = useState(0);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toTimeString().slice(0,8));
      setDateStr(now.toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"}));
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(()=>{});
    api.getAllFaces().then(setAllFaces).catch(()=>{});
  }, []);

  const loadTodayRec = async (id) => {
    const recs = await api.getTodayAttendance().catch(()=>[]);
    setTodayRec(recs.find(r => r.emp_id === parseInt(id)) || null);
  };

  const handleSelect = async (id) => {
    setSelectedId(id); setAlert(null); setStep("select"); setCapturedDesc(null);
    if (id) await loadTodayRec(id);
    else setTodayRec(null);
  };

  const nextAction = () => {
    if (!todayRec) return "clock_in";
    if (todayRec.status === "on-duty") return "clock_out";
    return "done";
  };

  // euclidean distance
  const dist = (a, b) => Math.sqrt(a.reduce((s,v,i) => s + (v-b[i])**2, 0));

  const handleCapture = async (descriptor, _imageDataUrl) => {
    setAlert(null);
    setVerifying(true);

    // Verify face matches selected employee
    const selFace = allFaces.find(f => f.id === parseInt(selectedId));
    if (!selFace || !selFace.face_descriptor) {
      setAlert({ type:"error", msg:"No face registered for this employee. Contact admin." });
      setVerifying(false); setStep("select"); return;
    }

    const fd = Array.isArray(selFace.face_descriptor) ? selFace.face_descriptor
      : typeof selFace.face_descriptor === "string" ? JSON.parse(selFace.face_descriptor) : null;

    if (!fd) { setAlert({ type:"error", msg:"Face data corrupted. Contact admin." }); setVerifying(false); setStep("select"); return; }

    const d = dist(descriptor, fd);
    if (d > 0.5) {
      setAlert({ type:"error", msg:"Face not matched. Please try again or contact admin." });
      setVerifying(false); setStep("select"); return;
    }

    // Face matched — clock in/out
    try {
      const result = await api.clock(parseInt(selectedId));
      if (result.action === "clock_in") {
        setAlert({ type:"success", msg:`✓ ${result.emp_name} clocked IN at ${result.time}` });
        setTodayRec({ status:"on-duty", clock_in:result.time, clock_out:null });
      } else {
        setAlert({ type:"success", msg:`✓ ${result.emp_name} clocked OUT at ${result.time} · ${result.total_hrs}h worked` });
        setTodayRec({ status:"present", clock_in:todayRec?.clock_in, clock_out:result.time, total_hrs:result.total_hrs });
      }
      setStep("result");
    } catch(e) {
      setAlert({ type:"error", msg: e.message });
      setStep("select");
    }
    setVerifying(false);
  };

  const action = nextAction();
  const emp = employees.find(e => e.id === parseInt(selectedId));

  return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"1.5rem" }}>

      {/* Clock */}
      <div style={{ textAlign:"center", marginBottom:"2rem" }}>
        <div style={{ fontSize:48, fontWeight:800, color:"#fff", fontVariantNumeric:"tabular-nums", letterSpacing:"-2px" }}>{time}</div>
        <div style={{ fontSize:13, color:"#666", marginTop:4 }}>{dateStr}</div>
      </div>

      <div style={{ width:"100%", maxWidth:420 }}>

        {/* Step: Select */}
        {step === "select" && (
          <div className="card">
            <div className="card-title" style={{ textAlign:"center", marginBottom:"1.25rem" }}>Attendance</div>

            <div className="form-group">
              <label className="form-label">Select Your Name</label>
              <select value={selectedId} onChange={e=>handleSelect(e.target.value)}>
                <option value="">— Select your name —</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>

            {todayRec && (
              <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--r)", padding:"10px 12px", marginBottom:"1rem", fontSize:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"var(--text3)" }}>Clock In</span>
                  <span style={{ color:"var(--white)" }}>{todayRec.clock_in || "—"}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  <span style={{ color:"var(--text3)" }}>Clock Out</span>
                  <span style={{ color:"var(--white)" }}>{todayRec.clock_out || "—"}</span>
                </div>
                {todayRec.total_hrs > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ color:"var(--text3)" }}>Hours worked</span>
                    <span style={{ color:"var(--white)" }}>{todayRec.total_hrs}h</span>
                  </div>
                )}
              </div>
            )}

            {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom:"1rem" }}>{alert.msg}</div>}

            {selectedId && action === "done" && (
              <div className="alert alert-info">Attendance completed for today ✓</div>
            )}

            {selectedId && action !== "done" && (
              <button className="btn btn-primary full-width" disabled={!faceReady}
                onClick={() => { setAlert(null); setCamKey(k=>k+1); setStep("capture"); }}>
                {!faceReady ? "Loading face models..." : action === "clock_in" ? "📷 Capture to Clock In" : "📷 Capture to Clock Out"}
              </button>
            )}
          </div>
        )}

        {/* Step: Capture */}
        {step === "capture" && (
          <div className="card">
            <div className="card-title" style={{ textAlign:"center", marginBottom:".75rem" }}>
              {action === "clock_in" ? "Clock In" : "Clock Out"} — {emp?.full_name}
            </div>
            <div style={{ fontSize:12, color:"var(--text3)", textAlign:"center", marginBottom:"1rem" }}>
              Position your face and press Capture
            </div>
            <RegisterCamera key={camKey} onCapture={handleCapture} />
            {verifying && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:".75rem", fontSize:13, color:"var(--text3)" }}>
                <div className="face-spinner" style={{ width:16, height:16 }}/> Verifying face...
              </div>
            )}
            <button className="btn full-width" style={{ marginTop:".5rem", color:"var(--text3)" }}
              onClick={() => { setStep("select"); setAlert(null); }}>← Back</button>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && (
          <div className="card" style={{ textAlign:"center" }}>
            <div style={{ fontSize:64, marginBottom:"1rem" }}>
              {alert?.type === "success" ? "✓" : "✕"}
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:"var(--white)", marginBottom:".5rem" }}>
              {alert?.type === "success" ? "Done!" : "Failed"}
            </div>
            <div style={{ fontSize:13, color:"var(--text3)", marginBottom:"1.5rem" }}>{alert?.msg}</div>
            <button className="btn btn-primary full-width" onClick={() => {
              setStep("select"); setSelectedId(""); setTodayRec(null); setAlert(null);
            }}>Done</button>
          </div>
        )}
      </div>

      <div style={{ marginTop:"1.5rem", fontSize:11, color:"#333" }}>
        Admin? <a href="/admin" style={{ color:"#666", textDecoration:"underline" }}>Login here</a>
      </div>
    </div>
  );
}