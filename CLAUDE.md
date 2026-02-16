# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is BountyView

A bounty-based technical interview platform where employers fund real interview tasks (escrowed on-chain via Base) and candidates submit production-like solutions. Two user roles: `employer` and `candidate`.

## Package Manager

This project uses **bun** exclusively. Always use `bun` and `bunx` -- never `npm`, `npx`, `pnpm`, or `pnpx`.

## Commands

```bash
bun install                # Install all workspace dependencies
bun run dev                # Start web app dev server (SvelteKit + Vite)
bun run dev:worker         # Start background worker (tsx watch)
bun run build              # Build all workspaces
bun run check              # Type-check all workspaces (svelte-check + tsc --noEmit)
bun run db:generate        # Generate Drizzle migration SQL from schema changes
bun run db:migrate         # Apply migrations to DATABASE_URL
```

There are no test suites configured. CI runs `bun run check` and verifies migration drift (`bun run db:generate && git diff --exit-code`).

## Monorepo Structure

Bun workspaces with four packages:

- **`apps/web`** — SvelteKit 2 app (Svelte 5, adapter-node). Frontend pages + API routes. Auth via `@auth/sveltekit` with GitHub OAuth.
- **`apps/worker`** — pg-boss background job processor. Cron jobs for escrow sync and bounty state reconciliation.
- **`packages/db`** — Drizzle ORM schema, Postgres client (`pg` pool), and repository query functions. Shared by both apps.
- **`packages/shared`** — Zod validation schemas, TypeScript types, and constants (role enums, queue names). No runtime dependencies beyond Zod.

Packages reference each other as `@bountyview/db`, `@bountyview/shared` at version `0.1.0` with TypeScript source paths (no build step for packages).

## Architecture

### Auth & Session

GitHub OAuth via `@auth/sveltekit`. On first sign-in, a user row is auto-created with role `candidate`. The session callback enriches the JWT with `userId`, `role`, `githubId`, `githubUsername`, `companyId`.

`hooks.server.ts` enforces: terms acceptance (redirect to `/terms`), employer-only paths (`/bounties/new`, `/bounties/[id]/submissions`, `/templates`), candidate-only paths (`/bounties/[id]/submit`), and authenticated-only paths (`/dashboard`, `/wallet`). The current user is attached to `event.locals.currentUser`.

### API Routes

SvelteKit API routes under `apps/web/src/routes/api/`. Key patterns:
- All bounty actions are at `/api/bounties/[id]/{action}` (claim, claim-winner, fund, submit, withdraw)
- Webhook endpoints at `/api/webhooks/{circle,github}`
- Session management at `/api/session/{role,terms/accept}`
- Request bodies validated with Zod schemas from `@bountyview/shared`

### Server Services (`apps/web/src/lib/server/services/`)

- **`escrow.ts`** — Verifies on-chain transactions (fund, claim, cancel) against the Base escrow contract using `viem`. Decodes event logs from transaction receipts.
- **`github.ts`** — GitHub App integration via `@octokit/app`. Creates bounty repos (from template or blank), grants/revokes candidate push access, fetches PR artifacts.
- **`circle.ts`** — Circle API (sandbox) for fiat withdrawals. HMAC webhook signature verification.

### Database

Postgres with Drizzle ORM (`drizzle-orm/node-postgres`). Schema in `packages/db/src/schema.ts`. Key tables: `users`, `companies`, `bounties`, `submissions`, `bounty_funding`, `escrow_events`, `github_repos`, `github_access_grants`, `payouts`, `employer_blocks`, `job_runs`.

Migrations are SQL files in `packages/db/drizzle/`. Drizzle config: `packages/db/drizzle.config.ts`. After schema changes, run `bun run db:generate` to produce migration SQL, then `bun run db:migrate` to apply.

Repository functions in `packages/db/src/repositories.ts` provide reusable query patterns (joins, filters) used by API routes.

### Background Worker

pg-boss queue processor in `apps/worker`. Queue names defined in `packages/shared` (`QUEUE_NAMES`). Jobs:
- `sync_escrow_events` (cron: every 2 min) — Syncs on-chain escrow events
- `reconcile_bounty_state` (cron: every 15 min) — Reconciles bounty status with chain state
- `github_repo_provision`, `github_access_revoke` — Async GitHub operations
- `circle_withdraw_status_poll` — Polls Circle transfer status
- `retry_failed_integrations` — Retries failed external calls

### Environment

Env vars validated with Zod in `apps/web/src/lib/server/env.ts`. Requires: `DATABASE_URL`, GitHub OAuth + App credentials, Circle API keys, Base RPC/contract addresses, Privy config. The `getEnv()` function memoizes the parsed result.

### On-Chain

Escrow contract on Base (chain ID 8453). USDC amounts use 6 decimals. The app verifies transactions by decoding event logs from receipts — it does not submit transactions itself.
