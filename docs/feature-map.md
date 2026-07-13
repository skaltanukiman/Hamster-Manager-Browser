# 機能マップ

最終確認: 2026-07-13。Next.js App Router / Prisma / PostgreSQL 構成において、画面から Server Action・Route Handler・データアクセスまでを辿るための索引です。原則として、Household に属するデータは `getRequiredHouseholdContext()` で現在の所属を確定し、Action / API 側でも対象の所属・管理状態を確認します。

## 共通の起点

| 項目 | 主なファイル | 注意点 |
| --- | --- | --- |
| 認証ガード・ログイン遷移 | `src/proxy.ts`, `src/auth.ts`, `src/app/login/page.tsx`, `src/app/api/auth/[...nextauth]/route.ts` | `/login`、`/api/auth`、`/api/health`以外は認証必須。Auth.js は DB セッションを使用し、認証・認可ポリシーは `tests/authorization.test.ts` で検証する。 |
| 現在の Household と権限 | `src/lib/auth-context.ts`, `src/app/actions/households.ts`, `src/components/household-switcher.tsx` | `hamster_current_household` Cookie は所属確認後にのみ更新する。初回ログイン時の個人用 Household 作成もここにある。 |
| レイアウト・ナビゲーション | `src/app/layout.tsx`, `src/components/app-nav.tsx`, `src/app/globals.css` | ログイン済み画面には Household 切替とリアルタイム監視が常設される。 |
| 日付・検索・フォーム状態 | `src/lib/date.ts`, `src/lib/search.ts`, `src/components/form-dirty-state.ts`, `src/components/unsaved-changes-guard.tsx`, `src/components/dirty-submit-button.tsx` | 日付は JST の入力値を用い、形式だけでなく実在する暦日・年月を `tests/date-validation.test.ts` で検証する。未保存ガードと保存ボタン活性は一覧・掃除・体重で共有する。 |
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

- **画面または URL:** ヘッダーの操作対象切替、`/settings/members`、`/invitations/accept#token=...`。
- **主なコンポーネント:** `HouseholdSwitcher`、`HouseholdInvitationForm`、`InvitationAcceptForm`、`MemberRoleForm`、`MemberRemoveForm`、`StatusMessage`。
- **Server Action または API:** `switchCurrentHousehold`（`actions/households.ts`）、`createHouseholdInvitation`、`acceptHouseholdInvitation`、`removeHouseholdMember`、`updateHouseholdMemberRole`（`actions/members.ts`）。
- **データアクセス・Prismaモデル:** `getRequiredHouseholdContext` / `getCurrentHouseholdSwitcherData`、`Household`、`HouseholdMember`、`HouseholdInvitation`、参加時の `AppSetting`。
- **バリデーション:** `idSchema`、招待 token の SHA-256（`src/lib/invitations.ts`）。OWNER / ADMIN / MEMBER を `src/lib/authorization.ts` と Action 内トランザクションで再確認する。
- **関連テスト:** `tests/invitations.test.ts`（tokenをクエリではなくフラグメントへ格納し、不正tokenを拒否する）、`tests/invitation-cleanup.test.ts`（使用済み90日・期限切れ30日の削除条件）、`tests/authorization.test.ts`（招待・削除・権限変更ポリシー）、`tests/audit-log.test.ts`（成功監査ログ）。
- **関連設定:** `src/lib/auth-context.ts` の Cookie 名・個人用 Household 名、`src/lib/invitations.ts` の有効期限、`src/lib/invitation-cleanup.ts`、`scripts/cleanup-invitations.ts`、`npm run invitations:cleanup`。
- **依存関係:** 招待の平文 token は管理画面URLへ載せず、作成直後のAction stateと受諾画面のメモリ内でのみ扱い、DBにはhashのみ保存する。共有URLはHTTPへ送信されないフラグメントを使い、未ログイン時はOAuth往復中だけ同一タブの `sessionStorage` に保持する。読み込み直後にアドレスバーから、ログイン後にstorageから削除する。使用済みは90日、未使用の期限切れは30日保持してVPS cronから整理する。有効な招待は削除しない。メンバーの削除・権限変更は最後の OWNER、自分自身、操作権限の制約と、現在選択 Cookie の整合性に注意する。

