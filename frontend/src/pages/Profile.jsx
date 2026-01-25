import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "../pages/Profile.css";

import UploadSection from "../sections/UploadSection";
import ReceiveSection from "../sections/ReceiveSection";
import AiLearningStudio from "../sections/AiLearningStudio";
import TranslatorSection from "../sections/TranslatorSection";
import FlashCardSection from "../sections/FlashCardSection";
import MathTutorSection from "../sections/MathTutorSection";
import PracticeFromImageSection from "../sections/PracticeFromImageSection";
import ConfidentSpeakerSection from "../sections/ConfidentSpeakerSection";




const fmt = (n) => n?.toLocaleString?.() ?? String(n);

export default function Profile() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [topper, setTopper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 980 : false
  );

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

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth <= 980;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (loading) return <div className="glass profile-loading">Loading…</div>;
  if (!me) return <div className="glass profile-loading error">{msg || "No profile data"}</div>;

  const LEFT_ITEMS = [
    { id: "Dashboard", title: "Dashboard", icon: "📋" },
    
   { id: "Confident Speaker", title: "Confident Speaker", icon: "🗣️" },
    { id: "Math Tutor", title: "Smart Math", icon: "➗" },
     { id: "Practice from Image", title: "Parent's Helper", icon: "📷" },
     

    { id: "Flashcards", title: "Quick Practice", icon: "🎴" },
    { id: "Smart AI Learning", title: "Smart AI Learning", icon: "🤖" },
    { id: "translator", title: "Book2Voice", icon: "🔊" },
    
  ];

  function handleSignOut() {
    nav("/");
  }

  function DashboardCards() {
    const PH_PARENT = "/images/mother.png";
    const PH_UPLOAD = "/images/upload.png";
    const PH_RECEIVE = "/images/recieve.png";

    const safe = (e, fallback) => {
      e.target.onerror = null;
      e.target.src = fallback;
    };

    return (
      <div className="dashboard-cards">
        {/* ParentTalk card */}
        <div className="feature-card" onClick={() => setActiveSection("translator")} role="button">
          <h3 className="card-title">👩‍👦 Assist Your Child</h3>
          <div className="card-hero">
            <img src={PH_PARENT} alt="ParentTalk" onError={(e) => safe(e,"https://via.placeholder.com/800x1200?text=ParentTalk")} />
          </div>
          <div className="card-body">
            <button className="btn btn-primary-green" 
            style = {{backgroundColor: "darkgreen", color :"white"}}
            onClick={(e) => { e.stopPropagation(); setActiveSection("translator"); }}>Open Helper</button>
          </div>
        </div>

        {/* Smart Contribution card */}
        <div className="feature-card" onClick={() => setActiveSection("Smart Contribution")} role="button">
          <h3 className="card-title">♻️ Smart Contribution</h3>
          <div className="card-hero">
            <img src={PH_UPLOAD} alt="Upload" onError={(e) => safe(e,"https://via.placeholder.com/800x1200?text=Upload")} />
          </div>
          <div className="card-body">
            <button className="btn btn-primary-green" 
            style = {{backgroundColor: "darkgreen", color :"white"}}
            onClick={(e) => { e.stopPropagation(); setActiveSection("Smart Contribution"); }}>Upload</button>
          </div>
        </div>

        {/* Receive card */}
        <div className="feature-card" onClick={() => setActiveSection("Receive")} role="button">
          <h3 className="card-title">📥 Knowledge Exchange</h3>
          <div className="card-hero">
            <img src={PH_RECEIVE} alt="Receive" onError={(e) => safe(e,"https://via.placeholder.com/800x1200?text=Receive")} />
          </div>
          <div className="card-body">
            <button className="btn btn-primary-green" 
            style = {{backgroundColor: "darkgreen", color :"white"}}
            onClick={(e) => { e.stopPropagation(); setActiveSection("Receive"); }}>Find</button>
          </div>
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
        {s === "Practice from Image" && <PracticeFromImageSection />}
        {s === "Confident Speaker" && <ConfidentSpeakerSection />}

        {s === "Smart AI Learning" && <AiLearningStudio />}
        {s === "Smart Contribution" && <UploadSection />}
        {s === "Receive" && <ReceiveSection />}
      </div>
    );
  }

  // Full-section view (non-dashboard)
  if (activeSection !== "Dashboard") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--page-bg)", padding: "10px"}}>
        <button
          className="btn back"
          onClick={() => { setActiveSection("Dashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          style={{ padding: "3px 5px", background: "linear-gradient(90deg,#ff7b1b,#ff5e00)", color: "#fff", border: "none",
             marginLeft:"10px", borderRadius: 8, fontWeight: 800, marginBottom:"0px", marginTop:"5px" }}
        >
          ← Back
        </button>
        <div style={{ width: "100%", marginTop:"0px" }}>
          <FullSection />
        </div>
      </div>
    );
  }

  // --- Dashboard layout
  return (
    <div className="profile-grid">
      <aside className="sidebar-desktop">
        <div className="brand-row"><h2 className="brand">MatruMarg👩‍👧🤖</h2></div>
        <nav className="left-nav">
          <ul>
            {LEFT_ITEMS.map((item) => (
              <li key={item.id} className={activeSection === item.id ? "active" : ""} onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}>
                <span className="left-icon">{item.icon}</span>
                <span className="left-label">{item.title}</span>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="btn signout" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <main className="profile-main">
        <header className="profile-header">
          <div className="header-left">
            {isMobile && <button onClick={()=>setSidebarOpen(true)} style={{ fontSize:28, background:"transparent", border:"none", cursor:"pointer" }}>☰</button>}
            <h3>Welcome, {me.full_name}</h3>
          </div>
          <div className="header-meta">
            <strong>Points: {fmt(me.points)}</strong>
            <strong>Streak: {fmt(me.streak_count)}</strong>
          </div>
        </header>
        <DashboardCards />
        <div style= {{backgroundColor:"#e3f1e1", padding: "2px", marginTop: "40px"}}>
        <p style = {{ fontFamily: "Roboto"}}>
         Note: Click any left menu item to open that feature in full view.
        </p>
      </div>
      </main>

    <aside className="rightbar">
  <section className="glass panel impact-panel">
    <h4>🌱Impact & Community</h4>
    <div className="impact-key">👩‍🎓 Active learners: {fmt(stats?.active_users || 0)}</div>
    <div className="impact-key">📚 Resources contributed: {fmt(stats?.resources_contributed || 0)}</div>
    <div className="impact-key">📥 Resources accessed: {fmt(stats?.resources_accessed || 0)}</div>
    
    <div className="impact-key">♻️ Materials reused: {fmt(stats?.items_exchanged || 0)}</div>
    <hr className="impact-sep" />
    <div className="topper-block">
      <div className="topper-title">🏆 Top contributor</div>
      <p></p>
      {topper ? (
        <div className="topper-info">
          <div className="topper-name">
            {topper.full_name}: {fmt(topper.points)} GP
          </div>
        </div>
      ) : (
        <div className="topper-info">
          <div className="topper-name">Bhuvana: 2,290 GP</div>
        </div>
      )}
    </div>
  </section>
</aside>


      {isMobile && sidebarOpen && (
        <aside className="sidebar-overlay" role="dialog" aria-label="mobile menu overlay">
          <button className="close" aria-label="Close menu" onClick={() => setSidebarOpen(false)}>✕</button>
          <ul>
            {LEFT_ITEMS.map((item) => (
              <li key={item.id} onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}>
                <span className="left-icon">{item.icon}</span>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
          <button className="btn signout" onClick={handleSignOut} style={{ marginTop: 18 }}>Sign out</button>
        </aside>
      )}
    </div>
  );
}
