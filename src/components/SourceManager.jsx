import { useState, useEffect } from "react";
import { api } from "../api/client";

const emptySource = { name:"", account_name:"", account_number:"", ifsc:"", pan:"" };

export default function SourceManager({ onChange }) {
  const [open,    setOpen]    = useState(false);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form,    setForm]    = useState(emptySource);
  const [editId,  setEditId]  = useState(null);
  const [alert,   setAlert]   = useState(null);
  const [saving,  setSaving]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = () => {
    setLoading(true);
    api.getSources()
      .then(setSources)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(emptySource); setEditId(null); };

  const handleSave = async () => {
    setAlert(null);
    if (!form.name.trim()) { setAlert({ type:"error", msg:"Source name is required." }); return; }
    setSaving(true);
    try {
      if (editId) await api.updateSource(editId, form);
      else        await api.createSource(form);
      setAlert({ type:"success", msg: editId ? "Source updated." : "Source added." });
      resetForm();
      load();
      onChange && onChange();
    } catch (e) {
      setAlert({ type:"error", msg: e.message });
    } finally { setSaving(false); }
  };

  const handleEdit = (s) => {
    setEditId(s.id);
    setForm({
      name:           s.name           || "",
      account_name:   s.account_name   || "",
      account_number: s.account_number || "",
      ifsc:           s.ifsc           || "",
      pan:            s.pan            || "",
    });
    setAlert(null);
  };

  const handleDelete = async (id) => {
    setAlert(null);
    try {
      await api.deleteSource(id);
      if (editId === id) resetForm();
      load();
      onChange && onChange();
    } catch (e) {
      setAlert({ type:"error", msg: e.message });
    }
  };

  return (
    <div className="card" style={{ marginTop:"1rem" }}>
      <div
        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <div className="card-title" style={{ marginBottom:2 }}>Manage Sources</div>
          <div className="muted" style={{ fontSize:12 }}>{sources.length} source(s) · used in the "Referred by" dropdown</div>
        </div>
        <span className="muted" style={{ fontSize:13 }}>{open ? "▲ Hide" : "▼ Show"}</span>
      </div>

      {open && (
        <div style={{ marginTop:"1rem" }}>
          {loading
            ? <div className="muted" style={{ padding:".75rem 0" }}>Loading sources...</div>
            : sources.length === 0
              ? <div className="muted" style={{ padding:".75rem 0" }}>No sources yet. Add one below.</div>
              : (
                <div style={{ display:"flex", flexDirection:"column", gap:".4rem", marginBottom:"1rem" }}>
                  {sources.map(s => (
                    <div key={s.id} style={{
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      gap:".5rem", padding:".5rem .75rem",
                      border:"1px solid var(--border)", borderRadius:"var(--r)"
                    }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:600 }}>{s.name}</div>
                        {(s.account_number || s.account_name) && (
                          <div className="muted" style={{ fontSize:11 }}>
                            {s.account_name || "—"}{s.account_number ? ` · ${s.account_number}` : ""}
                          </div>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:".4rem", flexShrink:0 }}>
                        <button className="btn" style={{ padding:"4px 10px", fontSize:12 }} onClick={()=>handleEdit(s)}>Edit</button>
                        <button className="btn btn-danger" style={{ padding:"4px 10px", fontSize:12 }} onClick={()=>handleDelete(s.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
          }

          <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:".75rem" }}>
              {editId ? "Edit Source" : "Add New Source"}
            </div>
            <div className="form-group">
              <label className="form-label">Source Name</label>
              <input placeholder="e.g. Raju Contractor, Indeed" value={form.name} onChange={e=>set("name", e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Account Holder Name <span className="muted">(optional)</span></label>
                <input placeholder="As per bank" value={form.account_name} onChange={e=>set("account_name", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number <span className="muted">(optional)</span></label>
                <input placeholder="e.g. 8948131015" value={form.account_number}
                  onChange={e=>set("account_number", e.target.value.replace(/\D/g,""))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">IFSC Code <span className="muted">(optional)</span></label>
                <input placeholder="e.g. KKBK0005206" value={form.ifsc}
                  onChange={e=>set("ifsc", e.target.value.toUpperCase())} maxLength={11} />
              </div>
              <div className="form-group">
                <label className="form-label">PAN Number <span className="muted">(optional)</span></label>
                <input placeholder="e.g. ABCDE1234F" value={form.pan}
                  onChange={e=>set("pan", e.target.value.toUpperCase())} maxLength={10} />
              </div>
            </div>
            {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
            <button className="btn btn-primary full-width" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editId ? "Update Source" : "Add Source"}
            </button>
            {editId && (
              <button className="btn full-width" style={{ marginTop:".4rem", color:"var(--text3)" }} onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
