#!/usr/bin/env bash
# Kokoaa supabase/migrations/*.sql yhdeksi tiedostoksi supabase/schema.sql.
# Ajo: bash scripts/build-schema.sh
set -euo pipefail
cd "$(dirname "$0")/.."
out=supabase/schema.sql
{
  echo "-- Home ERP: koko tietokantaskeema yhtenä tiedostona."
  echo "-- Liitä Supabasen SQL-editoriin (SQL Editor → New query) ja aja kerran tyhjään projektiin."
  echo "-- Tämä tiedosto on generoitu: muokkaa supabase/migrations/-tiedostoja ja aja scripts/build-schema.sh."
  for f in supabase/migrations/*.sql; do
    printf '\n-- =====================================================================\n'
    printf -- '-- %s\n' "$(basename "$f")"
    printf -- '-- =====================================================================\n\n'
    cat "$f"
    echo
  done
} > "$out"
echo "Kirjoitettu $out"
