CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'COMPLETED', 'VOIDED');
CREATE TYPE "MeasurementValueType" AS ENUM ('NUMBER', 'INTEGER', 'BOOLEAN', 'SCALE', 'TEXT', 'CODED');
CREATE TYPE "MeasurementCategory" AS ENUM ('PAIN', 'RANGE_OF_MOTION', 'STRENGTH', 'MOBILITY', 'BALANCE', 'ENDURANCE', 'FUNCTIONAL_TEST', 'OTHER');
CREATE TYPE "AnatomicalApplicability" AS ENUM ('REQUIRED', 'OPTIONAL', 'NOT_APPLICABLE');
CREATE TYPE "Laterality" AS ENUM ('LEFT', 'RIGHT', 'BILATERAL', 'MIDLINE', 'NOT_APPLICABLE');

CREATE TABLE "measurement_definitions" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "code" VARCHAR(100) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" VARCHAR(1000),
  "valueType" "MeasurementValueType" NOT NULL,
  "unitCode" VARCHAR(32),
  "minimumValue" DOUBLE PRECISION,
  "maximumValue" DOUBLE PRECISION,
  "allowedCodedValues" JSONB,
  "category" "MeasurementCategory" NOT NULL,
  "anatomicalApplicability" "AnatomicalApplicability" NOT NULL DEFAULT 'OPTIONAL',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "measurement_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "measurement_definitions_range_check" CHECK ("minimumValue" IS NULL OR "maximumValue" IS NULL OR "minimumValue" <= "maximumValue"),
  CONSTRAINT "measurement_definitions_unit_check" CHECK ("unitCode" IS NULL OR "unitCode" IN ('deg','cm','mm','m','s','min','kg','repetition'))
);
CREATE UNIQUE INDEX "measurement_definitions_organizationId_code_key" ON "measurement_definitions"("organizationId", "code");
CREATE UNIQUE INDEX "measurement_definitions_system_code_key" ON "measurement_definitions"("code") WHERE "organizationId" IS NULL;
CREATE INDEX "measurement_definitions_organizationId_active_category_code_idx" ON "measurement_definitions"("organizationId", "active", "category", "code");

CREATE TABLE "assessment_templates" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "code" VARCHAR(100) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "name" VARCHAR(200) NOT NULL,
  "description" VARCHAR(1000),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "configurableSample" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "assessment_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_templates_revision_check" CHECK ("revision" >= 1)
);
CREATE UNIQUE INDEX "assessment_templates_organizationId_code_revision_key" ON "assessment_templates"("organizationId", "code", "revision");
CREATE UNIQUE INDEX "assessment_templates_system_code_revision_key" ON "assessment_templates"("code", "revision") WHERE "organizationId" IS NULL;
CREATE INDEX "assessment_templates_organizationId_active_code_revision_idx" ON "assessment_templates"("organizationId", "active", "code", "revision");

CREATE TABLE "assessment_template_items" (
  "id" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "measurementDefinitionId" UUID NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "defaultRegionCode" VARCHAR(64),
  "defaultLaterality" "Laterality",
  CONSTRAINT "assessment_template_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_template_items_order_check" CHECK ("displayOrder" >= 0),
  CONSTRAINT "assessment_template_items_region_check" CHECK ("defaultRegionCode" IS NULL OR "defaultRegionCode" IN ('shoulder','elbow','wrist','hip','knee','ankle','cervical_spine','thoracic_spine','lumbar_spine'))
);
CREATE UNIQUE INDEX "assessment_template_items_templateId_displayOrder_key" ON "assessment_template_items"("templateId", "displayOrder");
CREATE INDEX "assessment_template_items_templateId_measurementDefinitionId_idx" ON "assessment_template_items"("templateId", "measurementDefinitionId");

