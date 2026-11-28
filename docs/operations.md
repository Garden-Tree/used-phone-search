# 運用手順（インフラ・データ更新・障害対応）

## 全体像

```
[シン cron 2:40/8:40/14:40/20:40] ~/rakuten-sync/fetch.php（約30分）
   楽天 商品検索API → 公開フォルダの推測されにくいフォルダに <shopCode>.json.gz（config.php の output_dir）
   └→ 全店終わったら workflow_dispatch で Actions を起動
                                   ↓
[GitHub Actions scraper.yaml]  上の起動＋定期 0/6/12/18 UTC（数時間遅れ・取りこぼしあり）
 1. スクレイプ（にこスマ・エムモバ）→ Neon（店ごとに洗い替え）
 2. 楽天 json.gz を取得（Secrets RAKUTEN_DATA_URL）→ scripts/ingest-rakuten.ts。Yahoo・Amazon も取り込み
 3. iPad の機種名 → 公式とモール店の突き合わせ（link-duplicate-shops.ts）→ 価格推移 → check-health.ts
 4. next build（output: "export"）→ scripts/ci-deploy.sh deploy（wrangler pages deploy）
                                   ↓
              Cloudflare Pages（used.gadelog.com・プロジェクト used-phone-search）。全ページ静的・/health.json
                                   ↑
[シン cron 毎日10:00] ~/rakuten-sync/healthcheck.php → 問題時だけメール
```

- **サイトが変わるのは Actions が書き出したときだけ**。実行時に DB は使わない
- 手元で再現: `npx wrangler pages dev out --port 8790`（`public/_headers` も効く。`*.pages.dev` は noindex）
- 無料プランの上限: デプロイ月500回・2万ファイル・1ファイル25MiB（`ci-deploy.sh` が配置前に確かめる）
- 楽天の取得がシンなのは、楽天アプリが許可 IP 制で Actions の IP が固定されないため

## 構成

- Next.js 16（App Router・export）・React 19・Tailwind 4・Prisma＋Neon（`DeviceInventory`・`PriceSnapshot` ほか）
- スクレイパーは Python。共通は `scraper/common.py` の `run_scraper`（安全チェック → DELETE → 一括 INSERT）
- `/search` は静的1ページ。機種ごとの在庫 JSON（`lib/searchData.ts`）をブラウザで絞る（`lib/modelMatch.ts`）
- おもな lib: `shops.ts`・`*Catalog.ts`・`modelInventory.ts`／`modelStats.ts`（DB 側で集計）・`priceHistory.ts`・`affiliate.ts`・`rakutenShops.ts`／`yahooShops.ts`
- 読み取りや照合を変えたら `npm run test:normalize`

## 秘密情報の置き場所（値は書かない・Claude は扱わない）

| 用途 | 場所 |
| --- | --- |
| DB | Secrets `DATABASE_URL`・ローカル `.env`（**本番 DB**） |
| Gemini | `.env.local` の `GEMINI_API_KEY`（無料枠＝公開の動画だけ送る・`scripts/gemini-video.ts`） |
| 配置 | Secrets `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID` |
| 楽天 JSON の場所 | Secrets `RAKUTEN_DATA_URL`・`config.php` の `output_dir`（フォルダ名は Git に書かない） |
| Yahoo | Secrets `YAHOO_APP_ID`（空なら取り込みを飛ばす） |
| Amazon | Secrets `AMAZON_CREDENTIAL_ID`・`_SECRET`・`AMAZON_PARTNER_TAG`、Variables `AMAZON_CREDENTIAL_VERSION`（既定 3.3） |
| ValueCommerce | Secrets `VC_SID`・`VC_PID`（空ならもしも経由に戻る＝否認済み） |
| Actions 即時起動 | `config.php` の `github_dispatch_token`（期限 2027/10/05） |
| 楽天API | `config.php`（値は `docs/private.local.md`） |
| GA4 | ワークフローの `NEXT_PUBLIC_GA_ID`（公開値） |
| DNS | シンドメイン（`used` CNAME → `used-phone-search.pages.dev`）。変更はユーザー |
| サーバー | シンレンタルサーバー（パネル `https://secure.wpx.ne.jp/`・詳細は private.local.md） |

`config.php` は読まない・書かない（文法確認は一度だけの cron で `php -l` し結果ファイルだけ見る）。

