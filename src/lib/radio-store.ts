import { create } from "zustand";
import { STATIONS, type Band, type Station } from "./stations";
import {
  loadUserStations,
  makeUserStation,
  mergeStations,
  nextUserStationId,
  saveUserStations,
  validateUserStation,
  type AddStationResult,
  type UserStationInput,
} from "./user-stations";

const VOLUME_KEY = "soviet-radio-volume";

function loadVolume(): number {
  if (typeof window === "undefined") return 0.65;
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw == null) return 0.65;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.65;
  } catch {
    return 0.65;
  }
}

const STATE_KEY = "soviet-radio-state";

type PersistedState = {
  powered: boolean;
  tuning: number; // 0..100
  band: Band;
  stationId: string;
};

const DEFAULT_STATE: PersistedState = {
  powered: false,
  tuning: 35,
  band: "SV",
  stationId: STATIONS[0].id,
};

/**
 * Read and validate the persisted tuning state (issue #7: last station, band,
 * tuning and power were lost on reload). The station's own band is
 * authoritative, so a stored band that disagrees with the stored station
 * self-heals. Anything missing, corrupt, or out of range falls back to the
 * defaults, mirroring the loadVolume() clamp/try-catch pattern.
 *
 * User stations (issue #16) are resolved against the merged list, so a
 * reload that lands on a listener-added station stays put.
 */
export function loadPersistedState(userStations: Station[] = []): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (raw == null) return DEFAULT_STATE;
    const p = JSON.parse(raw) as Record<string, unknown> | null;
    if (typeof p !== "object" || p === null) return DEFAULT_STATE;

    const station =
      typeof p.stationId === "string"
        ? mergeStations(userStations).find((s) => s.id === p.stationId)
        : undefined;

    const tuningRaw = Number(p.tuning);
    const tuning = Number.isFinite(tuningRaw)
      ? Math.min(100, Math.max(0, tuningRaw))
      : DEFAULT_STATE.tuning;

    return {
      powered: typeof p.powered === "boolean" ? p.powered : DEFAULT_STATE.powered,
      tuning,
      band: station ? station.band : DEFAULT_STATE.band,
      stationId: station ? station.id : DEFAULT_STATE.stationId,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export type PlayStatus = "idle" | "loading" | "playing" | "error";

type RadioState = {
  powered: boolean;
  volume: number; // 0..1
  tuning: number; // 0..100 dial position
  band: Band;
  stationId: string;
  status: PlayStatus;
  errorMsg: string | null;
  signal: number; // 0..100 visual meter
  signalSimulated: boolean; // true when the needle is a fallback, not a real analyser (issue #15)
  userStations: Station[]; // listener-added stations (issue #16), persisted

  setPowered: (v: boolean) => void;
  setVolume: (v: number) => void;
  setTuning: (v: number) => void;
  setBand: (b: Band) => void;
  selectStation: (id: string) => void;
  setStatus: (s: PlayStatus, err?: string | null) => void;
  setSignal: (n: number) => void;
  setSignalSimulated: (v: boolean) => void;
  addStation: (input: UserStationInput) => AddStationResult; // issue #16
  removeStation: (id: string) => void; // issue #16
  currentStation: () => Station;
  stationsForBand: (b: Band | "ALL") => Station[]; // merged, band-sorted (issue #16)
};

/**
 * Persist the tunable state (issue #7) so a reload restores the listener's
 * station, band, dial position and power. Fire-and-forget: the in-memory state
 * is authoritative and a failed write (private mode / storage full) is not
 * fatal.
 */
function persistState() {
  if (typeof window === "undefined") return;
  try {
    const { powered, tuning, band, stationId } = useRadioStore.getState();
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ powered, tuning, band, stationId }),
    );
  } catch {
    // storage unavailable — state still updates in-memory
  }
}

export const useRadioStore = create<RadioState>((set, get) => {
  // Hydrate from localStorage (issue #7): previously only volume survived a
  // reload, so the last station/band/tuning/power were lost.
  // User stations (issue #16) are loaded first because the persisted
  // stationId may reference one of them.
  const userStations = loadUserStations();
  const persisted = loadPersistedState(userStations);
  return {
    powered: persisted.powered,
    volume: loadVolume(),
    tuning: persisted.tuning,
    band: persisted.band,
    stationId: persisted.stationId,
    status: "idle",
    errorMsg: null,
    signal: 0,
    signalSimulated: false,
    userStations,

    setPowered: (v) => {
      set({
        powered: v,
        status: v ? get().status : "idle",
        signal: v ? get().signal : 0,
        // Power-off drops the analyser/sampler, so the needle can no longer
        // be a live one; clear the simulated flag with it (issue #15).
        signalSimulated: v ? get().signalSimulated : false,
        errorMsg: v ? get().errorMsg : null,
      });
      persistState();
    },
    setVolume: (v) => {
      const volume = Math.min(1, Math.max(0, v));
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(VOLUME_KEY, String(volume));
        } catch {
          // private mode / storage full — state still updates in-memory
        }
      }
      set({ volume });
    },
    setTuning: (v) => {
      set({ tuning: Math.min(100, Math.max(0, v)) });
      persistState();
    },
    setBand: (b) => {
      set({ band: b });
      persistState();
    },
    selectStation: (id) => {
      // Look up in the merged list so user stations are selectable (issue #16).
      const merged = mergeStations(get().userStations);
      const st = merged.find((s) => s.id === id);
      if (!st) return;
      // Map frequency into dial position, relative to the station's own band —
      // the TUNING knob walks stations within the current band, so the dial
      // pointer must agree with it (global indexing disagreed: e.g. the 4th
      // UKV station mapped to ~80% of the dial).
      const list = merged.filter((s) => s.band === st.band);
      const idx = list.findIndex((s) => s.id === id);
      const tuning = (idx / Math.max(1, list.length - 1)) * 100;
      set({ stationId: id, band: st.band, tuning, status: "loading", errorMsg: null });
      persistState();
    },
    setStatus: (s, err = null) => set({ status: s, errorMsg: err }),
    setSignal: (n) => set({ signal: Math.min(100, Math.max(0, n)) }),
    setSignalSimulated: (v) => set({ signalSimulated: v }),
    addStation: (input) => {
      const error = validateUserStation(input);
      if (error) return { ok: false, error };
      const { userStations } = get();
      const id = nextUserStationId(userStations.map((s) => s.id));
      const station = makeUserStation(id, input);
      const next = [...userStations, station];
      set({ userStations: next });
      saveUserStations(next);
      return { ok: true, id };
    },
    removeStation: (id) => {
      const { userStations, stationId } = get();
      if (!userStations.some((s) => s.id === id)) return;
      const next = userStations.filter((s) => s.id !== id);
      set({ userStations: next });
      saveUserStations(next);
      // Removing the station that is currently selected (or persisted as the
      // last station) must not strand the dial on a dead id: fall back to
      // the band's first merged station so the UI stays coherent.
      if (stationId === id) {
        const band = userStations.find((s) => s.id === id)?.band ?? get().band;
        const list = mergeStations(next).filter((s) => s.band === band);
        if (list.length > 0) {
          set({ stationId: list[0]!.id });
          persistState();
        }
      }
    },
    currentStation: () => {
      const { stationId, userStations } = get();
      const merged = mergeStations(userStations);
      return merged.find((s) => s.id === stationId) ?? merged[0]!;
    },
    stationsForBand: (b) => {
      const merged = mergeStations(get().userStations);
      if (b === "ALL") return merged;
      return merged.filter((s) => s.band === b);
    },
  };
});
