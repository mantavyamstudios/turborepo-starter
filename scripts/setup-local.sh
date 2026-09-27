#!/usr/bin/env bash
# Local, key-free setup: creates env files from the examples, points every app
# at a local Postgres database, installs dependencies and applies migrations.
# Safe to re-run: existing env files are left untouched.
set -euo pipefail

cd "$(dirname "$0")/.."

DB_NAME="${DB_NAME:-next_forge}"
DATABASE_URL="${DATABASE_URL:-postgresql://$(whoami)@localhost:5432/${DB_NAME}}"

# app dir -> env file name (same mapping as the next-forge init command)
targets=(
  "apps/api:.env.local"
  "apps/app:.env.local"
  "apps/web:.env.local"
  "packages/cms:.env.local"
  "packages/database:.env"
  "packages/internationalization:.env.local"
)

for entry in "${targets[@]}"; do
  dir="${entry%%:*}"
  file="$dir/${entry##*:}"
  if [[ -f "$file" ]]; then
    echo "skip   $file (already exists)"
    continue
  fi
  # Empty values ("") fail key-format validation (e.g. startsWith("sk_")), so
  # comment them out: optional integrations then stay disabled until a real
  # key is added.
  sed -E 's/^([A-Z0-9_]+)=""$/# \1=""/' "$dir/.env.example" \
    | sed -E "s|^# DATABASE_URL=\"\"$|DATABASE_URL=\"${DATABASE_URL}\"|" \
    > "$file"
  echo "create $file"
done

if command -v createdb >/dev/null 2>&1; then
  createdb "$DB_NAME" 2>/dev/null && echo "create database $DB_NAME" \
    || echo "skip   database $DB_NAME (exists or Postgres not running)"
fi

bun install
bun run migrate:deploy

echo
echo "Done. Start everything with: bun run dev:local"
