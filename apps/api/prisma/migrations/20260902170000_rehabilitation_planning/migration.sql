CREATE TYPE "RehabilitationPlanStatus" AS ENUM ('DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED');
CREATE TYPE "RehabilitationPlanRevisionStatus" AS ENUM ('DRAFT','PUBLISHED');
CREATE TYPE "RehabilitationGoalStatus" AS ENUM ('PLANNED','IN_PROGRESS','ACHIEVED','NOT_ACHIEVED','CANCELLED');
CREATE TYPE "GoalTargetOperator" AS ENUM ('GREATER_THAN_OR_EQUAL','LESS_THAN_OR_EQUAL','EQUAL','BETWEEN');
CREATE TYPE "ExerciseCategory" AS ENUM ('MOBILITY','STRENGTH','STABILITY','BALANCE','ENDURANCE','STRETCHING','MOTOR_CONTROL','FUNCTIONAL','BREATHING','OTHER');
CREATE TYPE "ExerciseDifficulty" AS ENUM ('FOUNDATIONAL','INTERMEDIATE','ADVANCED');
CREATE TYPE "ExerciseMediaType" AS ENUM ('IMAGE','VIDEO','ANIMATION','DOCUMENT');
CREATE TYPE "ExerciseDosageKind" AS ENUM ('SETS_REPETITIONS','TRIALS','DURATION','HOLD','DISTANCE','LOAD');
CREATE TYPE "ExerciseFrequencyType" AS ENUM ('DAILY','WEEKLY','ALTERNATE_DAYS','SUPERVISED_ONLY');
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE "rehabilitation_plans" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "responsiblePractitionerId" UUID NOT NULL,
  "status" "RehabilitationPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "currentRevisionId" UUID,
  "cancellationReason" VARCHAR(1000),
  "cancelledAt" TIMESTAMPTZ(3),
  "cancelledByUserId" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" UUID NOT NULL,
  "updatedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "rehabilitation_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rehabilitation_plans_version_check" CHECK ("version" >= 1),
  CONSTRAINT "rehabilitation_plans_cancel_check" CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL AND "cancelledByUserId" IS NOT NULL AND "cancellationReason" IS NOT NULL))
);
CREATE UNIQUE INDEX "rehabilitation_plans_currentRevisionId_key" ON "rehabilitation_plans"("currentRevisionId");
CREATE INDEX "rehabilitation_plans_organizationId_patientId_status_idx" ON "rehabilitation_plans"("organizationId","patientId","status");
CREATE INDEX "rehabilitation_plans_organizationId_responsiblePractitionerId_status_idx" ON "rehabilitation_plans"("organizationId","responsiblePractitionerId","status");

CREATE TABLE "rehabilitation_plan_revisions" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "basedOnRevisionId" UUID,
  "revisionNumber" INTEGER NOT NULL,
  "status" "RehabilitationPlanRevisionStatus" NOT NULL DEFAULT 'DRAFT',
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(5000),
  "startDate" DATE NOT NULL,
  "expectedEndDate" DATE,
  "effectiveFrom" TIMESTAMPTZ(3),
  "changeSummary" VARCHAR(1000),
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rehabilitation_plan_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rehabilitation_plan_revisions_number_check" CHECK ("revisionNumber" >= 1),
  CONSTRAINT "rehabilitation_plan_revisions_dates_check" CHECK ("expectedEndDate" IS NULL OR "expectedEndDate" >= "startDate"),
  CONSTRAINT "rehabilitation_plan_revisions_publish_check" CHECK (("status" = 'PUBLISHED') = ("effectiveFrom" IS NOT NULL))
);
CREATE UNIQUE INDEX "rehabilitation_plan_revisions_planId_revisionNumber_key" ON "rehabilitation_plan_revisions"("planId","revisionNumber");
CREATE UNIQUE INDEX "rehabilitation_plan_revisions_one_draft_per_plan" ON "rehabilitation_plan_revisions"("planId") WHERE "status" = 'DRAFT';
CREATE INDEX "rehabilitation_plan_revisions_organizationId_planId_status_idx" ON "rehabilitation_plan_revisions"("organizationId","planId","status");

