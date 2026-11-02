# STATE ── 現在の決定と進行中の確認

規則 CLAUDE.md・経緯 ideas・手順 docs

## 触ってはいけない（データ・計測の保護）

| 対象 | 理由 |
| --- | --- |
| `app/layout.tsx` の `verification.google` | Search Console の所有権確認 |
| ゲオ公式ECへのスクレイピング | Akamai が拒否。**回避策は取らない**。ゲオは楽天API経由のみ |
| 楽天APIで取った商品のリンク先 | 規約上、楽天アフィリエイト以外へ張らない（A8 等なし） |
| `rakuten-sync/config.php`・`RAKUTEN_INGEST_SECRET` | 秘密情報 |
| 在庫の全件取得（`findMany`） | Neon の転送量。集計は DB 側で |
| サーバーの cron（2:40/8:40/14:40/20:40・10:00） | 取り込みと監視 |

## 決定事項

- **GA4**: 556047315・**ホスティング**: Cloudflare Pages（docs/）・**DB**: Neon（Launch）・**IndexNow** 毎日
- **デザイン**: `docs/design.md`・横動画は D1
- **相場**: 在庫がいちばん多い容量の中央値（容量を添える）
- **ページ方針**: 全ページ静的（1日4回）。budget/under-N は本表3機種未満・検索は noindex。横動画は同テーマのページに（`lib/videos.ts`）
- **店クリックの判定は28日・押した人数で**
- **保証1年の店の1台**: 機種ページの最安3行（`PickSummary`・`warranty_pick`）と /search（`warranty_pick_search`・11/2〜）
- **画面の店数は在庫がある店だけ**（`lib/activeShops.ts`）
- **店の一覧・バッテリー表記の種類は `lib/shops.ts` だけに書く**
- **スペック・保証・発売・修理料金・Pencil・新品価格は公式で確かめた値だけ**（`lib/*Specs`・`*Catalog`・`appleRepairPrices`・`ipadPencil`・`applePrices`・`officialPrices`。毎月1日に見直し）
- **楽天の店**: ゲオ・じゃんぱら・ソフマップ・ニューズド・キタムラ・イオシス・MTM
  - 同じ会社の別の売り場は公式のカードに（イオシス⇔楽天・エムモバ⇔エムコム）
- **Yahoo! 7店**: VC（2025875）。もしもは否認
- **収益の枠**: 回線（`SimTile`・2年の総額 `/sim`）・買取・iPhone の「直す？買い替える？」（`RepairOrReplace.tsx`。修理と保険＝A8 素材と社名だけ）
- **電池の判定** `/iphone/battery`: 交換（Apple・アイサポ）vs 中古−買取を1年あたり
- **買取価格**: ネットオフ・にこスマ・モバステ 週1・`/iphone/kaitori`。値動き速報 `price-alerts.ts`
- **相場レポート** `/iphone/report/<月>`（毎月1日）・`/how-long`・`/iphone/resale-value`
- **YouTube の公開予約は最長2日後まで**・ショートの声はずんだもん（比べる型は青山）
- **TikTok は 11/1 停止**（5本とも再生0〜1）
- **X**: 返信の2/3は見られている投稿へ・速報は1日1本（チェックリストと表を優先）・引用は1日1本・RTしない（x-ops）
- **ショート**: 1日2本（7〜8時・19〜21時）。在庫数と電池の型を優先・予算別は週1
- **掲載機種**: iPhone・iPad・Pixel・Galaxy・Mac・Xperia・AQUOS・Watch（storage＝mm）
- **中古パソコン** `/pc`・予算別（10/27〜）: 表 `PcInventory`。PC WRAP・Qualit・PC next・Be-Stock は A8、ソフマップ・じゃんぱら・イオシスは楽天

## 確認台帳（計測・判定）

| 確認日 | 何を見るか | 基準・判断 |
| --- | --- | --- |
| **11/12** | 18 Pro 系のタイトル | だめなら「最安値・相場｜N店比較」 |
| **11/7・11/9** | サムネの A/B | 勝った型を次に |
| **11/16** | X 有料（月920円） | 店クリック2週で0→解約 |
| **11/16** | 11/2 の打ち手（/search 保証1年・X の型・ショート1日2本） | にこスマ 14→30回/週・X 自分の投稿 2倍・28日再生 4万 |
| **随時** | Duo・mini A20・M6・PROLED の中古 | 出たら catalog へ |
| **11/2 夜** | 予算別（答えの出だし） | 問いの回と 3pt 差 |
| **11/10** | 10/27 改修の前後 | 引用減なら冒頭を戻す |
| **11/11** | 予算別・種類別一覧のタイトル（10/28〜） | CTR 0〜1% →3%以上 |
| **12/1** | ahamo 段階制（`simPlans.ts`）・Neon 11月 | 4GB 未満なら Free |
| **毎月1日** | 出典の開き直し・相場レポート | 出ていなければログ |
| **毎週月曜** | AI の問い（docs/measurement.md） | 2週続いて答えがなければ作る |
| **毎朝** | GSC 登録 約10件 | |

## 進行中・外部条件待ち

- **審査中**: A8 J:COM 他／VC 3件

## 次にやる（順序）

```
1. 収益: 1訪問 16円 → 30円。/search に保証1年の行・X は返信と型の入れ替え（ideas/11-02-analysis）
2. 伸ばし方（ideas/10-24-growth）
3. X の日々の運用（ideas/x-posts）
```

## 期限のあるもの

| 期限 | 対象 |
| --- | --- |
| 2026/11/30 | シンレンタルサーバー（自動更新） |
| 2027/09/26 | 楽天ウェブサービスのアプリ有効期限（管理画面で Refresh） |
| 2027/10/05 | GitHub トークン `used-phone-search dispatch` |
