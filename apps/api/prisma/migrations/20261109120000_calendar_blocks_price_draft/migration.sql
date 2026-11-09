-- Draft patients created from the calendar
ALTER TYPE "PatientStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

-- Price and reschedule marker on appointments
ALTER TABLE "appointments" ADD COLUMN "priceAmount" INTEGER;
ALTER TABLE "appointments" ADD COLUMN "rescheduledFromAt" TIMESTAMPTZ(3);
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_price_non_negative" CHECK ("priceAmount" IS NULL OR "priceAmount" >= 0);

-- Breaks and days off
CREATE TYPE "CalendarBlockKind" AS ENUM ('BREAK', 'DAY_OFF');

CREATE TABLE "calendar_blocks" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "kind" "CalendarBlockKind" NOT NULL,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "endsAt" TIMESTAMPTZ(3) NOT NULL,
  "note" VARCHAR(200),
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "calendar_blocks_ends_after_starts" CHECK ("endsAt" > "startsAt")
);

CREATE INDEX "calendar_blocks_organizationId_startsAt_idx" ON "calendar_blocks"("organizationId", "startsAt");

ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