CREATE TABLE "rehabilitation_goals" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "planRevisionId" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(3000),
  "category" VARCHAR(100),
  "anatomicalRegionCode" VARCHAR(64),
  "laterality" "Laterality",
  "status" "RehabilitationGoalStatus" NOT NULL DEFAULT 'PLANNED',
  "targetDate" DATE,
  "measurementDefinitionId" UUID,
  "targetOperator" "GoalTargetOperator",
  "targetValue" DOUBLE PRECISION,
  "targetValueUpper" DOUBLE PRECISION,
  "targetUnitCode" VARCHAR(32),
  "baselineMeasurementId" UUID,
  "baselineNumericValueSnapshot" DOUBLE PRECISION,
  "baselineUnitCodeSnapshot" VARCHAR(32),
  "baselineDefinitionCode" VARCHAR(100),
  "baselineDefinitionName" VARCHAR(200),
  "baselinePerformedAt" TIMESTAMPTZ(3),
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "rehabilitation_goals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rehabilitation_goals_order_check" CHECK ("displayOrder" >= 0),
  CONSTRAINT "rehabilitation_goals_between_check" CHECK ("targetOperator" <> 'BETWEEN' OR ("targetValueUpper" IS NOT NULL AND "targetValue" <= "targetValueUpper")),
  CONSTRAINT "rehabilitation_goals_link_check" CHECK (
    ("measurementDefinitionId" IS NULL AND "targetOperator" IS NULL AND "targetValue" IS NULL AND "baselineMeasurementId" IS NULL) OR
    ("measurementDefinitionId" IS NOT NULL AND "targetOperator" IS NOT NULL AND "targetValue" IS NOT NULL)
  )
);
CREATE INDEX "rehabilitation_goals_planRevisionId_displayOrder_idx" ON "rehabilitation_goals"("planRevisionId","displayOrder");
CREATE INDEX "rehabilitation_goals_organizationId_measurementDefinitionId_anatomicalRegionCode_laterality_idx" ON "rehabilitation_goals"("organizationId","measurementDefinitionId","anatomicalRegionCode","laterality");

CREATE TABLE "rehabilitation_plan_phases" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "planRevisionId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" VARCHAR(3000),
  "displayOrder" INTEGER NOT NULL,
  "expectedStart" DATE,
  "expectedEnd" DATE,
  "criteria" VARCHAR(3000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "rehabilitation_plan_phases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rehabilitation_plan_phases_order_check" CHECK ("displayOrder" >= 0),
  CONSTRAINT "rehabilitation_plan_phases_dates_check" CHECK ("expectedStart" IS NULL OR "expectedEnd" IS NULL OR "expectedEnd" >= "expectedStart")
);
CREATE UNIQUE INDEX "rehabilitation_plan_phases_planRevisionId_displayOrder_key" ON "rehabilitation_plan_phases"("planRevisionId","displayOrder");

CREATE TABLE "exercise_definitions" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "code" VARCHAR(100) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" VARCHAR(1000) NOT NULL,
  "instructions" VARCHAR(5000) NOT NULL,
  "category" "ExerciseCategory" NOT NULL,
  "difficulty" "ExerciseDifficulty",
  "anatomicalRegionCodes" TEXT[] NOT NULL,
  "lateralityApplicability" "Laterality"[] NOT NULL,
  "targetMuscleGroupCodes" TEXT[] NOT NULL,
  "equipment" TEXT[] NOT NULL,
  "supportedDosageKinds" "ExerciseDosageKind"[] NOT NULL,
  "contraindicationNotes" VARCHAR(3000),
  "safetyNotes" VARCHAR(3000),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "exercise_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "exercise_definitions_organizationId_code_key" ON "exercise_definitions"("organizationId","code");
CREATE UNIQUE INDEX "exercise_definitions_system_code_key" ON "exercise_definitions"("code") WHERE "organizationId" IS NULL;
CREATE INDEX "exercise_definitions_organizationId_active_category_code_idx" ON "exercise_definitions"("organizationId","active","category","code");
CREATE INDEX "exercise_definitions_name_lower_idx" ON "exercise_definitions"(LOWER("name"));
CREATE INDEX "exercise_definitions_name_trgm_idx" ON "exercise_definitions" USING GIN (LOWER("name") gin_trgm_ops);
CREATE INDEX "exercise_definitions_code_trgm_idx" ON "exercise_definitions" USING GIN (LOWER("code") gin_trgm_ops);

CREATE TABLE "exercise_media" (
  "id" UUID NOT NULL,
  "exerciseDefinitionId" UUID NOT NULL,
  "mediaType" "ExerciseMediaType" NOT NULL,
  "storageKey" VARCHAR(500),
  "externalUrl" VARCHAR(2000),
  "caption" VARCHAR(500),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "source" VARCHAR(500),
  "sourceUrl" VARCHAR(2000),
  "author" VARCHAR(300),
  "license" VARCHAR(300),
  "attribution" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exercise_media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exercise_media_source_check" CHECK (num_nonnulls("storageKey","externalUrl") = 1),
  CONSTRAINT "exercise_media_order_check" CHECK ("sortOrder" >= 0)
);
CREATE INDEX "exercise_media_exerciseDefinitionId_sortOrder_idx" ON "exercise_media"("exerciseDefinitionId","sortOrder");

