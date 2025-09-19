// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Profile.css";

// Section components (unchanged)
import UploadSection from "../sections/UploadSection";
import ReceiveSection from "../sections/ReceiveSection";
import AiLearningStudio from "../sections/AiLearningStudio";
import TranslatorSection from "../sections/TranslatorSection";
import FlashCardSection from "../sections/FlashCardSection";
import MathTutorSection from "../sections/MathTutorSection";
import AskAnythingSection from "../sections/AskAnythingSection";
import PracticeFromImageSection from "../sections/PracticeFromImageSection";

const fmt = (n) => n?.toLocaleString?.() ?? String(n);

export default function Profile() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [topper, setTopper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay

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

  if (loading) return <div className="glass profile-loading">Loading…</div>;
  if (!me) return <div className="glass profile-loading error">{msg || "No profile data"}</div>;

  const LEFT_ITEMS = [
    { id: "Dashboard", title: "Dashboard", icon: "📋" },
    { id: "translator", title: "Book2Voice", icon: "🔊" },
     { id: "Practice from Image", title: "Parent’s Helper", icon: "📷" },   
    { id: "Math Tutor", title: "Math Tutor", icon: "➗" },
    { id: "Ask Anything", title: "Ask Anything", icon: "❓" },
   { id: "Flashcards", title: "Flashcards & Quizzes", icon: "🎴" },
     { id: "Smart AI Learning", title: "Smart AI Learning", icon: "🤖" },
    { id: "Smart Contribution", title: "Smart Contribution", icon: "♻️" },
    { id: "Receive", title: "Knowledge Exchange", icon: "📥" },
  ];

  function handleSignOut() {
    nav("/");
  }

  function DashboardCards() {
    return (
      <div className="dashboard-cards" style={{ marginTop: "30px" }}>
        <div className="card feature-card" onClick={() => setActiveSection("Smart AI Learning")}>
          <h3>📘 AI Learning Studio</h3>
          <p>
            Convert textbook pages, images or pasted topics into adaptive practice: auto MCQs, fill-in-the-blanks, spoken
            practice and step-by-step solutions.
          </p>
        </div>

        <div className="card feature-card" onClick={() => setActiveSection("Smart Contribution")}>
          <h3>♻️ Smart Contribution</h3>
          <p>
            Upload unused educational items — AI inspects condition, suggests metadata and approves quality listings.
          </p>
        </div>

        <div className="card feature-card" onClick={() => setActiveSection("Receive")}>
          <h3>📥 Knowledge Exchange</h3>
          <p>
            Browse and claim study materials locally. Use Green Points earned from learning & contributing to unlock more
            support.
          </p>
        </div>
      </div>
    );
  }

  function FullSection() {
    const s = activeSection;
    return (
      <div className="full-section-body">
        {s === "Upload" && <UploadSection />}
        {s === "AI Tutor" && <AiLearningStudio />}
        {s === "translator" && <TranslatorSection />}
        {s === "Flashcards" && <FlashCardSection />}
        {s === "Math Tutor" && <MathTutorSection />}
        {s === "Ask Anything" && <AskAnythingSection />}
        {s === "Practice from Image" && <PracticeFromImageSection />}
        {s === "Smart AI Learning" && <AiLearningStudio />}
        {s === "Smart Contribution" && <UploadSection />}
        {s === "Receive" && <ReceiveSection />}
      </div>
    );
  }

  return (
    <div className="profile-grid">
      {/* LEFT SIDEBAR (desktop) - always present in DOM; CSS hides it on small screens */}
      <aside className="sidebar-desktop">
        <div className="brand-row">
          <h2 className="brand">
            GreenMindAI
            
          </h2>
        </div>

        <nav className="left-nav" aria-label="Main navigation">
          <ul>
            {LEFT_ITEMS.map((item) => (
              <li
                key={item.id}
                className={activeSection === item.id ? "active" : ""}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="left-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="left-label">{item.title}</span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="btn signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CENTER */}
      <main className="profile-main">
        <header className="profile-header">
          <div className="header-left">
            {/* hamburger appears inside header on small screens; hidden by CSS on large screens */}
            {!sidebarOpen && (
              <div className="mobile-hamburger" aria-hidden="false">
                <button
                  className="hamb-btn"
                  aria-label="Open menu"
                  onClick={() => {
                    setSidebarOpen(true);
                  }}
                >
                  ☰
                </button>
              </div>
            )}

            <h3>Welcome, {me.full_name}</h3>
          </div>

          <div className="header-meta" aria-hidden="false">
            <strong>Points: {fmt(me.points)}</strong>
            <strong>Streak: {fmt(me.streak_count)}</strong>
          </div>
        </header>

        {/* Back button — second row when not Dashboard */}
        {activeSection !== "Dashboard" && (
          <div>
            <button
              className="btn back" style={{marginLeft:"10px", marginRight:"10px"}}
              onClick={() => {
                setActiveSection("Dashboard");
              }}
            >
              ← Back
            </button>
          </div>
        )}

        <section className="center-area" style={{marginLeft:"10px"}}>
          {activeSection === "Dashboard" && (
            <>
              <DashboardCards />
              <div className="info-panel" style={{margin:"20px", padding:"2px"}} >
                <p>
                  <strong>Tip:</strong> Click any left menu item to open that feature in full view (Back button returns to
                  Dashboard).
                </p>
              </div>
            </>
          )}

          {activeSection !== "Dashboard" && <FullSection />}
        </section>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="rightbar" style ={{padding:"5px"}} >
        <section className="glass panel impact-panel" style={{paddingRight:"0px"}}>
    
            <h4>🌱Impact & Community</h4>
            <div className="impact-key" style={{marginBottom: "10px"}} >👩‍🎓 Active learners: {fmt(stats?.active_users || 0)}</div>
            <div className="impact-key" style={{marginBottom: "10px"}}>📚 Resources contributed: {fmt(stats?.resources_contributed || 0)}</div>
            <div className="impact-key" style={{marginBottom: "10px"}}>📥 Resources accessed: {fmt(stats?.resources_accessed || 0)}</div>
            <div className="impact-key" style={{marginBottom: "10px"}}>⚡ Learning hours accelerated: {fmt(stats?.hours_saved || 0)}</div>
            <div className="impact-key" style={{marginBottom: "10px"}}>♻️ Materials reused:{fmt(stats?.items_exchanged || 0)}</div>
        

          <hr className="impact-sep" />

          <div className="topper-block">
            <div className="topper-title" style={{marginBottom: "10px"}}>🏆 Top contributor</div>
            {topper ? (
              <div className="topper-info">
                <div className="topper-name">{topper.full_name}: {fmt(topper.points)} GP</div>
              </div>
            ) : (
              <div className="topper-info" >
                <div className="topper-name">Bhuvana: 2,290 GP</div>
              </div>
            )}
          </div>
        </section>
      </aside>

      {/* MOBILE overlay (renders only when sidebarOpen is true) */}
      {sidebarOpen && (
        <aside className="sidebar-overlay" role="dialog" aria-label="mobile menu overlay">
          <button
            className="btn close"
            aria-label="Close menu"
            onClick={() => {
              setSidebarOpen(false);
            }}
          >
            ✕
          </button>

          <ul className="overlay-list">
            {LEFT_ITEMS.map((item) => (
              <li
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="left-icon">{item.icon}</span>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 18 }}>
            <button className="btn signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
