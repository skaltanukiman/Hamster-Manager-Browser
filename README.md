# Hamster Manager Browser

Googleスプレッドシート/GAS版の「ハムスターごとの衛生管理・体重管理」を、VPS上で運用しやすいWebアプリとして作り直したMVPです。

## 主な機能

- ダッシュボード: 登録済みハムスター、最新体重、最終掃除日、掃除からの経過日数を表示
- ハムスター管理: 登録、名前編集、メモ編集、削除
- 衛生管理: ハムスターと年月を選び、日別にトイレ掃除、砂場掃除、床材一部交換、床材全交換、ハウス掃除、メモを保存
- 体重管理: 体重登録、履歴編集、削除、ハムスターごとの折れ線グラフ表示
- CSV出力: 体重記録をハムスター、年月で絞り込んでCSVダウンロード

## 技術構成

- Next.js / TypeScript
- Prisma / PostgreSQL
- Tailwind CSS
- Recharts
- Docker / Docker Compose

DBは最初からPostgreSQL前提です。SQLiteは使用していません。

## DB設計

- `hamsters`
  - `id`, `name`, `memo`, `createdAt`, `updatedAt`
- `cleaning_records`
  - `id`, `hamsterId`, `recordDate`, `toiletCleaned`, `bathCleaned`, `flooringPartCleaned`, `flooringAllCleaned`, `houseCleaned`, `memo`, `createdAt`, `updatedAt`
- `weight_records`
  - `id`, `hamsterId`, `recordDate`, `weightG`, `createdAt`, `updatedAt`

`cleaning_records` と `weight_records` は、同じハムスター・同じ日付につき1件になるようにユニーク制約を設定しています。

## 環境変数

実際に使うenvファイルはGit管理しません。用途別のexampleをコピーして作成してください。

```text
.env.example                汎用サンプル
.env.development.example    開発用サンプル
.env.production.example     本番用サンプル
```

Docker Composeは `ENV_FILE` で読み込むenvファイルを切り替えられます。指定しない場合は `.env` を読みます。

```bash
ENV_FILE=.env.development docker compose up -d
ENV_FILE=.env.production docker compose up -d
```

PowerShellでは次のように指定します。

```powershell
$env:ENV_FILE=".env.development"; docker compose up -d
```

## envファイルの作成

開発用:

```bash
cp .env.development.example .env.development
```

本番用:

```bash
cp .env.production.example .env.production
```

VPSで本番だけを運用する場合は、本番用を `.env` として置く運用でもかまいません。

```bash
cp .env.production.example .env
```

`.env.production` または `.env` の `POSTGRES_PASSWORD` は必ず強い値に変更してください。

`DATABASE_URL` と `POSTGRES_*` は同じ値に揃えます。

```env
DATABASE_URL="postgresql://hamster_user:change_me_to_a_strong_password@db:5432/hamster_manager?schema=public"

POSTGRES_DB="hamster_manager"
POSTGRES_USER="hamster_user"
POSTGRES_PASSWORD="change_me_to_a_strong_password"
```

対応関係:

```text
DATABASE_URL のユーザー名 = POSTGRES_USER
DATABASE_URL のパスワード = POSTGRES_PASSWORD
DATABASE_URL のDB名       = POSTGRES_DB
DATABASE_URL のホスト     = db
DATABASE_URL のポート     = 5432
```

Docker Compose上では、Next.jsコンテナからPostgreSQLコンテナへ `db:5432` で接続します。

## ローカル開発

DBもアプリもDocker Composeで動かす場合:

```bash
npm install
cp .env.development.example .env.development
ENV_FILE=.env.development docker compose up -d
ENV_FILE=.env.development docker compose exec app npx prisma migrate deploy
```

アプリは `http://localhost:3001` で開きます。

DBだけDockerで動かし、Next.jsをホスト側で `npm run dev` する場合は、ローカル用のenvを別途 `.env` として作成し、`DATABASE_URL` のホストを `localhost:5433` にします。

