# STATE ── 現在の決定と進行中の確認

更新規則は CLAUDE.md。経緯は `ideas/`、手順は `docs/`。

## 触ってはいけない（データ・計測の保護）

| 対象 | 理由 |
| --- | --- |
| `app/layout.tsx` の `verification.google` | 消すと Search Console の所有権確認が外れる |
| ゲオ公式EC（ec.geo-online.co.jp）へのスクレイピング | Akamai が拒否。**回避策は取らない**。ゲオは楽天API経由のみ |
| 楽天APIで取った商品のリンク先 | 規約上、楽天市場（楽天アフィリエイト）以外へは張らない。A8 等を付けない |
| `rakuten-sync/config.php`・`RAKUTEN_INGEST_SECRET` | 秘密情報。Git に入れない・Claude は扱わない（ユーザーが入力） |
| 在庫の全件取得（`findMany` で機種の行を丸ごと） | Neon 無料枠の転送量（月5GB）を使い切る。集計は DB 側で（`docs/operations.md`） |
| サーバーの cron（毎日 2:40/8:40/14:40/20:40・10:00） | 取り込みと監視。消すと停止に気づけない |

## 決定事項

- **GA4 は used 専用プロパティ 556047315（`G-YV3ZR0N6B1`）**（docs/measurement.md）
- **ホスティング**: Cloudflare Pages（10/6〜。`docs/cloudflare-pages.md`）
- **DB**: Neon（Launch。ideas/10-04）
- **データ更新**: シンの cron → Actions → 取り込み・書き出し・配置（`docs/operations.md`）
- **IndexNow**: 毎日サイトマップ全件。Bing 登録済み
- **デザイン**: `docs/design.md`（決定版 A+B・OG の決まり・ロゴ案1）
- **相場**: 在庫がいちばん多い容量の中央値（容量を添える。10/16〜）
- **ページ方針**: 全ページ静的（1日4回）。budget/under-N は本表3機種未満・検索ページは noindex。検索の既定は全件・安い順（電池85%以上は切り替え）。店の比較 `/iphone/where-to-buy`（10/24〜）。横動画は同テーマのページに埋め込み（`lib/videos.ts`）
- **画面の店数は表示中の在庫がある店だけ数える**（`lib/activeShops.ts`）。スクレイパー4店は取得が12時間止まると在庫を隠す（戻れば表示）
- **店の一覧・バッテリー表記の種類は `lib/shops.ts` だけに書く**（保証は各店の公式で確認）
- **スペック・保証期限・発売年月・Apple 修理料金・Pencil 対応は公式で確かめた値だけ**（`lib/*Specs.ts`・`*Catalog.ts`・`appleRepairPrices.ts`・`ipadPencil.ts`）
- **新品価格は公式で確かめた値だけ**（`lib/applePrices.ts`・`lib/officialPrices.ts`・毎月1日に見直し）
- **楽天の店**: ゲオ・じゃんぱら・ソフマップ・ニューズドテック・キタムラ・イオシス・エムティーエム
  - 同じ会社の別の売り場は公式のカードにまとめる（イオシス⇔楽天・エムモバ⇔エムコム）
- **Amazon 整備済み品**: 10/11〜停止中（資格が戻れば自動で再開）
- **Yahoo! 7店**: もしも経由（VC 審査後に VC）
- **収益の枠**: 機種ページの回線（`lib/simPlans.ts`）・買取・iPhone の修理（`lib/buyback.ts`）。修理料金・iPad 目安は非広告
- **相場レポート**: `/iphone/report/<月>`（`lib/monthlyReport.ts`）。終わった月を毎月1日に自動公開
- **掲載機種**: iPhone・iPad・Pixel・Galaxy・MacBook・Xperia・AQUOS・Apple Watch（Watch は storage＝mm）

## 確認台帳（計測・判定）

| 確認日 | 何を見るか | 基準・判断 |
| --- | --- | --- |
| **10/26** | GSC 10/18〜24 の CTR と順位（10/17〜19 の変更） | 前週 CTR 1.1%・順位10.7 |
| **10/30** | 横動画2本のタイトル＋サムネの A/B テスト（10/23〜） | 勝った組を採用・次の型に |
| **10/31・11/16** | X 有料: 返信の表示（前は中央値6）・流入 | 返信 平均50 か 流入 週5。届かねば解約 |
| **10/27** | iPhone Duo の中古在庫 | 出たら catalog 等へ（ideas/10-21） |
| **毎月1日** | 出典の開き直し（iOS・新機種・楽天API・規約）・相場レポートが出たか | 出ていなければビルドのログ |

## 進行中・外部条件待ち

- **A8 審査中**: バックマーケット・楽天モバイル・LINXAS・モバイル保険
- **VC の審査（3784061）**: 通れば Yahoo!ショッピングに提携し sid/pid を Secrets へ
- **Vercel の後片付け（ユーザー）**: Vercel を止める → Neon を Free に

## 次にやる（順序）

```
1. YouTube: 横6本目（how-old）を書き出す。10/27 ショートの声の実験を判定（ideas/10-25）
2. 伸ばし方（ideas/10-24-growth の1・3: CTR・月次レポート）
3. X の日々の運用（ideas/x-posts）
```

## 期限のあるもの

| 期限 | 対象 |
| --- | --- |
| 2026/11/30 | シンレンタルサーバー（自動更新） |
| 2027/09/26 | 楽天ウェブサービスのアプリ有効期限（管理画面で Refresh） |
| 2027/10/05 | GitHub トークン `used-phone-search dispatch`（作り直して config.php を差し替え） |
