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

1. **Dashboard** — Squad photo banner, next fixture countdown, season record (W/D/L), Hall of Fame, recent results
2. **Hall of Fame** — Auto-calculated Top Scorer, Fan Favourite (most MOTMs), Muppet King. Linked to player profiles. Only appears when stats exist.
3. **Fixtures & Results** — Full season fixture list with W/D/L indicators, TBC kickoff support. MOTM voting button appears for 48 hours after a match is marked Finished.
4. **Squad Stats Leaderboard** — Sortable table: Name, Apps, Goals, Assists, MOTM Votes, Muppet Awards, Market Value. Season filter dropdown. Market Value formula: £5M base + £100k/App + £500k/(Goal+Assist+MOTM) - £1M/Muppet.
5. **Squad** — FIFA-style player cards: position badge (GK/DEF/MID/FWD), market value (colour-coded), stats row (Goals/Apps/MOTM), mini SVG sparkline (recent form trend), milestone badges (5 goals / 5 apps / 3 MOTMs). Shows player photo in circle if uploaded, or initials fallback. Muppet of the Match player card shows grayscale filter + 🤡 indicator.
6. **Player Profiles** — Stats (Apps/Goals/Assists/Fan MOTMs), market value + trend arrow, scouting report, teammate comments ("What the Lads Say"), award history. Shows large player photo at top. Muppet banner + grayscale filter applied automatically.
7. **Player Photos** — Mobile-friendly upload via Admin Panel → Edit Player. Images are auto-cropped/resized to 500×500px square on the server using sharp. Stored as base64 JPEG data URLs directly in the `photo_url` database column (bypasses object storage, which had GCS auth issues). Default jersey silhouette shown when no photo uploaded.
8. **Admin Panel** — Hidden password-protected area (triple-click team badge to reveal). Default password: `bont2025`.
   - **Fixtures** — Manage fixtures, mark played, set scores
   - **Import** — Bulk import fixtures from plain text
   - **Players** — Rename players, set position (GK/DEF/MID/FWD), write scouting profile, add/delete teammate quotes, mark player presence per fixture
   - **Stats/Awards** — Add goals, assists, MOM, muppet awards
   - **Settings** — Set squad photo URL (displayed as banner on home page)
8. **MOTM Voting** — Fan voting opens 48h when admin marks fixture as Finished. One vote per device (fingerprinted via localStorage). Only players marked Present can be voted for.
9. **Multi-Season Support** — Seasons table with current season flag; fixtures linked to seasons; stats filter by season
10. **Footer** — "Real Sosobad (Official)" link to Staveley 6-a-side league site

## Player Value Economy

Full market value system with formula-based calculations:
- **Base value**: £5M per player
- **Appearance fee**: +£100k per app
- **Goals**: MID/FWD +£500k, DEF +£300k
- **Assists**: MID/FWD +£300k, DEF +£200k
- **Defensive rating tiers**: Clean sheet +£1.5M, 1-2 conceded +£750k, 3-5 conceded +£100k, 6-9 -£500k, 10+ -£1.5M
- **Team disaster bonus**: All players -£500k when 6+ goals conceded
- **Passenger tax**: MID/FWD 0G 0A = -£300k (waived if rating ≥7.5)
- **Rating bonuses**: 9.0+ +£750k / 7.5-8.5 +£250k / 5.5-6.5 -£250k / <5.0 -£750k
- **MOM award**: +£1M; **Fan MOTM**: +£500k; **King of the Match** (both): +£2M total
- **Muppet award**: -£1M
- Squad sorted by market value desc on Squad page
- King of the Match crown badge shown on player cards
- **Value Report** per fixture (breakdown modal accessible from Fixtures page)
- **Total Squad Value** shown on Dashboard
- `player_value_changes` table stores per-player per-fixture breakdown

## DB Schema

Tables:
- `players` — 13-player squad (placeholder names, update via admin)
- `fixtures` — match calendar with scores, voting window, season FK
- `seasons` — season management with is_current flag
- `stats` — goals/assists per fixture per player
- `awards` — mom/motm/king/muppet (admin-assigned)
- `fixture_players` — player presence/apps tracking
- `motm_votes` — fan MOTM votes (device-fingerprinted)
- `player_value_changes` — per-player per-fixture value change + breakdown JSONB

## Admin Access

Triple-tap the team badge in the header → password: `bont2025`

## Key Routes

- `GET /api/squad-stats?seasonId=X` — full squad stats + market value
- `PUT /api/fixtures/:id/players` — set player presence for a fixture
- `GET/POST /api/fixtures/:id/vote` — MOTM voting
- `POST /api/fixtures/bulk` — bulk import fixtures from text
- `GET /api/fixtures/:id/value-changes` — per-player value breakdown for a fixture
- `POST /api/admin/recalculate-values` — full recalculate all player values from scratch

## Deployment Notes

- Frontend: static build (React + Vite)
- API Server: Node.js Express server (needs to run always-on for DB access)
- For "Always On" hosting: select "Reserved VM" in Replit deployment settings when publishing
- Env vars: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD` (optional, defaults to `bont2025`)
