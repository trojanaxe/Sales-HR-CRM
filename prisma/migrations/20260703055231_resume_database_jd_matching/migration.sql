-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "companiesWorkedFor" TEXT[],
ADD COLUMN     "currentCTC" TEXT,
ADD COLUMN     "currentJobTitle" TEXT,
ADD COLUMN     "expectedCTC" TEXT,
ADD COLUMN     "noticePeriod" TEXT,
ADD COLUMN     "sourceDetail" TEXT;

-- AlterTable
ALTER TABLE "JDProfile" ADD COLUMN     "certificationsRequired" TEXT[],
ADD COLUMN     "domainKeywords" TEXT[],
ADD COLUMN     "educationRequirement" TEXT,
ADD COLUMN     "employmentType" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "relevantExperienceYears" DOUBLE PRECISION,
ADD COLUMN     "workModel" TEXT;

-- AlterTable
ALTER TABLE "ResumeProfile" ADD COLUMN     "companies" TEXT[],
ADD COLUMN     "currentCTC" TEXT,
ADD COLUMN     "currentJobTitle" TEXT,
ADD COLUMN     "expectedCTC" TEXT,
ADD COLUMN     "noticePeriod" TEXT;

-- CreateTable
CREATE TABLE "AdhocJD" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "createdById" TEXT NOT NULL,
    "jdFilePath" TEXT,
    "jdText" TEXT,
    "extractedText" TEXT,
    "jobTitle" TEXT,
    "requiredSkills" TEXT[],
    "preferredSkills" TEXT[],
    "certificationsRequired" TEXT[],
    "domainKeywords" TEXT[],
    "keywords" TEXT[],
    "minExperienceYears" DOUBLE PRECISION,
    "maxExperienceYears" DOUBLE PRECISION,
    "relevantExperienceYears" DOUBLE PRECISION,
    "location" TEXT,
    "workModel" TEXT,
    "employmentType" TEXT,
    "educationRequirement" TEXT,
    "parserVersion" INTEGER NOT NULL DEFAULT 1,
    "parsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdhocJD_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "minMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "MatchSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdhocJD_createdById_idx" ON "AdhocJD"("createdById");

-- AddForeignKey
ALTER TABLE "AdhocJD" ADD CONSTRAINT "AdhocJD_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
