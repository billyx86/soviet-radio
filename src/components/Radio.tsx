import { useEffect, useRef } from "react";
import { useRadioStore } from "../lib/radio-store";
import { stationsForBand } from "../lib/stations";
import { Knob } from "./Knob";
import { FrequencyDial } from "./FrequencyDial";
import { SignalMeter } from "./SignalMeter";
import { SpeakerGrille } from "./SpeakerGrille";
import { StationList } from "./StationList";
import { BandSelector } from "./BandSelector";
import { PowerSwitch } from "./PowerSwitch";

export function Radio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const signalTimer = useRef<number | null>(null);

  const powered = useRadioStore((s) => s.powered);
  const volume = useRadioStore((s) => s.volume);
  const tuning = useRadioStore((s) => s.tuning);
  const band = useRadioStore((s) => s.band);
  const stationId = useRadioStore((s) => s.stationId);
  const status = useRadioStore((s) => s.status);
  const signal = useRadioStore((s) => s.signal);
  const errorMsg = useRadioStore((s) => s.errorMsg);

  const setPowered = useRadioStore((s) => s.setPowered);
  const setVolume = useRadioStore((s) => s.setVolume);
  const setTuning = useRadioStore((s) => s.setTuning);
  const setBand = useRadioStore((s) => s.setBand);
  const selectStation = useRadioStore((s) => s.selectStation);
  const setStatus = useRadioStore((s) => s.setStatus);
  const setSignal = useRadioStore((s) => s.setSignal);
  const station = useRadioStore((s) => s.currentStation)();

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "none";
    audioRef.current = audio;

    const onPlaying = () => {
      setStatus("playing");
      setSignal(55 + Math.random() * 35);
    };
    const onWaiting = () => setStatus("loading");
    const onError = () => {
      setStatus("error", "Stream unavailable");
      setSignal(5);
    };
    const onPause = () => {
      if (!useRadioStore.getState().powered) return;
      // ignore intermediate pauses
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("error", onError);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, [setStatus, setSignal]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Power + station stream control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!powered) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setStatus("idle");
      setSignal(0);
      if (signalTimer.current) {
        window.clearInterval(signalTimer.current);
        signalTimer.current = null;
      }
      return;
    }

    setStatus("loading");
    setSignal(20);
    audio.src = station.streamUrl;
    audio.load();
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        setStatus("error", "Playback blocked — tap power again");
        setSignal(8);
      });
    }

    // Live signal meter sway while playing
    if (signalTimer.current) window.clearInterval(signalTimer.current);
    signalTimer.current = window.setInterval(() => {
      const st = useRadioStore.getState().status;
      if (st === "playing") {
        setSignal(50 + Math.random() * 40 + volume * 10);
      } else if (st === "loading") {
        setSignal(15 + Math.random() * 25);
      }
    }, 400);

    return () => {
      if (signalTimer.current) {
        window.clearInterval(signalTimer.current);
        signalTimer.current = null;
      }
    };
  }, [powered, stationId, station.streamUrl, setStatus, setSignal, volume]);

  // Tuning knob snaps to nearest station in band
  const onTuningChange = (v: number) => {
    setTuning(v * 100);
    if (!powered) return;
    const list = stationsForBand(band);
    if (list.length === 0) return;
    const idx = Math.round(v * (list.length - 1));
    const target = list[Math.min(list.length - 1, Math.max(0, idx))];
    if (target && target.id !== stationId) {
      selectStation(target.id);
    }
  };

  const onBandChange = (b: typeof band) => {
    setBand(b);
    const list = stationsForBand(b);
    if (list.length && powered) {
      selectStation(list[0].id);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 py-6 sm:py-10">
      {/* Room plate */}
      <div className="mb-4 text-center">
        <h1 className="text-lg sm:text-xl tracking-[0.35em] uppercase text-[#c4b498] font-semibold">
          РАДИО «МАЯК»
        </h1>
        <p className="text-[10px] sm:text-xs tracking-[0.25em] text-[#6a5a48] mt-1">
          МОДЕЛЬ РВ-1968 · SHORTWAVE RECEIVER
        </p>
      </div>

      {/* Chassis */}
      <div
        className="relative rounded-xl p-4 sm:p-6"
        style={{
          background:
            "linear-gradient(165deg, #4a3a2c 0%, #2a2118 35%, #1a1510 70%, #12100c 100%)",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 8px rgba(0,0,0,0.4), 0 0 0 1px #1a1410, 0 0 0 4px #3a2e24, 0 0 0 5px #1a1410",
        }}
      >
        {/* Brand plate */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <div
              className="inline-block px-3 py-1 rounded-sm text-[11px] tracking-[0.3em] font-bold"
              style={{
                background: "linear-gradient(180deg, #3a2a1a, #1a120c)",
                border: "1px solid #5a4a30",
                color: "#d4c4a8",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              СССР · ЗАВОД № 12
            </div>
            <div className="mt-1.5 text-[9px] tracking-widest text-[#6a5a48]">
              ВЕРХОГОВИНА · MADE IN USSR
            </div>
          </div>
          {/* Valve tube glow */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-8 rounded-full ${powered ? "valve-on" : ""}`}
              style={{
                background: powered
                  ? "radial-gradient(ellipse at 40% 30%, #ffcc55, #ff8800 50%, #8a4000)"
                  : "radial-gradient(ellipse at 40% 30%, #3a3020, #1a1510)",
                boxShadow: powered
                  ? "0 0 12px #ffb020, 0 0 24px rgba(255,140,20,0.5)"
                  : "inset 0 0 4px #000",
              }}
              title="Лампа / Valve"
            />
            <span className="text-[8px] tracking-wider text-[#6a5a48] hidden sm:block">
              ЛАМПА
              <br />
              VALVE
            </span>
          </div>
        </div>

        {/* Dial + meter row */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 mb-4">
          <FrequencyDial
            station={station}
            powered={powered}
            tuning={tuning}
            status={status}
          />
          <div className="flex sm:flex-col items-center justify-center gap-3">
            <SignalMeter
              level={signal}
              powered={powered}
              playing={status === "playing"}
            />
          </div>
        </div>

        {/* Speaker */}
        <div className="mb-5">
          <SpeakerGrille active={powered && status === "playing"} volume={volume} />
        </div>

        {/* Controls row */}
        <div
          className="rounded-lg p-3 sm:p-4 mb-4"
          style={{
            background: "linear-gradient(180deg, #1e1814 0%, #14100c 100%)",
            border: "1px solid #2a2218",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex flex-wrap items-end justify-between gap-4 sm:gap-6">
            <PowerSwitch
              on={powered}
              onToggle={() => setPowered(!powered)}
            />
            <BandSelector band={band} powered={powered} onChange={onBandChange} />
            <Knob
              label="VOLUME"
              labelRu="ГРОМКОСТЬ"
              value={volume}
              onChange={setVolume}
              disabled={!powered}
              size={80}
            />
            <Knob
              label="TUNING"
              labelRu="НАСТРОЙКА"
              value={tuning / 100}
              onChange={onTuningChange}
              disabled={!powered}
              size={80}
            />
          </div>
        </div>

        {/* Station list panel */}
        <div
          className="rounded-lg p-3 sm:p-4"
          style={{
            background: "linear-gradient(180deg, #1a1510 0%, #100c0a 100%)",
            border: "1px solid #2a2218",
          }}
        >
          <StationList
            band={band}
            stationId={stationId}
            powered={powered}
            onSelect={selectStation}
          />
          {errorMsg && powered && (
            <div className="mt-2 text-[10px] text-[#c41e3a] tracking-wide">
              ❗ {errorMsg}
            </div>
          )}
        </div>

        {/* Foot screws / serial */}
        <div className="mt-4 flex items-center justify-between text-[8px] tracking-[0.2em] text-[#4a4030]">
          <span>● ● ●</span>
          <span>СЕР. № РВ-1968-7741 · 220V 50Hz</span>
          <span>● ● ●</span>
        </div>
      </div>

      <p className="mt-5 text-center text-[10px] text-[#5a4a38] leading-relaxed max-w-md mx-auto">
        Включите питание, выберите диапазон и канал.
        Streams via SomaFM · HTML5 Audio · Drag knobs vertically.
      </p>
    </div>
  );
}
