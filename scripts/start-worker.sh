#!/usr/bin/env bash
set -euo pipefail

if [[ "${RUN_DB_MIGRATIONS_ON_STARTUP:-false}" == "true" ]]; then
  echo "[startup] running database migrations"
  bun run db:migrate
fi

echo "[startup] starting worker service"
exec bun run --filter @bountyview/worker start
