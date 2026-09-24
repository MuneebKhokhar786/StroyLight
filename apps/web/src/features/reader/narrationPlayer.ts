/**
 * Playback engine seam (section 5.3). The reader only ever talks to this
 * interface, so swapping a real audio file in for a page never touches
 * component code — it's purely which implementation gets constructed.
 */
export interface NarrationPlayer {
  load(src: string): Promise<void>;
  play(): void;
  pause(): void;
  seek(ms: number): void;
  /** Play only [startMs, endMs) — used for sentence replay on long-press. */
  playRange(startMs: number, endMs: number): void;
  nowMs(): number;
  onEnded(cb: () => void): void;
  destroy(): void;
}

/**
 * One reused <audio> element per page, unlocked on the first tap — iOS
 * grants playback per element, not per app (section 5.3).
 */
export class MediaElementPlayer implements NarrationPlayer {
  private readonly audio: HTMLAudioElement;
  private endedCb: (() => void) | null = null;
  private rangeEndMs: number | null = null;
  private rafId: number | null = null;

  constructor(audio: HTMLAudioElement = new Audio()) {
    this.audio = audio;
    this.audio.addEventListener("ended", () => this.endedCb?.());
  }

  async load(src: string): Promise<void> {
    this.audio.src = src;
    this.audio.load();
    await new Promise<void>((resolve) => {
      const onReady = () => {
        this.audio.removeEventListener("loadedmetadata", onReady);
        this.audio.removeEventListener("error", onReady);
        resolve();
      };
      this.audio.addEventListener("loadedmetadata", onReady, { once: true });
      this.audio.addEventListener("error", onReady, { once: true });
    });
  }

  play(): void {
    void this.audio.play();
  }

  pause(): void {
    this.audio.pause();
    this.stopRangeWatch();
  }

  seek(ms: number): void {
    this.audio.currentTime = ms / 1000;
  }

  playRange(startMs: number, endMs: number): void {
    this.seek(startMs);
    this.rangeEndMs = endMs;
    this.play();
    this.watchRangeEnd();
  }

  nowMs(): number {
    return this.audio.currentTime * 1000;
  }

  onEnded(cb: () => void): void {
    this.endedCb = cb;
  }

  destroy(): void {
    this.stopRangeWatch();
    this.audio.pause();
    this.audio.removeAttribute("src");
  }

  private watchRangeEnd(): void {
    const tick = () => {
      if (this.rangeEndMs !== null && this.nowMs() >= this.rangeEndMs) {
        this.pause();
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopRangeWatch(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.rangeEndMs = null;
  }
}

/**
 * Clock-driven, no audio element at all — used for E2E and, per section
 * 5.3, "the no-audio fallback." That's exactly our situation until the AI
 * pipeline produces real narration: the fixture story has word timings but
 * no audio file, so the reader still gets a moving highlight to follow.
 */
export class SimulatedPlayer implements NarrationPlayer {
  private startedAtMs = 0;
  private elapsedMs = 0;
  private running = false;
  private endedCb: (() => void) | null = null;
  private durationMs = 0;
  private rangeEndMs: number | null = null;
  private rafId: number | null = null;

  async load(_src: string): Promise<void> {
    this.elapsedMs = 0;
    this.running = false;
  }

  setDurationMs(durationMs: number): void {
    this.durationMs = durationMs;
  }

  play(): void {
    if (this.running) return;
    this.startedAtMs = performance.now() - this.elapsedMs;
    this.running = true;
    this.watch();
  }

  pause(): void {
    if (!this.running) return;
    this.elapsedMs = performance.now() - this.startedAtMs;
    this.running = false;
    this.stopWatch();
  }

  seek(ms: number): void {
    this.elapsedMs = ms;
    if (this.running) this.startedAtMs = performance.now() - this.elapsedMs;
  }

  playRange(startMs: number, endMs: number): void {
    this.seek(startMs);
    this.rangeEndMs = endMs;
    this.play();
  }

  nowMs(): number {
    return this.running ? performance.now() - this.startedAtMs : this.elapsedMs;
  }

  onEnded(cb: () => void): void {
    this.endedCb = cb;
  }

  destroy(): void {
    this.stopWatch();
  }

  private watch(): void {
    const tick = () => {
      const now = this.nowMs();
      if (this.rangeEndMs !== null && now >= this.rangeEndMs) {
        this.pause();
        this.rangeEndMs = null;
        return;
      }
      if (this.rangeEndMs === null && this.durationMs > 0 && now >= this.durationMs) {
        this.pause();
        this.endedCb?.();
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopWatch(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}
