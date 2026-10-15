import { describe, expect, it } from "vitest";
import {
  clamp01,
  signalFromFrequencyData,
  smoothSignal,
} from "./signal";

describe("clamp01", () => {
  it("clamps to [0,1]", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
  });

  it("treats non-finite input as 0", () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
  });
});

describe("signalFromFrequencyData", () => {
  it("is 0 for empty data", () => {
    expect(signalFromFrequencyData(new Uint8Array(0))).toBe(0);
  });

  it("is 0 for silence", () => {
    const data = new Uint8Array(128).fill(0);
    expect(signalFromFrequencyData(data)).toBe(0);
  });

  it("is 100 for full-scale bins", () => {
    const data = new Uint8Array(128).fill(255);
    expect(signalFromFrequencyData(data)).toBe(100);
  });

  it("monotonically increases with magnitude", () => {
    const quiet = new Uint8Array(128).fill(32);
    const mid = new Uint8Array(128).fill(128);
    const loud = new Uint8Array(128).fill(224);
    const q = signalFromFrequencyData(quiet);
    const m = signalFromFrequencyData(mid);
    const l = signalFromFrequencyData(loud);
    expect(q).toBeGreaterThan(0);
    expect(m).toBeGreaterThan(q);
    expect(l).toBeGreaterThan(m);
    expect(l).toBeLessThanOrEqual(100);
  });

  it("weights low-band bins more heavily than high-band bins", () => {
    // All energy in the low third.
    const low = new Uint8Array(128);
    low.fill(255, 0, Math.floor(128 * 0.35));
    // All energy in the high two-thirds.
    const high = new Uint8Array(128);
    high.fill(255, Math.floor(128 * 0.35), 128);
    expect(signalFromFrequencyData(low)).toBeGreaterThan(
      signalFromFrequencyData(high),
    );
  });

  it("is deterministic (same input, same output)", () => {
    const a = new Uint8Array([10, 20, 30, 40, 250, 0, 99, 128]);
    expect(signalFromFrequencyData(a)).toBe(signalFromFrequencyData(a));
  });

  it("never returns outside [0,100]", () => {
    // A pathological input: first bin maxed, rest zero.
    const spike = new Uint8Array(64);
    spike[0] = 255;
    const v = signalFromFrequencyData(spike);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });
});

describe("smoothSignal", () => {
  it("is a no-op when target equals current", () => {
    expect(smoothSignal(50, 50)).toBe(50);
  });

  it("closes part of the gap on attack (rising)", () => {
    const next = smoothSignal(0, 100, 0.5, 0.15);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(100);
    expect(next).toBe(50);
  });

  it("releases slower than it attacks", () => {
    const afterAttack = smoothSignal(0, 100, 0.5, 0.15);
    const afterRelease = smoothSignal(100, 0, 0.5, 0.15);
    // Attack closed 50pt of 100; release closed only 15pt of 100.
    expect(100 - afterRelease).toBeLessThan(afterAttack);
  });

  it("clamps results to [0,100]", () => {
    expect(smoothSignal(0, 1000, 0.5, 0.15)).toBeLessThanOrEqual(100);
    expect(smoothSignal(100, -50, 0.5, 0.15)).toBeGreaterThanOrEqual(0);
  });

  it("repeatedly converging from silence approaches the target", () => {
    let v = 0;
    for (let i = 0; i < 40; i++) v = smoothSignal(v, 80, 0.5, 0.15);
    expect(v).toBeGreaterThan(75);
    expect(v).toBeLessThanOrEqual(80);
  });

  it("repeatedly converging from full approaches the target from above", () => {
    let v = 100;
    for (let i = 0; i < 60; i++) v = smoothSignal(v, 20, 0.5, 0.15);
    expect(v).toBeLessThanOrEqual(25);
    expect(v).toBeGreaterThanOrEqual(20);
  });
});
