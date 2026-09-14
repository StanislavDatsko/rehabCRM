CREATE TYPE "ClinicalReportType" AS ENUM ('PROGRESS');
CREATE TYPE "ClinicalReportStatus" AS ENUM ('DRAFT', 'GENERATING', 'COMPLETED', 'FAILED', 'VOIDED');

CREATE TABLE "clinical_reports" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "type" "ClinicalReportType" NOT NULL DEFAULT 'PROGRESS',
    "status" "ClinicalReportStatus" NOT NULL DEFAULT 'DRAFT',
    "periodFrom" TIMESTAMPTZ(3) NOT NULL,
    "periodTo" TIMESTAMPTZ(3) NOT NULL,
    "configuration" JSONB NOT NULL,
    "sourceSnapshotMetadata" JSONB NOT NULL,
    "generatedByPractitionerId" UUID NOT NULL,
    "generatedByUserId" UUID NOT NULL,
    "storageKey" VARCHAR(500),
    "templateVersion" VARCHAR(50) NOT NULL,
    "failureCode" VARCHAR(100),
    "voidedAt" TIMESTAMPTZ(3),
    "voidedByUserId" UUID,
    "voidReason" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "clinical_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinical_reports_organizationId_patientId_createdAt_idx"
ON "clinical_reports"("organizationId", "patientId", "createdAt");
CREATE INDEX "clinical_reports_organizationId_status_createdAt_idx"
ON "clinical_reports"("organizationId", "status", "createdAt");

ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_generatedByPractitionerId_fkey"
FOREIGN KEY ("generatedByPractitionerId") REFERENCES "practitioners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_generatedByUserId_fkey"
FOREIGN KEY ("generatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_voidedByUserId_fkey"
FOREIGN KEY ("voidedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