```env
DATABASE_URL="postgresql://hamster_user:dev_password@localhost:5433/hamster_manager_dev?schema=public"
POSTGRES_DB="hamster_manager_dev"
POSTGRES_USER="hamster_user"
POSTGRES_PASSWORD="dev_password"
```

その場合の起動例:

```bash
docker compose up -d db
npx prisma migrate dev
npx prisma db seed
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## Docker Composeで起動

本番用envを明示して起動する例:

```bash
cp .env.production.example .env.production
ENV_FILE=.env.production docker compose build
ENV_FILE=.env.production docker compose up -d
ENV_FILE=.env.production docker compose exec app npx prisma migrate deploy
ENV_FILE=.env.production docker compose logs -f app
```

`.env` を使う場合は `ENV_FILE` を省略できます。

```bash
cp .env.production.example .env
docker compose build
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose logs -f app
```

アプリはホスト側 `3001`、コンテナ内 `3000` で公開されます。

```text
http://localhost:3001
```

PostgreSQLデータは `hamster_manager_pgdata` volume に永続化されます。

## Prismaコマンド

```bash
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:generate
npm run prisma:seed
```

Docker Compose上で実行する場合:

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

`ENV_FILE` を使っている場合:

```bash
ENV_FILE=.env.production docker compose exec app npx prisma migrate deploy
```

## VPSデプロイ手順

Ubuntu上でDocker / Docker Composeを使う前提です。既存のNode.js / PM2アプリとは分離し、このアプリはPM2では管理しません。

```bash
cd ~/apps
git clone https://github.com/skaltanukiman/Hamster-Manager-Browser.git hamster-manager-browser
cd hamster-manager-browser
cp .env.production.example .env.production
nano .env.production
```

`.env.production` のパスワードは本番用に必ず変更してください。Docker Compose内のアプリからDBへ接続するため、`DATABASE_URL` は `db:5432` のままにします。

```bash
ENV_FILE=.env.production docker compose build
ENV_FILE=.env.production docker compose up -d
ENV_FILE=.env.production docker compose exec app npx prisma migrate deploy
ENV_FILE=.env.production docker compose logs -f app
```

コンテナ再起動:

```bash
ENV_FILE=.env.production docker compose restart app
```

停止:

```bash
ENV_FILE=.env.production docker compose down
```

アプリ更新:

```bash
git pull
ENV_FILE=.env.production docker compose build
ENV_FILE=.env.production docker compose up -d
ENV_FILE=.env.production docker compose exec app npx prisma migrate deploy
ENV_FILE=.env.production docker compose logs -f app
```

## Nginxリバースプロキシ例

NginxはVPSホスト側に置き、Docker上のNext.jsアプリへ転送します。

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

HTTPS化する場合は、Certbotなどで証明書を発行してください。

## 既存PM2アプリと同居する場合の注意

- このアプリは `docker compose` で管理し、PM2には登録しません。
- ホスト側公開ポートは `3001` です。既存アプリが使っているポートと重なる場合は `docker-compose.yml` の `3001:3000` を変更してください。
- DBコンテナ名は `hamster-manager-db`、アプリコンテナ名は `hamster-manager-web` です。
- PostgreSQLのDB名、ユーザー名、パスワードはこのアプリ専用にしてください。
- Dockerコンテナ内のNode.jsを使うため、VPSホスト側のNode.jsバージョンには依存しません。
- PostgreSQLはDocker volumeに保存されます。`docker compose down -v` はDBデータを削除するため、本番では使わないでください。

## DBバックアップ

例:

```bash
ENV_FILE=.env.production docker compose exec db pg_dump -U hamster_user hamster_manager > backup.sql
```

復元例:

```bash
ENV_FILE=.env.production docker compose exec -T db psql -U hamster_user hamster_manager < backup.sql
```

本番では、定期バックアップとVPS外への退避を検討してください。

