/**
 * Apple Watch の機種名・サイズ・通信方式・色の読み取りの回帰テスト（npm run test:watch。違いがあれば exit 1）
 * 期待値は手で書いた表。商品名は 2026-10-15 に楽天の店内検索・各店の公式サイトで集めたもの。新しい表記を見つけたら足す。
 *   - PARSE: 商品名だけから決まるもの（lib/watchCatalog.ts の parseWatch）。model が null の行は「行にしない」（範囲外・アクセサリ・世代が決められない SE）
 *   - SHOP: 店ごとの読み取り（lib/rakutenWatch.ts を lib/rakutenShops.ts の振り分け経由で）。ランク・バッテリーも見る
 */
import { WATCH_CATALOG, WATCH_INFO, WATCH_MODELS, isWatchOS27, parseWatch } from "@/lib/watchCatalog";
import { RAKUTEN_SHOPS } from "@/lib/rakutenShops";
import { matchesModel } from "@/lib/modelMatch";
import { ALL_DEVICE_PAGE_MODELS, deviceOf, modelPagePath, modelToSlug, siblingModels, slugToModel } from "@/lib/catalog";
import { shopsFor, WATCH_SHOPS } from "@/lib/shops";
import { storageLabel } from "@/lib/format";
import type { RakutenItem } from "@/lib/rakutenCommon";

let fail = 0;
const ng = (msg: string) => {
  fail++;
  console.log("NG: " + msg);
};

const S10 = "Apple Watch Series 10";
const SE3 = "Apple Watch SE 3";
const SE2 = "Apple Watch SE（第2世代）";
const SE1 = "Apple Watch SE（第1世代）";
const GPS = "GPS";
const CELL = "GPS+Cellular";

