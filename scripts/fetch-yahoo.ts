/**
 * Yahoo!ショッピング 商品検索API（v3）から、lib/yahooShops.ts の店の iPhone・iPad・Pixel・Galaxy の中古在庫を取得し、
 * <ストアID>.json.gz（{ items: RakutenItem[] }）を書き出す。GitHub Actions（scraper.yaml）が実行し、
 * 直後に scripts/ingest-rakuten.ts <ディレクトリ> --family yahoo が取り込む（楽天と同じ形の JSON なので洗い替え・安全装置を共有する）。
 *
 *   npx tsx scripts/fetch-yahoo.ts [--debug] [--shop <ストアID>]
 *   環境変数: YAHOO_APP_ID（Client ID。必須）・YAHOO_OUT_DIR（出力先。既定 yahoo-data）
 *   --debug … 最初の1商品の生の応答を表示する（応答の形を確かめるとき）
 *   --shop  … 指定したストアだけ
 *
 * - API は 1 秒に 1 回まで（1.1 秒以上あける）。429・5xx は待って 3 回までやり直す
 * - 1回の検索で取れるのは先頭 1,000 件まで。それを超える検索は価格帯を半分ずつに割って取る（rakuten-sync/fetch.php の collectRange と同じ考え方）
 * - 1 ストアでも取得に失敗したらそのストアのファイルは書かない（前回のファイルが古くなり、ingest が取り込まない＝既存の在庫を守る）。終了コードは 1
 * - リンク先はアフィリエイトの付かない商品URL。ValueCommerce のリンクは表示時にサイト側で組み立てる（lib/affiliate.ts）
 */
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import type { RakutenItem } from "@/lib/rakutenCommon";
import { YAHOO_SHOPS } from "@/lib/yahooShops";

const ENDPOINT = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";
const KEYWORDS = ["iPhone", "iPad", "Pixel", "Galaxy"];
/** 1ページの件数。API が 400 を返したら順に小さくする（上限が 100 でなかったときの保険） */
const PAGE_SIZES = [100, 50, 20];
const MAX_START = 1000; // start の上限＝1回の検索で取れる件数
const INTERVAL_MS = 1100;
const MAX_REQUESTS = 3000; // 暴走防止（1ストアあたり）

const debug = process.argv.includes("--debug");
const onlyShop = process.argv.includes("--shop") ? process.argv[process.argv.indexOf("--shop") + 1] : null;
const appId = process.env.YAHOO_APP_ID ?? "";
const outDir = process.env.YAHOO_OUT_DIR || "yahoo-data";

/** 応答のうち使う項目だけ（v3: hits[]。シンプルな形に絞って、足りない項目があっても落ちないようにする） */
type Hit = {
  name?: string;
  description?: string;
  headLine?: string;
  url?: string;
  code?: string;
  price?: number;
  inStock?: boolean;
  condition?: string;
  seller?: { sellerId?: string; name?: string };
  janCode?: string;
};
type Page = { total: number; hits: Hit[] };

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;
let requestCount = 0;
let pageSizeIndex = 0;
let printedRaw = false;

async function fetchPage(sellerId: string, keyword: string, start: number, from: number, to: number): Promise<Page> {
  if (++requestCount > MAX_REQUESTS) throw new Error("too many requests (MAX_REQUESTS)");
  for (let attempt = 1; ; attempt++) {
    const wait = lastCall + INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();

    const params = new URLSearchParams({
      appid: appId,
      query: keyword,
      seller_id: sellerId,
      condition: "used",
      in_stock: "true",
      results: String(PAGE_SIZES[pageSizeIndex]),
      start: String(start),
      sort: "+price",
      price_from: String(from),
      price_to: String(to),
    });
    let status = 0;
    let body = "";
    try {
      const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(30_000) });
      status = res.status;
      body = await res.text();
    } catch (error) {
      body = String(error); // タイムアウト・接続エラー（status 0）は一時的なものとして扱う
    }

    if (status === 200) {
      const data = JSON.parse(body) as { totalResultsAvailable?: number; hits?: Hit[] };
      if (debug && !printedRaw) {
        printedRaw = true;
        console.log("応答のキー:", Object.keys(data), "totalResultsAvailable:", data.totalResultsAvailable);
        console.log("最初の1商品:", JSON.stringify(data.hits?.[0], null, 1));
      }
      return { total: Number(data.totalResultsAvailable ?? 0), hits: Array.isArray(data.hits) ? data.hits : [] };
    }
    // 件数の指定が受け付けられないとき（400）は、1ページの件数を小さくしてやり直す。小さくしても 400 ならそのまま失敗
    if (status === 400 && pageSizeIndex < PAGE_SIZES.length - 1) {
      console.warn(`HTTP 400（results=${PAGE_SIZES[pageSizeIndex]}）→ ${PAGE_SIZES[pageSizeIndex + 1]} 件にしてやり直す: ${body.slice(0, 200)}`);
      pageSizeIndex++;
      if (start > 1) throw new ApiError(400, "page size changed while paging"); // 途中で件数を変えると位置がずれるので、この価格帯を最初から取り直させる
      continue;
    }
    const detail = `HTTP ${status} start=${start} price=${from}-${to} ${body.slice(0, 300)}`;
    if (attempt >= 3 || (status >= 400 && status < 500 && status !== 429)) throw new ApiError(status, detail);
    console.warn(`${sellerId} ${keyword} retry ${attempt}: ${detail}`);
    await sleep(3000 * attempt);
  }
}

