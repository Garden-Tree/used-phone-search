/**
 * OPPO・Xiaomi（Redmi・POCO 含む）の機種名・容量・キャリア・色の読み取りの回帰テスト（npm run test:oppo-xiaomi。違いがあれば exit 1）。2026-11-12〜
 *
 * 1. ROWS: 手で期待値を書いた表（店ごとの書き方・誤爆しやすい名前）
 * 2. 楽天4店の実際の商品名（2026-11-12 の店内検索の1ページ目。scripts/fixtures/rakuten-oppo-xiaomi-titles.json）を全部読ませて、
 *    取れた件数・取れなかった件数（理由別）を出す。カタログ外の機種（Ultra・Find N など）・タブレットが行にならないことも確かめる
 * 3. カタログの整合（型番 → 機種・スラッグ・種類・店）と、検索の機種照合
 */
import fs from "node:fs";
import path from "node:path";
import { RAKUTEN_SHOPS } from "@/lib/rakutenShops";
import { OPPO_CATALOG, OPPO_INFO, OPPO_MODELS, OPPO_SPECS, canonicalOppoModel } from "@/lib/oppoCatalog";
import { XIAOMI_CATALOG, XIAOMI_INFO, XIAOMI_MODELS, XIAOMI_SPECS, canonicalXiaomiModel } from "@/lib/xiaomiCatalog";
import { XPERIA_INFO } from "@/lib/xperiaCatalog";
import { AQUOS_INFO } from "@/lib/aquosCatalog";
import { codeKey } from "@/lib/androidCommon";
import { androidInfoOf, codeRows, releasedSentence, supportSentence, updateRows } from "@/lib/androidInfo";
import { compareSpecOf } from "@/lib/androidSpecs";
import { specOf } from "@/lib/iphoneSpecs";
import { matchesModel } from "@/lib/modelMatch";
import { ALL_DEVICE_PAGE_MODELS, DEVICE_HUB, deviceOf, modelPagePath, modelToSlug, siblingModels, slugToModel } from "@/lib/catalog";
import { shopsFor } from "@/lib/shops";
import { core } from "@/lib/rakutenIosys";

let failures = 0;
const ng = (msg: string) => { failures++; console.log(`NG ${msg}`); };

type Want = { model: string; storage: number; carrier: string | null; rank: string; color: string; battery?: number | null; sim?: boolean };
// [店の shopCode, 商品名, fetch.php が送る rank, batt, 期待（null は行にしない）]
type Row = [shop: string, name: string, rank: string | null, batt: number | null, want: Want | null];

