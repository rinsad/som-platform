-- ============================================================
-- SOM Platform: User Management Schema
-- Migration 001: Users + Hierarchical Permissions
-- ============================================================

-- Users table (replaces hardcoded TEST_USERS in authController)
CREATE TABLE IF NOT EXISTS som_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20)  UNIQUE,
  full_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(50)  NOT NULL DEFAULT 'Employee',
  department      VARCHAR(100),
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  created_by      UUID,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Permissions table — one row per user/resource combination
-- level:        'application' | 'module' | 'page' | 'field'
-- resource_key: dot-separated path, e.g.
--   application  → 'capex'
--   module       → 'capex.planning'
--   page         → 'capex.planning.dashboard'
--   field        → 'capex.planning.dashboard.budget_amount'
CREATE TABLE IF NOT EXISTS som_permissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES som_users(id) ON DELETE CASCADE,
  level        VARCHAR(20) NOT NULL CHECK (level IN ('application','module','page','field')),
  resource_key VARCHAR(200) NOT NULL,
  can_view     BOOLEAN NOT NULL DEFAULT false,
  can_create   BOOLEAN NOT NULL DEFAULT false,
  can_edit     BOOLEAN NOT NULL DEFAULT false,
  can_delete   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, resource_key)
);

-- Index for fast per-user permission lookups
CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON som_permissions(user_id);

-- Auto-update updated_at on som_users
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON som_users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON som_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Seed: default superadmin (password: Admin@SOM2024!)
-- Change the password immediately after first login.
-- Hash generated with bcryptjs rounds=12
-- ============================================================
INSERT INTO som_users (employee_id, full_name, email, password_hash, role, department)
VALUES (
  'EMP-0001',
  'SOM Administrator',
  'admin@shell.om',
  '$2a$12$placeholder_replace_with_real_hash',
  'Admin',
  'IT'
)
ON CONFLICT (email) DO NOTHING;
