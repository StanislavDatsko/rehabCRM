DROP TABLE "authorization_probes";

CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "PatientSex" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNKNOWN');
CREATE TABLE "patients" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  "middleName" VARCHAR(100),
  "dateOfBirth" DATE,
  "sex" "PatientSex",
  "phoneDisplay" VARCHAR(50),
  "phoneNormalized" VARCHAR(20),
  "email" VARCHAR(254),
  "addressLine1" VARCHAR(200),
  "addressLine2" VARCHAR(200),
  "city" VARCHAR(100),
  "region" VARCHAR(100),
  "postalCode" VARCHAR(20),
  "countryCode" VARCHAR(2),
  "emergencyContactName" VARCHAR(150),
  "emergencyContactPhoneDisplay" VARCHAR(50),
  "emergencyContactPhoneNormalized" VARCHAR(20),
  "emergencyContactRelationship" VARCHAR(100),
  "responsiblePractitionerId" UUID,
  "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
  "internalReferenceNumber" VARCHAR(50),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" UUID NOT NULL,
  "updatedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patients_organizationId_internalReferenceNumber_key"
  ON "patients"("organizationId", "internalReferenceNumber");
CREATE INDEX "patients_organizationId_status_lastName_firstName_id_idx"
  ON "patients"("organizationId", "status", "lastName", "firstName", "id");
CREATE INDEX "patients_organizationId_responsiblePractitionerId_idx"
  ON "patients"("organizationId", "responsiblePractitionerId");
CREATE INDEX "patients_organizationId_updatedAt_id_idx"
  ON "patients"("organizationId", "updatedAt", "id");
CREATE INDEX "patients_organizationId_phoneNormalized_idx"
  ON "patients"("organizationId", "phoneNormalized");
CREATE INDEX "patients_organizationId_email_idx"
  ON "patients"("organizationId", "email");

ALTER TABLE "patients" ADD CONSTRAINT "patients_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_responsiblePractitionerId_fkey"
  FOREIGN KEY ("responsiblePractitionerId") REFERENCES "practitioners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "audit_events" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(100) NOT NULL,
  "entityId" UUID NOT NULL,
  "requestId" VARCHAR(100) NOT NULL,
  "metadata" JSONB NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_organizationId_entityType_entityId_occurredAt_idx"
  ON "audit_events"("organizationId", "entityType", "entityId", "occurredAt");
CREATE INDEX "audit_events_organizationId_actorUserId_occurredAt_idx"
  ON "audit_events"("organizationId", "actorUserId", "occurredAt");

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
