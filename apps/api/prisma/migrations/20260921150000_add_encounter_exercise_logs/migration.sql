CREATE TABLE "encounter_exercise_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "encounterId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "exerciseId" UUID,
    "exerciseName" VARCHAR(200),
    "sets" INTEGER,
    "repetitions" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "durationMinutes" INTEGER,
    "specialistNote" VARCHAR(2000),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "encounter_exercise_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "encounter_exercise_logs_organizationId_patientId_createdAt_idx" ON "encounter_exercise_logs"("organizationId", "patientId", "createdAt");
CREATE INDEX "encounter_exercise_logs_encounterId_createdAt_idx" ON "encounter_exercise_logs"("encounterId", "createdAt");
ALTER TABLE "encounter_exercise_logs" ADD CONSTRAINT "encounter_exercise_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounter_exercise_logs" ADD CONSTRAINT "encounter_exercise_logs_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounter_exercise_logs" ADD CONSTRAINT "encounter_exercise_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounter_exercise_logs" ADD CONSTRAINT "encounter_exercise_logs_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "encounter_exercise_logs" ADD CONSTRAINT "encounter_exercise_logs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
