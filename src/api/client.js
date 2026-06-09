const BASE = import.meta.env.VITE_API_URL || "https://attendtrack-backend-qlek.onrender.com";

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
  getEmployees:       ()        => req("/employees"),
  getEmployee:        (id)      => req(`/employees/${id}`),
  createEmployee:     (data)    => req("/employees", { method:"POST", body:JSON.stringify(data) }),
  updateFace:         (id, fd)  => req(`/employees/${id}/face`, { method:"PUT", body:JSON.stringify({ face_descriptor: fd }) }),
  updateFaceImage:    (id, img) => req(`/employees/${id}/face-image`, { method:"PUT", body:JSON.stringify({ face_image: img }) }),
  updateAadhaarPdf:   (id, pdf) => req(`/employees/${id}/aadhaar-pdf`, { method:"PUT", body:JSON.stringify({ aadhaar_pdf: pdf }) }),
  deleteEmployee:     (id)      => req(`/employees/${id}`, { method:"DELETE" }),
  getAllFaces:         ()        => req("/employees/faces/all"),
  clock:              (emp_id)  => req("/clock", { method:"POST", body:JSON.stringify({ emp_id }) }),
  getAttendance:      (params={}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return req(`/attendance${qs?"?"+qs:""}`);
  },
  getTodayAttendance: ()        => req("/attendance/today"),
  getDashboard:       ()        => req("/dashboard"),
  getSettings:        ()        => req("/settings"),
  updateSettings:     (data)    => req("/settings", { method:"PUT", body:JSON.stringify(data) }),
  userLogin:         (username, password) => req("/user/login", { method:"POST", body:JSON.stringify({ username, password }) }),
  login:              (username, password) => req("/admin/login", { method:"POST", body:JSON.stringify({ username, password }) }),
  getSourcePersons:   ()        => req("/source-persons"),
  createSourcePerson: (data)    => req("/source-persons", { method:"POST", body:JSON.stringify(data) }),
  deleteSourcePerson: (id)      => req(`/source-persons/${id}`, { method:"DELETE" }),
  manualClockOut:     (emp_id, date, time) => req(`/attendance/${emp_id}/manual-clockout?date=${date}`, { method:"PUT", body:JSON.stringify({ log_out_time: time }) }),
  getReportCSVUrl:    (params={}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return `${BASE}/reports/csv${qs?"?"+qs:""}`;
  },
};