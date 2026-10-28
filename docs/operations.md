# 運用手順（インフラ・データ更新・障害対応）

## 全体像（2026-10-06〜 Cloudflare Pages。切り替えの経緯・戻し方は [cloudflare-pages.md](./cloudflare-pages.md)）

```
[シンレンタルサーバー cron 2:40/8:40/14:40/20:40] ~/rakuten-sync/fetch.php（約30分）
   楽天市場 商品検索API（ゲオモバイル・じゃんぱら・ソフマップの楽天市場店）
   └→ 公開フォルダの中の推測されにくいフォルダに <shopCode>.json.gz を保存（config.php の output_dir）
   └→ 3店とも終わったら GitHub の workflow_dispatch で Actions を起動（config.php の github_dispatch_token）
                                   ↓
[GitHub Actions scraper.yaml]  起動: 上の workflow_dispatch／定期実行 0:00/6:00/12:00/18:00 UTC（＝9/15/21/3時。数時間遅れ・取りこぼしあり）
 1. 4店のスクレイプ（イオシス・にこスマ・エムモバ・ダイワン）→ Neon（店ごとに洗い替え）
 2. 楽天3店の json.gz を HTTPS で取得（Secrets の RAKUTEN_DATA_URL）→ scripts/ingest-rakuten.ts → Neon
 3. iPad の機種名をそろえる → 公式とモール店（イオシス楽天・エムコム Yahoo）の突き合わせ（scripts/link-duplicate-shops.ts）→ 価格推移の記録 → scripts/check-health.ts
 4. next build（output: "export"）→ out/ → scripts/ci-deploy.sh deploy（wrangler pages deploy）
                                   ↓
              Cloudflare Pages（used.gadelog.com・プロジェクト used-phone-search）
               全ページ静的。検索ページは /data/inventory/<機種>.json をブラウザで絞り込む。監視用 /health.json
                                   ↑
[シンレンタルサーバー cron 毎日10:00] ~/rakuten-sync/healthcheck.php → /health.json とページ2つ
  → 問題（店の24時間停止・書き出しの14時間停止・ページが開けない）があるときだけ keigo3142011@yahoo.co.jp にメール
```

- **サイトの中身が変わるのは Actions が書き出したときだけ**。実行時に DB は使わない（Neon が起きるのは Actions の間だけ）
- Vercel は 10/20 ごろまで旧版を残している（DNS を戻せば旧版に戻る）。Vercel のプロジェクトを止めたら、この行と cloudflare-pages.md の「戻し方」を消す

## アカウント・秘密情報の置き場所

| 用途 | 場所 | 備考 |
| --- | --- | --- |
| DB 接続 | GitHub Secrets `DATABASE_URL`、ローカル `.env` | Neon（`ep-shy-sunset-...ap-southeast-1`）。**本番と同じ DB** |
| 配置 | GitHub Secrets `CLOUDFLARE_API_TOKEN`（Account / Cloudflare Pages / Edit だけ）・`CLOUDFLARE_ACCOUNT_ID` | ユーザーが作成・登録。Claude はトークンを扱わない |
| 楽天の JSON の場所 | GitHub Secrets `RAKUTEN_DATA_URL`（`https://gadelog.com/<推測されにくいフォルダ>/`）と `config.php` の `output_dir` | フォルダ名は Git に書かない |
| Yahoo!ショッピング API | GitHub Secrets `YAHOO_APP_ID`（Yahoo! デベロッパーネットワークのアプリの Client ID） | ユーザーが登録。未登録のあいだは Yahoo の取り込みを飛ばす。Claude は値を扱わない |
| Amazon Creators API | GitHub Secrets `AMAZON_CREDENTIAL_ID`・`AMAZON_CREDENTIAL_SECRET`・`AMAZON_PARTNER_TAG`（アソシエイトのトラッキングID）、Variables `AMAZON_CREDENTIAL_VERSION`（認証情報のバージョン。未設定は 3.3＝極東。3.1 北米・3.2 欧州） | ユーザーが登録。`AMAZON_CREDENTIAL_ID` が空なら Amazon の取り込みを飛ばす。Claude は値を扱わない |
| ValueCommerce のリンク | GitHub Secrets `VC_SID`（サイトID）・`VC_PID`（プロモーションID）→ ビルド時に `NEXT_PUBLIC_VC_SID`/`NEXT_PUBLIC_VC_PID` | リンクの URL に出る公開の値。未登録なら Yahoo のリンクはもしもアフィリエイト経由（a_id 5840289・p_id 1225。入れると ValueCommerce に切り替わる） |
| Actions の即時起動 | `config.php` の `github_dispatch_token`（Fine-grained・このリポジトリだけ・Actions: Read and write） | **期限 2027/10/05**。ユーザーが作成・入力 |
| 楽天API | `config.php`（アプリID・Access Key） | アプリ「中古スマホ一括検索」・Backend・許可IP 210.157.79.113 |
| サイトURL・GA4 | ワークフローの `NEXT_PUBLIC_SITE_URL`・`NEXT_PUBLIC_GA_ID=G-YV3ZR0N6B1`（公開される値なので直書き） | GA4 の詳細は `measurement.md` |
| DNS | シンドメイン → DNSレコード設定（`used` の CNAME → `used-phone-search.pages.dev`・TTL 300） | DNS の変更はユーザー（Claude Code の安全確認で止まる） |
| サーバー | シンレンタルサーバー sv3112（サーバーID wp760415、gadelog.com と共用） | ファイルマネージャ・Cron 設定はサーバーパネル（`https://secure.wpx.ne.jp/`） |

