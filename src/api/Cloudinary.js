const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dvzmxzmls";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "kz3ryrwt";

/**
 * Upload a base64 image to Cloudinary, returns secure_url
 */
export async function uploadImage(base64, folder = "attendtrack/faces") {
  const formData = new FormData();
  // Ensure data URI prefix
  const dataUri = base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`;
  formData.append("file", dataUri);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Cloudinary image upload failed");
  }
  const data = await res.json();
  return data.secure_url;
}

/**
 * Upload a base64 PDF to Cloudinary, returns secure_url
 */
export async function uploadPdf(base64, filename = "aadhaar") {
  const formData = new FormData();
  const dataUri = base64.startsWith("data:") ? base64 : `data:application/pdf;base64,${base64}`;
  formData.append("file", dataUri);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "attendtrack/aadhaar");
  formData.append("resource_type", "raw");
  formData.append("public_id", filename);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Cloudinary PDF upload failed");
  }
  const data = await res.json();
  return data.secure_url;
}