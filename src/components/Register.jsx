import { useState, useEffect } from "react";
import { api } from "../api/client";
import RegisterCamera from "./RegisterCamera";
import SourceManager from "./sourcemanager";

const DEPTS = ["Tech Support"];
const LOCATION = "Hyderabad Office";
const empty = {
  full_name: "", father_name: "", phone: "", email: "",
  aadhaar_no: "", department: "",
  source: "", location: LOCATION, shift_hrs: 8,
  account_name: "", account_number: "", ifsc: "", pan: ""
};

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(empty);
  const [newEmpId, setNewEmpId] = useState(null);
  const [capturedImg, setCapturedImg] = useState(null);
  const [alert, setAlert] = useState(null);
  const [faceAlert, setFaceAlert] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [aadhaarAlert, setAadhaarAlert] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    api.getSourcePersons().then(setSources).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Step 1: Details ──────────────────────────────────────────
  const handleSaveDetails = async () => {
    setAlert(null);
    if (!form.full_name.trim()) { setAlert({ type: "error", msg: "Full name is required." }); return; }
    if (!form.father_name.trim()) { setAlert({ type: "error", msg: "Father name is required." }); return; }
    if (!/^\d{10}$/.test(form.phone)) { setAlert({ type: "error", msg: "Phone must be exactly 10 digits." }); return; }
    if (!form.email.trim()) { setAlert({ type: "error", msg: "Email is required." }); return; }
    if (form.aadhaar_no.length !== 12 || !/^\d+$/.test(form.aadhaar_no)) {
      setAlert({ type: "error", msg: "Aadhaar must be exactly 12 digits." }); return;
    }
    if (!form.source.trim()) { setAlert({ type: "error", msg: "Source (Referred by) is required." }); return; }
    try {
      const res = await api.createEmployee(form);
      setNewEmpId(res.id);
      setAlert(null);
      setStep(2);
    } catch (e) {
      setAlert({ type: "error", msg: e.message });
    }
  };

  // ── Step 2: Face capture ─────────────────────────────────────
  const handleFaceCapture = async (descriptor, imageDataUrl) => {
    setFaceAlert(null);
    setCapturedImg(imageDataUrl);
    const empId = newEmpId; // capture current value to avoid stale closure
    if (!empId) { setFaceAlert({ type: "error", msg: "Employee ID missing. Please go back and try again." }); return; }
    try {
      await api.updateFace(empId, descriptor);
      if (imageDataUrl) {
        await api.updateFaceImage(empId, imageDataUrl).catch(() => {});
      }
      setFaceAlert({ type: "success", msg: "Face registered! Now upload Aadhaar PDF." });
      setStep(3);
    } catch (e) {
      await api.deleteEmployee(empId).catch(() => {});
      setNewEmpId(null);
      setFaceAlert({ type: "error", msg: "Failed to save face. Employee removed. Try again: " + e.message });
      setTimeout(() => { setStep(1); setFaceAlert(null); }, 3000);
    }
  };

  // ── Step 3: Aadhaar PDF upload ───────────────────────────────
  const handleAadhaarUpload = async () => {
    if (!aadhaarFile) { setAadhaarAlert({ type: "error", msg: "Please select a PDF file." }); return; }
    if (aadhaarFile.type !== "application/pdf") { setAadhaarAlert({ type: "error", msg: "Only PDF files are accepted." }); return; }
    if (aadhaarFile.size > 5 * 1024 * 1024) { setAadhaarAlert({ type: "error", msg: "File too large. Max 5MB." }); return; }
    setUploading(true);
    setAadhaarAlert(null);
    try {
      const b64 = await fileToBase64(aadhaarFile);
      await api.updateAadhaarPdf(newEmpId, b64);
      setAadhaarAlert({ type: "success", msg: "Aadhaar uploaded successfully!" });
      setTimeout(() => {
        setDone(true);
        setTimeout(() => {
          setForm(empty); setStep(1); setNewEmpId(null);
          setCapturedImg(null); setAadhaarFile(null); setDone(false);
        }, 2000);
      }, 800);
    } catch (e) {
      setAadhaarAlert({ type: "error", msg: "Upload failed: " + e.message });
    } finally { setUploading(false); }
  };

  const handleSkipAadhaar = () => {
    setDone(true);
    setTimeout(() => {
      setForm(empty); setStep(1); setNewEmpId(null);
      setCapturedImg(null); setAadhaarFile(null); setDone(false);
    }, 1500);
  };

  const handleCancelFace = async () => {
    if (newEmpId) await api.deleteEmployee(newEmpId).catch(() => {});
    setNewEmpId(null); setStep(1); setFaceAlert(null); setAlert(null);
  };

  if (done) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: "1rem" }}>
        <div style={{ fontSize: 64, color: "var(--white)" }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--white)" }}>Employee Registered!</div>
        <div style={{ color: "var(--text3)", fontSize: 13 }}>Registration complete. Redirecting...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      {/* Progress */}
      <div className="reg-steps">
        {["Details", "Face", "Aadhaar PDF"].map((label, i) => (
          <div key={i} className={`reg-step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
            <div className="reg-step-num">{step > i + 1 ? "✓" : i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <SourceManager onChange={setSources} />
            <div className="card-title">New Employee — Step 1: Details</div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input placeholder="e.g. Ravi Kumar" value={form.full_name} onChange={e => set("full_name", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Father's Name</label>
              <input placeholder="e.g. Suresh Kumar" value={form.father_name} onChange={e => set("father_name", e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input placeholder="10 digits" maxLength={10} value={form.phone}
                  onChange={e => set("phone", e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" placeholder="email@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Aadhaar Number (12 digits)</label>
              <input placeholder="xxxxxxxxxxxx" maxLength={12} value={form.aadhaar_no}
                onChange={e => set("aadhaar_no", e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Department</label>
                <select value={form.department} onChange={e => set("department", e.target.value)}>
                  {DEPTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source (Referred by)</label>
                <select value={form.source} onChange={e => set("source", e.target.value)}>
                  <option value="">— Select source —</option>
                  <option value="TTIPL">TTIPL (use employee own account)</option>
                  {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input value={LOCATION} disabled style={{ opacity: .6, cursor: "not-allowed" }} />
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: ".25rem" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: ".75rem" }}>
                Account Details (for invoice)
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Account Holder Name</label>
                  <input placeholder="As per bank" value={form.account_name} onChange={e => set("account_name", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input placeholder="e.g. 8948131015" value={form.account_number}
                    onChange={e => set("account_number", e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input placeholder="e.g. KKBK0005206" value={form.ifsc}
                    onChange={e => set("ifsc", e.target.value.toUpperCase())} maxLength={11} />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input placeholder="e.g. ABCDE1234F" value={form.pan}
                    onChange={e => set("pan", e.target.value.toUpperCase())} maxLength={10} />
                </div>
              </div>
            </div>
            {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
            <button className="btn btn-primary full-width" onClick={handleSaveDetails}>
              Next → Face Registration
            </button>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <div className="card-title">Step 2: Face Registration</div>
            <RegisterCamera onCapture={handleFaceCapture} />
            {faceAlert && <div className={`alert alert-${faceAlert.type}`} style={{ marginTop: ".5rem" }}>{faceAlert.msg}</div>}
            <button className="btn full-width" style={{ marginTop: "0.5rem", color: "var(--text3)" }} onClick={handleCancelFace}>
              ← Cancel & go back
            </button>
          </>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <>
            <div className="card-title">Step 3: Upload Aadhaar PDF</div>
            {capturedImg && (
              <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Registered Face</div>
                <img src={capturedImg} alt="Registered face"
                  style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--white)", display: "inline-block" }} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Aadhaar Card PDF</label>
              <div className="pdf-upload-area" onClick={() => document.getElementById("aadhaar-pdf-input").click()}>
                {aadhaarFile ? (
                  <>
                    <div className="pdf-icon">📄</div>
                    <div className="pdf-name">{aadhaarFile.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>({(aadhaarFile.size / 1024).toFixed(1)} KB)</div>
                  </>
                ) : (
                  <>
                    <div className="pdf-icon">⬆</div>
                    <div style={{ fontSize: 13, color: "var(--text3)" }}>Click to upload Aadhaar PDF</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>Max 5MB · PDF only</div>
                  </>
                )}
              </div>
              <input id="aadhaar-pdf-input" type="file" accept=".pdf,application/pdf"
                style={{ display: "none" }} onChange={e => { if (e.target.files[0]) setAadhaarFile(e.target.files[0]); }} />
            </div>
            {aadhaarAlert && <div className={`alert alert-${aadhaarAlert.type}`}>{aadhaarAlert.msg}</div>}
            <button className="btn btn-primary full-width" onClick={handleAadhaarUpload} disabled={uploading || !aadhaarFile}>
              {uploading ? "Uploading..." : "Upload & Complete Registration"}
            </button>
            <button className="btn full-width" style={{ marginTop: ".4rem", color: "var(--text3)" }} onClick={handleSkipAadhaar}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
} // <--- Added missing closing brace here

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}