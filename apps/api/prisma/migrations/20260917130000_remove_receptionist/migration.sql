DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "OrganizationMembership"
    WHERE role = 'RECEPTIONIST'
  ) THEN
    RAISE EXCEPTION 'Cannot remove RECEPTIONIST: existing memberships require an explicit data migration decision';
  END IF;
END $$;

ALTER TYPE "StaffRole" RENAME TO "StaffRole_old";
CREATE TYPE "StaffRole" AS ENUM ('SYSTEM_ADMIN', 'ORGANIZATION_ADMIN', 'REHABILITATION_SPECIALIST');
ALTER TABLE "OrganizationMembership"
  ALTER COLUMN "role" TYPE "StaffRole"
  USING ("role"::text::"StaffRole");
DROP TYPE "StaffRole_old";
