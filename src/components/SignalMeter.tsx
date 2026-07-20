type Props = {
  level: number; // 0..100
  powered: boolean;
  playing: boolean;
};

export function SignalMeter({ level, powered, playing }: Props) {
  // Map level 0-100 to needle angle -50..50 deg
  const angle = powered ? -50 + (level / 100) * 100 : -50;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-28 h-16 rounded-t-full border border-[#5a4a38] overflow-hidden"
        style={{
          background: powered
            ? "linear-gradient(180deg, #2a2418 0%, #12100c 100%)"
            : "#0e0c0a",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        {/* scale arc labels */}
        <div className="absolute inset-x-2 top-1 flex justify-between text-[7px] text-[#8a7a60] font-[family-name:var(--font-dial)]">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
        {/* red zone */}
        <div
          className="absolute right-2 top-4 w-6 h-6 rounded-full opacity-30"
          style={{ background: "#c41e3a" }}
        />
        {/* needle */}
        <div
          className={`absolute bottom-1 left-1/2 w-0.5 h-12 bg-[#c41e3a] origin-bottom ${playing ? "needle-live" : ""}`}
          style={
            {
              "--needle-angle": `${angle}deg`,
              transform: `translateX(-50%) rotate(${angle}deg)`,
              boxShadow: powered ? "0 0 4px #c41e3a" : "none",
            } as React.CSSProperties
          }
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#3a3228] border border-[#6a5a48]" />
      </div>
      <div className="mt-1 text-[9px] tracking-[0.15em] uppercase text-[#8a7a60]">
        СИГНАЛ / S-METER
      </div>
    </div>
  );
}
