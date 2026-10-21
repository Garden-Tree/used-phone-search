# STATE ── 現在の決定と進行中の確認

更新規則は CLAUDE.md。経緯は `ideas/`、手順は `docs/`。

## 触ってはいけない（データ・計測の保護）

| 対象 | 理由 |
| --- | --- |
| `app/layout.tsx` の `verification.google` | 消すと Search Console（`https://used.gadelog.com/`）の所有権確認が外れる |
| ゲオ公式EC（ec.geo-online.co.jp）へのスクレイピング | Akamai が拒否。**回避策は取らない**。ゲオは楽天API経由のみ |
| 楽天APIで取った商品のリンク先 | 規約上、楽天市場（楽天アフィリエイト）以外へは張らない。A8 等を付けない |
| `rakuten-sync/config.php`・`RAKUTEN_INGEST_SECRET` | 秘密情報。Git に入れない・Claude は扱わない（ユーザーが入力） |
| 在庫の全件取得（`findMany` で機種の行を丸ごと） | Neon 無料枠の転送量（月5GB）を使い切る。集計は DB 側で（`docs/operations.md`） |
| サーバーの cron（毎日 2:40/8:40/14:40/20:40・10:00） | 取り込みと監視。消すと停止に気づけない |

## 決定事項

- **GA4 は used 専用プロパティ 556047315（`G-YV3ZR0N6B1`）**（docs/measurement.md）
- **ホスティング**: Cloudflare Pages（10/6〜。`docs/cloudflare-pages.md`）
- **DB**: Neon（Launch。Vercel を止めた後に Free へ。ideas/10-04）
- **データ更新**: シンの cron → Actions → 取り込み・書き出し・配置（`docs/operations.md`）
- **IndexNow**: 1日1回サイトマップ全件（`scripts/indexnow.ts`）。Bing WMT 登録済み（10/21・BingSiteAuth.xml）
- **デザイン**: 10/16〜「決定版 A+B」（`docs/design.md`）。OG は最安値と相場の横棒（10/21〜）
- **相場**: 在庫がいちばん多い容量の中央値（容量を添える。10/16〜）
- **ページ方針**: 全ページ静的（1日4回）。/sumaho/budget/under-N は本表3機種未満で noindex。検索ページは noindex。検品担当の文面・`/about` はユーザー確認後に変える
- **画面の店数は表示中の在庫がある店だけ数える**（`lib/activeShops.ts`）
- **店の一覧・バッテリー表記の種類は `lib/shops.ts` だけに書く**（保証は各店の公式で確認）
- **スペック・保証期限・発売年月・Apple 修理料金・Pencil 対応は公式で確かめた値だけ**（`lib/*Specs.ts`・`*Catalog.ts`・`appleRepairPrices.ts`・`ipadPencil.ts`）
- **新品価格は公式で確かめた値だけ**（`lib/applePrices.ts`・`lib/officialPrices.ts`・毎月1日に見直し）
- **楽天の店**: ゲオ・じゃんぱら・ソフマップ・ニューズドテック・キタムラ・イオシス・エムティーエム
  - 同じ会社の別の売り場は公式のカードにまとめる（イオシス⇔楽天・エムモバ⇔エムコム）
- **Amazon 整備済み品**: 10/11〜停止中（資格が戻れば自動で再開）
- **Yahoo!ショッピング 7店**: もしも経由（VC 審査後に VC）
- **収益の枠**: 機種ページの「回線も見直す」（`lib/simPlans.ts`）・「今のスマホを売る」・iPhone は「修理で済ませるなら」（`lib/buyback.ts`）。修理料金・iPad 目安のカードは非広告
- **掲載機種**: iPhone・iPad 32・Pixel 24・Galaxy 29・MacBook 35・Xperia 17・AQUOS 21・Apple Watch 14（Watch は storage＝mm）

## 確認台帳（計測・判定）

| 確認日 | 何を見るか | 基準・判断 |
| --- | --- | --- |
| **10/26** | 価格推移グラフ／GSC 10/18〜24 の CTR と順位（タイトルの金額・要約文・新品との差・内部リンク 10/17〜19） | 前週 CTR 1.1%・順位10.7（ideas/10-19） |
| **10/31・11/16** | X Basic（10/16 契約）: 返信1件の表示（前は中央値6）・X からの流入 | 返信 平均50 か 流入 週5。届かねば解約 |
| **10/27** | iPhone Duo の中古在庫 | 出たら catalog 等へ（ideas/10-21） |
| **毎月1日** | 出典の開き直し（iOS 対応・新機種・楽天API・各社規約） | |

## 進行中・外部条件待ち

- **A8 審査中**: バックマーケット・楽天モバイル（A8 版）・LINXAS・モバイル保険
- **VC の審査（サイト 3784061）**: 通れば Yahoo!ショッピング（2025875）に提携して sid/pid を Secrets へ
- **Vercel の後片付け（10/20 ごろ・ユーザー）**: Vercel のプロジェクトを止める → Neon を Free に（ideas/10-03〜06）

## 次にやる（順序）

```
1. YouTube ショート（週1・声 春日部つむぎ）: drops 10/21 公開。budget・newused（龍星）も10/21 公開。声とテーマの比較は数日後
2. X の日々の運用（ideas/x-posts）
```

## 期限のあるもの

| 期限 | 対象 |
| --- | --- |
| 2026/11/30 | シンレンタルサーバー（自動更新） |
| 2027/09/26 | 楽天ウェブサービスのアプリ有効期限（管理画面で Refresh） |
| 2027/10/05 | GitHub トークン `used-phone-search dispatch`（作り直して config.php を差し替え） |
