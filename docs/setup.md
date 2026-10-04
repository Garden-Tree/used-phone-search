# セットアップガイド (Setup Guide)

このプロジェクトを他のマシンでセットアップし、動作させるための手順を説明します。

## 1. 前提条件 (Prerequisites)

以下のツールがインストールされていることを確認してください：
- **Node.js**: 20 以上（GitHub Actions は 24）
- **Python**: 3.9 以上
- **Docker & Docker Compose**: データベース (PostgreSQL) の起動に使用します
- **Git**

## 2. リポジトリのクローンと初期設定

```bash
git clone <repository-url>
cd used-phone-search
```

### 環境変数の設定
プロジェクト直下に `.env` ファイルを作成し、以下の内容を設定してください。

```env
# PostgreSQL 接続情報 (Docker用デフォルト)
DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/used_phone_db?schema=public"
```

本番環境（Vercel 等）では以下も設定してください。

| 変数名 | 用途 |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | 本番URL（例: `https://example.com`）。sitemap / canonical / OGP の絶対URLに使用。未設定時は `http://localhost:3000` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 の測定ID（例: `G-XXXXXXXXXX`）。未設定時は GA を読み込まない |

## 3. データベースの起動とスキーマ同期

Dockerを使用してデータベースを起動します。

```bash
# データベースの起動
docker-compose up -d

# Prisma スキーマの同期 (テーブル作成・インデックス作成)
npx prisma db push
```

## 4. フロントエンド (Next.js) のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```
ブラウザで `http://localhost:3000` を開き、サイトが表示されることを確認してください。

## 5. スクレイパー (Python) のセットアップ

スクレイパーを実行するには、Pythonの仮想環境を構築し、依存ライブラリをインストールする必要があります。

```bash
cd scraper

# 仮想環境の作成
python -m venv venv

# 仮想環境の有効化
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# ライブラリのインストール
pip install -r requirements.txt
```

### スクレイパーの実行
全ショップのスクレイピングを一括で並列実行するには、`run_all_scrapers.py` を使用します。

```bash
# 仮想環境が有効な状態で実行
python run_all_scrapers.py
```

※ 個別に実行したい場合は `python iosis_scraper.py` など各ファイルを直接実行してください。

## 6. トラブルシューティング

- **データベースに接続できない**: `docker ps` でコンテナが動いているか確認し、`.env` の `DATABASE_URL` が正しいかチェックしてください。
- **スクレイピングでエラーが出る**: 一部のショップ（ゲオなど）は強力なWAFを導入しているため、短時間に大量のリクエストを送るとIP制限がかかる場合があります。その場合は `MAX_PAGES` を減らすか、時間を置いて実行してください。
- **ゲオ・じゃんぱら・ソフマップの在庫について**: 楽天市場店の在庫を楽天市場の商品検索APIで取得しています（ゲオの公式ECは自動アクセスを拒否しているため）。楽天アプリは許可IP制なので、**手元のPCからは API を呼べません**。取得はシンレンタルサーバー（固定IP。楽天アプリの許可IPに登録済み）の cron で `rakuten-sync/fetch.php` を実行し、`/api/ingest/rakuten` に送信する構成です（Cloudflare Pages 版はサーバーに JSON を保存し、Actions が HTTPS で取ってきて取り込む。`docs/cloudflare-pages.md`）。秘密の値はサーバーの `rakuten-sync/config.php` と Vercel の `RAKUTEN_INGEST_SECRET` にあり、Git には含めていません。動作ログはサーバーの `rakuten-sync/fetch.log` を参照してください。商品名の読み取りを変えたときは、楽天の公開ページから商品名をコピーして `normalize*` 関数に通して確認します（手順は `docs/operations.md`）。
- **価格推移のグラフが表示されない**: `PriceSnapshot` テーブルに2日分以上の記録が必要です。記録は GitHub Actions のスクレイパー実行後に `npm run snapshot:prices` で自動的に行われます（手動実行も可能。同じ日に複数回実行しても上書きされるだけです）。スキーマ変更後は `npx prisma db push` を忘れずに実行してください。
- **スクレイパーの定期実行が止まっている**: GitHub は公開リポジトリで60日間コミットがないと、定期実行（schedule）を自動で無効にします。Actions タブで「Phone Inventory Scraper」を再度有効にしてください。
- **「洗い替えを中止しました」と表示される**: 取得件数が既存データの50%未満だったため、在庫データの消失を防ぐ安全装置が作動しています（`scraper/common.py` の `ensure_safe_to_replace`）。意図的に件数を減らした場合は `FORCE_REPLACE=1` を付けて実行してください。比率は `MIN_REPLACE_RATIO` で変更できます。
- **`npx eslint .` で大量のエラーが出る**: `scraper/venv`（Python 仮想環境）の中身です。`eslint.config.mjs` で除外済み。アプリのコードは `npx eslint app lib scripts` で確認できます。
- **Next.js のビルドエラー**: `node_modules` を一度削除して `npm install` をやり直してください。