`config.php` は秘密情報。Claude は中身を読まない・書かない（文法の確認は一度だけの cron で `php -l` を実行し、結果のファイルだけ見る）。

## 定期処理

| いつ（日本時間） | どこで | 何を | ログ |
| --- | --- | --- | --- |
| 2:40/8:40/14:40/20:40 | サーバー cron | 楽天3店の取得と JSON の保存 → Actions を起動 | `~/rakuten-sync/fetch.log`（`<shopCode> saved:`・`dispatch: HTTP 204`） |
| 上の直後＋定期実行（9/15/21/3時ごろ） | GitHub Actions `Phone Inventory Scraper` | 取得・取り込み・価格推移・書き出し・配置・自己有効化 | Actions の実行ログ（失敗時は GitHub から通知メール） |
| 毎日9時ごろ（UTC 0時の定期実行） | GitHub Actions（配置の後） | IndexNow にサイトマップ全件を送る（下記） | Actions の実行ログ（`IndexNow: HTTP 200`） |
| 毎日10:00 | サーバー cron | `healthcheck.php`（問題時のみメール） | cron の通知メール |
| 毎日7:56 | サーバー cron（ブログ用・パネルが自動作成。「WordPressキャッシュ自動削除Cronを表示」で出る） | `wp-content/cache/` の3日より古いファイルを削除 | 出力なし（下記） |

- cron の通知アドレスを設定すると **すべての cron の出力がメールで届く**。WordPress キャッシュ削除の cron は
  キャッシュが空だと `find`/`rm` のエラーを毎朝出していたため、9/27 に `-print 2>/dev/null | xargs -r rm` に変更した
- このパネルのコマンド欄は `&`（`2>&1`・`&&`）・`-delete`・`[ ]` を受け付けない（黙って追加されないこともある）。標準エラーは別ファイルに出す
- 一度だけ動かしたいときは「分 時 日 月 *」で日付まで指定して追加し、終わったら削除する（来年の同じ日に動かないように）
- ゲオ公式ECは自動アクセスを拒否しているのでスクレイパーは持たない（9/27 に `geo_scraper.py` を削除。楽天API のみ）
- Actions の実行環境によっては、シンに 10 分以上つながらないことがある（10/7 15時・10/8 9時）。楽天の JSON が取れなかった回は失敗にせず、別の実行環境でワークフローを自動でやり直す（入力 `rakuten_retry`。2回まで。3回目も取れなければジョブを失敗＝通知）
- GitHub の定期実行は混むと数時間遅れ、回ごと飛ばされることもある（10/6 は 3:00 の回が 8:24 に起動・15:00 の回は起動せず）。だから楽天の取得の直後に起動している

## よくある対応

### 「データ更新に問題があります」メールが来た
1. メール本文の「問題」を見る（どのショップが何時間止まっているか・書き出しが止まっているか・ページが開けないか）
2. **書き出しが止まっている／全店が止まっている** → GitHub の Actions タブ
   - 実行が無い: ワークフローが無効（disabled）なら有効化 → 「Run workflow」で手動実行。`fetch.log` の `dispatch:` が 204 以外ならトークン（期限・権限）
   - 失敗している: ログを見る。「Cloudflare Pages へ配置」の失敗は API トークン・Pages の上限（ファイル数2万・月500デプロイ）
3. **楽天3店以外**（イオシス・にこスマ・エムモバ・ダイワン）だけが止まっている → Actions のログで該当ショップ（サイト構造の変更が多い）
4. **楽天3店**だけが止まっている → サーバーの `~/rakuten-sync/fetch.log`
   - `HTTP 401/403`：楽天アプリの有効期限・許可IP・Access Key
   - `saved: ... FAILED`：フォルダの書き込み権限・容量
   - Actions 側の「楽天市場店の在庫を取り込む」のログ: `ファイルが ... 時間前のもの` は fetch.php が動いていない、`件数が ... 50%未満` は楽天側の不調（続くなら確認）、`curl: (28) ... gadelog.com` が続くのは GitHub からシンに届かない事象（10/11・10/12・10/16。別の実行環境で自動でやり直す。2回やり直しても駄目なら失敗＝通知）
