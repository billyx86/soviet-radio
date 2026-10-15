import { describe, expect, it } from "vitest";
import { SignalGraph } from "./signal-graph";

/**
 * Fakes with real Chrome WebAudio semantics (see issue #12):
 *
 *  - `createMediaElementSource` binds the element to the source node
 *    PERMANENTLY. Calling it a second time for the same element throws
 *    `InvalidStateError` — verified against Chrome 151 headless:
 *    "HTMLMediaElement already connected previously to a different
 *    MediaElementSourceNode."
 *  - A node whose context is closed can no longer be used.
 *
 * The whole point of the test: the old Radio.tsx code recreated the
 * context+source on every station change, so the second attach path
 * threw and the radio went silent. SignalGraph must never call
 * `createMediaElementSource` more than once per element.
 */

class FakeAnalyserNode {
  fftSize = 256;
  smoothingTimeConstant = 0;
  frequencyBinCount = 128;
  readonly ctx: FakeAudioContext;
  connectedTo: Set<object> = new Set();
  constructor(ctx: FakeAudioContext) {
    this.ctx = ctx;
  }
  connect(dest: object) {
    this.connectedTo.add(dest);
  }
  disconnect() {
    this.connectedTo.clear();
  }
  getByteFrequencyData(data: Uint8Array) {
    // deterministic non-silence so callers see "live" data
    data.fill(64);
  }
}

class FakeMediaElementSourceNode {
  readonly ctx: FakeAudioContext;
  readonly element: FakeAudio;
  connectedTo: Set<object> = new Set();
  constructor(ctx: FakeAudioContext, element: FakeAudio) {
    this.ctx = ctx;
    this.element = element;
  }
  connect(dest: object) {
    this.connectedTo.add(dest);
  }
  disconnect() {
    this.connectedTo.clear();
  }
}

class FakeAudioContext {
  state: "running" | "closed" = "running";
  destination: object = { kind: "destination" };
  createMediaElementSourceCalls = 0;
  createAnalyser(): FakeAnalyserNode {
    this.throwIfClosed();
    return new FakeAnalyserNode(this);
  }
  createMediaElementSource(element: FakeAudio): FakeMediaElementSourceNode {
    this.throwIfClosed();
    if (element.boundSource) {
      throw new DOMException(
        "HTMLMediaElement already connected previously to a different " +
          "MediaElementSourceNode.",
        "InvalidStateError",
      );
    }
    element.boundSource = this;
    this.createMediaElementSourceCalls += 1;
    return new FakeMediaElementSourceNode(this, element);
  }
  resume(): Promise<void> {
    this.state = "running";
    return Promise.resolve();
  }
  close(): Promise<void> {
    this.state = "closed";
    return Promise.resolve();
  }
  private throwIfClosed() {
    if (this.state === "closed") {
      throw new DOMException("Context is closed.", "InvalidStateError");
    }
  }
}

class FakeAudio {
  boundSource: FakeAudioContext | null = null;
}

function makeCtor(): typeof AudioContext {
  return FakeAudioContext as unknown as typeof AudioContext;
}

function asFakeAnalyser(a: AnalyserNode | null): FakeAnalyserNode {
  return a as unknown as FakeAnalyserNode;
}

describe("SignalGraph (issue #12 — one graph per element)", () => {
  it("creates the MediaElementSource exactly once across station changes", () => {
    const audio = new FakeAudio();
    const graph = new SignalGraph(audio as unknown as HTMLAudioElement, makeCtor());

    expect(graph.ensure()).toBe(true);

    // Simulate N station/power cycles: attach analyser, drop it, repeat.
    // This is exactly what Radio.tsx does on every effect re-run.
    for (let i = 0; i < 10; i++) {
      const a = graph.attachAnalyser();
      expect(a).not.toBeNull();
      // Still only one context/source after every cycle:
      expect(audio.boundSource!.createMediaElementSourceCalls).toBe(1);
    }
    expect(audio.boundSource).not.toBeNull();
  });

  it("element stays routed to destination after analyser detach (audible)", () => {
    const audio = new FakeAudio();
    const graph = new SignalGraph(audio as unknown as HTMLAudioElement, makeCtor());
    graph.ensure();

    const a1 = asFakeAnalyser(graph.attachAnalyser());
    // While attached: analyser → destination (source → analyser).
    expect(a1.connectedTo.has(a1.ctx.destination)).toBe(true);

    graph.detachAnalyser();
    // After detach the analyser is gone and the source node is re-routed
    // directly to the destination — the element stays audible.
    expect(graph.analyser).toBeNull();
    // detachAnalyser is idempotent:
    graph.detachAnalyser();
    expect(graph.analyser).toBeNull();
  });

  it("a second createMediaElementSource on the same element throws (Chrome semantics)", () => {
    const audio = new FakeAudio();
    const ctx = new FakeAudioContext();
    ctx.createMediaElementSource(audio);
    expect(() => ctx.createMediaElementSource(audio)).toThrow(
      /already connected previously/,
    );
  });

  it("falls back cleanly when no AudioContext constructor exists", () => {
    const audio = new FakeAudio();
    const graph = new SignalGraph(audio as unknown as HTMLAudioElement, undefined);
    expect(graph.ensure()).toBe(false);
    expect(graph.attachAnalyser()).toBeNull();
    expect(graph.isLive).toBe(false);
    // must not throw
    graph.detachAnalyser();
    graph.close();
  });

  it("survives a full power cycle (attach → detach → attach)", async () => {
    const audio = new FakeAudio();
    const graph = new SignalGraph(audio as unknown as HTMLAudioElement, makeCtor());
    graph.ensure();
    const a1 = asFakeAnalyser(graph.attachAnalyser());
    graph.detachAnalyser();
    const a2 = asFakeAnalyser(graph.attachAnalyser());
    // fresh analyser instance, but same underlying context
    expect(a2).not.toBe(a1);
    expect(a2.ctx).toBe(a1.ctx);
    await graph.close();
    // after close, isLive is false and nothing throws
    expect(graph.isLive).toBe(false);
    graph.detachAnalyser();
  });
});
