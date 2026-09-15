CREATE TYPE "PatientMediaKind" AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE "PatientMediaStatus" AS ENUM ('PENDING_UPLOAD', 'READY', 'VOIDED');

CREATE TABLE "patient_media" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "encounterId" UUID,
  "assessmentId" UUID,
  "rehabilitationPlanId" UUID,
  "kind" "PatientMediaKind" NOT NULL,
  "status" "PatientMediaStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  "originalFileName" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "objectKey" VARCHAR(500) NOT NULL,
  "bucket" VARCHAR(200) NOT NULL,
  "checksumSha256" VARCHAR(64),
  "title" VARCHAR(200),
  "description" VARCHAR(2000),
  "capturedAt" TIMESTAMPTZ(3),
  "uploadedByUserId" UUID NOT NULL,
  "voidedAt" TIMESTAMPTZ(3),
  "voidedByUserId" UUID,
  "voidReason" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "patient_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patient_media_org_patient_status_created_idx" ON "patient_media" ("organizationId", "patientId", "status", "createdAt", "id");
CREATE INDEX "patient_media_org_patient_kind_created_idx" ON "patient_media" ("organizationId", "patientId", "kind", "createdAt", "id");
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_patient_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_encounter_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_assessment_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_plan_fkey" FOREIGN KEY ("rehabilitationPlanId") REFERENCES "rehabilitation_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_uploaded_by_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_voided_by_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
