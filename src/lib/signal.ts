/**
 * Pure math for the S-meter's real-signal path (issue #8).
 *
 * `Radio.tsx` feeds `AnalyserNode.getByteFrequencyData` output into these
 * functions. Keeping the math here — no DOM, no Web Audio — means it can be
 * unit-tested under Node (the vitest environment) and reused by any future
 * VU-style widget.
 */

/** Per-bin frequency magnitude, 0..255 (AnalyserNode.getByteFrequencyData). */
export type FrequencyData = Uint8Array;

// Weight the low-frequency bins more heavily: on a real shortwave stream the
// low band carries the content while the high bins are mostly hiss. A flat
// average would over-read a hiss-only stream.
const LOW_BAND_GAIN = 2;
const HIGH_BAND_GAIN = 1;
// Fraction of the bin count that counts as "low band".
const LOW_BAND_FRACTION = 0.35;
// Perceptual curve exponent — raw averages are dominated by silence, so a
// light root keeps quiet-but-live streams visibly above the floor.
const PERCEPTUAL_EXP = 0.6;

/** Clamp to 0..1, treating non-finite input as 0. */
export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Map raw frequency-domain data to a 0..100 signal level.
 *
 * Weighted (low-band-weighted) average of bin magnitudes, raised through a
 * perceptual curve, hard-clamped to 0..100. Pure and deterministic: same
 * input, same output.
 */
export function signalFromFrequencyData(data: FrequencyData): number {
  if (data.length === 0) return 0;
  const lowCut = Math.max(1, Math.floor(data.length * LOW_BAND_FRACTION));
  let sum = 0;
  let weight = 0;
  for (let i = 0; i < data.length; i++) {
    const g = i < lowCut ? LOW_BAND_GAIN : HIGH_BAND_GAIN;
    sum += data[i] * g;
    weight += g;
  }
  const avg = sum / weight; // 0..255
  const perceptual = Math.pow(avg / 255, PERCEPTUAL_EXP);
  return clamp01(perceptual) * 100;
}

/**
 * VU-ballistics smoothing: fast attack, slow release — the same asymmetry a
 * physical S-meter needle has, so a live stream reads lively without the
 * needle jittering on every 400 ms sample.
 *
 * `attack`/`release` are fractions of the remaining distance closed per
 * tick (e.g. 0.5 = "close half the gap this tick").
 */
export function smoothSignal(
  prev: number,
  target: number,
  attack = 0.5,
  release = 0.15,
): number {
  const t = clamp01(target / 100) * 100;
  const rate = t > prev ? attack : release;
  const next = prev + (t - prev) * rate;
  return Math.min(100, Math.max(0, next));
}
