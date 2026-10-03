# 静的書き出し版（static-export ブランチ）

Vercel（Hobby は商用不可）と Neon の計算時間の問題をまとめて解くため、サイトを**全部静的なファイル**にして
**シンレンタルサーバー（ブログと同じ sv3112）**で配信する版。比較・経緯は `ideas/2026-10-03.md`。

## 仕組み

```
シンサーバー cron（2:40/8:40/14:40/20:40）: rakuten-sync/fetch.php
  └→ 楽天API → ~/rakuten-sync/out/<shopCode>.json.gz に保存（output_dir を設定。送信はしない）

GitHub Actions（scraper.yaml・6時間ごと）
  1. 4店のスクレイプ → Neon
  2. SSH で rakuten-sync/out/*.json.gz を取ってくる → scripts/ingest-rakuten.ts → Neon
  3. iPad の機種名をそろえる・価格推移の記録
  4. scripts/check-health.ts（問題があっても続け、最後にジョブを失敗にする）
  5. next build（output: "export"）→ out/
  6. rsync -rlzc --delete out/ → サーバーの used.gadelog.com 用フォルダ

シンサーバー cron（10:00）: rakuten-sync/healthcheck.php が /health.json を読み、問題か書き出しの停止（14時間超）をメール
```

- **実行時に DB を使わない**。Neon に触るのは Actions（1日4回）だけ → Free 枠に収まる見込み
- 検索ページ（/search）はブラウザで絞り込む。在庫は機種ごとの JSON（/data/inventory/<機種>.json）を書き出す（`lib/searchData.ts`・`app/components/SearchClient.tsx`）
  - 大きさの見込み（本番 約5.2万件で換算）: 全体 非圧縮 約7MB／圧縮 約0.9MB、iPhone タブ（約50ファイル）圧縮 約0.6MB。.htaccess で圧縮して配信する
  - 機種名が iPhone・iPad・Pixel・Galaxy のどれでも始まらない在庫は検索に出さない（DB 版の種類のタブと同じ）。売り切れ（isSoldOut）は出さない
  - URL のパラメータは今と同じ。違いは「ショップだけの指定」が全種類ではなく種類のタブ（初めは iPhone）になること
    （トップの店ごとの件数は全種類の合計なので、リンク先の件数と合わない）
  - /search は noindex・sitemap から外した（結果が HTML に入らないため）
- API（/api/devices・/api/health・/api/ingest/rakuten）は廃止。監視は /health.json
- URL はそのまま（`public/.htaccess` で /iphone/iphone-13 → iphone-13.html。http と末尾の / は https・/ なしへ 301。OGP 画像は image/png）
- Vercel はこのブランチから一切ビルドしない（`scripts/vercel-ignore.sh`）。main にマージしても、DNS を切り替えるまでは Vercel の最後のデプロイ（旧版）が動き続ける
- 配置（rsync）は印のファイル `.used-deploy-target` があるフォルダにだけ行う。送り終えてから一度に入れ替え・削除し、古い `_next/static`・`.well-known`・`.user.ini` は消さない。Actions は同時に1本だけ（concurrency）
- 書き出しは約 80MB・2,700 ファイル（多くは OGP 画像）

## 手元での確認

```bash
docker compose up -d
DATABASE_URL=postgresql://user:password@localhost:5432/used_phone_db npx next build
# Apache で out/ を配信（.htaccess も効く）。設定ファイルの作り方は ideas/2026-10-03.md の「静的書き出し版の開発」
docker run -d --name used-static-test -p 8088:80 -v "<リポジトリ>/out:/usr/local/apache2/htdocs:ro" -v "<httpd.conf>:/usr/local/apache2/conf/httpd.conf:ro" httpd:2.4
```

## 切り替えの手順（ユーザーの作業を含む。順番どおりに）

**前提: 今の本番は HSTS（`Strict-Transport-Security: max-age=63072000`）付き**。一度来た人のブラウザと Googlebot は https でしか開かないので、
**DNS を切り替える前にシンサーバー側で SSL を済ませる**（切り替えた瞬間に https が使えないと、そのまま見られなくなる）

0. **DNS の置き場所を確かめる**（ユーザー・Claude はブラウザで見るだけ）
   - gadelog.com のネームサーバーがどこか、`used` のレコード（Vercel 向けの CNAME など）がどこにあるか
   - シンのネームサーバーなら、サーバーパネルでサブドメインを足した時点で A レコードが自動で作られ、**Vercel 向けの設定と競合・上書きして即切り替わる**おそれがある（未確認）。
     その場合は手順 1 の前に、DNS レコードの扱いを確認する
   - 切り替えの1日前に `used` のレコードの TTL を短く（300 秒など）しておく
1. **サーバー: used 用のフォルダとサブドメイン**（サーバーパネル）
   - サブドメイン `used.gadelog.com` を追加し、ドキュメントルートを控える。できれば public_html の外（ブログのフォルダの下だと gadelog.com/used/… でも見えてしまう。.htaccess で used.gadelog.com に寄せてはいる）
   - そのフォルダに印のファイル `.used-deploy-target` を作り、中身を1行 `used.gadelog.com` にする（ファイルマネージャの「新規ファイル」）。これが無い・中身が違うと Actions は配置しない
   - 配置の安全策（`scripts/ci-deploy.sh`）: 印のあるフォルダだけ／ホームそのもの・`.`・`..` を含む指定は拒否／消すファイルが300件を超えたら止める。秘密鍵は取得・配置の間だけディスクに置く
   - サーバーパネルが作った `.htaccess` があれば中身を控える（out/.htaccess で上書きされる。https への転送は out/.htaccess に入っている）
