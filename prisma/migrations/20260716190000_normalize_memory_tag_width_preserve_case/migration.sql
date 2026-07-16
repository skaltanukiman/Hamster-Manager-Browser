WITH normalized_tags AS (
  SELECT
    "hamster_record_id",
    COALESCE(array_agg("tag" ORDER BY "first_position"), ARRAY[]::TEXT[]) AS "tags"
  FROM (
    SELECT
      detail."hamster_record_id",
      normalize(btrim(input."tag"), NFKC) AS "tag",
      min(input."position") AS "first_position"
    FROM "memory_record_details" AS detail
    CROSS JOIN LATERAL unnest(detail."tags") WITH ORDINALITY AS input("tag", "position")
    WHERE normalize(btrim(input."tag"), NFKC) <> ''
    GROUP BY detail."hamster_record_id", normalize(btrim(input."tag"), NFKC)
  ) AS deduplicated_tags
  GROUP BY "hamster_record_id"
)
UPDATE "memory_record_details" AS detail
SET "tags" = normalized_tags."tags"
FROM normalized_tags
WHERE detail."hamster_record_id" = normalized_tags."hamster_record_id";

UPDATE "saved_memory_tags"
SET
  "name" = normalize(btrim("name"), NFKC),
  "normalized_name" = normalize(btrim("name"), NFKC);