// title, model, size, carrier, color
type Parse = [title: string, model: string | null, size?: number, carrier?: string, color?: string];
const PARSE: Parse[] = [
  // --- ゲオ（geo-mobile） ---
  ["【中古】【安心保証】 Series4[40mm/GPS]アルミ シルバー Apple Watch", null], // 範囲外
  ["【中古】【安心保証】 バンド無 Series6[40mm/GPS]アルミ レッド Apple Watch", "Apple Watch Series 6", 40, GPS, "レッド アルミニウム"],
  ["【中古】【安心保証】 Ultra[49mm/セルラー]チタン チタニウム Apple Watch", "Apple Watch Ultra", 49, CELL, "チタニウム"],
  ["【中古】【安心保証】 バンド無 Series9[41mm/GPS]アルミ シルバー Apple Watch", "Apple Watch Series 9", 41, GPS, "シルバー アルミニウム"],
  ["【中古】【安心保証】 Series5[40mm/GPS]アルミ スペースグレイ Apple Watch", null], // 範囲外
  // --- じゃんぱら（janpara） ---
  ["【中古】Apple Apple Watch Series7 41mm GPS スターライトアルミ/スポーツバンド スターライト【OSU301】保証期間1ヶ月【ランクC】", "Apple Watch Series 7", 41, GPS, "スターライト アルミニウム"],
  ["【中古】Apple Apple Watch Ultra 49mm Cellular チタニウムケース/ミッドナイトオーシャンバンド MQFK3J/A【ECセンター】保証期間1ヶ月【ランクB】", "Apple Watch Ultra", 49, CELL, "チタニウム"],
  // SE の世代が書かれておらず、モデル番号もない → 決めない
  ["【中古】Apple Apple Watch SE 40mm Cellular シルバー/スポーツバンド アビスブルー S&M/M&L【津田沼】保証期間1ヶ月【ランクC】", null],
  ["【中古】Apple Apple Watch Series4 Nike+ Cellular 40mm スペースグレイアルミケース (バンド無し)【京都】保証期間1ヶ月【ランクC】", null],
  ["【中古】Apple Apple Watch Series7 45mm GPS ミッドナイトアルミ/スポーツバンド ミッドナイト【京都】保証期間1ヶ月【ランクC】", "Apple Watch Series 7", 45, GPS, "ミッドナイト アルミニウム"],
  ["Apple Apple Watch Edition Series5 44mm Cellular スペースブラックチタニウム/ブラックスポーツバンド", null], // 範囲外
  ["Apple Apple Watch Series10 42mm Cellular ジェットブラックアルミニウムケース/ブラックスポーツバンド (S/M) MWX63J/A", S10, 42, CELL, "ジェットブラック アルミニウム"],
  // --- ソフマップ（akiba-u-shop） ---
  ["【中古】Apple(アップル) Apple Watch SE 第1世代 GPS 40mm スペースグレイアルミニウムケース ブラックスポーツバンド 【344-ud】", SE1, 40, GPS, "スペースグレイ アルミニウム"],
  ["【中古】Apple(アップル) Apple Watch Series 11 GPS 46mm スペースグレイアルミニウムケース バンド無し 【269-ud】", "Apple Watch Series 11", 46, GPS, "スペースグレイ アルミニウム"],
  ["【中古】Apple(アップル) Apple Watch Series 7 GPS 41mm ミッドナイトアルミニウムケース バンド無し 【269-ud】", "Apple Watch Series 7", 41, GPS, "ミッドナイト アルミニウム"],
  ["【中古】Apple(アップル) Apple Watch Ultra GPS + Cellular 49mm チタニウムケース バンド無し 【377-ud】", "Apple Watch Ultra", 49, CELL, "チタニウム"],
  // --- イオシス（pc-good） ---
  ["Apple Apple Watch SE3 40mm GPSモデル MEH54J/A A3324【スターライトアルミニウムケース/スターライトスポーツバンド(M/L)】 [中古] 【当社3ヶ月間保証】 イオシス", SE3, 40, GPS, "スターライト アルミニウム"],
  // A2773 は公式の表（北米）にない → 名前で決める
  ["Apple Apple Watch Hermes Series8 41mm GPS+Cellularモデル MNN13J/A A2773【シルバーステンレススチールケース/Hermesスポーツバンド】 [中古] 【当社3ヶ月間保証】 イオシス", "Apple Watch Series 8", 41, CELL, "エルメス シルバー ステンレススチール"],
  ["Apple 【バンド無し】Apple Watch Hermes Series9 45mm GPS+Cellularモデル MRQP3J/A A2984【シルバーステンレススチールケース】 [中古] 【当社3ヶ月間保証】 イオシス", "Apple Watch Series 9", 45, CELL, "エルメス シルバー ステンレススチール"],
  ["Apple 【バンド無し】Apple Watch Hermes Series10 42mm GPS+Cellularモデル MX0Q3J/A A3001【シルバーチタニウムケース】 [中古] 【当社3ヶ月間保証】 イオシス", S10, 42, CELL, "エルメス シルバー チタニウム"],
  // A2478 は北米の表にない（日本向けの番号の可能性）→ 名前で決める
  ["Apple Apple Watch Series7 45mm GPS+Cellularモデル MKJQ3J/A A2478【スターライトアルミニウムケース/スターライトスポーツバンド】 [中古] 【当社3ヶ月間保証】 イオシス", "Apple Watch Series 7", 45, CELL, "スターライト アルミニウム"],
  // --- ニューズドテック（kamaya-awards / garakei） ---
  ["【中古】Apple Watch SE 3 GPS 40mm 64GB スターライト アルミニウム A3325【送料無料】awse3mtm14", SE3, 40, GPS, "スターライト アルミニウム"],
  ["【中古】 Apple Watch SE 2 LTE 40mm スターライト アルミニウム A2725 本体 【送料無料】awse2mtm124", SE2, 40, CELL, "スターライト アルミニウム"],
  ["【中古】 Apple Watch series 10 GPS 46mm 64GB シルバー アルミニウム A2999【送料無料】aw10mtm208", S10, 46, GPS, "シルバー アルミニウム"],
  ["【中古】Apple Watch series 11 LTE 46mm 64GB ローズゴールド アルミニウム MFC94J/A A3337【あす楽】【送料無料】 aw11mtm28", "Apple Watch Series 11", 46, CELL, "ローズゴールド アルミニウム"],

  // --- 表記ゆれ: 世代 ---
  ["【中古】Apple Watch Series 7 GPS 45mm ミッドナイト アルミニウム", "Apple Watch Series 7", 45, GPS, "ミッドナイト アルミニウム"],
  ["【中古】Apple Watch Series12 GPS 46mm ジェットブラック アルミニウム", "Apple Watch Series 12", 46, GPS, "ジェットブラック アルミニウム"],
  ["【中古】Apple Watch SE 第2世代 GPS 44mm ミッドナイト アルミニウム", SE2, 44, GPS, "ミッドナイト アルミニウム"],
  ["【中古】Apple Watch SE（第2世代）GPS 40mm スターライト アルミニウム", SE2, 40, GPS, "スターライト アルミニウム"],
  ["【中古】Apple Watch SE 3 GPS 44mm ミッドナイト アルミニウム", SE3, 44, GPS, "ミッドナイト アルミニウム"],
  ["【中古】Apple Watch Ultra 2 Cellular 49mm ブラック チタニウム", "Apple Watch Ultra 2", 49, CELL, "ブラック チタニウム"],
  ["【中古】Apple Watch Ultra2 49mm セルラー ナチュラル チタニウム", "Apple Watch Ultra 2", 49, CELL, "ナチュラル チタニウム"],
  ["【中古】Apple Watch Ultra 3 GPS+Cellular 49mm ナチュラル チタニウム", "Apple Watch Ultra 3", 49, CELL, "ナチュラル チタニウム"],
  ["【中古】Apple Watch Ultra 49mm チタニウム", "Apple Watch Ultra", 49, CELL, "チタニウム"], // Ultra は Cellular だけ
  // モデル番号だけで SE の世代が決まる（A3324 は SE 3 の GPS）
  ["【中古】Apple Watch SE 40mm GPSモデル A3324 スターライト アルミニウム", SE3, 40, GPS, "スターライト アルミニウム"],
  // --- 表記ゆれ: 通信方式 ---
  ["【中古】Apple Watch Series 9 GPSモデル 41mm シルバー アルミニウム", "Apple Watch Series 9", 41, GPS, "シルバー アルミニウム"],
  ["【中古】Apple Watch Series 9 GPS + Cellular 45mm ミッドナイト アルミニウム", "Apple Watch Series 9", 45, CELL, "ミッドナイト アルミニウム"],
  ["【中古】Apple Watch Series 9 セルラー 41mm スターライト アルミニウム", "Apple Watch Series 9", 41, CELL, "スターライト アルミニウム"],
  ["【中古】Apple Watch Series 9 LTE 41mm ピンク アルミニウム", "Apple Watch Series 9", 41, CELL, "ピンク アルミニウム"],
  // --- 行にしないもの ---
  ["【中古】Apple Watch Series 9 41mm シルバー アルミニウム", null], // 通信方式がない
  ["【中古】Apple Watch Series 9 GPS シルバー アルミニウム", null], // サイズがない
  ["【中古】Apple Watch GPS 41mm シルバー アルミニウム", null], // 世代がない
  ["【中古】Apple Watch Series 9 GPS 45mm 41mm シルバー アルミニウム", null], // サイズが2つ（まとめ売り）
  ["【中古】Apple Watch Series 9 GPS 44mm シルバー アルミニウム", null], // Series 9 に 44mm はない
  ["【中古】Apple Watch Series 1 GPS 38mm シルバー アルミニウム", null], // 範囲外（Series 1 を Series 10 と取り違えない）
  ["【中古】Apple Watch Series 3 GPS 42mm シルバー アルミニウム", null], // 範囲外
  ["Apple Watch 純正 スポーツバンド 45mm 44mm 42mm ブラック", null],
  ["Apple Watch Series 9 対応 保護フィルム 45mm GPS 強化ガラス", null],
  ["Apple Watch 充電器 充電ケーブル マグネット 急速 Series 9 45mm GPS", null],
  ["Apple Watch Series 10 ケース カバー 46mm GPS TPU", null],
  ["iPhone 15 Pro 256GB ブルーチタニウム SIMフリー", null],
  ["Galaxy Watch 6 40mm LTE グラファイト", null],
];

