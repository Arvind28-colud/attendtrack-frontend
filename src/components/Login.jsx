import { useState } from "react";
const ADMIN = { username:"Aravind", password:"Aravind@123" };
export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const handle = () => {
    setError("");
    if (username===ADMIN.username && password===ADMIN.password) onLogin({ username });
    else setError("Invalid username or password.");
  };
  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">◈ AttendTrack</div>
        <div className="login-sub">Admin login — sign in to continue</div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input placeholder="Your username" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input type="password" placeholder="XXXXXXXX" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()} />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary full-width" onClick={handle}>Sign in</button>
        {/* <div className="login-hint">Default: admin / admin123</div> */}
      </div>
    </div>
  );
}