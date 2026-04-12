# KECDrives — VM Partitioning & Storage Separation Guide

> **Date**: Generated for production VM at `172.16.1.208`  
> **Current State**: Single `sda3` partition (496.9 GB), ~383 GB used, ~82 GB free  
> **Goal**: Properly separate PostgreSQL data and Garage object storage for 10-year data handling

---

## ⚠️ IMPORTANT — Read Before Proceeding

1. **BACKUP FIRST** — Use the new "Full Batch Backup" feature in Storage Console to download all batch data before any partitioning work.
2. **Schedule downtime** — Partitioning requires stopping Docker services (~15 minutes).
3. **Do NOT resize the root partition** on a live system without a backup.
4. This guide uses Docker bind mounts and directory-based separation (no LVM repartitioning needed).

---

## Strategy: Directory-Based Separation (Safest)

Since the VM has a single 500 GB partition and re-partitioning a live disk is risky, we'll use **dedicated directories with proper ownership and mount points** instead of physical partitions. If the VM has an additional disk or you can attach one, see Section 5.

### Current Docker Volume Layout

| Volume          | Docker Volume     | Current Location                          |
| --------------- | ----------------- | ----------------------------------------- |
| PostgreSQL data | `pg_data`         | `/var/lib/docker/volumes/pg_data`         |
| Garage data     | `garage_data`     | `/var/lib/docker/volumes/garage_data`     |
| Redis           | (ephemeral)       | In-memory                                 |
| Prometheus      | `prometheus_data` | `/var/lib/docker/volumes/prometheus_data` |
| Grafana         | `grafana_data`    | `/var/lib/docker/volumes/grafana_data`    |

### Target Layout

| Purpose            | Path             | Size    | Docker Config                |
| ------------------ | ---------------- | ------- | ---------------------------- |
| PostgreSQL data    | `/data/postgres` | ~10 GB  | Bind mount in docker-compose |
| Garage storage     | `/data/garage`   | ~300 GB | Bind mount in docker-compose |
| Backups (staging)  | `/data/backups`  | ~50 GB  | Used by backup cron jobs     |
| OS + Docker + Rest | `/` (root)       | ~140 GB | Default                      |

---

## Step 1: Create Directory Structure

```bash
# SSH into the VM
ssh -p 3456 administrator@172.16.1.208

# Create dedicated data directories
sudo mkdir -p /data/postgres
sudo mkdir -p /data/garage/meta
sudo mkdir -p /data/garage/data
sudo mkdir -p /data/backups/postgres
sudo mkdir -p /data/backups/garage

# Set proper ownership
sudo chown -R 999:999 /data/postgres       # UID 999 = postgres user in container
sudo chown -R root:root /data/garage        # Garage runs as root in container
sudo chmod 700 /data/postgres
sudo chmod 755 /data/garage
sudo chmod 755 /data/backups
```

---

## Step 2: Migrate PostgreSQL Data (Zero Data Loss)

```bash
# Navigate to the project directory
cd /path/to/api-kecdrives  # adjust to actual path

# 1. Stop all services gracefully
sudo docker compose down

# 2. Copy existing Postgres data to new location
# Find the current volume path
PGVOL=$(sudo docker volume inspect api-kecdrives_pg_data -f '{{ .Mountpoint }}')
echo "Current PG data at: $PGVOL"

# Copy data preserving permissions
sudo rsync -avP "$PGVOL/" /data/postgres/

# 3. Verify the copy
sudo ls -la /data/postgres/
# Should see: PG_VERSION, base/, global/, pg_wal/, etc.
sudo du -sh /data/postgres/
# Compare with: sudo du -sh "$PGVOL/"
```

---

## Step 3: Migrate Garage Data (Zero Data Loss)

```bash
# 1. Find current Garage volume path
GARAGEVOL=$(sudo docker volume inspect api-kecdrives_garage_data -f '{{ .Mountpoint }}')
echo "Current Garage data at: $GARAGEVOL"

# 2. Copy data preserving permissions
sudo rsync -avP "$GARAGEVOL/" /data/garage/

# 3. Verify
sudo ls -la /data/garage/
# Should see: meta/ and data/ directories
sudo du -sh /data/garage/
```

---

## Step 4: Update docker-compose.yml

Replace the named volume references with bind mounts:

### PostgreSQL Service — Change volumes section:

```yaml
  postgres:
    image: postgres:15.10-alpine
    container_name: local_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: kecdrives-db
    command:
      - "postgres"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "work_mem=8MB"
      - "-c"
      - "effective_cache_size=512MB"
    volumes:
      - /data/postgres:/var/lib/postgresql/data    # <-- CHANGED: bind mount
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U postgres -d kecdrives-db" ]
      interval: 15s
      timeout: 5s
      retries: 5
```

### Garage Service — Change volumes section:

```yaml
  garage:
    image: dxflrs/garage:v1.0.1
    container_name: local_storage
    restart: always
    environment:
      RUST_LOG: garage=info
    volumes:
      - ./garage.toml:/etc/garage.toml
      - /data/garage:/var/lib/garage               # <-- CHANGED: bind mount
```

### Update garage.toml (paths stay the same — they're container-internal paths):

No changes needed to `garage.toml` since the internal paths (`/var/lib/garage/meta` and `/var/lib/garage/data`) remain the same. The bind mount maps `/data/garage` on the host to `/var/lib/garage` in the container.

### Remove old named volumes from the bottom of docker-compose.yml:

```yaml
volumes:
  # pg_data:           # REMOVED — now using bind mount
  # garage_data:       # REMOVED — now using bind mount
  caddy_data:
  caddy_config:
  prometheus_data:
  grafana_data:
  pgadmin_data:
```

