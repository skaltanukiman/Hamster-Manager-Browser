# 機能マップ

最終確認: 2026-07-18。Next.js App Router / Prisma / PostgreSQL 構成において、画面から Server Action・Route Handler・データアクセスまでを辿るための索引です。原則として、Household に属するデータは `getRequiredHouseholdContext()` で現在の所属を確定し、共有データ更新Actionは `getRequiredHouseholdMutationContext()` でVIEWERをDB処理前に拒否します。Action / API 側でも対象の所属・管理状態を確認します。

## 共通の起点

| 項目 | 主なファイル | 注意点 |
| --- | --- | --- |
| 認証ガード・ログイン遷移 | `src/proxy.ts`, `src/auth.ts`, `src/app/login/page.tsx`, `src/app/api/auth/[...nextauth]/route.ts` | `/login`、`/api/auth`、`/api/health`以外は認証必須。Auth.js は DB セッションを使用し、認証・認可ポリシーは `tests/authorization.test.ts` で検証する。 |
| 現在の Household と権限 | `src/lib/authorization.ts`, `src/lib/auth-context.ts`, `src/app/actions/households.ts`, `src/components/household-switcher.tsx` | `OWNER` / `ADMIN` / `MEMBER` / `VIEWER` の閲覧・共有データ編集・招待・解除・権限変更を共通判定する。`hamster_current_household` Cookie は所属確認後にのみ更新する。 |
| レイアウト・ナビゲーション | `src/app/layout.tsx`, `src/components/app-nav.tsx`, `src/app/globals.css` | ログイン済み画面には Household 切替とリアルタイム監視が常設される。1024px 未満では主要5画面をアイコンなしの均等幅タブで表示し、設定・共有・管理は補助メニューにまとめる。`lg` 以上では従来のボタン型ナビゲーションを1行で表示する。 |
| 日付・検索・フォーム状態 | `src/lib/date.ts`, `src/lib/search.ts`, `src/components/form-dirty-state.ts`, `src/components/unsaved-changes-guard.tsx`, `src/components/dirty-submit-button.tsx` | 測定日・掃除日などの日付のみの値は暦日を維持し、`createdAt`・`expiresAt`など時刻を持つUTC timestampは画面表示時にJSTへ変換する。形式だけでなく実在する暦日・年月とJST日付境界を `tests/date-validation.test.ts` で検証する。未保存ガードと保存ボタン活性は一覧・掃除・体重で共有する。 |
| エラー・ログ | `src/lib/server-errors.ts`, `src/lib/logger.ts`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/components/status-message.tsx`, `src/components/unexpected-error-panel.tsx` | 利用者には内部例外を出さず errorId を表示する。`tests/error-handling.test.ts`、`tests/logger.test.ts` を併せて更新する。 |

## ログイン・認証

- **画面または URL:** `/login`、`/api/auth/[...nextauth]`。
- **主なコンポーネント:** `src/app/login/page.tsx`（Google ログインフォーム）、`src/app/layout.tsx`（ログアウト）。
- **Server Action または API:** `signIn` / `signOut`（`src/auth.ts`。ログアウト Action は `layout.tsx` 内）。Auth.js Handler は `src/app/api/auth/[...nextauth]/route.ts`。
- **データアクセス・Prismaモデル:** `PrismaAdapter(prisma)` が `User`、`Account`、`Session`、`VerificationToken` を利用。セッション callback が `User.appRole` を拡張セッションへ載せる。
- **バリデーション:** OAuth プロバイダー設定と Auth.js が担当。画面アクセス制御は `src/proxy.ts`。
- **関連テスト:** `tests/authorization.test.ts`（セッションユーザーID必須、アプリロール判定）、`tests/logger.test.ts`（例外処理）。
- **関連設定:** `.env*.example` の `AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`AUTH_URL`、`src/types/next-auth.d.ts`。
- **依存関係:** ログイン後の全データ機能は `auth-context.ts` の初期 Household 作成に依存する。`proxy.ts` の matcher / 公開パス変更は OAuth コールバックを遮断しないよう注意する。

## Household 共有・メンバー管理

