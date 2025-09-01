import { useEffect, useState, useRef } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import { toast } from "react-toastify";

export default function ReceiveSection({ currentUser, setMe }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCard, setShowCard] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/receive", {
          withCredentials: true,
        });
        setItems(res.data);
      } catch (err) {
        console.error("Failed to fetch receive items", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading...</p>;

  // 🎤 Voice search
  function handleVoiceSearch() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      setSearch(event.results[0][0].transcript);
    };
    recognition.start();
  }

  async function handleClaim(id) {
    try {
      await axios.post(
        `http://localhost:4000/api/receive/claim/${id}`,
        {},
        { withCredentials: true }
      );

      setItems(items.filter((item) => item.id !== id));
      setShowCard(true);

      // ✅ Deduct 10 points for claimer
      if (setMe) {
        setMe((prev) => ({ ...prev, points: prev.points - 10 }));
      }
      toast.info("📉 10 points deducted for claiming");
    } catch (err) {
      toast.error("⚠️ Could not claim item");
    }
  }

  // 📸 Download card as image
  async function downloadCard() {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current);
    const link = document.createElement("a");
    link.download = "greenmind-thankyou.png";
    link.href = canvas.toDataURL();
    link.click();
  }

  // Filter items
  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "relative" }}>
      <h2>📥 Receive Items</h2>

      {/* Overlay Thank You Card */}
      {showCard && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            ref={cardRef}
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "16px",
              textAlign: "center",
              maxWidth: "500px",
              width: "90%",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowCard(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                border: "none",
                background: "transparent",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              ✖
            </button>

            <h2 style={{ color: "#2e7d32" }}>🌳 GreenMindAI</h2>
            <h3 style={{ margin: "5px 0", color: "#388e3c" }}>Thank You!</h3>
            <p style={{ fontSize: "1rem", color: "#444" }}>
              You’ve successfully claimed an item. Together, we’re reducing waste
              and reusing resources responsibly.
            </p>

            <button
              className="btn primary"
              style={{ marginTop: "20px" }}
              onClick={downloadCard}
            >
              ⬇️ Download Card
            </button>
          </div>
        </div>
      )}

      {/* Search controls */}
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px", borderRadius: "6px" }}
        />
        <button className="btn" onClick={handleVoiceSearch}>
          🎤
        </button>
      </div>

      {/* Items grid */}
      <div
        className="cards-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {filtered.map((item) => (
          <div key={item.id} className="card glass">
            <img
              src={`http://localhost:4000${item.imageUrl}`}
              alt={item.title}
              style={{
                width: "100%",
                maxHeight: "200px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <p><strong>Category:</strong> {item.category}</p>
            <p><strong>Quality:</strong> {item.quality || "Good"}</p>
            <span className="badge">By {item.uploader_name}</span>
            <button
              className="btn primary"
              onClick={() => handleClaim(item.id)}
              style={{ marginTop: "8px" }}
            >
              Claim
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p>No items match your search.</p>}
      </div>
    </div>
  );
}
