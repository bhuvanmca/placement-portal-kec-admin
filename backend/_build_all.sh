#!/bin/bash
services=(auth-service chat-service student-service drive-service admin-service legacy-api)
for svc in "${services[@]}"; do
  echo "=== Building $svc ==="
  cd /Users/venessa/Projects/placement-portal-kec-admin/backend/$svc
  go build ./... 2>&1
  echo "EXIT:$?"
  echo ""
done
