#!/usr/bin/env bash
set -euo pipefail

ALLOWED_HOST="db.rgjfvbnqqqnpkpkldmhi.supabase.co"
SCHEMA_FILE="supabase/prod_schema.sql"

print_usage() {
  cat <<'USAGE'
Usage: scripts/db_apply_dev.sh [--check] [--allow-ipv6]

Options:
  --check        Run DNS/connectivity checks only; do not apply schema.
  --allow-ipv6   Allow IPv6 fallback when no IPv4 A record is available.
USAGE
}

MODE="apply"
ALLOW_IPV6="${DEV_DB_ALLOW_IPV6:-0}"
if [[ "${1:-}" == "--check" ]]; then
  MODE="check"
  shift
fi
if [[ "${1:-}" == "--allow-ipv6" ]]; then
  ALLOW_IPV6="1"
  shift
fi
if [[ -n "${1:-}" ]]; then
  print_usage
  exit 2
fi

if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "Error: NODE_ENV=production; refusing to run." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is not installed or not on PATH." >&2
  exit 1
fi

if [[ -z "${DEV_DB_HOST:-}" ]]; then
  echo "Error: DEV_DB_HOST is required." >&2
  exit 1
fi

if [[ "${DEV_DB_HOST}" != "${ALLOWED_HOST}" ]]; then
  echo "Error: DEV_DB_HOST must be exactly '${ALLOWED_HOST}'." >&2
  exit 1
fi

if [[ -z "${DEV_DB_PASSWORD:-}" ]]; then
  echo "Error: DEV_DB_PASSWORD is required." >&2
  exit 1
fi

DEV_DB_USER="${DEV_DB_USER:-postgres}"
DEV_DB_NAME="${DEV_DB_NAME:-postgres}"
DEV_DB_PORT="${DEV_DB_PORT:-5432}"

resolve_ipv4() {
  local host="$1"
  local ip=""
  local cname=""
  local resolver=""

  is_ipv4() {
    [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]
  }

  if command -v getent >/dev/null 2>&1; then
    ip=$(getent ahostsv4 "$host" | awk '{print $1; exit}')
  elif command -v dig >/dev/null 2>&1; then
    ip=$(dig +short A "$host" | awk 'NR==1 {print $1}')
    if ! is_ipv4 "$ip"; then
      for resolver in 1.1.1.1 8.8.8.8 9.9.9.9; do
        ip=$(dig @"$resolver" +short A "$host" | awk 'NR==1 {print $1}')
        if is_ipv4 "$ip"; then
          break
        fi
      done
    fi
    if ! is_ipv4 "$ip"; then
      cname=$(dig +short "$host" | tail -n 1)
      if [[ -n "$cname" ]] && ! is_ipv4 "$cname"; then
        ip=$(dig +short A "$cname" | awk 'NR==1 {print $1}')
        if ! is_ipv4 "$ip"; then
          for resolver in 1.1.1.1 8.8.8.8 9.9.9.9; do
            ip=$(dig @"$resolver" +short A "$cname" | awk 'NR==1 {print $1}')
            if is_ipv4 "$ip"; then
              break
            fi
          done
        fi
      fi
    fi
  elif command -v host >/dev/null 2>&1; then
    ip=$(host -t A "$host" | awk '/has address/ {print $4; exit}')
  elif command -v nslookup >/dev/null 2>&1; then
    ip=$(nslookup -type=A "$host" | awk '/^Address: /{print $2}' | grep -E '^[0-9.]+$' | head -n 1)
  else
    echo "Error: no DNS resolver tool found (getent/dig/nslookup)." >&2
    return 1
  fi

  if [[ -z "$ip" ]]; then
    echo ""
    return 0
  fi

  echo "$ip"
}

resolve_ipv6() {
  local host="$1"
  local ip=""
  local resolver=""

  if command -v getent >/dev/null 2>&1; then
    ip=$(getent ahostsv6 "$host" | awk '{print $1; exit}')
  elif command -v dig >/dev/null 2>&1; then
    ip=$(dig +short AAAA "$host" | awk 'NR==1 {print $1}')
    if [[ -z "$ip" ]]; then
      for resolver in 1.1.1.1 8.8.8.8 9.9.9.9; do
        ip=$(dig @"$resolver" +short AAAA "$host" | awk 'NR==1 {print $1}')
        if [[ -n "$ip" ]]; then
          break
        fi
      done
    fi
  elif command -v host >/dev/null 2>&1; then
    ip=$(host -t AAAA "$host" | awk '/has IPv6 address/ {print $5; exit}')
  elif command -v nslookup >/dev/null 2>&1; then
    ip=$(nslookup -type=AAAA "$host" | awk '/^Address: /{print $2}' | head -n 1)
  fi

  if [[ -z "$ip" ]]; then
    echo ""
    return 0
  fi

  echo "$ip"
}

supports_psql_ipv4_flag() {
  psql --help 2>/dev/null | grep -qE '(^|[[:space:]])-4([[:space:]]|,)' 
}

echo "Checking DNS for ${DEV_DB_HOST}..."
DEV_DB_IPV4="$(resolve_ipv4 "${DEV_DB_HOST}")"
if [[ -n "${DEV_DB_IPV4}" ]]; then
  echo "Resolved IPv4: ${DEV_DB_IPV4}"
elif [[ "${ALLOW_IPV6}" == "1" ]]; then
  DEV_DB_IPV6="$(resolve_ipv6 "${DEV_DB_HOST}")"
  if [[ -z "${DEV_DB_IPV6}" ]]; then
    echo "Error: failed to resolve IPv6 address for ${DEV_DB_HOST}." >&2
    exit 1
  fi
  echo "No IPv4 A record; using IPv6 (${DEV_DB_IPV6})."
else
  echo "Error: failed to resolve IPv4 address for ${DEV_DB_HOST}." >&2
  echo "Hint: set DEV_DB_ALLOW_IPV6=1 or pass --allow-ipv6 to allow IPv6 fallback." >&2
  exit 1
fi

export PGHOST="${DEV_DB_HOST}"
export PGPORT="${DEV_DB_PORT}"
export PGUSER="${DEV_DB_USER}"
export PGDATABASE="${DEV_DB_NAME}"
export PGPASSWORD="${DEV_DB_PASSWORD}"
export PGSSLMODE="require"

PSQL_IPV4_FLAG=""
if [[ -n "${DEV_DB_IPV4}" ]] && supports_psql_ipv4_flag; then
  PSQL_IPV4_FLAG="-4"
elif [[ -n "${DEV_DB_IPV4}" ]]; then
  export PGHOSTADDR="${DEV_DB_IPV4}"
fi

check_connectivity() {
  echo "Checking connectivity to DEV database..."
  if psql -X -v ON_ERROR_STOP=1 ${PSQL_IPV4_FLAG} -c 'select 1 as ok;' >/dev/null; then
    echo "Connectivity check succeeded."
  else
    echo "Error: connectivity check failed." >&2
    exit 1
  fi
}

if [[ "${MODE}" == "check" ]]; then
  check_connectivity
  echo "Check-only mode complete."
  exit 0
fi

if [[ ! -f "${SCHEMA_FILE}" ]]; then
  echo "Error: schema file not found at ${SCHEMA_FILE}." >&2
  exit 1
fi

check_connectivity

echo "Applying schema from ${SCHEMA_FILE} to DEV database..."
if psql -X -v ON_ERROR_STOP=1 ${PSQL_IPV4_FLAG} -f "${SCHEMA_FILE}"; then
  echo "Schema applied successfully."
else
  echo "Error: schema apply failed." >&2
  exit 1
fi