- **画面または URL:** ヘッダーの操作対象切替、`/settings/members`、自己退出確認 `/settings/members/leave`、`/invitations/accept#token=...`。
- **主なコンポーネント:** `HouseholdSwitcher`、`HouseholdInvitationForm`、`HouseholdInvitationList`、`InvitationRevokeForm`、`InvitationAcceptForm`、`MemberRoleForm`、`MemberRemoveForm`、`HouseholdLeaveForm`、`StatusMessage`。
- **Server Action または API:** `switchCurrentHousehold`（`actions/households.ts`）、`createHouseholdInvitation`、`revokeHouseholdInvitation`、`acceptHouseholdInvitation`、`removeHouseholdMember`、`updateHouseholdMemberRole`、`leaveCurrentHousehold`（`actions/members.ts`）。
- **データアクセス・Prismaモデル:** `getRequiredHouseholdContext` / `getCurrentHouseholdSwitcherData`、`Household`、`HouseholdMember`、`HouseholdInvitation`、参加時の `AppSetting`。
- **バリデーション:** `idSchema`、招待 token の SHA-256、作成間隔30秒・ユーザー単位で過去1時間5件、Household単位で有効な招待リンク10件（`src/lib/invitations.ts`、`src/lib/invitation-mutations.ts`）。ユーザー単位レート制限はHousehold横断で、ユーザー単位のPostgreSQL advisory transaction lockにより同時作成を直列化する。有効件数上限はHousehold単位の別のadvisory transaction lockで直列化する。OWNER / ADMIN / MEMBER / VIEWER を `src/lib/authorization.ts` と Action 内トランザクションで再確認する。招待参加時の初期ロールはMEMBERのまま。
- **関連テスト:** `tests/invitations.test.ts`（tokenをクエリではなくフラグメントへ格納し、不正tokenと無効化済みtokenを拒否する）、`tests/invitation-management.test.ts`（30秒・1時間・別ユーザー・別Household・同時実行・無効化・権限）、`tests/invitation-cleanup.test.ts`（使用済み90日・未使用期限切れ30日の削除条件）、`tests/authorization.test.ts`（招待・削除・権限変更・自己退出ポリシー）、`tests/household-leave.test.ts`（退出・所有権移譲・設定削除・共有データ保持・競合・Cookie切替・UI）、`tests/audit-log.test.ts`（成功監査ログ）。
- **関連設定:** `src/lib/auth-context.ts` の Cookie 名・個人用 Household 名、`src/lib/invitations.ts` の有効期限、`src/lib/invitation-cleanup.ts`、`scripts/cleanup-invitations.ts`、`npm run invitations:cleanup`。
- **依存関係:** 招待の平文 token は管理画面URLへ載せず、作成直後のAction stateと受諾画面のメモリ内でのみ扱い、DBにはhashのみ保存する。共有URLはHTTPへ送信されないフラグメントを使い、未ログイン時はOAuth往復中だけ同一タブの `sessionStorage` に保持する。読み込み直後にアドレスバーから、ログイン後にstorageから削除する。共有画面はメンバー一覧の下に有効な招待だけの作成日時・期限・状態・作成者を表示し、有効な招待が0件なら一覧自体を表示しない。未使用かつ期限内だけOWNER / ADMINが無効化できる。受諾は未使用・未無効化・期限内を同一更新条件で確定する。使用済みは90日、未使用（無効化済みを含む）の期限切れは元の期限から30日保持してVPS cronから整理し、有効な招待は削除しない。自己退出は `src/lib/household-leave.ts` がHousehold単位のadvisory transaction lock内で最新ロール・OWNER数・メンバー数・移譲先所属を再確認し、唯一OWNERなら移譲先を先にOWNERへ更新してから本人の `AppSetting` とmembershipを削除する。共有データは削除せず、退出後は `auth-context.ts` の既存選択順序と初期Household作成を再利用してCookieを更新する。メンバーの削除・権限変更は最後の OWNER、自分自身、操作権限の制約と、現在選択 Cookie の整合性に注意する。

## ダッシュボード

