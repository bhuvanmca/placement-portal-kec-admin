# KECDrives VM Data Management & Backup Report

> **Date:** 12 April 2026  
> **VM:** `172.16.1.208:3456` (Ubuntu, 500GB SSD)  
> **Performed by:** Automated migration session

---

## Table of Contents

1. [Summary of Changes](#1-summary-of-changes)
2. [VM Disk Layout — Before & After](#2-vm-disk-layout--before--after)
3. [Container & Service Storage Analysis](#3-container--service-storage-analysis)
4. [Where Data Lives Now](#4-where-data-lives-now)
5. [Backup Mechanism — Detailed Breakdown](#5-backup-mechanism--detailed-breakdown)
6. [Cron Job Configuration](#6-cron-job-configuration)
7. [SSH File Transfer — Downloading Backups](#7-ssh-file-transfer--downloading-backups)
8. [Critical Discovery: Docker Build Cache](#8-critical-discovery-docker-build-cache)
9. [10-Year Capacity Planning](#9-10-year-capacity-planning)

---

## 1. Summary of Changes

### What was done on the VM (12 April 2026):

| Step | Action                                                | Details                                                                                           |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1    | **Pruned 428 orphaned Docker volumes**                | Anonymous volumes from CI/CD builds, consuming disk space                                         |
| 2    | **Removed 8 legacy `placement-portal-kec_*` volumes** | Old project volumes no longer in use                                                              |
| 3    | **Created `/data/` directory structure**              | `/data/postgres/`, `/data/garage/`, `/data/backups/postgres/`, `/data/backups/garage/`            |
| 4    | **Stopped PostgreSQL & Garage containers**            | Safe shutdown before data copy                                                                    |
| 5    | **Copied PG data (73MB) to `/data/postgres/`**        | Using `rsync -av` for integrity                                                                   |
| 6    | **Copied Garage data (1.7GB) to `/data/garage/`**     | Using `rsync -av` for integrity                                                                   |
| 7    | **Updated `docker-compose.yml`**                      | Switched from named Docker volumes to bind mounts                                                 |
| 8    | **Restarted all 18 containers**                       | All came up healthy                                                                               |
| 9    | **Verified data integrity**                           | 2,054 users, 2,033 students, 2 drives — all intact                                                |
| 10   | **Set up automated backup cron jobs**                 | Daily PG at 2 AM, weekly Garage at 3 AM Sunday                                                    |
| 11   | **Ran first manual backup**                           | `kecdrives_db_20260412_021307.sql.gz` (707KB) created successfully                                |
| 12   | **Removed old named volumes**                         | `api-kecdrives_pg_data` and `api-kecdrives_garage_data` deleted after confirming bind mounts work |

### Code changes pushed:

- **`api-kecdrives`** → `main` (commit `e0f83fb`): `docker-compose.yml` bind mount migration
- **`admin-kecdrives`** → `main` (commit `b72116b`): Storage UI overhaul, data backup feature, pagination fix, performance tuning

---

## 2. VM Disk Layout — Before & After

### Before Migration

```
Filesystem      Size  Used  Avail  Use%
/dev/sda3       489G  384G   81G   83%

Docker volumes:  445+ volumes (428 orphaned + 17 named)
Data location:   /var/lib/docker/volumes/ (opaque, hard to backup)
PG data:         api-kecdrives_pg_data Docker volume (73MB)
Garage data:     api-kecdrives_garage_data Docker volume (1.7GB)
```

### After Migration

```
Filesystem      Size  Used  Avail  Use%
/dev/sda3       489G  383G   81G   83%

Docker volumes:  7 remaining (caddy, grafana, prometheus, pgadmin, 2 anonymous)
Data location:   /data/ (directly accessible, easy to backup)
PG data:         /data/postgres/ (73MB, bind mount)
Garage data:     /data/garage/ (1.7GB, bind mount)
Backups:         /data/backups/ (automated, rolling retention)
```

### Directory Structure on VM

```
/data/
├── postgres/           ← PostgreSQL database files (bind mount)
│   ├── base/           ← Database files
│   ├── global/         ← Cluster-wide tables
│   ├── pg_wal/         ← Write-ahead logs
│   ├── postgresql.conf
│   └── ... (standard PG data directory)
├── garage/             ← Garage S3 object storage (bind mount)
│   ├── data/           ← Actual stored files (resumes, profile pics, etc.)
│   └── meta/           ← Garage metadata
└── backups/
    ├── backup_postgres.sh   ← Daily backup script
    ├── backup_garage.sh     ← Weekly backup script
    ├── postgres/
    │   ├── kecdrives_db_YYYYMMDD_HHMMSS.sql.gz  ← Compressed SQL dumps
    │   ├── backup.log       ← Backup history log
    │   └── cron.log         ← Cron execution log
    └── garage/
        ├── garage_YYYYMMDD_HHMMSS.tar.gz  ← Compressed Garage snapshots
        ├── backup.log
        └── cron.log
```

---

## 3. Container & Service Storage Analysis

### Backend Microservices (Go Fiber)

| Container           | Image Size | Runtime Write | Description                      |
| ------------------- | ---------- | ------------- | -------------------------------- |
| `auth_service`      | 35.4 MB    | 4.1 KB        | Authentication, JWT, Firebase    |
| `student_service`   | 42.5 MB    | 4.1 KB        | Student CRUD, profile management |
| `admin_service`     | 88.6 MB    | 8.2 KB        | Admin panel API, bulk operations |
| `drive_service`     | 89.2 MB    | 8.2 KB        | Placement drives, applications   |
| `chat_service`      | 82.9 MB    | 8.2 KB        | Real-time messaging              |
| `analytics_service` | 36.4 MB    | 4.1 KB        | Dashboard analytics, reporting   |

**Total backend services: ~375 MB image space**

### Infrastructure Services

| Container                   | Image Size | Runtime Write | Description                  |
| --------------------------- | ---------- | ------------- | ---------------------------- |
| `local_db` (PostgreSQL 15)  | 281 MB     | 20.5 KB       | Primary database             |
| `local_storage` (Garage S3) | 21.7 MB    | 20.5 KB       | Object storage for files     |
| `redis_cache`               | 43.4 MB    | 4.1 KB        | Session cache, rate limiting |
| `caddy`                     | 50.2 MB    | 12.3 KB       | Reverse proxy, TLS           |

### Monitoring Stack

| Container           | Image Size | Runtime Write | Description                |
| ------------------- | ---------- | ------------- | -------------------------- |
| `prometheus`        | 297 MB     | 4.1 KB        | Metrics collection         |
| `grafana`           | 514 MB     | 4.1 KB        | Dashboards & visualization |
| `pgadmin`           | 581 MB     | 77.8 KB       | Database management UI     |
| `cadvisor`          | 82 MB      | 32.8 KB       | Container metrics          |
| `node_exporter`     | 26.2 MB    | 4.1 KB        | Host metrics               |
| `postgres_exporter` | 24.2 MB    | 4.1 KB        | PG-specific metrics        |
| `redis_exporter`    | 9.76 MB    | 4.1 KB        | Redis metrics              |
| `logs` (Dozzle)     | 58.6 MB    | 12.3 KB       | Log viewer                 |

### Persistent Data Volumes

| Volume/Path                     | Size       | What it stores                                       |
| ------------------------------- | ---------- | ---------------------------------------------------- |
| `/data/postgres/`               | **73 MB**  | All database tables (30 tables across 6 schemas)     |
| `/data/garage/`                 | **1.7 GB** | Student resumes, profile pictures, drive attachments |
| `api-kecdrives_prometheus_data` | 483 MB     | Metrics time-series data                             |
| `api-kecdrives_grafana_data`    | 15 MB      | Dashboards, settings                                 |
| `api-kecdrives_pgadmin_data`    | 228 KB     | PgAdmin configuration                                |
| `api-kecdrives_caddy_data`      | 20 KB      | TLS certificates                                     |
| `api-kecdrives_caddy_config`    | 20 KB      | Caddy config cache                                   |

### Database Contents (30 tables, 6 schemas)

| Schema    | Tables                                                                                                                                                  | Key data            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `public`  | `users`, `batches`, `departments`, `migrations_history`                                                                                                 | 2,054 users         |
| `student` | `student_personal`, `student_degrees`, `student_documents`, `student_schooling`, `student_change_requests`, `field_permissions`                         | 2,033 students      |
| `drive`   | `placement_drives`, `drive_applications`, `job_roles`, `drive_eligible_batches`, `drive_eligible_departments`, `drive_spocs`, `drive_application_roles` | 2 placement drives  |
| `admin`   | `activity_logs`, `broadcast_templates`, `eligibility_templates`, `role_permissions`, `spocs`, `system_settings`                                         | Admin configuration |
| `auth`    | `password_resets`                                                                                                                                       | Auth data           |
| `chat`    | `chat_groups`, `chat_messages`, `chat_group_members`, `chat_attachments`                                                                                | Messaging data      |

---

## 4. Where Data Lives Now

### Previous Setup (Docker Named Volumes)
```
Data location: /var/lib/docker/volumes/<volume_name>/_data/
```
- **Problem:** Opaque, buried inside Docker's internal directory structure
- **Problem:** Cannot easily browse, backup, or rsync without Docker commands
- **Problem:** If Docker daemon resets or gets corrupted, volumes can be lost

### Current Setup (Bind Mounts at `/data/`)
```
Data location: /data/postgres/ and /data/garage/
```
- **Advantage:** Directly accessible on the host filesystem
- **Advantage:** Standard Linux tools (rsync, tar, scp) work directly
- **Advantage:** Survives Docker daemon reinstalls/upgrades
- **Advantage:** Easy to back up with cron + standard scripts
- **Advantage:** Can monitor disk usage with `du -sh /data/`

### docker-compose.yml Changes

**Before:**
```yaml
postgres:
  volumes:
    - pg_data:/var/lib/postgresql/data

garage:
  volumes:
    - garage_data:/var/lib/garage

volumes:
  pg_data:
  garage_data:
```

**After:**
```yaml
postgres:
  volumes:
    - /data/postgres:/var/lib/postgresql/data

garage:
  volumes:
    - /data/garage:/var/lib/garage

volumes:
  # pg_data and garage_data removed — now using bind mounts
```

---

## 5. Backup Mechanism — Detailed Breakdown

### 5.1 PostgreSQL Backup (`/data/backups/backup_postgres.sh`)

```bash
#!/bin/bash
# Daily PostgreSQL Backup Script
BACKUP_DIR="/data/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kecdrives_db_$TIMESTAMP.sql.gz"

# Keep only last 7 daily backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

# Dump and compress
docker exec local_db pg_dumpall -U postgres | gzip > "$BACKUP_FILE"

# Log
echo "[$(date)] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" >> "$BACKUP_DIR/backup.log"
```

**How it works:**
1. `pg_dumpall` creates a complete SQL dump of ALL databases and roles
2. Output is piped through `gzip` for compression (~90% reduction: 73MB → 707KB)
3. Old backups beyond 7 days are automatically deleted
4. Each backup is timestamped and logged

**What's included in the dump:**
- All 30 tables across 6 schemas
- All indexes, constraints, triggers
- User roles and permissions
- Schema definitions
- Complete data for restoration

**Restoration command:**
```bash
# To restore from a backup:
gunzip -c /data/backups/postgres/kecdrives_db_YYYYMMDD_HHMMSS.sql.gz | docker exec -i local_db psql -U postgres
```

### 5.2 Garage (S3 Storage) Backup (`/data/backups/backup_garage.sh`)

```bash
#!/bin/bash
# Weekly Garage (S3 Storage) Backup Script
BACKUP_DIR="/data/backups/garage"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/garage_$TIMESTAMP.tar.gz"

# Keep only last 4 weekly backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +28 -delete

# Tar and compress garage data
tar -czf "$BACKUP_FILE" -C /data/garage .

# Log
echo "[$(date)] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" >> "$BACKUP_DIR/backup.log"
```

**How it works:**
1. `tar -czf` creates a compressed archive of the entire Garage data directory
2. Includes both `/data/garage/data/` (actual files) and `/data/garage/meta/` (metadata)
3. Old backups beyond 28 days (4 weeks) are automatically deleted
4. Each backup is timestamped and logged

**What's included:**
- All student resumes (PDF files)
- All profile pictures
- All drive attachments
- Garage metadata (bucket configs, keys)

**Restoration command:**
```bash
# Stop garage first
docker compose stop garage

# Extract backup
tar -xzf /data/backups/garage/garage_YYYYMMDD_HHMMSS.tar.gz -C /data/garage/

# Restart
docker compose start garage
```

### 5.3 Backup Retention Policy

| Backup Type | Frequency                       | Retention         | Max Files | Approx. Storage     |
| ----------- | ------------------------------- | ----------------- | --------- | ------------------- |
| PostgreSQL  | Daily at 2:00 AM UTC            | 7 days            | 7         | ~5 MB (7 × 707KB)   |
| Garage S3   | Weekly on Sunday at 3:00 AM UTC | 28 days (4 weeks) | 4         | ~6.8 GB (4 × 1.7GB) |

**Total backup storage:** ~7 GB maximum at any given time

---

## 6. Cron Job Configuration

### Current Crontab (root user)

```cron
# PostgreSQL daily backup at 2:00 AM UTC
0 2 * * * /data/backups/backup_postgres.sh >> /data/backups/postgres/cron.log 2>&1

# Garage weekly backup every Sunday at 3:00 AM UTC
0 3 * * 0 /data/backups/backup_garage.sh >> /data/backups/garage/cron.log 2>&1
```

### Cron Fields Explained

```
┌───────── minute (0)
│ ┌─────── hour (2 or 3)
│ │ ┌───── day of month (* = every day)
│ │ │ ┌─── month (* = every month)
│ │ │ │ ┌─ day of week (* = every day, 0 = Sunday)
│ │ │ │ │
0 2 * * *   → Every day at 2:00 AM
0 3 * * 0   → Every Sunday at 3:00 AM
```

### Monitoring Cron Jobs

```bash
# View cron job output logs:
cat /data/backups/postgres/cron.log
cat /data/backups/garage/cron.log

# View backup history:
cat /data/backups/postgres/backup.log
cat /data/backups/garage/backup.log

# List all current backups:
ls -lh /data/backups/postgres/*.sql.gz
ls -lh /data/backups/garage/*.tar.gz

# Edit cron jobs:
sudo crontab -e
```

### If You Want to Change the Schedule

```bash
# Example: Backup PG every 6 hours:
0 */6 * * * /data/backups/backup_postgres.sh >> /data/backups/postgres/cron.log 2>&1

# Example: Backup Garage daily instead of weekly:
0 3 * * * /data/backups/backup_garage.sh >> /data/backups/garage/cron.log 2>&1
```

---

## 7. SSH File Transfer — Downloading Backups

### Connection Details

```
Host:     172.16.1.208
Port:     3456
User:     administrator
Password: medi@2040
```

### Download Backup Files Using SCP

```bash
# Download the latest PostgreSQL backup to your local machine:
scp -P 3456 administrator@172.16.1.208:/data/backups/postgres/kecdrives_db_*.sql.gz ./

# Download the latest Garage backup:
scp -P 3456 administrator@172.16.1.208:/data/backups/garage/garage_*.tar.gz ./

# Download ALL backups:
scp -P 3456 -r administrator@172.16.1.208:/data/backups/ ./vm_backups/
```

### Using SFTP (Interactive File Browser)

```bash
# Connect via SFTP:
sftp -P 3456 administrator@172.16.1.208

# Once connected:
sftp> cd /data/backups/postgres
sftp> ls -la
sftp> get kecdrives_db_20260412_021307.sql.gz
sftp> exit
```

### Using rsync (For Scheduled Off-Site Backups)

```bash
# One-time sync of all backups to another server:
rsync -avz -e "ssh -p 3456" administrator@172.16.1.208:/data/backups/ /path/to/offsite/backup/

# Sync only new files (incremental):
rsync -avz --update -e "ssh -p 3456" administrator@172.16.1.208:/data/backups/ /path/to/offsite/backup/
```

### Automated Off-Site Backup (Optional)

To automatically copy backups to another machine, add this cron job on the **receiving machine**:

```bash
# Crontab on the receiving/download machine (runs daily at 4 AM):
0 4 * * * rsync -avz -e "ssh -p 3456" administrator@172.16.1.208:/data/backups/postgres/ /backup/kecdrives/postgres/ >> /var/log/offsite_backup.log 2>&1
0 5 * * 0 rsync -avz -e "ssh -p 3456" administrator@172.16.1.208:/data/backups/garage/ /backup/kecdrives/garage/ >> /var/log/offsite_backup.log 2>&1
```

> **Note:** For passwordless SSH (required for automated rsync), set up SSH key auth:
> ```bash
> # On the receiving machine:
> ssh-keygen -t ed25519
> ssh-copy-id -p 3456 administrator@172.16.1.208
> ```

### Download Raw Data (Not Just Backups)

You can also directly copy the live data directories:

```bash
# Copy live PostgreSQL data (stop PG container first for consistency):
sudo scp -P 3456 -r administrator@172.16.1.208:/data/postgres/ ./pg_data_copy/

# Copy live Garage data:
scp -P 3456 -r administrator@172.16.1.208:/data/garage/ ./garage_data_copy/
```

---

## 8. Critical Discovery: Docker Build Cache

During the assessment, we discovered that **390 GB of Docker build cache** is consuming most of the disk:

```
TYPE            TOTAL     ACTIVE    SIZE         RECLAIMABLE
Images          37        18        390.4 GB     387.3 GB (99%)
Build Cache     1889      0         390.9 GB     390.8 GB (99%)
Local Volumes   7         7         519.7 MB     0 B (0%)
Containers      19        18        299 KB       61.4 KB (20%)
```

### What this means:
- **390 GB** of build cache from 1,889 build steps is never cleaned up
- **387 GB** of old Docker images (37 total, only 18 active) are reclaimable
- The actual application data (volumes + bind mounts) is only **~2.3 GB**

### Recommended cleanup (will free ~380+ GB):

```bash
# Remove unused images (keeps only actively used ones):
docker image prune -a -f

# Remove ALL build cache:
docker builder prune -a -f

# Nuclear option — remove everything unused:
docker system prune -a -f --volumes
# WARNING: --volumes flag will remove unused named volumes too!
# Only use if you're confident all critical data is in /data/
```

### After cleanup, expected disk usage:
```
Before: 383 GB used / 489 GB total (83%)
After:  ~5-10 GB used / 489 GB total (~2%)
```

> **Recommendation:** Run `docker builder prune -a -f` and `docker image prune -a -f` to reclaim ~380 GB. This is safe — builds will just re-download base images on next CI/CD run. Do NOT use `--volumes` flag until you verify all data is safely in `/data/`.

---

## 9. 10-Year Capacity Planning

### Growth Estimates

| Data Type                     | Current Size | Annual Growth (Est.)                       | 10-Year Projection |
| ----------------------------- | ------------ | ------------------------------------------ | ------------------ |
| PostgreSQL (students, drives) | 73 MB        | ~50 MB/year (1,500 students × 30 tables)   | ~573 MB            |
| Garage S3 (resumes, photos)   | 1.7 GB       | ~1.5 GB/year (1,500 students × ~1 MB each) | ~16.7 GB           |
| Prometheus metrics            | 483 MB       | Self-pruning (15-day default retention)    | ~500 MB (capped)   |
| Grafana dashboards            | 15 MB        | ~5 MB/year                                 | ~65 MB             |
| PG backups (rolling)          | ~5 MB        | ~5 MB (constant, 7-day window)             | ~5 MB              |
| Garage backups (rolling)      | ~7 GB        | Grows with Garage data                     | ~67 GB             |
| **Total**                     | **~2.3 GB**  |                                            | **~85 GB**         |

### Disk Capacity Assessment

```
Total disk:           489 GB
Current usage:        383 GB (mostly Docker build cache — reclaimable!)
After cache cleanup:  ~5 GB
Available:            ~484 GB
10-year projection:   ~85 GB
Remaining headroom:   ~399 GB (82%)
```

**Conclusion:** With Docker build cache cleaned, the 500 GB disk can comfortably handle 10+ years of data with no partitioning changes needed.

---

## Quick Reference Commands

```bash
# SSH into VM:
ssh -p 3456 administrator@172.16.1.208

# Check data sizes:
sudo du -sh /data/postgres/ /data/garage/ /data/backups/

# Check disk usage:
df -h /

# View running containers:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"

# Manual backup:
sudo /data/backups/backup_postgres.sh
sudo /data/backups/backup_garage.sh

# View backup logs:
cat /data/backups/postgres/backup.log
cat /data/backups/garage/backup.log

# Download latest PG backup:
scp -P 3456 administrator@172.16.1.208:/data/backups/postgres/*.sql.gz ./

# Restore PG from backup:
gunzip -c backup_file.sql.gz | docker exec -i local_db psql -U postgres

# Check cron jobs:
sudo crontab -l
```
