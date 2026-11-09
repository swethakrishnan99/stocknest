#!/usr/bin/env sh
# Runs the database tests against an empty Postgres: DATABASE_URL=postgres://… sh supabase/tests/run.sh
set -e
cd "$(dirname "$0")/../.."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/auth_stub.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/setup.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/setup.sql   # running it twice must be safe
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -t -f supabase/tests/rls_test.sql | grep "PASSED"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -t -f supabase/tests/qty_test.sql | grep "PASSED"
