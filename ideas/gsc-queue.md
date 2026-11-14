# GSC の登録リクエストの順番（11/6 作成）

未登録 741件（GSC の更新は 10/23 で止まっている）の内訳: robots 332（10/23 より前の /search?…。今の robots は全許可）・noindex 304（在庫の少ない比較など意図どおり）・404 2・canonical 2・クロール済み未登録 52（ページは2件だけ。残りは OG 画像など）・検出未登録 49。**サイトマップに絞ると 354件中 登録301・未登録53**。今のサイトマップは 409件で、10/23 より後の 55件は GSC にまだ出ていない。
直したのはサイトマップだけ（下）。あとは1日10件ほどリクエストする。リクエストの前に URL 検査で登録済みなら飛ばす（レポートが古いので、下の一部はもう済んでいる）。

## 出さないページ（11/12〜）
- **登録済みのページには登録リクエストを出さない**（読み直されると評価が落ちることがある・ideas/2026-11-12.md「GSC で消えたクエリ」）。とくに表示が伸びている古い版のページ: /aquos/aquos-sense8・/aquos/aquos-r8-pro・/iphone/iphone-16・比較（10/18 以前にクロールされた14本）・iPad/Galaxy の予算別
- リクエストは「未登録」の URL だけ（URL 検査で登録済みなら飛ばす）

## 順番
1. /iphone/iphone-13-pro-max（クロール済み未登録）
2. /ipad/ipad-9th-gen（前回は割り当て超過で止まった）
3. /iphone/iphone-11・/iphone/iphone-xs-max
4. /mac/macbook-air-13-m2・/mac/macbook-pro-14-m4・/mac/macbook-neo（11/2 にリクエスト済み。登録されたか見る）
5. /mac/macbook-pro-14-m3-pro・/mac/macbook-pro-14-m5-pro・/mac/macbook-pro-16-m5-pro
6. /sumaho/budget/under-50000・/pick/camera
7. 比較 iPhone 20件・iPad 7件
8. /mac の残り 6件（13-m2・14-m3・14-m5-max・16-m1-max・16-m1-pro・16-m4-max）
9. /xperia/xperia-ace-iii

## リクエストしない（在庫0で noindex。11/6 時点）
/mac/macbook-pro-16-m4-pro・16-m3-max・14-m3-max・16-m2-max・14-m2-max・/xperia/xperia-10-viii。サイトマップ 409件を全部開いて noindex はこの6件だけで、DB の在庫0の機種と一致。11/6 にサイトマップから外した（在庫が戻れば次のビルドで載る）。

## 確認
GSC のレポートが更新されたら、サイトマップの絞り込みの未登録を見直す（`&pages=SITEMAP&sitemap=…/sitemap.xml`）。2週間たっても 10/23 のままなら GSC の遅れとして記録する。

