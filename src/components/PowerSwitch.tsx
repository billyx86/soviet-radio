type Props = {
  on: boolean;
  onToggle: () => void;
};

export function PowerSwitch({ on, onToggle }: Props) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="relative w-14 h-8 rounded-sm border-2 border-[#4a4038] transition-colors"
        style={{
          background: on
            ? "linear-gradient(180deg, #4a2020 0%, #2a1010 100%)"
            : "linear-gradient(180deg, #2a2420 0%, #1a1612 100%)",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
        }}
        aria-pressed={on}
        aria-label={on ? "Выключить" : "Включить"}
      >
        <div
          className="absolute top-0.5 bottom-0.5 w-6 rounded-sm transition-all duration-150"
          style={{
            left: on ? "calc(100% - 26px)" : "2px",
            background: on
              ? "linear-gradient(180deg, #c41e3a, #8a1020)"
              : "linear-gradient(180deg, #6a6058, #3a3228)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        />
      </button>
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${on ? "pilot-on bg-[#c41e3a]" : "bg-[#2a1a1a]"}`}
          style={{
            boxShadow: on ? undefined : "inset 0 1px 2px rgba(0,0,0,0.8)",
          }}
        />
        <span className="text-[9px] tracking-[0.15em] uppercase text-[#8a7a60]">
          СЕТЬ / POWER
        </span>
      </div>
    </div>
  );
}
