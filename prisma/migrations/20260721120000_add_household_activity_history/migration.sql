CREATE TYPE "HouseholdActivityCategory" AS ENUM ('CARE_RECORD', 'MEMBER', 'GROUP_SETTING');

CREATE TYPE "HouseholdActivityEvent" AS ENUM (
  'HOUSEHOLD_NAME_UPDATED', 'INVITATION_CREATED', 'INVITATION_REVOKED', 'MEMBER_JOINED',
  'MEMBER_ROLE_UPDATED', 'MEMBER_REMOVED', 'MEMBER_LEFT', 'OWNERSHIP_TRANSFERRED_AND_LEFT',
  'HAMSTER_CREATED', 'HAMSTER_DELETED', 'WEIGHT_CREATED', 'WEIGHT_UPDATED', 'WEIGHT_DELETED',
  'WEIGHTS_BULK_DELETED', 'WEIGHT_CSV_APP_IMPORTED', 'WEIGHT_CSV_GAS_IMPORTED', 'CLEANING_MONTH_SAVED'
);

CREATE TABLE "household_activities" (
  "id" TEXT NOT NULL,
  "household_id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "actor_name_snapshot" TEXT NOT NULL,
  "event_type" "HouseholdActivityEvent" NOT NULL,
  "category" "HouseholdActivityCategory" NOT NULL,
  "target_type" TEXT,
  "target_id" TEXT,
  "target_name_snapshot" TEXT,
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "household_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "household_activities_household_id_created_at_id_idx" ON "household_activities"("household_id", "created_at", "id");
CREATE INDEX "household_activities_household_id_category_created_at_id_idx" ON "household_activities"("household_id", "category", "created_at", "id");
CREATE INDEX "household_activities_actor_user_id_idx" ON "household_activities"("actor_user_id");

ALTER TABLE "household_activities" ADD CONSTRAINT "household_activities_household_id_fkey"
  FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "household_activities" ADD CONSTRAINT "household_activities_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
