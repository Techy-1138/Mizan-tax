-- AlterTable: Add global entity ownership & normalized license uniqueness fields on businesses
ALTER TABLE "businesses"
ADD COLUMN IF NOT EXISTS "normalizedTradeLicenseNumber" TEXT,
ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT;

-- Backfill ownerEmail from the earliest ADMIN/member User linked to the business's Organisation
UPDATE "businesses" AS b
SET "ownerEmail" = LOWER(TRIM(u."email"))
FROM "memberships" AS m
JOIN "users" AS u ON u."id" = m."userId"
WHERE b."ownerEmail" IS NULL
  AND m."organisationId" = b."organisationId";

-- Safely backfill normalizedTradeLicenseNumber (alphanumeric uppercase) for the earliest business per canonical license
WITH ranked_businesses AS (
  SELECT
    "id",
    UPPER(REGEXP_REPLACE(TRIM("tradeLicenseNumber"), '[^A-Za-z0-9]', '', 'g')) AS canonical_license,
    ROW_NUMBER() OVER (
      PARTITION BY UPPER(REGEXP_REPLACE(TRIM("tradeLicenseNumber"), '[^A-Za-z0-9]', '', 'g'))
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "businesses"
  WHERE "tradeLicenseNumber" IS NOT NULL
)
UPDATE "businesses" AS b
SET "normalizedTradeLicenseNumber" = r.canonical_license
FROM ranked_businesses AS r
WHERE b."id" = r."id"
  AND r.rn = 1
  AND r.canonical_license <> ''
  AND b."normalizedTradeLicenseNumber" IS NULL;

-- CreateIndex: Global unique constraint on canonical trade license number across all organisations
CREATE UNIQUE INDEX IF NOT EXISTS "businesses_normalizedTradeLicenseNumber_key"
ON "businesses"("normalizedTradeLicenseNumber");

-- CreateIndex: Supporting index on ownerEmail
CREATE INDEX IF NOT EXISTS "businesses_ownerEmail_idx"
ON "businesses"("ownerEmail");
