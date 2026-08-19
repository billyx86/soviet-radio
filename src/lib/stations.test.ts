import { describe, expect, it } from "vitest";
import {
  BANDS,
  STATIONS,
  formatFreq,
  stationsForBand,
  type Band,
} from "./stations";

describe("STATIONS dataset", () => {
  it("has stations on every band", () => {
    const bandsWithStations = new Set(STATIONS.map((s) => s.band));
    for (const b of BANDS) {
      expect(bandsWithStations.has(b.id)).toBe(true);
    }
  });

  it("has unique station ids", () => {
    const ids = STATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique frequencies within each band", () => {
    for (const band of BANDS.map((b) => b.id as Band)) {
      const freqs = STATIONS.filter((s) => s.band === band).map(
        (s) => s.frequency,
      );
      expect(new Set(freqs).size).toBe(freqs.length);
    }
  });

  it("uses only HTTPS stream URLs", () => {
    for (const s of STATIONS) {
      expect(s.streamUrl).toMatch(/^https:\/\//);
    }
  });

  it("keeps kHz stations in the LW/MW range and MHz in the SW/FM range", () => {
    for (const s of STATIONS) {
      if (s.freqUnit === "kHz") {
        expect(s.frequency).toBeGreaterThan(100);
        expect(s.frequency).toBeLessThan(2000);
      } else {
        expect(s.frequency).toBeGreaterThanOrEqual(7);
        expect(s.frequency).toBeLessThanOrEqual(108);
      }
    }
  });
});

describe("stationsForBand", () => {
  it("returns every station for ALL", () => {
    expect(stationsForBand("ALL")).toHaveLength(STATIONS.length);
  });

  it("filters by band", () => {
    const band = STATIONS[0].band;
    const list = stationsForBand(band);
    expect(list.length).toBeGreaterThan(0);
    for (const s of list) {
      expect(s.band).toBe(band);
    }
  });
});

describe("formatFreq", () => {
  it("renders MHz with two decimals", () => {
    const st = STATIONS.find((s) => s.freqUnit === "MHz")!;
    expect(formatFreq(st)).toBe(st.frequency.toFixed(2));
  });

  it("renders kHz as a rounded integer", () => {
    const st = STATIONS.find((s) => s.freqUnit === "kHz")!;
    expect(formatFreq(st)).toBe(String(Math.round(st.frequency)));
  });
});
