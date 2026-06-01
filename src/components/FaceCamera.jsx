import { useEffect, useRef, useState, useCallback } from "react";

export default function FaceCamera({ onCapture, showRetake = true, autoCapture = true }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const loopRef     = useRef(null);
  const capturedRef = useRef(false);
  const attemptRef  = useRef(0);

  const [state,   setState]   = useState("loading");
  const [message, setMessage] = useState("Starting camera...");
  const [dots,    setDots]    = useState(0);

  useEffect(()=>{
    if (state!=="streaming") return;
    const id = setInterval(()=>setDots(d=>(d+1)%4), 500);
    return ()=>clearInterval(id);
  },[state]);

  const stopLoop = () => {
    if (loopRef.current){ clearInterval(loopRef.current); loopRef.current=null; }
  };

  const stopCamera = () => {
    stopLoop();
    if (streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
  };

  const startAutoScan = useCallback(()=>{
    if (!autoCapture) return;
    capturedRef.current = false;
    attemptRef.current  = 0;

    loopRef.current = setInterval(async()=>{
      if (!videoRef.current || capturedRef.current) return;
      const faceapi = window.faceapi;
      if (!faceapi) return;

      // Make sure video is actually playing
      if (videoRef.current.readyState < 2) return;

      attemptRef.current++;
      try {
        // Lower confidence threshold to 0.3 for better detection
        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3, maxResults: 1 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          // After 30 attempts (~18s) hint to move closer
          if (attemptRef.current > 30) {
            setMessage("No face detected — move closer and ensure good lighting");
          } else {
            setMessage("Position your face inside the oval" + ".".repeat(dots+1));
          }
          return;
        }

        if (capturedRef.current) return;
        capturedRef.current = true;
        stopLoop();
        setState("capturing");
        setMessage("Face detected! Capturing...");

        await new Promise(r=>setTimeout(r,500));

        const descriptor = Array.from(detection.descriptor);
        setState("done");
        setMessage("Face captured successfully!");
        stopCamera();
        onCapture(descriptor);
      } catch(e) {
        // single frame error, continue
      }
    }, 700);
  },[autoCapture, onCapture, dots]);

  const startCamera = useCallback(async()=>{
    capturedRef.current = false;
    setState("loading");
    setMessage("Starting camera...");
    stopLoop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode:"user",
          width:{ ideal:1280 },
          height:{ ideal:720 },
        }
      });
      streamRef.current = stream;
      if (videoRef.current){
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(()=>{
            setState("streaming");
            setMessage("Position your face inside the oval...");
            // Small delay to let video stabilize before scanning
            setTimeout(()=>startAutoScan(), 1000);
          });
        };
      }
    } catch {
      setState("error");
      setMessage("Camera access denied. Please allow camera permission.");
    }
  },[startAutoScan]);

  useEffect(()=>{ startCamera(); return ()=>stopCamera(); },[]);

  const handleRetake = () => { setState("loading"); setMessage("Restarting..."); startCamera(); };

  const isActive = state==="streaming"||state==="capturing";

  return (
    <div className="fc-wrap">
      <div className={`fc-stage ${state}`}>
        <video
          ref={videoRef}
          className="fc-video"
          autoPlay muted playsInline
          style={{display: state==="done"||state==="loading"||state==="error"?"none":"block"}}
        />

        {isActive && (
          <svg className="fc-oval-svg" viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="om">
                <rect width="400" height="320" fill="white"/>
                <ellipse cx="200" cy="155" rx="130" ry="155" fill="black"/>
              </mask>
            </defs>
            <rect width="400" height="320" fill="rgba(0,0,0,0.5)" mask="url(#om)"/>
            <ellipse cx="200" cy="155" rx="130" ry="155"
              fill="none"
              stroke={state==="capturing"?"#22c55e":"rgba(255,255,255,0.85)"}
              strokeWidth={state==="capturing"?"3":"2"}
              strokeDasharray={state==="streaming"?"10 4":"none"}
            />
          </svg>
        )}

        {state==="capturing" && <div className="fc-scan-bar"/>}

        {state==="loading" && (
          <div className="fc-overlay-center">
            <div className="face-spinner large"/>
            <span>{message}</span>
          </div>
        )}

        {state==="done" && (
          <div className="fc-done-box">
            <div className="fc-done-check">✓</div>
            <div className="fc-done-text">Face Captured!</div>
          </div>
        )}

        {state==="error" && (
          <div className="fc-overlay-center" style={{color:"#fca5a5"}}>
            <div style={{fontSize:36}}>⚠</div>
            <span>{message}</span>
          </div>
        )}
      </div>

      {(state==="streaming"||state==="capturing") && (
        <div className="fc-status">
          <div className={`fc-status-dot ${state==="capturing"?"green":"pulse"}`}/>
          <span>{state==="capturing"?"Capturing...":message}</span>
        </div>
      )}

      <div className="face-btn-row" style={{marginTop:".75rem"}}>
        {state==="error" && (
          <button className="btn btn-primary" onClick={startCamera}>Retry Camera</button>
        )}
        {state==="done" && showRetake && (
          <button className="btn" onClick={handleRetake}>↺ Retake</button>
        )}
      </div>
    </div>
  );
}
