---
name: add-shop
description: used.gadelog.com に中古スマホの店（楽天市場店・Yahoo!ショッピング店・自社サイト）を足す。候補の調べ方（1台ずつのページか・電池表記・保証）→ 取得（楽天は サーバーの fetch.php、Yahoo は API）→ 商品名の読み取り（normalizer とテスト）→ lib/shops.ts → Actions の取り込み → 本番で確かめるまで。ユーザーが「店を足して」「他のショップも取れる？」「楽天の◯◯を追加」などと言ったときに使う。
---

# 店を足す

手順の本体は `docs/operations.md`（楽天・Yahoo・インバース／WORLDMOBILE の節）。報告は日本語・短く。

## 守ること

- **サーバーの fetch.php を変えるのはユーザーと決めてから**（`rakuten-sync/config.php` は触らない）
- 楽天APIの商品は**楽天アフィリエイト以外へリンクしない**。ゲオ公式ECはスクレイピングしない
- findMany の全件取得はしない（groupBy・count）
- 店の情報（保証・赤ロム・電池表記）は店のページで確かめた値だけ、`lib/shops.ts` だけに書く

## 手順

1. **候補を調べる**（サブエージェント）: 商品名に容量1つ・型番・ランクがある「1台ずつのページ」か（容量・色を選ばせるページは取らない）、電池%の有無、保証期間、提携（A8 等）。結果は `ideas/YYYY-MM-DD-shops.md`
2. **商品名の見本**: `.claude/tmp/new-shops-samples-<日付>.md`
3. **取得**:
   - 楽天: サーバーの `~/rakuten-sync/fetch.php` の SHOP_CODES に足す（電池が説明にしかない店は LOOSE_BATTERY_SHOPS）→ 構文チェック `MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W)/rakuten-sync:/a" php:8.3-cli php -l /a/fetch.php` → ユーザーの OK → wpX のファイルマネージャーで上書き（サブエージェント）
   - **`scripts/ci-deploy.sh` の取得にも足す**。サーバーのファイルができる前は「取れなくても止めない」形で
   - Yahoo: `lib/yahoo*.ts` と fetch-yahoo.ts
4. **読み取り**: `lib/rakuten<店>.ts` → `lib/rakutenShops.ts` に登録 → `scripts/test-normalizers.ts` のコーパスの**末尾に**例を足す → `npm run test:normalize -- --update` → `npm run test:normalize`
5. **lib/shops.ts**: 店名・保証・赤ロム・電池表記（exact／range）・扱う種類
6. **確かめる**: 次の書き出しの Actions ログで `<店>: {"ok":true,...,"inserted":N}`、本番の機種ページに店が出るか。docs/operations.md・STATE（楽天の店）・docs/changes.md を直す
