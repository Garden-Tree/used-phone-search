/**
 * Galaxy Watch・Pixel Watch の機種名・ケースのサイズ（mm）・通信方式・色の読み取りの回帰テスト（npm run test:galaxy-pixel-watch。違いがあれば exit 1）。2026-11-13〜
 *
 * 1. ROWS: 手で期待値を書いた表（店ごとの書き方・誤爆しやすい名前）
 * 2. 楽天の店の実際の商品名（2026-11-13 の店内検索「Galaxy Watch」「Pixel Watch」。scripts/fixtures/rakuten-galaxy-pixel-watch-titles.json）を全部読ませて、
 *    取れた件数・取れなかった件数（理由別）を出す。行になったものは、商品名に書かれた世代・mm・通信方式と食い違わないことを別の読み方で確かめる（誤読 0）。
 *    ゲオ・ニューズドテックの検索結果（Apple Watch・スマホが返ってくる）から時計の行が出ないことも確かめる
 * 3. カタログの整合（スラッグ・種類・店）と、検索の機種照合。スマホの Galaxy・Pixel と Apple Watch に混ざらないこと
 */
import fs from "node:fs";
import path from "node:path";
import { RAKUTEN_SHOPS } from "@/lib/rakutenShops";
import { GALAXY_WATCH_CATALOG, GALAXY_WATCH_INFO, GALAXY_WATCH_MODELS, isGalaxyWatch, parseGalaxyWatch } from "@/lib/galaxyWatchCatalog";
import { PIXEL_WATCH_CATALOG, PIXEL_WATCH_INFO, PIXEL_WATCH_MODELS, isPixelWatch, parsePixelWatch } from "@/lib/pixelWatchCatalog";
import { WATCH_MODELS, isSmartwatch, isWatch } from "@/lib/watchCatalog";
import { GALAXY_MODELS, canonicalGalaxyModel, isGalaxy } from "@/lib/galaxyCatalog";
import { PIXEL_MODELS, canonicalPixelModel, isPixel } from "@/lib/pixelCatalog";
import { matchesModel, SEARCH_DEVICES } from "@/lib/modelMatch";
import { ALL_CATALOG_MODELS, ALL_DEVICE_PAGE_MODELS, DEVICE_HUB, deviceOf, modelPagePath, modelToSlug, siblingModels, slugToModel } from "@/lib/catalog";
import { GALAXY_SHOPS, GALAXY_WATCH_SHOPS, PIXEL_SHOPS, PIXEL_WATCH_SHOPS, WATCH_SHOPS, shopsFor } from "@/lib/shops";
import { storageLabel } from "@/lib/format";
import { shortModelName } from "@/lib/hubSummary";

let failures = 0;
const ng = (msg: string) => { failures++; console.log(`NG ${msg}`); };

type Want = { model: string; size: number; carrier: string; rank: string; color: string; battery?: number | null };
// [店の shopCode, 商品名, fetch.php が送る rank, batt, 期待（null は行にしない）]
type Row = [shop: string, name: string, rank: string | null, batt: number | null, want: Want | null];

const W = (n: string) => `Samsung Galaxy Watch${n}`;
const P = (n: string) => `Google Pixel Watch${n}`;

