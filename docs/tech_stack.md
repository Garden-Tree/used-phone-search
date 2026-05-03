# 技術スタック詳細

このドキュメントでは、中古スマホ一括検索プロジェクトで使用されている技術スタックの詳細について記述します。

## フロントエンド (Frontend)
- **フレームワーク**: [Next.js 16 (App Router)](https://nextjs.org/)
- **ライブラリ**: [React 19](https://react.dev/)
- **スタイリング**: [Tailwind CSS 4](https://tailwindcss.com/)
- **言語**: [TypeScript](https://www.typescriptlang.org/)
- **主要コンポーネント**:
  - `InfiniteDeviceList`: Intersection Observer API を使用した段階的読み込み（無限スクロール）の実装。
  - `FilterPanel`: 価格、ストレージ、ランク、バッテリー状態によるマルチ条件フィルタリング機能。
  - `SortSelect`: 価格順、バッテリー容量順での動的な並び替え（URLパラメータ連動）。
  - `DeviceCard`: 各ショップの正規化されたデータの表示、およびアフィリエイトリンクの自動生成。

## バックエンド & API
- **API Routes**: Next.js Route Handlers (`app/api/` 内)
  - `/api/devices`: 複雑なクエリパラメータに対応した在庫データ取得用エンドポイント。Prisma を介した柔軟な DB クエリを実行。
- **ORM**: [Prisma](https://www.prisma.io/)
- **データベース**: [PostgreSQL](https://www.postgresql.org/) (Docker Compose)

## データ収集 (スクレイパー)
- **言語**: [Python 3](https://www.python.org/)
- **主要ライブラリ**:
  - `BeautifulSoup4`: HTML解析用。
  - `curl_cffi`: 難読化やフィンガープリント対策が必要なサイトへのリクエスト用。
  - `psycopg2`: PostgreSQL への高速な一括挿入用。
- **実装済みスクレイパー**:
  - `scraper/iosis_scraper.py`: イオシスの在庫情報を取得。キャリア・SIMフリー判定の正規化。
  - `scraper/geo_scraper.py`: ゲオモバイルの在庫情報を取得。正規表現によるランク判定。
  - `scraper/nicosuma_scraper.py`: にこスマの在庫情報を取得。
  - `scraper/daiwan_scraper.py`: ダイワンテレコムの在庫情報を取得。並列処理による詳細取得。
  - `scraper/mmoba_scraper.py`: エムモバの在庫情報を取得。タイトルからの利用制限情報抽出。

## インフラ・環境構築
- **コンテナ化**: [Docker Compose](https://docs.docker.com/compose/) を使用して PostgreSQL データベースを管理。
- **CI/CD**: GitHub Actions によるスクレイパーの定期実行スケジュール。
- **環境変数**: `.env` ファイルによる DB 接続情報の管理。