## 進み具合
- 11/7 13時台: リクエスト8件（/iphone/iphone-13-pro-max・iphone-11・iphone-xs-max、/mac/macbook-pro-14-m3-pro・14-m5-pro・16-m5-pro、/sumaho/budget/under-50000、/pick/camera）。登録済みで飛ばした: /ipad/ipad-9th-gen・/mac/macbook-air-13-m2・macbook-pro-14-m4・macbook-neo。比較 iPhone 1件目の検査で「エラーが発生しました」が出たのでここまで。次は順番の 7（比較 /compare/iphone-13-vs-iphone-14 から）
- 11/8 1時台: リクエスト4件（/compare/iphone-13-vs-iphone-14・14-vs-15・15-vs-16・13-pro-vs-14-pro。どれも「検出・未登録」か「Google が認識していない」）。登録済みで飛ばした: 16-vs-17・11-vs-12・15-pro-vs-16-pro。5件目 14-pro-vs-15-pro で「割り当て量を超えています」（11/7 の8件と同じ日の枠。太平洋時間の0時＝17時に戻る）。次は 14-pro-vs-15-pro から（続けて 12-vs-13・12-pro-vs-13-pro・16-pro-vs-17-pro・17-pro-vs-18-pro・Pro Max の組）
- 11/8 9時台（方針）: 比較59ページを先に埋める（ideas/2026-11-08-growth の打ち手1）。順番は sitemap の /compare/ の並び（iPhone 世代→Pro→Pro Max→無印 vs Pro→Plus→e→SE→iPad→Pixel→Galaxy）。登録済みは飛ばす。1日10件で 11/13 ごろまで。枠が戻るのは 17時
- 11/8 20時台: 14-pro-vs-15-pro を検査（「URL が Google に登録されていません」・検出されず）→ リクエストで「割り当て量を超えています」。**17時（太平洋時間の0時）に戻る読みは外れた**。11/7 13時台の8件＋11/8 1時台の4件で、枠は日付でなく直近24時間の本数で決まっているらしい（11/8 1時台の4件から24時間後＝11/9 1時以降に戻る見込み）。次は 11/9 朝に 14-pro-vs-15-pro から。直接の inspect の URL（resource_id=…&id=…）は 404 になるので、サマリーの上の検査バーから入れる
- 11/10 16時台: **枠が戻った**。リクエスト6件（/compare/iphone-14-pro-vs-iphone-15-pro・12-vs-13・17-pro-vs-18-pro・11-pro-max-vs-12-pro-max・14-pro-max-vs-15-pro-max・15-pro-max-vs-16-pro-max）。登録済みで飛ばした: 12-pro-vs-13-pro・16-pro-vs-17-pro・11-pro-vs-12-pro・12-pro-max-vs-13-pro-max・13-pro-max-vs-14-pro-max・16-pro-max-vs-17-pro-max・17-pro-max-vs-18-pro-max・12-vs-12-pro。次は 12-pro-vs-12-pro-max から（無印 vs Pro → Plus → e → iPad → Pixel → Galaxy）
- 11/13 夜: リクエスト10件・どれも「リクエスト済み」（割り当て超過は出ず）。**もとの順番から3件**: /compare/iphone-12-pro-vs-iphone-12-pro-max・13-vs-13-pro・14-pro-vs-14-pro-max。**11/12 夜〜11/13 の新しいページから7件**: /oppo・/xiaomi・/compare/aquos-sense8-vs-aquos-sense9・sense7-vs-sense8・wish4-vs-sense8・sense9-vs-sense10・r8-vs-r9（どれも「登録されていません」。sitemap は検出済み・クロール待ち）。登録済みで飛ばした: 13-pro-vs-13-pro-max・14-vs-14-pro・15-vs-15-pro。次は (a) もとの順番の 15-pro-vs-15-pro-max から（16-vs-16-pro・16-pro-vs-16-pro-max・17-vs-17-pro … Plus → e → iPad → Pixel → Galaxy）と (b) 新しいページの残り: /compare/aquos-wish3-vs-wish4・wish4-vs-wish5・xperia-10-v-vs-10-vi・10-vi-vs-10-vii・1-v-vs-1-vi・1-vi-vs-1-vii・10-vi-vs-1-vi → OPPO・Xiaomi の機種ページ（在庫の多い機種から）。1日10件を (a)(b) 半々で
- 11/14 11時台: **リクエスト 0件**。1件目（/compare/xperia-10-vi-vs-xperia-1-vi）で「割り当て量を超えています」（11/13 夜の10件から24時間たっていない。枠は直近24時間の本数、の読みと合う）。検査だけ9件: **登録済みで飛ばした** /compare/iphone-15-pro-vs-iphone-15-pro-max・iphone-16-vs-iphone-16-pro・aquos-wish3-vs-aquos-wish4・aquos-wish4-vs-aquos-wish5・xperia-10-v-vs-xperia-10-vi。**未登録（次に出す）** /compare/xperia-10-vi-vs-xperia-10-vii・xperia-1-v-vs-xperia-1-vi・xperia-1-vi-vs-xperia-1-vii・xperia-10-vi-vs-xperia-1-vi（本番 200・noindex なしは確認済み）。次は 11/14 夜（11/13 のリクエストから24時間後）以降に、この4件 → (a) iphone-16-pro-vs-iphone-16-pro-max から → (b) OPPO・Xiaomi の機種ページ
- 11/14 14時台: **リクエスト 4件**（11時台の未登録4件 /compare/xperia-10-vi-vs-xperia-10-vii・xperia-1-v-vs-xperia-1-vi・xperia-1-vi-vs-xperia-1-vii・xperia-10-vi-vs-xperia-1-vi。どれも「検出 - インデックス未登録」だった）。割り当て超過なし（11時台の超過は 11/13 夜から24時間たっていなかったため、の読みと合う）。プロパティは URL プレフィックス型（https://used.gadelog.com/）で開く。次は (a) iphone-16-pro-vs-iphone-16-pro-max から
- 11/14 夜: 反映後に出す → /compare/ipad-a16-vs-ipad-air-5th-gen（新規）。/compare/iphone-15-vs-iphone-15-plus は登録済みならリクエストしない（決まり）