5. **ページが開けない** → `https://used.gadelog.com/` を開く。DNS（シンドメインの CNAME）・Cloudflare の Custom domains の状態・証明書を確認
6. **価格推移**が止まっている → Actions の「価格推移の記録」ステップ

### 失敗と警告の分け方（2026-10-21〜。一時的なアクセス拒否で毎回赤くしない）
相手のサイトの一時的な 403・429・タイムアウトは回避しない（STATE.md）。1回きりなら警告にし、続いたときだけジョブを失敗＝通知にする。
- **スクレイパーの実行**（`scraper/run_all_scrapers.py`）: 1店だけの失敗（0件・DB の一時的な切断・洗い替えの安全装置も含む）は `::warning::` で続ける（前回の在庫のまま）。**2店以上が同時に失敗**、または **Python の例外（Traceback）で止まった**ときは失敗
- **データ更新の監視**（`scripts/check-health.ts`。Amazon は年齢の判定から外す）
  - 失敗: 1店でも最終更新が **13時間超**（楽天は6時間ごと・スクレイパーと Yahoo は3〜6時間ごとなので、およそ2周期続けて取れていない）／**8時間超の店が2店以上**／「〇〇 が0件」が **前回（公開中の `/health.json`）にもあった**（読めなければ失敗側）／24時間更新なし・価格推移の停止・DB に接続できない（`lib/health.ts`）
  - 警告だけ: 8〜13時間の店が1店／「0件」が今回だけ
  - 中古パソコンの店（PC WRAP・Qualit）は11時間おき（1日2回）に取るので別の基準: **18時間超で警告・30時間超で失敗**。8時間超の店の数には入れない（10/28〜。前は毎回「9時間更新なし・2店」で失敗になっていた）
  - 判定だけ試す: `npx tsx scripts/check-health.ts --report <health.json> [--previous <health.json>]`（`--report` は DB を読まない）
- **取得が止まった店の在庫を隠す**（2026-10-23〜。`scraper/common.py` の `hide_stale_inventory`）: スクレイパー4店（にこスマ・イオシス・エムモバ・ダイワンテレコム）は、最終更新が **12時間超** なら在庫を全部 `isSoldOut` にする（行は消さない）。取得が戻れば洗い替えで自動的に表示に戻る。画面の店数も自動で減る（`lib/activeShops.ts`）。全部隠した店の「更新なし」は監視では警告だけ（`/health.json` の `hidden`）
  - イオシスを隠しているあいだは、楽天市場店（`ALIAS_SHOPS`）の在庫がイオシスとして出る（公式の行がないので隠されない）
- Yahoo・Amazon・楽天の取り込みの失敗の扱いは今までどおり（楽天は自動のやり直しあり）
- 警告は実行の Summary の Annotations に出る（通知メールは来ない）。サイト構造の変更・続くアクセス拒否は、在庫の古さか「0件」の2回目で失敗になる

### 買取価格（BuybackPrice・2026-10-28〜）
- `scraper/buyback_scraper.py`。iPhone だけ。ネットオフ（機種ページ約40本を5秒おき・容量×s/a/ab/b/c）・にこスマ（/sell の __NEXT_DATA__ を1回・A/B/C）・モバステ（運営パステック pastec.net/iphone を1回・未開封／中古の上限〜下限）
- Actions の「買取価格の取得」で、前回から6日たっていれば取る（週1回）。失敗しても止めない。取得が前回の半分未満なら洗い替えない。403・429 は回避しない（前回の値のまま）
- すぐ取り直す: `FORCE_BUYBACK=1 python buyback_scraper.py`。取り込まずに確かめる: `--dry`
- 使うところ: `/iphone/resale-value` の「いま売ると」（3店のきれいな状態＝ネットオフ a・にこスマ A・モバステ used_max のうち最高。`lib/resaleValue.ts` の BUYBACK_GOOD_GRADES）
- 掲載はユーザーの判断で OK（10/28）。規約は「スクレイピング」を名指しで禁じていないが、営利目的・不適当な行為の条項はある（ideas/2026-10-28.md）

### 在庫が急に減った・消えた
- スクレイパーも楽天の取り込みも「件数が既存の50%未満なら洗い替えを中止」する。意図的に減らしたときは
  スクレイパーは `FORCE_REPLACE=1`、楽天は `npx tsx scripts/ingest-rakuten.ts <dir> --allow-shrink`

