#!/usr/bin/env bash
# Example environment configuration for DEV database apply/check.

export DEV_DB_HOST="db.rgjfvbnqqqnpkpkldmhi.supabase.co"
export DEV_DB_PASSWORD="your_dev_db_password"

# Optional overrides (defaults shown):
export DEV_DB_USER="postgres"
export DEV_DB_NAME="postgres"
export DEV_DB_PORT="5432"

# Optional: allow IPv6 fallback if no IPv4 A record exists.
# export DEV_DB_ALLOW_IPV6="1"
