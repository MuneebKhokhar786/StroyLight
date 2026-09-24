/**
 * The reading-ladder state machine (section 5.3), factored out as a pure
 * reducer so it's testable without React or a DOM. `word` is always an
 * index into the current page's tokens.
 */
export type ReaderPhase =
  | { kind: "loading" }
  | { kind: "awaitingFirstTap" }
  | { kind: "narrating"; word: number }
  | { kind: "awaitingStarWord"; word: number; deadline: number }
  | { kind: "selfReading" }
  | { kind: "pageDone" };

export type ReaderAction =
  | { type: "PAGE_READY"; hasAudio: boolean }
  | { type: "AUDIO_UNLOCKED" }
  | { type: "WORD_ADVANCED"; word: number }
  | { type: "STAR_WORD_REACHED"; word: number; deadline: number }
  | { type: "STAR_WORD_RESOLVED" }
  | { type: "PAGE_ENDED" }
  | { type: "ENTER_SELF_READING" }
  | { type: "RESET" };

export const initialReaderPhase: ReaderPhase = { kind: "loading" };

export function readerReducer(state: ReaderPhase, action: ReaderAction): ReaderPhase {
  switch (action.type) {
    case "PAGE_READY":
      // No audio to unlock: this is exactly the "no-audio fallback" the
      // SimulatedPlayer exists for (section 5.3) — start right away.
      return action.hasAudio ? { kind: "awaitingFirstTap" } : { kind: "narrating", word: 0 };

    case "AUDIO_UNLOCKED":
      return state.kind === "awaitingFirstTap" ? { kind: "narrating", word: 0 } : state;

    case "WORD_ADVANCED":
      return state.kind === "narrating" ? { kind: "narrating", word: action.word } : state;

    case "STAR_WORD_REACHED":
      return state.kind === "narrating"
        ? { kind: "awaitingStarWord", word: action.word, deadline: action.deadline }
        : state;

    case "STAR_WORD_RESOLVED":
      return state.kind === "awaitingStarWord" ? { kind: "narrating", word: state.word } : state;

    case "PAGE_ENDED":
      return { kind: "pageDone" };

    case "ENTER_SELF_READING":
      return { kind: "selfReading" };

    case "RESET":
      return { kind: "loading" };

    default:
      return state;
  }
}
