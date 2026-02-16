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
   - `npm install`
2. Copy environment file:
   - `cp .env.example .env`
3. Run migrations (after setting `DATABASE_URL`):
   - `npm run db:migrate --workspace @bountyview/db`
4. Start web app:
   - `npm run dev`
5. Start worker:
   - `npm run dev:worker`

## Product Notes

- Interview-first positioning is enforced in UI copy and schema (`what_happens_after` required).
- Escrow status is synced event-first from Base and reconciled by scheduled jobs.
- GitHub automation uses both OAuth (identity) and GitHub App (org repo operations).
- Candidate blocking is per employer.
