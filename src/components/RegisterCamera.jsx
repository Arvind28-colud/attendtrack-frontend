import { useEffect, useRef, useState, useCallback } from "react";
import { getEmbedding } from "../api/arcface";


/**
 * RegisterCamera — rectangle box, full picture, manual capture button.
 * Uses ArcFace API for face embedding.
 * Props:
 *   onCapture(embedding, imageDataUrl) — called after successful capture
 */
export default function RegisterCamera({ onCapture }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);

  const [state,    setState]    = useState("loading");
  const [message,  setMessage]  = useState("Starting camera...");
  const [preview,  setPreview]  = useState(null);
  const [capturing,setCapturing]= useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Single source of truth for camera start/stop tied directly to facingMode
  useEffect(() => {
    let active = true;
    const initCam = async () => {
      setState("loading");
      setMessage("Starting camera...");
      setPreview(null);

      // Stop any existing tracks before initializing new ones
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      let stream = null;
      try {
        // 1. Try strict facingMode constraint first for mobile switching
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: facingMode } }
        });
      } catch (e1) {
        console.warn("Exact facingMode failed, trying ideal:", e1.message);
        try {
          // 2. Fallback to ideal facingMode
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } }
          });
        } catch (e2) {
          console.warn("Ideal facingMode failed, trying generic fallback:", e2.message);
          try {
            // 3. Standard fallback
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (e3) {
            console.error("All camera initialization attempts failed:", e3.message);
            if (active) {
              setState("error");
              setMessage("Camera access denied. Please allow camera permission.");
            }
            return;
          }
        }
      }

      if (!active) {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
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
      setState("streaming");
      setMessage("Click Capture when ready");
    };

    initCam();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const handleCapture = async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true); setMessage("Getting ArcFace embedding...");

    try {
      // Snapshot from video
      const canvas = canvasRef.current;
      canvas.width  = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);

      // Get ArcFace embedding
      const embedding = await getEmbedding(imageDataUrl);

      // Face image will be saved locally by the backend
      let imageUrl = imageDataUrl;

      setPreview(imageDataUrl);
      setState("done"); setMessage("Face captured successfully!");
      stopCamera();
      onCapture(embedding, imageUrl);
    } catch (e) {
      setMessage("❌ " + e.message + " — Try again.");
      setCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturing(false);
    setFacingMode(f => f);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  return (
    <div style={{ width:"100%" }}>
      {/* Rectangle camera box */}
      <div style={{
        width:"100%", aspectRatio:"4/3", maxHeight:280,
        background:"var(--bg4)", borderRadius:"var(--r-lg)",
        border:"1px solid var(--border2)", overflow:"hidden",
        position:"relative", display:"flex", alignItems:"center", justifyContent:"center"
      }}>
        <video ref={videoRef} autoPlay muted playsInline
          style={{ width:"100%", height:"100%", objectFit:"cover",
            display: state === "streaming" ? "block" : "none" }} />

        {state === "streaming" && (
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

        {state === "done" && preview && (
          <img src={preview} alt="Captured"
            style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        )}
        {state === "loading" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <div className="face-spinner large"/>
            <span style={{ fontSize:12, color:"var(--text3)" }}>Starting camera...</span>
          </div>
        )}
        {state === "error" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"1rem" }}>
            <span style={{ fontSize:28 }}>⚠</span>
            <span style={{ fontSize:12, color:"var(--text3)", textAlign:"center" }}>{message}</span>
          </div>
        )}
        {state === "done" && (
          <div style={{
            position:"absolute", inset:0, background:"rgba(0,0,0,.4)",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:6
          }}>
            <div style={{ fontSize:52, color:"#fff" }}>✓</div>
            <div style={{ fontSize:13, color:"#fff", fontWeight:700 }}>Photo captured</div>
          </div>
        )}
        {/* Corner guides */}
        {state === "streaming" && (
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
            viewBox="0 0 400 300" preserveAspectRatio="none">
            <g stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none">
              <path d="M20,50 L20,20 L50,20"/><path d="M350,20 L380,20 L380,50"/>
              <path d="M20,250 L20,280 L50,280"/><path d="M350,280 L380,280 L380,250"/>
            </g>
          </svg>
        )}
        {/* Processing overlay */}
        {capturing && state === "streaming" && (
          <div style={{
            position:"absolute", inset:0, background:"rgba(0,0,0,.6)",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:10
          }}>
            <div className="face-spinner large" style={{ borderTopColor:"#fff" }}/>
            <span style={{ fontSize:12, color:"#aeaeb2" }}>Getting embedding...</span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display:"none" }} />

      {/* Status */}
      <div style={{ display:"flex", alignItems:"center", gap:6, margin:".5rem 0 .75rem", fontSize:12, color:"var(--text3)" }}>
        <div style={{
          width:7, height:7, borderRadius:"50%", flexShrink:0,
          background: state === "streaming" ? "var(--white)" : state === "done" ? "var(--white)" : "#555",
        }}/>
        {message}
      </div>

      {/* Buttons */}
      {state === "streaming" && (
        <button className="btn btn-primary full-width" onClick={handleCapture} disabled={capturing}>
          {capturing ? "Processing..." : "📷 Capture Photo"}
        </button>
      )}
      {state === "error" && (
        <button className="btn btn-primary full-width" onClick={handleRetake}>Retry Camera</button>
      )}
      {state === "done" && (
        <button className="btn full-width" onClick={handleRetake}>↺ Retake Photo</button>
      )}
    </div>
  );
}