for (const [title, model, size, carrier, color] of PARSE) {
  const got = parseWatch(title);
  if ((got?.modelName ?? null) !== model) {
    ng(`機種 期待=${model} 結果=${got?.modelName ?? null}\n    ${title}`);
    continue;
  }
  if (!got || color === undefined) continue;
  if (got.size !== size || got.carrier !== carrier || got.color !== color) {
    ng(`サイズ/通信方式/色 期待=${size}/${carrier}/${color} 結果=${got.size}/${got.carrier}/${got.color}\n    ${title}`);
  }
}

// --- 店ごと（ランク・バッテリー・行の形）---
const item = (name: string, over: Partial<RakutenItem> = {}): RakutenItem => ({ code: "t", name, price: 29800, url: "https://item.rakuten.co.jp/x/y/", rank: null, nw: null, ...over });
const route = (shop: string, it: RakutenItem) => RAKUTEN_SHOPS[shop].normalize(it);
type Expect = { model: string; size: number; carrier: string; color: string; rank: string; battery?: number | null; shopName: string };
function checkRow(label: string, row: ReturnType<typeof route>, e: Expect | null) {
  if (e === null) { if (row !== null) ng(`${label}: null のはずが行になった ${JSON.stringify(row)}`); return; }
  if (!row) { ng(`${label}: 行にならなかった`); return; }
  const got = [row.modelName, row.storage, row.carrier, row.color, row.conditionRank, row.batteryHealth ?? null, row.shopName, row.manufacturer, row.simUnlocked, row.networkStatus, row.isSoldOut, row.memoryGB ?? null];
  const want = [e.model, e.size, e.carrier, e.color, e.rank, e.battery ?? null, e.shopName, "Apple", false, null, false, null];
  if (JSON.stringify(got) !== JSON.stringify(want)) ng(`${label}: 期待=${JSON.stringify(want)} 結果=${JSON.stringify(got)}`);
}
const GEO = "ゲオモバイル（楽天市場店）";
const JAN = "じゃんぱら（楽天市場店）";
const SOF = "ソフマップ（楽天市場店）";
const IOS = "イオシス（楽天市場店）";
const NEW = "ニューズドテック（楽天市場店）";

