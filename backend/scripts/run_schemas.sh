#!/bin/bash
# ============================================
# Schema Runner
# Runs all service schema.sql files against
# PostgreSQL in the correct dependency order.
#
# Usage:
#   bash scripts/run_schemas.sh
#   DB_URL=... bash scripts/run_schemas.sh
# ============================================

set -e

DOCKER_CONTAINER="${DOCKER_CONTAINER:-local_db}"
DB_NAME="${DB_NAME:-placement_portal_kec_v2}"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Placement Portal — Schema Runner        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Execution order (dependencies first):
# 1. auth-service  → creates shared tables (users, departments, batches)
# 2. drive-service → references users, departments, batches
# 3. student-service → references users, departments
# 4. admin-service → references users, departments, batches
# 5. chat-service  → references users

SCHEMAS=(
    "auth-service/schema.sql"
    "drive-service/schema.sql"
    "student-service/schema.sql"
    "admin-service/schema.sql"
    "chat-service/schema.sql"
)

# Detect execution method
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DOCKER_CONTAINER}$"; then
    EXEC_CMD="docker exec -i ${DOCKER_CONTAINER} psql -U postgres -d ${DB_NAME}"
    echo -e "  Target: ${GREEN}${DOCKER_CONTAINER}/${DB_NAME}${NC}"
elif command -v psql &>/dev/null; then
    EXEC_CMD="psql ${DB_URL:-postgres://postgres:postgres@localhost:5432/${DB_NAME}?sslmode=disable}"
    echo -e "  Target: ${GREEN}direct psql${NC}"
else
    echo -e "${RED}Error: No Docker container or psql found${NC}"
    exit 1
fi

echo ""

PASSED=0
FAILED=0

for schema in "${SCHEMAS[@]}"; do
    SCHEMA_PATH="${BACKEND_DIR}/${schema}"

    if [ ! -f "$SCHEMA_PATH" ]; then
        echo -e "  ${RED}✗${NC} ${schema} — not found"
        FAILED=$((FAILED + 1))
        continue
    fi

    if OUTPUT=$($EXEC_CMD < "$SCHEMA_PATH" 2>&1); then
        echo -e "  ${GREEN}✓${NC} ${schema}"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}✗${NC} ${schema}"
        echo "$OUTPUT" | grep -i "error" | head -3 | sed 's/^/    /'
        FAILED=$((FAILED + 1))
    fi
done

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}  All ${PASSED} schemas applied successfully ✓${NC}"
else
    echo -e "${RED}  ${FAILED} schema(s) failed${NC}"
    exit 1
fi
