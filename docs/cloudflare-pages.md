# Cloudflare Pages 版（cloudflare-pages ブランチ）

Vercel（Hobby は商用不可）と Neon の計算時間の問題をまとめて解くため、サイトを**全部静的なファイル**にして
**Cloudflare Pages（無料・商用可）**で配信する版。シンレンタルサーバー版（static-export ブランチ）は、SSH の国外アクセス制限などで
Actions から配置できないため見送り（`ideas/2026-10-04.md`）。

## 仕組み

```
シンサーバー cron（2:40/8:40/14:40/20:40）: rakuten-sync/fetch.php
  └→ 楽天API → <output_dir>/<shopCode>.json.gz に保存（公開フォルダの中の推測されにくいフォルダ。送信はしない）

GitHub Actions（scraper.yaml・6時間ごと）
  1. 4店のスクレイプ → Neon
  2. scripts/ci-deploy.sh fetch-rakuten: RAKUTEN_DATA_URL から3店の json.gz を HTTPS で取得 → scripts/ingest-rakuten.ts → Neon
  3. iPad の機種名をそろえる・価格推移の記録
  4. scripts/check-health.ts（問題があっても続け、最後にジョブを失敗にする）
  5. next build（output: "export"）→ out/
  6. scripts/ci-deploy.sh deploy: wrangler pages deploy out（本番ブランチ main）

シンサーバー cron（10:00）: rakuten-sync/healthcheck.php が /health.json とページ2つを読み、問題か書き出しの停止（14時間超）をメール
```

- **実行時に DB を使わない**。Neon に触るのは Actions（1日4回）だけ → Free 枠に収まる見込み
- 検索ページ（/search）はブラウザで絞り込む。在庫は機種ごとの JSON（/data/inventory/<機種>.json）を書き出す（`lib/searchData.ts`・`app/components/SearchClient.tsx`）
  - 大きさの見込み（本番 約5.2万件で換算）: 全体 圧縮 約0.9MB、iPhone タブ（約50ファイル）圧縮 約0.6MB
  - 機種名が iPhone・iPad・Pixel・Galaxy のどれでも始まらない在庫・売り切れは出さない
  - 「ショップだけの指定」は全種類ではなく種類のタブ（初めは iPhone）。トップの店ごとの件数（全種類の合計）とは合わない
  - /search は noindex・sitemap から外した
- API（/api/devices・/api/health・/api/ingest/rakuten）は廃止。監視は /health.json
- URL はそのまま。Cloudflare Pages の動き（`wrangler pages dev` で確認）:
  - /iphone は iphone.html を返す（iphone/ フォルダがあっても 200）。/iphone/・/iphone.html は 308 で /iphone へ
  - 404 は out/404.html。http は https へ（Pages の既定）
- ヘッダーは `public/_headers`: HSTS（2年。今の Vercel と同じ）・`/_next/static/*` は1年 immutable・OGP 画像（拡張子なし）は image/png・
  `*.pages.dev` は `X-Robots-Tag: noindex`（正式な URL は used.gadelog.com。canonical もそちら）。HTML・JSON は Pages の既定 `public, max-age=0, must-revalidate`
- Vercel はこのブランチから一切ビルドしない（`scripts/vercel-ignore.sh`）。main にマージしても、DNS を切り替えるまでは Vercel の最後のデプロイ（旧版）が動き続ける
- 無料プランの上限: デプロイ 月500回（1日4回で月120回）・1サイト2万ファイル（書き出しは約2,700）・1ファイル25MiB。`ci-deploy.sh` が配置前にファイル数と大きさを確かめる

## 手元での確認

```bash
docker compose up -d
DATABASE_URL=postgresql://user:password@localhost:5432/used_phone_db NEXT_PUBLIC_SITE_URL=https://used.gadelog.com npx next build
npx wrangler pages dev out --port 8790   # Cloudflare Pages の配信（_headers も）を手元で再現
```

## 切り替えの手順（ユーザーの作業を含む。順番どおりに）

**前提: 今の本番は HSTS（2年）付き**。一度来た人のブラウザと Googlebot は https でしか開かない。DNS を切り替えた瞬間に https が使えないと見られない

1. **Cloudflare のアカウントと API トークン**（ユーザー）
   - Cloudflare のアカウントを作る（無料）。ダッシュボードの右上「アカウント ID」を控える
   - API トークンを作る: 「Custom token」→ 権限 **Account / Cloudflare Pages / Edit**（それ以外は付けない）
   - GitHub の Secrets に登録: `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`。プロジェクト名を変えるなら Variables に `CF_PAGES_PROJECT`（既定 `used-phone-search`。初回の配置で自動で作る）
