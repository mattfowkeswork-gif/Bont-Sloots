# Bont Sloots FC - Team App

## Overview

Mobile-optimized Progressive Web App (PWA) for Bont Sloots FC (Real Sosobad), a 6-a-side football team in the Staveley 6-a-side League. Built with a "Luxury Sports" theme featuring Burgundy (#7D1D3F) and White accents on a Deep Charcoal/Black background.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (PWA with service worker)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Styling**: Tailwind CSS v4, framer-motion
- **Build**: esbuild (ESM bundle for API)

## Features

1. **Dashboard** — Next fixture with live countdown timer, season record (W/D/L), top scorer, recent results
2. **Fixtures & Results** — Full season fixture list with W/D/L indicators, TBC kickoff support. MOTM voting button appears for 48 hours after a match is marked Finished.
3. **Squad Stats Leaderboard** — Sortable table: Name, Apps, Goals, Assists, MOTM Votes, Muppet Awards, Market Value. Season filter dropdown. Market Value formula: £5M base + £100k/App + £500k/(Goal+Assist+MOTM) - £1M/Muppet.
4. **Squad** — Player grid with coloured initials avatars and stats
5. **Player Profiles** — Individual stats card + full MOM/MOTM award history
6. **Admin Panel** — Hidden password-protected area (triple-click team badge to reveal)
   - Default password: `bont2025`
   - Manage fixtures, bulk import fixtures, mark players present, update scores, add stats/awards
7. **MOTM Voting** — Fan voting opens 48h when admin marks fixture as Finished. One vote per device (fingerprinted via localStorage). Only players marked Present can be voted for.
8. **Multi-Season Support** — Seasons table with current season flag; fixtures linked to seasons; stats filter by season
9. **Footer** — "Real Sosobad (Official)" link to Staveley 6-a-side league site

## DB Schema

Tables:
- `players` — 13-player squad (placeholder names, update via admin)
- `fixtures` — match calendar with scores, voting window, season FK
- `seasons` — season management with is_current flag
- `stats` — goals/assists per fixture per player
- `awards` — mom/motm (admin-assigned)
- `fixture_players` — player presence/apps tracking
- `motm_votes` — fan MOTM votes (device-fingerprinted)

## Admin Access

Triple-tap the team badge in the header → password: `bont2025`

## Key Routes

- `GET /api/squad-stats?seasonId=X` — full squad stats + market value
- `PUT /api/fixtures/:id/players` — set player presence for a fixture
- `GET/POST /api/fixtures/:id/vote` — MOTM voting
- `POST /api/fixtures/bulk` — bulk import fixtures from text

## Deployment Notes

- Frontend: static build (React + Vite)
- API Server: Node.js Express server (needs to run always-on for DB access)
- For "Always On" hosting: select "Reserved VM" in Replit deployment settings when publishing
- Env vars: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD` (optional, defaults to `bont2025`)
