/**
 * Yahoo!ショッピング 商品検索API（v3）の切り分け用（DB は読まない・書かない）。
 * 条件を1つずつ外して totalResultsAvailable と先頭の商品のストアを出す。
 *   YAHOO_APP_ID=... npx tsx scripts/probe-yahoo.ts [ストアID]
 * 2026-11-11: モバステ（mobilestation）だけ 0件になった件の調査で追加（ideas/2026-11-11.md）
 */
const ENDPOINT = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";
const appId = process.env.YAHOO_APP_ID;
if (!appId) throw new Error("YAHOO_APP_ID がない");
const seller = process.argv[2] ?? "mobilestation";

type Hit = { name?: string; condition?: string; inStock?: boolean; seller?: { sellerId?: string; name?: string } };

const cases: [string, Record<string, string>][] = [
  ["いまの条件（query=iPhone・seller・used・in_stock）", { query: "iPhone", seller_id: seller, condition: "used", in_stock: "true" }],
  ["condition なし", { query: "iPhone", seller_id: seller, in_stock: "true" }],
  ["in_stock なし", { query: "iPhone", seller_id: seller, condition: "used" }],
  ["seller と query だけ", { query: "iPhone", seller_id: seller }],
  ["query を iPhone13 に", { query: "iPhone13", seller_id: seller }],
  ["seller なし・商品名で（モバステの iPhone13 7641）", { query: "iPhone13 128GB MLND3J/A 整備済中古品 7641" }],
  ["seller なし・query=モバステ iPhone", { query: "モバステ iPhone" }],
  ["比較: mcom2022 のいまの条件", { query: "iPhone", seller_id: "mcom2022", condition: "used", in_stock: "true" }],
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
for (const [label, p] of cases) {
  const params = new URLSearchParams({ appid: appId, results: "5", ...p });
  const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(30_000) });
  const body = await res.text();
  if (res.status !== 200) {
    console.log(`[${label}] HTTP ${res.status} ${body.slice(0, 200)}`);
  } else {
    const data = JSON.parse(body) as { totalResultsAvailable?: number; hits?: Hit[] };
    const hits = (data.hits ?? []).slice(0, 3).map((h) => `${h.seller?.sellerId}(${h.seller?.name}) ${h.condition} inStock=${h.inStock} ${String(h.name).slice(0, 40)}`);
    console.log(`[${label}] total=${data.totalResultsAvailable}`);
    for (const h of hits) console.log(`    ${h}`);
  }
  await sleep(1500);
}
}

main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