---

## Step 5: Start Services & Verify

```bash
# 1. Start all services
sudo docker compose up -d

# 2. Verify PostgreSQL
sudo docker exec local_db pg_isready -U postgres -d kecdrives-db
# Expected: "accepting connections"

# 3. Verify data integrity — count students
sudo docker exec local_db psql -U postgres -d kecdrives-db -c "SELECT COUNT(*) FROM student_personal;"

# 4. Verify Garage
sudo docker exec local_storage garage status
# Should show the node and bucket info

# 5. Check all services are healthy
sudo docker compose ps
# All should show "healthy" or "running"
```

---

## Step 6: Clean Up Old Docker Volumes (Only After Verification!)

> ⚠️ Only do this AFTER confirming all services are running correctly with the new bind mounts.

```bash
# Remove the old named volumes (data already copied to /data/)
sudo docker volume rm api-kecdrives_pg_data
sudo docker volume rm api-kecdrives_garage_data
```

---

## Step 7: Set Up Automated Backups

### PostgreSQL Daily Backup (cron job)

```bash
# Create backup script
sudo tee /data/backups/pg_backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/data/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kecdrives_${TIMESTAMP}.dump"

# Create compressed backup
docker exec local_db pg_dump -Fc -U postgres kecdrives-db > "$BACKUP_FILE"

# Keep last 7 daily backups
find "$BACKUP_DIR" -name "kecdrives_*.dump" -mtime +7 -delete

# Log
echo "[$(date)] Backup created: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))" >> /data/backups/backup.log
EOF

sudo chmod +x /data/backups/pg_backup.sh

# Add to crontab — runs daily at 2 AM
echo "0 2 * * * root /data/backups/pg_backup.sh" | sudo tee /etc/cron.d/kecdrives-pg-backup
```

### Garage Weekly Backup (cron job)

```bash
# Create Garage backup script
sudo tee /data/backups/garage_backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/data/backups/garage"
TIMESTAMP=$(date +%Y%m%d)

# Create tarball of Garage data directory
tar -czf "$BACKUP_DIR/garage_backup_${TIMESTAMP}.tar.gz" -C /data/garage .

# Keep last 4 weekly backups
find "$BACKUP_DIR" -name "garage_backup_*.tar.gz" -mtime +28 -delete

echo "[$(date)] Garage backup created" >> /data/backups/backup.log
EOF

sudo chmod +x /data/backups/garage_backup.sh

# Runs every Sunday at 3 AM
echo "0 3 * * 0 root /data/backups/garage_backup.sh" | sudo tee /etc/cron.d/kecdrives-garage-backup
```

---

## Step 8: Monitor Disk Usage

Add a simple disk usage alert script:

```bash
sudo tee /data/backups/disk_check.sh << 'EOF'
#!/bin/bash
THRESHOLD=85

# Check overall disk usage
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$USAGE" -ge "$THRESHOLD" ]; then
    echo "[$(date)] WARNING: Disk usage at ${USAGE}%" >> /data/backups/disk_alerts.log
    # Could also send email notification via SMTP
fi

# Check individual data directories
for dir in /data/postgres /data/garage /data/backups; do
    SIZE=$(du -sh "$dir" 2>/dev/null | cut -f1)
    echo "[$(date)] $dir: $SIZE" >> /data/backups/disk_usage.log
done
EOF

sudo chmod +x /data/backups/disk_check.sh

# Runs every 6 hours
echo "0 */6 * * * root /data/backups/disk_check.sh" | sudo tee /etc/cron.d/kecdrives-disk-check
```

---

## 10-Year Capacity Planning

Based on the storage estimates from `STORAGE_ESTIMATE.md`:

| Year | Students (Cumulative) | PostgreSQL | Garage | Backups | Total /data |
| ---- | --------------------- | ---------- | ------ | ------- | ----------- |
| 1    | 3,000                 | ~300 MB    | ~4 GB  | ~2 GB   | ~6 GB       |
| 3    | 9,000                 | ~700 MB    | ~12 GB | ~5 GB   | ~18 GB      |
| 5    | 15,000                | ~1.2 GB    | ~20 GB | ~8 GB   | ~30 GB      |
| 10   | 30,000                | ~2.5 GB    | ~45 GB | ~15 GB  | ~63 GB      |

**With 500 GB disk**: /data directory has ~350+ GB available. This comfortably handles 10+ years of growth.

---

## If Additional Disk Is Available

If you can attach a second disk to the VM (e.g., `/dev/sdb`):

```bash
# Format and mount dedicated data disk
sudo mkfs.ext4 /dev/sdb
sudo mount /dev/sdb /data

# Add to fstab for persistence
echo "/dev/sdb /data ext4 defaults 0 2" | sudo tee -a /etc/fstab

# Then follow Steps 1-7 above
```

This provides true physical separation between OS and data.

---

## Quick Reference

| Action                 | Command                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Check disk usage       | `df -h /data`                                                                                       |
| Check PG data size     | `sudo du -sh /data/postgres/`                                                                       |
| Check Garage data size | `sudo du -sh /data/garage/`                                                                         |
| Manual PG backup       | `sudo /data/backups/pg_backup.sh`                                                                   |
| Restore PG from backup | `docker exec -i local_db pg_restore -U postgres -d kecdrives-db < /data/backups/postgres/FILE.dump` |
| View backup log        | `cat /data/backups/backup.log`                                                                      |
| View disk alerts       | `cat /data/backups/disk_alerts.log`                                                                 |