const ROWS: Row[] = [
  // --- じゃんぱら（janpara）。ランクは名前の【ランクA】、未使用は S ---
  ["janpara", "【中古】SAMSUNG Galaxy Watch8 Bluetoothモデル 44mm SM-L330NZSJXJP [シルバー]【戸塚】保証期間1ヶ月【ランクB】", null, null,
    { model: W("8"), size: 44, carrier: "Bluetooth", rank: "B", color: "シルバー", battery: null }],
  ["janpara", "【中古】SAMSUNG Galaxy Watch8 LTE/Bluetoothモデル 40mm [グラファイト]【津田沼】保証期間1ヶ月【ランクA】", null, 93,
    { model: W("8"), size: 40, carrier: "LTE", rank: "A", color: "グラファイト", battery: 93 }],
  ["janpara", "【中古】SAMSUNG Galaxy Watch7 44mm Wi-Fi/Bluetoothモデル シルバー【川越クレアモール】保証期間1ヶ月【ランクC】", null, null,
    { model: W("7"), size: 44, carrier: "Bluetooth", rank: "C", color: "シルバー" }],
  ["janpara", "【中古】SAMSUNG Galaxy Watch6 Classic 43mm Wi-Fi/Bluetoothモデル SM-R950NZSAXJP シルバー【静岡】保証期間1ヶ月【ランクA】", null, null,
    { model: W("6 Classic"), size: 43, carrier: "Bluetooth", rank: "A", color: "シルバー" }],
  // 通信方式が名前にない → 型番（SM-R860N＝Bluetooth・40mm。公式のサポートページ）で決める
  ["janpara", "【中古】SAMSUNG Galaxy Watch4 40mm Armor Aluminum ブラック SM-R860NZKAXJP【大宮東口】保証期間1ヶ月【ランクC】", null, null,
    { model: W("4"), size: 40, carrier: "Bluetooth", rank: "C", color: "ブラック" }],
  ["janpara", "【中古】SAMSUNG Galaxy Watch4 Classic 46mm SM-R890NZSAXJP シルバー【札幌南2条】保証期間1週間【ランクC】", null, null,
    { model: W("4 Classic"), size: 46, carrier: "Bluetooth", rank: "C", color: "シルバー" }],
  // 42mm は公式の題で確かめられていない → 行にしない
  ["janpara", "【中古】SAMSUNG Galaxy Watch4 Classic 42mm SM-R880NZKAXJP ブラック【立川フロム中武】保証期間1週間【ランクC】", null, null, null],
  // Ultra は年（2024／2025）と Ultra2 を分ける。サイズが名前になければ 47mm（1サイズだけ）
  ["janpara", "【中古】SAMSUNG Galaxy Watch Ultra (2025) LTEモデル SM-L705FZB5SJP [チタニウム ブルー]【神戸】保証期間1ヶ月【ランクB】", null, null,
    { model: W(" Ultra (2025)"), size: 47, carrier: "LTE", rank: "B", color: "チタニウムブルー" }],
  ["janpara", "【未使用】SAMSUNG Galaxy Watch Ultra (2024) LTE/Bluetoothモデル SM-L705FDAJSJP [チタニウム グレー]【ECセンター】保証期間3ヶ月", null, null,
    { model: W(" Ultra"), size: 47, carrier: "LTE", rank: "S", color: "チタニウムグレー" }],
  ["janpara", "【中古】SAMSUNG Galaxy Watch Ultra2 LTEモデル SM-L715FZSJSJP [チタニウムシルバー]【大阪本店】保証期間1ヶ月【ランクA】", null, null,
    { model: W(" Ultra2"), size: 47, carrier: "LTE", rank: "A", color: "チタニウムシルバー" }],
  ["janpara", "【中古】SAMSUNG au 【LTE】 Galaxy Watch Ultra2 47mm [チタニウムグレー] SM-L715FZKJKDI【立川フロム中武】保証期間1ヶ月【ランクA】", null, null,
    { model: W(" Ultra2"), size: 47, carrier: "LTE", rank: "A", color: "チタニウムグレー" }],
  ["janpara", "【中古】SAMSUNG Galaxy Watch9 LTEモデル 40mm SM-L345FZKJSJP [グラファイト]【川崎駅前】保証期間1ヶ月【ランクA】", null, null,
    { model: W("9"), size: 40, carrier: "LTE", rank: "A", color: "グラファイト" }],
  // 年の書き方が名前（2024）と型番（…5SJP＝2025）で食い違う → 決めない
  ["janpara", "【中古】SAMSUNG Galaxy Watch Ultra (2024) LTEモデル SM-L705FZB5SJP [チタニウム ブルー]【神戸】保証期間1ヶ月【ランクB】", null, null, null],
  // 海外版（名前・型番の末尾）・カタログ外（初代・FE）・付属品 → 行にしない
  ["janpara", "【中古】SAMSUNG Galaxy Watch7 44mm LTE/Bluetoothモデル シルバー　海外版【熊本】保証期間1ヶ月【ランクA】", null, null, null],
  ["janpara", "【中古】SAMSUNG 【海外版】 Galaxy Watch8 Bluetoothモデル SM-L330NDAABRI 44mm [グラファイト]【中野】保証期間1ヶ月【ランクA】", null, null, null],
  ["janpara", "【中古】SAMSUNG Galaxy Watch8 Bluetoothモデル SM-L330NDAABRI 44mm [グラファイト]【中野】保証期間1ヶ月【ランクA】", null, null, null],
  ["janpara", "【中古】SAMSUNG Galaxy Watch 46mm シルバー SM-R80010118JP【仙台イービーンズ】保証期間1ヶ月【ランクB】", null, null, null],
  ["janpara", "【中古】SAMSUNG Galaxy Watch FE 40mm Bluetoothモデル SM-R861NZKAXJP ブラック【千葉】保証期間1ヶ月【ランクB】", null, null, null],
  ["janpara", "【中古】SAMSUNG Galaxy Watch3 41mm Bluetoothモデル SM-R850NZSAXJP シルバー【千葉】保証期間1ヶ月【ランクB】", null, null, null],
  ["janpara", "【中古】Ringke Ringke SLIM CASE Galaxy Watch4 classic 46mm White&Clear【スマーク伊勢崎】保証期間1ヶ月【ランクB】", null, null, null],
  ["janpara", "【中古】N/B USB-C Charger Dock White Samsung Galaxy Watch対応【千葉】保証期間1週間", null, null, null],
  ["janpara", "【中古】Spigen SPIGEN MODERN FIT GALAXYWATCH 20MM【スマーク伊勢崎】保証期間1ヶ月【ランクB】", null, null, null],
  ["janpara", "【中古】SAMSUNG Galaxy Ring [チタニウム シルバー]【千葉】保証期間1ヶ月【ランクA】", null, null, null],
  // 日本で売られていない組み合わせ（Watch6 Classic・Watch5 Pro の LTE）→ 行にしない
  ["janpara", "【中古】SAMSUNG Galaxy Watch6 Classic 47mm LTE/Bluetoothモデル ブラック【秋葉本店】保証期間1ヶ月【ランクB】", null, null, null],
  // 名前の mm と型番の mm が食い違う（SM-L330＝44mm）→ 決めない
  ["janpara", "【中古】SAMSUNG Galaxy Watch8 Bluetoothモデル 40mm SM-L330NZSJXJP [シルバー]【戸塚】保証期間1ヶ月【ランクB】", null, null, null],
  // 名前の世代と型番が食い違う（SM-L300＝Watch7）→ 決めない
  ["janpara", "【中古】SAMSUNG Galaxy Watch8 Bluetoothモデル 40mm SM-L300NZEJXJP [クリーム]【戸塚】保証期間1ヶ月【ランクB】", null, null, null],
  // 通信方式が名前にも型番にもない → 決めない
  ["janpara", "【中古】SAMSUNG Galaxy Watch7 44mm グリーン【川崎駅前】保証期間1ヶ月【ランクB】", null, null, null],

  ["janpara", "【中古】Google Pixel Watch4 Wi-Fiモデル 45mm Polished Silver アルミケース/Porcelain アクティブ バンド【大宮東口】保証期間1ヶ月【ランクC】", null, null,
    { model: P(" 4"), size: 45, carrier: "Wi-Fi", rank: "C", color: "Polished Silver" }],
  ["janpara", "【未使用】Google Pixel Watch5 LTEモデル 41mm Matte Black アルミケース/Obsidian アクティブ バンド【神保町】保証期間3ヶ月", null, null,
    { model: P(" 5"), size: 41, carrier: "LTE", rank: "S", color: "Matte Black" }],
  ["janpara", "【中古】Google Pixel Watch3 Wi-Fiモデル 45mm Polished Silver アルミケース (バンド無し)【大須】保証期間1ヶ月【ランクB】", null, null,
    { model: P(" 3"), size: 45, carrier: "Wi-Fi", rank: "B", color: "Polished Silver" }],
  // 初代・2 は 41mm だけ（公式の技術仕様）。「Bluetooth/LTEモデル」は LTE、「Bluetooth/Wi-Fiモデル」は Wi-Fi
  ["janpara", "【中古】Google Pixel Watch Bluetooth/LTEモデル MatteBlackケース/Obsidianアクティブバンド【仙台イービーンズ】保証期間1ヶ月【ランクC】", null, null,
    { model: P(""), size: 41, carrier: "LTE", rank: "C", color: "Matte Black" }],
  ["janpara", "【中古】Google Pixel Watch2 Bluetooth/Wi-Fiモデル ChampagneGoldアルミケース/Hazelアクティブバンド【大須】保証期間1ヶ月【ランクC】", null, 88,
    { model: P(" 2"), size: 41, carrier: "Wi-Fi", rank: "C", color: "Champagne Gold", battery: 88 }],
  // バンドだけ → 行にしない
  ["janpara", "【未使用】Google Google Pixel Watch 45mm パフォーマンスループバンド ムーンストーン GA10039-WW【ECセンター】保証期間3ヶ月", null, null, null],
  ["janpara", "【中古】Google Google Pixel Watch Band アクティブ バンド 41mm Obsidian Lサイズ【ECセンター】保証期間1ヶ月【ランクB】", null, null, null],
  ["janpara", "【中古】Google Google Pixel Watch Band ウーブン バンド 41mm Lemongrass ワンサイズ【川崎駅前】保証期間1ヶ月【ランクB】", null, null, null],
  // 3 以降でサイズがない・通信方式がない・カタログにない世代 → 決めない
  ["janpara", "【中古】Google Pixel Watch4 Wi-Fiモデル Polished Silver アルミケース/Porcelain アクティブ バンド【大宮東口】保証期間1ヶ月【ランクC】", null, null, null],
  ["janpara", "【中古】Google Pixel Watch4 45mm Polished Silver アルミケース/Porcelain アクティブ バンド【大宮東口】保証期間1ヶ月【ランクC】", null, null, null],
  ["janpara", "【中古】Google Pixel Watch6 Wi-Fiモデル 45mm Polished Silver アルミケース/Porcelain アクティブ バンド【大宮東口】保証期間1ヶ月【ランクC】", null, null, null],
  ["janpara", "【中古】Google Pixel Watch2 Bluetooth/Wi-Fiモデル 45mm ChampagneGoldアルミケース【大須】保証期間1ヶ月【ランクC】", null, null, null],

  // --- イオシス楽天市場店（pc-good）。ランクは fetch.php が送る値。未使用は [未使用]。バッテリーは「80%以上」を仮定しない ---
  ["pc-good", "SAMSUNG Galaxy Watch7 40mm LTEモデル クリーム SM-L305FZEJSJP【国内版】 [中古] 【当社3ヶ月間保証】 イオシス", "B", null,
    { model: W("7"), size: 40, carrier: "LTE", rank: "B", color: "クリーム", battery: null }],
  ["pc-good", "SAMSUNG Galaxy Watch9 44mm Bluetoothモデル SM-L350NZSJXJP シルバー 【国内版】 [中古] 【当社3ヶ月間保証】 イオシス", "A", null,
    { model: W("9"), size: 44, carrier: "Bluetooth", rank: "A", color: "シルバー" }],
  ["pc-good", "SAMSUNG Galaxy Watch Ultra LTE 47mm チタニウムグレー SM-L705FDAJSJP【国内版】 [未使用] 【当社6ヶ月保証】 イオシス", "A", null,
    { model: W(" Ultra"), size: 47, carrier: "LTE", rank: "S", color: "チタニウムグレー", battery: 100 }],
  ["pc-good", "SAMSUNG Galaxy Watch Ultra (2025) 47mm LTEモデル チタニウムブルー SM-L705FZB5SJP【国内版】 [中古] 【当社3ヶ月間保証】 イオシス", "B", null,
    { model: W(" Ultra (2025)"), size: 47, carrier: "LTE", rank: "B", color: "チタニウムブルー" }],
  ["pc-good", "SAMSUNG Galaxy Watch5 Pro 45mm SM-R920NZKAXJP ブラックチタニウム [中古] 【当社3ヶ月間保証】 イオシス", "B", null,
    { model: W("5 Pro"), size: 45, carrier: "Bluetooth", rank: "B", color: "ブラックチタニウム" }],
  ["pc-good", "SAMSUNG Galaxy Watch6 LTE 44mm SM-R945FZKADCM グラファイト【国内版】 [未使用] 【当社6ヶ月保証】 イオシス", "A", null,
    { model: W("6"), size: 44, carrier: "LTE", rank: "S", color: "グラファイト" }],
  ["pc-good", "SAMSUNG Galaxy Watch8 Classic 46mm LTEモデル ブラック SM-L505FZKJDCM [中古] 【当社3ヶ月間保証】 イオシス", "B", null,
    { model: W("8 Classic"), size: 46, carrier: "LTE", rank: "B", color: "ブラック" }],
  ["pc-good", "SAMSUNG 【ネットワーク利用制限▲】Galaxy Watch9 44mm LTEモデル SM-L355FZKJKDI グラファイト 【au版】 [中古] 【当社3ヶ月間保証】 イオシス", "B", null,
    { model: W("9"), size: 44, carrier: "LTE", rank: "B", color: "グラファイト" }],
  ["pc-good", "SAMSUNG 【箱傷み】Galaxy Watch7 40mm LTEモデル グリーン SM-L305FZGJKDI【国内版】 [未使用] 【当社6ヶ月保証】 イオシス", "A", null,
    { model: W("7"), size: 40, carrier: "LTE", rank: "S", color: "グリーン" }],
  // 年が名前になく、型番で決める（…DAJSJP＝2024）。型番もなければ決めない
  ["pc-good", "SAMSUNG Galaxy Watch Ultra LTE 47mm チタニウムグレー【国内版】 [中古] 【当社3ヶ月間保証】 イオシス", "B", null, null],
  // 充電ケーブル・充電ホルダーが欠けている個体は行にしない（Apple Watch の読み取りと同じ。バンド無しは行にする）
  ["pc-good", "SAMSUNG 【バンド無し】【専用充電ケーブル欠品】Galaxy Watch8 44mm Bluetoothモデル シルバー SM-L330NZSJXJP [中古] 【当社3ヶ月間保証】 イオシス", "B", null, null],
  ["pc-good", "Google 【充電ホルダー欠品】Google Pixel Watch4 45mm LTEモデル Matte Blackアルミケース/Obsidianアクティブバンド GA09307-US [中古] 【当社3ヶ月間保証】 イオシス", "B", null, null],
  ["pc-good", "Google 【バンド無し】Google Pixel Watch4 41mm Wi-Fiモデル Polished Silverアルミケース GA10830-US [中古] 【当社3ヶ月間保証】 イオシス", "B", null,
    { model: P(" 4"), size: 41, carrier: "Wi-Fi", rank: "B", color: "Polished Silver" }],
  ["pc-good", "Google Google Pixel Watch5 41mm Wi-Fiモデル Matte Blackアルミケース/Obsidianアクティブバンド(第2世代) GA10900-US [中古] 【当社3ヶ月間保証】 イオシス", "A", null,
    { model: P(" 5"), size: 41, carrier: "Wi-Fi", rank: "A", color: "Matte Black", battery: null }],
  ["pc-good", "Google Google Pixel Watch LTEモデル Matte Blackケース/Obsidianアクティブバンド GA04308-TW [未使用] 【当社6ヶ月保証】 イオシス", "A", null,
    { model: P(""), size: 41, carrier: "LTE", rank: "S", color: "Matte Black", battery: 100 }],
  ["pc-good", "Google 【ネットワーク利用制限▲】SoftBank Google Pixel Watch4 45mm LTEモデル Matte Blackアルミケース/Obsidianアクティブバンド GA09307-US [中古] 【当社3ヶ月間保証】 イオシス", "B", null,
    { model: P(" 4"), size: 45, carrier: "LTE", rank: "B", color: "Matte Black" }],

  // --- 時計を読まない店（ゲオ・ソフマップ・ニューズドテック・エムティーエム）。今までどおり行にならない ---
  ["geo-mobile", "【中古】SAMSUNG Galaxy Watch8 Bluetoothモデル 44mm SM-L330NZSJXJP [シルバー]【戸塚】保証期間1ヶ月【ランクB】", "B", null, null],
  ["akiba-u-shop", "【中古】Google Pixel Watch4 Wi-Fiモデル 45mm Polished Silver アルミケース/Porcelain アクティブ バンド 【269-ud】", "B", null, null],
  ["kamaya-awards", "【中古】 Google Pixel Watch4 Wi-Fiモデル 45mm Polished Silver SIMフリー 本体 【あす楽】 【保証あり】 【送料無料】 gpw4mtm", "B", null, null],
  ["ekosuta", "【中古】SAMSUNG Galaxy Watch8 Bluetoothモデル 44mm SM-L330NZSJXJP シルバー", "B", null, null],
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
  check("サイズ", got.storage, want.size);
  check("通信方式", got.carrier ?? null, want.carrier);
  check("ランク", got.conditionRank, want.rank);
  check("色", got.color, want.color);
  if (want.battery !== undefined) check("バッテリー", got.batteryHealth ?? null, want.battery);
  check("メーカー", got.manufacturer, want.model.startsWith("Samsung") ? "Samsung" : "Google");
  check("SIM", got.simUnlocked, false);
  check("利用制限", got.networkStatus ?? null, null);
  check("メモリ", got.memoryGB ?? null, null);
});