2. **楽天データの置き場所**（ユーザー・ファイルマネージャ）
   - `/home/wp760415/gadelog.com/public_html/` の中に、推測されにくい名前のフォルダを作る（例: ランダムな英数字 20 文字）
   - GitHub の Secrets に `RAKUTEN_DATA_URL`（例 `https://gadelog.com/<そのフォルダ名>/`）を登録
   - 楽天の取得は Actions（海外）から HTTPS で読む。シンの国外アクセス制限は SSH・WordPress の管理画面などが対象で、静的ファイルの表示は対象外の見込み（未確認。手順 4 の実行で確かめる）
3. **楽天の取り込みを切り替える**（ユーザーが config.php に1行足す。手順 4 と同じ日に）
   - `rakuten-sync/fetch.php`（このブランチの版）をサーバーに上書き。`config.php` に `'output_dir' => '/home/wp760415/gadelog.com/public_html/<フォルダ名>',`
     （fetch.php が、そのフォルダに一覧を出さない・キャッシュさせない .htaccess を置く）
   - この時点から Vercel 版の楽天分は更新されなくなる（DNS を切り替えるまでの数時間〜1日は、楽天3店だけ古い在庫のまま）
4. **ブランチを main にマージ**（Claude）→ Actions を手動実行して、`https://<プロジェクト>.pages.dev` に出るか確認。STATE の「ページ方針」（検索ページは noindex・ISR なし）も書き換える
   - pages.dev で全ページを確認（Claude。main と書き出しの突き合わせ・検索・OGP・/health.json）
   - Vercel はこれ以降ビルドしない。DNS を切り替えるまで Vercel の旧版が本番として動き続ける
5. **独自ドメインを足す**（ユーザー・Cloudflare のダッシュボード → Workers & Pages → プロジェクト → Custom domains → Set up a domain → `used.gadelog.com`）
   - **必ず DNS より先に**（先に CNAME を向けると 522 エラー。Cloudflare の公式手順）
   - 画面に証明書の確認用のレコード（TXT など）が出たら、先にシンドメインの DNS に足す。出なければ、手順 6 の直後に証明書が出るまで数分 https が使えない可能性がある（未確認）→ アクセスの少ない時間に
6. **DNS の切り替え**（ユーザー・シンドメイン → DNSレコード設定）: `used.gadelog.com` の CNAME を `00e315ef90578812.vercel-dns-017.com` から `<プロジェクト>.pages.dev` に変える
   - 前日に TTL を短く（300 秒など）しておく。今は 3600 秒
   - サーバーパネル側の DNS には `*.gadelog.com` の A があるが、`used` は今もシンドメイン側の CNAME で決まっている（変えるのはシンドメイン側だけ）
7. **healthcheck.php を上書き**（/health.json を読む版）。**DNS の切り替え後に**（前に入れると、旧版の Vercel には /health.json が無いので毎朝誤った警告が届く）
8. **後片付け（1〜2週間たってから）**: Vercel のプロジェクトを止める（`RAKUTEN_INGEST_SECRET` は不要に）。Neon を Free に戻すのは Vercel を止めた後。
   Search Console は URL が変わらないので何もしない（`verification.google` のメタタグは残る）。GA4 もそのまま

### 戻し方（切り替え後に問題が出たとき）

- シンドメインの DNS で `used` の CNAME を Vercel 向け（`00e315ef90578812.vercel-dns-017.com`）に戻す → Vercel に残る旧版が動く（手順 8 で Vercel を消すまでは戻せる）
- 楽天は config.php の `output_dir` の行を消せば、元の送信（/api/ingest/rakuten）に戻る
- healthcheck.php は main の前の版（/api/health を読む版）に戻す
- Actions は旧版でも在庫を Neon に入れ続けるので、DB はどちらの版でもそのまま使える

## 未確認・気になる点

- 独自ドメインの証明書が、CNAME を向ける前に用意できるか（手順 5）
- Actions（海外）からシンサーバーの公開フォルダへの HTTPS が通るか（手順 4 の最初の実行で分かる。通らなければ楽天の取得だけ別の方法に）
- `wrangler pages deploy` が「500回/月」に数えられるか（数えられても月120回で収まる）
