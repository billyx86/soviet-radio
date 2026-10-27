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
8080, `startup.sh` does not start a second server — it **announces the
situation** instead: a notice on stdout (and in the `SOVIET_RADIO_LOG` file)
naming the port, the PID that appears to own it (best-effort), and how to
check or move it (e.g. `lsof -i :8080`). Exit code stays 0, so orchestrators
that treat "port busy" as "already running" keep working; you just no longer
get a silent no-op (issue #14).

## Features

- **Bakelite / wood chassis** aesthetic (charcoal, steel, aged ivory, signal red, amber valve)
- **Physical knobs** — drag vertically (touch-friendly) for volume & tuning
- **Power switch** with red pilot lamp + glowing valve tube
- **Band selector** — ДВ / СВ / КВ / УКВ (LW / MW / SW / FM)
- **Amber frequency dial** with scale, pointer, callsign readout
- **S-meter** with live needle sway while playing; when the needle is a
  **simulated fallback** (no WebAudio tap available, or a CORS-tainted
  stream), the meter is labelled `СИМ / SIM` so a dead analyser never
  masquerades as a real reading (issue #15)
- **Speaker grille** visual
- **Your own stations** — add, remove and tune user-defined stations per
  band; they merge into the channel list and the TUNING dial and persist
  across reloads (issue #16, see *User stations*)
- **Cyrillic + English** panel labels
- **Volume & last dial-in remembered** across reloads (localStorage)
- **12 working stations** via SomaFM HTTPS streams, presented as Soviet shortwave channels
- **CI** — typecheck, tests and build on every push/PR

## How to use

1. Flip **СЕТЬ / POWER** on
2. Pick a band (СВ, КВ, УКВ…)
3. Tap a channel in the list **or** drag the **НАСТРОЙКА** knob
4. Adjust **ГРОМКОСТЬ**

## User stations

The built-in 12-station catalogue is seed data — your own dial-ins live on
top of it:

- **Add** — power on, open `＋ Своя станция · Add station` under the channel
  list, enter a name, band and frequency (per-band dial range is enforced),
  and an `http(s)` stream URL. The new station is saved, tagged `СВОЯ`, and
  the dial jumps straight to it.
- **Tune** — user stations are part of the band list, so the **НАСТРОЙКА**
  knob and band switching walk them exactly like built-ins.
- **Remove** — the `✕` on a `СВОЯ` row deletes it. Removing the currently
  selected station falls back to the band's first station so the dial never
  strands on a dead id.
- **Merge policy** — within a band, a user station whose frequency collides
  with a built-in *replaces* the built-in (your dial-in wins); all other
  entries are inserted frequency-sorted.
- **Persistence** — user stations are stored under the localStorage key
  `soviet-radio-user-stations`; your last selected station, band, tuning and
  power-on state survive a reload (including when they point at a user
  station).

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
| `./startup.sh` | Serve prod build (or fall back to dev) on `0.0.0.0:8080`; if 8080 is already taken it announces the owner PID instead of no-oping silently. See *Running in production* |

## Streams

Stations use reliable SomaFM HTTPS MP3 endpoints (Groove Salad, Drone Zone, Space Station, DEF CON, Lush, etc.), re-skinned with Soviet callsigns like `РВ-01 МАЯК`, `КОСМОС-7`, `ЗАЩИТА-88`.
