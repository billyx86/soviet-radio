import { BANDS, type Band } from "../lib/stations";

type Props = {
  band: Band;
  powered: boolean;
  onChange: (b: Band) => void;
};

export function BandSelector({ band, powered, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex rounded-sm overflow-hidden border border-[#4a4038] shadow-inner">
        {BANDS.map((b) => {
          const active = band === b.id;
          return (
            <button
              key={b.id}
              type="button"
              disabled={!powered}
              onClick={() => onChange(b.id)}
              className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs tracking-wider font-semibold transition-colors ${
                active && powered
                  ? "bg-[#c41e3a] text-[#f5e8d0]"
                  : "bg-[#2a2420] text-[#8a7a60] hover:bg-[#3a3228]"
              } ${!powered ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {b.labelRu}
            </button>
          );
        })}
      </div>
      <div className="text-[9px] tracking-[0.15em] uppercase text-[#6a5a48]">
        ДИАПАЗОН / BAND
      </div>
    </div>
  );
}
