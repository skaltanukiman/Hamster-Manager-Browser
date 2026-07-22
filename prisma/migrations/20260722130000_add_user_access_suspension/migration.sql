CREATE TYPE "UserAccessStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "UserAccessActionType" AS ENUM ('SUSPENDED', 'RESTORED');

ALTER TABLE "users"
  ADD COLUMN "access_status" "UserAccessStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "suspended_at" TIMESTAMP(3),
  ADD COLUMN "suspended_by_user_id" TEXT,
  ADD COLUMN "suspension_reason" VARCHAR(500);

CREATE TABLE "user_access_actions" (
  "id" TEXT NOT NULL,
  "action_type" "UserAccessActionType" NOT NULL,
  "actor_user_id" TEXT,
  "actor_user_id_snapshot" TEXT NOT NULL,
  "actor_name_snapshot" TEXT NOT NULL,
  "target_user_id" TEXT,
  "target_user_id_snapshot" TEXT NOT NULL,
  "target_name_snapshot" TEXT NOT NULL,
  "reason" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_access_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "users_access_status_idx" ON "users"("access_status");
CREATE INDEX "users_suspended_by_user_id_idx" ON "users"("suspended_by_user_id");
CREATE INDEX "user_access_actions_target_user_id_created_at_idx" ON "user_access_actions"("target_user_id", "created_at");
CREATE INDEX "user_access_actions_actor_user_id_created_at_idx" ON "user_access_actions"("actor_user_id", "created_at");
CREATE INDEX "user_access_actions_created_at_idx" ON "user_access_actions"("created_at");

ALTER TABLE "users"
  ADD CONSTRAINT "users_suspended_by_user_id_fkey"
  FOREIGN KEY ("suspended_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_access_actions"
  ADD CONSTRAINT "user_access_actions_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_access_actions"
  ADD CONSTRAINT "user_access_actions_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
