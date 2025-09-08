

const ITEMS = [
  { name: "Class 9 Science Guide", pts: 10, condition: "Good (AI-verified)", icon: "📘" },
  { name: "Geometry Set", pts: 6, condition: "Very Good (AI-verified)", icon: "📐" },
  { name: "Scientific Calculator", pts: 8, condition: "Good (AI-verified)", icon: "🧮" },
  { name: "Backpack (Teen)", pts: 5, condition: "Good (AI-verified)", icon: "🎒" },
];

export default function Featured() {
  return (
    <section id="explore" className="section tint-b" aria-labelledby="explore-title">
      <div className="container">
        <h2 id="explore-title">Recently Shared Resources</h2>

        <div className="grid-4">
          {ITEMS.map((it, i) => (
            <div key={i} className="item-card glass">
              <div
                className="item-icon"
                aria-hidden="true"
                style={{ fontSize: 28, lineHeight: 1 }}
              >
                {it.icon}
              </div>

              <div className="item-body">
                <div className="row between" style={{ alignItems: "center" }}>
                  <strong style={{ fontSize: 15 }}>{it.name}</strong>
                  <span className="pill">+{it.pts} GP</span>
                </div>

                <p className="muted" style={{ marginTop: 8 }}>
                  Quality: <strong>{it.condition}</strong>
                  <br />
                  AI-checked & community-reviewed before listing.
                </p>

                
              </div>
            </div>
          ))}
        </div>

        <p className="muted center" style={{ marginTop: 18 }}>
          Exchange books, tools and study aids with dignity — earn Green Points and support local learners.
        </p>
      </div>
    </section>
  );
}
