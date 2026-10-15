/**
 * WebAudio signal-graph lifecycle for the S-meter (issue #12).
 *
 * Chrome throws `InvalidStateError` when `createMediaElementSource()` is
 * called a second time for the same HTMLMediaElement — the element stays
 * bound to the *first* MediaElementSourceNode forever, and once that node's
 * AudioContext is closed the element goes permanently silent: the S-meter
 * degrades to the simulated needle while the speaker stays dead.
 *
 * Rule enforced here:
 *   - exactly one AudioContext + one MediaElementSourceNode per audio
 *     element, created lazily on first use, never re-created;
 *   - only the AnalyserNode is swapped per playback session;
 *   - when analysis is dropped, the element is re-routed straight to the
 *     destination so audio stays audible.
 *
 * The lifecycle is unit-testable under Node (see signal-graph.test.ts) by
 * injecting the AudioContext constructor.
 */

/** Resolve the (possibly webkit-prefixed) AudioContext constructor, if any. */
export function resolveAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

export class SignalGraph {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  /** Where the source node is currently routed: "direct" | "analyser" | null. */
  private routed: "direct" | "analyser" | null = null;

  analyser: AnalyserNode | null = null;

  constructor(
    private readonly audio: HTMLAudioElement,
    private readonly Ctor: typeof AudioContext | undefined,
  ) {}

  /**
   * Lazily create the per-element context + source node. Idempotent — the
   * ctx guard is what guarantees `createMediaElementSource` runs at most
   * once per element (a second call would throw InvalidStateError).
   */
  ensure(): boolean {
    if (this.ctx) return true;
    if (!this.Ctor) return false;
    try {
      const ctx = new this.Ctor();
      const source = ctx.createMediaElementSource(this.audio);
      this.ctx = ctx;
      this.source = source;
      return true;
    } catch {
      this.ctx = null;
      this.source = null;
      return false;
    }
  }

  get isLive(): boolean {
    return this.ctx !== null && this.source !== null;
  }

  /** Resume the context after a user gesture (autoplay policy). */
  resume(): void {
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
  }

  /** Re-wire source → fresh analyser → destination. Returns the analyser. */
  attachAnalyser(): AnalyserNode | null {
    if (!this.ctx || !this.source) return null;
    // Drop the old wiring. disconnect() with no args removes all outgoing
    // connections and never throws.
    try {
      this.source.disconnect();
    } catch {
      /* already disconnected */
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        /* already disconnected */
      }
      this.analyser = null;
    }
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256; // 128 bins — plenty for an S-meter
    analyser.smoothingTimeConstant = 0.6;
    this.source.connect(analyser);
    analyser.connect(this.ctx.destination);
    this.analyser = analyser;
    this.routed = "analyser";
    return analyser;
  }

  /** Drop the analyser; route the element straight to destination (audible). */
  detachAnalyser(): void {
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        /* already disconnected */
      }
      this.analyser = null;
    }
    if (!this.ctx || !this.source) return;
    if (this.routed === "direct") return;
    try {
      this.source.disconnect();
    } catch {
      /* noop */
    }
    this.source.connect(this.ctx.destination);
    this.routed = "direct";
  }

  /** Close everything. Call only when the audio element is destroyed. */
  close(): void {
    const ctx = this.ctx;
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    this.routed = null;
    if (ctx && ctx.state !== "closed") {
      void ctx.close().catch(() => {});
    }
  }
}
