import { Fragment } from "react";
import type { StoryPage } from "@storylight/shared";

type Highlight =
  | { kind: "none" }
  | { kind: "word"; wordIndex: number }
  | { kind: "starWord"; wordIndex: number }
  | { kind: "sentence"; sentenceIndex: number };

type WordTextProps = {
  page: StoryPage;
  highlight: Highlight;
  dimOutsideSentence?: number | undefined;
  onTapWord: (wordIndex: number) => void;
};

/**
 * Renders the page's exact display text, reconstructed token-by-token so
 * punctuation and spacing are pixel-identical to `page.text` (section 5.5:
 * "text is a normal paragraph to VoiceOver"). Every word is its own tap
 * target; -webkit-touch-callout is disabled in CSS so a long-press on a
 * word doesn't pop the OS lookup menu instead of our own handling.
 */
export function WordText({ page, highlight, dimOutsideSentence, onTapWord }: WordTextProps) {
  const { text, tokens } = page;
  let cursor = 0;
  const pieces: React.ReactNode[] = [];

  tokens.forEach((token, idx) => {
    if (token.start > cursor) {
      pieces.push(<Fragment key={`gap-${idx}`}>{text.slice(cursor, token.start)}</Fragment>);
    }

    const isCurrentWord =
      (highlight.kind === "word" || highlight.kind === "starWord") && highlight.wordIndex === idx;
    const isStarWord = highlight.kind === "starWord" && highlight.wordIndex === idx;
    const isCurrentSentence = highlight.kind === "sentence" && highlight.sentenceIndex === token.sentence;
    const isDimmed = dimOutsideSentence !== undefined && token.sentence !== dimOutsideSentence;

    const classNames = [
      "word",
      isCurrentWord && "word--active",
      isStarWord && "word--star-waiting",
      isCurrentSentence && "word--active",
      isDimmed && "word--dimmed",
    ]
      .filter(Boolean)
      .join(" ");

    pieces.push(
      <button
        key={token.i}
        type="button"
        className={classNames}
        onClick={() => onTapWord(idx)}
        aria-label={`Hear "${token.text}"`}
      >
        {token.text}
      </button>,
    );

    cursor = token.end;
  });

  if (cursor < text.length) {
    pieces.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  }

  return <p className="reader-text">{pieces}</p>;
}
