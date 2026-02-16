#!/usr/bin/env bash
set -euo pipefail

if [[ "${RUN_DB_MIGRATIONS_ON_STARTUP:-true}" == "true" ]]; then
  echo "[startup] running database migrations"
  bun run db:migrate
fi

echo "[startup] starting web service"
exec bun run --filter @bountyview/web start
