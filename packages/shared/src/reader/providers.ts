import type { CharacterAlignment } from "./types.js";

/**
 * Shape of the `alignment` object ElevenLabs' with-timestamps endpoint
 * returns (snake_case, as the API sends it) for the *original* text — see
 * docs/decisions/0007-word-timings.md on why we align to that one, not the
 * normalized one.
 */
export type ElevenLabsAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export function fromElevenLabsAlignment(raw: ElevenLabsAlignment): CharacterAlignment {
  return {
    characters: raw.characters,
    characterStartTimesSeconds: raw.character_start_times_seconds,
    characterEndTimesSeconds: raw.character_end_times_seconds,
  };
}
