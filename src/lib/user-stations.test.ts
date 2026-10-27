import { describe, expect, it, beforeEach } from "vitest";
import { STATIONS } from "./stations";
import {
  BAND_FREQ_UNIT,
  USER_STATIONS_KEY,
  loadUserStations,
  makeUserStation,
  mergeStations,
  nextUserStationId,
  saveUserStations,
  validateUserStation,
  type UserStationInput,
} from "./user-stations";

const LS = (window as unknown as { localStorage: Storage }).localStorage;

function validInput(overrides: Partial<UserStationInput> = {}): UserStationInput {
  return {
    name: "Мой Маяк",
    band: "KV",
    frequency: 12.34,
    streamUrl: "https://example.com/stream.mp3",
    ...overrides,
  };
}

describe("validateUserStation", () => {
  it("accepts a well-formed entry", () => {
    expect(validateUserStation(validInput())).toBeNull();
  });

  it("requires a name (whitespace-only counts as empty)", () => {
    expect(validateUserStation(validInput({ name: "" }))).toMatch(/required/);
    expect(validateUserStation(validInput({ name: "   " }))).toMatch(/required/);
  });

  it("rejects an unknown band", () => {
    expect(validateUserStation(validInput({ band: "XX" as never }))).toMatch(
      /Unknown band/,
    );
  });

  it("rejects non-positive / non-finite frequencies", () => {
    expect(validateUserStation(validInput({ frequency: 0 }))).toMatch(
      /positive/,
    );
    expect(validateUserStation(validInput({ frequency: NaN }))).toMatch(
      /positive/,
    );
  });

  it("enforces the per-band dial range", () => {
    // KV dial runs 1.5–40 MHz
    expect(validateUserStation(validInput({ band: "KV", frequency: 1.0 }))).toMatch(
      /out of range/,
    );
    expect(validateUserStation(validInput({ band: "KV", frequency: 45 }))).toMatch(
      /out of range/,
    );
    // UKV (FM) is 7–108 MHz
    expect(validateUserStation(validInput({ band: "UKV", frequency: 101.5 }))).toBeNull();
    // DV/SV are kHz dials
    expect(validateUserStation(validInput({ band: "DV", frequency: 171 }))).toBeNull();
    expect(validateUserStation(validInput({ band: "SV", frequency: 900 }))).toBeNull();
  });

  it("requires an http(s) stream URL", () => {
    expect(validateUserStation(validInput({ streamUrl: "" }))).toMatch(/required/);
    expect(validateUserStation(validInput({ streamUrl: "not a url" }))).toMatch(
      /valid URL/,
    );
    expect(validateUserStation(validInput({ streamUrl: "ftp://example.com/x" }))).toMatch(
      /http/,
    );
  });
});

describe("nextUserStationId / makeUserStation", () => {
  it("generates user- ids that avoid collisions with existing ones", () => {
    const a = nextUserStationId();
    expect(a).toMatch(/^user-/);
    const b = nextUserStationId([a]);
    expect(b).not.toBe(a);
  });

  it("builds a full Station with the band-derived unit and callsign", () => {
    const id = nextUserStationId();
    const st = makeUserStation(id, validInput({ band: "UKV", frequency: 99.1 }));
    expect(st.id).toBe(id);
    expect(st.band).toBe("UKV");
    expect(st.freqUnit).toBe("MHz");
    expect(st.frequency).toBe(99.1);
    expect(st.nameRu).toBe("Мой Маяк");
    expect(st.callsign).toBe("МОЙ МАЯК");
    expect(st.streamUrl).toBe("https://example.com/stream.mp3");
  });

  it("exposes one dial unit per band", () => {
    expect(BAND_FREQ_UNIT.DV).toBe("kHz");
    expect(BAND_FREQ_UNIT.SV).toBe("kHz");
    expect(BAND_FREQ_UNIT.KV).toBe("MHz");
    expect(BAND_FREQ_UNIT.UKV).toBe("MHz");
  });
});

describe("mergeStations", () => {
  it("returns the built-in list verbatim when there are no user stations", () => {
    const merged = mergeStations([]);
    expect(merged).toEqual(STATIONS);
    expect(merged).toHaveLength(STATIONS.length);
  });

  it("inserts a user station into its band, sorted by frequency", () => {
    const merged = mergeStations([
      makeUserStation("user-x", validInput({ band: "KV", frequency: 2.0 })),
    ]);
    const kv = merged.filter((s) => s.band === "KV");
    const ids = kv.map((s) => s.id);
    expect(ids).toContain("user-x");
    // Frequencies strictly non-decreasing within the band.
    const freqs = kv.map((s) => s.frequency);
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeGreaterThanOrEqual(freqs[i - 1]!);
    }
    // 2.0 MHz sorts before 7.31 MHz (СЕКРЕТ-9), the lowest built-in KV.
    expect(kv[0]!.id).toBe("user-x");
    expect(merged).toHaveLength(STATIONS.length + 1);
  });

  it("lets a user station replace a built-in on frequency collision", () => {
    const builtIn = STATIONS.find((s) => s.id === "orbit-12")!;
    const merged = mergeStations([
      makeUserStation("user-collide", validInput({ frequency: builtIn.frequency })),
    ]);
    // Same total count — replacement, not addition.
    expect(merged).toHaveLength(STATIONS.length);
    const atFreq = merged.filter(
      (s) => Math.abs(s.frequency - builtIn.frequency) < 0.005,
    );
    expect(atFreq).toHaveLength(1);
    expect(atFreq[0]!.id).toBe("user-collide");
    expect(atFreq[0]!.nameRu).toBe("Мой Маяк");
  });

  it("keeps the built-in list intact (records never mutated)", () => {
    const before = JSON.stringify(STATIONS);
    mergeStations([makeUserStation("user-m", validInput())]);
    expect(JSON.stringify(STATIONS)).toBe(before);
  });
});

describe("user station persistence", () => {
  beforeEach(() => LS.clear());

  it("returns [] when nothing is stored", () => {
    expect(loadUserStations()).toEqual([]);
  });

  it("round-trips valid entries through localStorage", () => {
    const st = makeUserStation("user-rt", validInput());
    saveUserStations([st]);
    expect(LS.getItem(USER_STATIONS_KEY)).not.toBeNull();
    expect(loadUserStations()).toEqual([st]);
  });

  it("drops malformed entries but keeps the good ones", () => {
    const good = makeUserStation("user-good", validInput());
    saveUserStations([
      good,
      { ...good, id: "builtin-smuggle", streamUrl: "" } as never, // wrong id prefix + empty URL
      { ...good, id: "user-noband", band: "NOPE" } as never,
      42 as never,
    ]);
    const loaded = loadUserStations();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.id).toBe("user-good");
  });

  it("survives a corrupt blob and a non-array blob", () => {
    LS.setItem(USER_STATIONS_KEY, "{not json");
    expect(loadUserStations()).toEqual([]);
    LS.setItem(USER_STATIONS_KEY, JSON.stringify({ id: "user-x" }));
    expect(loadUserStations()).toEqual([]);
  });
});