- **画面または URL:** `/`。
- **主なコンポーネント:** `DashboardMemo`、`CleaningDateToggle`、`HamsterThumbnail`、`EmptyState`。画像登録済みの `HamsterThumbnail` はクリック・タップで拡大モーダルを表示し、未登録・読込失敗時は操作不可のプレースホルダーになる。
- **Server Action または API:** 直接の更新 Action はなし。設定更新は `saveSettings`。
- **データアクセス・Prismaモデル:** `getDashboardData`（`src/lib/queries.ts`）が `Hamster`、`AppSetting` / `DashboardHamster`、最新 `WeightRecord`、各種 `CleaningRecord` を Household とユーザー設定で取得。
- **バリデーション:** 表示件数・対象選択は設定の `dashboardSettingsSchema` と `dashboard-settings.ts`。
- **関連テスト:** `tests/settings.test.ts`（表示名・表示件数・選択方式・表示対象順序の差分判定）。
- **関連設定:** `src/lib/dashboard-settings.ts`（1〜30件、選択 UI の既定値）。
- **依存関係:** 表示対象はユーザー・Household ごとの設定。掃除種別を増減する場合は `getDashboardData` とカード表示を同時に変更する。

## ハムスター一覧・登録・編集・削除

- **画面または URL:** `/hamsters`。
- **主なコンポーネント:** `HamsterList`、`HamsterImageField`、`HamsterThumbnail`、`SelectionActionBar`、`DirtySubmitButton`、`UnsavedChangesGuard`、`StatusMessage`。
- **Server Action または API:** `createHamster`、`updateHamster`、`updateHamsterActiveStatus`、`deleteHamster`、`deleteHamsters`（`src/app/actions/hamsters.ts`）、認証付き画像配信 `/api/hamsters/[id]/image`。
- **データアクセス・Prismaモデル:** `getHamsterManagementData`、`Hamster`。削除は関連 `CleaningRecord` / `WeightRecord` / `DashboardHamster` / `HamsterRecord` と種類別詳細が schema の Cascade により連動し、思い出画像ファイルはActionが削除後に整理する。
- **バリデーション:** `createHamsterSchema`、`updateHamsterSchema`、削除・状態変更 schema（`src/lib/schemas.ts`）。日付は未来日不可。DB の `@@unique([householdId, name])` も重複防止となる。
- **関連テスト:** 画像変換・保存・削除・Household分離・プレースホルダーは `tests/hamster-image.test.tsx`。Household所属判定は `tests/authorization.test.ts`、想定外 / 一意制約エラーの共通処理は `tests/error-handling.test.ts`。
- **関連設定:** `src/lib/search.ts`（名前検索の正規化）、`src/lib/hamster-image.ts`、`HAMSTER_IMAGE_DIR`、`prisma/schema.prisma`、`docker-compose.yml`。
- **依存関係:** 全更新はVIEWER共通拒否後に realtime mutation を通す。VIEWER画面は登録フォーム、削除選択、状態変更、画像変更、保存操作を描画せず、プロフィール入力を読み取り専用にする。`isActive=false` は体重・掃除・プロフィール画像の選択と削除の編集ロック条件だが、登録済み画像の拡大表示は利用できる。
- **レスポンシブ表示:** 新規登録・編集フォームはスマートフォンで画像選択欄を登録・保存ボタンの直前に置き、送信ボタンをカード幅に広げる。`lg` 以上では既存プロフィール項目と送信ボタンを同じ横列、画像欄を次の行に表示し、管理状態変更ボタンはカード上部の状態バッジ横へ置く。スマートフォンの管理状態変更ボタンはカード下部に維持する。

## 健康・通院・思い出記録

