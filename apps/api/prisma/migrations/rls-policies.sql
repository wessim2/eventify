-- =============================================================================
-- RLS Policies for Eventify Multi-Tenant Isolation
-- P1-005: Enables Row-Level Security on tenant-scoped tables.
--
-- This migration must be run AFTER the initial schema migration.
-- Execution user: eventify_admin (superuser — bypasses RLS for migrations).
-- Runtime user: eventify_app (subject to these policies).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Safe UUID resolver function
-- Avoids "invalid input syntax for type uuid" error when app.current_tenant_id
-- is empty, NULL, or not set.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS uuid AS $$
DECLARE
  val text;
BEGIN
  val := current_setting('app.current_tenant_id', true);
  IF val IS NULL OR val = '' OR length(val) <> 36 THEN
    RETURN NULL;
  END IF;
  RETURN val::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- Organization table RLS
-- Filters organizations by ID — the tenant IS the organization.
-- ---------------------------------------------------------------------------

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;

-- SELECT: user can only see their own organization
CREATE POLICY "org_isolation_select" ON "organizations"
  FOR SELECT
  USING (
    id = current_tenant_id()
  );

-- INSERT: allow inserting new organizations (membership checked after insert)
CREATE POLICY "org_isolation_insert" ON "organizations"
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: user can only update their own organization
CREATE POLICY "org_isolation_update" ON "organizations"
  FOR UPDATE
  USING (
    id = current_tenant_id()
  );

-- DELETE: user can only delete their own organization
CREATE POLICY "org_isolation_delete" ON "organizations"
  FOR DELETE
  USING (
    id = current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- Event table RLS
-- Filters events by organization_id (the tenant discriminator column).
-- ---------------------------------------------------------------------------

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" FORCE ROW LEVEL SECURITY;

CREATE POLICY "event_isolation_select" ON "events"
  FOR SELECT
  USING (
    organization_id = current_tenant_id()
  );

CREATE POLICY "event_isolation_insert" ON "events"
  FOR INSERT
  WITH CHECK (
    organization_id = current_tenant_id()
  );

CREATE POLICY "event_isolation_update" ON "events"
  FOR UPDATE
  USING (
    organization_id = current_tenant_id()
  );

CREATE POLICY "event_isolation_delete" ON "events"
  FOR DELETE
  USING (
    organization_id = current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- NOTE: OrganizationMembership is intentionally NOT RLS-protected.
-- It must be queryable during tenant context resolution (before the tenant
-- is known) to validate that a user belongs to the requested organization.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Grant superuser role (eventify_admin) bypass for system-level operations
-- (Prisma migrations, event lifecycle worker cross-tenant queries)
-- ---------------------------------------------------------------------------

ALTER ROLE eventify_admin BYPASSRLS;
