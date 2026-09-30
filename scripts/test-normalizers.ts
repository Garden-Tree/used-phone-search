/**
 * 商品名の読み取り・機種名の照合の回帰テスト。読み取りを変えたら実行する
 *   npm run test:normalize            … 期待値と比べる（差分があれば exit 1）
 *   npm run test:normalize -- --update … 期待値を今の結果で上書き（差分が意図どおりのときだけ）
 * 楽天API は手元から呼べないので、楽天の公開ページからコピーした商品名で確かめる。新しい表記を見つけたら CORPUS に足す
 */
import { writeFileSync, readFileSync } from "node:fs";
import { RAKUTEN_SHOPS } from "@/lib/rakutenShops";
import { IPAD_MODELS, canonicalIpadModel } from "@/lib/ipadCatalog";
import { IPAD_SPECS, IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { matchesModel } from "@/lib/deviceSearch";
import { SHOPS } from "@/lib/shops";
import { PICKS } from "@/lib/picks";
import { PIXEL_INFO, PIXEL_MODELS, updateYearsLeft } from "@/lib/pixelCatalog";
import { GALAXY_MODELS, GALAXY_RELEASED, canonicalGalaxyModel } from "@/lib/galaxyCatalog";
import { ALL_DEVICE_PAGE_MODELS } from "@/lib/catalog";
const u = "https://item.rakuten.co.jp/x/1/";
// [shopCode, 商品名, rank, car, batt]（rank・car・batt は fetch.php が商品説明から抜き出す値）
const CORPUS: [string, string, string | null, string | null, number | null][] = [
 ["janpara","【中古】Apple au 【SIMロック解除済み】 iPhone 12 mini 128GB ブルー MGDP3J/A【京都】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Apple SoftBank 【SIMフリー】 iPhone 14 128GB (PRODUCT)RED MPV93J/A【仙台駅東口】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【未使用】Apple 国内版 【SIMフリー】 iPhone Air 256GB スカイブルー MG2A4J/A【福岡筑紫】保証期間3ヶ月",null,null,null],
 ["janpara","【中古】Apple docomo 【SIMロック解除済み】 iPhone SE（第2世代） 64GB ブラック MHGP3J/A（後期型番）【アリオ倉敷】保証期間1ヶ月【ランクA】",null,null,null],
 ["janpara","【中古】Apple 海外版 【SIMフリー】 iPhone 16 Pro Max 256GB デザートチタニウム【ECセンター】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Apple J:COM 【SIMフリー】 iPhone 12 64GB ブラック MGHN3J/A【吉祥寺】保証期間１ヶ月【ランクC】",null,null,null],
 ["janpara","【中古】Apple UQmobile 【SIMフリー】 iPhone 13 128GB ミッドナイト MLNC3J/A【x】保証期間1ヶ月【ランクA】",null,null,88],
 ["janpara","【中古】Apple 国内版 【SIMフリー】 iPad Air（第4世代/2020） 64GB スカイブルー MYH02J/A【ECセンター】保証期間1ヶ月【ランクC】",null,null,null],
 ["janpara","【中古】Apple 【Wi-Fi】 iPad（A16/2025） 128GB シルバー MD3Y4J/A【熊本】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Apple docomo 【SIMフリー】 iPad mini（第6世代/2021） 64GB スペースグレイ MK893J/A【戸塚】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Apple 【Wi-Fi】 11インチ iPad Pro（M5/2025） 256GB スペースブラック 標準ガラス MDWK4J/A【錦糸町北口】保証期間1ヶ月【ランクA】",null,null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPhone14 Pro 128GB ディープパープル MQ0F3J／A SIMフリー 【377-ud】","A","docomoロック解除SIMフリー",82],
 ["akiba-u-shop","【中古】SoftBank iPhone SE 第2世代 64GB ホワイト MX9T2J／A SoftBank 【262-ud】","B",null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPhone15 256GB ブルー MTMR3J／A SIMフリー","C","SIMフリー",90],
 ["akiba-u-shop","【中古】Apple(アップル) iPhone SE (第3世代) 64GB ミッドナイト MMYC3J／A au 【301-ud】","B",null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPad Pro 11インチ 第2世代 256GB スペースグレイ MXE42J／A SIMフリー 【269-ud】","A",null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPad mini(A17 Pro) 256GB スペースグレイ MXNA3J／A Wi-Fi 【258-ud】","B",null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPad mini 第6世代 64GB スペースグレイ MK893J／A auロック解除SIMフリー 【258-ud】","A","auロック解除SIMフリー",91],
 ["geo-mobile","【中古】【安心保証】 iPhone15 Pro[512GB] SIMロック解除 docomo ブルーチタニウム","A",null,null],
 ["geo-mobile","【中古】【安心保証】 iPhone13[128GB] au/UQmobile ミッドナイト","B",null,null],
 ["geo-mobile","【中古】【安心保証】 iPad 10.2インチ 第8世代[32GB] Wi-Fiモデル シルバー","B",null,null],
 ["geo-mobile","【中古】【安心保証】 iPad 11インチ A16[128GB] Wi-Fiモデル シルバー","A",null,null],
 ["geo-mobile","【中古】【安心保証】 Google Pixel 8a[128GB] docomo ポーセリン","B",null,null],
 ["geo-mobile","【中古】【安心保証】 Google Pixel 10[256GB] SIMフリー オブシディアン","A",null,null],
 ["geo-mobile","【中古】【安心保証】 Google Pixel 8[128GB] UQモバイル ローズ","C",null,null],
 ["geo-mobile","【中古】【安心保証】 Google Pixel 4a 5G[128GB] SoftBank クリアリーホワイト","B",null,null],
 ["janpara","【中古】Google au 【SIMフリー】 Pixel Fold ポーセリン 12GB 256GB G0B96【日本橋3】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Google 国内版 【SIMフリー】 Pixel 10 Pro Fold ジェイド 16GB 256GB【ECセンター】保証期間1ヶ月【ランクB】",null,null,91],
 ["janpara","【未使用】Google 【SIMフリー】 Pixel 11 [Obsidian] 12GB 256GB【仙台イービーンズ】保証期間3ヶ月",null,null,null],
 ["janpara","【中古】Google 海外版 【SIMフリー】 Pixel 10 Pro 16GB 128GB【仙台駅東口】保証期間1ヶ月【ランクA】",null,null,null],
 ["janpara","【中古】Google SoftBank 【SIMロック解除済み】 Pixel 4 Oh So Orange 6GB 64GB G020N【川越クレアモール】保証期間1ヶ月【ランクC】",null,null,null],
 ["akiba-u-shop","【中古】GOOGLE(グーグル) Google Pixel 6a 128GB セージ GB17L au SIMフリー 【305-ud】","B",null,88],
 ["akiba-u-shop","【中古】GOOGLE(グーグル) Google Pixel 10a 128GB Berry PIXEL10A128 SIMフリー 【196-ud】","A","SIMフリー",100],
 ["akiba-u-shop","【中古】GOOGLE(グーグル) Google Pixel 5a (5G) 128GB モーストリーブラック Softbank SIMフリー 【276-ud】","B",null,null],
 ["geo-mobile","【中古】【安心保証】 Galaxy A55 5G SCG27[128GB] au オーサムライラック","B",null,null],
 ["geo-mobile","【中古】【安心保証】 Galaxy S24 Ultra SCG26[512GB] au チタニウムブラック","A",null,null],
 ["geo-mobile","【中古】【安心保証】 Galaxy A51 5G SC-54A[128GB] docomo プリズムブリックスブラック","B",null,null],
 ["janpara","【中古】SAMSUNG docomo 【SIMフリー】 Galaxy S24 Ultra チタニウムバイオレット 12GB 256GB SC-52E【秋葉5号】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】SAMSUNG 国内版 【SIMフリー】 Galaxy Z Flip7 ブルーシャドウ 12GB 256GB SM-F766Q【DS秋葉】保証期間1ヶ月【ランクA】",null,null,87],
 ["janpara","【未使用】SAMSUNG docomo 【SIMフリー】 Galaxy A25 5G ブラック 4GB 64GB SC-53F【千葉】保証期間3ヶ月",null,null,null],
 ["janpara","【中古】SAMSUNG docomo 【SIMロックあり】 Galaxy S9 SC-02K Titanium Gray【仙台駅東口】保証期間1ヶ月【ランクB】",null,null,null],
 ["akiba-u-shop","【中古】SAMSUNG(サムスン) Galaxy S24 256GB アンバーイエロー SC-51E docomo SIMフリー 【269-ud】","B",null,92],
 ["akiba-u-shop","【中古】GALAXY(ギャラクシー) Galaxy S22 Ultra 256GB バーガンディ SCG14 au SIMフリー 【352-ud】","C",null,null],
 ["akiba-u-shop","【中古】SAMSUNG(サムスン) Galaxy Z Fold7 256GB ジェットブラック SM-F966QZKASJP SIMフリー 【258-ud】","A",null,null],
 ["akiba-u-shop","【中古】SAMSUNG(サムスン) GALAXY A21 64GB ブラック SC-42A docomoロック解除SIMフリー 【305-ud】","B",null,null],
];
const FIXTURE = "scripts/fixtures/rakuten-normalize.expected.json";
let failures = 0;

// 1. 楽天3店の商品名の読み取り（期待値はファイル）
const out = CORPUS.map(([shop, name, rank, car, batt]) =>
  RAKUTEN_SHOPS[shop].normalize({ code: "x", name, price: 1000, url: u, rank, nw: "○", car, batt }),
);
if (process.argv.includes("--update")) {
  writeFileSync(FIXTURE, JSON.stringify(out, null, 1));
  console.log(`期待値を更新しました（${out.filter(Boolean).length}/${out.length} 件が読み取れる）`);
} else {
  const expected = JSON.parse(readFileSync(FIXTURE, "utf8"));
  out.forEach((o, i) => {
    if (JSON.stringify(o) !== JSON.stringify(expected[i])) {
      failures++;
      console.log(`DIFF ${CORPUS[i][1].slice(0, 50)}
  期待 ${JSON.stringify(expected[i])}
  結果 ${JSON.stringify(o)}`);
    }
  });
}

// 2. iPad の機種名の正規化（店ごとの表記 → 正式名）
const IPAD_CASES: [string, string | null][] = [
  ["iPad Air（第4世代/2020）", "iPad Air (第4世代)"], ["11インチ iPad Air（M4/2026)", "iPad Air 11インチ (M4)"],
  ["iPad 10.2インチ 第8世代", "iPad (第8世代)"], ["iPad 11インチ A16", "iPad (A16)"], ["iPad mini(A17 Pro)", "iPad mini (A17 Pro)"],
  ["iPad Pro 11-inch (M4)", "iPad Pro 11インチ (M4)"], ["iPad Air (第 5 世代)", "iPad Air (第5世代)"],
  ["iPad Air5 第5世代", "iPad Air (第5世代)"], ["iPad2022 第10世代", "iPad (第10世代)"],
  ["iPad Pro(M4) 11インチ 第5世代", "iPad Pro 11インチ (M4)"], ["iPad Air 3", "iPad Air (第3世代)"],
  ["iPad Air（M2/2024）", null], ["iPad Air 2", null],
];
for (const [raw, want] of IPAD_CASES) {
  const got = canonicalIpadModel(raw);
  if (got !== want) { failures++; console.log(`iPad: ${raw} → ${got}（期待 ${want}）`); }
}

// 3. 検索の機種照合
const MATCH_CASES: [string, string, boolean][] = [
  ["iPhone 13", "iPhone 13", true], ["iPhone 13", "iPhone 13 mini", false], ["iPhone 16", "iPhone 16e", false],
  ["iPhone 7", "iPhone 17", false], ["iPhone SE", "iPhone SE (第3世代)", true], ["iPhone 11", "iPad Pro 11インチ (第2世代)", false],
  ["iPad", "iPad Air (第5世代)", true], ["iPad Air", "iPad Pro 11インチ (M4)", false],
  ["iPad (第6世代)", "iPad mini (第6世代)", false], ["iPad Pro 11インチ (M4)", "iPad Pro 13インチ (M4)", false],
  ["Pixel 9", "Pixel 9", true], ["Pixel 9", "Pixel 9a", false], ["Pixel 9", "Pixel 9 Pro", false], ["Pixel 9 Pro", "Pixel 9 Pro XL", false],
  ["Pixel", "Pixel 8a", true], ["Pixel Fold", "Pixel 9 Pro Fold", false], ["Pixel Pro Fold", "Pixel 10 Pro Fold", true], ["iPhone 8", "Pixel 8", false], ["Pixel 8", "iPhone 8", false],
  ["Galaxy S24", "Galaxy S24", true], ["Galaxy S24", "Galaxy S24 Ultra", false], ["Galaxy S26", "Galaxy S26+", false],
  ["Galaxy Z Fold8", "Galaxy Z Fold8 Ultra", false], ["Galaxy Z Fold", "Galaxy Z Fold7", true], ["Galaxy S24", "Pixel 8", false],
];
for (const [q, name, want] of MATCH_CASES) {
  if (matchesModel(q, name) !== want) { failures++; console.log(`照合: "${q}" と "${name}" → ${!want}（期待 ${want}）`); }
}

// 4. 店の一覧（lib/shops.ts）に楽天の店名がそろっているか（ずれるとトップの件数・絞り込みが 0 件になる）
for (const { shopName } of Object.values(RAKUTEN_SHOPS)) {
  if (!SHOPS.some((s) => s.name === shopName)) { failures++; console.log(`店の一覧: lib/shops.ts に「${shopName}」がない`); }
}

// 5. iPad のスペック（lib/ipadSpecs.ts）がカタログの機種名とそろっているか（名前がずれると機種ページのスペック欄が消える）
for (const model of IPAD_MODELS) {
  if (!IPAD_SPECS[model]) { failures++; console.log(`iPad スペック: lib/ipadSpecs.ts に「${model}」がない`); }
}
for (const model of IPADOS27_MODELS) {
  if (!IPAD_MODELS.includes(model)) { failures++; console.log(`iPadOS 27: 「${model}」がカタログにない`); }
}
for (const model of Object.keys(IPAD_SPECS)) {
  if (!IPAD_MODELS.includes(model)) { failures++; console.log(`iPad スペック: 「${model}」がカタログにない`); }
}

// 6. 目的別ページの機種名がカタログにあるか（ずれるとその機種のカードが「在庫なし」になる）。iPad はどれも iPadOS 27 対応に絞っている
for (const pick of PICKS) {
  for (const model of pick.models) {
    if (!ALL_DEVICE_PAGE_MODELS.includes(model)) { failures++; console.log(`目的別 ${pick.slug}: 「${model}」がカタログにない`); }
    if (pick.ipad && !IPADOS27_MODELS.has(model)) { failures++; console.log(`目的別 ${pick.slug}: 「${model}」は iPadOS 27 非対応`); }
    if (pick.pixel && !((updateYearsLeft(model, new Date().toISOString().slice(0, 7)) ?? 0) > 0)) {
      failures++; console.log(`目的別 ${pick.slug}: 「${model}」はアップデート保証が終わっている`);
    }
  }
}

// 7. Pixel の機種一覧が TypeScript（lib/pixelCatalog.ts）とスクレイパー（scraper/common.py の PIXEL_MODELS）でそろっているか。
//    ずれると、取り込んだのにページがない（または逆）機種が出る。発売年月・保証年数（PIXEL_INFO）もそろっているか
const pyBlock = readFileSync("scraper/common.py", "utf-8").match(/PIXEL_MODELS = \{([\s\S]*?)\}/)?.[1] ?? "";
const pyPixel = new Set([...pyBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
for (const model of PIXEL_MODELS) {
  if (!pyPixel.has(model)) { failures++; console.log(`Pixel: scraper/common.py の PIXEL_MODELS に「${model}」がない`); }
  if (!PIXEL_INFO[model]) { failures++; console.log(`Pixel: PIXEL_INFO に「${model}」がない`); }
}
for (const model of pyPixel) {
  if (!PIXEL_MODELS.includes(model)) { failures++; console.log(`Pixel: lib/pixelCatalog.ts に「${model}」がない（scraper/common.py にはある）`); }
}

// 8. Galaxy の機種一覧が TypeScript（lib/galaxyCatalog.ts）とスクレイパー（scraper/common.py の GALAXY_MODELS）でそろっているか。
//    TypeScript の読み取り（canonicalGalaxyModel）が各機種名をそのまま返すか（S26+ の「+」など）
const pyGalaxyBlock = readFileSync("scraper/common.py", "utf-8").match(/GALAXY_MODELS = \{([\s\S]*?)\}/)?.[1] ?? "";
const pyGalaxy = new Set([...pyGalaxyBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
for (const model of GALAXY_MODELS) {
  if (!pyGalaxy.has(model)) { failures++; console.log(`Galaxy: scraper/common.py の GALAXY_MODELS に「${model}」がない`); }
  if (canonicalGalaxyModel(model) !== model) { failures++; console.log(`Galaxy: canonicalGalaxyModel("${model}") → ${canonicalGalaxyModel(model)}`); }
  if (!GALAXY_RELEASED[model]) { failures++; console.log(`Galaxy: GALAXY_RELEASED に「${model}」がない`); }
}
for (const model of pyGalaxy) {
  if (!GALAXY_MODELS.includes(model)) { failures++; console.log(`Galaxy: lib/galaxyCatalog.ts に「${model}」がない（scraper/common.py にはある）`); }
}

console.log(failures === 0 ? "OK: すべて期待どおり" : `NG: ${failures} 件`);
process.exitCode = failures === 0 ? 0 : 1;