checkRow("ゲオ", route("geo-mobile", item("【中古】【安心保証】 バンド無 Series9[41mm/GPS]アルミ シルバー Apple Watch", { rank: "B" })), { model: "Apple Watch Series 9", size: 41, carrier: GPS, color: "シルバー アルミニウム", rank: "B", shopName: GEO });
checkRow("ゲオ 範囲外", route("geo-mobile", item("【中古】【安心保証】 Series5[40mm/GPS]アルミ スペースグレイ Apple Watch", { rank: "B" })), null);
checkRow("ゲオ バンドだけ", route("geo-mobile", item("【中古】【安心保証】 スポーツバンド ブラック 純正 Apple Watch 44mm 45mm")), null);
checkRow("じゃんぱら ランクC", route("janpara", item("【中古】Apple Apple Watch Series7 41mm GPS スターライトアルミ/スポーツバンド スターライト【OSU301】保証期間1ヶ月【ランクC】", { batt: 88 })), { model: "Apple Watch Series 7", size: 41, carrier: GPS, color: "スターライト アルミニウム", rank: "C", battery: 88, shopName: JAN });
checkRow("じゃんぱら 未使用", route("janpara", item("【未使用】Apple Apple Watch Series10 42mm Cellular ジェットブラックアルミニウムケース/ブラックスポーツバンド (S/M) MWX63J/A【ECセンター】保証期間3ヶ月")), { model: S10, size: 42, carrier: CELL, color: "ジェットブラック アルミニウム", rank: "S", shopName: JAN });
checkRow("じゃんぱら SE（世代なし）", route("janpara", item("【中古】Apple Apple Watch SE 40mm Cellular シルバー/スポーツバンド アビスブルー S&M/M&L【津田沼】保証期間1ヶ月【ランクC】")), null);
checkRow("ソフマップ", route("akiba-u-shop", item("【中古】Apple(アップル) Apple Watch Series 11 GPS 46mm スペースグレイアルミニウムケース バンド無し 【269-ud】", { rank: "A", batt: 95 })), { model: "Apple Watch Series 11", size: 46, carrier: GPS, color: "スペースグレイ アルミニウム", rank: "A", battery: 95, shopName: SOF });
checkRow("ソフマップ ランク不明", route("akiba-u-shop", item("【中古】Apple(アップル) Apple Watch Ultra GPS + Cellular 49mm チタニウムケース バンド無し 【377-ud】")), { model: "Apple Watch Ultra", size: 49, carrier: CELL, color: "チタニウム", rank: "不明", shopName: SOF });
checkRow("イオシス", route("pc-good", item("Apple Apple Watch SE3 40mm GPSモデル MEH54J/A A3324【スターライトアルミニウムケース/スターライトスポーツバンド(M/L)】 [中古] 【当社3ヶ月間保証】 イオシス", { rank: "B" })), { model: SE3, size: 40, carrier: GPS, color: "スターライト アルミニウム", rank: "B", shopName: IOS });
// 未使用品は「[未使用]」「[新品]」と書き、商品説明にランクがない → S・電池100
checkRow("イオシス", route("pc-good", item("Apple Apple Watch SE3 40mm GPSモデル MEH54J/A A3324【スターライトアルミニウムケース/スターライトスポーツバンド(M/L)】 [未使用] 【当社6ヶ月間保証】 イオシス", {})), { model: SE3, size: 40, carrier: GPS, color: "スターライト アルミニウム", rank: "S", battery: 100, shopName: IOS });
checkRow("イオシス", route("pc-good", item("Apple Apple Watch SE3 40mm GPSモデル MEH54J/A A3324【スターライトアルミニウムケース/スターライトスポーツバンド(M/L)】 [新品] 【当社6ヶ月間保証】 イオシス", {})), { model: SE3, size: 40, carrier: GPS, color: "スターライト アルミニウム", rank: "S", battery: 100, shopName: IOS });
checkRow("イオシス 80%未満", route("pc-good", item("Apple Apple Watch Series7 45mm GPS+Cellularモデル MKJQ3J/A A2478【スターライトアルミニウムケース/スターライトスポーツバンド】 【バッテリー80%未満】 [中古] 【当社3ヶ月間保証】 イオシス", { rank: "C" })), { model: "Apple Watch Series 7", size: 45, carrier: CELL, color: "スターライト アルミニウム", rank: "C", battery: 79, shopName: IOS });
checkRow("イオシス 未使用", route("pc-good", item("【未使用】Apple 【バンド無し】Apple Watch Hermes Series10 42mm GPS+Cellularモデル MX0Q3J/A A3001【シルバーチタニウムケース】 【当社6ヶ月保証】 イオシス")), { model: S10, size: 42, carrier: CELL, color: "エルメス シルバー チタニウム", rank: "S", battery: 100, shopName: IOS });
for (const shop of ["kamaya-awards", "garakei"]) {
  checkRow(`ニューズドテック ${shop}`, route(shop, item("【中古】Apple Watch SE 3 GPS 40mm 64GB スターライト アルミニウム A3325【送料無料】awse3mtm14", { rank: "A" })), { model: SE3, size: 40, carrier: GPS, color: "スターライト アルミニウム", rank: "A", shopName: NEW });
}
checkRow("ニューズドテック Aランク（名前）", route("kamaya-awards", item("【中古】 Apple Watch series 10 GPS 46mm 64GB シルバー アルミニウム Aランク A2999【送料無料】aw10mtm208")), { model: S10, size: 46, carrier: GPS, color: "シルバー アルミニウム", rank: "A", shopName: NEW });
checkRow("ニューズドテック LTE", route("garakei", item("【中古】 Apple Watch SE 2 LTE 40mm スターライト アルミニウム A2725 本体 【送料無料】awse2mtm124", { rank: "B" })), { model: SE2, size: 40, carrier: CELL, color: "スターライト アルミニウム", rank: "B", shopName: NEW });
checkRow("ニューズドテック 価格0", route("kamaya-awards", item("【中古】Apple Watch SE 3 GPS 40mm 64GB スターライト アルミニウム A3325", { price: 0 })), null);
// キタムラ・エムティーエムは Apple Watch を取らない
for (const shop of ["emedama", "ekosuta"]) {
  if (route(shop, item("【中古】Apple Watch Series 9 GPS 45mm ミッドナイト アルミニウム", { rank: "A" })) !== null) ng(`${shop} の Apple Watch が行になった`);
}
// 既存のルーティングが変わらない
const phone = route("janpara", item("【中古】Apple 国内版 【SIMフリー】 iPhone 16 Pro Max 256GB デザートチタニウム【ECセンター】保証期間1ヶ月【ランクB】"));
if (phone?.modelName !== "iPhone 16 Pro Max" || phone.carrier === "GPS") ng(`iPhone のルーティングが変わった: ${JSON.stringify(phone)}`);
const nPhone = route("kamaya-awards", item("バッテリー新品交換済 【中古】 iPhone14 128GB ミッドナイト Aランク SIMフリー 本体 スマホ 【あす楽】 ip14mtm2258a"));
if (nPhone?.modelName !== "iPhone 14") ng(`ニューズドテックの iPhone が読めない: ${JSON.stringify(nPhone)}`);
const mac = route("janpara", item("【中古】Apple MacBook Air 13インチ M2(CPU:8C/GPU:8C) 16GB/256GB スペースグレイ MC7U4J/A (M2,2022)【ECセンター】保証期間１ヶ月【ランクA】"));
if (mac?.modelName !== "MacBook Air 13インチ M2") ng(`Mac のルーティングが変わった: ${JSON.stringify(mac)}`);

