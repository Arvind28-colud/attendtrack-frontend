import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useFaceApi, findBestMatch } from "../api/faceApi";
import FaceCamera from "./FaceCamera";

export default function ClockStation() {
  const { ready: faceReady, error: faceError } = useFaceApi();

  const [time,       setTime]       = useState("");
  const [dateStr,    setDateStr]    = useState("");
  const [employees,  setEmployees]  = useState([]);
  const [allFaces,   setAllFaces]   = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [empDetail,  setEmpDetail]  = useState(null);
  const [todayRec,   setTodayRec]   = useState(null);
  const [todayLog,   setTodayLog]   = useState([]);
  const [showCam,    setShowCam]    = useState(false);
  const [alert,      setAlert]      = useState(null);
  const [camKey,     setCamKey]     = useState(0); // remount FaceCamera on retake

  // Clock ticker
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toTimeString().slice(0, 8));
      setDateStr(now.toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" }));
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(() => {});
    api.getAllFaces().then(setAllFaces).catch(() => {});
    loadTodayLog();
  }, []);

  const loadTodayLog = () => api.getTodayAttendance().then(setTodayLog).catch(() => {});

  const handleSelectEmp = async (id) => {
    setSelectedId(id);
    setAlert(null);
    setShowCam(false);
    if (!id) { setEmpDetail(null); setTodayRec(null); return; }
    const [det, todayAll] = await Promise.all([
      api.getEmployee(parseInt(id)),
      api.getTodayAttendance(),
    ]);
    setEmpDetail(det);
    setTodayRec(todayAll.find(r => r.emp_id === parseInt(id)) || null);
  };

  const nextAction = () => {
    if (!todayRec) return "clock_in";
    if (todayRec.status === "on-duty") return "clock_out";
    return "done";
  };

  // Called by FaceCamera when auto-capture fires
  const handleFaceCapture = async (descriptor) => {
    setAlert(null);
    // Match against all known faces
    const match = findBestMatch(descriptor, allFaces);
    if (!match) {
      setAlert({ type:"error", msg:"Face not recognised. Please try again." });
      setShowCam(false); return;
    }
    if (match.id !== parseInt(selectedId)) {
      setAlert({ type:"error", msg:`Face matched ${match.full_name} — not the selected employee. Please try again.` });
      setShowCam(false); return;
    }
    // Face verified → clock in/out
    try {
      const result = await api.clock(parseInt(selectedId));
      setShowCam(false);
      if (result.action === "clock_in") {
        setAlert({ type:"success", msg:`✓ ${result.emp_name} clocked IN at ${result.time}` });
        setTodayRec({ status:"on-duty", clock_in: result.time, clock_out: null, total_hrs:0, ot_hrs:0 });
      } else {
        setAlert({ type:"success", msg:`✓ ${result.emp_name} clocked OUT at ${result.time} · ${result.total_hrs}h worked${result.ot_hrs > 0 ? ` · ${result.ot_hrs}h OT` : ""}` });
        setTodayRec({ status:"present", clock_in: todayRec?.clock_in, clock_out: result.time, total_hrs: result.total_hrs, ot_hrs: result.ot_hrs });
      }
      loadTodayLog();
      api.getAllFaces().then(setAllFaces).catch(() => {});
    } catch(e) {
      setAlert({ type:"error", msg: e.message });
      setShowCam(false);
    }
  };

  const handleStartCam = () => {
    setAlert(null);
    setCamKey(k => k + 1); // remount fresh camera
    setShowCam(true);
  };

  const handleCancel = () => { setShowCam(false); setAlert(null); };

  const action = nextAction();

  return (
    <div className="station-outer">
      {/* ── Left: controls ── */}
      <div className="station-left">
        <div className="card station-card">
          <div className="clock-display">{time}</div>
          <div className="clock-date">{dateStr}</div>

          <div className="form-group">
            <label className="form-label">Select Employee</label>
            <select value={selectedId} onChange={e => handleSelectEmp(e.target.value)}>
              <option value="">— Select employee —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name} ({e.department})</option>
              ))}
            </select>
          </div>

          {/* Employee detail panel */}
          {empDetail && (
            <div className="emp-detail-panel">
              <div className="emp-detail-avatar">
                {empDetail.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div className="emp-detail-info">
                <div className="emp-detail-name">{empDetail.full_name}</div>
                <div className="emp-detail-row"><span>Email</span><span>{empDetail.email}</span></div>
                <div className="emp-detail-row"><span>Aadhaar</span><span>{empDetail.aadhaar_no.replace(/(\d{4})(\d{4})(\d{4})/,"$1 $2 $3")}</span></div>
                <div className="emp-detail-row"><span>Department</span><span>{empDetail.department}</span></div>
                <div className="emp-detail-row"><span>Shift</span><span>{empDetail.shift_hrs} hrs/day</span></div>
                {todayRec && <>
                  <div className="emp-detail-row"><span>Clock In</span><span>{todayRec.clock_in || "—"}</span></div>
                  <div className="emp-detail-row"><span>Clock Out</span><span>{todayRec.clock_out || "—"}</span></div>
                  {todayRec.total_hrs > 0 && (
                    <div className="emp-detail-row"><span>Total / OT</span><span>{todayRec.total_hrs}h / {todayRec.ot_hrs}h</span></div>
                  )}
                  <div className="emp-detail-row">
                    <span>Status</span>
                    <span className={`badge badge-${todayRec.status==="present"||todayRec.status==="on-duty"?"in":"absent"}`}>
                      {todayRec.status === "on-duty" ? "Working" : todayRec.status}
                    </span>
                  </div>
                </>}
              </div>
            </div>
          )}

          {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

          {selectedId && action !== "done" && !showCam && (
            <button className="btn btn-primary full-width" onClick={handleStartCam} disabled={!faceReady}>
              {!faceReady ? "Loading face models..." : action === "clock_in" ? "▶ Start Clock In — Face Verify" : "▶ Start Clock Out — Face Verify"}
            </button>
          )}
          {action === "done" && !showCam && (
            <div className="alert alert-info">Attendance completed for today.</div>
          )}
        </div>

        {/* Today's log */}
        <div className="card">
          <div className="card-title">Today's Log</div>
          {todayLog.length === 0
            ? <p className="muted">No records yet today.</p>
            : todayLog.map((r,i) => (
              <div key={i} className="log-row">
                <span className="log-name">{r.full_name}</span>
                <span className="log-times">{r.clock_in||"—"} → {r.clock_out||"ongoing"}</span>
                <span className={`badge badge-${r.status==="present"||r.status==="on-duty"?"in":"absent"}`}>
                  {r.status === "on-duty" ? "Working" : r.status}
                </span>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Right: camera ── */}
      <div className="station-right">
        <div className="card">
          <div className="card-title">
            {!showCam ? "Face Verification" : action === "clock_in" ? "Clock In — Face Verification" : "Clock Out — Face Verification"}
          </div>

          {faceError && <div className="alert alert-error">{faceError}</div>}

          {!faceReady && !faceError && (
            <div className="face-loading">
              <div className="face-spinner"/>
              <span>Loading face recognition models...</span>
            </div>
          )}

          {faceReady && !showCam && (
            <div className="cam-placeholder">
              <div className="cam-icon">◉</div>
              <p className="muted">
                {selectedId
                  ? "Click the button on the left to start face verification"
                  : "Select an employee first"}
              </p>
            </div>
          )}

          {faceReady && showCam && (
            <>
              <FaceCamera
                key={camKey}
                onCapture={handleFaceCapture}
                showRetake={false}
                autoCapture={true}
              />
              <button className="btn full-width" style={{ marginTop:"0.5rem" }} onClick={handleCancel}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}