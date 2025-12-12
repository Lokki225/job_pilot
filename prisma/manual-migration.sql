-- ============================================
-- MANUAL MIGRATION: Job Management System
-- ============================================

-- Step 1: Update ApplicationStatus enum
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";

CREATE TYPE "ApplicationStatus" AS ENUM (
  'WISHLIST',
  'APPLIED',
  'INTERVIEWING',
  'OFFERED',
  'REJECTED',
  'ACCEPTED',
  'WITHDRAWN'
);

-- Migrate existing data
ALTER TABLE "job_applications" 
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "job_applications" 
  ALTER COLUMN "status" TYPE "ApplicationStatus" 
  USING (
    CASE 
      WHEN "status"::text = 'PENDING' THEN 'WISHLIST'::ApplicationStatus
      WHEN "status"::text = 'SENT' THEN 'APPLIED'::ApplicationStatus
      WHEN "status"::text = 'VIEWED' THEN 'INTERVIEWING'::ApplicationStatus
      WHEN "status"::text = 'REPLIED' THEN 'INTERVIEWING'::ApplicationStatus
      WHEN "status"::text = 'REJECTED' THEN 'REJECTED'::ApplicationStatus
      WHEN "status"::text = 'ACCEPTED' THEN 'ACCEPTED'::ApplicationStatus
      ELSE 'WISHLIST'::ApplicationStatus
    END
  );

ALTER TABLE "job_applications" 
  ALTER COLUMN "status" SET DEFAULT 'WISHLIST'::ApplicationStatus;

DROP TYPE "ApplicationStatus_old";

-- Step 2: Update JobPlatform enum
ALTER TYPE "JobPlatform" RENAME TO "JobPlatform_old";

CREATE TYPE "JobPlatform" AS ENUM (
  'LINKEDIN',
  'INDEED',
  'GLASSDOOR',
  'COMPANY_WEBSITE',
  'REFERRAL',
  'RECRUITER',
  'JOB_BOARD',
  'PASTED',
  'OTHER'
);

-- Migrate existing data
ALTER TABLE "job_applications" 
  ALTER COLUMN "source" TYPE "JobPlatform" 
  USING (
    CASE 
      WHEN "source"::text = 'LINKEDIN' THEN 'LINKEDIN'::JobPlatform
      WHEN "source"::text = 'INDEED' THEN 'INDEED'::JobPlatform
      WHEN "source"::text = 'GLASSDOOR' THEN 'GLASSDOOR'::JobPlatform
      WHEN "source"::text = 'COMPANY_WEBSITE' THEN 'COMPANY_WEBSITE'::JobPlatform
      WHEN "source"::text = 'REFERRAL' THEN 'REFERRAL'::JobPlatform
      WHEN "source"::text = 'RECRUITER' THEN 'RECRUITER'::JobPlatform
      WHEN "source"::text = 'JOB_BOARD' THEN 'JOB_BOARD'::JobPlatform
      ELSE 'OTHER'::JobPlatform
    END
  );

DROP TYPE "JobPlatform_old";

-- Step 3: Add new columns to job_applications table
ALTER TABLE "job_applications" 
  ADD COLUMN IF NOT EXISTS "jobType" TEXT,
  ADD COLUMN IF NOT EXISTS "salary" TEXT,
  ADD COLUMN IF NOT EXISTS "requirements" TEXT,
  ADD COLUMN IF NOT EXISTS "externalJobId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalSource" TEXT,
  ADD COLUMN IF NOT EXISTS "externalData" JSONB,
  ADD COLUMN IF NOT EXISTS "contactName" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "interviewDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "interviewNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "offerAmount" TEXT,
  ADD COLUMN IF NOT EXISTS "offerDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isPasted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reminderDate" TIMESTAMP(3);

-- Step 4: Update job_search_preferences table
ALTER TABLE "job_search_preferences"
  ADD COLUMN IF NOT EXISTS "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "yearsExperience" INTEGER,
  ADD COLUMN IF NOT EXISTS "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "companySize" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "excludeCompanies" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "autoSearch" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notifyOnMatch" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "searchFrequency" TEXT NOT NULL DEFAULT 'daily';

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "job_applications_status_idx" ON "job_applications"("status");
CREATE INDEX IF NOT EXISTS "job_applications_userId_status_idx" ON "job_applications"("userId", "status");
CREATE INDEX IF NOT EXISTS "job_applications_isFavorite_idx" ON "job_applications"("isFavorite");
CREATE INDEX IF NOT EXISTS "job_applications_isPasted_idx" ON "job_applications"("isPasted");
CREATE INDEX IF NOT EXISTS "job_applications_source_idx" ON "job_applications"("source");
CREATE INDEX IF NOT EXISTS "job_applications_createdAt_idx" ON "job_applications"("createdAt" DESC);

-- Step 6: Add unique constraint for external jobs
CREATE UNIQUE INDEX IF NOT EXISTS "job_applications_userId_externalJobId_key" 
  ON "job_applications"("userId", "externalJobId") 
  WHERE "externalJobId" IS NOT NULL;

-- Done!
SELECT 'Migration completed successfully!' AS message;
