# 技術スタック詳細

このドキュメントでは、中古スマホ一括検索プロジェクトで使用されている技術スタックの詳細について記述します。

## フロントエンド (Frontend)
- **フレームワーク**: [Next.js 16 (App Router)](https://nextjs.org/)
- **ライブラリ**: [React 19](https://react.dev/)
- **スタイリング**: [Tailwind CSS 4](https://tailwindcss.com/)
- **言語**: [TypeScript](https://www.typescriptlang.org/)
- **主要コンポーネント**:
  - `InfiniteDeviceList`: Intersection Observer API を使用した段階的読み込み（無限スクロール）の実装。
  - `FilterPanel`: ショップ・価格・容量・ランク・バッテリー最大容量の絞り込み（URL パラメータ連動）。
  - `SortSelect`: 価格順、バッテリー容量順での動的な並び替え（URLパラメータ連動）。
  - `DeviceCard`: 在庫1件の表示とアフィリエイトリンクの生成（A8・楽天アフィリエイト）。iPad の Wi-Fi モデルは carrier=「Wi-Fiモデル」。
  - `PriceHistoryChart`: 価格推移の SVG グラフ（容量タブ・ホバーのツールチップ・表表示）。
- **ページ**: トップ・機種別 `/iphone/[slug]` `/ipad/[slug]`・iPad 一覧 `/ipad`・比較 `/compare/[slug]`・目的別 `/pick/[slug]`・予算別 `/budget/[slug]` は SSG + ISR（1時間）。検索 `/search` は動的。
  `/ipad/[slug]` は `/iphone/[slug]/page.tsx` を再エクスポートしている（中身は共通）。
- **OGP 画像**: `opengraph-image.tsx` + `next/og`。日本語フォントは Google Fonts から使用文字だけのサブセットを取得（`lib/ogFont.ts`）。

## バックエンド & API
- **API Routes**: Next.js Route Handlers (`app/api/` 内)
  - `/api/devices`: 在庫データ取得（無限スクロール用）。絞り込みは DB 側で完結（`lib/deviceSearch.ts`）。
  - `/api/ingest/rakuten?shop=<shopCode>`: 楽天API で取得した在庫の受け口（Bearer 認証・gzip・ショップ単位で洗い替え）。
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
- **共通処理** `scraper/common.py`: DB 接続情報の読み込み・洗い替え（安全チェック → DELETE → 一括 INSERT）・main（`run_scraper`）。
  新しいスクレイパーは「商品の dict のリストを返す関数」を書いて `run_scraper(ショップ名, 関数, 既定の取得数)` を呼ぶだけ。
- **実装済みスクレイパー**:
  - `scraper/iosis_scraper.py`: イオシスの iPhone・iPad。キャリア・SIMフリー判定の正規化。
  - `scraper/nicosuma_scraper.py`: にこスマの iPhone・iPad（コレクション単位の `__NEXT_DATA__`）。
  - `scraper/daiwan_scraper.py`: ダイワンテレコムの在庫情報を取得。並列処理による詳細取得。
  - `scraper/mmoba_scraper.py`: エムモバの在庫情報を取得。タイトルからの利用制限情報抽出。

## 楽天API 取り込み（ゲオモバイル・じゃんぱら・ソフマップの楽天市場店）
- `rakuten-sync/fetch.php`（PHP）をシンレンタルサーバー（固定IP）の cron で実行し、楽天市場 商品検索API（2026-07-01版）から取得。
  ショップごとに「iPhone」「iPad」の2語で検索してまとめ、gzip で `/api/ingest/rakuten?shop=<shopCode>` に送信。
  1検索3,000件の上限は価格帯の2分割で回避。一時エラーは2回までリトライ。1ショップの失敗で他は止めない。
- 正規化は受け口（TypeScript）側。ショップの登録は `lib/rakutenShops.ts`、商品名の読み取りは下の「コードの地図」。
- 詳細は [operations.md](./operations.md)。

## コードの地図（lib/）

| ファイル | 役割 |
| --- | --- |
| `shops.ts` | 比較対象の店の一覧（店名・表示名・iPad の有無・バッテリー表記の種類）。店名と店の数はここから作る |
| `catalog.ts` | iPhone のカタログ（シリーズ・バッジ）、slug ⇔ 機種名、機種別ページの URL（iPad は `/ipad/`） |
| `ipadCatalog.ts` | iPad のカタログと `canonicalIpadModel`（店ごとの表記を Apple の正式名にそろえる） |
| `deviceSearch.ts` | 検索の中核。`matchesModel`（13 と 13 mini を区別、iPad は正式名なら完全一致）・`resolveModelNames`（DB の実モデル名に解決、5分キャッシュ）・`buildWhere`・`buildOrderBy` |
| `modelInventory.ts` / `modelStats.ts` | 1機種分の在庫と、機種別ページ用の集計（容量・ランク・ショップ・バッテリー別、容量×ランクの最安値） |
| `priceHistory.ts` | 価格推移の記録（`PriceSnapshot`）と取得 |
| `marketStats.ts` | 全機種の相場（`/iphone`。いまの在庫から、機種ページと同じ数字）と値下がり（`PriceSnapshot` の7日前との比較） |
| `iphoneSpecs.ts` | iPhone の基本スペック（発売・チップ・画面・端子・認証）。確かめた機種だけ載せ、無い機種はページ側で省く |
| `compare.ts` / `picks.ts` / `budgets.ts`・`budgetStats.ts` | 比較の組・目的別・予算別ページの定義と集計。`minPriceByModel` は機種ごとの最安値（トップの機種一覧でも使う） |
| `rakutenShops.ts` | 楽天のショップ登録（shopCode → ショップ名・正規化関数）。`RAKUTEN_SHOP_NAMES` はリンクを楽天アフィリエイトに限る判定にも使う |
| `rakutenCommon.ts` | 楽天3店の読み取りの共通部品（`RakutenItem` 型・ランク・容量・型番の除去・キャリアの表記） |
| `rakutenGeo.ts` / `rakutenJanpara.ts` / `rakutenSofmap.ts` | 各店の iPhone の商品名の読み取り |
| `rakutenIpad.ts` | 3店の iPad の商品名の読み取り |
| `iphoneModelName.ts` | 機種名の表記ゆれの整え（「SE 第2世代」→「SE (第2世代)」）と、取り込む iPhone 名の妥当性チェック |
| `affiliate.ts` | リンク先の組み立て（A8 の提携ショップ表 `A8_PROGRAMS`・楽天アフィリエイト）と rel="sponsored" の判定 |
| `format.ts` | 金額（`yen`）・容量（`storageLabel`）の表示 |
| `ogFont.ts` | OGP 画像用の日本語フォント（使う文字だけのサブセット） |

- 検索（`/search`・`/api/devices`）は同じ `buildWhere` を使う。機種もショップも指定がなければ iPhone のみ。
  在庫のない機種名・知らない店名の検索ページは noindex
- 新しいショップ・機種の追加手順は [operations.md](./operations.md)
- iPad の機種名は `canonicalIpadModel` の1か所でそろえる。楽天3店は受け口で、イオシス・にこスマは Actions の `npm run normalize:ipad` で
- 読み取りや照合を変えたら `npm run test:normalize`（商品名の読み取り・iPad の正規化・機種照合の回帰テスト）

## インフラ・環境構築
- **コンテナ化**: [Docker Compose](https://docs.docker.com/compose/) を使用して PostgreSQL データベースを管理。
- **ホスティング**: Vercel（`main` への push で本番デプロイ）。
- **CI/CD**: GitHub Actions によるスクレイパーの定期実行（6時間ごと）と価格推移の記録。60日無操作での停止を防ぐため毎回ワークフローを自己有効化。
- **環境変数**: `.env` ファイルによる DB 接続情報の管理。
