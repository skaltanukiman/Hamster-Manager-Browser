# Hamster Manager Browser

Google スプレッドシートと GAS で管理していたハムスターの衛生管理・体重管理を、VPS 上で運用しやすい Web アプリとして作り直したものです。

Next.js アプリと PostgreSQL を Docker Compose で分離して動かし、VPS ホスト側の Nginx から Next.js コンテナへリバースプロキシする想定です。既存の PM2 管理アプリとは別管理にします。

## 主な機能

- ダッシュボード
  - 登録済みハムスターの一覧
  - 最新体重
  - 最終掃除日
  - 掃除からの経過日数
- ハムスター管理
  - 登録
  - 名前とメモの編集
  - 削除
  - 同名登録時の専用エラーメッセージ
- 衛生管理
  - ハムスターと年月を選択して月別の掃除記録を入力
  - ハムスターまたは年月を変更すると即時切り替え
  - トイレ掃除、砂場掃除、床材一部交換、床材全交換、ハウス掃除、メモを日別に保存
  - 未来日は入力不可
- 体重管理
  - ハムスター別の体重登録
  - 履歴の編集・削除
  - 折れ線グラフ表示
  - 未来日は入力不可
- CSV 出力
  - 体重記録を CSV 出力
  - ハムスター指定、年月指定で絞り込み
- 設定
  - ダッシュボードの表示ボード数を変更
  - 表示数を超えるハムスターが登録されている場合の表示対象を選択

## 技術スタック

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- Recharts
- Zod
- Docker
- Docker Compose

## 画面構成

- `/`
  - ダッシュボード
- `/hamsters`
  - ハムスター管理
- `/cleaning`
  - 衛生管理
- `/weights`
  - 体重管理
- `/export`
  - CSV 出力
- `/settings`
  - 設定

## DB 設計

### `hamsters`

- `id`
- `name`
- `memo`
- `birthDate`
- `adoptionDate`
- `createdAt`
- `updatedAt`

`name` はユニークです。同じ名前のハムスターは登録できません。

### `cleaning_records`

- `id`
- `hamsterId`
- `recordDate`
- `toiletCleaned`
- `bathCleaned`
- `flooringPartCleaned`
- `flooringAllCleaned`
- `houseCleaned`
- `memo`
- `createdAt`
- `updatedAt`

`hamsterId` と `recordDate` の組み合わせはユニークです。衛生管理表は、ハムスターごとに 1 日 1 行として保存します。

### `weight_records`

- `id`
- `hamsterId`
- `recordDate`
- `weightG`
- `createdAt`
- `updatedAt`

`hamsterId` と `recordDate` の組み合わせはユニークです。体重履歴は、ハムスターごとに 1 日 1 件として保存します。

### `app_settings`

- `id`
- `dashboardBoardCount`
- `createdAt`
- `updatedAt`

ダッシュボードの表示ボード数など、アプリ全体の設定を保存します。

### `dashboard_hamsters`

- `id`
- `settingId`
- `hamsterId`
- `sortOrder`
- `createdAt`
- `updatedAt`

ダッシュボードの表示対象ハムスターを保存します。

## 環境変数ファイル

実際に使う `.env` 系ファイルは Git 管理しません。用途に応じて example ファイルをコピーして作成します。

```text
.env.example
.env.development.example
.env.production.example
```

Docker Compose は `ENV_FILE` で読み込む env ファイルを切り替えられます。指定しない場合は `.env` を読み込みます。

```bash
ENV_FILE=.env.development docker compose up -d
ENV_FILE=.env.production docker compose up -d
```

PowerShell の場合:

```powershell
$env:ENV_FILE=".env.development"
docker compose up -d
```

`$env:ENV_FILE` は PowerShell の現在のセッションだけに効きます。毎回指定したくない場合は、開発 PC では `.env.development.example` を `.env` にコピーして使うのが簡単です。

```powershell
Copy-Item .env.development.example .env
```

VPS 本番では `.env.production.example` を `.env` にコピーして、本番用の強いパスワードへ変更する運用でも構いません。

```bash
cp .env.production.example .env
```

## env の値の考え方

Docker Compose 内で Next.js コンテナから PostgreSQL コンテナへ接続する場合、`DATABASE_URL` のホスト名は `db` です。

```env
DATABASE_URL="postgresql://hamster_user:dev_password@db:5432/hamster_manager_dev?schema=public"

POSTGRES_DB="hamster_manager_dev"
POSTGRES_USER="hamster_user"
POSTGRES_PASSWORD="dev_password"
```

対応関係:

```text
DATABASE_URL のユーザー名 = POSTGRES_USER
DATABASE_URL のパスワード = POSTGRES_PASSWORD
DATABASE_URL のDB名       = POSTGRES_DB
DATABASE_URL のホスト     = db
DATABASE_URL のポート     = 5432
```

ホスト PC 上で `npm run dev` を実行し、DB だけ Docker Compose で動かす場合は、`DATABASE_URL` のホストを `localhost`、ポートを `5433` にします。`docker-compose.yml` では PostgreSQL を `127.0.0.1:5433` に公開しています。

```env
DATABASE_URL="postgresql://hamster_user:dev_password@localhost:5433/hamster_manager_dev?schema=public"

POSTGRES_DB="hamster_manager_dev"
POSTGRES_USER="hamster_user"
POSTGRES_PASSWORD="dev_password"
```

## ローカル開発

