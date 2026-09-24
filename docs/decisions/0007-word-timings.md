# 0007: Word-timing strategy and fallbacks

## Status
Accepted

## Context
Reader Mode highlights the word being narrated. ElevenLabs' with-timestamps
endpoint returns character-level alignment (characters plus per-character start
and end times) for the exact text sent, not word-level timings. The device should
never need to understand text shape — tokenizing and aligning at generation time,
once, is cheaper and more testable than doing it per playback on-device.

Alignment isn't guaranteed to be clean: a provider can drop or duplicate
characters, and clock jitter can make consecutive timestamps briefly
non-monotonic. The reader still has to render *something* sensible for a child
mid-story, not throw.

## Decision
`tokenize(text)` (packages/shared/src/reader) splits the exact display string
into `WordToken`s — `{ i, start, end, text, norm, sentence }` — handling curly
apostrophes, contractions, em-dashes, quotes and hyphens as part of tokenization,
not alignment.

`alignWords(text, tokens, alignment)` walks the original text and the provider's
character alignment together, tolerating dropped/extra characters and discarding
non-monotonic timestamps rather than trusting them. It reports word coverage —
the share of tokens that got a valid, monotonic, in-bounds timing — and degrades
gracefully:

- coverage ≥ 95% → `timing_quality = 'word'`, per-word `[startMs, endMs]` pairs.
- some usable timing but below threshold → `timing_quality = 'sentence'`,
  sentence-level spans built from whatever character timings survived.
- no usable timing at all → `timing_quality = 'none'`; the client falls back to
  showing the full page without a moving highlight (section 5.6).

Only compact `[startMs, endMs]` pairs are stored per page. The device never
tokenizes or aligns text — it only renders what generation-time computed.

## Consequences
- One place (server-side, at generation time) owns text-shape logic; the client
  stays simple and fast.
- A provider hiccup degrades to sentence highlighting instead of breaking the
  page, per the fallback matrix in section 5.6.
- The tokenizer and aligner are pure functions with no I/O, so they're fully
  unit-testable without a real TTS call — see `packages/shared/src/reader/*.test.ts`.

## Rejected
On-device alignment from raw audio (e.g. Web Speech API forced alignment) — no
built-in browser primitive for this, and it would duplicate work per playback
instead of once at generation time.