### サイトを今すぐ更新したい
- GitHub の Actions → Phone Inventory Scraper → Run workflow（main）。在庫の取得から配置まで約16分（イオシスなどが止まっていなければ）
- **コード・見た目だけ直したとき**は `site_only` を `true` にして実行（`gh workflow run scraper.yaml --ref main -f site_only=true`）。在庫の取得・取り込み・価格推移・監視を飛ばし、書き出しと配置だけ（約6〜7分。在庫と価格は前回の取り込みのまま）。10/23〜
- 実行は1本ずつ（concurrency）。実行中に新しく実行をかけると、順番待ちの分は最新の1本に置き換わる

### 店のサイトが止まっているとき（スクレイパー）
- イオシスは3ページずつ・1秒あけて取る（10/27 に 4ページ・0.5秒から少し遅くした。毎回1〜6ページが読み込みの時間切れになっていたため）。ある種類（iPhone・iPad など）の最初の3ページが全部取れなければその種類を打ち切る。途中でも3ページまとめての失敗が2回続いたら打ち切る（10/23〜。以前は 503 のまま上限200ページ×3回再試行し、1回28分・約1,440回の要求になっていた）
- 取れない状態が12時間続くと在庫は自動で隠れる（上の「取得が止まった店の在庫を隠す」）
- **ダイワンテレコムの公式サイトは 2026/10/21 19:00〜12月中旬（予定）リニューアルで休止**（トップが休止のお知らせ・一覧の URL は 404）。在庫は自動で隠れている。楽天市場店・Yahoo 店は営業中（サイトでは扱っていない）。再開したら一覧の URL が変わっていないかを確かめる

### 中古パソコン（PcInventory・2026-10-27〜）
- 取得は `scraper/pcwrap_scraper.py`（ノート category1=2・デスクトップ category1=1）と `scraper/qualit_scraper.py`（ノート ct01。EUC-JP）。どちらも**一覧ページだけ**を2秒おきに1本ずつ読む（商品ページ・画像・説明文は使わない。Qualit の利用規約 第3条）。売り切れが並び始めたページで止まる。1回 PC WRAP 約20回・Qualit 約4回の要求
- GitHub Actions の「中古パソコンの取得」で、前回から11時間たっていれば取る（1日2回まで）。失敗してもスマホの手順は止めない（`continue-on-error`）。すぐ取り直すときは手元で `FORCE_PC=1 python pcwrap_scraper.py`
- 取り込まずに確かめる: `python pcwrap_scraper.py --dry`（読めた件数と先頭15件）。読み取りのテストは `python test_pc_spec.py`（Actions でも毎回走る）
- ランクの対応（`scraper/pc_spec.py`）: PC WRAP 美麗＝A・特選＝B・標準＝C・訳あり＝J（新品は載せない）。Qualit は表記の S/A/B/C、訳あり品＝J。画面には店の表記も出す
- リンクは A8（`lib/affiliate.ts`。掲載サイト「中古スマホ一括検索」の商品リンク。飛び先は pcwrap.com・yrl-qualit.com の中だけ）。A8 の商品リンク作成で作った a8mat
- `/pc` は在庫20件未満のあいだ noindex・サイトマップに出さない（`PC_MIN_INDEX_ITEMS`）
- 予算別 `/pc/budget/under-30000`・`under-50000`・`under-80000`（`PC_BUDGETS`）。予算内のノート（訳あり以外・Windows 11 対応）が10件未満なら noindex・サイトマップ外
- **MacBook も取る**（10/27〜）: `scripts/ingest-pc-shops-mac.ts` が PC WRAP（os=42）・Qualit（ct25）の一覧から MacBook を読み、DeviceInventory に店名「PC WRAP」「Qualit」で入れる（/mac に出る）。機種名・メモリ・SSD は楽天の MacBook と同じ `canonicalMacModel`・`parseMacSpec`（Intel は落ちる）。訳あり品は入れない。11時間に1回まで（`FORCE_PC=1` で無視）。`--dry` で確かめられる。店の情報は `lib/shops.ts` の `MAC_ONLY_SHOPS`（スマホの店の数・一覧には入れない）
- **楽天市場店の中古ノート**（10/27〜・ソフマップ・じゃんぱら・イオシス）: fetch.php がスマホのファイルを置いたあと店ごとの検索語（ソフマップ・イオシスは「ノートパソコン」、じゃんぱらは商品名に必ずある「LCD」。NGKeyword: MacBook Chromebook iPad）で引き、`<shopCode>-pc.json.gz` に置く（失敗してもスマホは止めない）。Actions の「楽天市場店の中古パソコンを取り込む」が `scripts/ingest-rakuten-pc.ts` で PcInventory に洗い替える。読み取りは `lib/rakutenPc.ts`（テスト `npx tsx scripts/test-rakuten-pc.ts`）。リンクは楽天アフィリエイトだけ（店名で決まる）。ソフマップは商品名にスペックがないので、fetch.php が商品説明の〔CPU〕〔メモリ容量〕などを `spec` で送る。試し: `php fetch.php --dry --pc akiba-u-shop janpara pc-good`（サーバーパネルの cron は日本語・引用符を受け付けないので `--pc` を使う）。10/27 の試し: ソフマップ 85/90・イオシス 89/90・じゃんぱら（LCD）は Chromebook・モニターを除けばほぼ全部読めた
- 相場の推移は表 `PcPriceSnapshot`（形 × CPU × メモリ・1日1行）。`npx tsx scripts/snapshot-pc-prices.ts`（Actions の「中古パソコンの相場の記録」。失敗しても止めない）

