import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

// Import section components
import GenerateQuestionsSection from "../sections/GenerateQuestionsSection";
import SavedQuestionsSection from "../sections/SavedQuestionsSection";
import QAChatbotSection from "../sections/QAChatbotSection";
import BookGeneratorSection from "../sections/BookGeneratorSection";
import SavedBooksSection from "../sections/SavedBooksSection";
import PDFsSection from "../sections/PDFsSection";
import MyUploadsSection from "../sections/MyUploadsSection";
import ReceivedItemsSection from "../sections/ReceivedItemsSection";

// Middle card sections
import LearnSection from "../sections/LearnSection";
import UploadSection from "../sections/UploadSection";
import ReceiveSection from "../sections/ReceiveSection";
import AITutorSection from "../sections/AITutorSection";


const fmt = (n) => n?.toLocaleString?.() ?? String(n);

export default function Profile() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [topper, setTopper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false); // for mobile

  useEffect(() => {
    (async () => {
      try {
        const summary = await api("/api/app/summary");
        const s = await api("/api/app/stats");
        const lb = await api("/api/app/leaderboard?limit=1");
        setMe(summary.user);
        setStats(s);
        setTopper(lb[0]);
      } catch (err) {
        setMsg(err?.data?.error || "Could not load profile data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="glass" style={{ padding: 20 }}>Loading…</div>;
  if (!me) return <div className="glass" style={{ padding: 20, color: "#b91c1c" }}>{msg || "No profile data"}</div>;

  function handleSignOut() {
    nav("/");
  }

  const sidebarItems = [
    "Dashboard",
    "Generate Questions",
    "Saved Questions",
    "Q&A Chatbot",
    "Book Generator",
    "Saved Books",
    "PDFs",
    "My Uploads",
    "Received Items",
    "AI Tutor",
  ];

  return (
    <div className="profile-grid">

      {/* LEFT SIDEBAR (desktop) */}
      <aside className="sidebar-desktop" style={{ background: "lightgreen", color: "#121010ff", padding: 16 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 className="brand">🌳 GreenMindAI</h2>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {sidebarItems.map((label) => (
            <li
              key={label}
              onClick={() => {
                setActiveSection(label);
                setSidebarOpen(false); // close on mobile select
              }}
              style={{
                padding: "12px 14px",
                borderRadius: "4px",
                marginBottom: "4px",
                cursor: "pointer",
                background: activeSection === label ? "rgba(255,255,255,0.15)" : "transparent",
                fontWeight: 600,
              }}
            >
              {label}
            </li>
          ))}
        </ul>
        <button className="btn primary" onClick={handleSignOut} style={{ marginTop: 20 }}>
          Sign out
        </button>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <aside className="sidebar-overlay">
          <button className="btn ghost" onClick={() => setSidebarOpen(false)} style={{ marginBottom: 16 }}>
            ✕ Close
          </button>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {sidebarItems.map((label) => (
              <li
                key={label}
                onClick={() => {
                  setActiveSection(label);
                  setSidebarOpen(false);
                }}
                style={{
                  padding: "12px 14px",
                  borderRadius: "4px",
                  marginBottom: "4px",
                  cursor: "pointer",
                  background: activeSection === label ? "rgba(255,255,255,0.15)" : "transparent",
                  fontWeight: 600,
                }}
              >
                {label}
              </li>
            ))}
          </ul>
        </aside>
      )}

      {/* CENTER */}
      <main style={{ padding: 18, background: "var(--page)", overflowY: "auto" }}>
        {/* NAV BAR */}
        <header className="header">
          <div className="header-row">
            {/* Hamburger only visible on small screens */}
            <button
              className="btn ghost hamburger"
              onClick={() => setSidebarOpen(true)}
              style={{ display: "none" }}
            >
              ☰
            </button>

            <div>
              <h3 style={{ margin: 0,  paddingLeft: 10}}>Welcome, {me.full_name}</h3>
            </div>
            <div className="actions">
              <div className="pill"><strong>Points:</strong> {me.points}</div>
              <div className="pill"><strong>Level:</strong> {me.level}</div>
              <div className="pill"><strong>Streak:</strong> {me.streak_count}d</div>
            </div>
          </div>
        </header>

      <div style={{ marginTop: 20 }}>
  {activeSection === "Dashboard" && (
    <div className="cards">
       <div className="card glass" onClick={() => setActiveSection("AI Tutor")}>
  <h3>🤖 AI Tutor</h3>
  <p>Get instant AI-powered tutoring support.</p>
</div>
      <div className="card glass" onClick={() => setActiveSection("Upload")}>
        <h3>♻️ Upload</h3>
        <p>Upload preloved educational items.</p>
      </div>
      <div className="card glass" onClick={() => setActiveSection("Receive")}>
        <h3>📥 Receive</h3>
        <p>Browse and claim shared resources.</p>
      </div>
  

    </div>
  )}

  {activeSection !== "Dashboard" && (
    <div>
      <button className="btn" onClick={() => setActiveSection("Dashboard")} style= {{marginDown:"0.5rem"}}>
        ← Back
      </button>
<p></p>
      {activeSection === "Learn" && <LearnSection />}
      {activeSection === "Upload" && <UploadSection />}
      {activeSection === "Receive" && <ReceiveSection />}
      {activeSection === "Generate Questions" && <GenerateQuestionsSection />}
      {activeSection === "Saved Questions" && <SavedQuestionsSection />}
      {activeSection === "Q&A Chatbot" && <QAChatbotSection />}
      {activeSection === "Book Generator" && <BookGeneratorSection />}
      {activeSection === "Saved Books" && <SavedBooksSection />}
      {activeSection === "PDFs" && <PDFsSection />}
      {activeSection === "My Uploads" && <MyUploadsSection />}
      {activeSection === "Received Items" && <ReceivedItemsSection />}
      {activeSection === "AI Tutor" && <AITutorSection />}

    </div>
  )}
</div>

      
      </main>

    
      
       {/* RIGHT SIDEBAR */}
<aside style={{ background: "#fff", padding: 16 }} className="rightbar">
  <section className="glass panel">
    <h4>🌍 Impact</h4>

    <p>
      <strong>👩‍🎓 Active Learners:</strong>{" "}
      {fmt(stats?.active_users || 25)}
    </p>
    <p>
      <strong>📚 Resources Contributed:</strong>{" "}
      {fmt(stats?.resources_contributed || 10)}
    </p>
    <p>
      <strong>📥 Resources Accessed:</strong>{" "}
      {fmt(stats?.resources_accessed || 15)}
    </p>
    <p>
      <strong>⚡ Learning Hours Accelerated:</strong>{" "}
      {fmt(stats?.hours_saved || 50)}
    </p>
    <p>
      <strong>🌱 Materials Reused:</strong>{" "}
      {fmt(stats?.items_exchanged || 8)}
    </p>
  </section>

  <section className="glass panel" style={{ marginTop: 12 }}>
    <h4>🏆 Top Contributor</h4>
    {topper ? (
      <>
        <div>{topper.full_name}</div>
        <div>{fmt(topper.points)} GP</div>
      </>
    ) : (
      <p>Bhuvana — 2,275 GP</p> 
    )}
  </section>
</aside>

  
    </div>
  );
}
