import { useEffect, useRef, useState, useCallback } from "react";
import { getEmbedding } from "../api/arcface";
import { uploadImage } from "../api/cloudinary";

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

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = useCallback(async () => {
    setState("loading"); setMessage("Starting camera..."); setPreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"user", width:{ ideal:1280 }, height:{ ideal:720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("streaming"); setMessage("Click Capture when ready");
    } catch {
      setState("error"); setMessage("Camera access denied. Please allow camera permission.");
    }
  }, []);

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);

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

      // Upload face image to Cloudinary
      setMessage("Uploading photo to cloud...");
      let imageUrl = imageDataUrl; // fallback to base64 if upload fails
      try {
        imageUrl = await uploadImage(imageDataUrl, "attendtrack/faces");
      } catch(uploadErr) {
        console.warn("Cloudinary upload failed, using base64 fallback:", uploadErr.message);
      }

      setPreview(imageDataUrl);
      setState("done"); setMessage("Face captured successfully!");
      stopCamera();
      onCapture(embedding, imageUrl);
    } catch (e) {
      setMessage("❌ " + e.message + " — Try again.");
      setCapturing(false);
    }
  };

  const handleRetake = () => { setCapturing(false); startCamera(); };

  return (
    <div style={{ width:"100%" }}>
      {/* Rectangle camera box */}
      <div style={{
        width:"100%", aspectRatio:"4/3", maxHeight:280,
        background:"#000", borderRadius:"var(--r-lg)",
        border:"1px solid var(--border2)", overflow:"hidden",
        position:"relative", display:"flex", alignItems:"center", justifyContent:"center"
      }}>
        <video ref={videoRef} autoPlay muted playsInline
          style={{ width:"100%", height:"100%", objectFit:"cover",
            display: state === "streaming" ? "block" : "none" }} />

        {state === "done" && preview && (
          <img src={preview} alt="Captured"
            style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        )}
        {state === "loading" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <div className="face-spinner large"/>
            <span style={{ fontSize:12, color:"#888" }}>Starting camera...</span>
          </div>
        )}
        {state === "error" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"1rem" }}>
            <span style={{ fontSize:28 }}>⚠</span>
            <span style={{ fontSize:12, color:"#888", textAlign:"center" }}>{message}</span>
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
            <span style={{ fontSize:12, color:"#ccc" }}>Getting embedding...</span>
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
        <button className="btn btn-primary full-width" onClick={startCamera}>Retry Camera</button>
      )}
      {state === "done" && (
        <button className="btn full-width" onClick={handleRetake}>↺ Retake Photo</button>
      )}
    </div>
  );
}
