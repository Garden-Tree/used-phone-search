#!/bin/bash
# GitHub Actions（scraper.yaml）から呼ぶ。Cloudflare Pages 版（docs/cloudflare-pages.md）
#   bash scripts/ci-deploy.sh fetch-rakuten   … シンレンタルサーバーに置かれた楽天の在庫（<shopCode>.json.gz）を rakuten-data/ に取ってくる
#   bash scripts/ci-deploy.sh deploy          … out/ を Cloudflare Pages に配置する
# 使う環境変数:
#   RAKUTEN_DATA_URL（例 https://gadelog.com/<推測されにくいフォルダ>/。fetch.php の output_dir を公開フォルダに置いたときの URL）
#   CLOUDFLARE_API_TOKEN・CLOUDFLARE_ACCOUNT_ID（wrangler が読む）・CF_PAGES_PROJECT（既定 used-phone-search）
set -euo pipefail

SHOP_CODES=(geo-mobile janpara akiba-u-shop kamaya-awards garakei emedama pc-good)
PROJECT="${CF_PAGES_PROJECT:-used-phone-search}"
# Cloudflare Pages の無料プランの上限（docs/cloudflare-pages.md）
MAX_FILES=20000
MAX_FILE_BYTES=$((25 * 1024 * 1024))

fetch_rakuten() {
  [ -n "${RAKUTEN_DATA_URL:-}" ] || { echo "RAKUTEN_DATA_URL がない"; exit 1; }
  mkdir -p rakuten-data
  local failed=0
  for shop in "${SHOP_CODES[@]}"; do
    # -R: サーバーの更新日時をファイルに付ける（ingest-rakuten.ts が「前回取り込んだファイルか」をこれで見分ける）
    # 接続できないときは 20 秒で見切り、30 秒おきに 5 回まで試す（10/7 15時に Actions からシンへの接続が
    # 一時的に通らず、120 秒の待ちを 3 店 × 3 回くり返して 18 分かけて失敗した）
    if ! curl -fsSR --connect-timeout 20 --max-time 120 --retry 5 --retry-delay 30 --retry-all-errors \
        -o "rakuten-data/$shop.json.gz" "${RAKUTEN_DATA_URL%/}/$shop.json.gz"; then
      echo "$shop: 取得できない"
      failed=1
    fi
  done
  return $failed
}

deploy() {
  [ -f out/index.html ] && [ -f out/data/inventory/index.json ] || { echo "out/ がない（書き出しに失敗している）"; exit 1; }
  local files big
  files=$(find out -type f | wc -l)
  big=$(find out -type f -size +"${MAX_FILE_BYTES}"c | head -1)
  echo "配置するファイル: $files 件"
  [ "$files" -le "$MAX_FILES" ] || { echo "ファイル数が Pages の上限 $MAX_FILES を超える"; exit 1; }
  [ -z "$big" ] || { echo "Pages の上限 25MiB を超えるファイル: $big"; exit 1; }
  [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || { echo "CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID がない"; exit 1; }

  # 初回だけプロジェクトを作る（2回目以降は「すでにある」で失敗するので無視する）
  npx wrangler pages project create "$PROJECT" --production-branch=main >/dev/null 2>&1 || true
  # --branch=main で本番（<project>.pages.dev と独自ドメイン）に出す
  npx wrangler pages deploy out --project-name="$PROJECT" --branch=main --commit-dirty=true
}

case "${1:-}" in
  fetch-rakuten) fetch_rakuten ;;
  deploy) deploy ;;
  *) echo "使い方: $0 fetch-rakuten|deploy"; exit 2 ;;
esac