## 定期処理

| いつ | どこ | 何を | ログ |
| --- | --- | --- | --- |
| 2:40/8:40/14:40/20:40 | サーバー cron | 楽天取得 → Actions 起動 | `~/rakuten-sync/fetch.log`（`saved:`・`dispatch: HTTP 204`） |
| 上の直後＋定期 | Actions | 取得・取り込み・書き出し・配置 | 失敗時は GitHub から通知 |
| 毎日9時の回だけ | Actions | IndexNow | `IndexNow: HTTP 200` |
| 毎日10:00 | サーバー cron | healthcheck.php | 問題時だけメール |
| 毎日7:56 | サーバー cron（ブログ用） | WP キャッシュ削除 | 出力なし |

- cron の出力はすべてメールで届く。標準エラーは別ファイルへ
- パネルのコマンド欄は `&`・`2>&1`・`&&`・`-delete`・`[ ]`・日本語・引用符を受け付けない
- 一度だけ動かす cron は「分 時 日 月 *」で日付まで指定し、終わったら消す
- シンに届かない回（楽天 JSON が取れない）は別の実行環境で自動やり直し（`rakuten_retry`・2回まで）
- Neon への読むだけの接続は2回までやり直す（`lib/prisma.ts`）。書き込みはやり直さない

## 障害対応

### 「データ更新に問題があります」メール
1. 本文の「問題」を見る
2. 書き出し・全店が止まっている → Actions タブ。実行が無い: 無効なら有効化して Run workflow／`fetch.log` の `dispatch:` が 204 以外ならトークン。失敗: ログ（配置の失敗は API トークン・Pages の上限）
3. スクレイパーの店だけ → Actions のログ（サイト構造の変更が多い）
4. 楽天の店だけ → `fetch.log`。`HTTP 401/403`＝アプリの期限・許可IP・Access Key。`saved: ... FAILED`＝権限・容量。取り込みログの `時間前のもの`＝fetch.php が動いていない、`50%未満`＝楽天の不調
5. ページが開けない → DNS・Cloudflare の Custom domains・証明書
6. 価格推移 → 「価格推移の記録」ステップ

### 失敗と警告の分け方
相手の一時的な 403・429・タイムアウトは回避しない。1回なら警告、続いたら失敗。
- スクレイパー: 1店の失敗は `::warning::`。2店以上同時、または Traceback で失敗
- `scripts/check-health.ts`（Amazon は年齢判定外）
  - 失敗: 1店でも13時間超／8時間超が2店以上／「0件」が前回の `/health.json` にもあった／24時間更新なし・価格推移停止・DB 接続不可
  - 警告: 8〜13時間が1店／「0件」が今回だけ
  - 中古パソコンの店: 18時間超で警告・30時間超で失敗（8時間超の数に入れない）
  - 試す: `npx tsx scripts/check-health.ts --report <health.json> [--previous <health.json>]`
- 取得が12時間超止まったスクレイパーの店は在庫を `isSoldOut` に（`hide_stale_inventory`）。戻れば自動で表示
- **イオシス公式は取得しない**（403。別 IP からの回避はしない）。`iosis_limit`・`run_all_scrapers.py` の既定は 0。確認は `gh workflow run iosis-probe.yaml`。その間は楽天店がイオシスとして出る
- **ダイワン公式はリニューアル休止中**（12月中旬予定）。`daiwan_limit` と既定は 0。再開したら一覧 URL を確かめ 100 に戻す
- イオシスは3ページずつ・1秒あけ。種類の最初の3ページが全滅、または3ページの失敗が2回続いたら打ち切る

### 在庫が急に減った
- 件数が既存の50%未満なら洗い替え中止。意図的なら `FORCE_REPLACE=1`、楽天は `ingest-rakuten.ts <dir> --allow-shrink`

### サイトを今すぐ更新したい
- `gh workflow run scraper.yaml --ref main`（約16分）。コード・見た目だけなら `-f site_only=true`（約6〜7分）
- **手動実行は1日1回まで**（1回で Neon を約35MB 読む）。実行は1本ずつ

## データ源ごとのメモ

