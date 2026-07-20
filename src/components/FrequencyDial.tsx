import { formatFreq, type Station } from "../lib/stations";

type Props = {
  station: Station;
  powered: boolean;
  tuning: number;
  status: string;
};

export function FrequencyDial({ station, powered, tuning, status }: Props) {
  const freq = formatFreq(station);

  return (
    <div
      className={`relative overflow-hidden rounded-md border-2 border-[#5a4a38] ${
        powered ? "dial-glow" : "dial-glow-off"
      }`}
      style={{
        background: powered
          ? "linear-gradient(180deg, #3a2e1a 0%, #1a140c 40%, #0e0a06 100%)"
          : "linear-gradient(180deg, #1a1612 0%, #0c0a08 100%)",
        minHeight: 120,
      }}
    >
      {/* scale markings */}
      <div className="absolute inset-x-3 top-2 flex justify-between opacity-40">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="w-px bg-[#c4a878]"
              style={{ height: i % 5 === 0 ? 12 : 7 }}
            />
            {i % 5 === 0 && (
              <span className="mt-0.5 font-[family-name:var(--font-dial)] text-[8px] text-[#a89060]">
                {i * 10}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* tuning pointer */}
      <div
        className="absolute top-1 bottom-8 w-0.5 bg-[#c41e3a] transition-all duration-300"
        style={{
          left: `calc(8% + ${tuning * 0.84}%)`,
          boxShadow: powered ? "0 0 8px #c41e3a" : "none",
          opacity: powered ? 1 : 0.3,
        }}
      />

      {/* main frequency readout */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-8 pb-3">
        <div
          className="font-[family-name:var(--font-dial)] text-4xl sm:text-5xl tracking-widest tabular-nums"
          style={{
            color: powered ? "#ffb020" : "#4a4030",
            textShadow: powered
              ? "0 0 12px rgba(255,176,32,0.7), 0 0 28px rgba(255,140,20,0.35)"
              : "none",
          }}
        >
          {powered ? freq : "----"}
          <span className="ml-2 text-base tracking-normal opacity-70">
            {powered ? station.freqUnit : ""}
          </span>
        </div>
        <div
          className="mt-1 text-center text-xs tracking-[0.2em] uppercase"
          style={{ color: powered ? "#d4c4a8" : "#4a4030" }}
        >
          {powered ? station.callsign : "ВЫКЛЮЧЕНО"}
        </div>
        <div
          className="mt-0.5 text-[10px] tracking-wider"
          style={{ color: powered ? "#a89060" : "#3a3020" }}
        >
          {powered
            ? `${station.nameRu} · ${station.city}`
            : "POWER OFF / ПИТАНИЕ"}
        </div>
        {powered && status === "loading" && (
          <div className="mt-1 text-[10px] text-[#ffb020] animate-pulse">
            ПОИСК… TUNING…
          </div>
        )}
        {powered && status === "error" && (
          <div className="mt-1 text-[10px] text-[#c41e3a]">
            НЕТ СИГНАЛА / NO SIGNAL
          </div>
        )}
      </div>
    </div>
  );
}
