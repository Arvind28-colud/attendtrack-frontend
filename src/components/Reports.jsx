import { useState, useEffect } from "react";
import { api } from "../api/client";

const DEFAULT_SETTINGS = {
  pay_per_day: 500, ot_pay_per_hr: 100,
  food_allowance: 50, food_before_time: "08:00", tds_amount: 13
};

function timeBefore(t, limit) {
  if (!t) return false;
  return t <= limit;
}

export default function Reports() {
  const [employees,    setEmployees]    = useState([]);
  const [settings,     setSettings]     = useState(DEFAULT_SETTINGS);  const [mode,         setMode]         = useState("month");
  const [month,        setMonth]        = useState(new Date().toISOString().slice(0,7));
  const [date,         setDate]         = useState(new Date().toISOString().slice(0,10));
  const [empFilter,    setEmpFilter]    = useState("");
  const [preview,      setPreview]      = useState([]);
  const [alert,        setAlert]        = useState(null);
  const [savingSettings, setSaving]     = useState(false);

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(()=>{});
    api.getSettings().then(setSettings).catch(()=>{});
  }, []);

  const buildParams = () => {
    const p = {};
    if (mode === "month") p.month = month; else p.date_filter = date;
    if (empFilter) p.emp_id = parseInt(empFilter);
    return p;
  };

  const calcPay = (records, s) => {
    const map = {};
    records.forEach(r => {
      if (!map[r.emp_id]) map[r.emp_id] = {
        name: r.full_name, dept: r.department,
        present: 0, totalHrs: 0, otHrs: 0, foodDays: 0
      };
      const m = map[r.emp_id];
      if (r.status === "present") {
        m.present++;
        if (timeBefore(r.clock_in, s.food_before_time)) m.foodDays++;
      }
      m.totalHrs += parseFloat(r.total_hrs || 0);
      m.otHrs    += parseFloat(r.ot_hrs    || 0);
    });

    return Object.values(map).map(m => {
      const dayPay  = +(m.present * s.pay_per_day).toFixed(2);
      const otPay   = +(m.otHrs   * s.ot_pay_per_hr).toFixed(2);
      const food    = +(m.foodDays * s.food_allowance).toFixed(2);
      const gross   = +(dayPay + otPay + food).toFixed(2);
      const tds     = +(m.present * s.tds_amount).toFixed(2);  // flat per present day
      const net     = +(gross - tds).toFixed(2);
      return { ...m, dayPay, otPay, food, gross, tds, net, tds_amt: s.tds_amount };
    });
  };

  const handlePreview = async () => {
    setAlert(null);
    const data = await api.getAttendance(buildParams()).catch(()=>null);
    if (!data || data.length === 0) {
      setAlert({ type:"error", msg:"No records found." }); setPreview([]); return;
    }
    const s = await api.getSettings().catch(()=>settings);
    setPreview(calcPay(data, s));
  };

  const handleDownload = () => {
    window.location.href = api.getReportCSVUrl(buildParams());
    setAlert({ type:"success", msg:"CSV download started." });
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setAlert({ type:"success", msg:"Settings saved." });
    } catch(e) {
      setAlert({ type:"error", msg: e.message });
    } finally { setSaving(false); }
  };

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  return (
    <div>
      <div className="grid2">
        {/* ── Report generator ── */}
        <div className="card">
          <div className="card-title">Generate Report</div>
          <div className="toggle-group" style={{ marginBottom:"1rem" }}>
            <button className={`toggle-btn ${mode==="month"?"active":""}`} onClick={()=>setMode("month")}>By Month</button>
            <button className={`toggle-btn ${mode==="date"?"active":""}`}  onClick={()=>setMode("date")}>By Specific Date</button>
          </div>
          {mode === "month"
            ? <div className="form-group"><label className="form-label">Month</label><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></div>
            : <div className="form-group"><label className="form-label">Date</label><input type="date"  value={date}  onChange={e=>setDate(e.target.value)}/></div>
          }
          <div className="form-group">
            <label className="form-label">Employee (blank = all)</label>
            <select value={empFilter} onChange={e=>setEmpFilter(e.target.value)}>
              <option value="">All employees</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>

          {/* Quick rates reminder */}
          <div className="pay-rates-bar">
            <span>₹{settings.pay_per_day}/day</span>
            <span>₹{settings.ot_pay_per_hr}/OT hr</span>
            <span>Food ₹{settings.food_allowance} (before {settings.food_before_time})</span>
            <span>TDS ₹{settings.tds_amount}/day</span>
          </div>

          {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

          <div style={{ display:"flex", gap:"0.5rem" }}>
            <button className="btn" style={{ flex:1 }} onClick={handlePreview}>Preview</button>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={handleDownload}>↓ CSV</button>
          </div>
        </div>

        {/* ── Admin pay settings ── */}
        <div className="card">
          <div className="card-title">Admin — Pay &amp; Deduction Settings</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pay Per Day (₹)</label>
              <input type="number" min={0} value={settings.pay_per_day}
                onChange={e=>set("pay_per_day", parseFloat(e.target.value)||0)} />
            </div>
            <div className="form-group">
              <label className="form-label">OT Pay Per Hour (₹)</label>
              <input type="number" min={0} value={settings.ot_pay_per_hr}
                onChange={e=>set("ot_pay_per_hr", parseFloat(e.target.value)||0)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Food Allowance Per Day (₹)</label>
              <input type="number" min={0} value={settings.food_allowance}
                onChange={e=>set("food_allowance", parseFloat(e.target.value)||0)} />
            </div>
            <div className="form-group">
              <label className="form-label">Food Allowance — Clock In Before</label>
              <input type="time" value={settings.food_before_time}
                onChange={e=>set("food_before_time", e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">TDS Amount Per Day (₹) — deducted from Day Pay</label>
            <input type="number" min={0} step={0.01} value={settings.tds_amount}
              onChange={e=>set("tds_amount", parseFloat(e.target.value)||0)} />
          </div>
          <div className="alert alert-info" style={{ fontSize:12, marginBottom:"0.75rem" }}>
            Food allowance for employees who clock in before <strong>{settings.food_before_time}</strong>.
            TDS is a flat ₹{settings.tds_amount} deducted per present day.
          </div>
          <button className="btn btn-primary full-width" onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* ── Pay summary preview ── */}
      {preview.length > 0 && (
        <div className="card">
          <div className="card-title">Pay Summary Preview</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Dept</th>
                  <th>Present</th>
                  <th>OT Hrs</th>
                  <th>Day Pay</th>
                  <th>OT Pay</th>
                  <th>Food Allow.</th>
                  <th>Gross</th>
                  <th>TDS (₹{preview[0]?.tds_amt}/day)</th>
                  <th>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:600 }}>{p.name}</td>
                    <td>{p.dept}</td>
                    <td>{p.present} days</td>
                    <td>{p.otHrs.toFixed(1)}h</td>
                    <td>₹{p.dayPay.toFixed(2)}</td>
                    <td>₹{p.otPay.toFixed(2)}</td>
                    <td>
                      ₹{p.food.toFixed(2)}
                      {p.foodDays > 0 && <span className="muted" style={{ fontSize:10, marginLeft:4 }}>({p.foodDays}d)</span>}
                    </td>
                    <td>₹{p.gross.toFixed(2)}</td>
                    <td style={{ color:"#991b1b" }}>− ₹{p.tds.toFixed(2)}</td>
                    <td><strong>₹{p.net.toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-employee breakdown cards */}
          <div style={{ marginTop:"1.25rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {preview.map((p,i) => (
              <div key={i} className="payslip-card">
                <div className="payslip-name">{p.name} <span className="muted">— {p.dept}</span></div>
                <div className="payslip-grid">
                  <div className="payslip-row earn"><span>Day Pay ({p.present} days × ₹{settings.pay_per_day})</span><span>₹{p.dayPay.toFixed(2)}</span></div>
                  <div className="payslip-row earn"><span>OT Pay ({p.otHrs.toFixed(1)}h × ₹{settings.ot_pay_per_hr})</span><span>₹{p.otPay.toFixed(2)}</span></div>
                  <div className="payslip-row earn"><span>Food Allowance ({p.foodDays} days × ₹{settings.food_allowance})</span><span>₹{p.food.toFixed(2)}</span></div>
                  <div className="payslip-row total"><span>Gross Pay</span><span>₹{p.gross.toFixed(2)}</span></div>
                  <div className="payslip-row deduct"><span>TDS (₹{p.tds_amt}/day × {p.present} days)</span><span>− ₹{p.tds.toFixed(2)}</span></div>
                  <div className="payslip-row net"><span>Net Pay</span><span>₹{p.net.toFixed(2)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}