# 運用手順（インフラ・データ更新・障害対応）

## 全体像

> **static-export ブランチ**: 静的書き出し＋シンレンタルサーバー配信の版。構成・切り替え手順は [static-export.md](./static-export.md)。
> 下の図とこのファイルの API（/api/ingest・/api/health）の記述は、切り替えるまでの Vercel 版（main）のもの

```
[GitHub Actions 6時間ごと 3/9/15/21時]            [シンレンタルサーバー cron 2:40/8:40/14:40/20:40]
 scraper/run_all_scrapers.py（4店）                 ~/rakuten-sync/fetch.php
   イオシス・にこスマ・エムモバ・ダイワン              楽天市場 商品検索API（ゲオモバイル・じゃんぱら・ソフマップの楽天市場店）
   └→ Neon（DeviceInventory を店ごとに洗い替え）       └→ POST /api/ingest/rakuten?shop=<shopCode>（gzip + Bearer）
 npm run snapshot:prices（価格推移を記録）               └→ Neon（ショップごとに洗い替え。iPhone・iPad・Pixel）
 ワークフローの自己有効化（60日停止の防止）
                                   ↓
              Vercel（used.gadelog.com・Next.js 16）
               静的（ISR 3時間・OGP 画像は1日）: トップ / 機種別 / 比較 / 目的別 / OGP 画像
               動的: 検索 / API
                                   ↑
[シンレンタルサーバー cron 毎日10:00] ~/rakuten-sync/healthcheck.php → /api/health
  → 問題があるときだけ keigo3142011@yahoo.co.jp にメール
```

## アカウント・秘密情報の置き場所

| 用途 | 場所 | 備考 |
| --- | --- | --- |
| DB 接続 | Vercel `DATABASE_URL`（Production/Preview）、GitHub Secrets `DATABASE_URL`、ローカル `.env` | Neon（`ep-shy-sunset-...ap-southeast-1`）。**本番と同じ DB** |
| サイトURL | Vercel `NEXT_PUBLIC_SITE_URL=https://used.gadelog.com` | |
| GA4 | Vercel `NEXT_PUBLIC_GA_ID=G-YV3ZR0N6B1`（プロパティ 556047315） | 詳細は `measurement.md` |
| 楽天の受け口 | Vercel `RAKUTEN_INGEST_SECRET` とサーバーの `~/rakuten-sync/config.php` の `ingest_secret`（同じ値） | Secret 型。Claude は扱わない |
| 楽天API | サーバーの `config.php`（アプリID・Access Key） | アプリ「中古スマホ一括検索」・Backend・許可IP 210.157.79.113 |
| サーバー | シンレンタルサーバー sv3112（サーバーID wp760415、gadelog.com と共用） | ファイルマネージャ・Cron 設定はサーバーパネル |

## 定期処理

| いつ（日本時間） | どこで | 何を | ログ |
| --- | --- | --- | --- |
| 3/9/15/21時 | GitHub Actions `Phone Inventory Scraper` | 4店のスクレイピング（イオシス・にこスマは iPad も、イオシス・にこスマ・ダイワンは Pixel も）→ iPad の機種名の正規化 → 価格推移の記録 → 自己有効化 | Actions の実行ログ（失敗時は GitHub から通知メール） |
| 2:40/8:40/14:40/20:40 | サーバー cron | 楽天からゲオ・じゃんぱら・ソフマップの iPhone・iPad を順に取得して送信（合計約25分） | `~/rakuten-sync/fetch.log`（行頭に shopCode） |
| 毎日10:00 | サーバー cron | `/api/health` を確認し、問題時のみメール（店ごとの更新停止・価格推移の停止・扱うはずの iPad/Pixel/Galaxy が0件） | cron の通知メール |
| 毎日7:56 | サーバー cron（ブログ用・パネルが自動作成。「WordPressキャッシュ自動削除Cronを表示」で出る） | `wp-content/cache/` の3日より古いファイルを削除 | 出力なし（下記） |

- cron の通知アドレスを設定すると **すべての cron の出力がメールで届く**。WordPress キャッシュ削除の cron は
  キャッシュが空だと `find`/`rm` のエラーを毎朝出していたため、9/27 に `-print 2>/dev/null | xargs -r rm` に変更した。
  このパネルは `-delete`・`&&`・`[ ]` を含むコマンドを「コマンドを正しく入力してください」で拒否する

- ゲオ公式ECは自動アクセスを拒否しているのでスクレイパーは持たない（9/27 に `geo_scraper.py` を削除。楽天API のみ）
- 検索用モデル名の一覧は各サーバーで5分キャッシュ

## よくある対応

### 「データ更新に問題があります」メールが来た
1. メール本文の「問題」を見る（どのショップが何時間止まっているか）
2. **楽天3店以外**（イオシス・にこスマ・エムモバ・ダイワン）が止まっている → GitHub の Actions タブ
   - ワークフローが無効（disabled）なら有効化 → 「Run workflow」で手動実行
   - 失敗しているならログで該当ショップを確認（サイト構造の変更が多い）
3. **楽天3店**（ゲオ・じゃんぱら・ソフマップ）が止まっている → サーバーの `~/rakuten-sync/fetch.log`
   - `HTTP 401/403`：楽天アプリの有効期限・許可IP・Access Key
   - `ingest: HTTP 401`：Vercel とサーバーの `ingest_secret` の不一致
   - `ingest: HTTP 409`：取得件数が既存の50%未満で洗い替え中止（楽天側の一時的な不調が多い。続くなら確認）
4. **価格推移**が止まっている → Actions の「価格推移の記録」ステップ

