ALTER TABLE "memory_record_details"
ADD COLUMN "search_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "memory_record_details" AS detail
SET "search_tags" = normalized."search_tags"
FROM (
  SELECT
    source."hamster_record_id",
    COALESCE(
      array_agg(DISTINCT lower(normalize(btrim(input."tag"), NFKC))),
      ARRAY[]::TEXT[]
    ) AS "search_tags"
  FROM "memory_record_details" AS source
  CROSS JOIN LATERAL unnest(source."tags") AS input("tag")
  WHERE normalize(btrim(input."tag"), NFKC) <> ''
  GROUP BY source."hamster_record_id"
) AS normalized
WHERE detail."hamster_record_id" = normalized."hamster_record_id";

CREATE INDEX "memory_record_details_search_tags_idx"
ON "memory_record_details" USING GIN ("search_tags");
