CREATE TYPE "StaffInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

CREATE TABLE "staff_invitations" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  "role" "StaffRole" NOT NULL,
  "professionalTitle" VARCHAR(150),
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "status" "StaffInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "createdByUserId" UUID NOT NULL,
  "acceptedByUserId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staff_invitations_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "staff_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "staff_invitations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "staff_invitations_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "staff_invitations_organizationId_status_idx" ON "staff_invitations"("organizationId", "status");
CREATE INDEX "staff_invitations_email_status_idx" ON "staff_invitations"("email", "status");