- **画面または URL:** `/records`、認証付き思い出画像 `/api/records/[id]/image`。
- **健康記録の任意時刻:** `RecordTimeInput` が「時間も記録する」選択時だけ `recordTime` を入力・編集し、`src/lib/record-time.ts` が `HH:mm` と0〜1439分を相互変換する。登録・編集Actionは保存時点のサーバー側JST現在時刻と比較し、当日の未来時刻を拒否する。`HamsterRecord.recordTimeMinutes` は健康記録だけが使用する任意の `SmallInt` で、migration `20260717120000_add_health_record_time` が範囲制約と並び順用索引を追加する。カードは日付、任意時刻、登録者の順に表示し、同日内は時刻ありの降順、時刻なし、作成日時、IDの順で取得する。
- **主なコンポーネント:** `RecordCreateForms`、`MemoryTagInput`、`RecordTimeline`、`RecordImageField`、`RecordKeywordInput`、`HamsterSelectorInput`、`AutoSubmitFilterForm`、`FilterClearButton`、`DirtySubmitButton`、`UnsavedChangesGuard`、`StatusMessage`。登録フォームは健康・通院・思い出で分け、閲覧は同じカード型タイムラインへ統合する。`RecordTimeline` はカード本体を白に統一して本文・写真・編集フォームの可読性を保ち、健康・体調をグリーン、通院をブルー、思い出をローズ系の左アクセント・丸アイコン・淡い種類バッジで区別する。文字ラベルとアイコンも併用し、色だけには依存しない。作成フォームはServer Actionをクライアントイベントから呼び、エラーをフォーム内へ表示して画面位置・文字・選択・チェック・画像選択を保持する。`RecordImageField` は元画像10MB上限とMIME形式を送信前に検証し、保存時に2MB以下へ自動圧縮することを案内する。`MemoryTagInput` は「、」またはカンマ区切りのタグ入力、Householdの保存済みタグと初期候補のボタン入力、思い出保存時のタグ同時保存チェックに対応する。保存済みタグは1件以上ある場合だけ件数付きの折りたたみを表示し、展開後の削除ボタンからモーダルを開いて複数候補を一括削除できる。初期候補も1件以上ある場合だけ見出しと候補一覧を表示する。削除後は入力内容とスクロール位置を保ったまま候補を更新する。対象ハムスターは常に選択済みとして空選択を表示しない。フィルターは選択・日付・チェックを即時、文字入力を短いデバウンス後に自動適用し、クリア時は入力値を初期化して再取得する。キーワードは平仮名・カタカナ等の正規化、`#` 入力時の選択中ハムスターの使用済みタグ候補に対応する。カンマ区切りではキーワード同士・タグ同士をOR、キーワード群とタグ群をANDで検索する。いずれもスクロール位置を維持する。
- **Server Action または API:** `createHealthRecord`、`updateHealthRecord`、`createMedicalRecord`、`updateMedicalRecord`、`createMemoryRecord`、`updateMemoryRecord`、`deleteHamsterRecord`、`deleteSavedMemoryTags`（`src/app/actions/records.ts`）。作成Actionは期待される入力・画像エラーと安全なエラーIDを返し、画面遷移せず結果をフォームへ返す。`createMemoryRecord` はチェック時だけ入力タグを個別行へ変換し、思い出記録・Household revisionと同一トランザクションで重複を無視して保存する。`deleteSavedMemoryTags` は更新権限とHousehold所属をサーバー側で確認し、選択された保存候補だけを一括削除する。画像Routeは認証後、記録に紐づくハムスターの現在のHousehold所属を確認してWebPだけを配信する。
- **データアクセス・Prismaモデル:** `getRecordsPageData`（`src/lib/record-queries.ts`）が対象ハムスター、種類、暦日期間、検索用テキスト、お気に入りをDB側で絞り込み、記録日、任意時刻（時刻なしは後）、作成日時、IDの降順で20件ページングする。通常キーワードはタグを含まない `HamsterRecord.searchText` のかな表記候補、`#タグ` は小文字・NFKC正規化した `MemoryRecordDetail.searchTags` を検索し、大文字小文字・全角半角・かな表記差を吸収する。表示用の `MemoryRecordDetail.tags` は大文字小文字を保持する。複数キーワード内・複数タグ内はOR、キーワード群とタグ群はANDで結合する。思い出の `searchText` はタイトルと内容だけで生成する。検索用タグ候補は選択中ハムスターの既存記録から、入力再利用用タグはHousehold所属の `SavedMemoryTag` から取得する。保存候補の一括削除はServer Actionで現在のHouseholdへ絞った `deleteMany` とrevision更新を同一トランザクションにし、既存の `MemoryRecordDetail.tags` は変更しない。`HamsterRecord` を親に、`HealthRecordDetail`、`MedicalVisitDetail`、`MemoryRecordDetail` を1対1、`MemoryRecordImage` を画像用の子として持つ。`SavedMemoryTag` はHouseholdと全角英数字等を半角化した名前の複合一意制約を持ち、大文字小文字は区別する。症状はenum配列、タグは自由文字列配列、検索専用タグはGIN索引、横断キーワードは親の `searchText` と `pg_trgm` GIN索引を利用する。
- **バリデーション:** `src/lib/record-schemas.ts`。健康の各enum・複数症状、通院理由、0円以上の整数診察費、思い出のタイトル・内容・最大20タグ・タグ保存チェック、保存候補削除の1件以上選択とタグ文字数、全項目の文字数上限を検証する。タグは `src/lib/tags.ts` でNFKC正規化し、全角英数字・記号等を半角へ揃えながら英字の大文字小文字を保持する。記録日は `src/lib/date.ts` の暦日変換を再利用して未来日を拒否し、次回通院予定日だけ未来日を許可する。画像は共有の `src/lib/image-constraints.ts` と `src/lib/image-processing.ts` をクライアント事前検証とサーバー検証で再利用する。元画像は10MB以内に制限し、サーバーでMIME/実体・4,000万画素上限を検証する。プロフィール画像は512px正方形、思い出画像は縦横比を維持して長辺1920px以内・拡大なしとし、WebP品質と解像度を段階調整して必ず2MB以下にしてからUUID名で原子的に保存する。
- **関連テスト:** `tests/records.test.ts`（種類別入力、診察費、enum、タグ、検索対象、Household絞り込み、ページング、データモデル、画像変換/分離/後片付け、realtime構造）、`tests/authorization.test.ts`（全記録ActionのVIEWER共通拒否）。
- **関連設定:** `RECORD_IMAGE_DIR`（Dockerは `/app/uploads/records`）、`docker-compose.yml` の `./uploads:/app/uploads`、migration `20260715120000_add_hamster_records` / `20260716130000_separate_record_keyword_and_tag_search` / `20260716160000_add_saved_memory_tags` / `20260716190000_normalize_memory_tag_width_preserve_case` / `20260716210000_add_memory_record_search_tags`、`package.json` のテスト列挙。
- **依存関係:** OWNER / ADMIN / MEMBERは更新可能、VIEWERは閲覧・検索・絞り込み・ページ移動だけでActionも拒否する。全取得・更新は対象ハムスターが現在のHousehold所属であることをDB条件に含める。管理外ハムスターの健康・通院は閲覧のみ、思い出は登録・編集・削除可能。全更新は `source: "record"` の realtime mutation を通し、業務データとrevisionを同一トランザクションで確定する。画像差し替え・記録削除・ハムスター削除後は旧ファイルを削除し、失敗は警告ログへ残す。初回は1記録1枚だが画像別テーブルと表示順で複数枚へ拡張できる。

