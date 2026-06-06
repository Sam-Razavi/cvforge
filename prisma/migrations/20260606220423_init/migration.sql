-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "RewriteJob" (
    "id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "language" TEXT NOT NULL DEFAULT 'en',
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "apiKeyId" TEXT,
    "inputCvText" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "rewrittenCv" TEXT,
    "coverLetter" TEXT,
    "matchScore" INTEGER,
    "keywordsAdded" TEXT[],
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RewriteJob_pkey" PRIMARY KEY ("id")
);
