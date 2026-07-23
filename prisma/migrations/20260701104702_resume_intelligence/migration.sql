-- CreateEnum
CREATE TYPE "KeywordCategory" AS ENUM ('skill', 'role', 'industry', 'certification');

-- CreateTable
CREATE TABLE "ResumeProfile" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "skills" TEXT[],
    "technologies" TEXT[],
    "roles" TEXT[],
    "industries" TEXT[],
    "certifications" TEXT[],
    "education" JSONB NOT NULL,
    "projects" JSONB NOT NULL,
    "totalExperienceYears" DOUBLE PRECISION,
    "keywords" TEXT[],
    "parserVersion" INTEGER NOT NULL DEFAULT 1,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JDProfile" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "requiredSkills" TEXT[],
    "preferredSkills" TEXT[],
    "keywords" TEXT[],
    "minExperienceYears" DOUBLE PRECISION,
    "maxExperienceYears" DOUBLE PRECISION,
    "parserVersion" INTEGER NOT NULL DEFAULT 1,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JDProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "category" "KeywordCategory" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeProfile_resumeId_key" ON "ResumeProfile"("resumeId");

-- CreateIndex
CREATE INDEX "ResumeProfile_candidateId_idx" ON "ResumeProfile"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "JDProfile_requirementId_key" ON "JDProfile"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillKeyword_keyword_key" ON "SkillKeyword"("keyword");

-- CreateIndex
CREATE INDEX "SkillKeyword_category_idx" ON "SkillKeyword"("category");

-- AddForeignKey
ALTER TABLE "ResumeProfile" ADD CONSTRAINT "ResumeProfile_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JDProfile" ADD CONSTRAINT "JDProfile_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
