import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { getEmbedding, cosineSimilarity } from "../api/arcface";
import RegisterCamera from "./RegisterCamera";

export default function UserClockPage() {
  // ── Auth ──────────────────────────────────────────────────────
  const [authed,    setAuthed]    = useState(false);
  const [username,  setUsername]  = useState("");
  const [password,  setPassword]  = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoad,  setAuthLoad]  = useState(false);

  // ── Clock page ────────────────────────────────────────────────
  const [time,       setTime]       = useState("");
  const [dateStr,    setDateStr]    = useState("");
  const [employees,  setEmployees]  = useState([]);
  const [allFaces,   setAllFaces]   = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [todayRec,   setTodayRec]   = useState(null);
  const [step,       setStep]       = useState("select");
  const [alert,      setAlert]      = useState(null);
  const [camKey,     setCamKey]     = useState(0);
  const [verifying,  setVerifying]  = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toTimeString().slice(0,8));
      setDateStr(now.toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"}));
    };
    tick(); const id = setInterval(tick,1000); return ()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    if(!authed) return;
    api.getEmployees().then(setEmployees).catch(()=>{});
    api.getAllFaces().then(setAllFaces).catch(()=>{});
  },[authed]);

  const handleLogin = async () => {
    setAuthError(""); setAuthLoad(true);
    try {
      await api.userLogin(username, password);
      setAuthed(true);
    } catch(e) {
      setAuthError(e.message || "Invalid username or password.");
    } finally { setAuthLoad(false); }
  };

  const loadTodayRec = async (id) => {
    const recs = await api.getTodayAttendance().catch(()=>[]);
    setTodayRec(recs.find(r=>r.emp_id===parseInt(id))||null);
  };

  const handleSelect = async (id) => {
    setSelectedId(id); setAlert(null); setStep("select");
    if(id) await loadTodayRec(id);
    else setTodayRec(null);
  };

  const nextAction = () => {
    if(!todayRec) return "login";
    if(todayRec.status==="on-duty") return "logout";
    return "done";
  };

  const handleCapture = async (embedding) => {
    setAlert(null); setVerifying(true);
    const selFace = allFaces.find(f=>f.id===parseInt(selectedId));
    if(!selFace||!selFace.face_descriptor){
      setAlert({type:"error",msg:"No face registered for this employee. Contact admin."});
      setVerifying(false); setStep("select"); return;
    }
    const fd = Array.isArray(selFace.face_descriptor)
      ? selFace.face_descriptor
      : typeof selFace.face_descriptor==="string"
        ? JSON.parse(selFace.face_descriptor) : null;
    if(!fd||fd.length===0){
      setAlert({type:"error",msg:"Face data corrupted. Contact admin."});
      setVerifying(false); setStep("select"); return;
    }
    const score = cosineSimilarity(embedding, fd);
    if(score < 0.4){
      setAlert({type:"error",msg:`Face not matched (${(score*100).toFixed(0)}% similarity). Try again.`});
      setVerifying(false); setStep("select"); return;
    }
    try {
      const result = await api.clock(parseInt(selectedId));
      if(result.action==="clock_in"){
        setAlert({type:"success",msg:`✓ ${result.emp_name} logged IN at ${result.time}`});
        setTodayRec({status:"on-duty",clock_in:result.time,clock_out:null});
      } else {
        setAlert({type:"success",msg:`✓ ${result.emp_name} logged OUT at ${result.time} · ${result.total_hrs}h`});
        setTodayRec({status:"present",clock_in:todayRec?.clock_in,clock_out:result.time,total_hrs:result.total_hrs});
      }
      setStep("result");
    } catch(e){
      setAlert({type:"error",msg:e.message});
      setStep("select");
    }
    setVerifying(false);
  };

  const action = nextAction();
  const emp = employees.find(e=>e.id===parseInt(selectedId));

  // ── Login screen ──────────────────────────────────────────────
  if(!authed){
    return (
      <div style={{minHeight:"100vh",background:"#1c1c1e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontSize:28,fontWeight:700,color:"#f5f5f7",letterSpacing:"-.5px"}}>◈ AttendTrack</div>
          <div style={{fontSize:13,color:"#636366",marginTop:6}}>Employee portal</div>
        </div>
        <div style={{width:"100%",maxWidth:360,background:"#2c2c2e",border:"1px solid #3a3a3c",borderRadius:14,padding:"1.5rem"}}>
          <div style={{fontSize:15,fontWeight:600,color:"#f5f5f7",marginBottom:"1.25rem"}}>Sign in</div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input placeholder="Enter username" value={username}
              onChange={e=>setUsername(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" placeholder="••••••••" value={password}
              onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          </div>
          {authError && <div className="alert alert-error" style={{marginBottom:"1rem"}}>{authError}</div>}
          <button className="btn btn-primary full-width" onClick={handleLogin} disabled={authLoad}>
            {authLoad ? "Signing in..." : "Sign in"}
          </button>
        </div>
        <div style={{marginTop:"1.5rem",fontSize:11,color:"#48484a"}}>
          Admin? <a href="/admin" style={{color:"#636366",textDecoration:"underline"}}>Login here</a>
        </div>
      </div>
    );
  }

  // ── Clock page ────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#1c1c1e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
      <div style={{textAlign:"center",marginBottom:"2rem"}}>
        <div style={{fontSize:48,fontWeight:500,color:"#f5f5f7",fontVariantNumeric:"tabular-nums",letterSpacing:"-2px"}}>{time}</div>
        <div style={{fontSize:13,color:"#636366",marginTop:4}}>{dateStr}</div>
      </div>

      <div style={{width:"100%",maxWidth:420}}>

        {step==="select" && (
          <div className="card">
            <div style={{fontSize:15,fontWeight:600,color:"#f5f5f7",textAlign:"center",marginBottom:"1.25rem"}}>Attendance</div>
            <div className="form-group">
              <label className="form-label">Select Your Name</label>
              <select value={selectedId} onChange={e=>handleSelect(e.target.value)}>
                <option value="">— Select your name —</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            {todayRec && (
              <div style={{background:"#232325",border:"1px solid #3a3a3c",borderRadius:"var(--r)",padding:"10px 12px",marginBottom:"1rem",fontSize:12}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"#636366"}}>Log In</span>
                  <span style={{color:"#f5f5f7"}}>{todayRec.clock_in||"—"}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{color:"#636366"}}>Log Out</span>
                  <span style={{color:"#f5f5f7"}}>{todayRec.clock_out||"—"}</span>
                </div>
                {todayRec.total_hrs>0 && (
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                    <span style={{color:"#636366"}}>Hours worked</span>
                    <span style={{color:"#f5f5f7"}}>{todayRec.total_hrs}h</span>
                  </div>
                )}
              </div>
            )}
            {alert && <div className={`alert alert-${alert.type}`} style={{marginBottom:"1rem"}}>{alert.msg}</div>}
            {selectedId && action==="done" && (
              <div className="alert alert-info">Attendance completed for today ✓</div>
            )}
            {selectedId && action!=="done" && (
              <button className="btn btn-primary full-width"
                onClick={()=>{setAlert(null);setCamKey(k=>k+1);setStep("capture");}}>
                📷 Capture to {action==="login"?"Log In":"Log Out"}
              </button>
            )}
          </div>
        )}

        {step==="capture" && (
          <div className="card">
            <div style={{fontSize:14,fontWeight:600,color:"#f5f5f7",textAlign:"center",marginBottom:".75rem"}}>
              {action==="login"?"Log In":"Log Out"} — {emp?.full_name}
            </div>
            <div style={{fontSize:12,color:"#636366",textAlign:"center",marginBottom:"1rem"}}>
              Position your face and press Capture
            </div>
            <RegisterCamera key={camKey} onCapture={handleCapture} />
            {verifying && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:".75rem",fontSize:13,color:"#636366"}}>
                <div className="face-spinner" style={{width:16,height:16}}/> Verifying face...
              </div>
            )}
            <button className="btn full-width" style={{marginTop:".5rem",color:"#636366"}}
              onClick={()=>{setStep("select");setAlert(null);}}>← Back</button>
          </div>
        )}

        {step==="result" && (
          <div className="card" style={{textAlign:"center"}}>
            <div style={{fontSize:64,marginBottom:"1rem"}}>
              {alert?.type==="success"?"✓":"✕"}
            </div>
            <div style={{fontSize:16,fontWeight:600,color:"#f5f5f7",marginBottom:".5rem"}}>
              {alert?.type==="success"?"Done!":"Failed"}
            </div>
            <div style={{fontSize:13,color:"#636366",marginBottom:"1.5rem"}}>{alert?.msg}</div>
            <button className="btn btn-primary full-width" onClick={()=>{
              setStep("select");setSelectedId("");setTodayRec(null);setAlert(null);
            }}>Done</button>
          </div>
        )}
      </div>

      <div style={{marginTop:"1.5rem",fontSize:11,color:"#48484a",display:"flex",gap:"1rem"}}>
        <button onClick={()=>setAuthed(false)} style={{background:"none",border:"none",color:"#636366",fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Sign out</button>
        <a href="/admin" style={{color:"#636366",textDecoration:"underline"}}>Admin login</a>
      </div>
    </div>
  );
}