### エムモバの公式とエムコム Yahoo!ショッピング店（2026-10-10〜）
- 同じ会社（株式会社エムコム）。`scripts/link-duplicate-shops.ts` がイオシスと同じ仕組みで、エムモバの行に Yahoo の価格・URL を添え、同じ商品の Yahoo の行を隠す。
  Yahoo の商品名に色がないので、鍵は 機種（空白を除く）・容量・ランク・価格（価格まで一致したものだけ）。カードの下に「Yahoo!ショッピングでも販売」（VC かもしも経由）が出る
- 店の数・一覧には数えない（`ALIAS_SHOPS`。絞り込みの「エムモバ」に含める）

### イオシスの公式と楽天市場店（2026-10-08〜）
- 2つは在庫を共有していて、同じ商品が両方に並ぶ（楽天が数%高い）。毎回の取り込みの後に `scripts/link-duplicate-shops.ts` が
  機種（空白を除く）・容量・色・キャリア・ランク・バッテリー80%未満かで突き合わせ、公式の行に楽天の価格・URL（`altPrice`・`altUrl`）を添え、
  公式のほうが安い（か同じ）楽天の行を `isSoldOut` で隠す。カードの下に「楽天市場でも販売」のリンク（楽天アフィリエイト）が出る
- 突き合わせのため、`lib/rakutenIosys.ts` は容量・色・キャリアを `scraper/iosis_scraper.py` と同じ読み方にしている。片方を変えたらもう片方も
- 店の数・一覧には数えない（`lib/shops.ts` の `ALIAS_SHOPS`。絞り込みの「イオシス」に含める）

### iPad の機種名
- 楽天3店の iPad は `lib/ipadCatalog.ts` の `canonicalIpadModel` で Apple の正式名にそろえる（チップ⇔世代の対応表込み）。
  カタログにない機種・画面サイズが書かれていない M 系 Air は取り込まない。新しい iPad が出たら `IPAD_CATALOG` に追加
- 検索は機種の指定がなければ iPhone のみ（`buildWhere`）。iPad は `/ipad` と機種別ページから

### Pixel の機種名（2026-09-30〜）
- スクレイパーが取り込むときに Google の表記（`Pixel 8a`・`Pixel 9 Pro Fold`）へそろえる（`scraper/common.py` の `canonical_pixel_model`）。Pixel 5a 以前は入れない
- 機種の一覧は `scraper/common.py` の `PIXEL_MODELS` と `lib/pixelCatalog.ts` の2か所。`npm run test:normalize` がずれを見つける。新しい Pixel が出たら両方と `PIXEL_INFO`（販売開始・保証年数）に足す
- MacBook（2026-10-15〜）: じゃんぱら・ソフマップ・イオシスだけ `fetch.php` の MAC_SHOP_CODES で「MacBook」も引く（ほかの店はモニタ等が数万件当たる）。読み取りは `lib/rakutenMac.ts`（機種は `lib/macCatalog.ts` の公式の部品番号表）。メモリは `memoryGB`、SSD は `storage`。ページができるまでトップの件数・値下がりから除き、価格の記録（PriceSnapshot）だけ先に取る
- Xperia・AQUOS（2026-10-15〜）: ゲオ・じゃんぱら・ソフマップ・イオシスだけ `fetch.php` の ANDROID_SHOP_CODES で「Xperia」「AQUOS」も引く（ゲオで約+85要求）。読み取りは `lib/rakutenAndroid.ts`（機種は型番優先で `lib/xperiaCatalog.ts`・`aquosCatalog.ts`）。イオシスは名前に容量がないので、ドコモの型番の表（ROM を公式で確認）にある機種だけ行にする。Amazon の検索には含めない。テストは `npm run test:android`
- Apple Watch（2026-10-15〜）: ゲオ・じゃんぱら・ソフマップ・イオシス・ニューズドテック（1号店・2号店）の6店だけ `fetch.php` の WATCH_SHOP_CODES で「Apple Watch」も引く（ゲオは約6,000件＝約210要求。1店あたりの要求数は約650で MAX_REQUESTS=1500 に収まる見込み）。読み取りは `lib/rakutenWatch.ts`（機種は `lib/watchCatalog.ts`。世代・ケースのサイズ（mm）・通信方式がそろったものだけ行にし、バンド・充電器・Series 5 以前・世代の分からない SE は取らない）。DB は modelName＝世代、storage＝mm、carrier＝GPS／GPS+Cellular。Amazon の検索には含めない。テストは `npm run test:watch`。新しい Apple Watch が出たら `WATCH_CATALOG`・`WATCH_INFO`（公式のサイズ・watchOS の対応・モデル番号）に足す
- 楽天3店: `fetch.php` の KEYWORDS に `Pixel`、読み取りは `lib/rakutenPixel.ts`（`lib/rakutenShops.ts` の byDevice で振り分け）。キャリア版も SIM フリー扱い（Pixel 6 以降は SIM ロック原則禁止の後の発売）
- エムモバは Pixel の一覧がなく、検索ページでも Pixel 6 以降は1件（9/30）なので取り込まない
- サーバーパネル・ファイルマネージャは 2026-09 から `https://secure.wpx.ne.jp/`（シンクラウド）。旧 `secure.shin-server.jp` は名前解決できない
- 洗い替えは店ごと（iPhone・iPad・Pixel をまとめて入れ直す）。ある回に Pixel の一覧だけ取れなかったときは、その店の Pixel が次の回まで消える。安全装置（店の合計件数が半分未満なら入れ直さない）は iPhone が多いので効かない

