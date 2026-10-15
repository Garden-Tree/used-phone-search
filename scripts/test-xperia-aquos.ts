/**
 * Xperia・AQUOS の機種名・容量・キャリア・ランクの読み取りの回帰テスト（npm run test:android。違いがあれば exit 1）
 * 期待値は手で書いた表。商品名は 2026-10-15 に楽天の店内検索で確かめたもの。新しい表記を見つけたら ROWS に足す。
 * model が null の行は「範囲外（2020年以前・lite/basic の旧機種）で行にしない」ことを確かめる。
 */
import { RAKUTEN_SHOPS } from "@/lib/rakutenShops";
import { XPERIA_CATALOG, XPERIA_INFO, XPERIA_MODELS, canonicalXperiaModel } from "@/lib/xperiaCatalog";
import { AQUOS_CATALOG, AQUOS_INFO, AQUOS_MODELS, canonicalAquosModel } from "@/lib/aquosCatalog";
import { codeKey } from "@/lib/androidCommon";
import { codeRows, releasedSentence, supportSentence, updateRows } from "@/lib/androidInfo";
import { matchesModel } from "@/lib/modelMatch";
import { ALL_DEVICE_PAGE_MODELS, deviceOf, modelPagePath, modelToSlug, siblingModels, slugToModel } from "@/lib/catalog";
import { shopsFor } from "@/lib/shops";

let failures = 0;
const ng = (msg: string) => { failures++; console.log(`NG ${msg}`); };

type Want = {
  model: string; storage: number; carrier: string | null; rank: string; color: string;
  battery?: number | null; sim?: boolean; net?: string | null;
};
// [店の shopCode, 商品名, fetch.php が送る rank, car, batt, 期待（null は行にしない）]
type Row = [shop: string, name: string, rank: string | null, car: string | null, batt: number | null, want: Want | null];

