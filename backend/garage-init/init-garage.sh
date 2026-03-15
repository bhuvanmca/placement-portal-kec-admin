#!/bin/sh

# ==========================================
# Garage S3 Initialization Script
# ==========================================

set -x

echo "Step 1: Probing Garage Admin API (3903)..."
for i in $(seq 1 15); do
    if wget -q -O - http://garage:3903/health > /dev/null 2>&1; then
        echo "Admin API is up."
        break
    fi
    echo "Waiting for Garage ($i/15)..."
    sleep 2
done

echo "Step 2: Discovering Node ID from Admin Status API..."
NODE_ID=""
for i in $(seq 1 15); do
    NODE_ID=$(wget -qO- --header "Authorization: Bearer $GARAGE_ADMIN_TOKEN" http://garage:3903/v1/status \
        | grep -oE '"node": *"[0-9a-fA-F]+"' | grep -oE '[0-9a-fA-F]{8,}' | head -1)
    if [ -n "$NODE_ID" ]; then
        echo "Node ID discovered: $NODE_ID"
        break
    fi
    echo "Waiting for Admin Status API ($i/15)..."
    sleep 2
done

if [ -z "$NODE_ID" ]; then
    echo "Error: Could not discover Node ID. Check that GARAGE_ADMIN_TOKEN matches admin_token in garage.toml."
    exit 1
fi

# Garage CLI v1.0.x format: node_id@hostname:port
REMOTE_ID="${NODE_ID}@garage:3901"
echo "Identified remote target: $REMOTE_ID"

# Step 3: Layout Assignment
echo "Configuring cluster layout..."
garage -h "$REMOTE_ID" layout assign "$NODE_ID" -z local -c 350G || echo "Node assignment skipped/failed (likely already assigned)."

# Step 4: Layout Application (get current version and increment)
echo "Applying changes..."
CURRENT_VERSION=$(garage -h "$REMOTE_ID" layout show 2>/dev/null | grep -oE 'version [0-9]+' | grep -oE '[0-9]+' | tail -1)
NEXT_VERSION=$(( ${CURRENT_VERSION:-0} + 1 ))
garage -h "$REMOTE_ID" layout apply --version "$NEXT_VERSION" || echo "Apply skipped (likely already applied)."

# Step 5: Key Management
echo "Configuring access keys..."
garage -h "$REMOTE_ID" key import --yes "$GARAGE_ACCESS_KEY" "$GARAGE_SECRET_KEY" || echo "Keys already imported."

# Step 6: Bucket Management
echo "Ensuring production buckets..."
garage -h "$REMOTE_ID" bucket create "$GARAGE_BUCKET" || echo "Bucket $GARAGE_BUCKET exists."
garage -h "$REMOTE_ID" bucket create "$GARAGE_CHAT_BUCKET" || echo "Bucket $GARAGE_CHAT_BUCKET exists."

# Step 7: Permission Management
echo "Enforcing read/write permissions..."
garage -h "$REMOTE_ID" bucket allow "$GARAGE_BUCKET" --read --write --key "$GARAGE_ACCESS_KEY" || echo "Permissions already set."
garage -h "$REMOTE_ID" bucket allow "$GARAGE_CHAT_BUCKET" --read --write --key "$GARAGE_ACCESS_KEY" || echo "Permissions already set."

# Step 8: Set Public Read Policy on Main Bucket (for resumes, drive attachments, logos)
# Chat bucket remains private (requires presigned URLs)
echo "Setting public read policy on main bucket..."
PUBLIC_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${GARAGE_BUCKET}/*"]
    }
  ]
}
EOF
)

# Use the Garage admin API to set the bucket website/policy
# Garage supports anonymous access via bucket policies
wget -q -O /dev/null --method PUT \
  --header "Authorization: Bearer $GARAGE_ADMIN_TOKEN" \
  --header "Content-Type: application/json" \
  --body-data "{\"websiteAccess\":{\"enabled\":true,\"indexDocument\":\"index.html\",\"errorDocument\":\"\"}}" \
  "http://garage:3903/v1/bucket?id=$(wget -qO- --header "Authorization: Bearer $GARAGE_ADMIN_TOKEN" "http://garage:3903/v1/bucket?globalAlias=$GARAGE_BUCKET" | grep -oE '"id":"[^"]+' | cut -d'"' -f4)" \
  || echo "Website config skipped."

# Apply the public read bucket policy using S3 API
# We use the access key to authenticate this API call
export AWS_ACCESS_KEY_ID="$GARAGE_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$GARAGE_SECRET_KEY"

# Use wget with S3-style auth to set bucket policy
# Simpler approach: use garage CLI to allow anonymous read
garage -h "$REMOTE_ID" bucket website "$GARAGE_BUCKET" --allow || echo "Website access already enabled."

echo "Garage setup finalized. System ready."
exit 0
