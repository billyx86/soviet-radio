// window/localStorage shim lives in src/test/setup.ts (vitest setupFiles),
// which runs before module imports.
import { describe, expect, it, beforeEach, vi } from "vitest";
import { STATIONS } from "./stations";
import { useRadioStore, loadPersistedState } from "./radio-store";

function resetStore() {
  useRadioStore.setState({
    powered: false,
    volume: 0.65,
    tuning: 35,
    band: "SV",
    stationId: STATIONS[0].id,
    status: "idle",
    errorMsg: null,
    signal: 0,
  });
}

describe("radio-store", () => {
  beforeEach(resetStore);

  it("clamps volume to 0..1 and persists it", () => {
    useRadioStore.getState().setVolume(1.7);
    expect(useRadioStore.getState().volume).toBe(1);
    useRadioStore.getState().setVolume(-3);
    expect(useRadioStore.getState().volume).toBe(0);
    useRadioStore.getState().setVolume(0.42);
    expect(
      (window as unknown as { localStorage: Storage }).localStorage.getItem(
        "soviet-radio-volume",
      ),
    ).toBe("0.42");
  });

  it("clamps tuning to 0..100", () => {
    useRadioStore.getState().setTuning(130);
    expect(useRadioStore.getState().tuning).toBe(100);
    useRadioStore.getState().setTuning(-5);
    expect(useRadioStore.getState().tuning).toBe(0);
  });

  it("ignores unknown station ids", () => {
    const before = useRadioStore.getState();
    useRadioStore.getState().selectStation("does-not-exist");
    const after = useRadioStore.getState();
    expect(after.stationId).toBe(before.stationId);
    expect(after.tuning).toBe(before.tuning);
  });

  it("selecting a station switches band and sets loading status", () => {
    const ukv = STATIONS.find((s) => s.band === "UKV")!;
    useRadioStore.getState().selectStation(ukv.id);
    const s = useRadioStore.getState();
    expect(s.stationId).toBe(ukv.id);
    expect(s.band).toBe("UKV");
    expect(s.status).toBe("loading");
  });

  it("maps the dial position relative to the station's own band (Closes #2)", () => {
    const byBand = (b: string) => STATIONS.filter((s) => s.band === b);

    for (const band of ["DV", "SV", "KV", "UKV"]) {
      const list = byBand(band);
      // First station of its band -> dial at 0%.
      useRadioStore.getState().selectStation(list[0]!.id);
      expect(useRadioStore.getState().tuning).toBeCloseTo(0, 5);
      // Last station of its band -> dial at 100% (sole-station bands map to 0).
      useRadioStore.getState().selectStation(list[list.length - 1]!.id);
      const expected = list.length > 1 ? 100 : 0;
      expect(useRadioStore.getState().tuning).toBeCloseTo(expected, 5);
    }

    // The last UKV station must sit at 100%, not at its global slot
    // (globally it is 8th of 12 → ~63.6% — exactly the old bug).
    const ukv = byBand("UKV");
    const last = ukv[ukv.length - 1]!;
    useRadioStore.getState().selectStation(last.id);
    expect(useRadioStore.getState().tuning).toBeCloseTo(100, 5);
    // ...and the knob at 100% on UKV reaches exactly that station:
    const knobIdx = Math.round(1.0 * (ukv.length - 1));
    expect(ukv[knobIdx]!.id).toBe(last.id);
  });

  it("power-off resets status, signal and error", () => {
    useRadioStore.getState().setPowered(true);
    useRadioStore.getState().setStatus("playing");
    useRadioStore.getState().setSignal(77);
    useRadioStore.getState().setPowered(false);
    const s = useRadioStore.getState();
    expect(s.powered).toBe(false);
    expect(s.status).toBe("idle");
    expect(s.signal).toBe(0);
    expect(s.errorMsg).toBeNull();
  });

  it("currentStation always resolves to a real station", () => {
    expect(
      useRadioStore.getState().currentStation().id,
    ).toBe(useRadioStore.getState().stationId);
  });
});