const ROWS: Row[] = [
  // --- ゲオ（geo-mobile）。バッテリーの記載はない ---
  ["geo-mobile", "【中古】【安心保証】 Xperia 10 II SOV43[64GB] au ホワイト", "B", null, null, null],
  ["geo-mobile", "【中古】【安心保証】 Xperia 5 III SO-53B[128GB] docomo グリーン", "B", null, null,
    { model: "Xperia 5 III", storage: 128, carrier: "docomo", rank: "B", color: "グリーン", battery: null, sim: true }],
  ["geo-mobile", "【中古】【安心保証】 Xperia Ace SO-02L[64GB] docomo ブラック", "B", null, null, null],
  ["geo-mobile", "【中古】【安心保証】 AQUOS sense4 basic A003SH[64GB] Y!mobile ブラック", "B", null, null, null],
  ["geo-mobile", "【中古】【安心保証】 AQUOS sense4 SH-41A[64GB] docomo ライトブルー", "B", null, null, null],
  // --- じゃんぱら（janpara）。ランクは名前の【ランクA】、未使用は S ---
  ["janpara", "【未使用】SONY docomo 【SIMフリー】 Xperia 1 VII スレートブラック 12GB 256GB SO-51F【津田沼】保証期間3ヶ月", null, null, null,
    { model: "Xperia 1 VII", storage: 256, carrier: "docomo", rank: "S", color: "スレートブラック", battery: null, sim: true }],
  ["janpara", "【中古】SONY docomo 【SIMフリー】 Xperia 5 IV 8GB 128GB SO-54C ブラック【イオンモール新利府】保証期間1ヶ月【ランクA】", null, null, 88,
    { model: "Xperia 5 IV", storage: 128, carrier: "docomo", rank: "A", color: "ブラック", battery: 88, sim: true }],
  ["janpara", "【中古】SONY au 【SIMフリー】 Xperia 1 IV アイスホワイト 12GB 256GB SOG06【広島本通】保証期間1ヶ月【ランクC】", null, null, null,
    { model: "Xperia 1 IV", storage: 256, carrier: "au", rank: "C", color: "アイスホワイト", battery: null, sim: true }],
  ["janpara", "【未使用】SHARP mineo 【SIMフリー】 AQUOS sense10 6GB 128GB カーキグリーン SH-M33【ECセンター】保証期間3ヶ月", null, null, null,
    { model: "AQUOS sense10", storage: 128, carrier: null, rank: "S", color: "カーキグリーン", battery: null, sim: true }],
  ["janpara", "【中古】SHARP SoftBank 【SIMフリー】 AQUOS wish3 ブラック 4GB 64GB A303SH (法人向けモデル)【ECセンター】保証期間1ヶ月【ランクB】", null, null, null,
    { model: "AQUOS wish3", storage: 64, carrier: "SoftBank", rank: "B", color: "ブラック", battery: null, sim: true }],
  ["janpara", "【中古】SHARP SoftBank 【SIMフリー】 AQUOS sense7 plus ディープカッパー 6GB 128GB A208SH【中野】保証期間1ヶ月【ランクC】", null, null, null,
    { model: "AQUOS sense7 plus", storage: 128, carrier: "SoftBank", rank: "C", color: "ディープカッパー", battery: null, sim: true }],
  // SIM ロックありの旧機種（2021年10月より前の発売）は simUnlocked=false
  ["janpara", "【中古】SONY docomo 【SIMロックあり】 Xperia 10 III 6GB 128GB SO-52B ブラック【仙台】保証期間1ヶ月【ランクB】", null, null, null,
    { model: "Xperia 10 III", storage: 128, carrier: "docomo", rank: "B", color: "ブラック", battery: null, sim: false }],
  // --- ソフマップ（akiba-u-shop）。ランク・キャリアは fetch.php が送る値（rank・car）か名前から ---
  ["akiba-u-shop", "【中古】SONY(ソニー) Xperia 1 V 256GB ブラック SOSAZ3 Softbank SIMフリー 〔ネットワーク利用制限▲〕 【258-ud】", "B", null, null,
    { model: "Xperia 1 V", storage: 256, carrier: "SoftBank", rank: "B", color: "ブラック", battery: null, sim: true }],
  ["akiba-u-shop", "【中古】SONY(ソニー) Xperia 1 V 512GB カーキグリーン XQ-DQ44 SIMフリー 【344-ud】", "A", null, 90,
    { model: "Xperia 1 V", storage: 512, carrier: "国内版", rank: "A", color: "カーキグリーン", battery: 90, sim: true }],
  ["akiba-u-shop", "【中古】SONY(ソニー) Xperia 1 III 512GB フロストグリーン XQ-BC42 SIMフリー 【344-ud】", "C", null, null,
    { model: "Xperia 1 III", storage: 512, carrier: "国内版", rank: "C", color: "フロストグリーン", battery: null, sim: true }],
  ["akiba-u-shop", "【中古】SONY(ソニー) Xperia 10 VI 128GB ブルー XQ-ES44 L1JPCX0 SIMフリー 【352-ud】", "B", null, null,
    { model: "Xperia 10 VI", storage: 128, carrier: "国内版", rank: "B", color: "ブルー", battery: null, sim: true }],
  ["akiba-u-shop", "【中古】SHARP(シャープ) AQUOS wish 64GB チャコール SBAQWISH Softbank SIMフリー 【295-ud】", "B", null, null,
    { model: "AQUOS wish", storage: 64, carrier: "SoftBank", rank: "B", color: "チャコール", battery: null, sim: true }],
  ["akiba-u-shop", "【中古】SHARP(シャープ) AQUOS R7 256GB シルバー A202SH Softbank SIMフリー 【368-ud】", "C", null, null,
    { model: "AQUOS R7", storage: 256, carrier: "SoftBank", rank: "C", color: "シルバー", battery: null, sim: true }],
  // --- イオシス楽天市場店（pc-good）。名前に容量がない → ドコモの型番の表で決める。ランクは item.rank ---
  ["pc-good", "【ネットワーク利用制限−】Xperia1 VII SO-51F スレートブラック 【docomo版SIMフリー】 SONY 当社6ヶ月保証 イオシス", "A", null, null,
    { model: "Xperia 1 VII", storage: 256, carrier: "docomo", rank: "A", color: "スレートブラック", battery: 80, sim: true, net: "-" }],
  ["pc-good", "Xperia Ace III SO-53C グレー 【docomo版SIMフリー】 SONY 当社3ヶ月間保証 中古 イオシス", "B", null, null,
    { model: "Xperia Ace III", storage: 64, carrier: "docomo", rank: "B", color: "グレー", battery: 80, sim: true, net: "-" }],
  ["pc-good", "Xperia5 V SO-53D ブラック 【docomo版SIMフリー】 SONY 当社3ヶ月間保証 中古 イオシス", "C", null, null,
    { model: "Xperia 5 V", storage: 128, carrier: "docomo", rank: "C", color: "ブラック", battery: 80, sim: true, net: "-" }],
  ["pc-good", "AQUOS sense4 lite SH-RM15 ブラック 【Rakuten版SIMフリー】 SHARP 当社3ヶ月間保証 中古 イオシス", "B", null, null, null],
  ["pc-good", "AQUOS sense4 plus SH-M16 パープル 【Rakuten版SIMフリー】 SHARP 当社3ヶ月間保証 中古 イオシス", "B", null, null, null],
  // 容量が名前にある → それを使う。SIM フリー型番（XQ-）で容量がない → 決められないので行にしない
  ["pc-good", "Xperia 10 V XQ-DC44 128GB ブルー 【SIMフリー】 SONY 当社3ヶ月間保証 中古 イオシス", "B", null, null,
    { model: "Xperia 10 V", storage: 128, carrier: null, rank: "B", color: "ブルー", battery: 80, sim: true, net: null }],
  ["pc-good", "Xperia 10 V XQ-DC44 ブルー 【SIMフリー】 SONY 当社3ヶ月間保証 中古 イオシス", "B", null, null, null],
  // 付属品は行にしない
  ["pc-good", "Xperia 1 VII SO-51F 用 ケース クリア イオシス", "B", null, null, null],
];