### IndexNow（2026-10-21〜。Bing・Yandex などへの更新通知）

- 何を: 書き出した `out/sitemap.xml` の URL（noindex のページは元々入っていない。`/search` も除外）を `https://api.indexnow.org/indexnow` に POST する（`scripts/indexnow.ts`）。ChatGPT 検索は Bing のインデックスを使うとされる
- 鍵: `public/619cc190a530a2739b8c46ad71b82fb9.txt`（`https://used.gadelog.com/619cc190a530a2739b8c46ad71b82fb9.txt` で中身が鍵だけ）。**公開が前提で秘密ではない**。消すと 403 になるので消さない。作り直すときはファイル名・中身・スクリプトの `KEY` を一緒に変える
- いつ: Actions の「IndexNow に更新を知らせる（1日1回）」。配置に成功した**定期実行のうち UTC 0〜5 時に動いた回（日本時間 9 時の回）だけ**。手動実行・楽天のやり直しでは送らない。失敗しても警告だけ
- 確かめ方: 実行ログの `IndexNow: HTTP 200`（202 は鍵の確認待ちで正常）。`::warning::` が出ていたら本文を見る（403 = 鍵ファイルが取れない・422 = ホスト違い・429 = 送りすぎ）。手元では `npx tsx scripts/indexnow.ts --dry-run [--sitemap https://used.gadelog.com/sitemap.xml]` で件数だけ見られる
- Bing Webmaster Tools に登録すると、IndexNow で受け取った URL が見られる（任意・ユーザー操作）

### 新しい iPhone が出た
1. 中古在庫が出たのを確認（楽天のゲオ店が早い）
2. `lib/catalog.ts` にシリーズ・モデルを追加（バッジは公式情報で確認）
3. 比較ページの組は `lib/compare.ts`（Pro/Pro Max の世代に追加）
4. 機種別・比較・OGP・sitemap は自動で増える

### 商品名の読み取りを確かめる（楽天API は手元から呼べない）
- 楽天の公開ページ（`https://search.rakuten.co.jp/search/mall/iPad/?sid=<ショップID>`）から商品名をコピーし、
  `npx tsx` の使い捨てスクリプトで `RAKUTEN_SHOPS[shopCode].normalize({...})` に通す
- 本番で試すなら、サーバーの Cron に一度だけ `php fetch.php` を追加し、終わったら削除する（`fetch.log` と、起動された Actions の取り込みログで確認）

### 楽天市場のショップを追加する
1. `lib/rakutenShops.ts` の `RAKUTEN_SHOPS` に shopCode・ショップ名・商品名の解析関数を追加（例: `lib/rakutenJanpara.ts`。1つの店名で複数の楽天店を見せるときは `sharedShopName: true`＝ニューズドテック）
   商品名は楽天の公開ページ（`search.rakuten.co.jp/search/mall/iPhone/?sid=<店の番号>`。商品ページは EUC-JP）から集めて `scripts/test-normalizers.ts` の CORPUS に足す
2. `rakuten-sync/fetch.php` の `SHOP_CODES` と `scripts/ci-deploy.sh` の `SHOP_CODES` に shopCode を追加 → fetch.php をサーバーへ上書き（先にサーバー、次の取得で JSON ができてから Actions が取りに行く）
3. `lib/shops.ts` の `SHOPS` に1行足す（トップの在庫数・絞り込み・OG 画像・説明文の店舗数はここから作られる。バッテリー表記の種類、
   保証・赤ロムの扱いと出典 URL もここ。保証は**その店の公式ページで確かめてから**書く）。
   店名が楽天の shopName とずれていないかは `npm run test:normalize` が確かめる
