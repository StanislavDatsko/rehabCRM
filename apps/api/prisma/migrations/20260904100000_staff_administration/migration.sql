CREATE TYPE "StaffSetupStatus" AS ENUM ('PENDING_SETUP', 'ACTIVE', 'SETUP_ACTION_FAILED');

ALTER TABLE "users"
  ADD COLUMN "firstName" VARCHAR(100),
  ADD COLUMN "lastName" VARCHAR(100);

UPDATE "users"
SET
  "firstName" = NULLIF(split_part("displayName", ' ', 1), ''),
  "lastName" = NULLIF(trim(substr("displayName", length(split_part("displayName", ' ', 1)) + 1)), '')
WHERE "firstName" IS NULL AND "lastName" IS NULL;

CREATE UNIQUE INDEX "users_identityProvider_email_key"
  ON "users"("identityProvider", "email");

ALTER TABLE "organization_memberships"
  ADD COLUMN "setupStatus" "StaffSetupStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "identitySyncPending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "practitioners"
  ADD COLUMN "professionalTitle" VARCHAR(150);
