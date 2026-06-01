import { useState, useEffect } from "react";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

let modelsLoaded = false;
let loadingPromise = null;

export function useFaceApi() {
  const [ready, setReady] = useState(modelsLoaded);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (modelsLoaded) { setReady(true); return; }
    if (!loadingPromise) {
      loadingPromise = (async () => {
        const faceapi = window.faceapi;
        if (!faceapi) throw new Error("face-api.js not loaded. Check index.html script tag.");
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        modelsLoaded = true;
      })();
    }
    loadingPromise
      .then(() => setReady(true))
      .catch((e) => { setError(e.message); loadingPromise = null; });
  }, []);

  return { ready, error };
}

export async function captureDescriptor(videoEl) {
  const faceapi = window.faceapi;
  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;
  return Array.from(detection.descriptor);
}

export function findBestMatch(queryDescriptor, knownFaces, threshold = 0.5) {
  const faceapi = window.faceapi;
  const query = new Float32Array(queryDescriptor);
  let best = null;
  let bestDist = Infinity;
  for (const known of knownFaces) {
    const dist = faceapi.euclideanDistance(query, new Float32Array(known.face_descriptor));
    if (dist < bestDist) { bestDist = dist; best = known; }
  }
  if (bestDist <= threshold) return { ...best, distance: bestDist };
  return null;
}