/**
 * User-defined stations (issue #16).
 *
 * The built-in catalogue in `stations.ts` stays as seed data. Everything the
 * listener adds themselves lives here: validation, merging with the built-ins
 * and localStorage persistence. Pure functions only — no store, no DOM — so
 * the merge and validation rules are unit-testable under Node.
 *
 * Merge policy (documented in the README):
 * - Within each band a user station whose frequency collides with a built-in
 *   REPLACES the built-in: the listener's own dial-in wins.
 * - All other user stations are inserted into their band, sorted by
 *   frequency ascending, so the TUNING dial walks stations in band order.
 * - With zero user stations the built-in list is returned verbatim (no
 *   re-ordering — regression guard for the existing suite).
 */
import { BANDS, STATIONS, type Band, type Station } from "./stations";

export const USER_STATIONS_KEY = "soviet-radio-user-stations";

/** Listener-facing input shape: what the add/edit form collects. */
export type UserStationInput = {
  name: string;
  band: Band;
  frequency: number; // in the band's unit (kHz for DV/SV, MHz for KV/UKV)
  streamUrl: string;
};

export type AddStationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** The unit each band's dial is expressed in (drives the form + validation). */
export const BAND_FREQ_UNIT: Record<Band, "kHz" | "MHz"> = {
  DV: "kHz",
  SV: "kHz",
  KV: "MHz",
  UKV: "MHz",
};

/** Plausible dial ranges per band (kHz for LW/MW, MHz for SW/FM). */
const BAND_FREQ_RANGE: Record<Band, [number, number]> = {
  DV: [100, 2000],
  SV: [100, 2000],
  KV: [1.5, 40],
  UKV: [7, 108],
};

const BAND_IDS: Band[] = BANDS.map((b) => b.id);

/**
 * Validate a user station entry. Returns an error message for the form, or
 * null when the entry is acceptable. Deliberately strict about the stream
 * URL (must be http/https) — a garbage URL would only produce a dead needle.
 */
export function validateUserStation(input: UserStationInput): string | null {
  const name = (input.name ?? "").trim();
  if (!name) return "Название / Name is required";
  if (name.length > 60) return "Name is too long (max 60 characters)";

  if (!BAND_IDS.includes(input.band)) return "Unknown band";

  const freq = Number(input.frequency);
  if (!Number.isFinite(freq) || freq <= 0) {
    return "Frequency must be a positive number";
  }
  const [lo, hi] = BAND_FREQ_RANGE[input.band];
  if (freq < lo || freq > hi) {
    return `Frequency out of range for ${input.band} (${lo}–${hi} ${BAND_FREQ_UNIT[input.band]})`;
  }

  const url = (input.streamUrl ?? "").trim();
  if (!url) return "Stream URL is required";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Stream URL is not a valid URL";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "Stream URL must be http(s)";
  }
  return null;
}

/** Fresh, collision-avoiding id for a user station. */
export function nextUserStationId(existing: string[] = []): string {
  let id: string;
  do {
    id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existing.includes(id));
  return id;
}

/** Build a full Station record from validated form input. */
export function makeUserStation(id: string, input: UserStationInput): Station {
  const name = input.name.trim();
  return {
    id,
    callsign: name.toUpperCase().slice(0, 24),
    nameRu: name,
    nameEn: name,
    city: "Пользователь",
    band: input.band,
    frequency: Number(input.frequency),
    freqUnit: BAND_FREQ_UNIT[input.band],
    streamUrl: input.streamUrl.trim(),
    genre: "Своя станция",
  };
}

const FREQ_EPSILON = 0.005;

function sameFrequency(a: Station, b: Station): boolean {
  return Math.abs(a.frequency - b.frequency) < FREQ_EPSILON;
}

/**
 * Merge built-ins with user stations (policy above). Returns a new array;
 * the built-in `STATIONS` records themselves are never mutated.
 */
export function mergeStations(userStations: Station[] = []): Station[] {
  if (userStations.length === 0) return STATIONS;

  const byBand = new Map<Band, Station[]>();
  for (const band of BAND_IDS) byBand.set(band, []);
  for (const s of STATIONS) byBand.get(s.band)!.push(s);

  for (const u of userStations) {
    const list = byBand.get(u.band);
    if (!list) continue; // corrupt entry from an older version — skip
    const i = list.findIndex((s) => sameFrequency(s, u));
    if (i >= 0) list[i] = u;
    else list.push(u);
  }

  for (const list of byBand.values()) {
    list.sort((a, b) => a.frequency - b.frequency);
  }
  return [...byBand.get("DV")!, ...byBand.get("SV")!, ...byBand.get("KV")!, ...byBand.get("UKV")!];
}

function isBand(v: unknown): v is Band {
  return typeof v === "string" && (BAND_IDS as string[]).includes(v);
}

/**
 * Rebuild a station record from a persisted JSON value, discarding anything
 * malformed (hand-edited localStorage, schema drift). Mirrors the
 * clamp/validate pattern used by loadPersistedState in radio-store.ts.
 */
function reviveUserStation(raw: unknown): Station | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string" || p.id === "" || !p.id.startsWith("user-")) return null;
  if (!isBand(p.band)) return null;
  const freq = Number(p.frequency);
  if (!Number.isFinite(freq) || freq <= 0) return null;
  if (typeof p.streamUrl !== "string" || p.streamUrl === "") return null;
  if (typeof p.nameRu !== "string" || p.nameRu.trim() === "") return null;
  const unit = p.freqUnit === "kHz" || p.freqUnit === "MHz" ? p.freqUnit : BAND_FREQ_UNIT[p.band];
  return {
    id: p.id,
    callsign: typeof p.callsign === "string" ? p.callsign : p.nameRu.toUpperCase(),
    nameRu: p.nameRu,
    nameEn: typeof p.nameEn === "string" ? p.nameEn : p.nameRu,
    city: typeof p.city === "string" ? p.city : "Пользователь",
    band: p.band,
    frequency: freq,
    freqUnit: unit,
    streamUrl: p.streamUrl,
    genre: typeof p.genre === "string" ? p.genre : "Своя станция",
  };
}

/**
 * Load and validate persisted user stations. Corrupt blob or broken entries
 * are dropped rather than fatal — a bad localStorage line must never kill
 * the radio on boot.
 */
export function loadUserStations(): Station[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USER_STATIONS_KEY);
    if (raw == null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(reviveUserStation).filter((s): s is Station => s !== null);
  } catch {
    return [];
  }
}

/** Persist user stations. Fire-and-forget: a failed write is not fatal. */
export function saveUserStations(list: Station[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_STATIONS_KEY, JSON.stringify(list));
  } catch {
    // private mode / storage full — in-memory list stays authoritative
  }
}
