# Used Phone Search (中古スマホ一括検索)

大手中古ショップ7社の中古 iPhone・iPad の在庫（約3.4万件）を一括で比較・検索できるWebアプリケーションです。

## 主な機能 (Key Features)

- 🔍 **横断一括検索**: イオシス、ゲオモバイル（楽天市場店）、じゃんぱら（楽天市場店）、ソフマップ（楽天市場店）、にこスマ、ダイワンテレコム、エムモバの大手7ショップを網羅
- 📄 **機種別ページ** (`/iphone/[slug]` 41機種・`/ipad/[slug]` 32機種): 相場（中央値）・最安値・容量別/ランク別/ショップ別の最安値・価格推移グラフ・最安在庫
- 📱 **iPad 一覧** (`/ipad`): iPad・mini・Air・Pro を機種別に（iPad はイオシス・にこスマ・楽天3店の5社）
- 💴 **予算別ページ** (`/budget/under-N`): 1万〜10万円以下で買える機種を新しい順に（7ページ）
- ⚖️ **比較ページ** (`/compare/[slug]`): 「iPhone 13 と 14 はどっちがお得？」を実データで比較（48組）
- 🎯 **目的別ページ** (`/pick/[slug]`): コスパ・予算・カメラ用途から探す
- 🖼️ **OGP 画像の自動生成**: 機種別・比較ページは最安値入り
- 🎛️ **高度なフィルタ・ソート**: 価格帯、容量、状態ランク、バッテリー最大容量（80/85/90/95%以上）、ショップ
- 🔄 **データ正規化**: ショップごとに異なるモデル名・ランク・キャリア表記を統一
- 🩺 **監視**: `/api/health` とサーバー cron で、データ更新の停止をメール通知

## 技術スタック (Technology Stack)

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide React
- **Database**: PostgreSQL（Neon）+ Prisma ORM
- **Scraper**: Python 3 (BeautifulSoup4, curl_cffi, psycopg2)。GitHub Actions で6時間ごと
- **楽天API 取り込み**: PHP（シンレンタルサーバーの cron）→ `/api/ingest/rakuten?shop=…`（ゲオ・じゃんぱら・ソフマップ）
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
- `app/`: Next.js アプリケーション（`iphone/`・`ipad/`・`compare/`・`pick/`・`budget/`・`search/`・`api/`）
- `lib/`: 検索・集計・カタログ・比較の組・楽天の正規化など（ファイルごとの役割は [docs/tech_stack.md](./docs/tech_stack.md) の「コードの地図」）
- `scraper/`: 各ショップ向け Python スクレイパー（GitHub Actions で実行）。DB への書き込みは `common.py` に共通化
- `rakuten-sync/`: 楽天API の取得スクリプト（シンレンタルサーバーに設置）
- `scripts/`: 価格推移の記録・iPad の機種名の正規化・読み取りの回帰テスト（`npm run test:normalize`）
- `prisma/`: データベーススキーマ定義
