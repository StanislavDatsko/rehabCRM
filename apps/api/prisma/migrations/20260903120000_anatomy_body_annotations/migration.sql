CREATE TYPE "AnatomicalModelKind" AS ENUM ('MUSCULAR', 'SKELETAL', 'JOINTS', 'COMBINED', 'OTHER');
CREATE TYPE "AnatomicalModelVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE "AnatomicalStructureCategory" AS ENUM ('SYSTEM', 'REGION', 'BONE', 'JOINT', 'MUSCLE', 'TENDON', 'LIGAMENT', 'OTHER');
CREATE TYPE "AnatomicalMappingConfidence" AS ENUM ('EXACT', 'HIGH_CONFIDENCE', 'MANUAL_REQUIRED');
CREATE TYPE "BodyAnnotationType" AS ENUM ('PAIN', 'MOBILITY_LIMITATION', 'WEAKNESS', 'TENSION', 'INFLAMMATION', 'POST_SURGERY', 'INJURY', 'SENSITIVITY', 'OTHER');
CREATE TYPE "BodyAnnotationStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'VOIDED');

CREATE TABLE "anatomical_models" (
  "id" UUID NOT NULL, "code" VARCHAR(64) NOT NULL, "name" VARCHAR(200) NOT NULL,
  "kind" "AnatomicalModelKind" NOT NULL, "description" VARCHAR(1000), "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "anatomical_models_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anatomical_model_versions" (
  "id" UUID NOT NULL, "modelId" UUID NOT NULL, "version" INTEGER NOT NULL,
  "status" "AnatomicalModelVersionStatus" NOT NULL DEFAULT 'DRAFT', "storageKey" VARCHAR(500) NOT NULL,
  "checksumSha256" CHAR(64) NOT NULL, "bytes" INTEGER NOT NULL, "format" VARCHAR(16) NOT NULL DEFAULT 'GLB',
  "compression" VARCHAR(64), "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0, "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "positionZ" DOUBLE PRECISION NOT NULL DEFAULT 0, "rotationX" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rotationY" DOUBLE PRECISION NOT NULL DEFAULT 0, "rotationZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "scaleX" DOUBLE PRECISION NOT NULL DEFAULT 1, "scaleY" DOUBLE PRECISION NOT NULL DEFAULT 1, "scaleZ" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "sourceName" VARCHAR(200) NOT NULL, "sourceUrl" VARCHAR(2000), "author" VARCHAR(300), "licenseName" VARCHAR(300), "attribution" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "activatedAt" TIMESTAMPTZ(3),
  CONSTRAINT "anatomical_model_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "anatomical_model_versions_transform_check" CHECK ("scaleX" > 0 AND "scaleY" > 0 AND "scaleZ" > 0),
  CONSTRAINT "anatomical_model_versions_bytes_check" CHECK ("bytes" > 0)
);

