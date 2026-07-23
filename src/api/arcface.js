const BASE = import.meta.env.VITE_API_URL || (window.location.port === "5173" ? "http://localhost:8000" : window.location.origin);
const ARCFACE_URL = `${BASE}`;
console.log("ArcFace initialized with base URL:", ARCFACE_URL);

/**
 * Get 512-d ArcFace embedding from a base64 image string.
 * Tries /embed first (FastAPI style), falls back to /get_embedding.
 */
export async function getEmbedding(base64Image) {
  // Strip data URL prefix if present
  const b64 = base64Image.startsWith("data:")
    ? base64Image.split(",")[1]
    : base64Image;

  const res = await fetch(`${ARCFACE_URL}/get-embedding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: b64 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `ArcFace error: ${res.status}`);
  }

  const data = await res.json();
  // Handle { embedding: [...] }, { embeddings: [...] }, or bare array
  const emb = data.embedding ?? data.embeddings ?? data;
  if (!Array.isArray(emb) || emb.length === 0) {
    throw new Error("No face detected or invalid response from ArcFace API");
  }
  return emb; // 512-d float array
}

/**
 * Cosine similarity between two 512-d vectors.
 * Returns value between -1 and 1. Threshold ~0.4 for same person.
 */
export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Returns true if two embeddings belong to the same person.
 * Threshold: cosine similarity >= 0.4
 */
export function isSamePerson(embA, embB, threshold = 0.4) {
  return cosineSimilarity(embA, embB) >= threshold;
}