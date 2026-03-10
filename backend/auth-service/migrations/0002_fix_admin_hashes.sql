-- ==========================================
-- AUTH SERVICE — Migration 0002
-- Force update seed admin passwords to 'qwerty'
-- ==========================================

SET search_path TO public;

-- Super Admin
INSERT INTO users (email, password_hash, role, name, is_active)
VALUES ('admin@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'super_admin', 'Super Admin', TRUE)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Admins
INSERT INTO users (email, password_hash, role, name, is_active)
VALUES ('dakshanamoorthy@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'admin', 'Dakshanamoorthy', TRUE)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO users (email, password_hash, role, name, is_active)
VALUES ('kavin@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'admin', 'Kavin', TRUE)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Coordinator
INSERT INTO users (email, password_hash, role, name, department_code, is_active)
VALUES ('rahunathan@kongu.edu', '$2a$10$HmVgB9pmuaydKC3cVE/hrO566v.zlhH6VX.D7ZTz4bu6rO1nasixu', 'coordinator', 'Rahunathan', 'MCA', TRUE)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
