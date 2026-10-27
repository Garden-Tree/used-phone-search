# STATE ── 現在の決定と進行中の確認

更新規則は CLAUDE.md。経緯は `ideas/`、手順は `docs/`。

## 触ってはいけない（データ・計測の保護）

| 対象 | 理由 |
| --- | --- |
| `app/layout.tsx` の `verification.google` | Search Console の所有権確認 |
| ゲオ公式ECへのスクレイピング | Akamai が拒否。**回避策は取らない**。ゲオは楽天API経由のみ |
| 楽天APIで取った商品のリンク先 | 規約上、楽天市場（楽天アフィリエイト）以外へは張らない。A8 等を付けない |
| `rakuten-sync/config.php`・`RAKUTEN_INGEST_SECRET` | 秘密情報。Claude は扱わない |
| 在庫の全件取得（`findMany`） | Neon の転送量（月5GB）。集計は DB 側で |
| サーバーの cron（2:40/8:40/14:40/20:40・10:00） | 取り込みと監視 |

## 決定事項

- **GA4**: 556047315・**ホスティング**: Cloudflare Pages（docs/）
- **DB**: Neon（Launch）
- **IndexNow**: 毎日全件
- **デザイン**: `docs/design.md`
- **相場**: 在庫がいちばん多い容量の中央値（容量を添える）
- **ページ方針**: 全ページ静的（1日4回）。budget/under-N は本表3機種未満・検索ページは noindex。店の比較 `/iphone/where-to-buy`・新旧の比較 `/ipad/ipad-mini-new-vs-used`・`/mac/macbook-pro-m6-new-vs-used`。横動画は同テーマのページに（`lib/videos.ts`）
- **画面の店数は在庫がある店だけ**（`lib/activeShops.ts`）
- **店の一覧・バッテリー表記の種類は `lib/shops.ts` だけに書く**
- **スペック・保証期限・発売年月・Apple 修理料金・Pencil 対応は公式で確かめた値だけ**（`lib/*Specs.ts`・`*Catalog.ts`・`appleRepairPrices.ts`・`ipadPencil.ts`）
- **新品価格は公式で確かめた値だけ**（`lib/applePrices.ts`・`lib/officialPrices.ts`・毎月1日に見直し）
- **楽天の店**: ゲオ・じゃんぱら・ソフマップ・ニューズド・キタムラ・イオシス・MTM
  - 同じ会社の別の売り場は公式のカードに（イオシス⇔楽天・エムモバ⇔エムコム）
- **Amazon 整備済み品**: 停止中
- **Yahoo! 7店**: VC 本体（2025875）。もしもは否認
- **収益の枠**: 回線（`SimTile`・2年の総額 `/sim`）・買取・iPhone の「直す？買い替える？」（`RepairOrReplace.tsx`）
- **値動き速報**: `price-alerts.ts`
- **広告のショート** `rakutenmobile`: PR は左上・説明欄
- **相場レポート**: `/iphone/report/<月>`（`lib/monthlyReport.ts`）。終わった月を毎月1日に自動公開。1か月の値下がり（年数別）`/iphone/price-drop`
- **掲載機種**: iPhone・iPad・Pixel・Galaxy・MacBook・Xperia・AQUOS・Apple Watch（Watch の storage＝mm）
- **中古パソコン** `/pc`・予算別（10/27〜）: 表 `PcInventory`。PC WRAP・Qualit は直接（A8）、ソフマップ・じゃんぱら・イオシスは楽天

## 確認台帳（計測・判定）

| 確認日 | 何を見るか | 基準・判断 |
| --- | --- | --- |
| **再クロールの2週後** | 18 Pro 系のタイトル（10/23〜・未クロール。ideas/10-28-ai） | だめなら「最安値・相場｜N店比較」 |
| **11/7・11/9** | サムネの A/B テスト | 勝った型を次の回に |
| **11/1** | 横動画9本目（月次・`longform/2026-11-01-monthly`）を取り直して公開 | 毎月 |
| **10/31・11/16** | X 有料: 返信の表示・流入 | 返信 平均50 か 流入 週5。届かねば解約 |
| **随時** | iPhone Duo・iPad mini (A20 Pro)・MBP 14 M6（11/6 発売）の中古在庫 | 出たら catalog へ |
| **10/31 夜** | ショートの声 ipadgen↔pixelgen | 継続率 3pt 差 |
| **11/10** | 10/27 改修の前後（収益・18 Pro の CTR・Bing 引用。ideas/10-27） | 引用減なら冒頭を戻す |
| **11/23** | TikTok 4週目 | 再生の中央値500 か フォロワー300。届かねば1日1本 |
| **12/1** | ahamo 段階制（40GB 3,135円〜）→ `lib/simPlans.ts` | |
| **毎月1日** | 出典の開き直し・相場レポートが出たか | 出ていなければビルドのログ |
| **毎週月曜** | AI の問い（docs/measurement.md） | 2週続いて答えがなければ作る |

## 進行中・外部条件待ち

- **審査中**: A8 バックマーケット他6件／VC 3件（ideas/10-27-monetization）
- **TikTok**: 10/26〜・PR はまだ

## 次にやる（順序）

```
1. 収益: 1訪問 18円 → 30円（ideas/10-25-analysis）。YouTube: ショートの声・出だしの比較（ideas/10-27-shorts-plan）・在庫数ランキング stock
2. 伸ばし方（ideas/10-24-growth）
3. X の日々の運用（ideas/x-posts）
```

## 期限のあるもの

| 期限 | 対象 |
| --- | --- |
| 2026/11/30 | シンレンタルサーバー（自動更新） |
| 2027/09/26 | 楽天ウェブサービスのアプリ有効期限（管理画面で Refresh） |
| 2027/10/05 | GitHub トークン `used-phone-search dispatch` |
