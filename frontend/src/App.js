import React, { useState } from "react";
import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";


/* ---------------- Data ---------------- */
const NAV_TOP = [
  { id: "how", label: "How it works", icon: "📌", href: "#how" },
  { id: "explore", label: "Explore", icon: "🧭", href: "#explore" },
  { id: "tutor", label: "AI Tutor", icon: "🤖", href: "/tutor" }, // link added
];

const ITEMS = [
  { name: "Math Textbook (Grade 10)", pts: 12, condition: "Very Good", icon: "📘" },
  { name: "Scientific Calculator", pts: 8, condition: "Good", icon: "🧮" },
  { name: "Backpack (Teen)", pts: 9, condition: "Good", icon: "🎒" },
  { name: "English Guide", pts: 7, condition: "Very Good", icon: "📗" },
];

/* ---------------- Header ---------------- */
function Header({openAuth}) {
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
        {/* Brand updated */}
        <div className="brand" title="GreenMindAI"> 🌳 GreenMindAI</div>

        {/* center nav (desktop) */}
        <nav className="nav" aria-label="Main">
          {NAV_TOP.map((n) => (
            <a key={n.id} className="menu-chip" href={n.href}>
              <span className="chip-icon" aria-hidden="true">{n.icon}</span>
              <span className="chip-label">{n.label}</span>
            </a>
          ))}
        </nav>

        {/* right actions */}
        <div className="actions">
          {/* compact language select */}
          <select id="lang" className="lang-select" value={lang} onChange={onLangChange}>
            <option value="en">English</option>
            <option value="te">తెలుగు</option>
            <option value="hi">हिंदी</option>
          </select>

          {/* auth links (kept as one compact button, goes to /register; login as link) */}
          {/* before: <a className="btn primary" href="/register">Get Started</a> */}
<button className="btn primary sm-only-compact nav-auth" onClick={() => openAuth("register")}>
  Get Started
</button>
<button className="btn ghost sm-only-compact nav-auth" onClick={() => openAuth("login")}>
  Login
</button>

        </div>
      </div>

      {/* inline red notice when non-English chosen */}
      {notice && (
        <div className="container" style={{ paddingBottom: 8 }}>
          <p style={{ color: "#dc2626", margin: 0, fontWeight: 700 }}>{notice}</p>
        </div>
      )}
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero({openAuth}) {
  const bg = `${process.env.PUBLIC_URL}/images/hero-bg.png`;
  const card = `${process.env.PUBLIC_URL}/images/hero-card.png`;

  return (
    <section
      className="hero"
      aria-labelledby="hero-title"
      /* keep layout, just ensure bg shows without touching your CSS file */
      style={{ position: "relative", padding: "78px 0", overflow: "hidden" }}
    >
      {/* Background image layer (from public/images) */}
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
          {/* Title & sub updated */}
          <h1 id="hero-title">Smart Learning with AI and Meaningful Sharing of Essentials</h1>
          <p className="sub">
 Accessible AI guidance for studies and respectful sharing of resources  for every student and family.
          </p>
          <ul className="badges" aria-label="Highlights" style={{ justifyContent: "center" }}>
            <li>🤖 AI Tutor</li>
            <li>🗣️ Telugu • Hindi • English</li>
            <li>🔄 Offline & Online</li>
          </ul>

          {/* hero CTAs with real links */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
            
            <div className="hero-buttons">
              <button className="btn primary" href="/tutor">Try AI Tutor</button>
            <button className="btn" onClick={() => openAuth("register")}>Get Started</button>
<button className="btn ghost" onClick={() => openAuth("login")}>Already have an account?</button>

            </div>
          </div>
        </div>

        <div className="hero-card glass" aria-hidden="true">
          <img alt="hero" src={card} className="hero-card-img"/>
          <div className="leaf-ring" />
        </div>
      </div>
    </section>
  );
}

/* ---------------- How it works (with AI) ---------------- */
function HowItWorks() {
  return (
    <section id="how" className="section tint-a" aria-labelledby="how-title">
      <div className="container">
        <h2 id="how-title">How it works</h2>

        {/* EXACTLY 4 cards, as requested */}
        <div className="cards">
          <div className="card glass">
            <h3>🎓 Learn with OpenAI</h3>
            <p>Step-by-step explanations, examples, and voice—Telugu, Hindi, and English.</p>
          </div>

          <div className="card glass">
            <h3>🎯 Interview preparation</h3>
            <p>Practice Q&A, hints, and mock answers for viva and interviews.</p>
          </div>

          <div className="card glass">
            <h3>👀 Tutor sees your topic</h3>
            <p>As you study, it can suggest relevant books or supplies listed nearby.</p>
          </div>

          <div className="card glass">
            <h3>🌱 Green Points</h3>
            <p>Private appreciation for giving/receiving—impact, not money.</p>
          </div>
        </div>

        <p className="muted center" style={{ marginTop: 12 }}>
          Share resources. Learn better. Do it with dignity.
        </p>
      </div>
    </section>
  );
}

/* ---------------- Explore ---------------- */
function Featured() {
  return (
    <section id="explore" className="section tint-b" aria-labelledby="explore-title">
      <div className="container">
        <h2 id="explore-title">Trending items</h2>
        <div className="grid-4">
          {ITEMS.map((it, i) => (
            <div key={i} className="item-card glass">
              <div className="item-icon" aria-hidden="true" style={{ fontSize: 32 }}>{it.icon}</div>
              <div className="item-body">
                <div className="row between">
                  <strong>{it.name}</strong>
                  <span className="pill">+{it.pts} pts</span>
                </div>
                <p className="muted">Condition: {it.condition}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="muted center">More added in your area every day.</p>
      </div>
    </section>
  );
}

/* ---------------- AI Tutor teaser (anchor) ---------------- */
function TutorTeaser() {
  return (
    <section id="tutor" className="section tint-a" aria-labelledby="tutor-title">
      <div className="container center">
        <h2 id="tutor-title">AI Tutor (coming soon)</h2>
        <p className="muted">Explain • Practice • Translate • Voice — in Telugu, Hindi, English.</p>
        <p className="muted">We’ll enable this right after Login/Signup.</p>
      </div>
    </section>
  );
}

/* ---------------- Values, Stories, Why, FAQ, Final CTA ---------------- */
function Values() {
  return (
    <section id="students" className="section tint-a" aria-labelledby="students-title">
      <div className="container two-col">
        <div>
          <h2 id="students-title">Made for students and parents</h2>
          <ul className="list">
            <li>Right edition when syllabi change</li>
            <li>Lower costs for families</li>
            <li>Less clutter at home</li>
            <li>Less waste in landfills</li>
          </ul>
        </div>
        <div className="panel glass">
          <h3>Smart helpers</h3>
          <ul className="list small">
            <li>Photo tips for clear listings</li>
            <li>Suggested titles and tags</li>
            <li>Offline drafts when data is limited</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stories() {
  const quotes = [
    { text: "We found the exact guide our school switched to. No new purchase.", by: "Parent" },
    { text: "I traded a calculator for notebooks. Both of us earned points.", by: "Student" },
    { text: "Cleared space at home and helped a junior. Felt good.", by: "Alumni" },
    { text: "I listed old lab gear. It got picked up the same day.", by: "College Student" },
  ];
  return (
    <section id="stories" className="section tint-b" aria-labelledby="stories-title">
      <div className="container">
        <h2 id="stories-title">Success stories</h2>
        <div className="carousel" role="list">
          {quotes.map((q, i) => (
            <blockquote key={i} className="quote glass" role="listitem">
              “{q.text}”
              <footer>— {q.by}</footer>
            </blockquote>
          ))}
        </div>
        <p className="muted center">Your small swaps add up.</p>
      </div>
    </section>
  );
}

function WhyChooseUs() {
  return (
    <section id="why" className="section tint-a" aria-labelledby="why-title">
      <div className="container">
        <h2 id="why-title">Why Choose Us</h2>

        <div className="recycle-wrap">
          <svg className="recycle" viewBox="0 0 500 440" aria-hidden="true">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--brand-2)"></path>
              </marker>
            </defs>
            <path d="M250 40 L430 330" stroke="var(--brand-2)" strokeWidth="4" fill="none" markerEnd="url(#arrow)"/>
            <path d="M430 330 L70 330" stroke="var(--brand-2)" strokeWidth="4" fill="none" markerEnd="url(#arrow)"/>
            <path d="M70 330 L250 40" stroke="var(--brand-2)" strokeWidth="4" fill="none" markerEnd="url(#arrow)"/>
          </svg>

          <div className="node node-top glass">
            <div className="node-title">Reduce Waste</div>
            <p className="node-text">Keep useful items in use. Cut landfill.</p>
          </div>
          <div className="node node-right glass">
            <div className="node-title">Reuse Locally</div>
            <p className="node-text">Share nearby to lower footprint.</p>
          </div>
          <div className="node node-left glass">
            <div className="node-title">Support Learning</div>
            <p className="node-text">Help students get what they need.</p>
          </div>
        </div>

        <p className="center vision">Reuse first. Buy new only when needed.</p>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="section tint-b" aria-labelledby="faq-title">
      <div className="container faq">
        <h2 id="faq-title">FAQ</h2>

        <details className="glass">
          <summary>What can I list?</summary>
          <p>School and college essentials: books, guides, bags, calculators, stationery, basic lab items.</p>
        </details>

        <details className="glass">
          <summary>Are Green Points money?</summary>
          <p>No. They are private appreciation to reflect your positive impact.</p>
        </details>

        <details className="glass">
          <summary>Is AI required?</summary>
          <p>No. AI just helps with photo clarity and auto-details. You can edit everything.</p>
        </details>

        <details className="glass">
          <summary>How do I stay safe?</summary>
          <p>Meet in public spots and keep chats on the platform. Share only what is needed.</p>
        </details>
      </div>
    </section>
  );
}

function FinalImpact() {
  return (
    <section id="impact" className="section final-cta" aria-labelledby="impact-title">
      <div className="container">
        <h2 id="impact-title">Ready to start?</h2>
        <p className="center muted">Join the reuse movement. Every swap helps.</p>
        <div className="cta-actions">
          <a className="btn primary" href="/register">Register</a>
          <a className="btn ghost" href="/login">Login</a>
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
      {/* Pass openAuth into Header and Hero */}
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
        <Featured />
        <TutorTeaser />
        <Values />
        <Stories />
        <WhyChooseUs />
        <FAQ />
        <FinalImpact />
      </main>
      <Footer />
    </>
  );
}

