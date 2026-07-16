-- 通常キーワード検索からタグを分離する。
-- 既存の思い出記録は、タイトルと内容だけで検索用テキストを再構築する。
UPDATE "hamster_records"
SET "search_text" = lower(
  "title" || CASE
    WHEN "memo" IS NOT NULL AND "memo" <> '' THEN E'\n' || "memo"
    ELSE ''
  END
)
WHERE "record_type" = 'MEMORY';
