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
  - `DeviceCard`: 各ショップの正規化されたデータの表示、およびアフィリエイトリンクの自動生成（A8・楽天アフィリエイト）。
  - `PriceHistoryChart`: 価格推移の SVG グラフ（容量タブ・ホバーのツールチップ・表表示）。
- **ページ**: 機種別 `/iphone/[slug]`・比較 `/compare/[slug]`・目的別 `/pick/[slug]` は SSG + ISR（1時間）。検索 `/search` は動的。
- **OGP 画像**: `opengraph-image.tsx` + `next/og`。日本語フォントは Google Fonts から使用文字だけのサブセットを取得（`lib/ogFont.ts`）。

## バックエンド & API
- **API Routes**: Next.js Route Handlers (`app/api/` 内)
  - `/api/devices`: 在庫データ取得（無限スクロール用）。絞り込みは DB 側で完結（`lib/deviceSearch.ts`）。
  - `/api/ingest/rakuten`: 楽天API で取得したゲオの在庫の受け口（Bearer 認証・gzip）。
  - `/api/health`: データ鮮度の監視用（24時間以上更新なしで 503）。
- **ORM**: [Prisma](https://www.prisma.io/)
- **データベース**: [PostgreSQL](https://www.postgresql.org/)（本番は Neon。ローカルは Docker Compose も可）
  - `DeviceInventory`: 在庫（ショップごとに洗い替え）
  - `PriceSnapshot`: 価格推移（日付 × モデル × 容量）

## データ収集 (スクレイパー)
- **言語**: [Python 3](https://www.python.org/)
- **主要ライブラリ**:
  - `BeautifulSoup4`: HTML解析用。
  - `curl_cffi`: 難読化やフィンガープリント対策が必要なサイトへのリクエスト用。
  - `psycopg2`: PostgreSQL への高速な一括挿入用。
- **実装済みスクレイパー**:
  - `scraper/iosis_scraper.py`: イオシスの在庫情報を取得。キャリア・SIMフリー判定の正規化。
  - `scraper/geo_scraper.py`: ゲオモバイル公式EC用。**WAF で 403 のため現在は無効（取得数0）**。ゲオは下記の楽天API で取得。
  - `scraper/nicosuma_scraper.py`: にこスマの在庫情報を取得。
  - `scraper/daiwan_scraper.py`: ダイワンテレコムの在庫情報を取得。並列処理による詳細取得。
  - `scraper/mmoba_scraper.py`: エムモバの在庫情報を取得。タイトルからの利用制限情報抽出。

## 楽天API 取り込み（ゲオモバイル楽天市場店）
- `rakuten-sync/fetch.php`（PHP）をシンレンタルサーバー（固定IP）の cron で実行し、楽天市場 商品検索API（2026-07-01版）から取得。
  1検索3,000件の上限は価格帯の2分割で回避。gzip で `/api/ingest/rakuten` に送信し、`lib/rakutenGeo.ts` で正規化。
- 詳細は [operations.md](./operations.md)。

## インフラ・環境構築
- **コンテナ化**: [Docker Compose](https://docs.docker.com/compose/) を使用して PostgreSQL データベースを管理。
- **ホスティング**: Vercel（`main` への push で本番デプロイ）。
- **CI/CD**: GitHub Actions によるスクレイパーの定期実行（6時間ごと）と価格推移の記録。60日無操作での停止を防ぐため毎回ワークフローを自己有効化。
- **環境変数**: `.env` ファイルによる DB 接続情報の管理。