## ダッシュボード

- **画面または URL:** `/`。
- **主なコンポーネント:** `DashboardMemo`、`CleaningDateToggle`、`HamsterThumbnail`、`EmptyState`。画像登録済みの `HamsterThumbnail` はクリック・タップで拡大モーダルを表示し、未登録・読込失敗時は操作不可のプレースホルダーになる。
- **Server Action または API:** 直接の更新 Action はなし。設定更新は `saveDashboardSettings`。
- **データアクセス・Prismaモデル:** `getDashboardData`（`src/lib/queries.ts`）が `Hamster`、`AppSetting` / `DashboardHamster`、最新 `WeightRecord`、各種 `CleaningRecord` を Household とユーザー設定で取得。
- **バリデーション:** 表示件数・対象選択は設定の `dashboardSettingsSchema` と `dashboard-settings.ts`。
- **関連テスト:** 専用テストなし。
- **関連設定:** `src/lib/dashboard-settings.ts`（1〜30件、選択 UI の既定値）。
- **依存関係:** 表示対象はユーザー・Household ごとの設定。掃除種別を増減する場合は `getDashboardData` とカード表示を同時に変更する。

## ハムスター一覧・登録・編集・削除

- **画面または URL:** `/hamsters`。
- **主なコンポーネント:** `HamsterList`、`HamsterImageField`、`HamsterThumbnail`、`SelectionActionBar`、`DirtySubmitButton`、`UnsavedChangesGuard`、`StatusMessage`。
- **Server Action または API:** `createHamster`、`updateHamster`、`updateHamsterActiveStatus`、`deleteHamster`、`deleteHamsters`（`src/app/actions/hamsters.ts`）、認証付き画像配信 `/api/hamsters/[id]/image`。
- **データアクセス・Prismaモデル:** `getHamsterManagementData`、`Hamster`。削除は関連 `CleaningRecord` / `WeightRecord` / `DashboardHamster` が schema の Cascade により連動する。
- **バリデーション:** `createHamsterSchema`、`updateHamsterSchema`、削除・状態変更 schema（`src/lib/schemas.ts`）。日付は未来日不可。DB の `@@unique([householdId, name])` も重複防止となる。
- **関連テスト:** 画像変換・保存・削除・Household分離・プレースホルダーは `tests/hamster-image.test.tsx`。Household所属判定は `tests/authorization.test.ts`、想定外 / 一意制約エラーの共通処理は `tests/error-handling.test.ts`。
- **関連設定:** `src/lib/search.ts`（名前検索の正規化）、`src/lib/hamster-image.ts`、`HAMSTER_IMAGE_DIR`、`prisma/schema.prisma`、`docker-compose.yml`。
- **依存関係:** 全更新は realtime mutation を通す。`isActive=false` は体重・掃除の編集ロック条件なので、状態変更時は `weights.ts`、`cleaning.ts` の所属・状態検証を崩さない。
- **レスポンシブ表示:** 新規登録・編集フォームはスマートフォンで画像選択欄を登録・保存ボタンの直前に置き、送信ボタンをカード幅に広げる。`lg` 以上では既存プロフィール項目と送信ボタンを同じ横列、画像欄を次の行に表示し、管理状態変更ボタンはカード上部の状態バッジ横へ置く。スマートフォンの管理状態変更ボタンはカード下部に維持する。

## 体重履歴

