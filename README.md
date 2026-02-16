# BountyView

BountyView is a bounty-based technical interview platform where employers fund real interview tasks and candidates submit production-like solutions.

## Monorepo Layout

- `apps/web`: SvelteKit app (frontend + API routes)
- `apps/worker`: background job worker (pg-boss)
- `packages/db`: Drizzle schema + DB client
- `packages/shared`: shared types and validation schemas
- `packages/contracts`: Foundry escrow contract

## Quick Start

1. Install dependencies:
   - `bun install`
2. Copy environment file:
   - `cp .env.example .env`
3. Run migrations (after setting `DATABASE_URL`):
   - `bun run db:migrate`
4. Start web app:
   - `bun run dev`
5. Start worker:
   - `bun run dev:worker`

## Production Migrations

Migrations are SQL files in `packages/db/drizzle/` and are applied with Drizzle (`drizzle-kit migrate`) via:

- `bun run db:migrate`

Recommended production flow (Railway or similar):

1. Deploy build artifact/container.
2. Run a one-off release command or migration job:
   - `bun run db:migrate`
3. Only after migrations succeed, promote/restart `web` and `worker`.

Operational notes:

- Migrations are tracked in Postgres (`__drizzle_migrations`), so reruns are idempotent.
- Keep migrations backward compatible for rolling deploys (add columns first, remove old paths later).
- For this patch, ensure `packages/db/drizzle/0001_hardening.sql` is applied before new web/worker code serves traffic.

Railway automation options:

1. Preferred: configure a release/predeploy command:
   - `bun run db:migrate`
2. Startup fallback (already wired in scripts):
   - Web service start command: `bun run start:web`
   - Worker service start command: `bun run start:worker`
   - Set `RUN_DB_MIGRATIONS_ON_STARTUP=true` only for one service to avoid concurrent migration runners.

## Product Notes

- Interview-first positioning is enforced in UI copy and schema (`what_happens_after` required).
- Escrow status is synced event-first from Base and reconciled by scheduled jobs.
- GitHub automation uses both OAuth (identity) and GitHub App (org repo operations).
- Candidate blocking is per employer.
