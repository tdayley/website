#!/usr/bin/env bash
# Runs the access-rule tests against a throwaway local Postgres database.
# Needs a local Postgres server you can reach with psql (e.g. `createdb` works).
# Usage: supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=giftstest_$$
createdb "$DB"
trap 'dropdb "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/supabase_stub.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -t -A -v ON_ERROR_STOP=1 -d "$DB" -f tests/rls_test.sql 2>&1 \
	| sed 's/^psql:[^ ]* NOTICE:  //' | grep -v '^$' | grep -v '^[0-9a-f]\{8\}-'