### 在庫が急に減った・消えた
- スクレイパーも楽天の受け口も「件数が既存の50%未満なら洗い替えを中止」する。意図的に減らしたときは
  スクレイパーは `FORCE_REPLACE=1`、受け口は `?force=1`

### iPad の機種名
- 楽天3店の iPad は `lib/ipadCatalog.ts` の `canonicalIpadModel` で Apple の正式名にそろえる（チップ⇔世代の対応表込み）。
  カタログにない機種・画面サイズが書かれていない M 系 Air は取り込まない。新しい iPad が出たら `IPAD_CATALOG` に追加
- 検索は機種の指定がなければ iPhone のみ（`buildWhere`）。iPad は `/ipad` と機種別ページから

### Pixel の機種名（2026-09-30〜）
- スクレイパーが取り込むときに Google の表記（`Pixel 8a`・`Pixel 9 Pro Fold`）へそろえる（`scraper/common.py` の `canonical_pixel_model`）。Pixel 5a 以前は入れない
- 機種の一覧は `scraper/common.py` の `PIXEL_MODELS` と `lib/pixelCatalog.ts` の2か所。`npm run test:normalize` がずれを見つける。新しい Pixel が出たら両方と `PIXEL_INFO`（販売開始・保証年数）に足す
- 楽天3店: `fetch.php` の KEYWORDS に `Pixel`、受け口は `lib/rakutenPixel.ts`（`lib/rakutenShops.ts` の byDevice で振り分け）。キャリア版も SIM フリー扱い（Pixel 6 以降は SIM ロック原則禁止の後の発売）
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
- 本番で試すなら、サーバーの Cron に一時的に `php fetch.php <shopCode>` を追加し、終わったら削除する（`fetch.log` と `/api/health` で確認）

### 楽天市場のショップを追加する
1. `lib/rakutenShops.ts` の `RAKUTEN_SHOPS` に shopCode・ショップ名・商品名の解析関数を追加（例: `lib/rakutenJanpara.ts`）
2. `rakuten-sync/fetch.php` の `SHOP_CODES` に shopCode を追加 → サーバーへ上書きアップロード
3. `lib/shops.ts` の `SHOPS` に1行足す（トップの在庫数・絞り込み・OG 画像・説明文の店舗数はここから作られる。バッテリー表記の種類、
   保証・赤ロムの扱いと出典 URL もここ。保証は**その店の公式ページで確かめてから**書く）。
   店名が楽天の shopName とずれていないかは `npm run test:normalize` が確かめる
4. 規約上、リンクは楽天アフィリエイトのみ（`DeviceCard.tsx` は `RAKUTEN_SHOP_NAMES` で自動判定）

### 楽天の取得スクリプトを更新する
- リポジトリの `rakuten-sync/fetch.php` を編集 → サーバーのファイルマネージャで `~/rakuten-sync/` に上書きアップロード
- `config.php` は上書きしない。お試しは `php fetch.php --dry janpara`（先頭3ページを `sample-janpara.json` に保存）。`php fetch.php janpara` で1店だけ送信

### DB スキーマを変える
- `prisma/schema.prisma` を編集 → `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` で差分を確認 → `npx prisma db push`
- **ローカルの `.env` は本番 DB を指している**。破壊的な差分（DROP・型変更）は実行前にユーザーに確認する

## Neon の無料枠（データ転送量 月5GB）

- 2026-09-27 に 88%（4.4GB）の警告。原因は機種別・比較・目的別ページと OGP 画像の再生成のたびに、機種の在庫を全件取り出して JS で集計していたこと
  （ビルドのたびに全ページ分が走るので、PR が多い日に急増）。PR #28 で DB 側の集計（groupBy/aggregate）＋最大7行の取得に変更
- **在庫の行をまとめて取り出す処理を書かない**。集計は `lib/modelInventory.ts` の `groupMinPrice`・`medianPrice` を使う
- ローカルの `next build` も `.env` の本番 DB を使う（全ページ分のクエリが走る）。確認はなるべく Vercel のプレビューで
- 使用量は Neon の管理画面（Billing / Usage）。上限を超えるとその月は DB が止まり、検索・取り込み・ページの再生成が失敗する
  （静的ページは前回生成分が表示され続ける）

## デプロイ

- `main` への push で Vercel が本番デプロイ。PR ごとにプレビュー
- 開発の流れ：ブランチ → PR → Vercel のプレビュービルド成功 → マージ（自動マージはリポジトリ設定で無効）

## ローカルの確認用 DB（Docker）

- `docker compose up -d` でローカル Postgres。`DATABASE_URL="postgresql://user:password@localhost:5432/used_phone_db"` を付けて `npx prisma db push`・スクレイパー（`scraper/run_all_scrapers.py`）・`npx next dev` を動かすと、本番の Neon に触れずに在庫つきで確かめられる
- Docker Desktop が起動途中で止まる（`docker info` が返らない・`dockerDesktopLinuxEngine` が見つからない）とき: PC の再起動後に古いソケットが残るのが原因（9/30・10/3 に発生）。
  Docker のプロセスを止め `wsl --shutdown` → `%LOCALAPPDATA%\Docker
un` と `%LOCALAPPDATA%\docker-secrets-engine` を `.stale-日時` に名前を変えて起動し直す（削除・Reset to factory defaults はしない）
- Docker Desktop が起動しきらない（WSL の docker-desktop が Stopped のまま）とき: 前回の終了で残ったソケット（`%LOCALAPPDATA%\Docker
un\dockerInference`・`%LOCALAPPDATA%\docker-secrets-engine\engine.sock`）を消せずに落ちている。
  Docker を終了し、2つのフォルダを `.stale-日時` に名前を変えてから起動し直す（ファイル自体は消せない。「Reset to factory defaults」は押さない）
