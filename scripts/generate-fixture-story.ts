#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { tokenize, type WordToken } from "@storylight/shared";
import type { Story, StoryPage } from "@storylight/shared";

/**
 * The one hand-written fixture story for Phase 1 (section 16, Phase 1). No
 * AI pipeline exists yet and no TTS/image provider credentials were
 * available, so this story is authored by hand, tokenized offline with the
 * same tokenize() the real pipeline will use at generation time, and given
 * synthetic-but-consistent per-word timings so Reader Mode has something
 * real to render against. See docs/decisions/0007-word-timings.md and
 * apps/web SimulatedPlayer, which is exactly what section 5.3 calls "the
 * no-audio fallback."
 */

const OUTPUT_PATH = "apps/api/fixtures/hand-made/moonlit-forest-01.json";
const ILLUSTRATION_URL = "/worlds/moonlit-forest/placeholder.svg";

// Reading-pace estimate for the SimulatedPlayer clock: a base per-word cost
// plus a per-character cost, roughly matching an unhurried read-aloud pace.
const BASE_WORD_MS = 220;
const MS_PER_CHAR = 55;
const INTER_WORD_GAP_MS = 90;

type PageInput = {
  text: string;
  starWord: string;
};

const pages: PageInput[] = [
  { text: "Nora tiptoed into the moonlit forest with her lantern glowing soft and gold.", starWord: "into" },
  { text: "A friendly owl named Pip blinked down from a tall, sleepy tree.", starWord: "down" },
  { text: "\"Will you help me find my lost acorn?\" asked Pip, hopping closer.", starWord: "help" },
  { text: "Nora and Pip searched under leaves, behind rocks, and inside a hollow log.", starWord: "under" },
  { text: "At last, the little acorn sparkled beside a quiet, bubbling stream.", starWord: "quiet" },
  { text: "Pip hooted with joy, and Nora smiled all the way home.", starWord: "smiled" },
];

function syntheticTimings(tokens: WordToken[]): Array<[number, number]> {
  let cursor = 0;
  return tokens.map((token) => {
    const duration = BASE_WORD_MS + token.text.length * MS_PER_CHAR;
    const start = cursor;
    const end = start + duration;
    cursor = end + INTER_WORD_GAP_MS;
    return [start, end];
  });
}

function buildPage(input: PageInput, pageNumber: number): StoryPage {
  const tokens = tokenize(input.text);
  const starToken = tokens.find((t) => t.norm === input.starWord.toLowerCase());
  if (!starToken) {
    throw new Error(`star word "${input.starWord}" not found in page ${pageNumber}: "${input.text}"`);
  }

  return {
    id: `moonlit-forest-01-p${pageNumber}`,
    pageNumber,
    text: input.text,
    tokens,
    starWordIndices: [starToken.i],
    illustrationUrl: ILLUSTRATION_URL,
    narrationUrl: null,
    timings: syntheticTimings(tokens),
    timingQuality: "word",
  };
}

const story: Story = {
  id: "moonlit-forest-01",
  kind: "original",
  title: "The Lantern of Moonlit Forest",
  worldId: "moonlit-forest",
  pages: pages.map((p, i) => buildPage(p, i + 1)),
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(story, null, 2) + "\n");

console.log(`Wrote ${OUTPUT_PATH} (${story.pages.length} pages, ${story.pages.reduce((n, p) => n + p.tokens.length, 0)} words)`);
