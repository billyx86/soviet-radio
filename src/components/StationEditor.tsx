import { useState, type FormEvent } from "react";
import { BANDS, type Band } from "../lib/stations";
import {
  BAND_FREQ_UNIT,
  type AddStationResult,
  type UserStationInput,
} from "../lib/user-stations";

type Props = {
  powered: boolean;
  onAdd: (input: UserStationInput) => AddStationResult;
  /** Called with the new station's id after a successful add, so the dial
   *  can jump straight to it. */
  onSelect: (id: string) => void;
};

/** Sensible defaults per band (Маяк 657 kHz etc.) — shown as the pre-fill. */
const DEFAULT_FREQ: Record<Band, string> = {
  DV: "1000",
  SV: "657",
  KV: "9.2",
  UKV: "98.5",
};

const RANGES: Record<Band, string> = {
  DV: "100–2000",
  SV: "100–2000",
  KV: "1.5–40",
  UKV: "7–108",
};

const fieldCls =
  "w-full bg-[#0f0c09] border border-[#3a3228] rounded px-2 py-1.5 text-[11px] " +
  "text-[#d4c4a8] placeholder-[#5a4a38] outline-none focus:border-[#c41e3a] " +
  "font-[family-name:var(--font-dial)]";

/**
 * Add-your-own-station form (issue #16). Validation is shared with the store
 * via validateUserStation (user-stations.ts); this component only renders the
 * returned message. The form collapses by default so it stays out of the
 * way of the receiver face.
 */
export function StationEditor({ powered, onAdd, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [band, setBand] = useState<Band>("SV");
  const [freq, setFreq] = useState(DEFAULT_FREQ.SV);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const unit = BAND_FREQ_UNIT[band];

  const onBand = (b: Band) => {
    setBand(b);
    // Re-seed the dial field with a plausible value for the new band.
    setFreq(DEFAULT_FREQ[b]);
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!powered) return;
    const res = onAdd({ name, band, frequency: Number(freq), streamUrl: url });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setName("");
    setUrl("");
    setFreq(DEFAULT_FREQ[band]);
    setOpen(false);
    onSelect(res.id);
  };

  return (
    <div className="mt-3 border-t border-[#2a2218] pt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full py-1.5 text-[10px] tracking-[0.2em] uppercase text-[#8a7a60] hover:text-[#c4b498] hover:bg-[#1a1510] rounded transition-colors"
        >
          ＋ Своя станция · Add station
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#c4b498]">
              Новая станция / New station
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] text-[#6a5a48] hover:text-[#c41e3a]"
              aria-label="Закрыть / Close"
            >
              ✕
            </button>
          </div>

          <input
            className={fieldCls}
            placeholder="Название / Name"
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />

          <div className="grid grid-cols-[92px_1fr] gap-2">
            <select
              className={fieldCls}
              value={band}
              onChange={(e) => onBand(e.target.value as Band)}
              aria-label="Диапазон / Band"
            >
              {BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} · {b.labelEn}
                </option>
              ))}
            </select>
            <input
              className={fieldCls}
              type="number"
              step="any"
              inputMode="decimal"
              placeholder={`${RANGES[band]} ${unit}`}
              value={freq}
              onChange={(e) => {
                setFreq(e.target.value);
                setError(null);
              }}
              aria-label={`Частота / Frequency (${unit})`}
            />
          </div>

          <input
            className={fieldCls}
            placeholder="https://example.com/stream.mp3"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
          />

          {error && (
            <div className="text-[10px] text-[#c41e3a] tracking-wide">⚠ {error}</div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!powered}
              className="flex-1 py-1.5 rounded text-[10px] tracking-[0.2em] uppercase border border-[#5a4a30] text-[#d4c4a8] bg-[#2a2118] hover:bg-[#3a2e24] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Сохранить · Save
            </button>
          </div>
          {!powered && (
            <div className="text-[9px] text-[#6a5a48]">
              Включите питание, чтобы добавлять станции · Power on to add stations
            </div>
          )}
        </form>
      )}
    </div>
  );
}
