# Hamster Manager Browser

Google スプレッドシートと GAS で管理していたハムスターの衛生管理・体重管理を、VPS 上で運用しやすい Web アプリとして作り直したものです。

Next.js アプリと PostgreSQL を Docker Compose で分離して動かします。VPS ホスト側の Nginx から Next.js コンテナへリバースプロキシする運用、または Tailscale などの VPN 経由で個人利用する運用を想定しています。既存の PM2 管理アプリとは別管理にします。

## 主な機能

### ダッシュボード

- 設定画面で選択したハムスターのカードを表示
- 表示ボード数は 1〜30 件で設定可能
- 表示対象数を超えるハムスターがいる場合は、表示するハムスターを選択可能
- 最新体重を表示
- トイレ掃除、砂場掃除、床材全交換、ハウス掃除ごとの最新状態を表示
- 掃除日は「経過日数」と「日付」をクリックまたはタッチで切り替え可能
- 管理中 / 管理外の状態をカード上に表示
- 長いメモは省略表示し、クリックまたはタッチで全文をモーダル表示
- メモや未記録の有無でカード高さが大きく崩れないように調整

### ハムスター管理

- ハムスターの登録、編集、削除
- 名前、メモ、誕生日、お迎え日を管理
- 名前は 15 文字以内
- メモは 2000 文字以内
- 誕生日、お迎え日は未来日入力不可
- 同名登録時はハムスター登録用のエラーメッセージを表示
- 管理中 / 管理外を切り替え可能
- 管理外のハムスターはプロフィール編集、衛生記録、体重記録をロック
- 管理外でもハムスター自体の削除と、管理中への復活は可能
- 一覧は表示対象を「登録順」「名前」から選択可能
- 並び順は「昇順」「降順」から選択可能
- 登録時は反映が分かりやすいよう、登録順 / 降順へ切り替え
- ハムスター名のリアルタイム検索に対応
- 検索は NFKC 正規化、小文字化、カタカナをひらがなへ寄せて比較
  - 例: `しろ` で `シロ` がヒット
  - 例: `シロ` で `しろ` がヒット
- 一覧は 20 件ごとにページング
- ページ移動は「最初へ」「前へ」「次へ」「最後へ」に対応
- 削除対象のチェックボックスは常時表示
- 1 件以上選択すると、選択アクションバーに「全選択」「全解除」「削除」を表示
- 削除前に確認ダイアログを表示
- 未保存の編集がある状態で他画面へ移動しようとすると確認モーダルを表示

### 衛生管理

- ハムスターと年月を選択して、月別の掃除記録を入力
- ハムスターまたは年月を変更すると即時切り替え
- 管理外ハムスターは通常プルダウンに表示せず、「管理外も含む」チェック時のみ候補に表示
- ハムスター選択 UI は設定画面で以下を切り替え可能
  - コンボボックス式
  - プルダウン式
- 初期表示ではハムスターを自動選択せず、選択後に入力表を表示
- 日別に以下を保存
  - トイレ掃除
  - 砂場掃除
  - 床材一部交換
  - 床材全交換
  - ハウス掃除
  - メモ
- PC / タブレット幅では表形式で入力
- スマホ幅では日別カード形式で入力
- 今日の日付は背景色で強調
  - 表形式では「今日」文言は表示しない
  - スマホのカード形式では「今日」バッジを表示
- 未来日は入力不可
- 管理外のハムスターは入力・保存不可
- スマホ幅では編集後に画面右下へ固定保存ボタンを表示
- 未保存の編集がある状態で他画面へ移動しようとすると確認モーダルを表示

### 体重管理

- ハムスターを選択して体重を登録
- 管理外ハムスターは通常プルダウンに表示せず、「管理外も含む」チェック時のみ候補に表示
- 日付と体重(g)を保存
- 未来日は入力不可
- 体重は 1〜500g、0.1g 単位で入力可能
- 同じハムスター・同じ測定日の体重登録は、重複エラーとして表示
- 管理外のハムスターは登録・編集・削除不可
- 折れ線グラフで体重推移を表示
- 履歴は DB 側で絞り込み・ソート・ページング
- 履歴は 20 件ごとにページング
- グラフは現在の表示条件に一致する全体の体重推移を表示し、ページング中の一覧ページだけには限定しない
- 表示フィルター
  - 全件
  - 月ごと
