# Codex Handoff

このドキュメントは、新しい Codex チャットへ作業を引き継ぐためのメモです。ユーザー向けの正式なセットアップ・運用手順は `README.md` を参照してください。

## 新チャットで最初に伝えること

新しいチャットでは、まず `docs/NEW_CHAT_PROMPT.md` の内容を貼り付けてください。そのうえで、実装前に現在の `README.md` と対象ファイルを確認してから作業を始めると安全です。

## リポジトリ

- ローカル作業場所: `C:\Users\sound\source\repos\Hamster-Manager-Browser`
- GitHub リポジトリ: `skaltanukiman/Hamster-Manager-Browser`
- アプリ名: Hamster Manager Browser
- 用途: GAS / Google スプレッドシートで管理していたハムスターの衛生管理・体重管理を Web アプリ化する

注意:

- Codex の実行環境が別パスを `cwd` として示すことがあるが、実作業は `C:\Users\sound\source\repos\Hamster-Manager-Browser` で行ってきた。
- 既存のユーザー変更を勝手に戻さない。
- README や docs のみ変更など、ユーザーが範囲を限定した場合は必ずその範囲だけ変更する。

## 技術スタック

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Auth.js / NextAuth
- Tailwind CSS
- Recharts
- Zod
- Docker
- Docker Compose

## 環境と運用方針

- SQLite は使わず、最初から PostgreSQL 前提。
- PostgreSQL は Docker Compose の `db` コンテナで動かす。
- Next.js アプリは Docker Compose の `app` コンテナで動かす。
- 既存の `discord-game-bot` など PM2 管理アプリとは分離する。
- このアプリでは PM2 を使わない。
- Docker Compose のコンテナ名:
  - `hamster-manager-web`
  - `hamster-manager-db`
- ホスト側ポート:
  - Next.js: `3001`
  - PostgreSQL: `127.0.0.1:5433`
- コンテナ内ポート:
  - Next.js: `3000`
  - PostgreSQL: `5432`
- Docker コンテナ間の `DATABASE_URL` はホスト名 `db` を使う。
- ホスト PC から DB に接続する場合は `localhost:5433` を使う。

## env の考え方

実データ用の `.env` は Git 管理しない。

存在する example:

- `.env.example`
- `.env.development.example`
- `.env.production.example`

Docker Compose は `ENV_FILE` で読み込む env ファイルを切り替える。

PowerShell 例:

```powershell
$env:ENV_FILE=".env.development"
docker compose up -d
```

Docker Compose 内で app から db に接続する場合:

```env
DATABASE_URL="postgresql://hamster_user:dev_password@db:5432/hamster_manager_dev?schema=public"
POSTGRES_DB="hamster_manager_dev"
POSTGRES_USER="hamster_user"
POSTGRES_PASSWORD="dev_password"
```

Auth.js / Google OAuth 用:

```env
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_URL=
AUTH_TRUST_HOST=true
```

現行 Auth.js v5 系では `NEXTAUTH_URL` ではなく `AUTH_URL` を使う。Google OAuth の Callback URL は `/api/auth/callback/google`。

ホスト PC で `npm run dev` し、DB だけ Docker で動かす場合:

```env
DATABASE_URL="postgresql://hamster_user:dev_password@localhost:5433/hamster_manager_dev?schema=public"
POSTGRES_DB="hamster_manager_dev"
POSTGRES_USER="hamster_user"
POSTGRES_PASSWORD="dev_password"
```

`DATABASE_URL` のユーザー名、パスワード、DB 名は `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB` と合わせる。

## よく使うコマンド

ローカル開発:

