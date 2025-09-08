import React, { useState, useEffect } from "react";
import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import HowItWorks from "./sections/HowItWorks";
import WhyChooseUs from "./sections/WhyChooseUs";
import Values from "./sections/Values";
import Featured from "./sections/Featured";
import FAQ from "./sections/FAQ";
import SuccessStories from "./sections/SuccessStories";
/* ---------------- Data ---------------- */
const NAV_TOP = [
  { id: "how", label: "How it works", icon: "📌", href: "#how" }

];



/* ---------------- Inline button styles (only inline so App.css is untouched) ---------------- */
const primaryBtnInline = {
  background: "linear-gradient(135deg,#ff8a00,#ff5e00)", // orange gradient
  border: "none",
  color: "#fff",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: 900,
  cursor: "pointer",
};



const ghostBtnInline = {
  background: "Darkgreen",
  border: "1px solid rgba(14,104,47,.9)",
  color: "#bbc3beff",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: 900,
  cursor: "pointer",
};

/* ---------------- Header ---------------- */
function Header({ openAuth }) {
  const [lang, setLang] = useState("en");
  const [notice, setNotice] = useState("");

  const onLangChange = (e) => {
    const v = e.target.value;
    setLang(v);
    if (v === "te") setNotice("తెలుగు త్వరలో అందుబాటులోకి వస్తోంది. ఇప్పటికి ఆంగ్లం మాత్రమే.");
    else if (v === "hi") setNotice("हिंदी जल्द उपलब्ध होगी। अभी के लिए केवल अंग्रेज़ी।");
    else setNotice("");
  };

  return (
    <header className="header" role="banner">
      <div className="container header-row">
        <div className="brand" title="GreenMindAI" style = {{marginLeft:"2px"}}>GreenMindAI🌳🤖</div>

        <nav className="nav" aria-label="Main">
          {NAV_TOP.map((n) => (
            <a key={n.id} className="menu-chip" href={n.href}>
              <span className="chip-icon" aria-hidden="true">{n.icon}</span>
              <span className="chip-label">{n.label}</span>
            </a>
          ))}
        </nav>

        <div className="actions">
          <select id="lang" className="lang-select" value={lang} onChange={onLangChange} style={{backgroundColor:"white"}}>
            <option value="en">English</option>
            <option value="te">తెలుగు</option>
            <option value="hi">हिंदी</option>
          </select>

          <button
            className="btn primary sm-only-compact nav-auth"
            onClick={() => openAuth("register")}
            style={primaryBtnInline}
          >
            Get Started
          </button>
          <button
            className="btn"
            onClick={() => openAuth("login")}
            style={{backgroundColor:"Darkgreen", color:"White"}}
          >
            Login
          </button>
        </div>
      </div>

      {notice && (
        <div className="container" style={{ paddingBottom: 8 }}>
          <p style={{ color: "#dc2626", margin: 0, fontWeight: 700 }}>{notice}</p>
        </div>
      )}
    </header>
  );
}

/* ---------------- HERO (responsive padding fix) ---------------- */
function Hero({ openAuth }) {
  const bg = `${process.env.PUBLIC_URL}/images/hero-bg.png`;
  const card = `${process.env.PUBLIC_URL}/images/hero-card.png`;

  // dynamic padding so mobile has less top space
  const [heroPadding, setHeroPadding] = useState("78px 0");

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setHeroPadding("28px 0");
      else if (w < 900) setHeroPadding("48px 0");
      else setHeroPadding("78px 0");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section
      className="hero"
      aria-labelledby="hero-title"
      style={{ position: "relative", padding: heroPadding, overflow: "hidden" }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(80rem 40rem at -10% -20%, rgba(34,197,94,.14), transparent 60%),
            radial-gradient(70rem 38rem at 110% 10%, rgba(52,211,153,.14), transparent 60%),
            linear-gradient(135deg, rgba(22,163,74,.18), rgba(52,211,153,.10)),
            url(${bg})
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0
        }}
      />

      <div className="container hero-grid" style={{ position: "relative", zIndex: 1 }}>
        <div className="hero-glass glass" style={{ textAlign: "center" }}>
          <h1 id="hero-title">Smart Learning & Respectful Sharing</h1>
          <p className="sub">
            Turn any textbook page or note into personalised practice and find local study essentials — in Telugu, Hindi or English.
          </p>

          <ul className="badges" aria-label="Highlights" style={{ justifyContent: "center" }}>
            <li>🗣️ Telugu • Hindi • English</li>
            <li>🔄 Works Offline & Online</li>
            <li>🌱 Community Sharing</li>
          </ul>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
            <div className="hero-buttons">
              {/* Inline styles so buttons are visually distinct and don't rely on your global CSS */}
              <button style={{ ...primaryBtnInline, marginRight: 8 }} onClick={() => openAuth("register")}>
                Get Started
              </button>

              <button style={ghostBtnInline} onClick={() => openAuth("login")}>
                Already have an account?
              </button>
            </div>
          </div>
        </div>

        <div className="hero-card glass" aria-hidden="true">
          <img alt="hero" src={card} className="hero-card-img" />
          <div className="leaf-ring" />
        </div>
      </div>
    </section>
  );
}



/* ---------------- Other existing sections (unchanged text earlier but refined where requested) ---------------- */








function FinalImpact() {
  return (
    <section id="impact" className="section final-cta" aria-labelledby="impact-title">
      <div className="container">
        <h2 id="impact-title">Ready to start?</h2>
        <p className="center muted">Join the reuse movement. Every swap helps.</p>
        <div className="cta-actions">
          <a className="btn primary" href="/register" style={primaryBtnInline}>Register</a>
          <a className="btn ghost" href="/login" style={ghostBtnInline}>Login</a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="section footer" role="contentinfo">
      <div className="container center muted">
        <p>© {new Date().getFullYear()} GreenMind • Share resources. Grow minds.</p>
      </div>
    </footer>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  function openAuth(mode) {
    setAuthMode(mode);
    setAuthOpen(true);
  }
  function closeAuth() {
    setAuthOpen(false);
  }

  return (
    <>
      <Header openAuth={openAuth} />
      {authOpen && (
        <div className="modal-backdrop" onClick={closeAuth}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {authMode === "login" ? <Login /> : <Register />}
          </div>
        </div>
      )}

      <main id="main">
        <Hero openAuth={openAuth} />
        <HowItWorks />
        <Featured/>
        <Values/>
               <SuccessStories/>
         <WhyChooseUs/>
        <FAQ />
        <FinalImpact />
      </main>
      <Footer />
    </>
  );
}