- 月ごとの候補は体重記録日に存在する年月から自動作成
- 「全件」表示時は対象月の選択を非表示
- ソート対象
  - 登録順
  - 日付
  - 体重
- 並び順
  - 昇順
  - 降順
- 初期表示は日付 / 降順
- 体重登録後は反映が分かりやすいよう、登録順 / 降順へ切り替え
- ページ移動は「最初へ」「前へ」「次へ」「最後へ」に対応
- 削除対象のチェックボックスは常時表示
- 1 件以上選択すると、選択アクションバーに「全選択」「全解除」「削除」を表示
- 削除前に確認ダイアログを表示
- 未保存の編集がある状態で他画面へ移動しようとすると確認モーダルを表示

### 体重 CSV エクスポート

- `/weights/export` から体重記録を CSV ダウンロード
- ハムスター指定、年月指定で絞り込み可能
- 旧 `/export` は `/weights/export` へリダイレクト
- 体重管理画面から CSV エクスポート画面へ移動可能

### 体重 CSV インポート

- `/weights/import` から GAS 版で出力した体重管理 CSV を取り込み
- UTF-8、ヘッダー行あり、カンマ区切り CSV に対応
- 必須列
  - `date`
  - `hamster`
  - `weight`
- 想定列
  - `id`
  - `date`
  - `hamster`
  - `weight`
  - `unit`
  - `create_date`
  - `update_date`
- `id` は GAS 側の管理 ID として扱い、アプリ側 DB の ID には使わない
- `hamster` は既存ハムスター名と照合
- 未登録のハムスター名、管理外ハムスター、日付不正、体重不正はエラーとして表示
- 同じハムスター・同じ測定日の既存記録、または CSV 内重複はスキップ
- 取り込み後に登録成功件数、スキップ件数、エラー件数、エラー詳細を表示
- 体重管理画面へ戻るボタンあり

### 設定

- ダッシュボードの表示ボード数を設定
- 表示ボード数の上限は 30 件
- ダッシュボードに表示するハムスターを選択
- 表示対象ハムスターの検索に対応
- 検索はハムスター一覧と同様に、ひらがな / カタカナを相互に一致
- ハムスター選択方式を切り替え
  - コンボボックス式
  - プルダウン式
- 保存ボタンまでスクロールする固定ボタンあり
- 狭い画面でもメイン UI と固定ボタンが被りにくいように余白を調整

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
- `/weights/export`
  - 体重 CSV エクスポート
- `/weights/import`
  - 体重 CSV インポート
- `/export`
  - `/weights/export` へリダイレクト
- `/settings`
  - 設定

## DB 設計

### `hamsters`

- `id`
- `name`
- `memo`
- `birthDate`
- `adoptionDate`
- `isActive`
- `createdAt`
- `updatedAt`

`name` はユニークです。同じ名前のハムスターは登録できません。

`isActive` は管理状態です。`false` のハムスターは管理外として扱い、プロフィール編集、衛生記録、体重記録をロックします。ハムスター自体の削除と、管理中への復活は可能です。

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
- `hamsterSelectorMode`
- `createdAt`
- `updatedAt`

認証なしの個人運用アプリなので、設定は固定 ID の 1 レコードに集約します。

`dashboardBoardCount` はダッシュボードの表示ボード数です。

`hamsterSelectorMode` は、ハムスター選択 UI をコンボボックス式にするか、プルダウン式にするかを保存します。

### `dashboard_hamsters`

- `id`
- `settingId`
- `hamsterId`
- `sortOrder`
- `createdAt`
- `updatedAt`

