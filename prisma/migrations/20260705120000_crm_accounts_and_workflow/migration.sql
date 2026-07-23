-- CreateEnum
CREATE TYPE "Negotiable" AS ENUM ('yes', 'no', 'maybe');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('onsite', 'remote', 'hybrid');

-- AlterEnum: rename ReqStatus.open -> ReqStatus.new (Part 1.6 of the CRM
-- enhancement request). Existing rows carrying the old 'open' value are
-- explicitly remapped to 'new' inside the USING cast so no data is lost.
BEGIN;
CREATE TYPE "ReqStatus_new" AS ENUM ('new', 'in_progress', 'on_hold', 'closed_won', 'closed_lost');
ALTER TABLE "Requirement" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Requirement" ALTER COLUMN "status" TYPE "ReqStatus_new" USING (
  CASE "status"::text
    WHEN 'open' THEN 'new'
    ELSE "status"::text
  END
)::"ReqStatus_new";
ALTER TYPE "ReqStatus" RENAME TO "ReqStatus_old";
ALTER TYPE "ReqStatus_new" RENAME TO "ReqStatus";
DROP TYPE "ReqStatus_old";
ALTER TABLE "Requirement" ALTER COLUMN "status" SET DEFAULT 'new';
COMMIT;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "certifications" TEXT[] NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "availableSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "claimEscalatedAt" TIMESTAMP(3),
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "negotiable" "Negotiable",
ADD COLUMN     "workMode" "WorkMode";

-- Existing rows: treat "claimed already" the same as "no fresh SLA needed"
-- so nothing already-claimed gets spuriously escalated the moment this
-- migration runs; unclaimed legacy rows get availableSince = dateAdded so
-- their 3-hour window is measured from when they actually appeared.
UPDATE "Requirement" SET "availableSince" = "dateAdded";

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "uploadedById" TEXT;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "domain" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedIn" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "requirementId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_accountId_key" ON "Account"("accountId");

-- CreateIndex
CREATE INDEX "Account_normalizedName_idx" ON "Account"("normalizedName");

-- CreateIndex
CREATE INDEX "Account_domain_idx" ON "Account"("domain");

-- CreateIndex
CREATE INDEX "Contact_accountId_idx" ON "Contact"("accountId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Requirement_accountId_idx" ON "Requirement"("accountId");

-- CreateIndex
CREATE INDEX "Requirement_contactId_idx" ON "Requirement"("contactId");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