const ROWS: Row[] = [
  // --- ゲオ（geo-mobile）。バッテリーの記載はない ---
  ["geo-mobile", "【中古】【安心保証】 OPPO A5 5G OPG06[128GB] au ホワイト", "B", null,
    { model: "OPPO A5 5G", storage: 128, carrier: "au", rank: "B", color: "ホワイト", battery: null, sim: true }],
  ["geo-mobile", "【中古】【安心保証】 Xiaomi Redmi 15 5G[128GB] SoftBank ミッドナイトブラック", "A", null,
    { model: "Xiaomi Redmi 15 5G", storage: 128, carrier: "SoftBank", rank: "A", color: "ミッドナイトブラック", sim: true }],
  ["geo-mobile", "【中古】【安心保証】 Xiaomi 15[512GB] SIMフリー グリーン", "B", null,
    { model: "Xiaomi 15", storage: 512, carrier: "国内版", rank: "B", color: "グリーン", sim: true }],
  ["geo-mobile", "【中古】【安心保証】 Xiaomi Redmi Note 10 JE XIG02[64GB] UQモバイル グラファイトグレー", "C", null,
    { model: "Xiaomi Redmi Note 10 JE", storage: 64, carrier: "au", rank: "C", color: "グラファイトグレー" }],
  // 型番（A001XM）はあるが発売日が未確認の機種で、商品名に「SIMフリー」がない → SIM ロックありとして扱う（推測でフリーにしない）
  ["geo-mobile", "【中古】【安心保証】 Xiaomi Redmi Note 9T A001XM[64GB] SoftBank デイブレイクパープル", "B", null,
    { model: "Xiaomi Redmi Note 9T", storage: 64, carrier: "SoftBank", rank: "B", color: "デイブレイクパープル", sim: false }],
  ["geo-mobile", "【中古】【安心保証】 Xiaomi 15 Ultra[512GB] SIMフリー ブラック", "B", null, null],
  ["geo-mobile", "【中古】【安心保証】 Xiaomi Pad 5[128G] コズミックグレー", "B", null, null],
  ["geo-mobile", "【中古】【安心保証】 Xiaomi Redmi Pad SE 23073RPBFG[128GB/6GB] Wi-Fiモデル グレー", "B", null, null],
  // --- じゃんぱら（janpara）。ランクは名前の【ランクA】、未使用は S。"ymobile" は SoftBank ---
  ["janpara", "【中古】Oppo 楽天モバイル 【SIMフリー】 OPPO A3 5G 4GB 128GB パープル CPH2639【川崎駅前】保証期間1ヶ月【ランクA】", null, 91,
    { model: "OPPO A3 5G", storage: 128, carrier: "楽天モバイル", rank: "A", color: "パープル", battery: 91, sim: true }],
  ["janpara", "【中古】Xiaomi 国内版 【SIMフリー】 Redmi Note 10 Pro グレイシャーブルー 6GB 128GB M2101K6R【ECセンター】保証期間1ヶ月【ランクC】", null, null,
    { model: "Xiaomi Redmi Note 10 Pro", storage: 128, carrier: "国内版", rank: "C", color: "グレイシャーブルー", sim: true }],
  ["janpara", "【未使用】Oppo UQmobile 【SIMフリー】 OPPO A5 5G 4GB 128GB グリーン OPG06【柏】保証期間3ヶ月", null, null,
    { model: "OPPO A5 5G", storage: 128, carrier: "au", rank: "S", color: "グリーン" }],
  ["janpara", "【中古】Oppo ymobile 【SIMフリー】 OPPO Reno7 A スターリーブラック 6GB 128GB A201OP【秋葉5号】保証期間1ヶ月【ランクA】", null, null,
    { model: "OPPO Reno7 A", storage: 128, carrier: "SoftBank", rank: "A", color: "スターリーブラック" }],
  ["janpara", "【中古】Xiaomi 国内版 【SIMフリー】 Redmi Note 13 Pro+ 5G ミッドナイトブラック 8GB 256GB【神保町】保証期間1ヶ月【ランクC】", null, null,
    { model: "Xiaomi Redmi Note 13 Pro+ 5G", storage: 256, carrier: "国内版", rank: "C", color: "ミッドナイトブラック" }],
  ["janpara", "【中古】Xiaomi 国内版 【SIMフリー】 POCO X8 Proイエロー8GB 256GB【ECセンター】保証期間1ヶ月【ランクA】", null, null,
    { model: "Xiaomi POCO X8 Pro", storage: 256, carrier: "国内版", rank: "A", color: "イエロー" }],
  ["janpara", "【中古】Xiaomi 国内版 【SIMフリー】 POCO X8 Pro Max ホワイト 12GB 256GB【ECセンター】保証期間1ヶ月【ランクA】", null, null,
    { model: "Xiaomi POCO X8 Pro Max", storage: 256, carrier: "国内版", rank: "A", color: "ホワイト" }],
  // キャリアの記載がない・MVNO（mineo）だけ → null
  ["janpara", "【中古】Xiaomi 【SIMフリー】 Xiaomi 15 ブラック 12GB 256GB【柏】保証期間1ヶ月【ランクA】", null, null,
    { model: "Xiaomi 15", storage: 256, carrier: null, rank: "A", color: "ブラック" }],
  ["janpara", "【中古】Xiaomi mineo 【SIMフリー】 Xiaomi 15T Pro モカゴールド 12GB 256GB【静岡】保証期間1ヶ月【ランクA】", null, null,
    { model: "Xiaomi 15T Pro", storage: 256, carrier: null, rank: "A", color: "モカゴールド" }],
  ["janpara", "【中古】Xiaomi 国内版 【SIMフリー】 Xiaomi 14 Ultra ブラック 16GB 512GB【新橋烏森通り】保証期間1ヶ月【ランクB】", null, null, null],
  ["janpara", "【中古】Oppo 楽天モバイル 【SIMフリー】 Reno A 6GB 128GB ブルー CPH1983【OSU301】保証期間1ヶ月【ランクC】", null, null, null],
  ["janpara", "【中古】Oppo 国内版 【SIMフリー】 OPPO Find X9 Ultra ツンドラアンバー 12GB 512GB CPH2841【小倉駅前】保証期間1ヶ月【ランクA】", null, null, null],
  ["janpara", "【中古】Xiaomi 国内版 【SIMフリー】 Poco M7 Pro 5G グリーン 8GB 256GB【大宮東口】保証期間1ヶ月【ランクA】", null, null, null],
  ["janpara", "【中古】Xiaomi 国内版 【Wi-Fi】 Redmi Pad 2 9.7 シルバー 【Snapdragon6s 4G Gen2/4GB/64GB】【戸塚】保証期間1ヶ月【ランクA】", null, null, null],
  // --- ソフマップ（akiba-u-shop）。ランク・バッテリーは fetch.php が送る値。キャリアは型番の後ろ ---
  ["akiba-u-shop", "【中古】OPPO(オッポ) OPPO Reno14 5G 256GB オパールホワイト CPH2737 SIMフリー 【276-ud】", "A", 95,
    { model: "OPPO Reno14 5G", storage: 256, carrier: "国内版", rank: "A", color: "オパールホワイト", battery: 95, sim: true }],
  ["akiba-u-shop", "【中古】XIAOMI Redmi 12 5G 128GB ミッドナイトブラック MZB0ETQJP SIMフリー 【348-ud】", "B", null,
    { model: "Xiaomi Redmi 12 5G", storage: 128, carrier: "国内版", rank: "B", color: "ミッドナイトブラック" }],
  ["akiba-u-shop", "【中古】楽天モバイル OPPO A73 64GB オレンジ ZKVE2002OR 楽天 SIMフリー 【352-ud】", "C", null,
    { model: "OPPO A73", storage: 64, carrier: "楽天モバイル", rank: "C", color: "オレンジ", sim: true }],
  ["akiba-u-shop", "【中古】UQMOBILE OPPO Reno15 A 128GB トワイライトネイビー OPG08 UQ mobile SIMフリー 【348-ud】", "B", null,
    { model: "OPPO Reno15 A", storage: 128, carrier: "au", rank: "B", color: "トワイライトネイビー" }],
  ["akiba-u-shop", "【中古】OPPO(オッポ) OPPO Reno5 A 128GB シルバーブラック A101OP Y!mobile SIMフリー 【344-ud】", "B", null,
    { model: "OPPO Reno5 A", storage: 128, carrier: "SoftBank", rank: "B", color: "シルバーブラック" }],
  ["akiba-u-shop", "【中古】Xiaomi(シャオミ) Redmi Note 10T 64GB ナイトタイムブルー XMSAC1 Softbank SIMフリー 【276-ud】", "B", null,
    { model: "Xiaomi Redmi Note 10T", storage: 64, carrier: "SoftBank", rank: "B", color: "ナイトタイムブルー" }],
  ["akiba-u-shop", "【中古】Xiaomi(シャオミ) POCO F7 Pro 256GB シルバー MZB0JVMJP SIMフリー 【349-ud】", "B", null, null],
  ["akiba-u-shop", "【中古】XIAOMI Leica Leitzphone powered by Xiaomi 1TB ブラック MZB0MREJP SIMフリー 【262-ud】", "B", null, null],
  ["akiba-u-shop", "【中古】XIAOMI REDMI Pad 2 9.7 64GB グラファイトグレー Wi-Fi 【295-ud】", "B", null, null],
  // --- イオシス楽天市場店（pc-good）。容量が名前にないものは行にしない（推測しない） ---
  ["pc-good", "OPPO Reno13A OPG05 アイスブルー 【UQmobile版SIMフリー】 OPPO 当社3ヶ月間保証 中古 イオシス", "B", null, null],
  ["pc-good", "Xiaomi14T XIG07 256GB チタンブルー 【au版SIMフリー】 Xiaomi （小米） 当社3ヶ月間保証 中古 イオシス", "B", null,
    { model: "Xiaomi 14T", storage: 256, carrier: "au", rank: "B", color: "チタンブルー", battery: 80, sim: true }],
  ["pc-good", "OPPO Reno15 A CPH2801 128GB トワイライトネイビー 【国内版SIMフリー】 OPPO 当社3ヶ月間保証 中古 イオシス", "A", null,
    { model: "OPPO Reno15 A", storage: 128, carrier: "国内版", rank: "A", color: "トワイライトネイビー", battery: 80 }],
  ["pc-good", "REDMI Note15 Pro 5G 25080RABDR 256GB ブラック 【国内版SIMフリー】 Xiaomi （小米） 当社6ヶ月保証 未使用 イオシス", "A", null,
    { model: "Xiaomi Redmi Note 15 Pro 5G", storage: 256, carrier: "国内版", rank: "S", color: "ブラック", battery: 100 }],
  // 型番（M2003J6A1R）が名前のすぐ後ろにあっても Note 9S に当てる（"M" を「別の機種の1文字」と取り違えない）
  ["pc-good", "Redmi Note9S M2003J6A1R 64GB オーロラブルー 【国内版SIMフリー】 Xiaomi （小米） 当社3ヶ月間保証 中古 イオシス", "B", null,
    { model: "Xiaomi Redmi Note 9S", storage: 64, carrier: "国内版", rank: "B", color: "オーロラブルー" }],
  ["pc-good", "Xiaomi15 Ultra 25010PN30G 512GB シルバークローム 【国内版SIMフリー】 Xiaomi （小米） 当社3ヶ月間保証 中古 イオシス", "B", null, null],
  ["pc-good", "【SIMロック解除済】au Xiaomi Mi10 Lite 5G XIG01 128GB ドリームホワイト Xiaomi （小米） 当社3ヶ月間保証 中古 イオシス", "B", null, null],
  ["pc-good", "Redmi Pad2 グラファイトグレー【RAM8GB/ROM256GB/国内版 Wi-Fiモデル】 Xiaomi （小米） 当社3ヶ月間保証 中古 イオシス", "B", null, null],
  ["pc-good", "Xiaomi （小米） Xiaomi Redmi Watch5 ラベンダーパープル [中古] 【当社3ヶ月間保証】 イオシス", "B", null, null],
];

