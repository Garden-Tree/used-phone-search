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
 3. iPad の機種名をそろえる → イオシスの公式と楽天の突き合わせ（scripts/link-iosys-rakuten.ts）→ 価格推移の記録 → scripts/check-health.ts
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
| ValueCommerce のリンク | GitHub Secrets `VC_SID`（サイトID）・`VC_PID`（プロモーションID）→ ビルド時に `NEXT_PUBLIC_VC_SID`/`NEXT_PUBLIC_VC_PID` | リンクの URL に出る公開の値。未登録なら Yahoo の商品へ直接リンク（収益なし） |
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
   - Actions 側の「楽天市場店の在庫を取り込む」のログ: `ファイルが ... 時間前のもの` は fetch.php が動いていない、`件数が ... 50%未満` は楽天側の不調（続くなら確認）
5. **ページが開けない** → `https://used.gadelog.com/` を開く。DNS（シンドメインの CNAME）・Cloudflare の Custom domains の状態・証明書を確認
6. **価格推移**が止まっている → Actions の「価格推移の記録」ステップ

### 在庫が急に減った・消えた
- スクレイパーも楽天の取り込みも「件数が既存の50%未満なら洗い替えを中止」する。意図的に減らしたときは
  スクレイパーは `FORCE_REPLACE=1`、楽天は `npx tsx scripts/ingest-rakuten.ts <dir> --allow-shrink`

### サイトを今すぐ更新したい
- GitHub の Actions → Phone Inventory Scraper → Run workflow（main）。10分ほどで配置まで終わる

### イオシスの公式と楽天市場店（2026-10-08〜）
- 2つは在庫を共有していて、同じ商品が両方に並ぶ（楽天が数%高い）。毎回の取り込みの後に `scripts/link-iosys-rakuten.ts` が
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
- 楽天3店: `fetch.php` の KEYWORDS に `Pixel`、読み取りは `lib/rakutenPixel.ts`（`lib/rakutenShops.ts` の byDevice で振り分け）。キャリア版も SIM フリー扱い（Pixel 6 以降は SIM ロック原則禁止の後の発売）
- エムモバは Pixel の一覧がなく、検索ページでも Pixel 6 以降は1件（9/30）なので取り込まない
- サーバーパネル・ファイルマネージャは 2026-09 から `https://secure.wpx.ne.jp/`（シンクラウド）。旧 `secure.shin-server.jp` は名前解決できない
- 洗い替えは店ごと（iPhone・iPad・Pixel をまとめて入れ直す）。ある回に Pixel の一覧だけ取れなかったときは、その店の Pixel が次の回まで消える。安全装置（店の合計件数が半分未満なら入れ直さない）は iPhone が多いので効かない

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

### Yahoo!ショッピングの店を追加する（2026-10-09〜。Quality Shop・モバステ・エムコム・リユスマ・Joshin 中古アウトレット・MyWiT・Be-Stock。`lib/shops.ts` の行はどれもコメントアウト＝稼働前）
- 流れ: Actions の「Yahoo!ショッピングの在庫を取り込む」が `scripts/fetch-yahoo.ts`（商品検索API v3 を直接呼ぶ。2秒に1回（30回ほどで 429 になったため。429 は30秒待って3回まで再試行）・先頭1,000件を超える検索は価格帯を割って取得）→
  `yahoo-data/<ストアID>.json.gz` → `scripts/ingest-rakuten.ts yahoo-data --family yahoo`（楽天と同じ洗い替え・半分未満なら中止の安全装置）。`YAHOO_APP_ID` が空なら飛ばす
1. `lib/yahooShops.ts` の `YAHOO_SHOPS` にストアID（`store.shopping.yahoo.co.jp/<ストアID>/` の部分）・ショップ名・商品名の解析関数を追加（例: `lib/yahooQualityShop.ts`）。
   商品名は店の検索ページ（`https://store.shopping.yahoo.co.jp/<ストアID>/search.html?p=iPhone+中古&b=1`。`b` は 1・31・61…）から集めて `scripts/test-normalizers.ts` の CORPUS に足す
   （`shopping.yahoo.co.jp/search?...&sid=` は店で絞り込まれない）
   （商品検索API v3 を `seller_id=<ストアID>&condition=used&in_stock=true` で呼んでも商品名を集められる。`description` にランク・バッテリー・キャリアが書かれている店が多く、`fetch-yahoo.ts` の `extract` が読む。保証は店の `guide.html`（`info.html` は会社概要だけ）にある）
2. `lib/shops.ts` の `SHOPS` に1行足す（`note` が "Yahoo!" で始まる店は絞り込みで「（Yahoo!）」と出る。保証・赤ロムは**その店の公式ページで確かめてから**書く）
3. リンクは ValueCommerce 経由（`lib/affiliate.ts` の `valueCommerceUrl`。GA4 の `link_type` は `vc`）。Yahoo の商品ページ以外へは張らない
4. API の応答の形・件数の上限を確かめるとき: `YAHOO_APP_ID=... npx tsx scripts/fetch-yahoo.ts --debug --shop <ストアID>`（最初の1商品の生の応答を出す）
- Yahoo! JAPAN のウェブサービスを使う側の表記（クレジット）は未対応。API 規約を確認して `app/components/AdDisclosure.tsx` に足す

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
