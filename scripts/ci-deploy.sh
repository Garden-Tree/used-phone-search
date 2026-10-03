#!/bin/bash
# シンレンタルサーバーとのやり取り（GitHub Actions の scraper.yaml から呼ぶ。docs/static-export.md）
#   bash scripts/ci-deploy.sh fetch-rakuten   … rakuten-sync/out/*.json.gz を rakuten-data/ に取ってくる
#   bash scripts/ci-deploy.sh deploy          … out/ を DEPLOY_PATH に配置する
# 秘密鍵はそれぞれの処理の間だけディスクに置き、終わったら消す（書き出しなど他のステップの間は置かない）
# 使う環境変数: DEPLOY_HOST・DEPLOY_PORT（既定 10022）・DEPLOY_USER・DEPLOY_SSH_KEY・DEPLOY_KNOWN_HOSTS・DEPLOY_PATH・RAKUTEN_DATA_PATH
set -euo pipefail

# 1回の配置で消してよいファイル数の上限。ふだんはページの増減ぶん（数件〜数十件）。
# 配置先を取り違えたときに中身を丸ごと消さないための歯止め（書き出しは約2,700ファイル）
MAX_DELETE=300
# 配置先の印のファイル。中身にこの文字列が入っているフォルダにだけ配置する
MARKER=.used-deploy-target
MARKER_TEXT=used.gadelog.com

ssh_setup() {
  mkdir -p ~/.ssh && chmod 700 ~/.ssh
  # 鍵が無いまま進むと分かりにくいエラーになるので、先に止める
  [ -n "${DEPLOY_SSH_KEY:-}" ] || { echo "DEPLOY_SSH_KEY がない"; exit 1; }
  [ -n "${DEPLOY_KNOWN_HOSTS:-}" ] || { echo "DEPLOY_KNOWN_HOSTS がない"; exit 1; }
  (umask 077 && printf '%s\n' "$DEPLOY_SSH_KEY" > ~/.ssh/deploy_key)
  printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > ~/.ssh/known_hosts
  {
    echo "Host deploy"
    echo "  HostName $DEPLOY_HOST"
    echo "  Port ${DEPLOY_PORT:-10022}"
    echo "  User $DEPLOY_USER"
    echo "  IdentityFile ~/.ssh/deploy_key"
    echo "  IdentitiesOnly yes"
    echo "  StrictHostKeyChecking yes"
    echo "  ConnectTimeout 30"
    echo "  ServerAliveInterval 30"
    echo "  ServerAliveCountMax 4"
  } > ~/.ssh/config
  trap 'rm -f ~/.ssh/deploy_key' EXIT
}

fetch_rakuten() {
  ssh_setup
  mkdir -p rakuten-data
  scp -p "deploy:${RAKUTEN_DATA_PATH:-rakuten-sync/out}/*.json.gz" rakuten-data/
}

deploy() {
  [ -d out ] && [ -f out/index.html ] || { echo "out/ がない（書き出しに失敗している）"; exit 1; }
  # ホームからの相対パスか絶対パス。先頭の ~/ は外す（' ' の中では展開されないため）。末尾の / も外す
  local path="${DEPLOY_PATH:-}"
  path="${path#\~/}"
  path="${path%/}"
  case "$path" in
    "" | "." | "./" | "/" | "~" | *..*) echo "DEPLOY_PATH が危ない値: '${DEPLOY_PATH:-}'"; exit 1 ;;
  esac
  ssh_setup
  # 配置先の確認（サーバー側で実行）: 印のファイルの中身が MARKER_TEXT であること・ホームそのものでないこと
  # shellcheck disable=SC2029  # path はこちらで決めてから送る
  ssh deploy "cd '$path' && [ \"\$(pwd -P)\" != \"\$(cd ~ && pwd -P)\" ] && grep -qx '$MARKER_TEXT' '$MARKER'" \
    || { echo "配置先 '$path' に印（$MARKER の中身が $MARKER_TEXT）がない、またはホームそのもの。DEPLOY_PATH を確認"; exit 1; }

  local opts=(-rlzc --delete --delete-after --delay-updates
    --filter="P /_next/static/***" --filter="P /.well-known/***" --filter="P /.user.ini" --filter="P /$MARKER"
    --exclude="/.well-known/" --exclude="/.user.ini" --exclude="/$MARKER")
  # まず送らずに消す数を数え、多すぎたら止める
  local deleting
  deleting=$(rsync "${opts[@]}" --dry-run --itemize-changes out/ "deploy:$path/" | grep -c '^\*deleting' || true)
  echo "消すファイル: $deleting 件"
  [ "$deleting" -le "$MAX_DELETE" ] || { echo "消すファイルが $MAX_DELETE 件を超える。配置先を確認するまで止める"; exit 1; }

  rsync "${opts[@]}" out/ "deploy:$path/"
}

case "${1:-}" in
  fetch-rakuten) fetch_rakuten ;;
  deploy) deploy ;;
  *) echo "使い方: $0 fetch-rakuten|deploy"; exit 2 ;;
esac
