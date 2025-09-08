import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import API_BASE from "../api";
export default function UploadSection({ setMe }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      setUploading(true);
      setError("");
      const res = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      // 🚫 Reject if AI says Low quality
      if (res.data.quality && res.data.quality.toLowerCase() === "low") {
        setResult(null);
        setFile(null);
        setPreview(null);
        toast.error("⚠️ Upload rejected: Low-quality or invalid image.");
        return;
      }

      setResult(res.data);
      if (setMe) setMe((prev) => ({ ...prev, points: (prev.points || 0) + 10 }));
      toast.success("🎉 Uploaded & analyzed with AI! You earned +10 points");
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || "Upload failed");
      toast.error("⚠️ Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleUploadMore() {
    setResult(null);
    setFile(null);
    setPreview(null);
    setError("");
  }

  return (
    <div className="glass upload-section" style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h2>📤 Smart Upload (AI-powered)</h2>
      <p>Upload an item image. AI will extract text, check quality, and auto-fill details.</p>

      {/* MAIN FLEX WRAPPER */}
      <div
        className="upload-flex"
        style={{
          display: "flex",
          gap: 24,
          marginTop: 20,
          flexWrap: "nowrap", // keep side-by-side on desktop
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: File / Preview */}
        <div
          className="upload-left"
          style={{
            flex: "0 0 280px", // smaller fixed column for media on desktop
            maxWidth: "35%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Drop zone (only when not previewing) */}
          {!preview && !result && (
            <div
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: 12,
                background: "#fff",
                padding: 16,
                flexGrow: 1,
              }}
            >
              <form onSubmit={handleUpload}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setFile(f);
                      setPreview(
                        f.type === "application/pdf"
                          ? "/pdf-preview.png"
                          : URL.createObjectURL(f)
                      );
                      setResult(null);
                    }
                  }}
                />
                <button
                  className="btn primary"
                  style={{ marginTop: 12 }}
                  disabled={uploading || !file}
                >
                  {uploading ? "Uploading…" : "Upload & Analyze"}
                </button>
              </form>
            </div>
          )}

          {/* Compact media box (same height as right panel) */}
          {preview && (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#fff",
                padding: 8,
                position: "relative",
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Badge */}
              {result && (
                <span
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    background: "#10b981",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  ✅ Uploaded
                </span>
              )}

              {/* Remove (only before upload) */}
              {!result && (
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="btn danger"
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    padding: "6px 10px",
                  }}
                >
                  ✖ Remove
                </button>
              )}

              {/* Image preview */}
              <div
                style={{
                  flexGrow: 1,
                  borderRadius: 10,
                  background: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src={preview}
                  alt="preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 360, // limit height so it doesn't dominate layout
                    objectFit: "contain",
                  }}
                />
              </div>

              {/* Upload button under image */}
              {!result && (
                <form onSubmit={handleUpload} style={{ marginTop: 12 }}>
                  <button
                    className="btn primary"
                    disabled={uploading || !file}
                    style={{ width: "100%" }}
                  >
                    {uploading ? "Uploading…" : "Upload & Analyze"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: AI Details */}
        {result && (
          <div
            className="upload-right"
            style={{
              flex: "1 1 420px",
              padding: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ marginTop: 0 }}>🧠 AI Details</h3>
              <p><strong>Quality:</strong> {result.quality || "—"}</p>
              <p><strong>Title:</strong> {result.title}</p>
              <p><strong>Category:</strong> {result.category}</p>
              <p style={{ marginBottom: 6 }}><strong>Description:</strong> {result.description}</p>
              <p><strong>Saved ID:</strong> {result.id}</p>
              <p><strong>File:</strong> {result.imageUrl}</p>
            </div>

            <button className="btn primary" style={{ marginTop: 16 }} onClick={handleUploadMore}>
              Upload More Items
            </button>
          </div>
        )}
      </div>

      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}

      {/* Responsive style: stack on small screens */}
      <style>
        {`
          /* Stack panels vertically on mobile */
          @media (max-width: 768px) {
            .upload-flex {
              flex-direction: column !important;
              gap: 14px !important;
            }
            .upload-left {
              flex: 1 1 auto !important;
              max-width: 100% !important;
            }
            .upload-right {
              flex: 1 1 auto !important;
              max-width: 100% !important;
            }
            /* limit preview image height on small screens too */
            .upload-left img {
              max-height: 260px !important;
            }
          }
        `}
      </style>
    </div>
  );
}
