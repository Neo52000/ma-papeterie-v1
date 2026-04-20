#!/usr/bin/env bash
# Regenerate Supabase DB types from the live project schema.
# Requires: `supabase` CLI + a valid PROJECT_REF in .env.local (SUPABASE_PROJECT_REF).
set -euo pipefail

if [ ! -f .env.local ]; then
  echo "error: .env.local missing — copy .env.example and fill secrets first." >&2
  exit 1
fi

# shellcheck disable=SC1091
source .env.local

if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "error: SUPABASE_PROJECT_REF not set in .env.local" >&2
  exit 1
fi

echo "→ Generating Supabase types for project ${SUPABASE_PROJECT_REF}..."
npx supabase gen types typescript \
  --project-id "${SUPABASE_PROJECT_REF}" \
  --schema public \
  > src/types/database.ts

echo "✓ src/types/database.ts regenerated."