// --- 機種照合: 正式名で完全一致 ---
const mm = (q: string, name: string, want: boolean) => { if (matchesModel(q, name) !== want) ng(`matchesModel("${q}", "${name}") は ${want} のはず`); };
mm("Apple Watch Series 10", "Apple Watch Series 10", true);
mm("Apple Watch Series 1", "Apple Watch Series 10", false);
mm("Apple Watch Series 1", "Apple Watch Series 11", false);
mm("Apple Watch Series 1", "Apple Watch Series 12", false);
mm("Apple Watch Series 10", "Apple Watch Series 1", false);
mm("Apple Watch Series 11", "Apple Watch Series 10", false);
mm("Apple Watch Ultra", "Apple Watch Ultra 2", false);
mm("Apple Watch Ultra 2", "Apple Watch Ultra", false);
mm("Apple Watch Ultra", "Apple Watch Ultra", true);
mm("Apple Watch SE（第1世代）", "Apple Watch SE 3", false);
mm("Apple Watch SE 3", "Apple Watch SE（第1世代）", false);
mm("Apple Watch SE（第2世代）", "Apple Watch SE（第1世代）", false);
mm("Apple Watch SE（第2世代）", "Apple Watch SE（第2世代）", true);
mm("Apple Watch SE 3", "Apple Watch SE 3", true);
mm("Apple Watch Series 9", "iPhone 9", false);
mm("iPhone 9", "Apple Watch Series 9", false);
mm("iPhone 13", "Apple Watch Series 10", false);
mm("iPhone SE (第3世代)", "Apple Watch SE 3", false);
mm("iPad (第9世代)", "Apple Watch Series 9", false);
mm("MacBook Air M1", "Apple Watch Series 9", false);
mm("Apple Watch Series 9", "MacBook Air M1", false);
mm("Galaxy S24", "Apple Watch Series 9", false);
// 正式名でない検索は、語がまるごと含まれる機種（「Series 1」は Series 10 に当たらない）
mm("Apple Watch", "Apple Watch Series 10", true);
mm("Apple Watch", "Apple Watch SE 3", true);
mm("Apple Watch Series", "Apple Watch Ultra 2", false);
mm("Apple Watch SE", "Apple Watch SE（第2世代）", true);
mm("Apple Watch SE", "Apple Watch Series 10", false);
// 既存の照合が変わらない
mm("iPhone 15", "iPhone 15", true);
mm("iPhone 15", "iPhone 15 Pro", false);
mm("iPhone SE (第3世代)", "iPhone SE (第3世代)", true);
mm("Pixel 9", "Pixel 9a", false);

