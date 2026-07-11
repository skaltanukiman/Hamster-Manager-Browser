WITH personal_households AS (
  SELECT
    h.id,
    hm."user_id",
    h.name,
    h."created_at",
    COUNT(ha.id) AS hamster_count
  FROM "households" h
  JOIN "household_members" hm
    ON hm."household_id" = h.id
    AND hm.role = 'OWNER'
  JOIN "users" u
    ON u.id = hm."user_id"
  LEFT JOIN "hamsters" ha
    ON ha."household_id" = h.id
  WHERE h.name = CONCAT(COALESCE(NULLIF(u.name, ''), NULLIF(u.email, ''), 'あなた'), 'のハムスター管理')
    AND NOT EXISTS (
      SELECT 1
      FROM "household_members" other_member
      WHERE other_member."household_id" = h.id
        AND other_member."user_id" <> hm."user_id"
    )
  GROUP BY h.id, hm."user_id", h.name, h."created_at"
),
ranked_households AS (
  SELECT
    id,
    hamster_count,
    ROW_NUMBER() OVER (
      PARTITION BY "user_id", name
      ORDER BY hamster_count DESC, "created_at" ASC, id ASC
    ) AS keep_rank,
    COUNT(*) OVER (PARTITION BY "user_id", name) AS duplicate_count
  FROM personal_households
)
DELETE FROM "households"
WHERE id IN (
  SELECT id
  FROM ranked_households
  WHERE duplicate_count > 1
    AND keep_rank > 1
    AND hamster_count = 0
);
