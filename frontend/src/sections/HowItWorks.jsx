import "./HowItWorks.css";

function HowItWorks() {
  const FEATURES = [
    {
      id: "audio-translate",
      title: "Translate & Audio (Regional Text + Audiobook)",
      desc:
        "Upload an image, PDF or paste text — AI extracts content, translates into Telugu/Hindi/English (or other regional languages), and generates a narrated audiobook personalized to your pace and voice settings.",
    },
    {
      id: "flashcards",
      title: "Flashcards & Gamified Quizzes",
      desc:
        "Auto-generate flashcards and gamified quizzes from images or text to speed up recall. Spaced practice and scoring make revision engaging.",
    },
    {
      id: "ai-learning",
      title: "Smart AI Learning",
      desc:
        "Upload a picture or paste a topic — AI generates MCQs, fill-in-the-blanks, Q&A and similar practice questions that track syllabus changes.",
    },
    {
      id: "math",
      title: "Math Tutor",
      desc:
        "Upload a math problem (image or text) and get clear step-by-step solutions, worked examples and practice questions.",
    },
    {
      id: "practice-image",
      title: "Practice from Image",
      desc:
        "Take practice questions directly from textbook images — written & oral tasks with per-question feedback.",
    },
    {
      id: "upload-reuse",
      title: "Upload & Reuse Items",
      desc:
        "Upload unused educational items. AI checks quality and categorizes them so others can claim locally without paying.",
    },
  
  ];

  return (
    <section id="how" className="how-section">
      <div className="how-container">
        <h2 className="how-title">Main Features — How it Works</h2>

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
