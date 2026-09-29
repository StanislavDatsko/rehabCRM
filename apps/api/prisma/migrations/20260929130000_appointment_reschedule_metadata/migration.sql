ALTER TABLE "appointments"
  ADD COLUMN "rescheduledAt" TIMESTAMPTZ(3),
  ADD COLUMN "rescheduleCount" INTEGER NOT NULL DEFAULT 0;