// --- スマホの読み取りは変わらない（時計の語を含まない商品名・スマホの機種名も読める商品名は、今までの読み取りへ） ---
const phone = (shop: string, name: string, model: string) => {
  const got = normalize(shop, name);
  if (got?.modelName !== model) ng(`スマホの読み取りが変わった: ${name.slice(0, 60)} → ${got?.modelName ?? "null"}（期待 ${model}）`);
};
phone("janpara", "【中古】Google 国内版 【SIMフリー】 Pixel 9 Obsidian 12GB 128GB GUR25【川崎】保証期間1ヶ月【ランクA】", "Pixel 9");
phone("pc-good", "Galaxy S24 SM-S921Q 256GB オニキスブラック 【国内版SIMフリー】 SAMSUNG 当社3ヶ月間保証 中古 イオシス", "Galaxy S24");
// スマホと時計の両方が名前にある商品は、時計として読まない（今までどおりスマホ用の読み取りの結果）
for (const [shop, name] of [
  ["janpara", "【中古】SAMSUNG 国内版 【SIMフリー】 Galaxy S24 オニキスブラック 8GB 256GB SM-S921Q Galaxy Watch7 40mm Bluetoothモデル セット【川崎】保証期間1ヶ月【ランクA】"],
  ["pc-good", "Galaxy S24 SM-S921Q 256GB オニキスブラック 【国内版SIMフリー】 Galaxy Watch7 40mm Bluetoothモデル付き SAMSUNG 当社3ヶ月間保証 中古 イオシス"],
] as const) {
  const got = normalize(shop, name);
  if (got && isSmartwatch(got.modelName)) ng(`スマホの名前もある商品が時計になった: ${name.slice(0, 50)} → ${got.modelName}`);
}
// 商品名だけの読み取り: スマホ用の機種判定は時計の名前を読まない
for (const n of ["Galaxy Watch7 40mm", "Galaxy Watch Ultra2", "Google Pixel Watch 3 45mm", "Pixel Watch2", "Pixel Watch 41mm"]) {
  if (canonicalGalaxyModel(n) !== null || canonicalPixelModel(n) !== null) ng(`スマホの機種判定が時計の名前を読んだ: ${n}`);
}
if (parseGalaxyWatch("Galaxy S24 Ultra 256GB") !== null || parsePixelWatch("Google Pixel 9 Pro 128GB") !== null || parseGalaxyWatch("Apple Watch Series 9 45mm GPS") !== null) ng("時計の読み取りがスマホ・Apple Watch の名前を読んだ");

