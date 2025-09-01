import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

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
      const res = await axios.post("http://localhost:4000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      setResult(res.data);

      // ✅ Add 10 points
      if (setMe) {
        setMe((prev) => ({ ...prev, points: prev.points + 10 }));
      }
      toast.success("🎉 Upload successful! You earned +10 points");
    } catch (err) {
      console.error(err);
      setError("Upload failed");
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
    <div className="glass" style={{ padding: 20, maxWidth: 1000, margin: "auto" }}>
      <h2>📤 Smart Upload</h2>
      <p>Drop an image to auto-categorize and pre-fill details.</p>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "20px",
          marginTop: 20,
          flexWrap: "wrap",
        }}
      >
        {/* Image Container */}
        <div style={{ flex: "1 1 300px", position: "relative" }}>
          {preview && (
            <>
              <img
                src={preview}
                alt="preview"
                style={{
                  width: "100%",
                  maxHeight: "300px",
                  objectFit: "contain",
                  borderRadius: 10,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                }}
              />
              {result && (
                <span
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    background: "green",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  ✅ Uploaded
                </span>
              )}
            </>
          )}

          {/* Upload form appears only if not uploaded yet */}
          {!result && (
            <form onSubmit={handleUpload} style={{ marginTop: 16 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setFile(file);
                    setPreview(URL.createObjectURL(file));
                    setResult(null);
                  }
                }}
              />
              <button
                className="btn primary"
                style={{ marginTop: 16 }}
                disabled={uploading || !file}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </form>
          )}
        </div>

        {/* Auto-filled Details Container */}
        {result && (
          <div
            style={{
              flex: "1 1 300px",
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 10,
              background: "#fafafa",
            }}
          >
            <h3>🧠 Auto-filled Details (Mock)</h3>
            <p><strong>API Used:</strong> OpenAI Vision API</p>
            <p><strong>Quality:</strong> Good</p>
            <p><strong>Title:</strong> {result.title}</p>
            <p><strong>Category:</strong> {result.category}</p>
            <p><strong>Description:</strong> {result.description}</p>
            <p><strong>Saved As:</strong> {result.imageUrl}</p>

            <button
              className="btn primary"
              style={{ marginTop: 20 }}
              onClick={handleUploadMore}
            >
              Upload More Items
            </button>
          </div>
        )}
      </div>

      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
    </div>
  );
}