// --- カタログの整合 ---
for (const m of WATCH_MODELS) {
  if (!WATCH_INFO[m]) ng(`WATCH_INFO にない機種: ${m}`);
}
if (new Set(WATCH_MODELS).size !== WATCH_MODELS.length) ng("WATCH_MODELS に重複がある");
for (const k of Object.keys(WATCH_INFO)) if (!WATCH_MODELS.includes(k)) ng(`WATCH_CATALOG にない機種が WATCH_INFO にある: ${k}`);
const aNumbers = new Map<string, string>();
for (const [m, i] of Object.entries(WATCH_INFO)) {
  for (const a of [...i.gps, ...i.cell]) {
    if (!/^A\d{4}$/.test(a)) ng(`モデル番号の形が違う: ${m} ${a}`);
    const prev = aNumbers.get(a);
    if (prev) ng(`モデル番号 ${a} が別の機種で重複: ${prev} / ${m}`);
    aNumbers.set(a, m);
  }
  if (i.cellularOnly && i.gps.length > 0) ng(`Ultra なのに GPS の番号がある: ${m}`);
  if (i.cell.length === 0) ng(`Cellular の番号がない: ${m}`);
}
// 公式の表の機種数（Series 6〜12 の7・Ultra 4・SE 3）と、watchOS 27 対応（SE 3・Series 9〜12・Ultra 2〜4）
if (WATCH_MODELS.length !== 14) ng(`機種数が想定（14）と違う: ${WATCH_MODELS.length}`);
const supported = WATCH_MODELS.filter(isWatchOS27).sort().join(",");
const wantSupported = [SE3, "Apple Watch Series 9", S10, "Apple Watch Series 11", "Apple Watch Series 12", "Apple Watch Ultra 2", "Apple Watch Ultra 3", "Apple Watch Ultra 4"].sort().join(",");
if (supported !== wantSupported) ng(`watchOS 27 対応の機種が公式と違う: ${supported}`);
for (const m of [SE2, SE1, "Apple Watch Series 8", "Apple Watch Series 7", "Apple Watch Series 6", "Apple Watch Ultra"]) if (isWatchOS27(m)) ng(`watchOS 27 非対応のはずが対応になっている: ${m}`);
const sizes: Record<string, string> = {
  "Apple Watch Series 12": "42,46", "Apple Watch Ultra 4": "49", "Apple Watch Series 11": "42,46", [SE3]: "40,44", "Apple Watch Ultra 3": "49", [S10]: "42,46",
  "Apple Watch Ultra 2": "49", "Apple Watch Series 9": "41,45", "Apple Watch Ultra": "49", "Apple Watch Series 8": "41,45", [SE2]: "40,44",
  "Apple Watch Series 7": "41,45", "Apple Watch Series 6": "40,44", [SE1]: "40,44",
};
for (const [m, s] of Object.entries(sizes)) if (WATCH_INFO[m]?.sizes.join(",") !== s) ng(`サイズが公式と違う: ${m} ${WATCH_INFO[m]?.sizes.join(",")}`);

