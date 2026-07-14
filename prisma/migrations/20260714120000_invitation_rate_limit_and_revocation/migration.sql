ALTER TABLE "household_invitations"
ADD COLUMN "created_by_user_id" TEXT,
ADD COLUMN "revoked_at" TIMESTAMP(3);

CREATE INDEX "household_invitations_created_by_user_id_created_at_idx"
ON "household_invitations"("created_by_user_id", "created_at");

DROP INDEX "household_invitations_household_id_idx";

CREATE INDEX "household_invitations_household_id_created_at_idx"
ON "household_invitations"("household_id", "created_at");

ALTER TABLE "household_invitations"
ADD CONSTRAINT "household_invitations_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