CREATE TABLE "exercise_prescriptions" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "planRevisionId" UUID NOT NULL,
  "phaseId" UUID,
  "exerciseDefinitionId" UUID NOT NULL,
  "exerciseCodeSnapshot" VARCHAR(100) NOT NULL,
  "exerciseNameSnapshot" VARCHAR(200) NOT NULL,
  "laterality" "Laterality",
  "anatomicalRegionCode" VARCHAR(64),
  "sets" INTEGER,
  "repetitions" INTEGER,
  "trials" INTEGER,
  "durationSeconds" INTEGER,
  "holdSeconds" INTEGER,
  "distanceMeters" DOUBLE PRECISION,
  "loadKg" DOUBLE PRECISION,
  "frequencyType" "ExerciseFrequencyType",
  "sessionsPerDay" INTEGER,
  "daysPerWeek" INTEGER,
  "instructionsOverride" VARCHAR(5000),
  "specialistNote" VARCHAR(3000),
  "precautions" VARCHAR(3000),
  "progressionCriteria" VARCHAR(3000),
  "regressionCriteria" VARCHAR(3000),
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "exercise_prescriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exercise_prescriptions_dosage_check" CHECK (
    ("sets" IS NULL OR "sets" > 0) AND ("repetitions" IS NULL OR "repetitions" > 0) AND
    ("trials" IS NULL OR "trials" > 0) AND ("durationSeconds" IS NULL OR "durationSeconds" > 0) AND
    ("holdSeconds" IS NULL OR "holdSeconds" > 0) AND ("distanceMeters" IS NULL OR "distanceMeters" > 0) AND
    ("loadKg" IS NULL OR "loadKg" >= 0) AND ("sessionsPerDay" IS NULL OR "sessionsPerDay" BETWEEN 1 AND 20) AND
    ("daysPerWeek" IS NULL OR "daysPerWeek" BETWEEN 1 AND 7) AND "displayOrder" >= 0 AND
    num_nonnulls("sets","repetitions","trials","durationSeconds","holdSeconds","distanceMeters","loadKg") >= 1
  )
);
CREATE INDEX "exercise_prescriptions_planRevisionId_displayOrder_idx" ON "exercise_prescriptions"("planRevisionId","displayOrder");
CREATE INDEX "exercise_prescriptions_organizationId_exerciseDefinitionId_idx" ON "exercise_prescriptions"("organizationId","exerciseDefinitionId");

ALTER TABLE "rehabilitation_plans" ADD CONSTRAINT "rehabilitation_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plans" ADD CONSTRAINT "rehabilitation_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plans" ADD CONSTRAINT "rehabilitation_plans_responsiblePractitionerId_fkey" FOREIGN KEY ("responsiblePractitionerId") REFERENCES "practitioners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plans" ADD CONSTRAINT "rehabilitation_plans_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plans" ADD CONSTRAINT "rehabilitation_plans_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plans" ADD CONSTRAINT "rehabilitation_plans_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plan_revisions" ADD CONSTRAINT "rehabilitation_plan_revisions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plan_revisions" ADD CONSTRAINT "rehabilitation_plan_revisions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "rehabilitation_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plan_revisions" ADD CONSTRAINT "rehabilitation_plan_revisions_basedOnRevisionId_fkey" FOREIGN KEY ("basedOnRevisionId") REFERENCES "rehabilitation_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plan_revisions" ADD CONSTRAINT "rehabilitation_plan_revisions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plans" ADD CONSTRAINT "rehabilitation_plans_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "rehabilitation_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_goals" ADD CONSTRAINT "rehabilitation_goals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_goals" ADD CONSTRAINT "rehabilitation_goals_planRevisionId_fkey" FOREIGN KEY ("planRevisionId") REFERENCES "rehabilitation_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_goals" ADD CONSTRAINT "rehabilitation_goals_measurementDefinitionId_fkey" FOREIGN KEY ("measurementDefinitionId") REFERENCES "measurement_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_goals" ADD CONSTRAINT "rehabilitation_goals_baselineMeasurementId_fkey" FOREIGN KEY ("baselineMeasurementId") REFERENCES "measurements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plan_phases" ADD CONSTRAINT "rehabilitation_plan_phases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rehabilitation_plan_phases" ADD CONSTRAINT "rehabilitation_plan_phases_planRevisionId_fkey" FOREIGN KEY ("planRevisionId") REFERENCES "rehabilitation_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_definitions" ADD CONSTRAINT "exercise_definitions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_media" ADD CONSTRAINT "exercise_media_exerciseDefinitionId_fkey" FOREIGN KEY ("exerciseDefinitionId") REFERENCES "exercise_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_prescriptions" ADD CONSTRAINT "exercise_prescriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_prescriptions" ADD CONSTRAINT "exercise_prescriptions_planRevisionId_fkey" FOREIGN KEY ("planRevisionId") REFERENCES "rehabilitation_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_prescriptions" ADD CONSTRAINT "exercise_prescriptions_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "rehabilitation_plan_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_prescriptions" ADD CONSTRAINT "exercise_prescriptions_exerciseDefinitionId_fkey" FOREIGN KEY ("exerciseDefinitionId") REFERENCES "exercise_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
