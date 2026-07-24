import { useEffect, useRef, useState, useCallback } from "react";
import { getEmbedding, cosineSimilarity } from "../api/arcface";

/**
 * FaceCamera — rectangle box for Clock-in face verification.
 * Capture button → snaps photo → matches against known embeddings.
 */
export default function FaceCamera({ knownFaces = [], onMatch, onFail, disabled = false }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Keep latest props in refs to avoid stale closure issues
  const knownFacesRef = useRef(knownFaces);
  const onMatchRef    = useRef(onMatch);
  const onFailRef     = useRef(onFail);
  useEffect(() => { knownFacesRef.current = knownFaces; }, [knownFaces]);
  useEffect(() => { onMatchRef.current = onMatch; }, [onMatch]);
  useEffect(() => { onFailRef.current = onFail; }, [onFail]);

  const [camState, setCamState] = useState("loading");
  const [message,  setMessage]  = useState("Starting camera...");
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  // Combined stop camera helper
  const stopCamera = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Single source of truth for camera start/stop tied directly to facingMode
  useEffect(() => {
    let active = true;
    const initCam = async () => {
      setCamState("loading");
      setMessage("Starting camera...");

      // Stop any existing tracks & clear video element before initializing new ones
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      let stream = null;
      let lastErr = null;

      // 1. Try flexible constraints first (ideal facingMode)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (e1) {
        lastErr = e1;
        console.warn("Ideal facingMode failed, trying generic video=true:", e1.message);
        try {
          // 2. Fallback to generic video=true
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e2) {
          lastErr = e2;
          console.warn("Generic video=true failed, trying exact facingMode:", e2.message);
          try {
            // 3. Fallback to exact facingMode (for specific mobile devices)
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { exact: facingMode } }
            });
          } catch (e3) {
            lastErr = e3;
            console.error("All camera initialization attempts failed:", e3);
          }
        }
      }

      if (!stream) {
        if (active) {
          setCamState("error");
          let errText = "Camera access failed.";
          if (lastErr) {
            if (lastErr.name === "NotReadableError" || lastErr.name === "TrackStartError") {
              errText = "Camera is being used by another application (Zoom, Teams, or another browser tab). Please close other camera apps and retry.";
            } else if (lastErr.name === "NotAllowedError" || lastErr.name === "PermissionDeniedError") {
              errText = "Camera access denied. Please click the camera/lock icon in your browser address bar and select 'Allow'.";
            } else if (lastErr.name === "NotFoundError" || lastErr.name === "DevicesNotFoundError") {
              errText = "No camera hardware detected on this device.";
            } else {
              errText = `Camera Error (${lastErr.name}): ${lastErr.message}`;
            }
          }
          setMessage(errText);
        }
        return;
      }

      if (!active) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (err) {
          console.error("Video play error:", err);
        }
      }
      setCamState("streaming");
      setMessage("Position face and click Mark Attendance");
    };

    initCam();

    return () => {
      active = false;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

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
      for (const kf of knownFacesRef.current) {
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
        onMatchRef.current && onMatchRef.current(best);
      } else {
        const scoreText = bestScore > 0 ? `(Match: ${(bestScore * 100).toFixed(0)}%, required: 40%)` : "";
        const failMsg = `Face not recognised. ${scoreText} Please try again.`;
        setMessage(`❌ ${failMsg}`);
        setCapturing(false);
        onFailRef.current && onFailRef.current(failMsg);
      }
    } catch(e) {
      const errMsg = `Verification failed: ${e.message}`;
      setMessage("❌ " + errMsg);
      setCapturing(false);
      onFailRef.current && onFailRef.current(errMsg);
    }
  };

  return (
    <div style={{ width:"100%" }}>
      <div style={{
        width:"100%", aspectRatio:"4/3", maxHeight:280,
        background:"var(--bg4)", borderRadius:"var(--r-lg)",
        border:"1px solid var(--border2)", overflow:"hidden",
        position:"relative", display:"flex", alignItems:"center", justifyContent:"center"
      }}>
        <video ref={videoRef} autoPlay muted playsInline
          style={{ width:"100%", height:"100%", objectFit:"cover",
            display: camState === "streaming" ? "block" : "none" }} />

        {camState === "streaming" && (
          <button
            onClick={switchCamera}
            style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(11, 13, 17, 0.75)", backdropFilter: "blur(4px)",
              border: "1px solid var(--border3)", borderRadius: "var(--r)",
              color: "var(--text)", fontSize: 11, padding: "5px 10px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              zIndex: 10
            }}
          >
            🔄 Switch Camera
          </button>
        )}

        {camState === "loading" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <div className="face-spinner large"/>
            <span style={{ fontSize:12, color:"var(--text3)" }}>Starting camera...</span>
          </div>
        )}
        {camState === "error" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"1rem" }}>
            <span style={{ fontSize:28 }}>⚠</span>
            <span style={{ fontSize:12, color:"var(--text3)", textAlign:"center" }}>{message}</span>
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
            <span style={{ fontSize:12, color:"#aeaeb2" }}>Verifying with ArcFace...</span>
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
          {capturing ? "Verifying..." : "📷 Mark Attendance"}
        </button>
      )}
      {camState === "error" && (
        <button className="btn btn-primary full-width" onClick={() => setFacingMode(f => f)}>Retry Camera</button>
      )}
    </div>
  );
}
