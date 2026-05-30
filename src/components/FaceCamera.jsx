import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Props:
 *   onCapture(descriptor)  — called once auto-capture succeeds
 *   showRetake             — show retake button after capture
 *   autoCapture            — default true: continuously scans until face found
 */
export default function FaceCamera({ onCapture, showRetake = true, autoCapture = true }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const loopRef    = useRef(null);   // setInterval id for auto-scan loop
  const capturedRef = useRef(false); // prevent double-fire

  const [state,   setState]   = useState("loading");   // loading | streaming | capturing | done | error
  const [message, setMessage] = useState("Starting camera...");
  const [dots,    setDots]    = useState(0);           // animated dots

  // Animated dots while scanning
  useEffect(() => {
    if (state !== "streaming") return;
    const id = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, [state]);

  const stopLoop = () => {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
  };

  const stopCamera = () => {
    stopLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // Auto-scan: try to detect a face every 600ms
  const startAutoScan = useCallback(() => {
    if (!autoCapture) return;
    capturedRef.current = false;
    loopRef.current = setInterval(async () => {
      if (!videoRef.current || capturedRef.current) return;
      const faceapi = window.faceapi;
      if (!faceapi) return;
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setMessage("Position your face inside the oval" + ".".repeat(dots));
          return;
        }

        // Face found — capture it
        if (capturedRef.current) return;
        capturedRef.current = true;
        stopLoop();
        setState("capturing");
        setMessage("Face detected! Capturing...");

        // Small delay for UX feedback
        await new Promise(r => setTimeout(r, 600));

        const descriptor = Array.from(detection.descriptor);
        setState("done");
        setMessage("Face captured successfully!");
        stopCamera();
        onCapture(descriptor);
      } catch { /* ignore single-frame errors */ }
    }, 600);
  }, [autoCapture, onCapture]);

  const startCamera = useCallback(async () => {
    capturedRef.current = false;
    setState("loading");
    setMessage("Starting camera...");
    stopLoop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("streaming");
      setMessage("Position your face inside the oval...");
      startAutoScan();
    } catch {
      setState("error");
      setMessage("Camera access denied. Please allow camera permission and retry.");
    }
  }, [startAutoScan]);

  const handleRetake = () => {
    setState("loading");
    setMessage("Restarting camera...");
    startCamera();
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const isActive = state === "streaming" || state === "capturing";

  return (
    <div className="fc-wrap">
      {/* Video / done overlay */}
      <div className={`fc-stage ${state}`}>
        {/* Video always mounted so stream attaches; hidden when done */}
        <video
          ref={videoRef}
          className="fc-video"
          autoPlay muted playsInline
          style={{ display: state === "done" || state === "loading" || state === "error" ? "none" : "block" }}
        />

        {/* Oval guide overlay */}
        {isActive && (
          <svg className="fc-oval-svg" viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
            {/* Dark mask with oval cut-out */}
            <defs>
              <mask id="ovalMask">
                <rect width="400" height="320" fill="white"/>
                <ellipse cx="200" cy="155" rx="130" ry="155" fill="black"/>
              </mask>
            </defs>
            <rect width="400" height="320" fill="rgba(0,0,0,0.45)" mask="url(#ovalMask)"/>
            {/* Oval border */}
            <ellipse cx="200" cy="155" rx="130" ry="155"
              fill="none"
              stroke={state === "capturing" ? "#22c55e" : "rgba(255,255,255,0.85)"}
              strokeWidth={state === "capturing" ? "3" : "2"}
              strokeDasharray={state === "streaming" ? "10 4" : "none"}
            />
            {/* Corner tick marks */}
            <line x1="200" y1="0"   x2="200" y2="12"  stroke="white" strokeWidth="2" opacity="0.5"/>
            <line x1="200" y1="298" x2="200" y2="310" stroke="white" strokeWidth="2" opacity="0.5"/>
            <line x1="70"  y1="155" x2="82"  y2="155" stroke="white" strokeWidth="2" opacity="0.5"/>
            <line x1="318" y1="155" x2="330" y2="155" stroke="white" strokeWidth="2" opacity="0.5"/>
          </svg>
        )}

        {/* Scanning animation bar */}
        {state === "capturing" && <div className="fc-scan-bar"/>}

        {/* Loading state */}
        {state === "loading" && (
          <div className="fc-overlay-center">
            <div className="face-spinner large"/>
            <span>{message}</span>
          </div>
        )}

        {/* Done state */}
        {state === "done" && (
          <div className="fc-done-box">
            <div className="fc-done-check">✓</div>
            <div className="fc-done-text">Face Captured!</div>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="fc-overlay-center fc-error-box">
            <div style={{ fontSize: 36 }}>⚠</div>
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Status message */}
      {(state === "streaming" || state === "capturing") && (
        <div className="fc-status">
          <div className={`fc-status-dot ${state === "capturing" ? "green" : "pulse"}`}/>
          <span>{state === "capturing" ? "Capturing..." : ("Scanning for face" + ".".repeat(dots + 1))}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="face-btn-row" style={{ marginTop: "0.75rem" }}>
        {state === "error" && (
          <button className="btn btn-primary" onClick={startCamera}>Retry Camera</button>
        )}
        {state === "done" && showRetake && (
          <button className="btn" onClick={handleRetake}>↺ Retake</button>
        )}
      </div>
    </div>
  );
}