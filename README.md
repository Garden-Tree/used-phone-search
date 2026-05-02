# Used Phone Search (中古スマホ横断検索)

日本全国の大手中古スマホショップの在庫を一括で比較・検索できるWebアプリケーションです。

## 主な機能 (Key Features)

- 🔍 **横断検索**: イオシス、ゲオモバイル、にこスマなど、大手中古ショップの在庫を一括検索
- ⚡ **高速な操作感**: Next.js 16 と無限スクロールによる、ストレスのない商品閲覧
- 🎯 **詳細フィルタ**: ショップ、コンディション（ランク）、価格帯、容量などでの絞り込み
- 📊 **リアルタイム収集**: Python スクレイパーにより、各ショップの最新在庫を定期的に同期

## 技術スタック (Technology Stack)

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Database**: PostgreSQL (Prisma ORM)
- **Scraper**: Python 3 (BeautifulSoup, curl_cffi)

> 💡 技術的な詳細については [docs/tech_stack.md](./docs/tech_stack.md) を参照してください。

---

## セットアップ (Setup)

開発環境の構築手順については、[セットアップガイド (docs/setup.md)](./docs/setup.md) を参照してください。

---

## プロジェクト構造 (Project Structure)
- `app/`: Next.js アプリケーションコード (App Router)
- `app/api/`: データ取得用APIエンドポイント
- `scraper/`: Python スクレイパー関連
- `prisma/`: データベーススキーマ定義
- `docs/`: 開発ドキュメント
