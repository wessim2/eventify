-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_type_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "payment_intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row-Level Security (RLS) policies for ticket_types and registrations
-- ---------------------------------------------------------------------------

-- Enable RLS on ticket_types
ALTER TABLE "ticket_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ticket_types" FORCE ROW LEVEL SECURITY;

CREATE POLICY "ticket_type_isolation_select" ON "ticket_types"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_types.event_id
        AND events.organization_id = current_tenant_id()
    )
  );

CREATE POLICY "ticket_type_isolation_insert" ON "ticket_types"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_types.event_id
        AND events.organization_id = current_tenant_id()
    )
  );

CREATE POLICY "ticket_type_isolation_update" ON "ticket_types"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_types.event_id
        AND events.organization_id = current_tenant_id()
    )
  );

CREATE POLICY "ticket_type_isolation_delete" ON "ticket_types"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_types.event_id
        AND events.organization_id = current_tenant_id()
    )
  );

-- Enable RLS on registrations
ALTER TABLE "registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registrations" FORCE ROW LEVEL SECURITY;

CREATE POLICY "registration_isolation_select" ON "registrations"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticket_types
      JOIN events ON events.id = ticket_types.event_id
      WHERE ticket_types.id = registrations.ticket_type_id
        AND events.organization_id = current_tenant_id()
    )
  );

CREATE POLICY "registration_isolation_insert" ON "registrations"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ticket_types
      JOIN events ON events.id = ticket_types.event_id
      WHERE ticket_types.id = registrations.ticket_type_id
        AND events.organization_id = current_tenant_id()
    )
  );

CREATE POLICY "registration_isolation_update" ON "registrations"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ticket_types
      JOIN events ON events.id = ticket_types.event_id
      WHERE ticket_types.id = registrations.ticket_type_id
        AND events.organization_id = current_tenant_id()
    )
  );

CREATE POLICY "registration_isolation_delete" ON "registrations"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ticket_types
      JOIN events ON events.id = ticket_types.event_id
      WHERE ticket_types.id = registrations.ticket_type_id
        AND events.organization_id = current_tenant_id()
    )
  );

