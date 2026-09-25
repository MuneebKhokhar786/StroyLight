import { useEffect, useMemo, useRef, useState } from "react";
import type { ReaderMode, Story, StoryPage } from "@storylight/shared";
import { BigButton } from "../../ui/BigButton.js";
import { postPageCompletion } from "../../lib/api.js";
import { ModeSwitcher } from "./ModeSwitcher.js";
import { WordText } from "./WordText.js";
import { useNarration } from "./useNarration.js";
import { cancelSpeech } from "../../lib/speech.js";

type ReaderProps = {
  story: Story;
  profileId: string;
  onFinished: () => void;
};

function sentenceText(page: StoryPage, sentenceIndex: number): string {
  const tokens = page.tokens.filter((t) => t.sentence === sentenceIndex);
  if (tokens.length === 0) return "";
  const first = tokens[0]!;
  const last = tokens.at(-1)!;
  return page.text.slice(first.start, last.end);
}

export function Reader({ story, profileId, onFinished }: ReaderProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [mode, setMode] = useState<ReaderMode>("listen");
  const [currentLine, setCurrentLine] = useState(0);
  const [illustrationFailed, setIllustrationFailed] = useState(false);

  const page = story.pages[pageIndex]!;
  const pageEnterRef = useRef(Date.now());
  const narration = useNarration(page, mode);

  useEffect(() => {
    pageEnterRef.current = Date.now();
    setCurrentLine(0);
    setIllustrationFailed(false);
  }, [pageIndex, mode]);

  useEffect(() => {
    return () => cancelSpeech();
  }, [pageIndex]);

  const lastSentence = page.tokens.at(-1)?.sentence ?? 0;

  const highlight = useMemo(() => {
    if (mode === "read_it_myself") {
      return { kind: "sentence" as const, sentenceIndex: currentLine };
    }
    if (narration.phase.kind === "narrating") {
      // Fallback matrix (section 5.6): word-level timing highlights the
      // word; anything less precise highlights the whole sentence instead
      // of a single word landing in the middle of a shared timing window.
      if (page.timingQuality === "word") {
        return { kind: "word" as const, wordIndex: narration.phase.word };
      }
      const sentenceIndex = page.tokens[narration.phase.word]?.sentence ?? 0;
      return { kind: "sentence" as const, sentenceIndex };
    }
    if (narration.phase.kind === "awaitingStarWord") {
      return { kind: "starWord" as const, wordIndex: narration.phase.word };
    }
    return { kind: "none" as const };
  }, [mode, currentLine, narration.phase, page]);

  async function recordCompletion() {
    try {
      await postPageCompletion(profileId, {
        pageId: page.id,
        mode,
        dwellMs: Date.now() - pageEnterRef.current,
        helpTaps: narration.helpTaps,
        starResults: narration.starResults.map((r) => ({ wordIndex: r.wordIndex, selfChecked: r.selfChecked })),
      });
    } catch (err) {
      // Progress tracking is best-effort: reading itself never blocks on it,
      // and a child mid-story never sees this. Still logged so a real
      // outage (the "Should"-tier offline outbox this doesn't try to be)
      // shows up somewhere instead of vanishing silently.
      console.error("page completion failed to record", err);
    }
  }

  async function goToNextPage() {
    await recordCompletion();
    if (pageIndex + 1 < story.pages.length) {
      setPageIndex(pageIndex + 1);
    } else {
      onFinished();
    }
  }

  function goToPreviousPage() {
    if (pageIndex > 0) setPageIndex(pageIndex - 1);
  }

  const canAdvanceLine = mode === "read_it_myself" && currentLine < lastSentence;

  return (
    <div className="reader">
      <ModeSwitcher mode={mode} onChange={setMode} />

      <div className="reader-page">
        {illustrationFailed ? (
          // Section 5.6: illustration fails -> soft placeholder, story
          // continues. This fallback is pure CSS (no network request), so
          // it can never itself fail the way an image asset can.
          <div className="reader-illustration reader-illustration--fallback" aria-hidden="true" />
        ) : (
          <img
            src={page.illustrationUrl}
            alt=""
            className="reader-illustration"
            decoding="async"
            onError={() => setIllustrationFailed(true)}
          />
        )}

        {narration.phase.kind === "awaitingFirstTap" ? (
          <BigButton onClick={narration.unlock}>Tap to start</BigButton>
        ) : (
          <WordText
            page={page}
            highlight={highlight}
            dimOutsideSentence={mode === "read_it_myself" ? currentLine : undefined}
            onTapWord={narration.tapWord}
          />
        )}

        {mode === "read_it_myself" && (
          <button
            type="button"
            className="sentence-replay"
            onClick={() => narration.speakSentence(sentenceText(page, currentLine))}
          >
            🔊 Hear this line
          </button>
        )}
      </div>

      <nav className="reader-nav">
        <button type="button" className="reader-nav__arrow" onClick={goToPreviousPage} disabled={pageIndex === 0}>
          ←
        </button>

        {mode === "read_it_myself" && canAdvanceLine ? (
          <BigButton onClick={() => setCurrentLine((l) => l + 1)}>Next line</BigButton>
        ) : (
          <BigButton onClick={goToNextPage}>
            {pageIndex + 1 < story.pages.length ? "Next page" : "The End"}
          </BigButton>
        )}

        <button
          type="button"
          className="reader-nav__arrow"
          onClick={() => setPageIndex((p) => Math.min(p + 1, story.pages.length - 1))}
          disabled={pageIndex + 1 >= story.pages.length}
        >
          →
        </button>
      </nav>

      <p className="reader-page-count">
        Page {pageIndex + 1} of {story.pages.length}
      </p>
    </div>
  );
}