CREATE TABLE "anatomical_structures" (
  "id" UUID NOT NULL, "code" VARCHAR(100) NOT NULL, "canonicalName" VARCHAR(200) NOT NULL,
  "displayNameUk" VARCHAR(200), "displayNameEn" VARCHAR(200),
  "category" "AnatomicalStructureCategory" NOT NULL, "laterality" "Laterality" NOT NULL DEFAULT 'NOT_APPLICABLE',
  "regionCode" VARCHAR(64), "parentId" UUID, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "anatomical_structures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anatomical_structure_mappings" (
  "id" UUID NOT NULL, "modelVersionId" UUID NOT NULL, "structureId" UUID NOT NULL,
  "nodeName" VARCHAR(500) NOT NULL, "meshName" VARCHAR(500) NOT NULL, "primitiveIndex" INTEGER NOT NULL DEFAULT 0,
  "stableMeshKey" VARCHAR(1000) NOT NULL, "confidence" "AnatomicalMappingConfidence" NOT NULL,
  "reviewerNote" VARCHAR(1000), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "anatomical_structure_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "anatomical_structure_mappings_primitive_check" CHECK ("primitiveIndex" >= 0)
);

CREATE TABLE "body_annotations" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "patientId" UUID NOT NULL, "encounterId" UUID,
  "structureId" UUID NOT NULL, "modelVersionId" UUID NOT NULL, "mappingId" UUID NOT NULL,
  "type" "BodyAnnotationType" NOT NULL, "severity" INTEGER, "title" VARCHAR(200),
  "note" VARCHAR(3000), "status" "BodyAnnotationStatus" NOT NULL DEFAULT 'ACTIVE',
  "stableMeshKey" VARCHAR(1000) NOT NULL, "primitiveIndex" INTEGER NOT NULL, "triangleIndex" INTEGER NOT NULL,
  "barycentricU" DOUBLE PRECISION NOT NULL, "barycentricV" DOUBLE PRECISION NOT NULL, "barycentricW" DOUBLE PRECISION NOT NULL,
  "localPositionX" DOUBLE PRECISION NOT NULL, "localPositionY" DOUBLE PRECISION NOT NULL, "localPositionZ" DOUBLE PRECISION NOT NULL,
  "localNormalX" DOUBLE PRECISION, "localNormalY" DOUBLE PRECISION, "localNormalZ" DOUBLE PRECISION,
  "version" INTEGER NOT NULL DEFAULT 1, "createdByPractitionerId" UUID NOT NULL, "createdByUserId" UUID NOT NULL, "updatedByUserId" UUID NOT NULL,
  "resolvedAt" TIMESTAMPTZ(3), "voidedAt" TIMESTAMPTZ(3), "voidReason" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "body_annotations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "body_annotations_severity_check" CHECK ("severity" IS NULL OR "severity" BETWEEN 0 AND 10),
  CONSTRAINT "body_annotations_anchor_index_check" CHECK ("primitiveIndex" >= 0 AND "triangleIndex" >= 0),
  CONSTRAINT "body_annotations_barycentric_check" CHECK (
    "barycentricU" BETWEEN 0 AND 1 AND "barycentricV" BETWEEN 0 AND 1 AND "barycentricW" BETWEEN 0 AND 1
    AND abs(("barycentricU" + "barycentricV" + "barycentricW") - 1) < 0.0001
  ),
  CONSTRAINT "body_annotations_normal_all_or_none_check" CHECK (
    ("localNormalX" IS NULL AND "localNormalY" IS NULL AND "localNormalZ" IS NULL)
    OR ("localNormalX" IS NOT NULL AND "localNormalY" IS NOT NULL AND "localNormalZ" IS NOT NULL)
  ),
  CONSTRAINT "body_annotations_lifecycle_check" CHECK (
    ("status" = 'ACTIVE' AND "resolvedAt" IS NULL AND "voidedAt" IS NULL AND "voidReason" IS NULL)
    OR ("status" = 'RESOLVED' AND "resolvedAt" IS NOT NULL AND "voidedAt" IS NULL AND "voidReason" IS NULL)
    OR ("status" = 'VOIDED' AND "voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL)
  )
);

CREATE TABLE "body_annotation_status_history" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "annotationId" UUID NOT NULL,
  "fromStatus" "BodyAnnotationStatus", "toStatus" "BodyAnnotationStatus" NOT NULL,
  "changedByUserId" UUID NOT NULL, "reason" VARCHAR(1000), "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "body_annotation_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "anatomical_models_code_key" ON "anatomical_models"("code");
CREATE UNIQUE INDEX "anatomical_model_versions_modelId_version_key" ON "anatomical_model_versions"("modelId", "version");
CREATE UNIQUE INDEX "anatomical_model_versions_one_active" ON "anatomical_model_versions"("modelId") WHERE "status" = 'ACTIVE';
CREATE INDEX "anatomical_model_versions_modelId_status_idx" ON "anatomical_model_versions"("modelId", "status");
CREATE UNIQUE INDEX "anatomical_structures_code_key" ON "anatomical_structures"("code");
CREATE INDEX "anatomical_structures_parentId_active_canonicalName_idx" ON "anatomical_structures"("parentId", "active", "canonicalName");
CREATE INDEX "anatomical_structures_regionCode_laterality_idx" ON "anatomical_structures"("regionCode", "laterality");
CREATE UNIQUE INDEX "anatomical_structure_mappings_version_mesh_primitive_key" ON "anatomical_structure_mappings"("modelVersionId", "stableMeshKey", "primitiveIndex");
CREATE INDEX "anatomical_structure_mappings_version_structure_idx" ON "anatomical_structure_mappings"("modelVersionId", "structureId");
CREATE INDEX "body_annotations_org_patient_status_created_idx" ON "body_annotations"("organizationId", "patientId", "status", "createdAt");
CREATE INDEX "body_annotations_org_encounter_created_idx" ON "body_annotations"("organizationId", "encounterId", "createdAt");
CREATE INDEX "body_annotations_org_structure_status_idx" ON "body_annotations"("organizationId", "structureId", "status");
CREATE INDEX "body_annotation_status_history_org_annotation_changed_idx" ON "body_annotation_status_history"("organizationId", "annotationId", "changedAt");

ALTER TABLE "anatomical_model_versions" ADD CONSTRAINT "anatomical_model_versions_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "anatomical_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "anatomical_structures" ADD CONSTRAINT "anatomical_structures_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "anatomical_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "anatomical_structure_mappings" ADD CONSTRAINT "anatomical_structure_mappings_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "anatomical_model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "anatomical_structure_mappings" ADD CONSTRAINT "anatomical_structure_mappings_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "anatomical_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotations" ADD CONSTRAINT "body_annotations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotations" ADD CONSTRAINT "body_annotations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotations" ADD CONSTRAINT "body_annotations_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotations" ADD CONSTRAINT "body_annotations_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "anatomical_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotations" ADD CONSTRAINT "body_annotations_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "anatomical_model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotations" ADD CONSTRAINT "body_annotations_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "anatomical_structure_mappings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotations" ADD CONSTRAINT "body_annotations_createdByPractitionerId_fkey" FOREIGN KEY ("createdByPractitionerId") REFERENCES "practitioners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotations" ADD CONSTRAINT "body_annotations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotations" ADD CONSTRAINT "body_annotations_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotation_status_history" ADD CONSTRAINT "body_annotation_status_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotation_status_history" ADD CONSTRAINT "body_annotation_status_history_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "body_annotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "body_annotation_status_history" ADD CONSTRAINT "body_annotation_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
