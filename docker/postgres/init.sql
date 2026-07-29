-- =============================================================================
-- Eventify PostgreSQL Initialization Script
-- Runs once when the container is first created.
-- Creates the application-level database user that is subject to RLS.
-- The superuser (eventify_admin) is created by the POSTGRES_USER env var.
-- =============================================================================

-- Create the application-level role (non-superuser, subject to RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'eventify_app') THEN
    CREATE ROLE eventify_app WITH LOGIN PASSWORD 'secret';
  END IF;
END
$$;

-- Grant connection to the database
GRANT CONNECT ON DATABASE eventify TO eventify_app;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO eventify_app;

-- Grant DML on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO eventify_app;

-- Ensure future tables created by migrations are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO eventify_app;

-- Ensure future sequences created by migrations are accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO eventify_app;
