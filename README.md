# Used Phone Search（中古スマホ一括検索）

中古ショップの在庫を一括で比較・検索するサイト（https://used.gadelog.com）。iPhone・iPad・Mac・Android・Watch・中古パソコン。

- 技術: Next.js 16（静的書き出し）・Prisma＋Neon・Python スクレイパー・楽天API（PHP・シンのサーバー）・Cloudflare Pages
- 構成と運用: [docs/operations.md](./docs/operations.md)／セットアップ: [docs/setup.md](./docs/setup.md)

| ファイル | 内容 |
| --- | --- |
| [STATE.md](./STATE.md) | いまの決定・確認台帳・触ってはいけないもの（まずここ） |
| [docs/operations.md](./docs/operations.md) | 構成・秘密情報の置き場所・定期処理・障害対応 |
| [docs/measurement.md](./docs/measurement.md) | GA4・Search Console |
| [docs/design.md](./docs/design.md) | デザインの決まり |
| [docs/changes.md](./docs/changes.md) | 変更と「やらない」判断 |
| [docs/retired.md](./docs/retired.md) | 撤退したこと |
| [ideas/](./ideas/) | 日付ごとの経緯・分析 |

- `app/` ページ・`lib/` 集計・カタログ・読み取り・`scraper/` Python・`rakuten-sync/` 楽天取得・`scripts/` 取り込み・テスト・`longform/`・`shorts/` 動画・`prisma/` スキーマ