const u = "https://item.rakuten.co.jp/x/1/";
ROWS.forEach(([shop, name, rank, car, batt, want], i) => {
  const got = RAKUTEN_SHOPS[shop].normalize({ code: `x${i}`, name, price: 12345, url: u, rank, nw: "○", car, batt });
  const label = name.slice(0, 60);
  if (want === null) { if (got !== null) ng(`範囲外のはずが行になった: ${label} → ${got.modelName} ${got.storage}`); return; }
  if (got === null) { ng(`行にならない: ${label}`); return; }
  const check = (field: string, a: unknown, b: unknown) => { if (a !== b) ng(`${field}: ${label} → ${String(a)}（期待 ${String(b)}）`); };
  check("機種", got.modelName, want.model);
  check("容量", got.storage, want.storage);
  check("キャリア", got.carrier ?? null, want.carrier);
  check("ランク", got.conditionRank, want.rank);
  check("色", got.color, want.color);
  if (want.battery !== undefined) check("バッテリー", got.batteryHealth ?? null, want.battery);
  if (want.sim !== undefined) check("SIMフリー", got.simUnlocked, want.sim);
  if (want.net !== undefined) check("利用制限", got.networkStatus ?? null, want.net);
  check("メーカー", got.manufacturer, want.model.startsWith("Xperia") ? "Sony" : "Sharp");
  check("価格", got.price, 12345);
});

// 機種名の決め方（型番を優先・名前だけの表記・全角ローマ数字・空白なし）
const NAME_CASES: [string, string | null][] = [
  ["Xperia 1 VI", "Xperia 1 VI"], ["Xperia1 VI", "Xperia 1 VI"], ["Xperia 1 Ⅵ", "Xperia 1 VI"], ["Xperia 5 Ⅳ", "Xperia 5 IV"],
  ["Xperia 10 IV", "Xperia 10 IV"], ["Xperia 10 V", "Xperia 10 V"], ["Xperia 1 V", "Xperia 1 V"], ["Xperia Ace III", "Xperia Ace III"],
  ["Xperia 1 V SO-51E", "Xperia 1 VI"], // 型番（SO-51E ＝ Xperia 1 VI）が名前より先
  ["Xperia 1 VII SO51F", "Xperia 1 VII"], ["Xperia 10 VIII", "Xperia 10 VIII"],
  ["Xperia 10 II", null], ["Xperia Ace", null], ["Xperia PRO-I", null], ["Xperia 5 II SO-52A", null],
];
for (const [raw, want] of NAME_CASES) {
  const got = canonicalXperiaModel(raw);
  if (got !== want) ng(`Xperia: ${raw} → ${got}（期待 ${want}）`);
}
const AQUOS_CASES: [string, string | null][] = [
  ["AQUOS sense6s", "AQUOS sense6s"], ["AQUOS sense6", "AQUOS sense6"], ["AQUOS sense6 SH-54B", "AQUOS sense6"], ["AQUOS sense6s SH-RM19s", "AQUOS sense6s"],
  ["AQUOS sense7", "AQUOS sense7"], ["AQUOS sense7 plus", "AQUOS sense7 plus"], ["AQUOS R8", "AQUOS R8"], ["AQUOS R8 pro", "AQUOS R8 pro"],
  ["AQUOS R9", "AQUOS R9"], ["AQUOS R9 pro", "AQUOS R9 pro"], ["AQUOS R9 PRO", "AQUOS R9 pro"], ["SH-R80P", "AQUOS R8 pro"], ["AQUOS R8 SH-R80P", "AQUOS R8 pro"],
  ["AQUOS wish", "AQUOS wish"], ["AQUOS wish 64GB", "AQUOS wish"], ["AQUOS wish2", "AQUOS wish2"], ["AQUOS wish6", "AQUOS wish6"],
  ["AQUOSsense9", "AQUOS sense9"], ["AQUOS R11", "AQUOS R11"],
  ["AQUOS sense4", null], ["AQUOS sense4 lite SH-RM15", null], ["AQUOS sense4 plus SH-M16", null], ["AQUOS sense5G", null], ["AQUOS R5G", null], ["AQUOS zero6", null],
];
for (const [raw, want] of AQUOS_CASES) {
  const got = canonicalAquosModel(raw);
  if (got !== want) ng(`AQUOS: ${raw} → ${got}（期待 ${want}）`);
}

