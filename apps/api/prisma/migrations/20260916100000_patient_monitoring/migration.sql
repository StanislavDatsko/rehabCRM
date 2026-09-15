CREATE TYPE "ExerciseCompletionStatus" AS ENUM ('COMPLETED', 'PARTIAL', 'SKIPPED');

CREATE TABLE "daily_reports" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "reportDate" DATE NOT NULL,
  "overallWellbeing" INTEGER NOT NULL,
  "fatigueLevel" INTEGER NOT NULL,
  "painScore" INTEGER NOT NULL,
  "comment" VARCHAR(2000),
  "source" VARCHAR(32) NOT NULL DEFAULT 'PATIENT_REPORTED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "daily_reports_organizationId_patientId_reportDate_key" ON "daily_reports"("organizationId", "patientId", "reportDate");
CREATE INDEX "daily_reports_organizationId_patientId_reportDate_idx" ON "daily_reports"("organizationId", "patientId", "reportDate");
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "exercise_completions" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "rehabilitationPlanId" UUID NOT NULL,
  "planRevisionId" UUID NOT NULL,
  "exercisePrescriptionId" UUID NOT NULL,
  "executionDate" DATE NOT NULL,
  "status" "ExerciseCompletionStatus" NOT NULL,
  "completedSets" INTEGER,
  "completedRepetitions" INTEGER,
  "durationMinutes" INTEGER,
  "patientDifficulty" INTEGER,
  "comment" VARCHAR(1000),
  "source" VARCHAR(32) NOT NULL DEFAULT 'PATIENT_REPORTED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "exercise_completions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "exercise_completions_organizationId_patientId_exercisePrescriptionId_executionDate_key" ON "exercise_completions"("organizationId", "patientId", "exercisePrescriptionId", "executionDate");
CREATE INDEX "exercise_completions_organizationId_patientId_executionDate_idx" ON "exercise_completions"("organizationId", "patientId", "executionDate");
ALTER TABLE "exercise_completions" ADD CONSTRAINT "exercise_completions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_completions" ADD CONSTRAINT "exercise_completions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_completions" ADD CONSTRAINT "exercise_completions_rehabilitationPlanId_fkey" FOREIGN KEY ("rehabilitationPlanId") REFERENCES "rehabilitation_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_completions" ADD CONSTRAINT "exercise_completions_planRevisionId_fkey" FOREIGN KEY ("planRevisionId") REFERENCES "rehabilitation_plan_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_completions" ADD CONSTRAINT "exercise_completions_exercisePrescriptionId_fkey" FOREIGN KEY ("exercisePrescriptionId") REFERENCES "exercise_prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
