import "./HowItWorks.css";

function HowItWorks() {
 const FEATURES = [
  {
    id: "snap-to-explain",
    title: "Snap-to-Explain (Photo → Step-by-step Support)",
    desc:
      "Parents can upload a photo of a lesson or question, and the platform gives a simple explanation so parents can guide their child clearly at home.",
  },
  {
    id: "smart-learning-path",
    title: "Smart Learning Suggestions",
    desc:
      "Helps parents decide what the child should learn next by suggesting suitable topics and resources based on grade and learning level.",
  },
  {
    id: "multi-language-guidance",
    title: "Guidance in All Indian Languages",
    desc:
      "Provides explanations and learning support in any Indian language, so parents can guide their child without language barriers.",
  },
  {
    id: "audiobooks",
    title: "Audiobooks in Indian Languages",
    desc:
      "Turns learning content into audio so children can revise anytime, helping parents improve consistency without extra screen time.",
  },
  {
    id: "math-help",
    title: "School-Aligned Math Support",
    desc:
      "Parents can upload a math problem, and the platform provides step-by-step solutions, examples, and extra practice aligned with school learning.",
  },
  {
    id: "share-claim",
    title: "Share & Claim Unused Educational Resources",
    desc:
      "Parents can upload unused books, notes, and PDFs, and others can claim shared items based on their needs — making learning affordable and dignified.",
  },
];




  return (
    <section id="how" className="how-section">
      <div className="how-container">
        <h2 className="how-title">Key Features — How Parents Can Guide Their Child</h2>

        <div className="how-card-grid">
          {FEATURES.map((f) => (
            <div key={f.id} className="how-card glass">
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
