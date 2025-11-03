import { useEffect, useState } from "react";
import { API_BASE } from "../api";
import axios from "axios";
import { toast } from "react-toastify";
import "./ReceiveSection.css";



const PLACEHOLDER_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="100%" height="100%" fill="#f8fafc"/><g fill="#cbd5e1" font-family="Arial,Helvetica,sans-serif" font-size="18"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">No image</text></g></svg>`
  );

export default function ReceiveSection({ setMe }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Request form state
  const [reqTitle, setReqTitle] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqCategory, setReqCategory] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/receive`, {
          withCredentials: true,
        });
        setItems(res.data || []);
      } catch (err) {
        console.error("Failed to fetch receive items", err);
        toast.error("Could not load items");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // claim and then show simple success toast
 async function handleClaim(item) {
  try {
    const { data } = await axios.post(
      `${API_BASE}/api/receive/claim/${item.id}`,
      {},
      { withCredentials: true }
    );

    // remove from UI + deduct points
    setItems(prev => prev.filter(x => x.id !== item.id));
    if (setMe) setMe(p => ({ ...p, points: (p.points || 0) - 10 }));

    // ✅ show simple thank-you (no PDF, no extra calls)
    toast.success(data?.message || "Thank you for choosing us! We’ve received your order.");
  } catch (err) {
    console.error("Claim failed", err);
    toast.error("⚠️ Could not claim item");
  }
}


  // handle request submit
  async function handleRequest(e) {
    e?.preventDefault();
    if (!reqTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    try {
      await axios.post(
        `${API_BASE}/api/request`,
        { title: reqTitle.trim(), description: reqDesc.trim(), category: reqCategory.trim() },
        { withCredentials: true }
      );
      toast.success("✅ Request submitted!");
      setReqTitle("");
      setReqDesc("");
      setReqCategory("");
    } catch (err) {
      console.error("Request submit failed", err);
      toast.error("Could not submit request");
    }
  }

  if (loading) return <p>Loading…</p>;

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.title || "").toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="receive-container">
      <h2>📥 Receive Items</h2>

      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn clear" onClick={() => setSearch("")}>
          Clear
        </button>
      </div>

      {/* Items grid */}
      <div className="cards-grid">
        {filtered.map((item) => {
          const mine = !!item.isMine;
          return (
            <div key={item.id} className="card glass horizontal-card">
              {/* Image left (or top on mobile) */}
              <div className="card-media-small">
                <img
  src={item.imageUrl ? `${API_BASE}${encodeURI(item.imageUrl)}` : ""}  // ⬅ add encodeURI
  alt={item.title || "Uploaded item"}
  onError={(e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = PLACEHOLDER_SVG;
  }}
/>

              </div>

              {/* Text right */}
              <div className="card-text">
                <h3>{item.title || "Untitled"}</h3>
                <p className="desc">{item.description}</p>
                <p>
                  <strong>Category:</strong> {item.category}
                </p>
                <p>
                  <strong>Quality:</strong> {item.quality || "Good"}
                </p>

                {/* Single label: either "Your upload" or the uploader name */}
                <span className="badge">{mine ? "Your upload" : `By ${item.uploader_name}`}</span>

                <div className="actions">
                  {!mine ? (
                    <button className="btn primary" onClick={() => handleClaim(item)}>
                      Claim
                    </button>
                  ) : (
                    <button className="btn ghost" disabled>
                      Your upload
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p>No items match your search.</p>}
      </div>

      {/* Request Section */}
      <div className="request-form glass">
        <h3>🙋 Didn’t find what you need? Request an item</h3>
        <form onSubmit={handleRequest}>
          <input
            type="text"
            placeholder="Item title"
            value={reqTitle}
            onChange={(e) => setReqTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Description"
            value={reqDesc}
            onChange={(e) => setReqDesc(e.target.value)}
            rows={3}
          />
          <input
            type="text"
            placeholder="Category"
            value={reqCategory}
            onChange={(e) => setReqCategory(e.target.value)}
          />
          <div className="form-actions">
            <button className="btn primary" type="submit">
              Submit Request
            </button>
            <button
              className="btn clear"
              type="button"
              onClick={() => {
                setReqTitle("");
                setReqDesc("");
                setReqCategory("");
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