// 検索の機種照合: 正式名は完全一致。世代違い・plus・pro は当たらない
const mm = (q: string, name: string, want: boolean) => { if (matchesModel(q, name) !== want) ng(`matchesModel("${q}", "${name}") は ${want} のはず`); };
mm("Xperia 1 V", "Xperia 1 V", true); mm("Xperia 1 V", "Xperia 1 VI", false); mm("Xperia 1 V", "Xperia 10 V", false); mm("Xperia 10 V", "Xperia 1 V", false);
mm("Xperia 1 VI", "Xperia 1 V", false); mm("Xperia 5 IV", "Xperia 5 V", false); mm("Xperia 10 IV", "Xperia 10 V", false);
mm("AQUOS sense7", "AQUOS sense7", true); mm("AQUOS sense7", "AQUOS sense7 plus", false); mm("AQUOS sense7 plus", "AQUOS sense7", false);
mm("AQUOS sense6", "AQUOS sense6s", false); mm("AQUOS R8", "AQUOS R8 pro", false); mm("AQUOS R9", "AQUOS R9 pro", false); mm("AQUOS wish", "AQUOS wish2", false);
mm("Xperia 1 V", "iPhone 13", false); mm("iPhone 13", "Xperia 1 V", false); mm("Galaxy S24", "AQUOS R8", false); mm("AQUOS R8", "Galaxy S24", false);
mm("Xperia", "Xperia 1 V", true); mm("AQUOS", "AQUOS R8", true);

// カタログの整合
if (XPERIA_MODELS.length !== 17) ng(`Xperia の機種数が ${XPERIA_MODELS.length}（17 のはず）`);
if (AQUOS_MODELS.length !== 21) ng(`AQUOS の機種数が ${AQUOS_MODELS.length}（21 のはず）`);
for (const [name, models, info, catalog, canon] of [
  ["Xperia", XPERIA_MODELS, XPERIA_INFO, XPERIA_CATALOG, canonicalXperiaModel],
  ["AQUOS", AQUOS_MODELS, AQUOS_INFO, AQUOS_CATALOG, canonicalAquosModel],
] as const) {
  if (new Set(models).size !== models.length) ng(`${name}: カタログの機種が重複`);
  if (JSON.stringify([...models].sort()) !== JSON.stringify(Object.keys(info).sort())) ng(`${name}: カタログ（シリーズ）と情報（INFO）の機種が一致しない`);
  for (const m of models) {
    const i = info[m];
    if (!i) { ng(`${name}: 情報がない: ${m}`); continue; }
    if (canon(m) !== m) ng(`${name}: canonical("${m}") → ${canon(m)}`);
    if (i.released !== null && !/^\d{4}(-\d{2})?$/.test(i.released)) ng(`${name}: 発売の形が不正: ${m} ${i.released}`);
    if (i.securityUntil !== null && !/^\d{4}-\d{2}$/.test(i.securityUntil)) ng(`${name}: セキュリティ更新の形が不正: ${m} ${i.securityUntil}`);
    const codes = [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])];
    if (codes.length === 0) ng(`${name}: 型番が1つもない: ${m}`);
    // 型番だけの商品名でも、その機種に決まる
    for (const c of codes) if (canon(`${c}`) !== m && canon(`Foo ${c} bar`) !== m) ng(`${name}: 型番 ${c} から ${m} に決まらない（→ ${canon(c)}）`);
    if (!releasedSentence(m) && i.released) ng(`${name}: 発売の文が作れない: ${m}`);
    if (codeRows(m).length === 0 && (i.unconfirmed ?? []).length === 0) ng(`${name}: 型番の表示がない: ${m}`);
    // 未確認（null）の項目は表示にも文にも出ない（推測で埋めない）
    if (i.osPolicy === null && i.securityUntil === null && (updateRows(m, "2026-10").length > 0 || supportSentence(m, "2026-10") !== null)) ng(`${name}: 公式の値がないのに更新情報が出る: ${m}`);
  }
  // 全機種のシリーズに入っていて、シリーズの機種名と並びが重複しない
  const inSeries = catalog.flatMap((s) => s.models);
  if (inSeries.length !== models.length) ng(`${name}: シリーズの機種数が合わない`);
}
// 型番は機種間（Xperia・AQUOS をまたいで）で重複しない
const seen = new Map<string, string>();
for (const [model, i] of [...Object.entries(XPERIA_INFO), ...Object.entries(AQUOS_INFO)]) {
  for (const c of [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])]) {
    const k = codeKey(c);
    if (seen.has(k) && seen.get(k) !== model) ng(`型番 ${c} が ${seen.get(k)} と ${model} で重複`);
    seen.set(k, model);
  }
}
// セキュリティ更新の終了済み／これから（公式の値があるものだけ）
if (!supportSentence("AQUOS sense7", "2026-10")?.includes("終了")) ng("AQUOS sense7（2025年10月終了）の文が「終了」を含まない");
if (!supportSentence("AQUOS sense9", "2026-10")?.includes("2029年10月まで")) ng("AQUOS sense9 の文が 2029年10月まで を含まない");
if (supportSentence("Xperia 5 V", "2026-10") !== null) ng("Xperia 5 V は公式の値がないので文を出さない");
if (releasedSentence("AQUOS wish6") !== null) ng("AQUOS wish6 は発売日が未確認なので文を出さない");