### 楽天
- 取得スクリプトの更新: `rakuten-sync/fetch.php` を編集 → Docker の PHP で `php -l` → ファイルマネージャで `~/rakuten-sync/fetch.php` を上書き（前後を SHA-256 で突き合わせる）。`config.php` は上書きしない
- 試し: `php fetch.php --dry janpara`（先頭3ページを `sample-janpara.json`。店指定時は Actions を起動しない）。PC は `--pc <店>`
- 楽天API は手元から呼べない。商品名は `search.rakuten.co.jp/search/mall/<語>/?sid=<店番号>` からコピーし、`npx tsx` で `RAKUTEN_SHOPS[shopCode].normalize` に通す
- 店の追加は skill `add-shop`。順は ①サーバーの fetch.php を上書き → ②json.gz ができたのを確認 → ③`scripts/ci-deploy.sh` の `SHOP_CODES` に足して push（先に足すと取り込みが失敗）。保証は店の公式ページで確かめる。リンクは楽天アフィリエイトだけ
- 店ごとの追加検索語（fetch.php）: `MAC_SHOP_CODES`（MacBook）・`ANDROID_SHOP_CODES`／`ANDROID_KEYWORDS`（Xperia・AQUOS・OPPO・Xiaomi）・`WATCH_SHOP_CODES`（Apple Watch）。ゲオの要求数は `MAX_REQUESTS=1500` 以内
- インバース・WORLDMOBILE: 1台ずつのページだけ。電池は `LOOSE_BATTERY_SHOPS`（ほかの店に広げない）
- 洗い替えは店ごと（iPhone・iPad・Pixel まとめて）。一覧の一部だけ取れない回は、その種類が次の回まで消える
- 中古ノート: `<shopCode>-pc.json.gz` → `scripts/ingest-rakuten-pc.ts`（読み取り `lib/rakutenPc.ts`）

### 機種名をそろえる
- iPad: `canonicalIpadModel`（`lib/ipadCatalog.ts`）。新機種は `IPAD_CATALOG` に。検索は機種指定なしなら iPhone だけ
- Pixel: `scraper/common.py` の `PIXEL_MODELS` と `lib/pixelCatalog.ts` の2か所（＋`PIXEL_INFO`）。5a 以前は入れない
- Mac: `lib/macCatalog.ts`（`canonicalMacModel`・`parseMacSpec`。Intel は落ちる）
- Android: `lib/rakutenAndroid.ts`（型番優先。`xperia/aquos/oppo/xiaomiCatalog.ts`）。テスト `npm run test:android`・`test:oppo-xiaomi`
- Watch: `lib/rakutenWatch.ts`・`watchCatalog.ts`（storage＝mm・carrier＝通信方式）。Galaxy／Pixel Watch は機種名を "Samsung Galaxy Watch…"・"Google Pixel Watch…" で始める（スマホと混ざらないように）。ケーブル欠品は `missingCharger` で札。テスト `npm run test:watch`・`test:galaxy-pixel-watch`
- 新しい iPhone: `lib/catalog.ts` に追加・比較の組は `lib/compare.ts`。機種ページ・OGP・sitemap は自動
- Amazon の検索には Android・Watch を含めない

### 同じ会社の別の売り場（`ALIAS_SHOPS`・店数に数えない）
- `scripts/link-duplicate-shops.ts` が公式の行に `altPrice`・`altUrl` を添え、モール側の行を隠す
- イオシス⇔楽天: 機種・容量・色・キャリア・ランク・電池80%未満で照合。`lib/rakutenIosys.ts` と `scraper/iosis_scraper.py` の読み方は片方を変えたらもう片方も
- エムモバ⇔エムコム Yahoo: 機種・容量・ランク・価格で照合

### Yahoo!ショッピング
- `scripts/fetch-yahoo.ts`（API v3・2秒に1回）→ `yahoo-data/` → `ingest-rakuten.ts yahoo-data --family yahoo`
- 店の追加: `lib/yahooShops.ts` に追加。商品名は `store.shopping.yahoo.co.jp/<ストアID>/search.html?p=iPhone+中古&b=1` から集めて `scripts/test-normalizers.ts` の CORPUS へ。保証は店の `guide.html`
- リンクはバリューコマース経由だけ（`lib/affiliate.ts`）。生の応答: `npx tsx scripts/fetch-yahoo.ts --debug --shop <ストアID>`
- 未対応: Yahoo のクレジット表記（`AdDisclosure.tsx`）

