export default function Values() {
  return (
    <section id="students" className="section tint-a" aria-labelledby="students-title">
      <div className="container two-col">
        <div>
          <h2 id="students-title">Built for learners and families</h2>
          <ul className="list" >
            <li style={{margin: "2px"}}>Personalised practice in multiple languages</li>
            <li style={{margin: "2px"}}> Low-data and offline-friendly design</li>
            <li style={{margin: "2px"}}>Access free or affordable study essentials locally</li>
            <li style={{margin: "2px"}}>Earn Green Points while learning and sharing</li>
          </ul>
        </div>
        <div className="panel glass">
          <h3>Smart helpers</h3>
          <ul className="list small">
            <li>AI checks quality of shared items before approval</li>
            <li>Auto-suggested titles, tags & clean summaries</li>
            <li>Gamified quizzes, streak tracking, and rewards</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
