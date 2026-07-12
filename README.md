# SmartGrid Campus

Monitor and coordinate campus power in one place — energy sources, battery health, grid status, weather-driven predictions, and the decision rules that tie them together.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-Package%20Manager-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Type%20Checked-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WeatherAPI](https://img.shields.io/badge/WeatherAPI-Predictions-00BFFF?logo=weathermap&logoColor=white)](https://www.weatherapi.com/)

## Overview

SmartGrid Campus is a dashboard for coordinating campus power across solar, wind, and grid supply. It tracks battery state of charge and health in real time, applies decision rules to recommend or automate power-source switching, and folds in weather-based predictions so those decisions account for what's coming, not just what's happening now.

```
Energy Sources → Battery State → Decision Engine → Grid Coordination → Reports
                        ↑
                  Weather Predictions
```

## Features

- **Live Energy Overview** — real-time summary of solar, wind, and grid supply with a quick-action card
- **Energy Source Control** — adjust and monitor solar and wind contribution
- **Battery Management** — capacity, health, and state-of-charge (SOC) tracking and control
- **Grid Coordination** — grid status monitoring with usage-cost control
- **Decision Engine** — rule-based recommendations with a one-click generate action
- **Weather-Based Predictions** — forecasts feed a prediction and strategy view so power decisions account for upcoming conditions
- **CSV Reporting** — exportable reports that include weather prediction data alongside usage figures

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite, TypeScript, client/ |
| Backend | Node.js, server/ |
| Shared Types | shared/ |
| Database | MySQL |
| ORM / Migrations | Drizzle (drizzle/) |
| Auth | JWT, OAuth |
| Weather & Predictions | WeatherAPI |
| Package Manager | pnpm |

## Project Structure

```
SmartGrid-Campus/
├── client/          # Frontend — dashboard pages and UI
├── server/          # Backend — API, decision engine, grid coordination logic
├── shared/          # Types and utilities shared between client and server
├── drizzle/         # Database schema and migrations
├── package.json
├── pnpm-lock.yaml
└── .env             # Environment secrets (not committed)
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A running MySQL database (if you want data storage and persistence)
- A WeatherAPI key (for weather and prediction screens)

### First-run / new-laptop bootstrap

Nothing in `.env` is committed — it holds real secrets and must be created or copied manually on every machine that runs this project. If you already have a working `.env` from another machine, copy it over as-is rather than recreating it.

Required keys:

| Variable | Used for |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `WEATHERAPI_KEY` / `VITE_WEATHERAPI_KEY` | Weather and prediction features |
| `JWT_SECRET` | Auth token signing |
| `OAUTH_SERVER_URL` | OAuth login flow |
| `OAUTH_CLIENT_SECRET` | OAuth login flow |
| `OWNER_OPEN_ID` | Owner-level auth identity |

### Setup

```powershell
cd "E:\Smart Grid"
pnpm install
```

Confirm `.env` exists in the project root with the keys above filled in — most weather, login, or database failures on a fresh machine trace back to a missing or wrong `.env` value, not the code.

Push the database schema once MySQL is running and `DATABASE_URL` is valid:

```powershell
pnpm db:push
```

If this fails, check (in order): MySQL is actually running, `DATABASE_URL` is correct, and the target database name exists.

Start the dev server:

```powershell
pnpm run dev:ps   # Windows
pnpm run dev      # macOS/Linux
```

Then open [http://localhost:3000](http://localhost:3000).

### Production build

```powershell
pnpm run build
pnpm start
```

## Useful Commands

| Command | Purpose |
|---|---|
| `pnpm run dev:ps` | Start dev server (Windows) |
| `pnpm run dev` | Start dev server (macOS/Linux) |
| `pnpm run build` | Build frontend + backend for production |
| `pnpm start` | Run the production build |
| `pnpm run check` | TypeScript type check |
| `pnpm run test` | Run tests |
| `pnpm db:push` | Generate and apply database schema migrations |

## Notes

- This project is set up for `pnpm` specifically — other package managers aren't tested against the lockfile
- `.env` is private and machine-specific — never commit it, and copy it exactly (not regenerated) when moving to a new laptop
- Weather pages depend on outbound internet access in addition to a valid API key
- Login/auth failures are almost always a missing or mismatched `JWT_SECRET`, `OAUTH_SERVER_URL`, `OAUTH_CLIENT_SECRET`, or `OWNER_OPEN_ID` — check those before assuming a code issue

## Recommended Setup Order (New Laptop)

1. Install Node.js 20+
2. Install pnpm
3. Copy the full project folder (`client/`, `server/`, `shared/`, `drizzle/`, `package.json`, `pnpm-lock.yaml`, `.env`)
4. Confirm `.env` is present and correct
5. `pnpm install`
6. `pnpm db:push`
7. `pnpm run dev:ps` (or `pnpm run dev`)
8. Open `http://localhost:3000`
