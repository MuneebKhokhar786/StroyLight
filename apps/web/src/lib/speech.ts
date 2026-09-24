/**
 * On-device speech, used only for the "help" affordances (tap a word,
 * press-and-hold a sentence) — never for the narration itself. This is the
 * documented fallback for word help when no isolated per-word audio clip
 * exists yet (section 5.6, section 8.6), which is our reality until the AI
 * pipeline (Phase 2) produces real cached clips.
 */
export function speak(text: string, rate = 0.9): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
