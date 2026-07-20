import { create } from "zustand";
import { STATIONS, type Band, type Station } from "./stations";

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

export const useRadioStore = create<RadioState>((set, get) => ({
  powered: false,
  volume: 0.65,
  tuning: 35,
  band: "SV",
  stationId: STATIONS[0].id,
  status: "idle",
  errorMsg: null,
  signal: 0,

  setPowered: (v) =>
    set({
      powered: v,
      status: v ? get().status : "idle",
      signal: v ? get().signal : 0,
      errorMsg: v ? get().errorMsg : null,
    }),
  setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)) }),
  setTuning: (v) => set({ tuning: Math.min(100, Math.max(0, v)) }),
  setBand: (b) => set({ band: b }),
  selectStation: (id) => {
    const st = STATIONS.find((s) => s.id === id);
    if (!st) return;
    // Map frequency into dial position roughly
    const idx = STATIONS.findIndex((s) => s.id === id);
    const tuning = (idx / Math.max(1, STATIONS.length - 1)) * 100;
    set({ stationId: id, band: st.band, tuning, status: "loading", errorMsg: null });
  },
  setStatus: (s, err = null) => set({ status: s, errorMsg: err }),
  setSignal: (n) => set({ signal: Math.min(100, Math.max(0, n)) }),
  currentStation: () => {
    const { stationId } = get();
    return STATIONS.find((s) => s.id === stationId) ?? STATIONS[0];
  },
}));