const u = "https://item.rakuten.co.jp/x/1/";
const normalize = (shop: string, name: string, rank: string | null = "B", batt: number | null = null, i = 0) =>
  RAKUTEN_SHOPS[shop].normalize({ code: `x${i}`, name, price: 12345, url: u, rank, nw: null, car: null, batt });

ROWS.forEach(([shop, name, rank, batt, want], i) => {
  const got = normalize(shop, name, rank, batt, i);
  const label = name.slice(0, 70);
  if (want === null) { if (got !== null) ng(`行にならないはずが行になった: ${label} → ${got.modelName} ${got.storage}`); return; }
  if (got === null) { ng(`行にならない: ${label}`); return; }
  const check = (field: string, a: unknown, b: unknown) => { if (a !== b) ng(`${field}: ${label} → ${String(a)}（期待 ${String(b)}）`); };
  check("機種", got.modelName, want.model);
  check("容量", got.storage, want.storage);
  check("キャリア", got.carrier ?? null, want.carrier);
  check("ランク", got.conditionRank, want.rank);
  check("色", got.color, want.color);
  if (want.battery !== undefined) check("バッテリー", got.batteryHealth ?? null, want.battery);
  if (want.sim !== undefined) check("SIMフリー", got.simUnlocked, want.sim);
  check("メーカー", got.manufacturer, want.model.startsWith("OPPO ") ? "OPPO" : "Xiaomi");
  check("価格", got.price, 12345);
});