// --- スラッグ・ページ ---
const slugs = WATCH_MODELS.map(modelToSlug);
if (new Set(slugs).size !== slugs.length) ng("Apple Watch のスラッグが重複");
for (const [m, s] of WATCH_MODELS.map((m, i) => [m, slugs[i]])) if (!/^apple-watch-[a-z0-9-]+$/.test(s)) ng(`スラッグが妥当でない: ${m} → ${s}`);
const existing = new Set(ALL_DEVICE_PAGE_MODELS.filter((m) => !WATCH_MODELS.includes(m)).map(modelToSlug));
for (const s of slugs) if (existing.has(s)) ng(`既存ページとスラッグが重複: ${s}`);
const slugOf: Record<string, string> = { [S10]: "apple-watch-series-10", "Apple Watch Ultra 2": "apple-watch-ultra-2", "Apple Watch Ultra": "apple-watch-ultra", [SE3]: "apple-watch-se-3", [SE2]: "apple-watch-se-2", [SE1]: "apple-watch-se-1" };
for (const [m, s] of Object.entries(slugOf)) if (modelToSlug(m) !== s) ng(`スラッグが想定と違う: ${m} → ${modelToSlug(m)}（期待 ${s}）`);
for (const m of WATCH_MODELS) {
  if (!ALL_DEVICE_PAGE_MODELS.includes(m)) ng(`ALL_DEVICE_PAGE_MODELS にない: ${m}`);
  if (deviceOf(m) !== "watch") ng(`deviceOf が watch でない: ${m}`);
  if (modelPagePath(m) !== `/watch/${modelToSlug(m)}`) ng(`パスが想定と違う: ${m}`);
  if (slugToModel(modelToSlug(m)) !== m) ng(`slugToModel で戻らない: ${m}`);
  if (siblingModels(m).some((s) => !WATCH_MODELS.includes(s))) ng(`同じシリーズに Apple Watch 以外がある: ${m}`);
  if (shopsFor(m) !== WATCH_SHOPS) ng(`shopsFor が WATCH_SHOPS でない: ${m}`);
}
for (const s of WATCH_CATALOG) if (s.models.length === 0) ng(`空のシリーズ: ${s.series}`);
if (WATCH_SHOPS.map((s) => s.label).join("・") !== "イオシス・じゃんぱら・ゲオモバイル・ソフマップ・ニューズドテック") ng(`Apple Watch を扱う店が想定と違う: ${WATCH_SHOPS.map((s) => s.label).join("・")}`);
if (deviceOf("iPhone 15") !== "iphone" || deviceOf("iPad Air (M2)") !== "ipad" || deviceOf("MacBook Air M1") !== "mac" || deviceOf("Galaxy S24") !== "galaxy") ng("deviceOf が既存機種で変わった");

// --- 表示（storage を mm にする分岐は Watch のときだけ）---
if (storageLabel(46, "Apple Watch Series 10") !== "46mm") ng("Watch のサイズ表示が mm でない");
if (storageLabel(256) !== "256GB" || storageLabel(1024) !== "1TB" || storageLabel(1024, "MacBook Air M1") !== "1TB" || storageLabel(256, "iPhone 15") !== "256GB") ng("Watch 以外の容量表示が変わった");

console.log(fail === 0 ? `OK（${PARSE.length}件・${WATCH_MODELS.length}機種）` : `${fail}件の違い`);
process.exit(fail === 0 ? 0 : 1);
