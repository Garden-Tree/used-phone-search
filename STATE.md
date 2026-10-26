# STATE ── 現在の決定と進行中の確認

更新規則は CLAUDE.md。経緯は `ideas/`、手順は `docs/`。

## 触ってはいけない（データ・計測の保護）

| 対象 | 理由 |
| --- | --- |
| `app/layout.tsx` の `verification.google` | Search Console の所有権確認 |
| ゲオ公式ECへのスクレイピング | Akamai が拒否。**回避策は取らない**。ゲオは楽天API経由のみ |
| 楽天APIで取った商品のリンク先 | 規約上、楽天市場（楽天アフィリエイト）以外へは張らない。A8 等を付けない |
| `rakuten-sync/config.php`・`RAKUTEN_INGEST_SECRET` | 秘密情報。Git に入れない・Claude は扱わない（ユーザーが入力） |
| 在庫の全件取得（`findMany`） | Neon の転送量（月5GB）。集計は DB 側で |
| サーバーの cron（2:40/8:40/14:40/20:40・10:00） | 取り込みと監視 |

## 決定事項

- **GA4**: 556047315（docs/measurement.md）
- **ホスティング**: Cloudflare Pages（`docs/cloudflare-pages.md`）
- **DB**: Neon（Launch）
- **IndexNow**: 毎日全件・Bing 登録済み
- **デザイン**: `docs/design.md`
- **相場**: 在庫がいちばん多い容量の中央値（容量を添える）
- **ページ方針**: 全ページ静的（1日4回）。budget/under-N は本表3機種未満・検索ページは noindex。検索の既定は全件・安い順（電池85%以上は切り替え）。店の比較 `/iphone/where-to-buy`（10/24〜）。横動画は同テーマのページに埋め込み（`lib/videos.ts`）
- **画面の店数は在庫がある店だけ**（`lib/activeShops.ts`）
- **店の一覧・バッテリー表記の種類は `lib/shops.ts` だけに書く**
- **スペック・保証期限・発売年月・Apple 修理料金・Pencil 対応は公式で確かめた値だけ**（`lib/*Specs.ts`・`*Catalog.ts`・`appleRepairPrices.ts`・`ipadPencil.ts`）
- **新品価格は公式で確かめた値だけ**（`lib/applePrices.ts`・`lib/officialPrices.ts`・毎月1日に見直し）
- **楽天の店**: ゲオ・じゃんぱら・ソフマップ・ニューズド・キタムラ・イオシス・MTM
  - 同じ会社の別の売り場は公式のカードにまとめる（イオシス⇔楽天・エムモバ⇔エムコム）
- **Amazon 整備済み品**: 10/11〜停止中
- **Yahoo! 7店**: VC 本体（2025875・2%。Secrets VC_SID 3784061・VC_PID 892733773・10/26〜）。もしもはメディア否認
- **収益の枠**: 回線（`SimTile`：機種・検索・予算別・店選び・比較。色のボタン＋月額・楽天は楽天アフィ・横動画の説明欄にも）・買取・iPhone の修理（`lib/buyback.ts`）
- **値動きの速報**: `scripts/price-alerts.ts`
- **広告のショート** `rakutenmobile`: PR は声・左上・説明欄。楽天モバイルのリンクは横動画だけ
- **相場レポート**: `/iphone/report/<月>`（`lib/monthlyReport.ts`）。終わった月を毎月1日に自動公開
- **掲載機種**: iPhone・iPad・Pixel・Galaxy・MacBook・Xperia・AQUOS・Apple Watch（Watch は storage＝mm）

## 確認台帳（計測・判定）

| 確認日 | 何を見るか | 基準・判断 |
| --- | --- | --- |
| **11/6** | GSC: 18 Pro 系のタイトル（10/23〜新品との差） | だめなら「新品より高い」を先頭に |
| **11/7・11/9** | サムネの A/B テスト（1本目は Studio の見込みで残り11日・10/26 時点） | 勝った型を次の回に |
| **11/1** | 横動画9本目（月次おすすめ・`longform/2026-11-01-monthly`）を取り直して公開 | 毎月作り直す |
| **10/31・11/16** | X 有料: 返信の表示・流入 | 返信 平均50 か 流入 週5。届かねば解約 |
| **10/27** | iPhone Duo の中古在庫 | 出たら catalog 等へ |
| **11/23** | TikTok 4週目 | 再生の中央値500 か フォロワー300。届かねば1日1本 |
| **12/1** | ahamo が段階制（40GB 3,135円〜）に → `lib/simPlans.ts` の月額 | |
| **毎月1日** | 出典の開き直し・相場レポートが出たか | 出ていなければビルドのログ |

## 進行中・外部条件待ち

- **A8 審査中**: バックマーケット・LINXAS・保険・回線（J:COM・X-mobile・UQ・LIBMO・Y!mobile 10/26 申請）
- **TikTok**: 10/26〜（個人）。`render --tiktok`（BGM なし・締めは URL）を手で・PR はまだ
- **Vercel の後片付け（ユーザー）**: Vercel を止める → Neon を Free に

## 次にやる（順序）

```
1. 収益: 1訪問 18円 → 30円（にこスマ枠・買取。ideas/10-25-analysis）。YouTube: 声はつむぎ・ずんだもんで比較（ideas/10-26・10/28 判定）・11/1 流入
2. 伸ばし方（ideas/10-24-growth）
3. X の日々の運用（ideas/x-posts）
```

## 期限のあるもの

| 期限 | 対象 |
| --- | --- |
| 2026/11/30 | シンレンタルサーバー（自動更新） |
| 2027/09/26 | 楽天ウェブサービスのアプリ有効期限（管理画面で Refresh） |
| 2027/10/05 | GitHub トークン `used-phone-search dispatch` |
