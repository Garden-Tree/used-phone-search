# 運用手順（インフラ・データ更新・障害対応）

## 全体像

```
[GitHub Actions 6時間ごと 3/9/15/21時]            [シンレンタルサーバー cron 2:40/8:40/14:40/20:40]
 scraper/run_all_scrapers.py（4店）                 ~/rakuten-sync/fetch.php
   イオシス・にこスマ・エムモバ・ダイワン              楽天市場 商品検索API（ゲオモバイル楽天市場店）
   └→ Neon（DeviceInventory を店ごとに洗い替え）       └→ POST /api/ingest/rakuten（gzip + Bearer）
 npm run snapshot:prices（価格推移を記録）               └→ Neon（ゲオを洗い替え）
 ワークフローの自己有効化（60日停止の防止）
                                   ↓
              Vercel（used.gadelog.com・Next.js 16）
               静的（ISR 1時間）: トップ / 機種別 / 比較 / 目的別 / OGP 画像
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
| 3/9/15/21時 | GitHub Actions `Phone Inventory Scraper` | 4店のスクレイピング → 価格推移の記録 → 自己有効化 | Actions の実行ログ（失敗時は GitHub から通知メール） |
| 2:40/8:40/14:40/20:40 | サーバー cron | 楽天からゲオを取得して送信（約6分） | `~/rakuten-sync/fetch.log` |
| 毎日10:00 | サーバー cron | `/api/health` を確認し、問題時のみメール | cron の通知メール |
| 毎日7:56 | サーバー cron（ブログ用・パネルが自動作成。「WordPressキャッシュ自動削除Cronを表示」で出る） | `wp-content/cache/` の3日より古いファイルを削除 | 出力なし（下記） |

- cron の通知アドレスを設定すると **すべての cron の出力がメールで届く**。WordPress キャッシュ削除の cron は
  キャッシュが空だと `find`/`rm` のエラーを毎朝出していたため、9/27 に `-print 2>/dev/null | xargs -r rm` に変更した。
  このパネルは `-delete`・`&&`・`[ ]` を含むコマンドを「コマンドを正しく入力してください」で拒否する

- ゲオ公式ECのスクレイパー（`geo_scraper.py`）は Actions では **取得数0（無効）**。手動実行フォームでも初期値0
- 検索用モデル名の一覧は各サーバーで5分キャッシュ

## よくある対応

### 「データ更新に問題があります」メールが来た
1. メール本文の「問題」を見る（どのショップが何時間止まっているか）
2. **ゲオ（楽天）以外**が止まっている → GitHub の Actions タブ
   - ワークフローが無効（disabled）なら有効化 → 「Run workflow」で手動実行
   - 失敗しているならログで該当ショップを確認（サイト構造の変更が多い）
3. **ゲオ（楽天）**が止まっている → サーバーの `~/rakuten-sync/fetch.log`
   - `HTTP 401/403`：楽天アプリの有効期限・許可IP・Access Key
   - `ingest: HTTP 401`：Vercel とサーバーの `ingest_secret` の不一致
   - `ingest: HTTP 409`：取得件数が既存の50%未満で洗い替え中止（楽天側の一時的な不調が多い。続くなら確認）
4. **価格推移**が止まっている → Actions の「価格推移の記録」ステップ

### 在庫が急に減った・消えた
- スクレイパーも楽天の受け口も「件数が既存の50%未満なら洗い替えを中止」する。意図的に減らしたときは
  スクレイパーは `FORCE_REPLACE=1`、受け口は `?force=1`

### 新しい iPhone が出た
1. 中古在庫が出たのを確認（楽天のゲオ店が早い）
2. `lib/catalog.ts` にシリーズ・モデルを追加（バッジは公式情報で確認）
3. 比較ページの組は `lib/compare.ts`（Pro/Pro Max の世代に追加）
4. 機種別・比較・OGP・sitemap は自動で増える

### 楽天の取得スクリプトを更新する
- リポジトリの `rakuten-sync/fetch.php` を編集 → サーバーのファイルマネージャで `~/rakuten-sync/` に上書きアップロード
- `config.php` は上書きしない。お試しは `php fetch.php --dry`（先頭3ページを `sample.json` に保存）

### DB スキーマを変える
- `prisma/schema.prisma` を編集 → `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` で差分を確認 → `npx prisma db push`
- **ローカルの `.env` は本番 DB を指している**。破壊的な差分（DROP・型変更）は実行前にユーザーに確認する

## デプロイ

- `main` への push で Vercel が本番デプロイ。PR ごとにプレビュー
- 開発の流れ：ブランチ → PR → Vercel のプレビュービルド成功 → マージ（自動マージはリポジトリ設定で無効）
