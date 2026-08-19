// window/localStorage shim lives in src/test/setup.ts (vitest setupFiles),
// which runs before module imports.
import { describe, expect, it, beforeEach } from "vitest";
import { STATIONS } from "./stations";
import { useRadioStore } from "./radio-store";

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
