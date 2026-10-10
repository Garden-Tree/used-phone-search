/**
 * Amazon.co.jp の整備済み品（Renewed）を Creators API（SearchItems）で集め、amazon-data/amazon.json.gz
 * （{ items: RakutenItem[], fetchedAt }）を書き出す。GitHub Actions（scraper.yaml）が実行し、
 * 直後に scripts/ingest-rakuten.ts amazon-data --family amazon が取り込む（楽天と同じ形の JSON）。
 *
 *   npx tsx scripts/fetch-amazon.ts [--debug] [--dry]
 *   環境変数: AMAZON_CREDENTIAL_ID・AMAZON_CREDENTIAL_SECRET・AMAZON_PARTNER_TAG（必須）
 *            AMAZON_CREDENTIAL_VERSION（既定 3.3。3.1 は北米、3.2 は英国の認証サーバー）・AMAZON_OUT_DIR（既定 amazon-data）
 *   --debug … 最初の1商品の生の応答を表示する（応答の形を確かめるとき）
 *   --dry   … 先頭3機種だけ
 *
 * - 機種（lib/catalog.ts の ALL_DEVICE_PAGE_MODELS）ごとに「<機種> 整備済み品」で検索し、1機種あたり最大 5 ページ（1ページ10件）。
 *   ページが10件に満たない・総件数に達した・3ページ目以降で整備済み品が1件もないときは打ち切る
 * - API は 1 秒に 1 回・1日 8,640 回まで。1.5 秒あける（1.1 秒では 10/10 に 429 が続いた）。429 は 30・60・90・120 秒待って 5 回まで、5xx は 3 回までやり直す。401 はトークンを取り直す
 * - 整備済み品 = 購入ボタンの出品（isBuyBoxWinner。なければ先頭）の condition が Refurbished、またはタイトルに「整備済み」
 * - リンクは detailPageURL をそのまま使う（アソシエイトのタグ付き。変更不可）。価格は1時間までしか持てない（規約）→ 取り込み側で古いファイルは隠す
 * - 失敗したらファイルは書かず終了コード 1（前回のファイルが古くなり、取り込み側が在庫を隠す）
 */
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { ALL_DEVICE_PAGE_MODELS } from "@/lib/catalog";
import type { RakutenItem } from "@/lib/rakutenCommon";

const MARKETPLACE = "www.amazon.co.jp";
const API = "https://creatorsapi.amazon/catalog/v1/searchItems";
const TOKEN_URLS: Record<string, string> = {
  "3.1": "https://api.amazon.com/auth/o2/token",
  "3.2": "https://api.amazon.co.uk/auth/o2/token",
  "3.3": "https://api.amazon.co.jp/auth/o2/token",
};
const PAGE_SIZE = 10;
const MAX_PAGES = 5;
const EARLY_STOP_PAGE = 3; // このページ以降で整備済み品が1件もなければ打ち切る
const INTERVAL_MS = 1500;
const RESOURCES = [
  "itemInfo.title", "itemInfo.features", "itemInfo.byLineInfo",
  "offersV2.listings.price", "offersV2.listings.condition", "offersV2.listings.merchantInfo",
  "offersV2.listings.isBuyBoxWinner", "offersV2.listings.availability",
];

const debug = process.argv.includes("--debug");
const dry = process.argv.includes("--dry");
const credentialId = process.env.AMAZON_CREDENTIAL_ID ?? "";
const credentialSecret = process.env.AMAZON_CREDENTIAL_SECRET ?? "";
const partnerTag = process.env.AMAZON_PARTNER_TAG ?? "";
const version = process.env.AMAZON_CREDENTIAL_VERSION || "3.3";
const outDir = process.env.AMAZON_OUT_DIR || "amazon-data";

