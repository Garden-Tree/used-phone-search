# Used Phone Search (中古スマホ一括検索)

日本全国の大手中古スマホショップの在庫を一括で比較・検索できるWebアプリケーションです。

## 主な機能 (Key Features)

- 🔍 **横断一括検索**: イオシス、ゲオモバイル、にこスマ、ダイワンテレコム、エムモバの大手5ショップを網羅
- ⚡ **高速な操作感**: Next.js 16 (App Router) と無限スクロールによる、ストレスのない商品閲覧
- 🎯 **高度なフィルタ**: 価格帯、ストレージ容量、状態ランク、バッテリー残量による詳細な絞り込み
- 📊 **多角的なソート**: 価格の安い順・高い順に加え、バッテリー最大容量順での並び替えに対応
- 🔄 **データ正規化**: 各ショップで異なるランク表記やキャリア情報を独自ロジックで正規化
- 📱 **レスポンシブデザイン**: PC、タブレット、スマートフォンすべてのデバイスに最適化

## 技術スタック (Technology Stack)

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide React
- **Database**: PostgreSQL (Prisma ORM)
- **Scraper**: Python 3 (BeautifulSoup4, curl_cffi, psycopg2)

> 💡 技術的な詳細については [docs/tech_stack.md](./docs/tech_stack.md) を参照してください。

---

## セットアップ (Setup)

開発環境の構築手順については、[セットアップガイド (docs/setup.md)](./docs/setup.md) を参照してください。

---

## プロジェクト構造 (Project Structure)
- `app/`: Next.js アプリケーションコード
- `app/api/`: データ取得用APIエンドポイント
- `scraper/`: 各ショップ向け Python スクレイパー
- `prisma/`: データベーススキーマ定義
- `docs/`: 開発ドキュメント
