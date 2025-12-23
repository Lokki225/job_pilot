-- Add username and displayName fields to profiles table for mention system
ALTER TABLE "profiles" ADD COLUMN "username" TEXT UNIQUE;
ALTER TABLE "profiles" ADD COLUMN "displayName" TEXT;

-- Create index on username for faster mention lookups
CREATE INDEX "profiles_username_idx" ON "profiles"("username");

-- Populate displayName with existing firstName + lastName for existing users
UPDATE "profiles" 
SET "displayName" = CONCAT(COALESCE("firstName", ''), ' ', COALESCE("lastName", ''))
WHERE "displayName" IS NULL;

-- Populate username with a slugified version of displayName (lowercase, replace spaces with dots)
UPDATE "profiles"
SET "username" = LOWER(REPLACE(COALESCE("displayName", CONCAT(COALESCE("firstName", 'user'), ' ', COALESCE("lastName", ''))), ' ', '.'))
WHERE "username" IS NULL;