// --- 実際の商品名（店内検索の結果）を全部読ませる ---
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "rakuten-galaxy-pixel-watch-titles.json"), "utf8")) as Record<string, string[]>;
/** 行にならなかった理由（集計用。読み取りとは別に、商品名を見て分ける） */
function reasonOf(name: string): string {
  const t = name.normalize("NFKC");
  if (!/Galaxy\s?Watch|Pixel\s?Watch/i.test(t)) return "時計の名前がない（検索に掛かった別の商品）";
  if (/欠品/.test(t)) return "充電ケーブル・充電ホルダーが欠けている個体";
  if (/海外|SM-[RL]\d{3}[NF][A-Z]{2}[A-Z0-9](?!XJP|SJP|KDI|DCM|SBM|UQM)[A-Z]{3}/.test(t)) return "海外版";
  if (/Band|ループバンド|CASE|Charger|Dock|対応|GALAXYWATCH/i.test(t)) return "付属品（バンド・ケース・充電器）";
  if (/Galaxy\s?Watch\s?(?:\d{2}mm|FE|3|Active)/i.test(t)) return "カタログ外（初代・Watch3・FE）";
  if (/Watch4 Classic 42mm/i.test(t)) return "サイズが公式で未確認（Watch4 Classic 42mm）";
  return "その他";
}
let total = 0;
const perShop: string[] = [];
const reasons = new Map<string, number>();
const perModel = new Map<string, number>();
for (const [shop, names] of Object.entries(fixture)) {
  let ok = 0;
  let wear = 0;
  for (const name of names) {
    total++;
    const got = normalize(shop, name, "B", null, total);
    if (got && isSmartwatch(got.modelName) && !isWatch(got.modelName)) {
      ok++;
      perModel.set(got.modelName, (perModel.get(got.modelName) ?? 0) + 1);
      // 誤読の確かめ（読み取りとは別の読み方で）: 名前に書かれた世代・mm・通信方式と食い違わないこと
      const t = name.normalize("NFKC");
      const galaxy = isGalaxyWatch(got.modelName);
      const info = galaxy ? GALAXY_WATCH_INFO[got.modelName] : PIXEL_WATCH_INFO[got.modelName];
      if (!info) ng(`${shop}: カタログにない機種: ${got.modelName}`);
      else if (!info.sizes.includes(got.storage)) ng(`${shop}: 機種にないサイズ: ${got.modelName} ${got.storage}mm ← ${name.slice(0, 60)}`);
      if (galaxy !== /Galaxy\s?Watch/i.test(t)) ng(`${shop}: ブランドの取り違え: ${got.modelName} ← ${name.slice(0, 60)}`);
      const mmInName = [...t.matchAll(/(\d{2})\s*mm/gi)].map((x) => Number(x[1]));
      if (mmInName.length > 0 && !mmInName.includes(got.storage)) ng(`${shop}: サイズの取り違え: ${got.storage}mm ← ${name.slice(0, 60)}`);
      const lte = /LTE/i.test(t);
      if ((got.carrier === "LTE") !== lte && !(got.carrier === "LTE" && /SM-[RL]\d{2}5F/.test(t))) ng(`${shop}: 通信方式の取り違え: ${got.carrier} ← ${name.slice(0, 60)}`);
      // 世代: 名前の「Watch」の直後（数字・Ultra・Classic・Pro）と機種名が合うこと
      const tail = got.modelName.replace(/^(?:Samsung Galaxy|Google Pixel) Watch\s?/, "");
      const m = t.match(/(?:Galaxy|Pixel)\s?Watch\s?((?:Ultra\s?2?|\d)?(?:\s?(?:Classic|Pro))?)/i)?.[1] ?? "";
      const norm = (s: string) => s.replace(/\s|\(\d{4}\)/g, "").toLowerCase();
      if (norm(m) !== norm(tail)) ng(`${shop}: 世代の取り違え: ${got.modelName} ← ${name.slice(0, 60)}`);
      if (/Ultra/i.test(tail) && !/Ultra2/.test(tail)) {
        const is2025 = /\(2025\)|SM-L705F[A-Z]{2}5/.test(t);
        if (is2025 !== /2025/.test(tail)) ng(`${shop}: Ultra の年の取り違え: ${got.modelName} ← ${name.slice(0, 60)}`);
      }
      if (/欠品|海外|Band|ループバンド/i.test(t)) ng(`${shop}: 落とすはずの商品が行になった: ${name.slice(0, 60)}`);
      if (got.shopName !== RAKUTEN_SHOPS[shop].shopName) ng(`${shop}: 店名が違う: ${got.shopName}`);
      wear++;
    } else {
      // 時計以外の行（ゲオの Apple Watch・ニューズドテックのスマホ）は今までどおり。時計の名前の商品は行になっていないこと
      if (got && /Galaxy\s?Watch|Pixel\s?Watch/i.test(name)) ng(`${shop}: 時計の名前の商品が別の種類の行になった: ${got.modelName} ← ${name.slice(0, 60)}`);
      if (!got || !isSmartwatch(got.modelName) || isWatch(got.modelName)) {
        const r = got ? "時計の名前がない（検索に掛かった別の商品）" : reasonOf(name);
        reasons.set(r, (reasons.get(r) ?? 0) + 1);
      }
    }
  }
  perShop.push(`${shop} ${ok}/${names.length}`);
  if ((shop === "janpara" || shop === "pc-good") && wear === 0) ng(`${shop}: 時計が1件も読めない`);
  if (shop !== "janpara" && shop !== "pc-good" && wear > 0) ng(`${shop}: 読まないはずの店から時計の行が出た`);
}
console.log(`実際の商品名 ${total} 件: 時計の行にした件数（店別） ${perShop.join("・")}`);
for (const [r, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  行にしない: ${r} ${n} 件`);
console.log(`  機種別: ${[...perModel].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m.replace(/^(Samsung|Google) /, "")} ${n}`).join("・")}`);
if ((reasons.get("その他") ?? 0) > 0) ng(`理由の分からない読み落としがある（その他 ${reasons.get("その他")} 件）`);

// --- カタログの整合 ---
const NEW = [...GALAXY_WATCH_MODELS, ...PIXEL_WATCH_MODELS];
if (GALAXY_WATCH_MODELS.length !== 13) ng(`Galaxy Watch の機種数が想定（13）と違う: ${GALAXY_WATCH_MODELS.length}`);
if (PIXEL_WATCH_MODELS.length !== 5) ng(`Pixel Watch の機種数が想定（5）と違う: ${PIXEL_WATCH_MODELS.length}`);
if (new Set(NEW).size !== NEW.length) ng("機種名に重複がある");
for (const m of GALAXY_WATCH_MODELS) if (!GALAXY_WATCH_INFO[m]) ng(`GALAXY_WATCH_INFO にない機種: ${m}`);
for (const k of Object.keys(GALAXY_WATCH_INFO)) if (!GALAXY_WATCH_MODELS.includes(k)) ng(`GALAXY_WATCH_CATALOG にない機種が INFO にある: ${k}`);
for (const m of PIXEL_WATCH_MODELS) if (!PIXEL_WATCH_INFO[m]) ng(`PIXEL_WATCH_INFO にない機種: ${m}`);
for (const k of Object.keys(PIXEL_WATCH_INFO)) if (!PIXEL_WATCH_MODELS.includes(k)) ng(`PIXEL_WATCH_CATALOG にない機種が INFO にある: ${k}`);
for (const s of [...GALAXY_WATCH_CATALOG, ...PIXEL_WATCH_CATALOG]) if (s.models.length === 0) ng(`空のシリーズ: ${s.series}`);
// 型番の頭は機種をまたいで重複しない・サイズは機種のサイズの中
const codeOwner = new Map<string, string>();
for (const [m, i] of Object.entries(GALAXY_WATCH_INFO)) {
  for (const [base, c] of Object.entries(i.codes)) {
    if (!/^[RL]\d{3}$/.test(base)) ng(`型番の頭の形が違う: ${m} ${base}`);
    if (codeOwner.has(base)) ng(`型番の頭 ${base} が別の機種で重複: ${codeOwner.get(base)} / ${m}`);
    codeOwner.set(base, m);
    if (c.size !== undefined && !i.sizes.includes(c.size)) ng(`型番のサイズが機種のサイズにない: ${m} ${base}`);
    if (!i.carriers.includes(c.carrier)) ng(`型番の通信方式が機種にない: ${m} ${base}`);
  }
}
// 公式のサポートページの題のとおり（2026-11-13）
const sizes: Record<string, string> = {
  [W("9")]: "40,44", [W("8")]: "40,44", [W("7")]: "40,44", [W("6")]: "40,44", [W("5")]: "40,44", [W("4")]: "40,44",
  [W(" Ultra2")]: "47", [W(" Ultra (2025)")]: "47", [W(" Ultra")]: "47",
  [W("8 Classic")]: "46", [W("6 Classic")]: "43,47", [W("5 Pro")]: "45", [W("4 Classic")]: "46",
  [P(" 5")]: "41,45", [P(" 4")]: "41,45", [P(" 3")]: "41,45", [P(" 2")]: "41", [P("")]: "41",
};
for (const [m, s] of Object.entries(sizes)) {
  const got = (GALAXY_WATCH_INFO[m] ?? PIXEL_WATCH_INFO[m])?.sizes.join(",");
  if (got !== s) ng(`サイズが公式と違う: ${m} ${got}`);
}

// --- 名前の頭・種類・スラッグ・ページ ---
for (const m of NEW) {
  const galaxy = GALAXY_WATCH_MODELS.includes(m);
  const prefix = galaxy ? "Samsung Galaxy Watch" : "Google Pixel Watch";
  if (!m.startsWith(prefix)) ng(`機種名が "${prefix}" で始まらない: ${m}`);
  // スマホの Galaxy・Pixel、Apple Watch の判定（どれも機種名の頭）に当たらない
  if (isGalaxy(m) || isPixel(m) || isWatch(m) || /^(?:iPhone|iPad|MacBook|Xperia|AQUOS|OPPO |Xiaomi )/.test(m)) ng(`既存の種類の判定に当たる: ${m}`);
  if (!isSmartwatch(m) || isGalaxyWatch(m) !== galaxy || isPixelWatch(m) === galaxy) ng(`時計の判定が違う: ${m}`);
  const device = galaxy ? "galaxy-watch" : "pixel-watch";
  if (deviceOf(m) !== device) ng(`deviceOf が ${device} でない: ${m} → ${deviceOf(m)}`);
  if (modelPagePath(m) !== `/${device}/${modelToSlug(m)}`) ng(`パスが想定と違う: ${m}`);
  if (slugToModel(modelToSlug(m)) !== m) ng(`slugToModel で戻らない: ${m}`);
  if (!ALL_DEVICE_PAGE_MODELS.includes(m)) ng(`ALL_DEVICE_PAGE_MODELS にない: ${m}`);
  if (siblingModels(m).some((s) => (galaxy ? !GALAXY_WATCH_MODELS.includes(s) : !PIXEL_WATCH_MODELS.includes(s)))) ng(`同じシリーズに別の種類がある: ${m}`);
  if (shopsFor(m) !== (galaxy ? GALAXY_WATCH_SHOPS : PIXEL_WATCH_SHOPS)) ng(`shopsFor が違う: ${m}`);
  if (!/^(?:samsung-galaxy-watch|google-pixel-watch)[a-z0-9-]*$/.test(modelToSlug(m))) ng(`スラッグが妥当でない: ${m} → ${modelToSlug(m)}`);
  // 検索ページの種類のタブ（機種名の頭）: 自分の種類だけに入る
  const tabs = SEARCH_DEVICES.filter((d) => m.startsWith(d.prefix)).map((d) => d.key).join(",");
  if (tabs !== device) ng(`検索の種類が違う: ${m} → ${tabs}`);
  if (storageLabel(44, m) !== "44mm") ng(`サイズの表示が mm でない: ${m}`);
}
const slugs = NEW.map(modelToSlug);
if (new Set(slugs).size !== slugs.length) ng("スラッグが重複");
const existing = new Set(ALL_DEVICE_PAGE_MODELS.filter((m) => !NEW.includes(m)).map(modelToSlug));
for (const s of slugs) if (existing.has(s)) ng(`既存ページとスラッグが重複: ${s}`);
const slugOf: Record<string, string> = {
  [W("7")]: "samsung-galaxy-watch7", [W("6 Classic")]: "samsung-galaxy-watch6-classic", [W(" Ultra")]: "samsung-galaxy-watch-ultra",
  [W(" Ultra (2025)")]: "samsung-galaxy-watch-ultra-2025", [W(" Ultra2")]: "samsung-galaxy-watch-ultra2", [P("")]: "google-pixel-watch", [P(" 3")]: "google-pixel-watch-3",
};
for (const [m, s] of Object.entries(slugOf)) if (modelToSlug(m) !== s) ng(`スラッグが想定と違う: ${m} → ${modelToSlug(m)}（期待 ${s}）`);
if (DEVICE_HUB["galaxy-watch"].path !== "/galaxy-watch" || DEVICE_HUB["pixel-watch"].path !== "/pixel-watch") ng("一覧のパスが違う");
if (GALAXY_WATCH_SHOPS.map((s) => s.label).join("・") !== "イオシス・じゃんぱら" || PIXEL_WATCH_SHOPS.map((s) => s.label).join("・") !== "イオシス・じゃんぱら") ng(`時計を扱う店が想定と違う: ${GALAXY_WATCH_SHOPS.map((s) => s.label).join("・")}`);
if (shortModelName(W("7")) !== "Watch7" || shortModelName(P(" 3")) !== "Watch 3" || shortModelName(W(" Ultra (2025)")) !== "Watch Ultra 2025") ng("一覧の題の短い機種名が想定と違う");

// --- 既存のカタログ・判定に混ざらない／変わらない ---
for (const [name, list] of [["ALL_CATALOG_MODELS", ALL_CATALOG_MODELS], ["GALAXY_MODELS", GALAXY_MODELS], ["PIXEL_MODELS", PIXEL_MODELS], ["WATCH_MODELS", WATCH_MODELS]] as const) {
  if (list.some((m) => /Galaxy Watch|Pixel Watch/.test(m))) ng(`${name} に Galaxy Watch・Pixel Watch が混ざっている`);
}
if (deviceOf("iPhone 15") !== "iphone" || deviceOf("Galaxy S24") !== "galaxy" || deviceOf("Pixel 9") !== "pixel" || deviceOf("Apple Watch Series 9") !== "watch" || deviceOf("iPad Air (M2)") !== "ipad" || deviceOf("Xiaomi 15") !== "xiaomi") ng("deviceOf が既存機種で変わった");
if (shopsFor("Galaxy S24") !== GALAXY_SHOPS || shopsFor("Pixel 9") !== PIXEL_SHOPS || shopsFor("Apple Watch Series 9") !== WATCH_SHOPS) ng("shopsFor が既存機種で変わった");
if (storageLabel(256, "Galaxy S24") !== "256GB" || storageLabel(128, "Pixel 9") !== "128GB" || storageLabel(46, "Apple Watch Series 10") !== "46mm" || storageLabel(1024) !== "1TB") ng("容量の表示が既存機種で変わった");
if (isSmartwatch("Galaxy S24") || isSmartwatch("Pixel 9") || !isSmartwatch("Apple Watch SE 3")) ng("isSmartwatch が既存機種で違う");

// --- 検索の機種照合 ---
const mm = (q: string, name: string, want: boolean) => { if (matchesModel(q, name) !== want) ng(`matchesModel("${q}", "${name}") が ${!want}`); };
for (const a of NEW) for (const b of NEW) mm(a, b, a === b); // 正式名どうしは完全一致だけ（Ultra と Ultra2・Ultra (2025)、初代と 2〜5、Watch8 と Watch8 Classic を取り違えない）
for (const m of NEW) {
  // 既存の全機種のページ（検索の振り分けは「ページの機種名を検索語として DB の機種名に当てる」）に入らない
  for (const page of ALL_DEVICE_PAGE_MODELS) if (page !== m && matchesModel(page, m)) ng(`別の機種のページに入る: ${m} → ${page}`);
  for (const q of ["Galaxy", "Pixel", "Galaxy S24", "Pixel 9", "Apple Watch", "iPhone 15", "iPad", "MacBook Air"]) mm(q, m, false);
}
// 時計の検索語が、既存の機種名に当たらない
for (const name of ["Galaxy S24", "Galaxy Z Flip7", "Pixel 9", "Pixel Fold", "Apple Watch Series 9", "iPhone 15", "Xiaomi 15"]) for (const q of [W("7"), P(" 3"), "Samsung Galaxy Watch", "Google Pixel Watch"]) mm(q, name, false);
// 正式名でない検索（頭だけ・世代だけ）
mm("Samsung Galaxy Watch", W("7"), true);
mm("Samsung Galaxy Watch", W(" Ultra2"), true);
mm("Samsung Galaxy Watch", P(" 3"), false);
mm("Google Pixel Watch", P(""), true); // 正式名（初代）なので完全一致だけ
mm("Google Pixel Watch", P(" 3"), false);
mm("samsung galaxy watch 8", W("8 Classic"), true);
mm("samsung galaxy watch 8", W("9"), false);
// 既存の照合が変わらない
mm("Galaxy S24", "Galaxy S24", true);
mm("Galaxy S24", "Galaxy S24 Ultra", false);
mm("Pixel 9", "Pixel 9a", false);
mm("Apple Watch", "Apple Watch Series 10", true);
mm("iPhone 15", "iPhone 15 Pro", false);

console.log(failures === 0 ? `OK（手書きの表 ${ROWS.length} 件・実際の商品名 ${total} 件・機種 ${NEW.length}）` : `${failures} 件の違い`);
process.exit(failures === 0 ? 0 : 1);