## 体重履歴

- **画面または URL:** `/weights`。
- **主なコンポーネント:** `WeightHistoryList`、`WeightChart`、`HamsterSelectorInput`、`AutoSubmitInput` / `AutoSubmitSelect`、`SelectionActionBar`。
- **Server Action または API:** `createWeightRecord`、`updateWeightRecord`、`deleteWeightRecord`、`deleteWeightRecords`（`src/app/actions/weights.ts`）。
- **データアクセス・Prismaモデル:** `getWeightPageData`（DB 側の履歴フィルター・ソート・ページングとグラフ専用期間フィルター）、`Hamster`、`WeightRecord`、`AppSetting`。
- **バリデーション:** `createWeightRecordSchema`、`updateWeightRecordSchema`、削除 schema、`MAX_WEIGHT_G`（1〜500g、0.1g、未来日不可）。`@@unique([hamsterId, recordDate])` が日次重複を保証する。
- **関連テスト:** `tests/weight-validation.test.ts`（通常登録・編集・CSVの0.1g単位検証）、`tests/csv-and-realtime.test.ts`（CSVの体重上限・未来日検証）、`tests/authorization.test.ts`（Household所属判定）。
- **関連設定:** `src/lib/weight-rules.ts`、`src/lib/date.ts`、`src/lib/dashboard-settings.ts`（選択 UI）。
- **依存関係:** 管理外ハムスターとVIEWERは作成・編集・削除不可。VIEWERは検索・フィルター・並び替え・ページ移動・グラフ・CSVエクスポートを利用できる。履歴一覧は 20 件ページング。「全件」表示では開始日と終了日が揃うとグラフだけを自動で絞り込み、クリア操作で全期間へ戻す。「月ごと」表示では従来どおり履歴の対象月とグラフを連動させる。

## 体重 CSV エクスポート

