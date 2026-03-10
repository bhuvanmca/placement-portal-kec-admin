#!/bin/sh
# ============================================
# Versioned Migration Runner (POSIX SH)
# Tracks and applies service migrations.
#
# Usage:
#   sh scripts/run_schemas.sh
# ============================================

set -e

DOCKER_CONTAINER="${DOCKER_CONTAINER:-local_db}"
DB_NAME="${DB_NAME:-kecdrives-db}"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# POSIX friendly directory detection
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKEND_DIR=$(dirname "$SCRIPT_DIR")

echo "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo "${CYAN}║   Placement Portal — Migration Runner     ║${NC}"
echo "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Detect execution method
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DOCKER_CONTAINER}$"; then
    # Use -h 127.0.0.1 to force TCP
    EXEC_CMD="docker exec -i ${DOCKER_CONTAINER} psql -h 127.0.0.1 -U postgres -d ${DB_NAME}"
    echo "  Target: ${GREEN}${DOCKER_CONTAINER}/${DB_NAME}${NC}"
elif command -v psql > /dev/null 2>&1; then
    EXEC_CMD="psql ${DB_URL:-postgres://postgres:postgres@localhost:5432/${DB_NAME}?sslmode=disable}"
    echo "  Target: ${GREEN}direct psql${NC}"
else
    echo "${RED}Error: No Docker container or psql found${NC}"
    exit 1
fi

# 1. Wait for database to be ready
echo "  Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until $EXEC_CMD -c "SELECT 1" > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        echo "${RED}Error: Database timed out after 30 seconds${NC}"
        exit 1
    fi
    printf "."
    sleep 1
done
echo " ${GREEN}Ready!${NC}"

# 0. Check for Force Re-initialization
if [ "$FORCE_REINIT" = "true" ]; then
    echo "${RED}☢️  FORCE_REINIT ENABLED: Nuking existing schemas...${NC}"
    $EXEC_CMD -c "
        DROP SCHEMA IF EXISTS auth CASCADE;
        DROP SCHEMA IF EXISTS student CASCADE;
        DROP SCHEMA IF EXISTS drive CASCADE;
        DROP SCHEMA IF EXISTS admin CASCADE;
        DROP SCHEMA IF EXISTS chat CASCADE;
        DROP SCHEMA IF EXISTS analytics CASCADE;
        DROP SCHEMA IF EXISTS public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;
    " > /dev/null 2>&1
    echo "  ${GREEN}✓${NC} Database Nuked."
fi

# 2. Ensure migrations_history table exists
$EXEC_CMD -c "CREATE TABLE IF NOT EXISTS public.migrations_history (
    id SERIAL PRIMARY KEY,
    service VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service, filename)
);" > /dev/null 2>&1

SERVICES="auth-service drive-service student-service admin-service chat-service analytics-service"

echo ""
echo "  Checking for new migrations..."

APPLIED=0
SKIPPED=0

for service in $SERVICES; do
    MIGRATIONS_DIR="${BACKEND_DIR}/${service}/migrations"
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        continue
    fi

    # Sort files naturally
    files=$(ls "$MIGRATIONS_DIR"/*.sql | sort)

    for file_path in $files; do
        filename=$(basename "$file_path")
        
        # Check if already applied
        # Use -t for tuples only, xargs to trim whitespace
        ALREADY_RUN=$($EXEC_CMD -t -c "SELECT count(*) FROM public.migrations_history WHERE service='${service}' AND filename='${filename}'" | xargs)

        if [ "$ALREADY_RUN" = "1" ]; then
            SKIPPED=$((SKIPPED + 1))
            continue
        fi

        echo "  ${CYAN}Applying${NC} ${service}:${filename}..."
        
        if $EXEC_CMD < "$file_path" > /tmp/mig_out 2>&1; then
            $EXEC_CMD -c "INSERT INTO public.migrations_history (service, filename) VALUES ('${service}', '${filename}')" > /dev/null 2>&1
            echo "  ${GREEN}✓${NC} Success"
            APPLIED=$((APPLIED + 1))
        else
            echo "  ${RED}✗ Failed${NC}"
            grep -i "error" /tmp/mig_out | head -n 3 | sed 's/^/    /'
            exit 1
        fi
    done
done

echo ""
echo "${GREEN}  Summary: ${APPLIED} applied, ${SKIPPED} already up-to-date.${NC}"
echo ""
