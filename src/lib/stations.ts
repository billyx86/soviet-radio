export type Band = "DV" | "SV" | "KV" | "UKV";

export type Station = {
  id: string;
  callsign: string;
  nameRu: string;
  nameEn: string;
  city: string;
  band: Band;
  frequency: number; // display MHz / kHz style number
  freqUnit: "kHz" | "MHz";
  streamUrl: string;
  genre: string;
};

/**
 * Real HTTPS streams (SomaFM + other stable sources),
 * presented as Soviet-style shortwave / broadcast channels.
 */
export const STATIONS: Station[] = [
  {
    id: "mayak-1",
    callsign: "РВ-01 МАЯК",
    nameRu: "Маяк — Главный",
    nameEn: "Groove Salad",
    city: "Москва",
    band: "SV",
    frequency: 549,
    freqUnit: "kHz",
    streamUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
    genre: "Джаз / Lounge",
  },
  {
    id: "cosmos-7",
    callsign: "КОСМОС-7",
    nameRu: "Зона Дрона",
    nameEn: "Drone Zone",
    city: "Байконур",
    band: "KV",
    frequency: 9.62,
    freqUnit: "MHz",
    streamUrl: "https://ice1.somafm.com/dronezone-128-mp3",
    genre: "Амбиент",
  },
  {
    id: "orbit-12",
    callsign: "ОРБИТА-12",
    nameRu: "Космическая станция",
    nameEn: "Space Station Soma",
    city: "Звёздный",
    band: "KV",
    frequency: 11.78,
    freqUnit: "MHz",
    streamUrl: "https://ice1.somafm.com/spacestation-128-mp3",
    genre: "Электроника",
  },
  {
    id: "defcon-88",
    callsign: "ЗАЩИТА-88",
    nameRu: "Канал ДЕФКОН",
    nameEn: "DEF CON Radio",
    city: "Арзамас-16",
    band: "UKV",
    frequency: 88.5,
    freqUnit: "MHz",
    streamUrl: "https://ice1.somafm.com/defcon-128-mp3",
    genre: "Индастриал",
  },
  {
    id: "lush-64",
    callsign: "ЛУЧ-64",
    nameRu: "Нежный вокал",
    nameEn: "Lush",
    city: "Ленинград",
    band: "SV",
    frequency: 873,
    freqUnit: "kHz",
    streamUrl: "https://ice1.somafm.com/lush-128-mp3",
    genre: "Вокал",
  },
  {
    id: "beat-33",
    callsign: "РИТМ-33",
    nameRu: "Смеситель бита",
    nameEn: "Beat Blender",
    city: "Киев",
    band: "UKV",
    frequency: 101.2,
    freqUnit: "MHz",
    streamUrl: "https://ice1.somafm.com/beatblender-128-mp3",
    genre: "Данс",
  },
  {
    id: "sonic-21",
    callsign: "СОНИК-21",
    nameRu: "Соническая вселенная",
    nameEn: "Sonic Universe",
    city: "Новосибирск",
    band: "KV",
    frequency: 15.13,
    freqUnit: "MHz",
    streamUrl: "https://ice1.somafm.com/sonicuniverse-128-mp3",
    genre: "Джаз",
  },
  {
    id: "retro-80",
    callsign: "РЕТРО-80",
    nameRu: "Подполье 80-х",
    nameEn: "Underground 80s",
    city: "Рига",
    band: "UKV",
    frequency: 96.8,
    freqUnit: "MHz",
    streamUrl: "https://ice1.somafm.com/u80s-128-mp3",
    genre: "Новая волна",
  },
  {
    id: "lounge-5",
    callsign: "САЛОН-5",
    nameRu: "Иллинойский салон",
    nameEn: "Illinois Street Lounge",
    city: "Одесса",
    band: "SV",
    frequency: 693,
    freqUnit: "kHz",
    streamUrl: "https://ice1.somafm.com/illstreet-128-mp3",
    genre: "Лаунж",
  },
  {
    id: "boot-42",
    callsign: "САПОГИ-42",
    nameRu: "Сапоги и виски",
    nameEn: "Boot Liquor",
    city: "Тюмень",
    band: "DV",
    frequency: 171,
    freqUnit: "kHz",
    streamUrl: "https://ice1.somafm.com/bootliquor-128-mp3",
    genre: "Кантри",
  },
  {
    id: "secret-9",
    callsign: "СЕКРЕТ-9",
    nameRu: "Секретный агент",
    nameEn: "Secret Agent",
    city: "Берлин",
    band: "KV",
    frequency: 7.31,
    freqUnit: "MHz",
    streamUrl: "https://ice1.somafm.com/secretagent-128-mp3",
    genre: "Шпионский",
  },
  {
    id: "folk-14",
    callsign: "НАРОД-14",
    nameRu: "Народная волна",
    nameEn: "Folk Forward",
    city: "Минск",
    band: "SV",
    frequency: 1125,
    freqUnit: "kHz",
    streamUrl: "https://ice1.somafm.com/folkfwd-128-mp3",
    genre: "Фолк",
  },
];

export const BANDS: { id: Band; labelRu: string; labelEn: string }[] = [
  { id: "DV", labelRu: "ДВ", labelEn: "LW" },
  { id: "SV", labelRu: "СВ", labelEn: "MW" },
  { id: "KV", labelRu: "КВ", labelEn: "SW" },
  { id: "UKV", labelRu: "УКВ", labelEn: "FM" },
];

export function stationsForBand(band: Band | "ALL"): Station[] {
  if (band === "ALL") return STATIONS;
  return STATIONS.filter((s) => s.band === band);
}

export function formatFreq(s: Station): string {
  if (s.freqUnit === "MHz") {
    return s.frequency.toFixed(2);
  }
  return String(Math.round(s.frequency));
}