/** 商品説明・キャッチコピーからの抜き出し（fetch.php の compactItem と同じ書き方に、Yahoo の店で見つけた書き方を足している） */
function extract(text: string): Pick<RakutenItem, "rank" | "nw" | "batt" | "car"> {
  const t = text.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const rank =
    t.match(/【程度】\s*([SABCJ])/)?.[1] ??
    t.match(/〔商品ランク\s*([SABCJ])〕/)?.[1] ??
    t.match(/\[中古\s*([SABCJ])ランク\]/)?.[1] ??
    t.match(/【([SABCJ])ランク】/)?.[1] ??
    t.match(/この商品は\s*(?:中古)?([SABCJ])ランク/)?.[1] ??
    t.match(/(?:商品)?ランク\s*[：:]\s*([SABCJ])/)?.[1] ??
    t.match(/中古\s*([SABCJ])ランク/)?.[1] ??
    null;
  const nw =
    t.match(/ネットワーク利用制限確認【([^】]*)】/)?.[1] ??
    t.match(/ネットワーク利用制限\s*[：:]?\s*([〇○△×✕－-])/)?.[1] ??
    t.match(/利用制限\s*[：:]\s*([○〇△×✕－-])/)?.[1] ??
    null;
  const batt = t.match(/最大容量\s*[：:]?\s*(\d{2,3})\s*[%％]/)?.[1] ?? t.match(/バッテリー容量\s*[：:]?\s*(\d{2,3})\s*[%％]/)?.[1] ?? null;
  const car = t.match(/〔キャリア〕\s*([^〔\s]+)/)?.[1] ?? null;
  return { rank, nw, batt: batt ? Number(batt) : null, car };
}

/** API の1商品 → 楽天と同じ形の1商品。必要な項目がない・在庫なし・中古でない商品は null */
function toItem(sellerId: string, hit: Hit): RakutenItem | null {
  if (!hit.code || !hit.name || !hit.url || !(Number(hit.price) > 0)) return null;
  if (hit.inStock === false) return null;
  if (hit.condition && hit.condition !== "used") return null;
  if (hit.seller?.sellerId && hit.seller.sellerId !== sellerId) return null;
  // アフィリエイトの付かない商品URL（クエリ・フラグメントは落とす）
  let url = hit.url;
  try {
    const u = new URL(hit.url);
    u.search = "";
    u.hash = "";
    url = u.toString();
  } catch {
    return null;
  }
  return {
    code: `${sellerId}:${hit.code}`,
    name: hit.name,
    price: Number(hit.price),
    url,
    ...extract(`${hit.headLine ?? ""}\n${hit.description ?? ""}`),
  };
}

/** 価格帯 [from, to] の在庫を集める。先頭 1,000 件を超える帯は半分に割って再帰的に取得する */
async function collectRange(sellerId: string, keyword: string, from: number, to: number, items: Map<string, RakutenItem>): Promise<void> {
  const first = await fetchPage(sellerId, keyword, 1, from, to);
  if (first.total > MAX_START && to - from > 1) {
    const mid = Math.floor((from + to) / 2);
    await collectRange(sellerId, keyword, from, mid, items);
    await collectRange(sellerId, keyword, mid + 1, to, items);
    return;
  }
  let page = first;
  let start = 1;
  let pages = 1;
  for (;;) {
    for (const hit of page.hits) {
      const item = toItem(sellerId, hit);
      if (item) items.set(item.code, item);
    }
    start += page.hits.length;
    // 空のページ・全件取った・上限に達した（「1ページの件数に満たない」では止めない: API が指定より少なく返しても取りこぼさないため）
    if (page.hits.length === 0 || start > page.total || start > MAX_START) break;
    page = await fetchPage(sellerId, keyword, start, from, to);
    pages++;
  }
  console.log(`${sellerId} ${keyword} price ${from}-${to}: total=${first.total}, pages=${pages}`);
}

async function fetchShop(sellerId: string): Promise<boolean> {
  requestCount = 0;
  const items = new Map<string, RakutenItem>();
  try {
    for (const keyword of KEYWORDS) {
      // 件数の変更で取り直しになったとき（ApiError 400）は 1 回だけやり直す
      try {
        await collectRange(sellerId, keyword, 1, 999999, items);
      } catch (error) {
        if (!(error instanceof ApiError && error.message === "page size changed while paging")) throw error;
        await collectRange(sellerId, keyword, 1, 999999, items);
      }
    }
  } catch (error) {
    console.error(`${sellerId}: 取得に失敗 ${String(error)}`);
    return false;
  }
  console.log(`${sellerId} fetched ${items.size} items with ${requestCount} requests`);
  if (items.size === 0) {
    console.error(`${sellerId}: 0件（ストアID・条件を確認）。ファイルは書かない`);
    return false;
  }
  // 書きかけを読まれないよう、一時ファイルに書いてから名前を変える
  mkdirSync(outDir, { recursive: true });
  const tmp = join(outDir, `.${sellerId}.json.gz.${process.pid}.tmp`);
  writeFileSync(tmp, gzipSync(JSON.stringify({ items: [...items.values()] }), { level: 9 }));
  renameSync(tmp, join(outDir, `${sellerId}.json.gz`));
  console.log(`${sellerId} saved: ${join(outDir, `${sellerId}.json.gz`)}`);
  return true;
}

async function main() {
  if (!appId) throw new Error("YAHOO_APP_ID（Client ID）がない");
  let failed = 0;
  for (const sellerId of Object.keys(YAHOO_SHOPS)) {
    if (onlyShop && sellerId !== onlyShop) continue;
    if (!(await fetchShop(sellerId))) failed++;
  }
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
