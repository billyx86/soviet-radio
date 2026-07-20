# Радио «Маяк» — Soviet Radio

A bakelite-and-amber Soviet-era shortwave radio web app with **real** HTML5 internet radio streams.

![stack](https://img.shields.io/badge/React_19-Vite_6-amber) ![audio](https://img.shields.io/badge/HTML5_Audio-SomaFM-red)

## Quick start

```bash
git clone https://github.com/billyx86/soviet-radio.git
cd soviet-radio
npm install
chmod +x startup.sh && ./startup.sh
# or: npm run dev   →  http://0.0.0.0:8080
```

## Features

- **Bakelite / wood chassis** aesthetic (charcoal, steel, aged ivory, signal red, amber valve)
- **Physical knobs** — drag vertically (touch-friendly) for volume & tuning
- **Power switch** with red pilot lamp + glowing valve tube
- **Band selector** — ДВ / СВ / КВ / УКВ (LW / MW / SW / FM)
- **Amber frequency dial** with scale, pointer, callsign readout
- **S-meter** with live needle sway while playing
- **Speaker grille** visual
- **Cyrillic + English** panel labels
- **12 working stations** via SomaFM HTTPS streams, presented as Soviet shortwave channels

## How to use

1. Flip **СЕТЬ / POWER** on
2. Pick a band (СВ, КВ, УКВ…)
3. Tap a channel in the list **or** drag the **НАСТРОЙКА** knob
4. Adjust **ГРОМКОСТЬ**

## Stack

- React 19 + TypeScript
- Vite 6
- TanStack Router
- Tailwind CSS v4
- Zustand
- HTML5 Audio

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on `0.0.0.0:8080` |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `./startup.sh` | Start dev if not already up |

## Streams

Stations use reliable SomaFM HTTPS MP3 endpoints (Groove Salad, Drone Zone, Space Station, DEF CON, Lush, etc.), re-skinned with Soviet callsigns like `РВ-01 МАЯК`, `КОСМОС-7`, `ЗАЩИТА-88`.
