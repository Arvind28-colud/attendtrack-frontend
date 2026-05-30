const BASE = "http://localhost:8000";

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // Employees
  getEmployees:    ()       => req("/employees"),
  getEmployee:     (id)     => req(`/employees/${id}`),
  createEmployee:  (data)   => req("/employees", { method:"POST", body:JSON.stringify(data) }),
  updateFace:      (id, fd) => req(`/employees/${id}/face`, { method:"PUT", body:JSON.stringify({ face_descriptor: fd }) }),
  deleteEmployee:  (id)     => req(`/employees/${id}`, { method:"DELETE" }),
  getAllFaces:      ()       => req("/employees/faces/all"),

  // Clock
  clock: (emp_id) => req("/clock", { method:"POST", body:JSON.stringify({ emp_id }) }),

  // Attendance
  getAttendance: (params={}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return req(`/attendance${qs?"?"+qs:""}`);
  },
  getTodayAttendance: () => req("/attendance/today"),

  // Dashboard
  getDashboard: () => req("/dashboard"),

  // Settings
  getSettings:    ()     => req("/settings"),
  updateSettings: (data) => req("/settings", { method:"PUT", body:JSON.stringify(data) }),

  // Reports
  getReportCSVUrl: (params={}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return `${BASE}/reports/csv${qs?"?"+qs:""}`;
  },
};