// ---- 機種名の決め方（型番を優先・空白のゆれ・誤爆しやすい組） ----
const OPPO_CASES: [string, string | null][] = [
  ["OPPO A5 5G", "OPPO A5 5G"], ["OPPO A5", "OPPO A5 5G"], ["OPPO A55s 5G", "OPPO A55s 5G"], ["OPPO A55s", "OPPO A55s 5G"],
  ["OPPO A5x", "OPPO A5x"], ["OPPO A5x 128GB", "OPPO A5x"], ["OPPO A54 5G", "OPPO A54 5G"], ["OPPO A73", "OPPO A73"], ["OPPO A77", "OPPO A77"],
  ["Reno13A", "OPPO Reno13 A"], ["OPPO Reno13 A", "OPPO Reno13 A"], ["Reno5A A103OP", "OPPO Reno5 A"], ["OPPO Reno3A CPH2013", "OPPO Reno3 A"],
  ["OPPO Reno14 5G", "OPPO Reno14 5G"], ["OPPO Reno14", "OPPO Reno14 5G"], ["OPPO Reno10 Pro 5G", "OPPO Reno10 Pro 5G"],
  ["OPPO Find X9", "OPPO Find X9"], ["OPPO Find X9 CPH2797", "OPPO Find X9"], ["OPPO Find X8", "OPPO Find X8"],
  // 型番が名前より先（OPG05 ＝ Reno13 A）
  ["OPPO Reno11 A OPG05", "OPPO Reno13 A"], ["CPH2603", "OPPO Reno11 A"],
  // カタログ外・別の機種
  ["OPPO Find X9 Ultra", null], ["OPPO Find X9 Pro", null], ["OPPO Find N6", null], ["OPPO Find X2 Pro OPG01", null], ["Reno A", null],
  ["OPPO Reno14 A", null], ["OPPO A5 Pro", null], ["OPPO Pad 3", null], ["OPPO Reno11 F", null], ["A5 5G", null],
];
for (const [raw, want] of OPPO_CASES) {
  const got = canonicalOppoModel(raw);
  if (got !== want) ng(`OPPO: ${raw} → ${got}（期待 ${want}）`);
}
const XIAOMI_CASES: [string, string | null][] = [
  ["Xiaomi 14T", "Xiaomi 14T"], ["Xiaomi14T", "Xiaomi 14T"], ["Xiaomi 14T Pro", "Xiaomi 14T Pro"], ["Xiaomi14T Pro", "Xiaomi 14T Pro"],
  ["Xiaomi 15", "Xiaomi 15"], ["Xiaomi15", "Xiaomi 15"], ["Xiaomi 15T", "Xiaomi 15T"], ["Xiaomi 15 Ultra", null], ["Xiaomi15 Ultra", null], ["Xiaomi 15T Ultra", null],
  ["REDMI15 5G", "Xiaomi Redmi 15 5G"], ["Xiaomi Redmi 15 5G", "Xiaomi Redmi 15 5G"], ["Redmi 15", "Xiaomi Redmi 15 5G"],
  ["Redmi 12 5G", "Xiaomi Redmi 12 5G"], ["Redmi 12", "Xiaomi Redmi 12 5G"], ["Redmi 12C", "Xiaomi Redmi 12C"], ["Redmi 12 C", "Xiaomi Redmi 12C"],
  ["Redmi Note13 Pro 5G", "Xiaomi Redmi Note 13 Pro 5G"], ["Redmi Note 13 Pro", "Xiaomi Redmi Note 13 Pro 5G"],
  ["Redmi Note 13 Pro+ 5G", "Xiaomi Redmi Note 13 Pro+ 5G"], ["Redmi Note 13 Pro+", "Xiaomi Redmi Note 13 Pro+ 5G"], ["Redmi Note 13 Pro +", "Xiaomi Redmi Note 13 Pro+ 5G"],
  ["Redmi Note 10 Pro", "Xiaomi Redmi Note 10 Pro"], ["Redmi Note 10T", "Xiaomi Redmi Note 10T"], ["Redmi Note 10 JE", "Xiaomi Redmi Note 10 JE"],
  ["Redmi Note 10", null], ["Redmi Note 13", null], ["Redmi Note 13 5G", null], ["Redmi 13C", null], ["Redmi Note 11 Pro+ 5G", null],
  ["Redmi Note 11", "Xiaomi Redmi Note 11"], ["Redmi Note 11 Pro 5G", "Xiaomi Redmi Note 11 Pro 5G"], ["Redmi Note 11S", null],
  ["Redmi Note 15 5G", "Xiaomi Redmi Note 15 5G"], ["REDMI Note 15 Pro 5G", "Xiaomi Redmi Note 15 Pro 5G"], ["REDMI Note15 Pro", "Xiaomi Redmi Note 15 Pro 5G"],
  ["POCO F7", "Xiaomi POCO F7"], ["POCO F7 Pro", null], ["POCO F7 Ultra", null], ["POCO X8 Pro", "Xiaomi POCO X8 Pro"], ["POCO X8 Pro Max", "Xiaomi POCO X8 Pro Max"],
  ["Poco M7 Pro 5G", null], ["POCO M8 5G", "Xiaomi POCO M8 5G"], ["POCO M8", "Xiaomi POCO M8 5G"],
  ["Xiaomi Mi11 Lite 5G", "Xiaomi Mi 11 Lite 5G"], ["Mi 11 Lite 5G", "Xiaomi Mi 11 Lite 5G"], ["Xiaomi Mi10 Lite 5G XIG01", null],
  ["Xiaomi 11T", "Xiaomi 11T"], ["Xiaomi 11T Pro", "Xiaomi 11T Pro"], ["Xiaomi 12T Pro", "Xiaomi 12T Pro"], ["Xiaomi 12T", null],
  // 型番が名前より先（XIG03 ＝ Redmi 12 5G、A402XM ＝ 14T Pro）
  ["Redmi 12C XIG03", "Xiaomi Redmi 12 5G"], ["Xiaomi 14T A402XM", "Xiaomi 14T Pro"],
  ["Redmi Pad 2", null], ["Xiaomi Pad 6s Pro", null], ["Leica Leitzphone powered by Xiaomi", null], ["Xiaomi Redmi Watch5", null], ["15", null], ["Note 13 Pro", null],
];
for (const [raw, want] of XIAOMI_CASES) {
  const got = canonicalXiaomiModel(raw);
  if (got !== want) ng(`Xiaomi: ${raw} → ${got}（期待 ${want}）`);
}

