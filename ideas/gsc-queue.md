# GSC の登録リクエストの順番（11/6 作成）

未登録 741件（GSC の更新は 10/23 で止まっている）の内訳: robots 332（10/23 より前の /search?…。今の robots は全許可）・noindex 304（在庫の少ない比較など意図どおり）・404 2・canonical 2・クロール済み未登録 52（ページは2件だけ。残りは OG 画像など）・検出未登録 49。**サイトマップに絞ると 354件中 登録301・未登録53**。今のサイトマップは 409件で、10/23 より後の 55件は GSC にまだ出ていない。
直したのはサイトマップだけ（下）。あとは1日10件ほどリクエストする。リクエストの前に URL 検査で登録済みなら飛ばす（レポートが古いので、下の一部はもう済んでいる）。

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
