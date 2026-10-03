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

1. **サーバー: used 用のフォルダとサブドメイン**（サーバーパネル）
   - サブドメイン `used.gadelog.com` を追加（ドキュメントルートを控える。例 `~/gadelog.com/public_html/used`）。
     DNS が Vercel を向いているあいだは、サブドメインの追加だけでは表示は変わらない
   - SSL（無料独自 SSL）は DNS を切り替えた後に申請する（手順 6）
   - そのフォルダに空の印のファイル `.used-deploy-target` を作る（ファイルマネージャの「新規ファイル」）。これが無いと Actions は配置しない
   - サーバーパネルが作った `.htaccess` があれば中身を控える（out/.htaccess で上書きされる。https への転送は out/.htaccess に入っている）
2. **SSH の鍵**（ユーザー）
   - サーバーパネル「SSH設定」を ON、公開鍵認証用の鍵を作る（秘密鍵は Claude に渡さない）
   - GitHub の Secrets に登録: `DEPLOY_HOST`（例 `wp760415.wpx.jp`）・`DEPLOY_PORT`（シンは `10022`）・`DEPLOY_USER`（`wp760415`）・
     `DEPLOY_SSH_KEY`（秘密鍵）・`DEPLOY_KNOWN_HOSTS`（`ssh-keyscan -p 10022 <ホスト>` の結果）・
     `DEPLOY_PATH`（手順 1 のフォルダ。**used 専用**。`--delete` で中身を out/ と同じにする）・`RAKUTEN_DATA_PATH`（省略時 `rakuten-sync/out`）
   - サーバーに rsync があるか確認（`ssh ... rsync --version`）
3. **楽天の取り込みを切り替える**（ユーザーが config.php に1行足す）
   - `rakuten-sync/fetch.php`（このブランチの版）をサーバーに上書き。`config.php` に `'output_dir' => __DIR__ . '/out',`
   - この時点から Vercel 版の楽天分は更新されなくなる → 手順 4 を同じ日に
4. **ブランチを main にマージ**（Claude）→ Actions を手動実行して、配置まで通るか確認。STATE の「ページ方針」（検索ページは noindex・ISR なし）も書き換える
   - サーバーの初期ドメイン（`wp760415.wpx.jp` 配下など）か hosts の書き換えで、配置した中身を見る
5. **healthcheck.php を上書き**（/health.json を読む版）
6. **DNS の切り替え**（ユーザー）: `used.gadelog.com` を Vercel からシンサーバーへ。反映後に SSL を申請
   - 切り替え直後は SSL が出るまで数分〜数時間 https が使えない。アクセスの少ない時間に
7. **後片付け**: Vercel のプロジェクトを止める（環境変数 `RAKUTEN_INGEST_SECRET` は不要に）。
   Search Console は URL が変わらないので何もしない（`verification.google` のメタタグは残る）。Neon を Free に戻す

## 未確認・気になる点

- シンサーバーの Apache で `DirectorySlash Off`・`ForceType`・`mod_headers` が .htaccess で使えるか（手元の Apache では動いた）
- Actions からの SSH（接続元 IP の制限がないか）・rsync の有無
- 書き出しのたびに 2,700 ファイルを比べる rsync の時間（中身で比べるので送るのは変わったものだけ）
- 前段にプロキシがあって `%{HTTPS}` が on にならない場合、https への転送がループする（その場合は `X-Forwarded-Proto` を見る形に）
- 検索ページを直接開いたときのタイトル（`document.title`）が「中古スマホの在庫検索」のままのことがある（タブを切り替えると変わる。表示上の問題のみ）
