#!/usr/bin/env bash
# Sobe um Postgres 16 descartável, aplica todas as migrações e roda os testes.
# Uso: ./scripts/db-test.sh
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/var/lib/pgtest/data}
PGPORT=${PGPORT:-55432}
PGHOST=/tmp
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! pg_isready -h "$PGHOST" -p "$PGPORT" >/dev/null 2>&1; then
  id -u pgtest >/dev/null 2>&1 || useradd -m pgtest
  mkdir -p "$(dirname "$PGDATA")" && chown -R pgtest "$(dirname "$PGDATA")"
  [ -f "$PGDATA/PG_VERSION" ] || su pgtest -c "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
  su pgtest -c "$PGBIN/pg_ctl -D $PGDATA -o '-p $PGPORT -k $PGHOST' -l /tmp/pg.log start" >/dev/null
  sleep 2
fi

psql -h "$PGHOST" -p "$PGPORT" -U postgres -q \
  -c "drop database if exists gf;" -c "create database gf;" >/dev/null

run() { psql -h "$PGHOST" -p "$PGPORT" -U postgres -d gf -v ON_ERROR_STOP=1 -q -f "$1" 2>&1 \
        | grep -vE "NOTICE: +(trigger|policy|view|database) " || true; }

run "$ROOT/supabase/tests/_local_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ $(basename "$f")"; run "$f"
done

echo
echo "=== teste de isolamento A x B ==="
psql -h "$PGHOST" -p "$PGPORT" -U postgres -d gf -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/rls_isolation.sql" 2>&1 \
  | sed 's/psql:[^ ]*sql:[0-9]*: //' | grep -E "SUCESSO|FALHA|ERROR"
echo
echo "=== critérios de aceite (exemplo da seção 8) ==="
psql -h "$PGHOST" -p "$PGPORT" -U postgres -d gf -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/acceptance.sql" 2>&1 \
  | sed 's/psql:[^ ]*sql:[0-9]*: //' | grep -E "SUCESSO|FALHA|ERROR"