// ページ側: 種類・パス・スラッグ・同じシリーズ・店
const slugs = ALL_DEVICE_PAGE_MODELS.map(modelToSlug);
if (new Set(slugs).size !== slugs.length) ng("機種ページのスラッグが重複");
for (const m of XPERIA_MODELS) {
  if (deviceOf(m) !== "xperia") ng(`deviceOf が xperia でない: ${m}`);
  if (!modelPagePath(m).startsWith("/xperia/")) ng(`パスが /xperia/ で始まらない: ${m}`);
  if (slugToModel(modelToSlug(m)) !== m) ng(`スラッグから戻らない: ${m}`);
  if (!ALL_DEVICE_PAGE_MODELS.includes(m)) ng(`ALL_DEVICE_PAGE_MODELS にない: ${m}`);
}
for (const m of AQUOS_MODELS) {
  if (deviceOf(m) !== "aquos") ng(`deviceOf が aquos でない: ${m}`);
  if (!modelPagePath(m).startsWith("/aquos/")) ng(`パスが /aquos/ で始まらない: ${m}`);
  if (slugToModel(modelToSlug(m)) !== m) ng(`スラッグから戻らない: ${m}`);
}
if (siblingModels("Xperia 1 VII").includes("Xperia 5 V") || !siblingModels("Xperia 1 VII").includes("Xperia 1 VI")) ng("siblingModels(Xperia 1 VII) が想定と違う");
if (modelToSlug("AQUOS sense7 plus") !== "aquos-sense7-plus" || modelToSlug("Xperia 10 VIII") !== "xperia-10-viii") ng("スラッグの形が想定と違う");
if (deviceOf("iPhone 15") !== "iphone" || deviceOf("Galaxy S24") !== "galaxy" || deviceOf("Pixel 9") !== "pixel" || deviceOf("iPad Air (M2)") !== "ipad") ng("deviceOf が既存機種で変わった");
const shopLabels4 = shopsFor("Xperia 1 VII").map((s) => s.label).join(",");
if (shopLabels4 !== "イオシス,じゃんぱら,ゲオモバイル,ソフマップ" || shopLabels4 !== shopsFor("AQUOS R11").map((s) => s.label).join(",")) ng(`Xperia・AQUOS の店が想定と違う: ${shopLabels4}`);

if (failures > 0) { console.log(`\n${failures} 件失敗`); process.exit(1); }
console.log(`OK（読み取り ${ROWS.length} 件・機種 ${XPERIA_MODELS.length + AQUOS_MODELS.length}）`);
