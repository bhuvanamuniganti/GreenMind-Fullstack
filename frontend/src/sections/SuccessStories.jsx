export default function Stories() {
  const quotes = [
    { text: "My son uploaded a chapter photo, and AI created quizzes + flashcards. His exam confidence went up!", by: "Parent" },
    { text: "I turned my Physics textbook into an audio version. Now I listen while traveling.", by: "Student" },
    { text: "Using Math Tutor, I solved problems step by step and got similar practice questions. My marks improved.", by: "High School Learner" },
    { text: "I uploaded my old calculator, and in return, received notebooks with Green Points.", by: "College Student" },
    { text: "Our teacher used AI Studio to generate MCQs in Telugu — students loved the gamified practice.", by: "School Teacher" },
    { text: "I converted PDFs into audio lessons for my daughter. She studies while doing chores.", by: "Mother" },
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
        <p className="muted center">
          Every upload, practice, or audio lesson inspires someone. 🌱
        </p>
      </div>
    </section>
  );
}
