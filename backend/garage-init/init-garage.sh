#!/bin/sh

# ==========================================
# Garage S3 Initialization Script (POSIX SH)
# ==========================================

set -e

echo "Waiting for Garage Admin API to be ready..."
# Use wget (BusyBox compatible) instead of curl
until wget -q -O - http://garage:3903/health > /dev/null 2>&1; do
  sleep 2
done

echo "Garage is up. Starting initialization..."

# 1. Get Node ID
# Added -h garage:3901 for all garage commands
NODE_ID=$(garage -h garage:3901 status | grep "Node ID:" | awk '{print $3}')
if [ -z "$NODE_ID" ]; then
    # Fallback for different output formats
    NODE_ID=$(garage -h garage:3901 status | grep -E '[0-9a-f]{64}' | head -n 1)
fi

echo "Local Node ID: $NODE_ID"

# 2. Configure Layout (Assign node to a zone)
echo "Assigning node to 'local' zone..."
garage -h garage:3901 layout assign "$NODE_ID" -z local -c 10G || echo "Node already assigned or assignment failed."

# 3. Apply Layout
echo "Applying layout changes..."
garage -h garage:3901 layout apply --version 1 || echo "Layout already applied."

# 4. Import Keys
echo "Importing Access/Secret keys..."
garage -h garage:3901 key import "$GARAGE_ACCESS_KEY" "$GARAGE_SECRET_KEY" || echo "Keys already imported."

# 5. Create Buckets
echo "Ensuring buckets exist..."
garage -h garage:3901 bucket create "$GARAGE_BUCKET" || echo "Bucket $GARAGE_BUCKET exists."
garage -h garage:3901 bucket create "$GARAGE_CHAT_BUCKET" || echo "Bucket $GARAGE_CHAT_BUCKET exists."

# 6. Grant Permissions
echo "Granting permissions to keys..."
garage -h garage:3901 bucket allow "$GARAGE_BUCKET" --read --write --key "$GARAGE_ACCESS_KEY" || echo "Permissions already granted for $GARAGE_BUCKET."
garage -h garage:3901 bucket allow "$GARAGE_CHAT_BUCKET" --read --write --key "$GARAGE_ACCESS_KEY" || echo "Permissions already granted for $GARAGE_CHAT_BUCKET."

echo "Garage initialization completed successfully!"
