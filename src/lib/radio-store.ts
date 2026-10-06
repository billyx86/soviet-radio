import { create } from "zustand";
import { STATIONS, type Band, type Station } from "./stations";

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
 */
export function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (raw == null) return DEFAULT_STATE;
    const p = JSON.parse(raw) as Record<string, unknown> | null;
    if (typeof p !== "object" || p === null) return DEFAULT_STATE;

    const station =
      typeof p.stationId === "string"
        ? STATIONS.find((s) => s.id === p.stationId)
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

  setPowered: (v: boolean) => void;
  setVolume: (v: number) => void;
  setTuning: (v: number) => void;
  setBand: (b: Band) => void;
  selectStation: (id: string) => void;
  setStatus: (s: PlayStatus, err?: string | null) => void;
  setSignal: (n: number) => void;
  currentStation: () => Station;
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
  const persisted = loadPersistedState();
  return {
    powered: persisted.powered,
    volume: loadVolume(),
    tuning: persisted.tuning,
    band: persisted.band,
    stationId: persisted.stationId,
    status: "idle",
    errorMsg: null,
    signal: 0,

    setPowered: (v) => {
      set({
        powered: v,
        status: v ? get().status : "idle",
        signal: v ? get().signal : 0,
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
      const st = STATIONS.find((s) => s.id === id);
      if (!st) return;
      // Map frequency into dial position, relative to the station's own band —
      // the TUNING knob walks stations within the current band, so the dial
      // pointer must agree with it (global indexing disagreed: e.g. the 4th
      // UKV station mapped to ~80% of the dial).
      const list = STATIONS.filter((s) => s.band === st.band);
      const idx = list.findIndex((s) => s.id === id);
      const tuning = (idx / Math.max(1, list.length - 1)) * 100;
      set({ stationId: id, band: st.band, tuning, status: "loading", errorMsg: null });
      persistState();
    },
    setStatus: (s, err = null) => set({ status: s, errorMsg: err }),
    setSignal: (n) => set({ signal: Math.min(100, Math.max(0, n)) }),
    currentStation: () => {
      const { stationId } = get();
      return STATIONS.find((s) => s.id === stationId) ?? STATIONS[0];
    },
  };
});