### Amazon 整備済み品（Creators API）
- `scripts/fetch-amazon.ts` → `amazon-data/amazon.json.gz` → `ingest-rakuten.ts amazon-data --family amazon`
- 規約: リンクは `detailPageURL` をそのまま・価格に「○時点」・**価格推移に入れない**。20時間超の在庫は隠す
- 確かめる: `npx tsx scripts/fetch-amazon.ts --debug --dry`

### 買取価格（BuybackPrice・iPhone）
- `scraper/buyback_scraper.py`（ネットオフ・にこスマ・モバステ）。週1。半分未満なら洗い替えない。403・429 は回避しない
- 取り直し `FORCE_BUYBACK=1`・確かめ `--dry`。使うのは `/iphone/resale-value`（`lib/resaleValue.ts`）
- 買取の A8 リンクは `lib/buyback.ts` の `BUYBACK_PROGRAMS`。A8 提供の URL・文言・画像は加工しない。PR 表記を出す

### 中古パソコン（PcInventory）
- `scraper/pcwrap_scraper.py`・`qualit_scraper.py`（一覧ページだけ・2秒おき。Qualit 規約第3条）・`pcnext_scraper.py`・`bestock_scraper.py`。11時間に1回まで（`FORCE_PC=1`）。失敗してもスマホは止めない
- 確かめ `--dry`・テスト `python test_pc_spec.py`。ランクの対応は `scraper/pc_spec.py`
- MacBook は `scripts/ingest-pc-shops-mac.ts` で DeviceInventory へ（`MAC_ONLY_SHOPS`）
- `/pc` は20件未満なら noindex（`PC_MIN_INDEX_ITEMS`）。予算別は10件未満で noindex。相場は `PcPriceSnapshot`
- リンクは A8（飛び先は店のドメインの中だけ）

### IndexNow
- `scripts/indexnow.ts` が `out/sitemap.xml` の URL を送る。9時の定期実行の回だけ・失敗は警告
- 鍵 `public/619cc190a530a2739b8c46ad71b82fb9.txt` は公開前提。消さない（変えるならファイル名・中身・`KEY` を一緒に）
- 403＝鍵が取れない・422＝ホスト違い・429＝送りすぎ。件数だけ: `npx tsx scripts/indexnow.ts --dry-run`

## DB

- スキーマ変更: `prisma/schema.prisma` → `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` → `npx prisma db push`。**`.env` は本番 DB**。破壊的な差分はユーザーに確認
- Neon 無料枠は転送量 月5GB。**在庫をまとめて取り出さない**。集計は `lib/modelInventory.ts` の `groupMinPrice`・`medianPrice`。超えると取り込み・書き出しが止まる（サイトは前回のまま）
- ローカルの `next build` も本番 DB を使う。確認は Docker の DB で

## デプロイ

- **push ではデプロイされない**。次の Actions の実行で出る
- 流れ: ローカルで `npx next build`（Docker の DB）→ **ユーザーの OK 後に main へ直接 push** → 次の実行で反映 → 本番で確認

## ローカルの DB（Docker）

- `docker compose up -d`。`DATABASE_URL="postgresql://user:password@localhost:5432/used_phone_db"` を付けて `npx prisma db push`・`scraper/run_all_scrapers.py`・`npx next dev`
- Docker Desktop が起動しきらないとき: Docker を終了し `wsl --shutdown` → `%LOCALAPPDATA%\Docker\run` と `%LOCALAPPDATA%\docker-secrets-engine` を `.stale-日時` に改名して起動し直す（削除・Reset to factory defaults はしない）

## YouTube

- A/B テスト後のサムネ差し替え: ①JS で input[type=file] の click を止める ②サムネ欄の ⋮ →「ファイルをアップロード」をクリック →「テストは削除されます」→ 続行 ③`#file-loader` へ file_upload → 欄が変わってから保存（直接入れると保存が固まる）
- Analytics API（読むだけ）: `.secrets/yt-oauth-client.json`・`.secrets/yt-token.json`（git 外）。切れたら `npx tsx scripts/yt-auth.ts`（許可はユーザー）
- 数字: `npx tsx scripts/yt-metrics.ts [--days 30] [--out .claude/tmp/yt.tsv]`。2〜3日遅れ。**表示回数・CTR は API に無い**（Studio で見る）
- アップロードに API は使わない（非公開に固定される）
