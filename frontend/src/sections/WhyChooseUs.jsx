import React from "react";
import "./WhyChooseUs.css";

/**
 * WhyChooseUs.jsx
 * Purpose-built for GreenMindAI — clear three-pillar layout + GIF demos + CTA.
 *
 * Drop this file into src/sections/ and the accompanying CSS file next to it.
 */

export default function WhyChooseUs() {


  return (
    <section id="why" className="gm-why-section" aria-labelledby="gm-why-title">
      <div className="gm-container">
        <h2 id="gm-why-title" className="gm-heading">Why GreenMindAI — practical learning & respectful sharing</h2>
        <p className="gm-lead">
          Designed for Indian students and families — AI-powered practice, low-data-friendly tools, and a dignity-first local reuse system.
        </p>

        {/* Three pillars */}
        <div className="gm-grid">
          <article className="gm-pillar" aria-labelledby="p1">
            <h3 id="p1" className="gm-pillar-title">🤖Personalised AI learning</h3>
            <p className="gm-pillar-desc">
              Turn textbook pages or pasted notes into practice: auto MCQs, step-by-step math solutions, and spoken practice in Telugu, Hindi & English.
            </p>
            <ul className="gm-bullets">
              <li>Auto-generated quizzes & flashcards</li>
              <li>Math tutor with worked steps + similar questions</li>
              <li>Text → personalised audiobook generator</li>
            </ul>
          </article>

          <article className="gm-pillar" aria-labelledby="p2">
            <h3 id="p2" className="gm-pillar-title">♻️Dignified local sharing</h3>
            <p className="gm-pillar-desc">
              Upload gently-used essentials — AI checks quality and suggests titles/tags. Claim or swap items locally with dignity, not money.
            </p>
            <ul className="gm-bullets">
              <li>Smart contribution: auto-categorization & quality checks</li>
              <li>Browse nearby items, request or arrange pickup</li>
              <li>Privacy-preserving local flow — meet safely</li>
            </ul>
          </article>

          <article className="gm-pillar" aria-labelledby="p3">
            <h3 id="p3" className="gm-pillar-title">🌱Earn Green Points & grow</h3>
            <p className="gm-pillar-desc">
              Earn Green Points when you upload, teach, or complete learning activities — use points to claim essentials or unlock features.
            </p>
            <ul className="gm-bullets">
              <li>Points for uploads, contributing resources, learning streaks</li>
              <li>Leaderboards, top contributors and community recognition</li>
              <li>Impact metrics: materials reused, hours accelerated</li>
            </ul>
          </article>
        </div>

        
      </div>
    </section>
  );
}