// Issue #7: last station, band, tuning and power must survive a reload.
// loadPersistedState() is the store's hydration source, so it is exercised
// directly against the localStorage shim; the store itself is re-created in a
// fresh module instance to prove the initializer reads it back.
describe("radio-store persistence (issue #7)", () => {
  const LS = (window as unknown as { localStorage: Storage }).localStorage;

  const ukv = STATIONS.find((s) => s.band === "UKV")!;

  beforeEach(() => {
    LS.clear();
    resetStore();
  });

  function readState(): Record<string, unknown> {
    const raw = LS.getItem("soviet-radio-state");
    expect(raw).not.toBeNull();
    return JSON.parse(raw!);
  }

  it("persists station, band, tuning and power to soviet-radio-state", () => {
    useRadioStore.getState().selectStation(ukv.id);
    useRadioStore.getState().setTuning(72);
    useRadioStore.getState().setPowered(true);

    const s = readState();
    expect(s.stationId).toBe(ukv.id);
    expect(s.band).toBe("UKV");
    expect(s.tuning).toBe(72);
    expect(s.powered).toBe(true);
  });

  it("persists volume under its own key, separately from the state", () => {
    useRadioStore.getState().selectStation(ukv.id);
    useRadioStore.getState().setVolume(0.3);
    expect(LS.getItem("soviet-radio-volume")).toBe("0.3");
    // Volume, playback status and signal must not leak into the state blob.
    const state = JSON.parse(LS.getItem("soviet-radio-state")!);
    expect(state).not.toHaveProperty("volume");
    expect(state).not.toHaveProperty("status");
    expect(state).not.toHaveProperty("signal");
  });

  it("hydrates stored station/band/tuning/power on re-init (round-trip)", async () => {
    // Simulate the listener tuning in, then "reloading" the page (fresh module).
    useRadioStore.getState().selectStation(ukv.id);
    useRadioStore.getState().setTuning(48);
    useRadioStore.getState().setPowered(true);

    vi.resetModules();
    const fresh = await import("./radio-store");
    expect(fresh.useRadioStore.getState().stationId).toBe(ukv.id);
    expect(fresh.useRadioStore.getState().band).toBe("UKV");
    expect(fresh.useRadioStore.getState().tuning).toBe(48);
    expect(fresh.useRadioStore.getState().powered).toBe(true);
    // Playback state is not persisted — the radio boots idle.
    expect(fresh.useRadioStore.getState().status).toBe("idle");
    expect(fresh.useRadioStore.getState().signal).toBe(0);
  });

  it("falls back to defaults when no state is stored", () => {
    const p = loadPersistedState();
    expect(p).toEqual({
      powered: false,
      tuning: 35,
      band: "SV",
      stationId: STATIONS[0].id,
    });
  });

  it("ignores a stored station id that no longer exists", () => {
    LS.setItem(
      "soviet-radio-state",
      JSON.stringify({
        powered: true,
        tuning: 50,
        band: "UKV",
        stationId: "deleted-station",
      }),
    );
    const p = loadPersistedState();
    expect(p.stationId).toBe(STATIONS[0].id);
    expect(p.band).toBe("SV");
  });

  it("repairs a stored band that disagrees with the station's band", () => {
    LS.setItem(
      "soviet-radio-state",
      JSON.stringify({ powered: false, tuning: 10, band: "DV", stationId: ukv.id }),
    );
    const p = loadPersistedState();
    expect(p.stationId).toBe(ukv.id);
    expect(p.band).toBe("UKV"); // station's own band wins
  });

  it("clamps a stored tuning out of 0..100", () => {
    LS.setItem("soviet-radio-state", JSON.stringify({ tuning: 250 }));
    expect(loadPersistedState().tuning).toBe(100);
    LS.setItem("soviet-radio-state", JSON.stringify({ tuning: -40 }));
    expect(loadPersistedState().tuning).toBe(0);
  });

  it("rejects a non-boolean powered value", () => {
    LS.setItem(
      "soviet-radio-state",
      JSON.stringify({ powered: "yes", tuning: 10, band: "SV", stationId: STATIONS[0].id }),
    );
    expect(loadPersistedState().powered).toBe(false);
  });

  it("falls back to defaults for corrupt JSON", () => {
    LS.setItem("soviet-radio-state", "{not valid json!!");
    const p = loadPersistedState();
    expect(p).toEqual({
      powered: false,
      tuning: 35,
      band: "SV",
      stationId: STATIONS[0].id,
    });
  });

  it("falls back to defaults when the value is not an object", () => {
    LS.setItem("soviet-radio-state", "42");
    expect(loadPersistedState().stationId).toBe(STATIONS[0].id);
    LS.setItem("soviet-radio-state", "null");
    expect(loadPersistedState().band).toBe("SV");
  });

  it("survives a throwing localStorage (private mode)", () => {
    const spy = vi.spyOn(LS, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    // Must not throw; in-memory state still updates.
    expect(() => useRadioStore.getState().setTuning(66)).not.toThrow();
    expect(useRadioStore.getState().tuning).toBe(66);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
