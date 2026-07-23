import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import FaceCamera from "./FaceCamera";

export default function UserClockPage() {
  // ── Auth ──────────────────────────────────────────────────────
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("userAuthed") === "true");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoad, setAuthLoad] = useState(false);

  // ── Clock page ────────────────────────────────────────────────
  const [time, setTime] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [employees, setEmployees] = useState([]);
  const [allFaces, setAllFaces] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [todayRec, setTodayRec] = useState(null);
  const [step, setStep] = useState("select");
  const [alert, setAlert] = useState(null);
  const [camKey, setCamKey] = useState(0);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toTimeString().slice(0, 8));
      setDateStr(now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!authed) return;
    api.getEmployees().then(setEmployees).catch(() => { });
    api.getAllFaces().then(setAllFaces).catch(() => { });
  }, [authed]);

  const handleLogin = async () => {
    setAuthError(""); setAuthLoad(true);
    try {
      await api.userLogin(username, password);
      sessionStorage.setItem("userAuthed", "true");
      setAuthed(true);
    } catch (e) {
      setAuthError(e.message || "Invalid username or password.");
    } finally { setAuthLoad(false); }
  };

  const loadTodayRec = async (id) => {
    const recs = await api.getTodayAttendance().catch(() => []);
    setTodayRec(recs.find(r => r.emp_id === parseInt(id)) || null);
  };

  const handleSelect = async (id) => {
    setSelectedId(id); setAlert(null); setStep("select");
    if (id) await loadTodayRec(id);
    else setTodayRec(null);
  };

  const nextAction = () => {
    if (!todayRec) return "login";
    if (todayRec.status === "on-duty") return "logout";
    return "done";
  };

  const handleFaceMatch = async (matchedEmp) => {
    setAlert(null); setVerifying(true);
    try {
      const result = await api.clock(matchedEmp.id);
      if (result.action === "log_in") {
        setAlert({ type: "success", msg: `✓ ${result.emp_name} logged IN successfully at ${result.time}` });
      } else {
        setAlert({ type: "success", msg: `✓ ${result.emp_name} logged OUT successfully at ${result.time} (${result.total_hrs}h)` });
      }
      setStep("result");

      // Auto-reset Kiosk back to scanning after 4 seconds
      setTimeout(() => {
        setStep("select");
        setSelectedId("");
        setTodayRec(null);
        setAlert(null);
        setCamKey(prev => prev + 1); // trigger camera remount
      }, 4000);
    } catch (e) {
      setAlert({ type: "error", msg: e.message });
      setStep("result");
      setTimeout(() => {
        setStep("select");
        setSelectedId("");
        setTodayRec(null);
        setAlert(null);
        setCamKey(prev => prev + 1);
      }, 4000);
    }
    setVerifying(false);
  };

  const handleFaceFail = (customMsg) => {
    setAlert({ type: "error", msg: customMsg || "Face not recognised. Please try again." });
    setStep("result");
    setTimeout(() => {
      setStep("select");
      setSelectedId("");
      setTodayRec(null);
      setAlert(null);
      setCamKey(prev => prev + 1);
    }, 4000);
  };

  const action = nextAction();
  const emp = employees.find(e => e.id === parseInt(selectedId));

  // ── Login screen ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="login-page" style={{ position: "relative" }}>
        <a href="/admin" className="btn" style={{
          position: "absolute", top: "1.5rem", right: "1.5rem",
          fontSize: 12, padding: "7px 16px", background: "var(--bg2)",
          border: "1px solid var(--border3)", color: "var(--text2)",
          borderRadius: "var(--r)", textDecoration: "none", display: "flex",
          alignItems: "center", gap: 6
        }}>
          🗝️ Admin Login
        </a>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div className="login-logo">◈ AttendTrack</div>
            <div className="login-sub">Employee portal</div>
          </div>
          <div className="login-box">
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: "1.25rem" }}>Sign in</div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input placeholder="Enter username" value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            {authError && <div className="alert alert-error" style={{ marginBottom: "1rem" }}>{authError}</div>}
            <button className="btn btn-primary full-width" onClick={handleLogin} disabled={authLoad}>
              {authLoad ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Clock page ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "4.5rem", paddingBottom: "1.5rem" }}>

      {/* Premium Top Navigation Bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "56px",
        background: "rgba(11, 13, 17, 0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)", display: "flex",
        alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem",
        zIndex: 100
      }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, color: "var(--text)", fontSize: 15, letterSpacing: "-.02em" }}>
          ◈ AttendTrack Kiosk
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a href="/admin" className="btn" style={{ fontSize: 11, padding: "5px 12px", border: "1px solid var(--border3)" }}>
            🗝️ Admin Login
          </a>
          <button onClick={() => { sessionStorage.removeItem("userAuthed"); setAuthed(false); }} className="btn btn-danger" style={{ fontSize: 11, padding: "5px 12px" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: "1.5rem", marginTop: "1.5rem" }}>
        <div className="clock-display" style={{ fontSize: 56 }}>{time}</div>
        <div className="clock-date">{dateStr}</div>
      </div>

      <div style={{ width: "100%", maxWidth: 420 }}>

        {step === "select" && (
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: ".25rem" }}>
              Attendance
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginBottom: "1.25rem" }}>
              Align your face and click Mark Attendance
            </div>

            {/* Auto-scanning kiosk FaceCamera */}
            <FaceCamera key={camKey} knownFaces={allFaces} onMatch={handleFaceMatch} onFail={handleFaceFail} />

            {/* Collapsible Manual Check-in Fallback */}
            <div style={{ borderTop: "1px dashed var(--border)", marginTop: "1.25rem", paddingTop: "1rem" }}>
              <details style={{ width: "100%" }}>
                <summary style={{ fontSize: 11, color: "var(--text3)", cursor: "pointer", userSelect: "none", textAlign: "center", fontWeight: 600 }}>
                  Manual Selection Fallback
                </summary>
                <div style={{ marginTop: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11 }}>Select Your Name</label>
                    <select value={selectedId} onChange={e => handleSelect(e.target.value)}>
                      <option value="">— Select your name —</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.project_name || "No Project"})</option>)}
                    </select>
                  </div>
                  {todayRec && (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "10px 12px", marginBottom: "1rem", fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text3)" }}>Log In</span>
                        <span style={{ color: "var(--text)", fontWeight: 500 }}>{todayRec.log_in || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ color: "var(--text3)" }}>Log Out</span>
                        <span style={{ color: "var(--text)", fontWeight: 500 }}>{todayRec.log_out || "—"}</span>
                      </div>
                      {todayRec.total_hrs > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ color: "var(--text3)" }}>Hours worked</span>
                          <span style={{ color: "var(--text)", fontWeight: 500 }}>{todayRec.total_hrs}h</span>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedId && action === "done" && (
                    <div className="alert alert-info" style={{ fontSize: 12, padding: "6px 10px" }}>Attendance completed for today ✓</div>
                  )}
                  {selectedId && action !== "done" && (
                    <button className="btn btn-primary full-width" style={{ fontSize: 12, padding: "8px", justifyContent: "center" }}
                      onClick={() => { setAlert(null); setStep("capture"); }}>
                      📷 Verify for {action === "login" ? "Log In" : "Log Out"}
                    </button>
                  )}
                </div>
              </details>
            </div>
          </div>
        )}

        {step === "capture" && (
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", textAlign: "center", marginBottom: ".75rem" }}>
              {action === "login" ? "Log In" : "Log Out"} — {emp?.full_name} {emp?.project_name ? `(${emp.project_name})` : ""}
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginBottom: "1rem" }}>
              Verifying credentials with camera
            </div>
            <FaceCamera key={camKey} knownFaces={allFaces.filter(f => f.id === parseInt(selectedId))} onMatch={handleFaceMatch} onFail={handleFaceFail} />
            <button className="btn full-width" style={{ marginTop: ".5rem", justifyContent: "center" }}
              onClick={() => { setStep("select"); setAlert(null); }}>← Cancel</button>
          </div>
        )}

        {step === "result" && (
          <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: 72, marginBottom: "1rem", color: alert?.type === "success" ? "#34d399" : "#f87171" }}>
              {alert?.type === "success" ? "✓" : "✕"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: ".5rem" }}>
              {alert?.type === "success" ? "Success!" : "Failed"}
            </div>
            <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: "1.5rem", lineHeight: 1.5 }}>{alert?.msg}</div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>Resuming scan automatically in a few seconds...</div>
            <button className="btn btn-primary full-width" style={{ marginTop: "1rem" }} onClick={() => {
              setStep("select"); setSelectedId(""); setTodayRec(null); setAlert(null); setCamKey(k => k + 1);
            }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}