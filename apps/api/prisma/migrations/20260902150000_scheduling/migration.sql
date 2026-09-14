CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "AppointmentTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "AppointmentStatus" AS ENUM (
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
);
CREATE TYPE "EncounterStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "locations" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
  "addressLine1" VARCHAR(200),
  "city" VARCHAR(100),
  "timezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Kyiv',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "locations_organizationId_status_idx" ON "locations"("organizationId", "status");
ALTER TABLE "locations" ADD CONSTRAINT "locations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "rooms" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rooms_organizationId_locationId_status_idx" ON "rooms"("organizationId", "locationId", "status");
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "appointment_types" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 60,
  "status" "AppointmentTypeStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "appointment_types_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "appointment_types_organizationId_status_idx" ON "appointment_types"("organizationId", "status");
ALTER TABLE "appointment_types" ADD CONSTRAINT "appointment_types_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "appointments" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "practitionerId" UUID NOT NULL,
  "locationId" UUID,
  "roomId" UUID,
  "appointmentTypeId" UUID,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "endsAt" TIMESTAMPTZ(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "reason" VARCHAR(500),
  "administrativeNote" VARCHAR(2000),
  "cancellationReason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" UUID NOT NULL,
  "updatedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointments_ends_after_starts" CHECK ("endsAt" > "startsAt")
);

ALTER TABLE "appointments" ADD COLUMN "time_range" tstzrange
  GENERATED ALWAYS AS (tstzrange("startsAt", "endsAt", '[)')) STORED;

CREATE INDEX "appointments_organizationId_startsAt_idx" ON "appointments"("organizationId", "startsAt");
CREATE INDEX "appointments_organizationId_practitionerId_startsAt_idx"
  ON "appointments"("organizationId", "practitionerId", "startsAt");
CREATE INDEX "appointments_organizationId_patientId_startsAt_idx"
  ON "appointments"("organizationId", "patientId", "startsAt");
CREATE INDEX "appointments_organizationId_status_startsAt_idx"
  ON "appointments"("organizationId", "status", "startsAt");

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_practitioner_overlap"
  EXCLUDE USING gist (
    "organizationId" WITH =,
    "practitionerId" WITH =,
    "time_range" WITH &&
  )
  WHERE ("status" IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'));

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitionerId_fkey"
  FOREIGN KEY ("practitionerId") REFERENCES "practitioners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointmentTypeId_fkey"
  FOREIGN KEY ("appointmentTypeId") REFERENCES "appointment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "encounters" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "practitionerId" UUID NOT NULL,
  "appointmentId" UUID,
  "startedAt" TIMESTAMPTZ(3) NOT NULL,
  "endedAt" TIMESTAMPTZ(3),
  "status" "EncounterStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "createdByUserId" UUID NOT NULL,
  "updatedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "encounters_appointmentId_key" ON "encounters"("appointmentId");
CREATE INDEX "encounters_organizationId_patientId_startedAt_idx"
  ON "encounters"("organizationId", "patientId", "startedAt");
CREATE INDEX "encounters_organizationId_practitionerId_startedAt_idx"
  ON "encounters"("organizationId", "practitionerId", "startedAt");

ALTER TABLE "encounters" ADD CONSTRAINT "encounters_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_practitionerId_fkey"
  FOREIGN KEY ("practitionerId") REFERENCES "practitioners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
