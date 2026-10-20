/**
 * IndexNow で書き出したサイトマップの URL を Bing・Yandex などへ知らせる（scraper.yaml の配置の後。1日1回）。
 * ChatGPT 検索は Bing のインデックスを使うとされる（ideas/2026-10-21.md）。
 *
 *   npx tsx scripts/indexnow.ts                    … out/sitemap.xml の URL を送る
 *   npx tsx scripts/indexnow.ts --dry-run          … 送らずに件数と大きさだけ出す
 *   npx tsx scripts/indexnow.ts --sitemap <パスか URL>  … 別のサイトマップを読む（例 https://used.gadelog.com/sitemap.xml）
 *
 * 鍵は public/<KEY>.txt（中身も同じ鍵）。IndexNow の鍵は公開が前提で、秘密ではない。
 * 失敗してもワークフローを止めない（警告を出して終了コード 0）
 */
import { readFile } from "node:fs/promises";

const HOST = "used.gadelog.com";
const KEY = "619cc190a530a2739b8c46ad71b82fb9";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 10000; // IndexNow の1回あたりの上限
/** noindex のページ（サイトマップには入っていないはずだが念のため） */
const EXCLUDE = [/^\/search(\/|$|\?)/];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function loadSitemap(src: string): Promise<string> {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
    return res.text();
  }
  return readFile(src, "utf8");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const src = arg("--sitemap") ?? "out/sitemap.xml";
  const xml = await loadSitemap(src);
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

  const urls: string[] = [];
  let otherHost = 0;
  for (const loc of locs) {
    let u: URL;
    try {
      u = new URL(loc);
    } catch {
      continue;
    }
    // ローカルの書き出し（http://localhost:3000）は本番の URL に読み替える（dry-run の確認用）
    if (u.hostname === "localhost") u = new URL(u.pathname + u.search, `https://${HOST}`);
    if (u.hostname !== HOST) {
      otherHost++;
      continue;
    }
    if (EXCLUDE.some((re) => re.test(u.pathname + u.search))) continue;
    urls.push(u.href);
  }
  const urlList = [...new Set(urls)].slice(0, MAX_URLS);
  const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList });
  console.log(`IndexNow: サイトマップ ${locs.length} 件 → 送る ${urlList.length} 件（他ホスト ${otherHost} 件除外）・${body.length} バイト`);

  if (dryRun) {
    console.log(urlList.slice(0, 5).join("\n") + (urlList.length > 5 ? "\n…" : ""));
    console.log("dry-run: 送信しない");
    return;
  }
  if (urlList.length === 0) {
    console.log("::warning::IndexNow: 送る URL がない");
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const text = (await res.text()).slice(0, 300);
  // 200: 受理 / 202: 受理（鍵の確認待ち）。それ以外（400・403 鍵の不一致・422・429）は警告だけ
  if (res.status === 200 || res.status === 202) console.log(`IndexNow: HTTP ${res.status}`);
  else console.log(`::warning::IndexNow: HTTP ${res.status} ${text}`);
}

main().catch((error) => {
  console.log(`::warning::IndexNow: ${error instanceof Error ? error.message : String(error)}`);
});
