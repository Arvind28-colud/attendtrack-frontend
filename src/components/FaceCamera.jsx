import { useEffect, useRef, useState, useCallback } from "react";
import { getEmbedding, cosineSimilarity } from "../api/arcface";

/**
 * FaceCamera — rectangle box for Clock-in face verification.
 * Capture button → sends to ArcFace API → matches against known embeddings.
 * Props:
 *   knownFaces: [{id, full_name, face_descriptor}]  (512-d ArcFace embeddings)
 *   onMatch(employee) — called when face matched
 *   disabled — disable capture
 */
export default function FaceCamera({ knownFaces = [], onMatch, disabled = false }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [camState, setCamState] = useState("loading");
  const [message,  setMessage]  = useState("Starting camera...");
  const [capturing,setCapturing]= useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = useCallback(async () => {
    setCamState("loading"); setMessage("Starting camera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"user", width:{ ideal:1280 }, height:{ ideal:720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamState("streaming"); setMessage("Position face and press Capture");
    } catch {
      setCamState("error"); setMessage("Camera access denied. Please allow camera permission.");
    }
  }, []);

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);

  const handleCapture = async () => {
    if (capturing || disabled || !videoRef.current) return;
    setCapturing(true); setMessage("Verifying face...");

    try {
      // Snapshot
      const canvas = canvasRef.current;
      canvas.width  = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);

      // ArcFace embedding
      const embedding = await getEmbedding(imageDataUrl);

      // Match against all known faces
      let best = null, bestScore = -1;
      for (const kf of knownFaces) {
        const fd = Array.isArray(kf.face_descriptor)
          ? kf.face_descriptor
          : typeof kf.face_descriptor === "string"
            ? JSON.parse(kf.face_descriptor)
            : null;
        if (!fd || fd.length === 0) continue;
        const score = cosineSimilarity(embedding, fd);
        if (score > bestScore) { bestScore = score; best = kf; }
      }

      const THRESHOLD = 0.4;
      if (best && bestScore >= THRESHOLD) {
        setCamState("matched");
        setMessage(`✓ Matched: ${best.full_name} (${(bestScore * 100).toFixed(0)}%)`);
        stopCamera();
        onMatch && onMatch(best);
      } else {
        setMessage(`❌ Face not recognised (score: ${bestScore > 0 ? (bestScore*100).toFixed(0) : 0}%). Try again.`);
        setCapturing(false);
      }
    } catch(e) {
      setMessage("❌ " + e.message);
      setCapturing(false);
    }
  };

  return (
    <div style={{ width:"100%" }}>
      <div style={{
        width:"100%", aspectRatio:"4/3", maxHeight:280,
        background:"#000", borderRadius:"var(--r-lg)",
        border:"1px solid var(--border2)", overflow:"hidden",
        position:"relative", display:"flex", alignItems:"center", justifyContent:"center"
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
            <div style={{ fontSize:56, color:"#fff" }}>✓</div>
            <div style={{ fontSize:14, color:"#fff", fontWeight:700 }}>Face Matched!</div>
          </div>
        )}
        {/* Corner brackets */}
        {camState === "streaming" && (
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
            viewBox="0 0 400 300" preserveAspectRatio="none">
            <g stroke="rgba(255,255,255,0.6)" strokeWidth="3" fill="none">
              <path d="M20,50 L20,20 L50,20"/><path d="M350,20 L380,20 L380,50"/>
              <path d="M20,250 L20,280 L50,280"/><path d="M350,280 L380,280 L380,250"/>
            </g>
          </svg>
        )}
        {/* Processing overlay */}
        {capturing && camState === "streaming" && (
          <div style={{
            position:"absolute", inset:0, background:"rgba(0,0,0,.65)",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:10
          }}>
            <div className="face-spinner large" style={{ borderTopColor:"#fff" }}/>
            <span style={{ fontSize:12, color:"#ccc" }}>Verifying with ArcFace...</span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display:"none" }} />

      {/* Status */}
      <div style={{ display:"flex", alignItems:"center", gap:6, margin:".5rem 0 .75rem", fontSize:12, color:"var(--text3)" }}>
        <div style={{
          width:7, height:7, borderRadius:"50%", flexShrink:0,
          background: camState === "matched" ? "var(--white)" : camState === "streaming" ? "var(--white)" : "#555",
          opacity: camState === "streaming" ? 1 : 0.6
        }}/>
        {message}
      </div>

      {camState === "streaming" && (
        <button className="btn btn-primary full-width" onClick={handleCapture} disabled={capturing || disabled}>
          {capturing ? "Verifying..." : "📷 Capture & Verify"}
        </button>
      )}
      {camState === "error" && (
        <button className="btn btn-primary full-width" onClick={startCamera}>Retry Camera</button>
      )}
    </div>
  );
}