// ---- 楽天4店の実際の商品名を全部読ませる ----
const FIXTURE = path.join(__dirname, "fixtures", "rakuten-oppo-xiaomi-titles.json");
const titles = JSON.parse(fs.readFileSync(FIXTURE, "utf8")) as Record<string, string[]>;
const SHOP_LABEL: Record<string, string> = { "geo-mobile": "ゲオ", janpara: "じゃんぱら", "akiba-u-shop": "ソフマップ", "pc-good": "イオシス" };
/** 行にならなかった理由（行にならないのが正しいもの・直すべきもの） */
function reasonOf(shop: string, name: string): string {
  if (/Pad|Watch|Band|AI Pen|Leitzphone|Leica|Black ?Shark/i.test(name)) return "タブレット・時計・付属品など（取らない）";
  const model = /OPPO|Reno\s?\d/i.test(name) ? canonicalOppoModel(name) : canonicalXiaomiModel(name);
  if (!model) return "カタログ外の機種（Ultra・Find N・Pro 違いなど）";
  if (shop === "pc-good" && !/\d+\s*(?:GB|TB)/.test(core(name))) return "容量が名前にない（イオシス。推測しない）";
  return "書式が読めない";
}
// カタログ外・タブレットなど、行にしてはいけない商品名
const MUST_SKIP = /Ultra|Find N|Find X2|Reno A |Pad|Leitz|Mi10|REDMI17|M7 Pro|F7 Pro|F9|Black ?Shark|Watch|Band|AI Pen/i;
let total = 0;
let parsedTotal = 0;
const reasons = new Map<string, number>();
const fieldMissing = { carrier: 0, color: 0 };
const byModel = new Map<string, number>();
for (const [shop, list] of Object.entries(titles)) {
  let parsed = 0;
  for (const name of list) {
    total++;
    const got = normalize(shop, name);
    if (MUST_SKIP.test(name) && got) ng(`カタログ外・タブレットが行になった: ${name.slice(0, 70)} → ${got.modelName}`);
    if (!got) {
      const r = reasonOf(shop, name);
      reasons.set(r, (reasons.get(r) ?? 0) + 1);
      if (r === "書式が読めない") ng(`書式が読めない: [${shop}] ${name}`);
      continue;
    }
    parsed++;
    byModel.set(got.modelName, (byModel.get(got.modelName) ?? 0) + 1);
    if (!got.carrier) fieldMissing.carrier++;
    if (got.color === "-" || got.color === "不明") { fieldMissing.color++; ng(`色が読めない: ${name.slice(0, 70)}`); }
    if (!(got.storage > 0)) ng(`容量が0: ${name.slice(0, 70)}`);
  }
  parsedTotal += parsed;
  console.log(`${SHOP_LABEL[shop] ?? shop}: ${list.length} 件中 ${parsed} 件を行にした`);
}
console.log(`合計: ${total} 件中 ${parsedTotal} 件（機種 ${byModel.size}）。キャリアなし ${fieldMissing.carrier} 件（mineo・記載なし）・色なし ${fieldMissing.color} 件`);
for (const [r, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  行にしない: ${r} ${n} 件`);

// ---- 検索の機種照合: 正式名は完全一致。Pro・Pro+・T・C 違いは当たらない ----
const mm = (q: string, name: string, want: boolean) => { if (matchesModel(q, name) !== want) ng(`matchesModel("${q}", "${name}") は ${want} のはず`); };
mm("OPPO A5 5G", "OPPO A5 5G", true); mm("OPPO A5 5G", "OPPO A55s 5G", false); mm("OPPO A5 5G", "OPPO A5x", false); mm("OPPO Reno13 A", "OPPO Reno11 A", false);
mm("Xiaomi 14T", "Xiaomi 14T Pro", false); mm("Xiaomi 14T Pro", "Xiaomi 14T", false); mm("Xiaomi 15", "Xiaomi 15T", false);
mm("Xiaomi Redmi 12 5G", "Xiaomi Redmi 12C", false); mm("Xiaomi Redmi Note 13 Pro 5G", "Xiaomi Redmi Note 13 Pro+ 5G", false);
mm("Xiaomi Redmi Note 10 Pro", "Xiaomi Redmi Note 10T", false); mm("Xiaomi POCO X8 Pro", "Xiaomi POCO X8 Pro Max", false);
mm("OPPO", "OPPO Reno13 A", true); mm("Xiaomi", "Xiaomi POCO F7", true); mm("OPPO A5 5G", "iPhone 15", false); mm("iPhone 15", "Xiaomi 15", false);
mm("Xperia 1 V", "OPPO A5 5G", false); mm("AQUOS R8", "Xiaomi 15", false);

// ---- カタログの整合 ----
for (const [name, prefix, models, info, catalog, canon, specs] of [
  ["OPPO", "OPPO ", OPPO_MODELS, OPPO_INFO, OPPO_CATALOG, canonicalOppoModel, OPPO_SPECS],
  ["Xiaomi", "Xiaomi ", XIAOMI_MODELS, XIAOMI_INFO, XIAOMI_CATALOG, canonicalXiaomiModel, XIAOMI_SPECS],
] as const) {
  if (new Set(models).size !== models.length) ng(`${name}: カタログの機種が重複`);
  if (JSON.stringify([...models].sort()) !== JSON.stringify(Object.keys(info).sort())) ng(`${name}: カタログ（シリーズ）と情報（INFO）の機種が一致しない`);
  if (catalog.flatMap((s) => s.models).length !== models.length) ng(`${name}: シリーズの機種数が合わない`);
  for (const m of models) {
    const i = info[m];
    if (!m.startsWith(prefix)) ng(`${name}: 機種名が "${prefix}" で始まらない: ${m}`);
    if (!i) { ng(`${name}: 情報がない: ${m}`); continue; }
    if (androidInfoOf(m) !== i) ng(`${name}: androidInfoOf から引けない: ${m}`);
    if (canon(m) !== m) ng(`${name}: canonical("${m}") → ${canon(m)}`);
    if (i.released !== null && !/^\d{4}(-\d{2})?$/.test(i.released)) ng(`${name}: 発売の形が不正: ${m} ${i.released}`);
    if (i.osPolicy !== null || i.securityUntil !== null) ng(`${name}: OS・セキュリティ更新は公式の値がないはず: ${m}`);
    const codes = [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])];
    for (const c of codes) if (canon(`Foo ${c} bar`) !== m) ng(`${name}: 型番 ${c} から ${m} に決まらない（→ ${canon(`Foo ${c} bar`)}）`);
    if (Object.values(i.codes).flat().length > 0 && codeRows(m).length === 0) ng(`${name}: 型番の表示がない: ${m}`);
    if (i.released && !releasedSentence(m)) ng(`${name}: 発売の文が作れない: ${m}`);
    if (!i.released && releasedSentence(m) !== null) ng(`${name}: 発売日が未確認なのに発売の文が出る: ${m}`);
    if (updateRows(m, "2026-11").length > 0 || supportSentence(m, "2026-11") !== null) ng(`${name}: 公式の値がないのに更新情報が出る: ${m}`);
    // ページ側: 種類・パス・スラッグ・一覧
    const device = name === "OPPO" ? "oppo" : "xiaomi";
    if (deviceOf(m) !== device) ng(`deviceOf が ${device} でない: ${m}`);
    if (!modelPagePath(m).startsWith(`/${device}/`)) ng(`パスが /${device}/ で始まらない: ${m}`);
    if (slugToModel(modelToSlug(m)) !== m) ng(`スラッグから戻らない: ${m}`);
    if (!ALL_DEVICE_PAGE_MODELS.includes(m)) ng(`ALL_DEVICE_PAGE_MODELS にない: ${m}`);
    // スペックは比較ページ用だけ（機種ページの specOf には出さない）
    if (specOf(m) !== undefined) ng(`specOf に入っている（機種ページにスペックの節が出る）: ${m}`);
    if (specs[m] && compareSpecOf(m) !== specs[m]) ng(`compareSpecOf から引けない: ${m}`);
  }
  for (const k of Object.keys(specs)) if (!models.includes(k)) ng(`${name}: スペックの機種がカタログにない: ${k}`);
}
// 型番はメーカーをまたいで重複しない（Xperia・AQUOS も含めて）
const seen = new Map<string, string>();
for (const [model, i] of [...Object.entries(XPERIA_INFO), ...Object.entries(AQUOS_INFO), ...Object.entries(OPPO_INFO), ...Object.entries(XIAOMI_INFO)]) {
  for (const c of [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])]) {
    const k = codeKey(c);
    if (seen.has(k) && seen.get(k) !== model) ng(`型番 ${c} が ${seen.get(k)} と ${model} で重複`);
    seen.set(k, model);
  }
}
const slugs = ALL_DEVICE_PAGE_MODELS.map(modelToSlug);
if (new Set(slugs).size !== slugs.length) ng("機種ページのスラッグが重複");
if (modelToSlug("Xiaomi Redmi Note 13 Pro+ 5G") !== "xiaomi-redmi-note-13-pro-plus-5g" || modelToSlug("OPPO Reno13 A") !== "oppo-reno13-a") ng("スラッグの形が想定と違う");
if (DEVICE_HUB.oppo.path !== "/oppo" || DEVICE_HUB.xiaomi.path !== "/xiaomi" || DEVICE_HUB.oppo.brand !== "OPPO" || DEVICE_HUB.xiaomi.brand !== "Xiaomi") ng("DEVICE_HUB の OPPO・Xiaomi が想定と違う");
if (siblingModels("OPPO Reno13 A").includes("OPPO A5 5G") || !siblingModels("OPPO Reno13 A").includes("OPPO Reno11 A")) ng("siblingModels(OPPO Reno13 A) が想定と違う");
if (deviceOf("iPhone 15") !== "iphone" || deviceOf("Galaxy S24") !== "galaxy" || deviceOf("Xperia 1 VII") !== "xperia" || deviceOf("AQUOS R11") !== "aquos") ng("deviceOf が既存機種で変わった");
const shopLabels4 = shopsFor("OPPO Reno13 A").map((s) => s.label).join(",");
if (shopLabels4 !== "イオシス,じゃんぱら,ゲオモバイル,ソフマップ" || shopLabels4 !== shopsFor("Xiaomi 14T").map((s) => s.label).join(",") || shopLabels4 !== shopsFor("Xperia 1 VII").map((s) => s.label).join(",")) ng(`OPPO・Xiaomi の店が想定と違う: ${shopLabels4}`);
// 発売の文（売り場だけ。日付の括弧は落とす）
if (releasedSentence("OPPO Reno11 A") !== "日本では2024年6月に発売されました（Y!mobile）。") ng(`発売の文が想定と違う: ${releasedSentence("OPPO Reno11 A")}`);
if (releasedSentence("AQUOS sense6s") !== "日本では2022年4月に au から発売されました。") ng("AQUOS の発売の文が変わった");

if (failures > 0) { console.log(`\n${failures} 件失敗`); process.exit(1); }
console.log(`OK（手書きの表 ${ROWS.length} 件・名前 ${OPPO_CASES.length + XIAOMI_CASES.length} 件・機種 ${OPPO_MODELS.length + XIAOMI_MODELS.length}）`);