- **画面または URL:** `/weights`。
- **主なコンポーネント:** `WeightHistoryList`、`WeightChart`、`HamsterSelectorInput`、`AutoSubmitInput` / `AutoSubmitSelect`、`SelectionActionBar`。
- **Server Action または API:** `createWeightRecord`、`updateWeightRecord`、`deleteWeightRecord`、`deleteWeightRecords`（`src/app/actions/weights.ts`）。
- **データアクセス・Prismaモデル:** `getWeightPageData`（DB 側のフィルター・ソート・ページングとグラフ全件）、`Hamster`、`WeightRecord`、`AppSetting`。
- **バリデーション:** `createWeightRecordSchema`、`updateWeightRecordSchema`、削除 schema、`MAX_WEIGHT_G`（1〜500g、0.1g、未来日不可）。`@@unique([hamsterId, recordDate])` が日次重複を保証する。
- **関連テスト:** `tests/weight-validation.test.ts`（通常登録・編集・CSVの0.1g単位検証）、`tests/csv-and-realtime.test.ts`（CSVの体重上限・未来日検証）、`tests/authorization.test.ts`（Household所属判定）。
- **関連設定:** `src/lib/weight-rules.ts`、`src/lib/date.ts`、`src/lib/dashboard-settings.ts`（選択 UI）。
- **依存関係:** 管理外ハムスターは作成・編集・削除不可。履歴一覧は 20 件ページングだがグラフは同一条件の全レコードを使うため、両方のクエリ条件を揃える。

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
- **依存関係:** 通常の体重登録と同じ制約を保つ。GAS `id` は DB ID に流用せず、アプリ版 `record_id` と区別する。CSVでの削除は行わない。エラー詳細の形式を変える場合はフォーム表示も更新する。

## 掃除記録

- **画面または URL:** `/cleaning`。
- **主なコンポーネント:** `CleaningMobileForm`、`CleaningMobileDayFilter`、`HamsterSelectorInput`、`DirtySubmitButton`、`MobileDirtySaveArea`、`UnsavedChangesGuard`。
- **Server Action または API:** `saveCleaningMonth`（`src/app/actions/cleaning.ts`）。
- **データアクセス・Prismaモデル:** `getCleaningPageData`、`Hamster`、`CleaningRecord`、`AppSetting`。月内の既存行との差分から create / update / delete を行う。
- **バリデーション:** `cleaningMonthSchema`、`yearMonthSchema`、日付・未来日チェック（`src/lib/date.ts`）。
- **関連テスト:** `tests/authorization.test.ts`（Household所属判定）。
- **関連設定:** `src/lib/dashboard-settings.ts`（Hamster 選択形式）、`src/app/globals.css`（PC表 / モバイルカードの表示）。
- **依存関係:** 記録が全て空なら行を削除する。掃除種別・メモのフィールドを変える場合、schema、Action 差分判定、`getCleaningPageData`、ダッシュボード最新掃除表示、Prisma migration をまとめて変更する。管理外の編集ロックも必須。

## 設定（プロフィール・ダッシュボード）

- **画面または URL:** `/settings`。
- **主なコンポーネント:** `ProfileSettingsForm`、`DashboardSettingsForm`、`HamsterCombobox`、`MobileDirtySaveArea`。
- **Server Action または API:** `updateUserProfile`、`saveDashboardSettings`（`src/app/actions/settings.ts`）。
- **データアクセス・Prismaモデル:** `getDashboardSettingsPageData`、`User`、`Household`、`HouseholdMember`、`AppSetting`、`DashboardHamster`、`Hamster`。
- **バリデーション:** `updateUserProfileSchema`（表示名）、`dashboardSettingsSchema`、`normalizeDashboardBoardCount` / `normalizeHamsterSelectorMode`。
- **関連テスト:** 専用テストなし。
- **関連設定:** `src/lib/dashboard-settings.ts`、`src/lib/search.ts`。
- **依存関係:** 表示名変更時は自動生成された個人用 Household 名も更新する。ダッシュボード対象の保存は一旦全 `DashboardHamster` を削除して作り直すため、順序と上限を Action と UI で一致させる。

## アプリ全体管理