- **画面または URL:** `/weights/export`、ダウンロード API `/export/weights`、旧 `/export` はリダイレクト。
- **主なコンポーネント:** `WeightCsvExportForm`、`HamsterSelectorInput`、`StatusMessage`。画面全体は Server Component のまま、列選択とダウンロード可否だけを小さな Client Component で管理する。
- **Server Action または API:** `src/app/export/weights/route.ts` の GET（CSV Response）。
- **データアクセス・Prismaモデル:** `getHamsterOptions`、`getHamsterSelectorMode`、Route 内の `WeightRecord.findMany` と `Hamster` 所属条件。
- **バリデーション:** URL の `hamsterId` / `month` を Route 内で解析し、`src/lib/weight-csv-export.ts` で選択列の許可・1列以上・重複なし、UTC / JST、連携用必須列の出力有無を検証する。対象 Household の所属を `getRequiredHouseholdContext` で確定し、既定では `app_id` / `record_type` / `schema_version` / `record_id` を出力するが、閲覧用では4列をまとめて除外できる。
- **関連テスト:** `tests/weight-csv-export.test.ts`（連携用必須列の一括切り替え、列選択・順序、UTC / JST、測定日維持、CSVエスケープ、不正指定）。
- **関連設定:** `src/lib/weight-csv-export.ts`（固定識別値、列定義、日時変換、行生成）、`src/lib/csv.ts`（CSVエスケープ）、`src/lib/date.ts`（測定日の整形）。
- **依存関係:** エクスポート API だけを公開 URL にしない。画面と Route Handler の双方で Household スコープを維持する。

## 体重 CSV インポート

- **画面または URL:** `/weights/import`（種類選択）、`/weights/import/app`（アプリ版一括編集）、`/weights/import/gas`（旧版移行）。
- **主なコンポーネント:** `WeightCsvImportForm`。
- **Server Action または API:** `importAppWeightRecordsCsv`、`importGasWeightRecordsCsv`（`actions/weights.ts`、`useActionState` で実行）。
- **データアクセス・Prismaモデル:** アプリ版は `record_id` のHousehold所属と変更先重複を検証して `WeightRecord.update` / `createMany`。GAS版は名前照合と既存重複確認後に `createMany`。いずれもデータ変更と Household revision 更新は同一トランザクション。
- **バリデーション:** `parseAppWeightCsvImport`（`src/lib/weight-csv-app-import.ts`）、`parseWeightCsvImport`（`src/lib/weight-csv-import.ts`）、`weight-rules.ts`（2MB・10,000行・500g上限・0.1g単位）。アプリ版は出力元識別・スキーマバージョン・ID所属・CSV内/変更先重複を検証し、エラー時は全件未反映。両方とも管理外・未登録の名前を拒否。
- **関連テスト:** `tests/csv-and-realtime.test.ts`。
- **関連設定:** `next.config.mjs` の Server Action body size（3MB）はファイル上限以上を受け取れる必要がある。
- **依存関係:** 通常の体重登録と同じ制約を保ち、両インポートActionはVIEWERをファイル読込前に拒否する。VIEWER画面にはインポートフォームを描画しない。GAS `id` は DB ID に流用せず、アプリ版 `record_id` と区別する。

## 掃除記録

- **画面または URL:** `/cleaning`。
- **主なコンポーネント:** `CleaningMobileForm`、`CleaningMobileDayFilter`、`HamsterSelectorInput`、`DirtySubmitButton`、`MobileDirtySaveArea`、`UnsavedChangesGuard`。
- **Server Action または API:** `saveCleaningMonth`（`src/app/actions/cleaning.ts`）。
- **データアクセス・Prismaモデル:** `getCleaningPageData`、`Hamster`、`CleaningRecord`、`AppSetting`。月内の既存行との差分から create / update / delete を行う。
- **バリデーション:** `cleaningMonthSchema`、`yearMonthSchema`、日付・未来日チェック（`src/lib/date.ts`）。
- **関連テスト:** `tests/authorization.test.ts`（Household所属判定）。
- **関連設定:** `src/lib/dashboard-settings.ts`（Hamster 選択形式）、`src/app/globals.css`（PC表 / モバイルカードの表示）。
- **依存関係:** 記録が全て空なら行を削除する。VIEWERは表・モバイルカードとも入力と保存を無効化し、ActionでもDB処理前に拒否する。掃除種別・メモのフィールドを変える場合、schema、Action 差分判定、`getCleaningPageData`、ダッシュボード最新掃除表示、Prisma migration をまとめて変更する。

