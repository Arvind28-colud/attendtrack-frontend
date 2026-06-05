import { useEffect, useRef, useState, useCallback } from "react";
import { useFaceApi } from "../api/faceApi";

/**
 * FaceCamera — rectangle box for Clock-in face verification.
 * Auto-scans every 1.2s to match face against known descriptors.
 * Props:
 *   knownFaces: [{id, full_name, face_descriptor}]
 *   onMatch(employee) — called when face matched
 *   disabled — stop scanning
 */
export default function FaceCamera({ knownFaces = [], onMatch, disabled = false }) {
  const { ready, error: modelError } = useFaceApi();
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const timerRef   = useRef(null);

  const [camState, setCamState] = useState("loading"); // loading | streaming | error | matched
  const [message,  setMessage]  = useState("Starting camera...");
  const [scanning, setScanning] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startCamera = useCallback(async () => {
    setCamState("loading"); setMessage("Starting camera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"user", width:{ ideal:1280 }, height:{ ideal:720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamState("streaming"); setMessage("Looking for face...");
    } catch {
      setCamState("error"); setMessage("Camera access denied. Please allow camera permission.");
    }
  }, []);

  useEffect(() => { if (ready) startCamera(); return () => stopCamera(); }, [ready]);

  // euclidean distance
  const dist = (a, b) => Math.sqrt(a.reduce((s,v,i) => s + (v - b[i]) ** 2, 0));

  // Auto-scan loop
  useEffect(() => {
    if (!ready || camState !== "streaming" || disabled) return;
    const faceapi = window.faceapi;
    if (!faceapi) return;

    timerRef.current = setInterval(async () => {
      if (scanning || !videoRef.current) return;
      setScanning(true);
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) { setMessage("No face detected — look at the camera"); setScanning(false); return; }

        const descriptor = Array.from(detection.descriptor);
        let best = null, bestDist = Infinity;
        for (const kf of knownFaces) {
          const fd = Array.isArray(kf.face_descriptor) ? kf.face_descriptor
            : typeof kf.face_descriptor === "string" ? JSON.parse(kf.face_descriptor) : null;
          if (!fd || fd.length !== 128) continue;
          const d = dist(descriptor, fd);
          if (d < bestDist) { bestDist = d; best = kf; }
        }

        if (best && bestDist < 0.5) {
          setCamState("matched");
          setMessage(`✓ Matched: ${best.full_name}`);
          stopCamera();
          onMatch && onMatch(best);
        } else {
          setMessage(knownFaces.length === 0 ? "No employees registered yet" : "Face not recognised — try again");
        }
      } catch { setMessage("Scan error — retrying..."); }
      setScanning(false);
    }, 1200);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ready, camState, disabled, knownFaces]);

  if (!ready && !modelError) return (
    <div className="face-loading"><div className="face-spinner"/><span>Loading face models...</span></div>
  );
  if (modelError) return <div className="alert alert-error">{modelError}</div>;

  return (
    <div style={{ width:"100%" }}>
      {/* Rectangle camera box — same style as RegisterCamera */}
      <div style={{
        width:"100%", aspectRatio:"4/3", maxHeight:280,
        background:"#000", borderRadius:"var(--r-lg)",
        border:"1px solid var(--border2)",
        overflow:"hidden", position:"relative",
        display:"flex", alignItems:"center", justifyContent:"center"
      }}>
        <video ref={videoRef} autoPlay muted playsInline
          style={{ width:"100%", height:"100%", objectFit:"cover",
            display: camState === "streaming" ? "block" : "none" }} />

        {camState === "loading" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <div className="face-spinner large"/>
            <span style={{ fontSize:12, color:"#888" }}>Starting camera...</span>
          </div>
        )}
        {camState === "error" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"1rem" }}>
            <span style={{ fontSize:28 }}>⚠</span>
            <span style={{ fontSize:12, color:"#888", textAlign:"center" }}>{message}</span>
          </div>
        )}
        {camState === "matched" && (
          <div style={{
            position:"absolute", inset:0, background:"rgba(0,0,0,.6)",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:8
          }}>
            <div style={{ fontSize:56, color:"#fff", lineHeight:1 }}>✓</div>
            <div style={{ fontSize:14, color:"#fff", fontWeight:700 }}>Face matched!</div>
          </div>
        )}

        {/* Corner brackets while streaming */}
        {camState === "streaming" && (
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
            viewBox="0 0 400 300" preserveAspectRatio="none">
            <g stroke="rgba(255,255,255,0.6)" strokeWidth="3" fill="none">
              <path d="M20,50 L20,20 L50,20"/>
              <path d="M350,20 L380,20 L380,50"/>
              <path d="M20,250 L20,280 L50,280"/>
              <path d="M350,280 L380,280 L380,250"/>
            </g>
          </svg>
        )}

        {/* Scan line animation */}
        {camState === "streaming" && (
          <div className="fc-scan-bar" style={{ top:"50%" }}/>
        )}
      </div>

      {/* Status */}
      <div style={{ display:"flex", alignItems:"center", gap:6, margin:".5rem 0 0", fontSize:12, color:"var(--text3)" }}>
        <div style={{
          width:7, height:7, borderRadius:"50%", flexShrink:0,
          background: camState === "streaming" ? "var(--white)" :
                      camState === "matched"   ? "var(--white)" : "#555",
          opacity: camState === "streaming" ? 1 : 0.6
        }}/>
        {message}
      </div>

      {camState === "error" && (
        <button className="btn full-width" style={{ marginTop:".5rem" }} onClick={startCamera}>Retry</button>
      )}
    </div>
  );
}