- **画面または URL:** `/admin`。
- **主なコンポーネント:** ページ内フォーム、`StatusMessage`。
- **Server Action または API:** `updateUserAppRole`（`src/app/actions/admin.ts`）。
- **データアクセス・Prismaモデル:** `getRequiredAppAdminUser`、ページ内の `User.findMany`、`Household.findMany`、`HouseholdInvitation.findMany`、Action の `User`。
- **バリデーション:** Action 内で `AppRole` を許可値として確認。`SUPER_ADMIN` の自己降格と最後の `SUPER_ADMIN` 降格を禁止する。
- **関連テスト:** `tests/authorization.test.ts`（SUPER_ADMINのみ許可、自己降格・最後のSUPER_ADMIN降格禁止）。
- **関連設定:** `prisma/schema.prisma` の `AppRole`。初期付与は `prisma/admin-role.ts`。
- **依存関係:** `User.appRole` は Household 内ロールとは別物。ナビ表示だけでなく page / Action の両方でアプリ管理者を確認する。

## リアルタイム同期

- **画面または URL:** ログイン後の全画面（`RootLayout`）、SSE `/api/realtime/household`、revision API `/api/realtime/household/revision`。
- **主なコンポーネント:** `RealtimeRefreshListener`、`AutoSubmitInput`、`AutoSubmitSelect`、`DirtySubmitButton`、`form-dirty-state.ts`。
- **Server Action または API:** 更新系 Action は `commitHouseholdMutation` / `publishHouseholdChangeSafely`（`src/lib/realtime.ts`）を利用。SSE Route はメモリ内 subscribe、revision Route は DB read。
- **データアクセス・Prismaモデル:** `Household.realtimeRevision`、`realtimeActorClientId`、`realtimeActorUserId`、`HouseholdMember` による API 認可。業務データ更新と revision 増加は同一 transaction。
- **バリデーション:** API はログイン・`householdId`・所属を確認。クライアントは `realtimeActorId`、現在ユーザー、未保存フォームを照合する。
- **関連テスト:** `tests/csv-and-realtime.test.ts`、`tests/error-handling.test.ts`。
- **関連設定:** `src/lib/realtime-constants.ts`、`src/lib/realtime-health.ts`。SSE は Node runtime / force-dynamic 指定。
- **依存関係:** SSE はプロセス内配信なので複数インスタンスでは単独では届かない。revision poll がフォールバック。自己更新を SSE と poll の双方で抑止し、保存後の `revalidatePath`、revision、配信の順序を壊さない。

## インフラ・永続化

- **対象:** `prisma/schema.prisma`、`prisma/migrations/`、`src/lib/prisma.ts`、`src/lib/health.ts`、`src/app/api/health/route.ts`、`docker-compose.yml`、`Dockerfile`、`next.config.mjs`、`.env*.example`、`package.json`。
- **役割:** PostgreSQL 接続と Prisma Client、migration、Docker の app / db 分離、standalone build、環境変数・依存ライブラリを定義する。app のホスト側ポートは `127.0.0.1:3001` に限定し、本番アクセスは Nginx / HTTPS を経由させる。`/api/health` とapp healthcheckでNext.js応答・DB接続を確認し、`next.config.mjs` で最低限のセキュリティヘッダーと `X-Powered-By` 無効化を設定する。
- **関連テスト:** `tests/logger.test.ts`（ログ出力）、`tests/audit-log.test.ts`（Household管理操作の成功監査ログ）、`tests/health.test.ts`（DBヘルス判定）、`tests/security-headers.test.ts`（セキュリティヘッダー設定）、`scripts/log-smoke.ts`。変更内容に応じて `npm.cmd run lint`、`npm.cmd run build`、`npm.cmd test` を実行する。
- **依存関係:** Prismaモデル変更は migration・生成 Client・関連 Action / query / schema の更新が必要。`Dockerfile` は Prisma generate と migrate deploy を行う。デプロイは `docker compose up -d --wait --wait-timeout 120` でDB・app双方のhealthyを確認する。CSV 上限を変更する際は `next.config.mjs` の Action body size と整合させる。
