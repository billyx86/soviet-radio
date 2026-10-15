# Радио «Маяк» — Soviet Radio

A bakelite-and-amber Soviet-era shortwave radio web app with **real** HTML5 internet radio streams.

![stack](https://img.shields.io/badge/React_19-Vite_6-amber) ![audio](https://img.shields.io/badge/HTML5_Audio-SomaFM-red) [![CI](https://github.com/billyx86/soviet-radio/actions/workflows/ci.yml/badge.svg)](https://github.com/billyx86/soviet-radio/actions/workflows/ci.yml)

## Quick start

```bash
git clone https://github.com/billyx86/soviet-radio.git
cd soviet-radio
npm install
chmod +x startup.sh && ./startup.sh
# or: npm run dev   →  http://0.0.0.0:8080
```

`startup.sh` serves the **production build** (`vite preview`) when one exists or
can be built, and falls back to the **dev server** if the build fails. See
*Running in production* below for the explicit mode overrides.

## Running in production

`startup.sh` builds and serves the production bundle by default:

```bash
./startup.sh                 # auto: prod build if possible, else dev
```

Control it with two environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `SOVIET_RADIO_MODE` | `auto` | `auto` = production build if `dist/` exists or can be built, else dev server; `dev` = always the Vite dev server (hot reload); `prod` = always the production build, hard-fail if it cannot be built |
| `SOVIET_RADIO_LOG` | `/tmp/soviet-radio.log` | Where the server logs are written |

```bash
SOVIET_RADIO_MODE=dev ./startup.sh          # force dev server
SOVIET_RADIO_MODE=prod ./startup.sh         # force prod, fail loudly on build error
SOVIET_RADIO_LOG=/var/log/radio.log ./startup.sh
```

Both modes listen on `0.0.0.0:8080`. If something is already listening on
8080, `startup.sh` is a no-op (it assumes the app is already up).

## Features

- **Bakelite / wood chassis** aesthetic (charcoal, steel, aged ivory, signal red, amber valve)
- **Physical knobs** — drag vertically (touch-friendly) for volume & tuning
- **Power switch** with red pilot lamp + glowing valve tube
- **Band selector** — ДВ / СВ / КВ / УКВ (LW / MW / SW / FM)
- **Amber frequency dial** with scale, pointer, callsign readout
- **S-meter** with live needle sway while playing
- **Speaker grille** visual
- **Cyrillic + English** panel labels
- **Volume remembered** across reloads (localStorage)
- **12 working stations** via SomaFM HTTPS streams, presented as Soviet shortwave channels
- **CI** — typecheck, tests and build on every push/PR

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
| `npm run build` | Production build (emits `dist/`) |
| `npm run preview` | Serve the production build on `0.0.0.0:8080` |
| `npm run typecheck` | TypeScript check |
| `./startup.sh` | Serve prod build (or fall back to dev) on `0.0.0.0:8080`; no-op if 8080 is already up. See *Running in production* |

## Streams

Stations use reliable SomaFM HTTPS MP3 endpoints (Groove Salad, Drone Zone, Space Station, DEF CON, Lush, etc.), re-skinned with Soviet callsigns like `РВ-01 МАЯК`, `КОСМОС-7`, `ЗАЩИТА-88`.
