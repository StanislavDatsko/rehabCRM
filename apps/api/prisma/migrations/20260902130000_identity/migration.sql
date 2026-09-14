-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "PractitionerStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "StaffRole" AS ENUM ('SYSTEM_ADMIN', 'ORGANIZATION_ADMIN', 'RECEPTIONIST', 'REHABILITATION_SPECIALIST');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "identityProvider" TEXT NOT NULL,
    "identityProviderSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_identityProvider_identityProviderSubject_key" ON "users"("identityProvider", "identityProviderSubject");
CREATE INDEX "users_email_idx" ON "users"("email");

CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "StaffRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_key" ON "organization_memberships"("organizationId", "userId");
CREATE INDEX "organization_memberships_userId_status_idx" ON "organization_memberships"("userId", "status");

ALTER TABLE "organization_memberships"
  ADD CONSTRAINT "organization_memberships_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "organization_memberships"
  ADD CONSTRAINT "organization_memberships_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "practitioners" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "PractitionerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "practitioners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "practitioners_organizationId_userId_key" ON "practitioners"("organizationId", "userId");

ALTER TABLE "practitioners"
  ADD CONSTRAINT "practitioners_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "practitioners"
  ADD CONSTRAINT "practitioners_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "authorization_probes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorization_probes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "authorization_probes_organizationId_idx" ON "authorization_probes"("organizationId");

ALTER TABLE "authorization_probes"
  ADD CONSTRAINT "authorization_probes_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
