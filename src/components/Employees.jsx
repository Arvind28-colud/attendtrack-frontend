import { useState, useEffect } from "react";
import { api } from "../api/client";
import { getEmbedding } from "../api/arcface";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const fetchEmps = () => {
    setLoading(true);
    api.getEmployees()
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEmps();
  }, []);

  const handlePhotoUpload = async (empId, file) => {
    if (!file) return;
    setUpdatingId(empId);
    setStatusMsg({ type: "info", msg: "Processing & extracting face features..." });
    try {
      const b64 = await fileToBase64(file);
      const dataUri = `data:${file.type};base64,${b64}`;
      
      // 1. Extract ArcFace descriptor for face recognition
      const descriptor = await getEmbedding(dataUri);
      await api.updateFace(empId, descriptor);
      
      // 2. Save face image
      await api.updateFaceImage(empId, dataUri);
      
      setStatusMsg({ type: "success", msg: "Face photo & recognition updated successfully!" });
      fetchEmps();
    } catch (e) {
      setStatusMsg({ type: "error", msg: "Failed to update face: " + e.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = employees.filter(e =>
    `${e.full_name} ${e.phone} ${e.source} ${e.location} ${e.project_name || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <div className="card-title" style={{ marginBottom: 2 }}>All Employees</div>
            <div className="muted" style={{ fontSize: 12 }}>{employees.length} registered</div>
          </div>
          <input placeholder="Search name, phone, project..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
        </div>

        {statusMsg && (
          <div className={`alert alert-${statusMsg.type}`} style={{ marginBottom: "1rem" }}>
            {statusMsg.msg}
          </div>
        )}

        {loading
          ? <div className="muted" style={{ padding: "2rem", textAlign: "center" }}>Loading employees...</div>
          : filtered.length === 0
            ? <div className="muted" style={{ padding: "2rem", textAlign: "center" }}>No employees found.</div>
            : (
              <div className="table-wrap" style={{ maxHeight: "550px", overflowY: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Photo & Name</th>
                      <th>Phone</th>
                      <th>Source</th>
                      <th>Location</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, i) => (
                      <tr key={e.id}>
                        <td className="muted" style={{ width: 40 }}>{i + 1}</td>
                        <td>
                          <div className="emp-row">
                            {e.face_image ? (
                              <img
                                src={e.face_image.startsWith("http") || e.face_image.startsWith("data:") ? e.face_image : `${api.getReportExcelUrl().split('/reports/excel')[0]}${e.face_image}`}
                                alt={e.full_name}
                                style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border2)" }}
                                onError={(err) => { err.target.onerror = null; err.target.style.display = 'none'; }}
                              />
                            ) : (
                              <span className="emp-avatar">
                                {e.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 600 }}>{e.full_name}</span>
                              {e.project_name && <span className="badge badge-project" style={{ fontSize: 10, padding: "2px 6px", marginTop: 4, width: "fit-content" }}>{e.project_name}</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>{e.phone || "—"}</td>
                        <td>{e.source || <span className="muted">—</span>}</td>
                        <td>
                          <span className="badge badge-dept">{e.location || "—"}</span>
                        </td>
                        <td>
                          <label className="btn" style={{ fontSize: 11, padding: "4px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {updatingId === e.id ? "Uploading..." : "📷 Upload Photo"}
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              disabled={updatingId === e.id}
                              onChange={evt => {
                                if (evt.target.files[0]) handlePhotoUpload(e.id, evt.target.files[0]);
                              }}
                            />
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}