ダッシュボードの表示対象ハムスターと表示順を保存します。

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
Next.js ホスト側:     3001
Next.js コンテナ側:   3000
PostgreSQL ホスト側:  127.0.0.1:5433
PostgreSQL コンテナ側: 5432
```

PostgreSQL は Docker volume に永続化されます。

```text
hamster_manager_pgdata
```

通常の停止では DB データは消えません。

```powershell
docker compose down
```

DB データも削除したい場合だけ `-v` を付けます。開発 DB を初期化したい時以外は使わないでください。

```powershell
docker compose down -v
```

### 開発環境の自動起動スクリプト

Windows 開発環境では、開発用の Docker Compose 起動フローをまとめたスクリプトを使えます。

基本的には `start-dev.bat` から起動する想定です。

```bat
start-dev.bat
```

`start-dev.bat` は文字コードを UTF-8 に切り替えたうえで、同じフォルダにある `start-dev.ps1` を PowerShell で実行します。

```bat
powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"
```

主な指定の意味:

- `-ExecutionPolicy Bypass`: `.ps1` や `npm.ps1` などが実行ポリシーでブロックされる環境向けに、この起動中だけ制限を回避します。
- `-File`: 実行する PowerShell スクリプトファイルを指定します。
- `%~dp0start-dev.ps1`: `.bat` と同じフォルダにある `start-dev.ps1` を指定します。
- `-NoExit`: 実行後も PowerShell ウィンドウを閉じず、エラー内容を確認しやすくします。

`-ExecutionPolicy Bypass` はスクリプト実行制限への対策です。Docker Desktop が未インストール、`.env.development` が存在しない、ポートが使用中、`docker-compose.yml` が不正といったエラーを回避するものではありません。自分で管理している開発用スクリプトに対して使ってください。

PowerShell から直接起動したい場合:

```powershell
.\start-dev.ps1
```

`start-dev.ps1` は次の処理をまとめて行います。

- スクリプトがあるリポジトリルートへ移動
- Docker Desktop を起動
- Docker が利用可能になるまで待機
- `ENV_FILE` に `.env.development` を設定
- `docker compose up -d app` で app と依存するコンテナを起動
- `http://localhost:3001` をブラウザで開く

初回起動前に `.env.development.example` をコピーして `.env.development` を作成してください。Prisma migrate や seed は自動実行しないため、初回セットアップ時やスキーマ変更時は必要に応じて別途実行します。

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
- Nginx は必要に応じて VPS ホスト側に配置
- このアプリは PM2 では管理しない
- 既存の Node.js / PM2 アプリとはポートとプロセス管理を分ける

### 1. 専用ユーザーでリポジトリを clone

アプリごとに Linux ユーザーを分けたい場合の例です。

```bash
sudo adduser hamster
sudo usermod -aG docker hamster
```

一度ログアウトして、`hamster` ユーザーで入り直します。

```bash
ssh hamster@your-vps-host
```

配置例:

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

`POSTGRES_PASSWORD` は必ず強い値に変更します。`DATABASE_URL` 側のユーザー名、パスワード、DB 名は `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB` と合わせます。

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

Docker Compose v1 の `docker-compose` で `KeyError: 'ContainerConfig'` が出る場合は、壊れた作成途中コンテナを削除するか、可能なら Compose v2 の `docker compose` を使ってください。

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

## Tailscale 経由で個人利用する場合

個人用で外出先のスマホから使うだけなら、アプリをインターネット全体へ公開せず、Tailscale 経由で VPS にアクセスする運用もできます。

VPS 側でアプリが起動していれば、Tailscale の MagicDNS 名または Tailscale IP とポート `3001` でアクセスします。

```text
http://<tailscale-hostname>:3001
```

この場合も Docker Compose の app はホスト側 `3001` で公開されます。Tailscale 側のアクセス制御は Tailscale 管理画面で行ってください。

## 既存アプリとの同居時の注意

- このアプリは Docker Compose で管理し、PM2 には登録しません。
- App コンテナ名は `hamster-manager-web` です。
- DB コンテナ名は `hamster-manager-db` です。
- ホスト側公開ポートは `3001` です。既存アプリと衝突する場合は `docker-compose.yml` の `3001:3000` を変更してください。
- PostgreSQL の DB 名、ユーザー名、パスワードはこのアプリ専用にします。
- `.env` はこのアプリ専用にします。
- Docker コンテナ内の Node.js を使うため、VPS ホスト側の Node.js バージョンには依存しません。
- PostgreSQL のホスト公開は `127.0.0.1:5433` に限定しています。

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
