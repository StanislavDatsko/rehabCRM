ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'PATIENT';

CREATE TYPE "PatientPortalAccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "patient_portal_accounts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "status" "PatientPortalAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" UUID NOT NULL,
    "updatedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "patient_portal_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patient_portal_accounts_userId_key" ON "patient_portal_accounts"("userId");
CREATE UNIQUE INDEX "patient_portal_accounts_patientId_key" ON "patient_portal_accounts"("patientId");
CREATE INDEX "patient_portal_accounts_organizationId_status_idx" ON "patient_portal_accounts"("organizationId", "status");

ALTER TABLE "patient_portal_accounts" ADD CONSTRAINT "patient_portal_accounts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_portal_accounts" ADD CONSTRAINT "patient_portal_accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_portal_accounts" ADD CONSTRAINT "patient_portal_accounts_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_portal_accounts" ADD CONSTRAINT "patient_portal_accounts_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_portal_accounts" ADD CONSTRAINT "patient_portal_accounts_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
