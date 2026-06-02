import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search,    setSearch]    = useState("");
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.getEmployees()
      .then(setEmployees)
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const filtered = employees.filter(e =>
    `${e.full_name} ${e.phone} ${e.source} ${e.location}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
          <div>
            <div className="card-title" style={{ marginBottom:2 }}>All Employees</div>
            <div className="muted" style={{ fontSize:12 }}>{employees.length} registered</div>
          </div>
          <input placeholder="Search name, phone, source..." value={search}
            onChange={e=>setSearch(e.target.value)} style={{ width:240 }} />
        </div>

        {loading
          ? <div className="muted" style={{ padding:"2rem", textAlign:"center" }}>Loading employees...</div>
          : filtered.length === 0
            ? <div className="muted" style={{ padding:"2rem", textAlign:"center" }}>No employees found.</div>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Source</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, i) => (
                      <tr key={e.id}>
                        <td className="muted" style={{ width:40 }}>{i + 1}</td>
                        <td>
                          <div className="emp-row">
                            <span className="emp-avatar">
                              {e.full_name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                            </span>
                            <span style={{ fontWeight:600 }}>{e.full_name}</span>
                          </div>
                        </td>
                        <td style={{ fontVariantNumeric:"tabular-nums" }}>{e.phone || "—"}</td>
                        <td>{e.source || <span className="muted">—</span>}</td>
                        <td>
                          <span className="badge badge-dept">{e.location || "—"}</span>
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
