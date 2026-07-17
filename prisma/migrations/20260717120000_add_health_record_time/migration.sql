ALTER TABLE "hamster_records"
ADD COLUMN "record_time_minutes" SMALLINT;

ALTER TABLE "hamster_records"
ADD CONSTRAINT "hamster_records_record_time_minutes_check"
CHECK ("record_time_minutes" IS NULL OR "record_time_minutes" BETWEEN 0 AND 1439);

DROP INDEX "hamster_records_hamster_id_record_date_created_at_idx";

CREATE INDEX "hamster_records_hamster_id_record_date_record_time_minutes_created_at_idx"
ON "hamster_records"("hamster_id", "record_date", "record_time_minutes", "created_at");
