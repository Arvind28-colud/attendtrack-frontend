import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function SourceManager() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [alert,   setAlert]   = useState(null);
  const empty = { name:"", account_name:"", account_number:"", ifsc:"", pan:"" };
  const [form, setForm] = useState(empty);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = () => {
    setLoading(true);
    api.getSourcePersons().then(setSources).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    setAlert(null);
    if (!form.name.trim()) { setAlert({ type:"error", msg:"Name is required." }); return; }
    try {
      await api.createSourcePerson(form);
      setAlert({ type:"success", msg:`${form.name} added as source person.` });
      setForm(empty); setShowForm(false); load();
    } catch(e) { setAlert({ type:"error", msg: e.message }); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove source person "${name}"?`)) return;
    await api.deleteSourcePerson(id).catch(()=>{});
    load();
  };

  return (
    <div className="card" style={{ marginTop:"1.5rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
        <div>
          <div className="card-title" style={{ marginBottom:2 }}>Source Persons</div>
          <div style={{ fontSize:12, color:"var(--text3)" }}>People who refer employees — their account is used in invoices</div>
        </div>
        <button className="btn btn-primary" style={{ fontSize:12, padding:"6px 14px" }}
          onClick={() => { setShowForm(s=>!s); setAlert(null); }}>
          {showForm ? "Cancel" : "+ Add Source Person"}
        </button>
      </div>

      {showForm && (
        <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--r-lg)", padding:"1rem", marginBottom:"1rem" }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input placeholder="e.g. Raju" value={form.name} onChange={e=>set("name",e.target.value)} />
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".07em", margin:".75rem 0 .5rem" }}>
            Account Details (used in invoice)
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <input placeholder="As per bank" value={form.account_name} onChange={e=>set("account_name",e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input placeholder="e.g. 8948131015" value={form.account_number}
                onChange={e=>set("account_number",e.target.value.replace(/\D/g,""))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input placeholder="e.g. KKBK0005206" value={form.ifsc}
                onChange={e=>set("ifsc",e.target.value.toUpperCase())} maxLength={11} />
            </div>
            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input placeholder="e.g. ABCDE1234F" value={form.pan}
                onChange={e=>set("pan",e.target.value.toUpperCase())} maxLength={10} />
            </div>
          </div>
          {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
          <button className="btn btn-primary full-width" onClick={handleAdd}>Add Source Person</button>
        </div>
      )}

      {!showForm && alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom:"1rem" }}>{alert.msg}</div>}

      {loading
        ? <div className="muted" style={{ padding:"1rem 0" }}>Loading...</div>
        : sources.length === 0
          ? <div className="muted">No source persons added yet.</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Account Holder</th><th>Account No</th><th>IFSC</th><th>PAN</th><th></th></tr>
                </thead>
                <tbody>
                  {sources.map((s,i) => (
                    <tr key={s.id}>
                      <td className="muted">{i+1}</td>
                      <td style={{ fontWeight:600, color:"var(--white)" }}>{s.name}</td>
                      <td>{s.account_name||"—"}</td>
                      <td style={{ fontVariantNumeric:"tabular-nums" }}>{s.account_number||"—"}</td>
                      <td>{s.ifsc||"—"}</td>
                      <td>{s.pan||"—"}</td>
                      <td>
                        <button className="btn" style={{ fontSize:11, padding:"3px 8px", color:"var(--text3)" }}
                          onClick={()=>handleDelete(s.id, s.name)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }
    </div>
  );
}