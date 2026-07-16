CREATE TABLE "saved_memory_tags" (
  "id" TEXT NOT NULL,
  "household_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_memory_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_memory_tags_household_id_normalized_name_key" ON "saved_memory_tags"("household_id", "normalized_name");
CREATE INDEX "saved_memory_tags_household_id_created_at_idx" ON "saved_memory_tags"("household_id", "created_at");
CREATE INDEX "saved_memory_tags_created_by_user_id_idx" ON "saved_memory_tags"("created_by_user_id");

ALTER TABLE "saved_memory_tags" ADD CONSTRAINT "saved_memory_tags_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_memory_tags" ADD CONSTRAINT "saved_memory_tags_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
