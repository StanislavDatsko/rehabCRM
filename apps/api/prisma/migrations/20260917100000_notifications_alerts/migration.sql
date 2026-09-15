CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');
CREATE TYPE "NotificationType" AS ENUM ('DAILY_REPORT_REMINDER', 'PLAN_UPDATED', 'APPOINTMENT_REMINDER', 'EXERCISE_REMINDER', 'NEW_PATIENT_REPORT', 'SYMPTOM_CHANGE', 'MISSED_DAILY_REPORT', 'LOW_EXERCISE_ADHERENCE');
CREATE TYPE "ClinicalAlertSeverity" AS ENUM ('INFO', 'ATTENTION', 'HIGH');
CREATE TYPE "ClinicalAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "recipientUserId" UUID NOT NULL,
  "type" "NotificationType" NOT NULL, "category" VARCHAR(32) NOT NULL, "title" VARCHAR(200) NOT NULL, "message" VARCHAR(1000) NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD', "relatedPatientId" UUID, "relatedRehabilitationPlanId" UUID, "relatedDailyReportId" UUID, "relatedExerciseCompletionId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "readAt" TIMESTAMPTZ(3), "dismissedAt" TIMESTAMPTZ(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_recipient_idx" ON "notifications"("organizationId", "recipientUserId", "status", "createdAt");
CREATE UNIQUE INDEX "notifications_report_dedupe" ON "notifications"("recipientUserId", "type", "relatedDailyReportId");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_patient_fkey" FOREIGN KEY ("relatedPatientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "clinical_alerts" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "patientId" UUID NOT NULL, "type" "NotificationType" NOT NULL, "severity" "ClinicalAlertSeverity" NOT NULL, "status" "ClinicalAlertStatus" NOT NULL DEFAULT 'OPEN',
  "title" VARCHAR(200) NOT NULL, "summary" VARCHAR(1000) NOT NULL, "sourceDailyReportId" UUID, "sourceExerciseCompletionId" UUID, "createdByUserId" UUID NOT NULL, "resolvedByUserId" UUID, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "acknowledgedAt" TIMESTAMPTZ(3), "resolvedAt" TIMESTAMPTZ(3), CONSTRAINT "clinical_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "clinical_alerts_patient_idx" ON "clinical_alerts"("organizationId", "patientId", "status", "createdAt");
CREATE UNIQUE INDEX "clinical_alerts_source_dedupe" ON "clinical_alerts"("patientId", "type", "sourceDailyReportId", "sourceExerciseCompletionId");
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_patient_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_created_by_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_resolved_by_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
