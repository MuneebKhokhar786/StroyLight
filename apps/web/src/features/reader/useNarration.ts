import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { StoryPage } from "@storylight/shared";
import type { ReaderMode } from "@storylight/shared";
import { MediaElementPlayer, SimulatedPlayer, type NarrationPlayer } from "./narrationPlayer.js";
import { initialReaderPhase, readerReducer } from "./state.js";
import { findWordIndexAtTime } from "./timing.js";
import { speak } from "../../lib/speech.js";

/** How long a star word waits for a tap before the narrator reads it (section 5.1). */
const STAR_WORD_WAIT_MS = 4000;

export type StarWordResult = { wordIndex: number; selfChecked: boolean };

type NarrationHandle = {
  phase: ReturnType<typeof readerReducer>;
  /** Tap a word: in Listen/Together this re-hears it; on a star word, this checks it. */
  tapWord: (wordIndex: number) => void;
  /** Long-press a sentence in I'll Read mode to hear the whole thing. */
  speakSentence: (text: string) => void;
  unlock: () => void;
  starResults: StarWordResult[];
  helpTaps: number;
};

/**
 * Drives one page's playback for Listen and Together modes. I'll Read has no
 * auto-advancing narrator at all (section 5.1), so it never constructs a
 * player — see Reader.tsx, which only mounts this hook for the other two.
 */
export function useNarration(page: StoryPage, mode: ReaderMode): NarrationHandle {
  const [phase, dispatch] = useReducer(readerReducer, initialReaderPhase);
  const [starResults, setStarResults] = useState<StarWordResult[]>([]);
  const [helpTaps, setHelpTaps] = useState(0);
  const playerRef = useRef<NarrationPlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const starTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedStarWordsRef = useRef<Set<number>>(new Set());

  const clearStarTimeout = useCallback(() => {
    if (starTimeoutRef.current !== null) {
      clearTimeout(starTimeoutRef.current);
      starTimeoutRef.current = null;
    }
  }, []);

  // (Re)build the player whenever the page changes.
  useEffect(() => {
    dispatch({ type: "RESET" });
    setStarResults([]);
    setHelpTaps(0);
    resolvedStarWordsRef.current = new Set();
    clearStarTimeout();

    const hasAudio = page.narrationUrl !== null;
    const player: NarrationPlayer = hasAudio ? new MediaElementPlayer() : new SimulatedPlayer();
    playerRef.current = player;

    const lastTiming = page.timings.at(-1);
    if (!hasAudio && player instanceof SimulatedPlayer && lastTiming) {
      player.setDurationMs(lastTiming[1]);
    }

    void player.load(page.narrationUrl ?? "").then(() => {
      dispatch({ type: "PAGE_READY", hasAudio });
    });

    return () => {
      player.destroy();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      clearStarTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- page identity (id) is what matters
  }, [page.id]);

  // Auto-play once unlocked/ready, for Listen and Together only.
  useEffect(() => {
    if (mode === "read_it_myself") return;
    if (phase.kind === "narrating" && playerRef.current) {
      playerRef.current.play();
    }
  }, [phase.kind, mode]);

  const resolveStarWord = useCallback(
    (wordIndex: number, selfChecked: boolean) => {
      if (resolvedStarWordsRef.current.has(wordIndex)) return;
      resolvedStarWordsRef.current.add(wordIndex);
      setStarResults((prev) => [...prev, { wordIndex, selfChecked }]);
      clearStarTimeout();
      dispatch({ type: "STAR_WORD_RESOLVED" });
      playerRef.current?.play();
    },
    [clearStarTimeout],
  );

  // The rAF loop: advance the highlighted word, and in Together mode, pause
  // at star words until the child taps or the wait time elapses. `phase.word`
  // itself isn't a dependency (only `phase.kind` is, below) — lastWordRef
  // tracks what we've actually dispatched so we only fire WORD_ADVANCED on a
  // real change instead of every frame (section 5.3: "sets state only when
  // the index changes").
  const lastWordRef = useRef(-1);

  useEffect(() => {
    if (phase.kind !== "narrating" || mode === "read_it_myself") return;
    lastWordRef.current = phase.word;

    const tick = () => {
      const player = playerRef.current;
      if (!player) return;

      const now = player.nowMs();
      const wordIndex = findWordIndexAtTime(page.timings, now);
      const lastEnd = page.timings.at(-1)?.[1] ?? 0;

      if (wordIndex !== -1 && wordIndex !== lastWordRef.current) {
        lastWordRef.current = wordIndex;
        dispatch({ type: "WORD_ADVANCED", word: wordIndex });
      }

      const isStarWord = mode === "together" && page.starWordIndices.includes(wordIndex);
      if (isStarWord && !resolvedStarWordsRef.current.has(wordIndex)) {
        player.pause();
        const deadline = performance.now() + STAR_WORD_WAIT_MS;
        dispatch({ type: "STAR_WORD_REACHED", word: wordIndex, deadline });
        starTimeoutRef.current = setTimeout(() => {
          const token = page.tokens[wordIndex];
          if (token) speak(token.text);
          resolveStarWord(wordIndex, false);
        }, STAR_WORD_WAIT_MS);
        return;
      }

      if (now >= lastEnd) {
        dispatch({ type: "PAGE_ENDED" });
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // phase.word is read fresh via the closure above each tick; only the
    // phase *kind* transition should restart this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind, mode, page, resolveStarWord]);

  const tapWord = useCallback(
    (wordIndex: number) => {
      const token = page.tokens[wordIndex];
      if (!token) return;

      if (phase.kind === "awaitingStarWord" && phase.word === wordIndex) {
        resolveStarWord(wordIndex, true);
        return;
      }

      setHelpTaps((n) => n + 1);
      speak(token.text);
    },
    [page.tokens, phase, resolveStarWord],
  );

  const speakSentence = useCallback((text: string) => {
    setHelpTaps((n) => n + 1);
    speak(text);
  }, []);

  /** The first tap on an audio page — iOS grants playback per element, on a user gesture (section 5.3). */
  const unlock = useCallback(() => {
    dispatch({ type: "AUDIO_UNLOCKED" });
  }, []);

  return {
    phase,
    tapWord,
    speakSentence,
    unlock,
    starResults,
    helpTaps,
  };
}