```powershell
npm install
docker compose up -d db
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Docker Compose でまとめて起動:

```powershell
$env:ENV_FILE=".env.development"
docker compose build app
docker compose up -d
```

確認:

```powershell
npm.cmd run lint
npm.cmd run build
docker compose ps
```

Prisma:

```powershell
npm run migrate:assign-owner -- --email example@gmail.com
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:generate
npm run prisma:seed
```

開発中は `migrate dev`、本番反映は `migrate deploy` を使う。

## Windows 開発用スクリプト

- `start-dev.bat`
- `start-dev.ps1`

基本は `start-dev.bat` から起動する想定。

`start-dev.bat` は以下のように PowerShell を起動する。

```bat
powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"
```

`-ExecutionPolicy Bypass` は `.ps1` や `npm.ps1` が実行ポリシーでブロックされる環境向けの対策。Docker 未インストール、ポート使用中、env 不備などを回避するものではない。

## VPS デプロイ方針

- さくらの VPS / Ubuntu 想定。
- `/home/ubuntu` 直下ではなく、アプリ専用ユーザーのホーム配下へ置く方針。
- 例: `/home/hamster/apps/hamster-manager-browser`
- Docker Compose で起動するため、ホスト側 Node.js のバージョンには依存しない。
- Nginx は必要に応じて VPS ホスト側に置く。
- 個人利用でスマホから見る場合は、インターネット公開より Tailscale 経由も選択肢。

VPS 更新例:

```bash
cd ~/apps/hamster-manager-browser
git pull
docker compose build
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose logs -f app
```

Docker Compose v1 の `docker-compose` で `KeyError: 'ContainerConfig'` が出たことがある。可能なら Compose v2 の `docker compose` を使う。作成途中の壊れたコンテナが残っている場合は、該当コンテナを確認して削除してから再実行する。

## 実装済み機能の要約

詳細は `README.md` が最新。

### 認証・共有

- Auth.js / NextAuth + Google OAuth を使用。
- Prisma Adapter で `users`、`accounts`、`sessions`、`verification_tokens` を PostgreSQL に保存。
- `src/proxy.ts` で未ログインユーザーを `/login` へリダイレクト。
- DBアクセス前は `src/lib/auth-context.ts` の `getRequiredHouseholdContext()` でログインユーザーと現在の Household を取得する。
- 初回ログインで Household がなければ個人用 Household を自動作成。
- 現在は cookie `hamster_current_household` があればその Household、なければ最初の membership を操作対象にする。
- `/settings/members` でメンバー一覧と招待リンク作成。
- `/invitations/accept?token=...` でログイン済みユーザーを Household に MEMBER として追加。
- 招待トークンは `src/lib/invitations.ts` で生成し、DB には SHA-256 ハッシュのみ保存。

### 共通 UI

- `StatusMessage` は通常メッセージを数秒後にアニメーションで自動非表示にする。
- エラーメッセージは自動で消さず、右端の閉じるボタンで消せる。
- `unchanged` は「変更はありません。」として表示する。
- `duplicate` は「同じ日付の記録が既に存在します。」として表示する。
- ハムスター一覧、衛生管理メモ、体重履歴の保存ボタンは `DirtySubmitButton` / `MobileDirtySaveArea` で変更検知し、編集が入るまで非活性。
- サーバー側 action でも変更なしの場合は DB 更新せず `unchanged` を返す。
- `src/app/api/realtime/household/route.ts`、`src/app/api/realtime/household/revision/route.ts`、`src/components/realtime-refresh-listener.tsx` で Household 単位の同期を行う。
- DB 更新後の Server Action は `notifyHouseholdChange()` を呼び、Household の `updatedAt` を更新したうえで別タブ・別ユーザー画面へ変更を通知する。
- SSE が届かない場合でも、クライアントは数秒おきに revision API で `updatedAt` を確認して追従する。
- `form[data-dirty-watch]` に未保存変更がある場合は自動 `router.refresh()` せず、右下通知から手動再読み込みする。
- 現状のSSE即時通知バスは app プロセス内メモリ。複数 app インスタンスにする場合でも revision API の追従は効くが、即時性を保つなら PostgreSQL LISTEN/NOTIFY など外部 pub/sub へ差し替える。

### ダッシュボード

- 表示対象ハムスターのカード表示。
- 最新体重。
- トイレ掃除、砂場掃除、床材全交換、ハウス掃除の最新状態。
- 掃除日は経過日数 / 日付をクリックまたはタッチで切り替え。
- 管理中 / 管理外表示。
- 長いメモは省略し、クリックまたはタッチでモーダル表示。
- カード高さがメモや未記録状態で大きく崩れないよう調整済み。

### ハムスター管理

- 登録、編集、削除。
- 名前、メモ、誕生日、お迎え日。
- 名前 15 文字以内。
- メモ 2000 文字以内。
- 誕生日、お迎え日は未来日不可。
- 管理中 / 管理外切り替え。
- 管理外はプロフィール編集、衛生記録、体重記録をロック。
- 一覧検索、登録順 / 名前、昇順 / 降順、20件ページング。
- 検索は NFKC 正規化、小文字化、カタカナをひらがなへ寄せる。
- 削除チェックボックス常時表示。選択時だけアクションバー表示。
- アクションバーは全選択、全解除、削除。
- 編集保存は変更がある場合のみ実行。
- 未保存変更の移動確認モーダルあり。

### 衛生管理

- ハムスターと年月を選ぶと月別記録を表示。
- PC は表形式、スマホは日別カード形式。
- 掃除項目のチェックボックスは `AutoSubmitInput` で変更時に自動保存し、Household 同期通知を送る。
- メモ入力は従来どおり保存ボタンで確定する。
- スマホ表示だけ、年月項目の下に日付フィルターを表示し、該当日だけを画面表示できる。
- スマホの日付フィルターは `CleaningMobileDayFilter` / `CleaningMobileForm` で扱う。絞り込みで非表示にした日付もフォーム内には残し、保存時に隠れた日付を削除しない。
- 今日の日付を背景色で強調。
- 表形式では「今日」文言なし、スマホカードでは「今日」バッジあり。
- 未来日は入力不可。
- 管理外は入力不可。
- スマホではメモ編集後に現在スクリーン右下へ固定保存ボタンを表示。
- 固定保存ボタンは `document.body` 直下へ portal して、親要素の transform 影響を避けている。
- 保存は変更がある場合のみ実行。直接 submit されても変更なしなら DB 更新せず `unchanged` を返す。
- 未保存変更の移動確認モーダルあり。

### 体重管理

- 体重登録、編集、削除。
- 未来日不可。
- 体重は 1〜500g、0.1g 単位。
- 同じハムスター・同じ日付の新規登録は、上書きせず重複エラーとして返す。
- 履歴編集は変更がある場合のみ保存。直接 submit されても変更なしなら DB 更新せず `unchanged` を返す。
- 履歴は DB 側でフィルター、ソート、ページング。
- 20件ページング。
- グラフはページング中の一覧だけではなく、現在条件に一致する全体を表示。
- 初期表示は日付 / 降順。
- 登録後は登録順 / 降順へ切り替え。
- 削除チェックボックス常時表示。選択時だけアクションバー表示。
- 未保存変更の移動確認モーダルあり。

### CSV

- `/weights/export`: 体重 CSV エクスポート。
- `/weights/import`: GAS 版体重 CSV インポート。
- `/export` は `/weights/export` へリダイレクト。
- CSV インポートは成功件数、スキップ件数、エラー件数、エラー詳細を表示。
- GAS 側 `id` はアプリ DB ID として使わない。

### 設定

- ログイン中ユーザーの表示名変更。自動生成された個人用 Household 名にも反映する。
- ダッシュボード表示ボード数 1〜30 件。
- 表示対象ハムスター選択。
- 表示対象検索。
- ハムスター選択方式の切り替え。
  - コンボボックス式
  - プルダウン式
- 保存ボタンまでスクロールする固定ボタンあり。

## DB モデル要約

- `hamsters`
  - `householdId`
  - `@@unique([householdId, name])`
  - `memo`
  - `birthDate`
  - `adoptionDate`
  - `isActive`
- `cleaning_records`
  - `hamsterId`
  - `recordDate`
  - `toiletCleaned`
  - `bathCleaned`
  - `flooringPartCleaned`
  - `flooringAllCleaned`
  - `houseCleaned`
  - `memo`
  - `@@unique([hamsterId, recordDate])`
- `weight_records`
  - `hamsterId`
  - `recordDate`
  - `weightG`
  - `@@unique([hamsterId, recordDate])`
- `app_settings`
  - `userId`
  - `householdId`
  - `@@unique([userId, householdId])`
  - `dashboardBoardCount`
  - `hamsterSelectorMode`
- `dashboard_hamsters`
  - ダッシュボード表示対象と `sortOrder`
- `users`
  - `appRole` はアプリ全体権限。`USER` / `ADMIN` / `SUPER_ADMIN`
- `households`
  - 共有単位
- `household_members`
  - `OWNER` / `ADMIN` / `MEMBER`
- `household_invitations`
  - 7日有効の招待リンク。`tokenHash` を保存。

## 実装時の注意

- UI 文言は日本語。
- 既存デザインに合わせる。
- ハムスター・衛生記録・体重記録・CSV・設定は必ず現在 Household で絞る。
- Server Action は画面表示に頼らず、DB更新直前に所属 Household を確認する。
- `/admin` はアプリ全体管理者用。`ADMIN` / `SUPER_ADMIN` のみアクセス可能で、ユーザー権限変更は `SUPER_ADMIN` のみ。
- 初期管理者は Google ログイン後に `npm run admin:grant -- --email ... --role SUPER_ADMIN` で付与する。
- 既存データはリセットせず、必要に応じて `npm run migrate:assign-owner -- --email ...` で未割り当てハムスターを管理者 Household へ移す。
- PC で表、スマホでカードのように、レスポンシブ差分を意識する。
- 画面幅が狭いときの横はみ出し、固定ボタンの被りに注意。
- 未来日制限はフロントだけでなくサーバー側 action でも確認する。
- 管理外ハムスターへの編集・保存・削除制限を忘れない。
- ハムスター候補は原則、管理中のみ表示し、「管理外も含む」で管理外も出す。
- 検索仕様は `src/lib/search.ts` の `normalizeSearchText` に寄せる。
- 未保存変更確認は `UnsavedChangesGuard` を使う。
- 削除 UI は「チェックボックス常時表示、選択時だけアクションバー表示」が現在仕様。
- 変更後は少なくとも `npm.cmd run lint` と `npm.cmd run build` を確認する。
- Docker 反映を求められた場合は `docker compose build app`、`docker compose up -d`、`docker compose ps` を確認する。
- ユーザーが「READMEだけ」「コメントだけ」など範囲を限定した場合は、絶対にそれ以外を変更しない。

## 直近の作業傾向

- ユーザーは UI の細かな違和感を見つけて段階的に改善することが多い。
- スマホ実機での見え方を重視する。
- Docker 反映まで求めることが多い。
- ただし、明示されていない場合は勝手に push しない。
- GitHub への push はユーザーが手動で行うことがある。

## 次チャットで最初に確認するとよいもの

```powershell
git status -sb
Get-Content -Encoding utf8 -Path README.md | Select-Object -First 120
npm.cmd run lint
```

機能改修時は、対象ページ・対象コンポーネントを読んでから作業する。
