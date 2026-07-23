import { useState } from "react";
import { api } from "../api/client";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      const res = await api.login(username, password);
      onLogin({ username: res.username });
    } catch(e) {
      setError(e.message || "Invalid username or password.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">◈ AttendTrack</div>
        <div className="login-sub">Admin login — sign in to continue</div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input placeholder="Username" value={username}
            onChange={e=>setUsername(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handle()} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={e=>setPassword(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handle()} />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary full-width" onClick={handle} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}