CREATE TYPE "HamsterRecordType" AS ENUM ('HEALTH', 'MEDICAL', 'MEMORY');
CREATE TYPE "HealthOverallCondition" AS ENUM ('GOOD', 'CONCERN', 'WARNING');
CREATE TYPE "HealthAmountCondition" AS ENUM ('NORMAL', 'LOW', 'NONE', 'UNKNOWN');
CREATE TYPE "HealthExcretionCondition" AS ENUM ('NORMAL', 'LOW', 'ABNORMAL', 'UNKNOWN');
CREATE TYPE "HealthSymptom" AS ENUM ('SNEEZING', 'RUNNY_NOSE', 'EYE_DISCHARGE', 'HAIR_LOSS', 'BLEEDING', 'LUMP', 'DIARRHEA', 'UNSTEADY', 'ABNORMAL_BREATHING', 'LOSS_OF_APPETITE', 'OTHER');

CREATE TABLE "hamster_records" (
  "id" TEXT NOT NULL,
  "hamster_id" TEXT NOT NULL,
  "record_type" "HamsterRecordType" NOT NULL,
  "record_date" DATE NOT NULL,
  "title" TEXT NOT NULL,
  "memo" TEXT,
  "search_text" TEXT NOT NULL,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hamster_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "health_record_details" (
  "hamster_record_id" TEXT NOT NULL,
  "overall_condition" "HealthOverallCondition" NOT NULL,
  "appetite" "HealthAmountCondition" NOT NULL,
  "activity_level" "HealthAmountCondition" NOT NULL,
  "stool_condition" "HealthExcretionCondition" NOT NULL,
  "urine_condition" "HealthExcretionCondition" NOT NULL,
  "symptoms" "HealthSymptom"[] NOT NULL DEFAULT ARRAY[]::"HealthSymptom"[],
  CONSTRAINT "health_record_details_pkey" PRIMARY KEY ("hamster_record_id")
);

CREATE TABLE "medical_visit_details" (
  "hamster_record_id" TEXT NOT NULL,
  "hospital_name" TEXT,
  "reason" TEXT NOT NULL,
  "diagnosis" TEXT,
  "examination" TEXT,
  "treatment" TEXT,
  "medication" TEXT,
  "medication_instructions" TEXT,
  "next_visit_date" DATE,
  "consultation_fee" DECIMAL(10,0),
  CONSTRAINT "medical_visit_details_pkey" PRIMARY KEY ("hamster_record_id")
);

CREATE TABLE "memory_record_details" (
  "hamster_record_id" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "is_favorite" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "memory_record_details_pkey" PRIMARY KEY ("hamster_record_id")
);

CREATE TABLE "memory_record_images" (
  "id" TEXT NOT NULL,
  "memory_record_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_record_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hamster_records_hamster_id_record_date_created_at_idx" ON "hamster_records"("hamster_id", "record_date", "created_at");
CREATE INDEX "hamster_records_hamster_id_record_type_record_date_idx" ON "hamster_records"("hamster_id", "record_type", "record_date");
CREATE INDEX "medical_visit_details_next_visit_date_idx" ON "medical_visit_details"("next_visit_date");
CREATE INDEX "memory_record_details_is_favorite_idx" ON "memory_record_details"("is_favorite");
CREATE UNIQUE INDEX "memory_record_images_memory_record_id_sort_order_key" ON "memory_record_images"("memory_record_id", "sort_order");

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "hamster_records_search_text_trgm_idx" ON "hamster_records" USING GIN ("search_text" gin_trgm_ops);

ALTER TABLE "hamster_records" ADD CONSTRAINT "hamster_records_hamster_id_fkey" FOREIGN KEY ("hamster_id") REFERENCES "hamsters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hamster_records" ADD CONSTRAINT "hamster_records_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "health_record_details" ADD CONSTRAINT "health_record_details_hamster_record_id_fkey" FOREIGN KEY ("hamster_record_id") REFERENCES "hamster_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medical_visit_details" ADD CONSTRAINT "medical_visit_details_hamster_record_id_fkey" FOREIGN KEY ("hamster_record_id") REFERENCES "hamster_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memory_record_details" ADD CONSTRAINT "memory_record_details_hamster_record_id_fkey" FOREIGN KEY ("hamster_record_id") REFERENCES "hamster_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memory_record_images" ADD CONSTRAINT "memory_record_images_memory_record_id_fkey" FOREIGN KEY ("memory_record_id") REFERENCES "memory_record_details"("hamster_record_id") ON DELETE CASCADE ON UPDATE CASCADE;
