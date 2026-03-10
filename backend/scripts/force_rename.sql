-- 1. Switch to the 'postgres' database in pgAdmin before running this!
-- 2. Force terminate all connections to the old database
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'placement_portal_kec_v2'
  AND pid <> pg_backend_pid();

-- 3. Rename the database
ALTER DATABASE "placement_portal_kec_v2" RENAME TO "kecdrives-db";