Windows の PowerShell 例です。

### 1. 依存関係をインストール

```powershell
npm install
```

### 2. 開発用 `.env` を作成

ホスト PC で `npm run dev` する場合:

```powershell
Copy-Item .env.development.example .env
```

その後、`.env` の `DATABASE_URL` を `localhost:5433` に変更します。

```env
DATABASE_URL="postgresql://hamster_user:dev_password@localhost:5433/hamster_manager_dev?schema=public"
```

### 3. PostgreSQL コンテナだけ起動

```powershell
docker compose up -d db
```

### 4. Prisma migrate を実行

開発中は `migrate dev` を使います。

```powershell
npx prisma migrate dev
```

サンプルデータを入れる場合:

```powershell
npx prisma db seed
```

### 5. Next.js を起動

```powershell
npm run dev
```

ブラウザで開きます。

```text
http://localhost:3000
```

## Docker Compose で app と db をまとめて起動

Docker コンテナだけで動作確認したい場合の手順です。この場合、`DATABASE_URL` のホストは `db:5432` のままで使います。

```powershell
Copy-Item .env.development.example .env
docker compose build
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
docker compose logs -f app
```

ブラウザで開きます。

```text
http://localhost:3001
```

ポートは次の対応です。

```text
ホスト側: 3001
コンテナ側: 3000
```

PostgreSQL は Docker volume に永続化されます。

```text
hamster_manager_pgdata
```

通常の停止では DB データは消えません。

```powershell
docker compose down
```

DB データも削除したい場合だけ `-v` を付けます。開発DBを初期化したい時以外は使わないでください。

```powershell
docker compose down -v
```

## Prisma コマンド

`package.json` には次のスクリプトがあります。

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:generate
npm run prisma:seed
```

使い分け:

```text
開発中のスキーマ変更: npm run prisma:migrate
本番反映:             npm run prisma:deploy
Prisma Client生成:    npm run prisma:generate
seed投入:             npm run prisma:seed
```

Docker Compose 上で実行する例:

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

開発中に DB コンテナだけ起動してホスト側から実行する場合:

```bash
npx prisma migrate dev
npx prisma db seed
```

## VPS デプロイ手順

前提:

- Ubuntu
- Docker
- Docker Compose
- Nginx は VPS ホスト側に配置
- このアプリは PM2 では管理しない
- 既存の Node.js / PM2 アプリとはポートとプロセス管理を分ける

### 1. リポジトリを clone

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/skaltanukiman/Hamster-Manager-Browser.git hamster-manager-browser
cd hamster-manager-browser
```

### 2. 本番用 `.env` を作成

```bash
cp .env.production.example .env
nano .env
```

`POSTGRES_PASSWORD` は必ず強い値に変更します。`DATABASE_URL` 側のパスワードも同じ値に合わせます。

```env
DATABASE_URL="postgresql://hamster_user:change_me_to_a_strong_password@db:5432/hamster_manager?schema=public"

POSTGRES_DB="hamster_manager"
POSTGRES_USER="hamster_user"
POSTGRES_PASSWORD="change_me_to_a_strong_password"
```

Docker Compose 内では app から db へ接続するため、VPS 本番でも `DATABASE_URL` のホストは `db` のままです。

### 3. ビルドと起動

```bash
docker compose build
docker compose up -d
```

### 4. Prisma migrate を反映

本番では `migrate deploy` を使います。

```bash
docker compose exec app npx prisma migrate deploy
```

必要なら seed を投入します。

```bash
docker compose exec app npx prisma db seed
```

### 5. ログ確認

```bash
docker compose logs -f app
docker compose logs -f db
```

### 6. 再起動・停止

```bash
docker compose restart app
docker compose down
```

`docker compose down` では PostgreSQL の volume は残ります。`docker compose down -v` は DB データを削除するため、本番では使わないでください。

## アプリ更新手順

VPS 上で更新する例です。

```bash
cd ~/apps/hamster-manager-browser
git pull
docker compose build
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose logs -f app
```

## Nginx リバースプロキシ設定例

Nginx は VPS ホスト側に置き、Docker 上で動く Next.js アプリへ転送します。

```nginx
server {
    server_name hamster.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

設定反映:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS 化する場合は Certbot などで証明書を発行します。

## 既存アプリとの同居時の注意

- このアプリは Docker Compose で管理し、PM2 には登録しません。
- App コンテナ名は `hamster-manager-web` です。
- DB コンテナ名は `hamster-manager-db` です。
- ホスト側公開ポートは `3001` です。既存アプリと衝突する場合は `docker-compose.yml` の `3001:3000` を変更してください。
- PostgreSQL の DB 名、ユーザー名、パスワードはこのアプリ専用にします。
- `.env` はこのアプリ専用にします。
- Docker コンテナ内の Node.js を使うため、VPS ホスト側の Node.js バージョンには依存しません。

## DB バックアップ

PostgreSQL のデータは Docker volume `hamster_manager_pgdata` に永続化されます。VPS 本番では、定期バックアップと VPS 外への退避を検討してください。

バックアップ例:

```bash
docker compose exec db pg_dump -U hamster_user hamster_manager > backup.sql
```

リストア例:

```bash
docker compose exec -T db psql -U hamster_user hamster_manager < backup.sql
```

`.env` で DB 名やユーザー名を変更している場合は、コマンド内の `hamster_user` と `hamster_manager` も実際の値に合わせてください。