2. **SSL を DNS 切り替えの前に用意する**（ユーザー・サーバーパネル「SSL設定」）
   - シンの「他社サーバーでの Web 認証」: 発行されたトークンファイルを今の配信元（Vercel）の同じパスに置く → Claude が main の `public/` に置いて Vercel に出す。
     または「他社ネームサーバーでの DNS 認証」: 表示されたレコードを今の DNS に足す
     （[シンの FAQ](https://www.shin-server.jp/support/faq/ssl_setting_prior.php)・[無料独自SSL設定](https://www.shin-server.jp/support/manual/man_server_ssl.php)）
   - 証明書が出るまで DNS は変えない
3. **SSH の鍵**（ユーザー）
   - サーバーパネル「SSH設定」を ON、公開鍵認証用の鍵を作る（秘密鍵は Claude に渡さない）
   - GitHub の Secrets に登録: `DEPLOY_HOST`（例 `wp760415.wpx.jp`）・`DEPLOY_PORT`（シンは `10022`）・`DEPLOY_USER`（`wp760415`）・
     `DEPLOY_SSH_KEY`（秘密鍵）・`DEPLOY_KNOWN_HOSTS`（`ssh-keyscan -p 10022 <ホスト>` の結果）・
     `DEPLOY_PATH`（手順 1 のフォルダ。**ホームからの相対パスか絶対パス**。`~/` は付けても外す）・`RAKUTEN_DATA_PATH`（省略時 `rakuten-sync/out`）
   - サーバーに rsync があるか（`ssh ... rsync --version`）。scp は SFTP 方式で動く（ubuntu の既定）。SFTP が使えなければ `scripts/ci-deploy.sh` を `scp -O` に
   - できれば `authorized_keys` でこの鍵を used のフォルダだけに制限する（`command="rrsync …",restrict`。シンで rrsync が使えるかは未確認。使えない場合は今の安全策で運用）
4. **楽天の取り込みを切り替える**（ユーザーが config.php に1行足す。手順 5 と同じ日に）
   - `rakuten-sync/fetch.php`（このブランチの版）をサーバーに上書き。`config.php` に `'output_dir' => __DIR__ . '/out',`
   - この時点から Vercel 版の楽天分は更新されなくなる（DNS を切り替えるまでの数時間〜1日は、楽天3店だけ古い在庫のまま）
5. **ブランチを main にマージ**（Claude）→ Actions を手動実行して、配置まで通るか確認。STATE の「ページ方針」（検索ページは noindex・ISR なし）も書き換える
   - Vercel はこれ以降ビルドしない。DNS を切り替えるまで、Vercel に残る最後のデプロイ（旧版）が本番として動き続ける
   - 配置した中身の確認は、ブラウザではなく `curl --resolve used.gadelog.com:443:<シンの IP> https://used.gadelog.com/...`（HSTS があるので hosts の書き換えはブラウザでは使いにくい）
6. **DNS の切り替え**（ユーザー）: `used.gadelog.com` を Vercel からシンサーバーへ。アクセスの少ない時間に
7. **healthcheck.php を上書き**（/health.json を読む版）。**DNS の切り替え後に**（前に入れると、旧版の Vercel には /health.json が無いので毎朝誤った警告が届く）
8. **後片付け（1〜2週間たってから）**: Vercel のプロジェクトを止める（`RAKUTEN_INGEST_SECRET` は不要に）。Neon を Free に戻すのは Vercel を止めた後（旧版の ISR が計算時間を使うため）。
   Search Console は URL が変わらないので何もしない（`verification.google` のメタタグは残る）。GA4 もそのまま

### 戻し方（切り替え後に問題が出たとき）

- DNS の `used` を Vercel 向けに戻す → Vercel に残る旧版が動く（手順 8 で Vercel を消すまでは戻せる）
- 楽天は config.php の `output_dir` の行を消せば、元の送信（/api/ingest/rakuten）に戻る
- healthcheck.php は main の前の版（/api/health を読む版）に戻す
- Actions は旧版でも在庫を Neon に入れ続けるので、DB はどちらの版でもそのまま使える

## 未確認・気になる点

- シンサーバーの Apache で `DirectorySlash Off`・`ForceType`・`mod_headers` が .htaccess で使えるか（手元の Apache では動いた）。シンの高速化機能（前段のキャッシュ）が静的ファイルを直接返す場合、.htaccess の Header などが効かないことがある
- `_next/static` は古い HTML のために消さない（P）ので、コードを変えてデプロイするたびに古い JS が少しずつ残る（1回あたり 1MB 未満）。たまにファイルマネージャで古いものを消すか、P を外して1回配置する
- Actions からの SSH（接続元 IP の制限がないか）・rsync の有無
- 書き出しのたびに 2,700 ファイルを比べる rsync の時間（中身で比べるので送るのは変わったものだけ）
- 前段にプロキシがあって `%{HTTPS}` が on にならない場合、https への転送がループする（その場合は `X-Forwarded-Proto` を見る形に）
- 検索ページを直接開いたときのタイトル（`document.title`）が「中古スマホの在庫検索」のままのことがある（タブを切り替えると変わる。表示上の問題のみ）