4. 規約上、リンクは楽天アフィリエイトのみ（`DeviceCard.tsx` は `RAKUTEN_SHOP_NAMES` で自動判定）

### Yahoo!ショッピングの店を追加する（2026-10-09〜。Quality Shop・モバステ・エムコム・リユスマ・Joshin 中古アウトレット・MyWiT・Be-Stock。`lib/shops.ts` に 10/10〜載せている）
- 流れ: Actions の「Yahoo!ショッピングの在庫を取り込む」が `scripts/fetch-yahoo.ts`（商品検索API v3 を直接呼ぶ。2秒に1回（30回ほどで 429 になったため。429 は30秒待って3回まで再試行）・先頭1,000件を超える検索は価格帯を割って取得）→
  `yahoo-data/<ストアID>.json.gz` → `scripts/ingest-rakuten.ts yahoo-data --family yahoo`（楽天と同じ洗い替え・半分未満なら中止の安全装置）。`YAHOO_APP_ID` が空なら飛ばす
1. `lib/yahooShops.ts` の `YAHOO_SHOPS` にストアID（`store.shopping.yahoo.co.jp/<ストアID>/` の部分）・ショップ名・商品名の解析関数を追加（例: `lib/yahooQualityShop.ts`）。
   商品名は店の検索ページ（`https://store.shopping.yahoo.co.jp/<ストアID>/search.html?p=iPhone+中古&b=1`。`b` は 1・31・61…）から集めて `scripts/test-normalizers.ts` の CORPUS に足す
   （`shopping.yahoo.co.jp/search?...&sid=` は店で絞り込まれない）
   （商品検索API v3 を `seller_id=<ストアID>&condition=used&in_stock=true` で呼んでも商品名を集められる。`description` にランク・バッテリー・キャリアが書かれている店が多く、`fetch-yahoo.ts` の `extract` が読む。保証は店の `guide.html`（`info.html` は会社概要だけ）にある）
2. `lib/shops.ts` の `SHOPS` に1行足す（`note` が "Yahoo!" で始まる店は絞り込みで「（Yahoo!）」と出る。保証・赤ロムは**その店の公式ページで確かめてから**書く）
3. リンクは、バリューコマース（サイト ID 3784061）の提携が通るまで**もしもアフィリエイト経由**（`lib/affiliate.ts` の `moshimoYahooUrl`。a_id 5840289・p_id 1225・メディア「中古スマホ一括検索」692048。GA4 の `link_type` は `moshimo`）。Secrets の `VC_SID`・`VC_PID` を入れると自動で ValueCommerce（2%。`vc`）に切り替わる。Yahoo の商品ページ以外へは張らない
4. API の応答の形・件数の上限を確かめるとき: `YAHOO_APP_ID=... npx tsx scripts/fetch-yahoo.ts --debug --shop <ストアID>`（最初の1商品の生の応答を出す）
- Yahoo! JAPAN のウェブサービスを使う側の表記（クレジット）は未対応。API 規約を確認して `app/components/AdDisclosure.tsx` に足す

### 買取の A8 テキストリンク（2026-10-12〜。モデルページの「今のスマホを売るなら」）
- `lib/buyback.ts` の `BUYBACK_PROGRAMS` に1件足せば増やせる。提携済み: モバゾウ・ノジマのスマホ買取・ダイワンテレコム（買取）
- a8mat は A8 のサイト別（中古スマホ一括検索＝サイト 002）のもの。URL・文言・1x1 画像（0.gif）は A8 の提供そのまま使う（加工しない）
- PR 表記を見出しの横に出している（ステマ規制）。GA4 は `shop_click`（`shop_name` 末尾に「（買取）」。docs/measurement.md）

### Amazon 整備済み品（Creators API。2026-10-09 実装・認証情報の登録待ち）
- 流れ: Actions の「Amazon 整備済み品を取り込む」が `scripts/fetch-amazon.ts`（機種 126 件 × 「<機種> 整備済み品」で SearchItems。1機種 最大5ページ＝最大 630 リクエスト・約12分。上限は1秒1回・1日 8,640 回）→
  `amazon-data/amazon.json.gz`（`{items, fetchedAt}`）→ `scripts/ingest-rakuten.ts amazon-data --family amazon`（洗い替え・半分未満なら中止の安全装置は楽天と同じ）。`AMAZON_CREDENTIAL_ID` が空なら飛ばす
