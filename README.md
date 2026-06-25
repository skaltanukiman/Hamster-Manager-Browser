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

`.env.example` をコピーして `.env` を作成してください。

```bash
cp .env.example .env
```

Docker ComposeでアプリもDBも動かす場合:

```env
DATABASE_URL="postgresql://hamster_user:password@db:5432/hamster_manager?schema=public"
POSTGRES_DB="hamster_manager"
POSTGRES_USER="hamster_user"
POSTGRES_PASSWORD="password"
```

ホスト側で `npm run dev` を実行し、DBだけDockerで動かす場合は、`DATABASE_URL` のホストを `localhost:5433` にしてください。

```env
DATABASE_URL="postgresql://hamster_user:password@localhost:5433/hamster_manager?schema=public"
```

`.env` はGit管理しません。

## ローカル開発

```bash
npm install
cp .env.example .env
```

ホスト側でNext.jsを動かす場合は、`.env` の `DATABASE_URL` を `localhost:5433` に変更します。

```bash
docker compose up -d db
npx prisma migrate dev
npx prisma db seed
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## Docker Composeで起動

`.env` の `DATABASE_URL` は `db:5432` のままにします。

```bash
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

## VPSデプロイ手順

Ubuntu上でDocker / Docker Composeを使う前提です。既存のNode.js / PM2アプリとは分離し、このアプリはPM2では管理しません。

```bash
git clone <your-repository-url> hamster-manager-browser
cd hamster-manager-browser
cp .env.example .env
```

`.env` のパスワードは本番用に必ず変更してください。Docker Compose内のアプリからDBへ接続するため、`DATABASE_URL` は `db:5432` のままにします。

```bash
docker compose build
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose logs -f app
```

コンテナ再起動:

```bash
docker compose restart app
```

停止:

```bash
docker compose down
```

アプリ更新:

```bash
git pull
docker compose build
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose logs -f app
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
docker compose exec db pg_dump -U hamster_user hamster_manager > backup.sql
```

復元例:

```bash
docker compose exec -T db psql -U hamster_user hamster_manager < backup.sql
```

本番では、定期バックアップとVPS外への退避を検討してください。