type Listing = {
  condition?: { value?: string; subCondition?: { value?: string }; conditionNote?: { value?: string } | string };
  isBuyBoxWinner?: boolean;
  merchantInfo?: { name?: string; id?: string };
  price?: { money?: { amount?: number; currency?: string } };
  availability?: { type?: string; message?: string };
};
type ApiItem = {
  asin?: string;
  detailPageURL?: string;
  itemInfo?: { title?: { displayValue?: string }; features?: { displayValues?: string[] } };
  offersV2?: { listings?: Listing[] };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;
let requestCount = 0;
let printedRaw = false;

// --- トークン（メモリに持つ。有効期限の少し前か 401 で取り直す） ---
let token: { value: string; expiresAt: number } | null = null;
async function getToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;
  const url = TOKEN_URLS[version];
  if (!url) throw new Error(`AMAZON_CREDENTIAL_VERSION が不明: ${version}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: credentialId, client_secret: credentialSecret, scope: "creatorsapi::default" }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`token HTTP ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("token response has no access_token");
  token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token.value;
}

async function search(keywords: string, itemPage: number): Promise<{ total: number; items: ApiItem[] }> {
  for (let attempt = 1; ; attempt++) {
    const wait = lastCall + INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    requestCount++;

    let status = 0;
    let body = "";
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json", "x-marketplace": MARKETPLACE },
        body: JSON.stringify({
          marketplace: MARKETPLACE, partnerTag, keywords, searchIndex: "Electronics", itemCount: PAGE_SIZE, itemPage,
          sortBy: "Price:LowToHigh", languagesOfPreference: ["ja_JP"], resources: RESOURCES,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      status = res.status;
      body = await res.text();
    } catch (error) {
      body = String(error); // タイムアウト・接続エラー（status 0）は一時的なものとして扱う
    }

    if (status === 200) {
      const data = JSON.parse(body) as { searchResult?: { items?: ApiItem[]; totalResultCount?: number } };
      const items = data.searchResult?.items ?? [];
      if (debug && !printedRaw) {
        printedRaw = true;
        console.log("応答のキー:", Object.keys(data), "totalResultCount:", data.searchResult?.totalResultCount);
        console.log("最初の1商品:", JSON.stringify(items[0], null, 1));
        // 読み取りを合わせるため、最初の応答の全商品を1行ずつ（題名・出品の状態・価格・出品者・特徴欄）
        for (const it of items) {
          const l = (it.offersV2?.listings ?? []).find((x) => x.isBuyBoxWinner) ?? it.offersV2?.listings?.[0];
          console.log("商品:", JSON.stringify({
            title: it.itemInfo?.title?.displayValue, cond: l?.condition, price: l?.price?.money, seller: l?.merchantInfo?.name,
            avail: l?.availability?.type, features: (it.itemInfo?.features?.displayValues ?? []).slice(0, 4),
          }));
        }
      }
      return { total: Number(data.searchResult?.totalResultCount ?? 0), items };
    }
    if (status === 401) token = null; // 次の試行でトークンを取り直す
    const detail = `HTTP ${status} "${keywords}" page=${itemPage} ${body.slice(0, 300)}`;
    // 直らない 4xx（401・429 以外）は即失敗
    if (attempt >= (status === 429 ? 5 : 3) || (status >= 400 && status < 500 && status !== 429 && status !== 401)) throw new Error(detail);
    console.warn(`retry ${attempt}: ${detail}`);
    await sleep(status === 429 ? 30_000 * attempt : 3000 * attempt);
  }
}

/** 特徴欄・タイトルなどの文からの抜き出し。プレミアム→A・優良→B・良い→C、バッテリーは「90%以上」「80%以上」と書かれているときだけ */
function extract(text: string): Pick<RakutenItem, "rank" | "batt"> {
  const rank = /プレミアム/.test(text) ? "A" : /優良/.test(text) ? "B" : /[「【]良い[」】]|(?:コンディション|状態|品質)[^。\n]{0,10}良い/.test(text) ? "C" : null;
  const batt = text.match(/バッテリー[^。\n]{0,30}?(90|80)\s*[%％]\s*以上/)?.[1] ?? text.match(/(90|80)\s*[%％]\s*以上[^。\n]{0,20}バッテリー/)?.[1] ?? null;
  return { rank, batt: batt ? Number(batt) : null };
}

/** API の1商品 → 楽天と同じ形の1商品。整備済み品でない・価格がない・在庫なしは null */
function toItem(it: ApiItem): RakutenItem | null {
  const title = it.itemInfo?.title?.displayValue;
  if (!it.asin || !it.detailPageURL || !title) return null;
  const listings = it.offersV2?.listings ?? [];
  const listing = listings.find((l) => l.isBuyBoxWinner) ?? listings[0];
  if (!listing) return null;
  if (!(listing.condition?.value === "Refurbished" || /整備済み/.test(title))) return null;
  if (/OUT_OF_STOCK/i.test(listing.availability?.type ?? "")) return null;
  const amount = Number(listing.price?.money?.amount);
  if (!(amount > 0) || (listing.price?.money?.currency && listing.price.money.currency !== "JPY")) return null;
  const note = typeof listing.condition?.conditionNote === "string" ? listing.condition.conditionNote : listing.condition?.conditionNote?.value ?? "";
  const text = [title, ...(it.itemInfo?.features?.displayValues ?? []), listing.condition?.subCondition?.value ?? "", note].join("\n");
  return {
    code: `amazon:${it.asin}`,
    name: title,
    price: Math.round(amount),
    url: it.detailPageURL, // 変更しない（タグ付き）
    nw: null,
    seller: listing.merchantInfo?.name ?? null,
    car: null,
    ...extract(text),
  };
}

async function main() {
  if (!credentialId || !credentialSecret || !partnerTag) throw new Error("AMAZON_CREDENTIAL_ID / AMAZON_CREDENTIAL_SECRET / AMAZON_PARTNER_TAG がない");
  const models = dry ? ALL_DEVICE_PAGE_MODELS.slice(0, 3) : ALL_DEVICE_PAGE_MODELS;
  console.log(`機種 ${models.length} 件 × 最大 ${MAX_PAGES} ページ = 最大 ${models.length * MAX_PAGES} リクエスト（約 ${Math.ceil((models.length * MAX_PAGES * INTERVAL_MS) / 60000)} 分。1日の上限 8,640）`);

  const items = new Map<string, RakutenItem>();
  for (const model of models) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { total, items: hits } = await search(`${model} 整備済み品`, page);
      let renewed = 0;
      for (const hit of hits) {
        const item = toItem(hit);
        if (item) {
          renewed++;
          items.set(item.code, item);
        }
      }
      if (hits.length < PAGE_SIZE || page * PAGE_SIZE >= total) break;
      if (page >= EARLY_STOP_PAGE && renewed === 0) break;
    }
  }
  console.log(`fetched ${items.size} items with ${requestCount} requests`);
  if (items.size === 0) throw new Error("0件（認証・条件を確認）。ファイルは書かない");

  // 書きかけを読まれないよう、一時ファイルに書いてから名前を変える
  mkdirSync(outDir, { recursive: true });
  const tmp = join(outDir, `.amazon.json.gz.${process.pid}.tmp`);
  writeFileSync(tmp, gzipSync(JSON.stringify({ items: [...items.values()], fetchedAt: new Date().toISOString() }), { level: 9 }));
  renameSync(tmp, join(outDir, "amazon.json.gz"));
  console.log(`saved: ${join(outDir, "amazon.json.gz")}`);
}

main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
