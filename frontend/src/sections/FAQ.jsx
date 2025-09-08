export default function FAQ() {
  return (
    <section id="faq" className="section tint-b" aria-labelledby="faq-title">
      <div className="container faq">
        <h2 id="faq-title">FAQ — GreenMindAI</h2>

        <details className="glass" style={{ margin: "4px 0" }}>
          <summary>What can I upload?</summary>
          <p>
            You can upload school or college essentials such as books, guides, calculators, bags,
            stationery, or lab items. Our AI checks the quality before it’s listed.
          </p>
        </details>

        <details className="glass" style={{ margin: "4px 0" }}>
          <summary>What are Green Points?</summary>
          <p>
            Green Points (GP) are not money. They are a recognition of your positive impact —
            earned by learning, practising, and sharing resources. Use them to claim listed items.
          </p>
        </details>
         <details className="glass" style={{ margin: "4px 0" }}>
  <summary>Is AI required to use the app?</summary>
  <p>
    Yes — AI powers every part of GreenMindAI, from validating uploads and assigning Green Points
    to generating quizzes, flashcards, and practice questions. You don’t need to set it up —
    it works automatically in the background to make learning and sharing seamless.
  </p>
</details>



        <details className="glass" style={{ margin: "4px 0" }}>
          <summary>Is my data safe?</summary>
          <p>
            Yes. Only the necessary details are shared. Keep exchanges public and chats on the
            platform. Your uploads are reviewed for quality and safety.
          </p>
        </details>

        <details className="glass" style={{ margin: "4px 0" }}>
          <summary>Can I learn in my language?</summary>
          <p>
            Absolutely. GreenMindAI supports all indian languages
            low-data users.
          </p>
        </details>
      </div>
    </section>
  );
}