CREATE TABLE "assessments" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "encounterId" UUID,
  "practitionerId" UUID NOT NULL,
  "templateId" UUID,
  "title" VARCHAR(200) NOT NULL,
  "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
  "performedAt" TIMESTAMPTZ(3) NOT NULL,
  "completedAt" TIMESTAMPTZ(3),
  "summary" VARCHAR(5000),
  "voidedAt" TIMESTAMPTZ(3),
  "voidedByUserId" UUID,
  "voidReason" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" UUID NOT NULL,
  "updatedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessments_version_check" CHECK ("version" >= 1),
  CONSTRAINT "assessments_void_fields_check" CHECK (("status" = 'VOIDED') = ("voidedAt" IS NOT NULL AND "voidedByUserId" IS NOT NULL AND "voidReason" IS NOT NULL)),
  CONSTRAINT "assessments_completed_fields_check" CHECK ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL)
);
CREATE INDEX "assessments_organizationId_patientId_performedAt_idx" ON "assessments"("organizationId", "patientId", "performedAt");
CREATE INDEX "assessments_organizationId_encounterId_idx" ON "assessments"("organizationId", "encounterId");
CREATE INDEX "assessments_organizationId_status_performedAt_idx" ON "assessments"("organizationId", "status", "performedAt");

CREATE TABLE "measurements" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "assessmentId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "encounterId" UUID,
  "definitionId" UUID NOT NULL,
  "templateItemId" UUID,
  "definitionCode" VARCHAR(100) NOT NULL,
  "definitionName" VARCHAR(200) NOT NULL,
  "categorySnapshot" "MeasurementCategory" NOT NULL,
  "valueTypeSnapshot" "MeasurementValueType" NOT NULL,
  "unitCodeSnapshot" VARCHAR(32),
  "minimumValueSnapshot" DOUBLE PRECISION,
  "maximumValueSnapshot" DOUBLE PRECISION,
  "anatomicalRegionCode" VARCHAR(64),
  "laterality" "Laterality",
  "sequenceNumber" INTEGER NOT NULL DEFAULT 1,
  "numericValue" DOUBLE PRECISION,
  "textValue" VARCHAR(2000),
  "booleanValue" BOOLEAN,
  "codedValue" VARCHAR(100),
  "performedAt" TIMESTAMPTZ(3) NOT NULL,
  "note" VARCHAR(2000),
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "measurements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "measurements_sequence_check" CHECK ("sequenceNumber" >= 1),
  CONSTRAINT "measurements_region_check" CHECK ("anatomicalRegionCode" IS NULL OR "anatomicalRegionCode" IN ('shoulder','elbow','wrist','hip','knee','ankle','cervical_spine','thoracic_spine','lumbar_spine')),
  CONSTRAINT "measurements_unit_check" CHECK ("unitCodeSnapshot" IS NULL OR "unitCodeSnapshot" IN ('deg','cm','mm','m','s','min','kg','repetition')),
  CONSTRAINT "measurements_one_value_check" CHECK (num_nonnulls("numericValue", "textValue", "booleanValue", "codedValue") = 1),
  CONSTRAINT "measurements_value_type_check" CHECK (
    (("valueTypeSnapshot" IN ('NUMBER','INTEGER','SCALE')) AND "numericValue" IS NOT NULL) OR
    ("valueTypeSnapshot" = 'TEXT' AND "textValue" IS NOT NULL) OR
    ("valueTypeSnapshot" = 'BOOLEAN' AND "booleanValue" IS NOT NULL) OR
    ("valueTypeSnapshot" = 'CODED' AND "codedValue" IS NOT NULL)
  )
);
CREATE INDEX "measurements_assessmentId_idx" ON "measurements"("assessmentId");
CREATE INDEX "measurements_organizationId_patientId_definitionId_performedAt_idx" ON "measurements"("organizationId", "patientId", "definitionId", "performedAt");
CREATE INDEX "measurements_organizationId_patientId_definitionCode_performedAt_idx" ON "measurements"("organizationId", "patientId", "definitionCode", "performedAt");

ALTER TABLE "measurement_definitions" ADD CONSTRAINT "measurement_definitions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_template_items" ADD CONSTRAINT "assessment_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "assessment_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_template_items" ADD CONSTRAINT "assessment_template_items_measurementDefinitionId_fkey" FOREIGN KEY ("measurementDefinitionId") REFERENCES "measurement_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "practitioners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "assessment_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "measurement_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "assessment_template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
