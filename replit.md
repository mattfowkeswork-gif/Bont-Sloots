# Bont Sloots FC - Team App

## Overview

Mobile-optimized Progressive Web App (PWA) for Bont Sloots FC, a 6-a-side football team in the Staveley 6-a-side League. Built with a "Luxury Sports" theme featuring Burgundy (#7D1D3F) and White accents on a Deep Charcoal/Black background.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (PWA with service worker)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Styling**: Tailwind CSS v4, framer-motion
- **Build**: esbuild (CJS bundle for API)

## Features

1. **Dashboard** — Next fixture with live countdown timer, season record (W/D/L), top scorer, recent results
2. **Fixtures & Results** — Full season fixture list with W/D/L indicators, TBC kickoff support
3. **Wall of Fame & Shame** — Goals/Assists/MOM/MOTM leaderboard with tabs
4. **Squad** — Player grid with coloured initials avatars and stats
5. **Player Profiles** — Individual stats card + full MOM/MOTM award history
6. **Admin Panel** — Hidden password-protected area (triple-click team badge to reveal) for managing all data
   - Default password: `bont2025`
   - Can update scores, KO times, add stats, assign awards

## PWA

- `public/manifest.json` — App manifest (theme: burgundy, installable)
- `public/sw.js` — Service worker for offline caching
- `index.html` — Links manifest and registers SW

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- **players** — id, name, position, created_at
- **fixtures** — id, opponent, match_date, kickoff_time, kickoff_tbc, home_score, away_score, played, is_home, venue, notes, created_at
- **stats** — id, player_id, fixture_id, type ('goal'|'assist'), created_at
- **awards** — id, player_id, fixture_id, type ('mom'|'motm'), created_at

## Admin Access

The admin login page is accessible at `/admin`. To reveal it within the app, triple-click the team badge in the top header.
