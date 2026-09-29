CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE "CalendarBlockType" AS ENUM ('BREAK', 'UNAVAILABLE', 'DAY_OFF');

CREATE TABLE "calendar_blocks" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "practitionerId" UUID NOT NULL,
  "type" "CalendarBlockType" NOT NULL,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "endsAt" TIMESTAMPTZ(3) NOT NULL,
  "title" VARCHAR(150),
  "note" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" UUID NOT NULL,
  "updatedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "calendar_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_blocks_ends_after_starts" CHECK ("endsAt" > "startsAt")
);
ALTER TABLE "calendar_blocks" ADD COLUMN "time_range" tstzrange GENERATED ALWAYS AS (tstzrange("startsAt", "endsAt", '[)')) STORED;
CREATE INDEX "calendar_blocks_organizationId_practitionerId_startsAt_idx" ON "calendar_blocks"("organizationId", "practitionerId", "startsAt");
CREATE INDEX "calendar_blocks_organizationId_startsAt_endsAt_idx" ON "calendar_blocks"("organizationId", "startsAt", "endsAt");
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_no_overlap" EXCLUDE USING gist ("organizationId" WITH =, "practitionerId" WITH =, "time_range" WITH &&);
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_practitioner_fkey" FOREIGN KEY ("practitionerId") REFERENCES "practitioners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_created_by_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_updated_by_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
