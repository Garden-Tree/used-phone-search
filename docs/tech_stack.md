# 技術スタック詳細

このドキュメントでは、中古スマホ横断検索プロジェクトで使用されている技術スタックの詳細について記述します。

## フロントエンド (Frontend)
- **フレームワーク**: [Next.js 16 (App Router)](https://nextjs.org/)
- **ライブラリ**: [React 19](https://react.dev/)
- **スタイリング**: [Tailwind CSS 4](https://tailwindcss.com/)
- **言語**: [TypeScript](https://www.typescriptlang.org/)
- **主要コンポーネント**:
  - `InfiniteDeviceList`: Intersection Observer API を使用した段階的読み込み（無限スクロール）の実装。
  - `ShopFilter`: URLパラメータを使用したショップ別の絞り込み。
  - `SortSelect`: URLパラメータを使用した価格順などの並び替え。

## バックエンド & API
- **API Routes**: Next.js Route Handlers (`app/api/` 内)
  - `/api/devices`: ページネーション、フィルタリングに対応した在庫データ取得用エンドポイント。
- **ORM**: [Prisma](https://www.prisma.io/)
- **データベース**: [PostgreSQL](https://www.postgresql.org/) (Docker上で動作)

## データ収集 (スクレイパー)
- **言語**: [Python 3](https://www.python.org/)
- **主要ライブラリ**:
  - `BeautifulSoup4`: HTML解析用。
  - `Requests`: HTTPリクエスト用。
  - `psycopg2`: PostgreSQL 接続用。
- **実行スクリプト**:
  - `scraper/iosis_scraper.py`: イオシスの在庫情報を取得。
  - `scraper/geo_scraper.py`: ゲオモバイルの在庫情報を取得。
  - `scraper/nicosuma_scraper.py`: にこスマの在庫情報を取得。

## インフラ・環境構築
- **コンテナ化**: [Docker Compose](https://docs.docker.com/compose/) を使用して PostgreSQL データベースを管理。
- **環境変数**: `.env` ファイルによる設定管理。
