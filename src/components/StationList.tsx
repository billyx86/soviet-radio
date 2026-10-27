import type { Band, Station } from "../lib/stations";

type Props = {
  band: Band;
  stationId: string;
  powered: boolean;
  onSelect: (id: string) => void;
  /** Merged (built-in + user) stations for the current band, frequency-sorted. */
  stations: Station[];
  /** Only user stations expose this. */
  onRemove?: (id: string) => void;
};

export function StationList({
  band,
  stationId,
  powered,
  onSelect,
  stations,
  onRemove,
}: Props) {
  const list = stations;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-2 flex items-center justify-between border-b border-[#3a3228] pb-1">
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#c4b498]">
          КАНАЛЫ / CHANNELS
        </span>
        <span className="text-[9px] text-[#6a5a48]">
          {list.length}
          {list.some((s) => s.id.startsWith("user-")) && " · свои"}
        </span>
      </div>
      <div className="station-scroll flex-1 overflow-y-auto max-h-52 sm:max-h-64 space-y-1 pr-1">
        {list.length === 0 && (
          <div className="text-[11px] text-[#6a5a48] py-4 text-center">
            Нет станций в диапазоне · No stations on this band
          </div>
        )}
        {list.map((s: Station) => {
          const active = s.id === stationId && powered;
          const isUser = s.id.startsWith("user-");
          return (
            <div key={s.id} className="relative">
              <button
                type="button"
                disabled={!powered}
                onClick={() => onSelect(s.id)}
                className={`w-full text-left rounded px-2.5 py-2.5 min-h-[44px] transition-all border ${
                  isUser ? "pr-8" : ""
                } ${
                  active
                    ? "border-[#c41e3a] bg-[#2a1a12]"
                    : "border-transparent bg-[#1a1510]/hover:bg-[#221c16] hover:border-[#3a3228]"
                } ${!powered ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-[family-name:var(--font-dial)] text-xs tracking-wide ${
                      active ? "text-[#ffb020]" : "text-[#c4b498]"
                    }`}
                  >
                    {s.callsign}
                    {isUser && (
                      <span
                        className="ml-1.5 align-middle text-[7px] tracking-[0.15em] text-[#7a6a50] border border-[#4a4030] rounded-sm px-1"
                        title="Пользовательская станция / User-defined station"
                      >
                        СВОЯ
                      </span>
                    )}
                  </span>
                  <span className="text-[9px] text-[#6a5a48] shrink-0">
                    {s.band}
                  </span>
                </div>
                <div className="text-[11px] text-[#a89070] mt-0.5">{s.nameRu}</div>
                <div className="text-[9px] text-[#6a5a48]">
                  {s.city} · {s.genre}
                </div>
              </button>
              {isUser && (
                <button
                  type="button"
                  disabled={!powered}
                  onClick={() => onRemove?.(s.id)}
                  aria-label={`Удалить станцию ${s.nameRu}`}
                  title="Удалить / Remove"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm text-[10px] leading-none text-[#6a5a48] hover:text-[#c41e3a] hover:bg-[#2a1a12] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
