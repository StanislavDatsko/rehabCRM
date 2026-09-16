CREATE TYPE "AnatomicalModelAssetKind" AS ENUM ('MANIFEST', 'GEOMETRY_CHUNK');

CREATE TABLE "anatomical_model_assets" (
  "id" UUID NOT NULL,
  "modelVersionId" UUID NOT NULL,
  "kind" "AnatomicalModelAssetKind" NOT NULL,
  "assetIndex" INTEGER NOT NULL DEFAULT 0,
  "storageKey" VARCHAR(500) NOT NULL,
  "checksumSha256" CHAR(64) NOT NULL,
  "bytes" INTEGER NOT NULL,
  "contentEncoding" VARCHAR(32),
  "contentType" VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "anatomical_model_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "anatomical_model_assets_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "anatomical_model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "anatomical_model_assets_version_kind_index_key" ON "anatomical_model_assets"("modelVersionId", "kind", "assetIndex");
CREATE INDEX "anatomical_model_assets_version_kind_idx" ON "anatomical_model_assets"("modelVersionId", "kind");

CREATE TABLE "anatomical_source_parts" (
  "id" UUID NOT NULL,
  "modelVersionId" UUID NOT NULL,
  "sourcePartId" VARCHAR(64) NOT NULL,
  "conceptId" VARCHAR(64) NOT NULL,
  "name" VARCHAR(500) NOT NULL,
  "system" VARCHAR(64) NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "anatomical_source_parts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "anatomical_source_parts_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "anatomical_model_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "anatomical_source_parts_version_sourcePartId_key" ON "anatomical_source_parts"("modelVersionId", "sourcePartId");
CREATE INDEX "anatomical_source_parts_version_conceptId_idx" ON "anatomical_source_parts"("modelVersionId", "conceptId");
CREATE INDEX "anatomical_source_parts_version_system_idx" ON "anatomical_source_parts"("modelVersionId", "system");

ALTER TABLE "anatomical_structure_mappings" ADD COLUMN "sourcePartId" VARCHAR(64);
ALTER TABLE "anatomical_structure_mappings"
  ADD CONSTRAINT "anatomical_structure_mappings_source_part_fkey"
  FOREIGN KEY ("modelVersionId", "sourcePartId")
  REFERENCES "anatomical_source_parts"("modelVersionId", "sourcePartId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
