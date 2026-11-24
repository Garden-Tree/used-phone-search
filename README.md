# Used Phone Search (中古スマホ一括検索)

中古ショップ18店の在庫（約7.6万件・2026年11月24日時点）を一括で比較・検索できる Web サイトです（https://used.gadelog.com）。
iPhone・iPad・Mac・Pixel・Galaxy・Xperia・AQUOS・OPPO・Xiaomi・Apple Watch・Galaxy Watch・Pixel Watch・Windows の中古パソコンを扱います。

## 主な機能 (Key Features)

- 🔍 **横断一括検索** (`/search`): にこスマ・エムモバなどの公式サイト、楽天市場店（ゲオモバイル・じゃんぱら・ソフマップ・イオシスほか）、Yahoo!ショッピング店、Amazon 整備済み品。店の一覧は [lib/shops.ts](./lib/shops.ts)（中古パソコンの店は別）。在庫がない店・取得が止まった店は画面に出ない
- 📄 **機種別ページ** (`/iphone/[slug]` `/ipad/[slug]` `/pixel/[slug]` など): 相場（中央値）・最安値・容量別/ランク別/ショップ別の最安値・価格推移グラフ・最安在庫
- 💻 **中古パソコン** (`/pc`)
- 💴 **予算別ページ** (`/budget/under-N` など): 予算以下で買える機種
- ⚖️ **比較ページ** (`/compare/[slug]`): 「iPhone 13 と 14 はどっちがお得？」を実データで比較
- 🎯 **目的別・選び方**: `/pick/[slug]`、種類ごとの `guide`
- 💰 **買取・相場レポート**: `/iphone/kaitori`・`/iphone/resale-value`・`/iphone/report/<月>`・`/iphone/battery`
- 🖼️ **OGP 画像の自動生成**: 機種別・比較ページは最安値入り
- 🎛️ **高度なフィルタ・ソート**: 価格帯、容量、状態ランク、バッテリー最大容量（80/85/90/95%以上）、ショップ
- 🔄 **データ正規化**: ショップごとに異なるモデル名・ランク・キャリア表記を統一
- 🩺 **監視**: `/health.json`（ビルドのたびに書き出し）とサーバー cron で、データ更新の停止をメール通知

## 技術スタック (Technology Stack)

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide React
- **Database**: PostgreSQL（Neon）+ Prisma ORM
- **Scraper**: Python 3 (BeautifulSoup4, curl_cffi, psycopg2)。GitHub Actions で定期実行
- **楽天API 取り込み**: PHP（シンレンタルサーバーの cron）が JSON を保存 → Actions が取り込み（楽天市場の各店）
- **Yahoo!ショッピング・Amazon**: 公式の API で取得（GitHub Actions）
- **Hosting**: 静的書き出しを Cloudflare Pages で配信（`https://used.gadelog.com`。10/6 までは Vercel・`docs/retired.md`）

> 💡 構成の詳細は [docs/operations.md](./docs/operations.md) の「全体像」「構成の概要」を参照してください。

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
| [docs/changes.md](./docs/changes.md) | 変更と「やらない」判断の一覧 |
| [docs/retired.md](./docs/retired.md) | やって撤退したこと・使わなくなったもの |
| [ideas/](./ideas/) | 日付ごとの作業の経緯・分析（例: [2026-09-26](./ideas/2026-09-26.md)） |

## プロジェクト構造 (Project Structure)
- `app/`: Next.js アプリケーション（`iphone/`・`ipad/` など種類ごとと `compare/`・`pick/`・`budget/`・`search/`・`pc/`・`sim/`）
- `lib/`: 検索・集計・カタログ・比較の組・楽天の正規化など（おもなファイルは [docs/operations.md](./docs/operations.md) の「構成の概要」）
- `scraper/`: 各ショップ向け Python スクレイパー（GitHub Actions で実行）。DB への書き込みは `common.py` に共通化
- `rakuten-sync/`: 楽天API の取得スクリプト（シンレンタルサーバーに設置）
- `scripts/`: 価格推移の記録・iPad の機種名の正規化・読み取りの回帰テスト（`npm run test:normalize`）
- `shorts/`・`longform/`: YouTube のショートと横動画の作成
- `prisma/`: データベーススキーマ定義
