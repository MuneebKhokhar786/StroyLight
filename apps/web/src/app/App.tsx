import { BigButton } from "../ui/BigButton.js";

/**
 * The reviewer path starts here — one paragraph, one Start button, and links
 * for engineers. See docs/decisions and section 1.3 of the technical plan.
 */
export function App() {
  return (
    <main className="landing">
      <h1>Storylight</h1>
      <p>
        A child co-creates a story where they&rsquo;re the hero, then gradually takes over the
        reading. Best on iPad.
      </p>
      <BigButton onClick={() => alert("Hero builder lands in Phase 1.")}>Start</BigButton>
      <nav className="engineer-links">
        <a href="https://github.com/" target="_blank" rel="noreferrer">
          Repo
        </a>
        <a href="/internal">Internal</a>
      </nav>
    </main>
  );
}