- 規約（Creators API）: ①価格は取得から1時間・その他は1日まで ②リンクは `detailPageURL` をそのまま（アソシエイトのタグ付き。`affiliateUrl` は加工しない）
  ③価格に「○時点」と注意書き（`DeviceCard` の「価格は M/D HH:mm 時点」＝サイトを書き出した時刻、`AdDisclosure`）④取得データを誘導以外に使わない → **価格推移（`lib/priceHistory.ts`）から Amazon を除外**している
- 古い価格を出さない: `fetch-amazon.ts` が失敗するとファイルは書かれない → 取り込みが、最後の取り込みから20時間を過ぎた Amazon の在庫を売り切れ扱いにして隠す（ファイルがない・古いどちらも）。ジョブは失敗として通知される
- 有効にする手順: ①Secrets・Variables を登録 ②`npx tsx scripts/fetch-amazon.ts --debug --dry`（応答の形・タイトルの形・`condition` の値を確かめる）→ `lib/amazonRenewed.ts`・`scripts/test-normalizers.ts` の CORPUS を実物に合わせる
  ③初回の取り込みが通ったら `lib/shops.ts` のコメントアウトした Amazon の行を有効にする（保証・赤ロムは Amazon の公式ページで確かめてから）
- ランクは特徴欄の「プレミアム→A・優良→B・良い→C」、バッテリーは「90%以上」「80%以上」の表記があるときだけ（`fetch-amazon.ts` の `extract`）。実物の書き方に合わせて直す

### 楽天の取得スクリプトを更新する
- リポジトリの `rakuten-sync/fetch.php` を編集 → 手元の Docker の PHP で `php -l` → サーバーのファイルマネージャで `~/rakuten-sync/fetch.php` を上書き
  （編集欄は React。上書き前後の中身を SHA-256 で突き合わせると取り違えに気づける）
- `config.php` は上書きしない。お試しは `php fetch.php --dry janpara`（先頭3ページを `sample-janpara.json` に保存）。店を指定したときは Actions を起動しない

### DB スキーマを変える
- `prisma/schema.prisma` を編集 → `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` で差分を確認 → `npx prisma db push`
- **ローカルの `.env` は本番 DB を指している**。破壊的な差分（DROP・型変更）は実行前にユーザーに確認する

## Neon の無料枠（データ転送量 月5GB）

- 2026-09-27 に 88%（4.4GB）の警告。原因は機種別・比較・目的別ページと OGP 画像の再生成のたびに、機種の在庫を全件取り出して JS で集計していたこと
  （ビルドのたびに全ページ分が走るので、PR が多い日に急増）。PR #28 で DB 側の集計（groupBy/aggregate）＋最大7行の取得に変更
- **在庫の行をまとめて取り出す処理を書かない**。集計は `lib/modelInventory.ts` の `groupMinPrice`・`medianPrice` を使う
- ローカルの `next build` も `.env` の本番 DB を使う（全ページ分のクエリが走る）。確認はローカルの Docker の DB で（下記）
- 使用量は Neon の管理画面（Billing / Usage）。上限を超えるとその月は DB が止まり、取り込み・書き出しが失敗する
  （サイトは前回の書き出しのまま表示され続ける）

## デプロイ

- **push ではデプロイされない**。サイトに出るのは次の Actions の実行（楽天の取得の後・定期実行・手動の Run workflow）
- コードを変えたら: ローカルで `npx next build`（Docker の DB）→ main に push → Run workflow で即反映 → `https://used.gadelog.com` で確認
- 開発の流れ：ブランチ → PR → マージ（自動マージはリポジトリ設定で無効）。Vercel は `scripts/vercel-ignore.sh` で一切ビルドしない

## ローカルの確認用 DB（Docker）

- `docker compose up -d` でローカル Postgres。`DATABASE_URL="postgresql://user:password@localhost:5432/used_phone_db"` を付けて `npx prisma db push`・スクレイパー（`scraper/run_all_scrapers.py`）・`npx next dev` を動かすと、本番の Neon に触れずに在庫つきで確かめられる
- Docker Desktop が起動途中で止まる（`docker info` が返らない・`dockerDesktopLinuxEngine` が見つからない）とき: PC の再起動後に古いソケットが残るのが原因（9/30・10/3 に発生）。
  Docker のプロセスを止め `wsl --shutdown` → `%LOCALAPPDATA%\Docker\run` と `%LOCALAPPDATA%\docker-secrets-engine` を `.stale-日時` に名前を変えて起動し直す（削除・Reset to factory defaults はしない）
- Docker Desktop が起動しきらない（WSL の docker-desktop が Stopped のまま）とき: 前回の終了で残ったソケット（`%LOCALAPPDATA%\Docker\run\dockerInference`・`%LOCALAPPDATA%\docker-secrets-engine\engine.sock`）を消せずに落ちている。
  Docker を終了し、2つのフォルダを `.stale-日時` に名前を変えてから起動し直す（ファイル自体は消せない。「Reset to factory defaults」は押さない）