## 設定（プロフィール・ダッシュボード）

- **画面または URL:** `/settings`。
- **主なコンポーネント:** `ProfileSettingsFields`、`DashboardSettingsForm`、`DirtySubmitButton`、`UnsavedChangesGuard`、`HamsterCombobox`、`MobileDirtySaveArea`。プロフィールとダッシュボード設定は1フォーム・1保存ボタンで扱う。
- **Server Action または API:** `saveSettings`（`src/app/actions/settings.ts`）。表示名とダッシュボード設定をまとめて差分比較し、変更がなければ `unchanged` を返す。
- **データアクセス・Prismaモデル:** `getDashboardSettingsPageData`、`User`、`Household`、`HouseholdMember`、`AppSetting`、`DashboardHamster`、`Hamster`。
- **バリデーション:** `updateUserProfileSchema`（表示名）、`dashboardSettingsSchema`、`normalizeDashboardBoardCount` / `normalizeHamsterSelectorMode`。
- **関連テスト:** `tests/settings.test.ts`（表示名・表示件数・選択方式・表示対象順序の差分判定）。
- **関連設定:** `src/lib/dashboard-settings.ts`、`src/lib/search.ts`。
- **依存関係:** 表示名とユーザー・Household別ダッシュボード設定は個人設定のためVIEWERにも更新を許可する。表示名変更時は自動生成された個人用 Household 名も更新する。ダッシュボード対象に変更がある場合だけ全 `DashboardHamster` を削除して作り直すため、順序と上限を Action と UI で一致させる。未保存変更がある間は他画面への移動確認を表示する。

## アプリ全体管理

- **画面または URL:** 管理トップ `/admin`、ユーザー管理 `/admin/users`、共有管理 `/admin/households`。管理トップは新しいユーザー・共有を最大5件ずつプレビューし、招待一覧は引き続き `/admin` に置く。
- **主なコンポーネント:** `AdminUserList`、`AdminHouseholdList`、`AdminPagination`、`AdminInvitationPagination`、`AutoSubmitFilterForm`、`AdminInvitationHouseholdCombobox`、`InvitationStatusBadge`、`StatusMessage`。ユーザー一覧は `lg` 以上でテーブル、`lg` 未満で全項目名を明示したカードとして表示し、共有一覧は共通カードを使う。招待フィルターは選択を即時、共有名入力を短いデバウンス後に自動適用し、スクロール位置を維持する。招待ページングは件数サマリー直下と一覧末尾に表示する。
- **Server Action または API:** `updateUserAppRole`（`src/app/actions/admin.ts`）。
- **データアクセス・Prismaモデル:** 全画面で `getRequiredAppAdminUser` を通す。`src/lib/admin-users.ts` と `src/lib/admin-households.ts` が `count` 後に補正したページへ `skip` / `take: 20` を適用し、作成日時・IDの降順で1ページ分だけ取得する。管理トップの全件数、5件プレビュー、招待検索用の全共有ID・名前、招待有無を別クエリに分離する。`src/lib/admin-invitations.ts` は `HouseholdInvitation.findMany` / `count` により従来どおり20件ずつDB側ページングする。
- **バリデーション:** `src/lib/admin-pagination.ts` が不正・0以下・範囲外の `page` を安全に補正する。Action 内で `AppRole` を許可値として確認し、戻り先も `/admin` と `/admin/users` のホワイトリストに限定する。`SUPER_ADMIN` の自己降格と最後の `SUPER_ADMIN` 降格を禁止する。招待一覧の状態・共有名・並び順・ページは `admin-invitations.ts` でホワイトリスト検証・正規化し、共有名は `normalizeSearchText` により平仮名・カタカナ・大文字小文字・全角半角の差を吸収する。
- **関連テスト:** `tests/admin-overview.test.ts`（5件プレビュー、独立count、招待検索用共有一覧）、`tests/admin-users.test.ts` / `tests/admin-households.test.ts`（DB側20件ページング、ページ補正、認可、レスポンシブ・表示項目）、`tests/authorization.test.ts`（SUPER_ADMINのみ許可、自己降格・最後のSUPER_ADMIN降格禁止）、`tests/admin-invitations.test.ts`（招待のDBフィルター・ソート・ページング・URL・作成者表示・独立した有効件数、レスポンシブ切り替えと全項目維持）。
- **関連設定:** `prisma/schema.prisma` の `AppRole`。初期付与は `prisma/admin-role.ts`。ページング目視確認用の追加専用・再実行可能なサンプル投入は `prisma/seed-admin-pagination.ts` と `npm run seed:admin-pagination` を使う。
- **依存関係:** `User.appRole` は Household 内ロールとは別物。ナビ表示だけでなく各 page / Action の両方でアプリ管理者を確認する。権限変更操作は `/admin/users` に集約する。ユーザー・共有の作成日はJST日付、招待の作成・期限・使用はJST日時で表示する。招待状態の判定とバッジは共有・メンバー管理画面と共通化し、管理トップの共有プレビュー件数から独立させる。

