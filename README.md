# Used Phone Search (中古スマホ一括検索)

日本全国の大手中古スマホショップの在庫を一括で比較・検索できるWebアプリケーションです。

## 主な機能 (Key Features)

- 🔍 **横断一括検索**: イオシス、ゲオモバイル（楽天市場店）、にこスマ、ダイワンテレコム、エムモバの大手5ショップを網羅
- 📄 **機種別ページ** (`/iphone/[slug]`): 最安値・容量別/ランク別/ショップ別の最安値・価格推移グラフ・最安在庫
- ⚖️ **比較ページ** (`/compare/[slug]`): 「iPhone 13 と 14 はどっちがお得？」を実データで比較（48組）
- 🎯 **目的別ページ** (`/pick/[slug]`): コスパ・予算・カメラ用途から探す
- 🖼️ **OGP 画像の自動生成**: 機種別・比較ページは最安値入り
- 🎛️ **高度なフィルタ・ソート**: 価格帯、容量、状態ランク、バッテリー残量、ショップ
- 🔄 **データ正規化**: ショップごとに異なるモデル名・ランク・キャリア表記を統一
- 🩺 **監視**: `/api/health` とサーバー cron で、データ更新の停止をメール通知

## 技術スタック (Technology Stack)

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide React
- **Database**: PostgreSQL（Neon）+ Prisma ORM
- **Scraper**: Python 3 (BeautifulSoup4, curl_cffi, psycopg2)。GitHub Actions で6時間ごと
- **楽天API 取り込み**: PHP（シンレンタルサーバーの cron）→ `/api/ingest/rakuten`
- **Hosting**: Vercel（`https://used.gadelog.com`）

> 💡 技術的な詳細については [docs/tech_stack.md](./docs/tech_stack.md) を参照してください。

---

## セットアップ (Setup)

開発環境の構築手順については、[セットアップガイド (docs/setup.md)](./docs/setup.md) を参照してください。

---

## ドキュメント (Docs)

| ファイル | 内容 |
| --- | --- |
| [STATE.md](./STATE.md) | **いまの決定・確認予定（確認台帳）・触ってはいけないもの**。まずここを読む |
| [docs/operations.md](./docs/operations.md) | 構成図・秘密情報の置き場所・定期処理・障害対応 |
| [docs/measurement.md](./docs/measurement.md) | GA4 / Search Console の設定と、いつ何を確認するか |
| [docs/setup.md](./docs/setup.md) | 開発環境のセットアップ |
| [docs/tech_stack.md](./docs/tech_stack.md) | 技術スタックの詳細 |
| [ideas/](./ideas/) | 日付ごとの作業の経緯・分析（例: [2026-09-26](./ideas/2026-09-26.md)） |

## プロジェクト構造 (Project Structure)
- `app/`: Next.js アプリケーション（`iphone/`・`compare/`・`pick/`・`search/`・`api/`）
- `lib/`: 検索・集計・カタログ・比較の組・楽天の正規化など
- `scraper/`: 各ショップ向け Python スクレイパー（GitHub Actions で実行）
- `rakuten-sync/`: 楽天API の取得スクリプト（シンレンタルサーバーに設置）
- `scripts/`: 価格推移の記録など
- `prisma/`: データベーススキーマ定義
