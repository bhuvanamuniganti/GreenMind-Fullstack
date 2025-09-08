{/* RIGHT SIDEBAR — themed for GreenMindAI */}
<aside className="rightbar">
  <section className="glass panel impact-panel">
    <div className="impact-header">
      <span className="impact-emoji">🌱</span>
      <h4>Impact & Community</h4>
    </div>

    <div className="impact-row">
      <div className="impact-key">👩‍🎓 Active learners</div>
      <div className="impact-value">{fmt(stats?.active_users || 0)}</div>
    </div>

    <div className="impact-row">
      <div className="impact-key">📚 Resources contributed</div>
      <div className="impact-value">{fmt(stats?.resources_contributed || 0)}</div>
    </div>

    <div className="impact-row">
      <div className="impact-key">📥 Resources accessed</div>
      <div className="impact-value">{fmt(stats?.resources_accessed || 0)}</div>
    </div>

    <div className="impact-row">
      <div className="impact-key">⚡ Learning hours accelerated</div>
      <div className="impact-value">{fmt(stats?.hours_saved || 0)}</div>
    </div>

    <div className="impact-row">
      <div className="impact-key">♻️ Materials reused</div>
      <div className="impact-value">{fmt(stats?.items_exchanged || 0)}</div>
    </div>

    <hr className="impact-sep" />

    <div className="topper-block">
      <div className="topper-title">🏆 Top contributor</div>
      {topper ? (
        <div className="topper-info">
          <div className="topper-name">{topper.full_name}</div>
          <div className="topper-points">{fmt(topper.points)} GP</div>
        </div>
      ) : (
        <div className="topper-info">
          <div className="topper-name">Bhuvana</div>
          <div className="topper-points">2,290 GP</div>
        </div>
      )}
    </div>

    <div className="impact-cta">
      <button className="btn ghost" onClick={() => setActiveSection("Receive")}>
        Browse Local Resources
      </button>
      <button className="btn primary" onClick={() => setActiveSection("Smart Contribution")}>
        Contribute an Item
      </button>
    </div>
  </section>
</aside>