## リアルタイム同期

- **画面または URL:** ログイン後の全画面（`RootLayout`）、SSE `/api/realtime/household`、revision API `/api/realtime/household/revision`。
- **主なコンポーネント:** `RealtimeRefreshListener`、`AutoSubmitInput`、`AutoSubmitSelect`、`DirtySubmitButton`、`form-dirty-state.ts`。
- **Server Action または API:** 更新系 Action は `commitHouseholdMutation` / `publishHouseholdChangeSafely`（`src/lib/realtime.ts`）を利用。SSE Route はメモリ内 subscribe、revision Route は DB read。
- **データアクセス・Prismaモデル:** `Household.realtimeRevision`、`realtimeActorClientId`、`realtimeActorUserId`、`HouseholdMember` による API 認可。業務データ更新と revision 増加は同一 transaction。更新元 `source` はハムスター、掃除、体重、記録、設定、共有などを区別する。
- **バリデーション:** API はログイン・`householdId`・所属を確認。クライアントは `realtimeActorId`、現在ユーザー、未保存フォームを照合する。
- **関連テスト:** `tests/csv-and-realtime.test.ts`、`tests/error-handling.test.ts`。
- **関連設定:** `src/lib/realtime-constants.ts`、`src/lib/realtime-health.ts`。SSE は Node runtime / force-dynamic 指定。
- **依存関係:** SSE はプロセス内配信なので複数インスタンスでは単独では届かない。revision poll がフォールバック。自己更新を SSE と poll の双方で抑止し、保存後の `revalidatePath`、revision、配信の順序を壊さない。

## インフラ・永続化

- **対象:** `prisma/schema.prisma`、`prisma/migrations/`、`src/lib/prisma.ts`、`src/lib/health.ts`、`src/app/api/health/route.ts`、`docker-compose.yml`、`Dockerfile`、`next.config.mjs`、`.env*.example`、`package.json`。
- **役割:** PostgreSQL 接続と Prisma Client、migration、Docker の app / db 分離、standalone build、環境変数・依存ライブラリを定義する。app のホスト側ポートは `127.0.0.1:3001` に限定し、本番アクセスは Nginx / HTTPS を経由させる。`/api/health` とapp healthcheckでNext.js応答・DB接続を確認し、`next.config.mjs` で最低限のセキュリティヘッダーと `X-Powered-By` 無効化を設定する。
- **関連テスト:** `tests/logger.test.ts`（ログ出力）、`tests/audit-log.test.ts`（Household管理操作の成功監査ログ）、`tests/health.test.ts`（DBヘルス判定）、`tests/security-headers.test.ts`（セキュリティヘッダー設定）、`scripts/log-smoke.ts`。変更内容に応じて `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd test` を実行する。
- **依存関係:** Prismaモデル変更は migration・生成 Client・関連 Action / query / schema の更新が必要。`Dockerfile` は Prisma generate と migrate deploy を行う。デプロイは `docker compose up -d --wait --wait-timeout 120` でDB・app双方のhealthyを確認する。プロフィール画像は `HAMSTER_IMAGE_DIR`、思い出画像は `RECORD_IMAGE_DIR` を使い、どちらもComposeの `./uploads:/app/uploads` で永続化する。CSV 上限を変更する際は `next.config.mjs` の Action body size と整合させる。
