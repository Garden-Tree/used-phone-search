/**
 * Mac デスクトップ（Mac mini・iMac・Mac Studio）の機種名・メモリ・SSD の読み取りの回帰テスト（npm run test:mac-desktop。違いがあれば exit 1）
 * 商品名は 2026-11-15 に楽天の公開の店内検索（じゃんぱら・ソフマップ・イオシス）の一覧からコピーしたもの。
 * じゃんぱらの【店名】は一覧の表記のまま。ソフマップは一覧で末尾（〔OS〕【xxx-ud】）を確かめていない行があり、その行は末尾を省いた。
 * model が null の行は「機種を決められない（Intel・iMac Pro・周辺機器）」ことを確かめる（メモリ・SSD は見ない）。
 */
import { MAC_DESKTOP_CATALOG, MAC_DESKTOP_INFO, MAC_DESKTOP_MODELS, MAC_MODELS, canonicalMacDesktopModel, canonicalMacModel, isMacDesktop, parseMacDesktopSpec } from "@/lib/macCatalog";
import { RAKUTEN_SHOPS } from "@/lib/rakutenShops";
import { normalizeIosysMac, normalizeJanparaMac, normalizeSofmapMac } from "@/lib/rakutenMac";
import { matchesModel } from "@/lib/modelMatch";
import { ALL_DEVICE_PAGE_MODELS, deviceOf, modelPagePath, modelToSlug, siblingModels, slugToModel } from "@/lib/catalog";
import { shopsFor, MAC_SHOPS } from "@/lib/shops";
import type { RakutenItem } from "@/lib/rakutenCommon";

type Row = [title: string, model: string | null, memoryGB?: number, ssdGB?: number];

const ROWS: Row[] = [
  // --- じゃんぱら（janpara） ---
  ["【中古】Apple Mac mini M4(CPU:10C/GPU:10C) 16GB/256GB シルバー MU9D3J/A (M4・2024)【ECセンター】保証期間1ヶ月【ランクA】", "Mac mini M4", 16, 256],
  ["【未使用】Apple Mac mini M6(12コアCPU/12コアGPU) 16GB/512GB シルバー MHQL4J/A【秋葉2号】保証期間3ヶ月", "Mac mini M6", 16, 512],
  ["【中古】Apple Mac mini M6(12コアCPU/12コアGPU) 16GB/256GB シルバー MHQK4J/A【東池袋1丁目】保証期間1ヶ月【ランクA】", "Mac mini M6", 16, 256],
  ["【中古】Apple Mac mini M2(CPU:8C/GPU:10C) 8GB/256GB MMFJ3J/A (M2,2023)【ECセンター】保証期間1ヶ月【ランクB】", "Mac mini M2", 8, 256],
  ["【中古】Apple Mac mini M1 (CPU:8C/GPU:8C) 8GB/256GB MGNR3J/A (M1・2020)【ECセンター】保証期間1ヶ月【ランクA】", "Mac mini M1", 8, 256],
  ["【中古】Apple Mac mini M1 (CPU:8C/GPU:8C) 8GB/512GB MGNT3J/A (M1・2020)【ECセンター】保証期間1ヶ月【ランクA】", "Mac mini M1", 8, 512],
  ["【中古】Apple Mac mini M2 Pro(CPU:10C/GPU16C) 16GB/512GB MNH73J/A (M2,2023)【ECセンター】保証期間1ヶ月【ランクA】", "Mac mini M2 Pro", 16, 512],
  ["【中古】Apple Mac mini M2(CPU:8C/GPU:10C) 8GB/512GB MMFK3J/A (M2,2023)【千葉】保証期間1ヶ月【ランクA】", "Mac mini M2", 8, 512],
  // CTO: 部品番号なし。「(M4,2024)」の後ろの「M4 Pro」を採る
  ["【中古】Apple Mac mini CTO (M4,2024) M4(CPU:10C/GPU:10C)/16G/1T/1GbE【仙台イービーンズ】保証期間1ヶ月【ランクA】", "Mac mini M4", 16, 1024],
  ["【未使用】Apple Mac mini CTO (M4,2024) M4(CPU:10C/GPU:10C)/16G/512G/10GbE【池袋東口】保証期間3ヶ月", "Mac mini M4", 16, 512],
  ["【中古】Apple Mac mini CTO (M4,2024) M4 Pro(CPU:14C/GPU:20C)/24G/512G/1GbE【池袋東口】保証期間1ヶ月【ランクA】", "Mac mini M4 Pro", 24, 512],
  ["【中古】Apple Mac mini CTO（M2,2023) M2 Pro(CPU:10C/GPU:16C)/16G/1T/1GbE【ECセンター】保証期間1ヶ月【ランクA】", "Mac mini M2 Pro", 16, 1024],
  ["【中古】Apple Mac mini CTO（M2,2023) M2(CPU:8C/GPU10C)/8G/1T/1GbE【大須2】保証期間1ヶ月【ランクB】", "Mac mini M2", 8, 1024],
  // MU9E3・MCYT4 は M4、MCX44 は M4 Pro（表は2つを分けていないので商品名のチップ）
  ["【中古】Apple Mac mini M4(CPU:10C/GPU:10C) 16GB/512GB シルバー MU9E3J/A (M4・2024)【大阪本店】保証期間1ヶ月【ランクA】", "Mac mini M4", 16, 512],
  ["【中古】Apple Mac mini M4(CPU:10C/GPU:10C) 24GB/512GB シルバー MCYT4J/A (M4・2024)【ECセンター】保証期間1ヶ月【ランクA】", "Mac mini M4", 24, 512],
  ["【中古】Apple Mac mini M4 Pro(CPU:12C/GPU:16C) 24GB/512GB シルバー MCX44J/A (M4・2024)【熊本】保証期間1ヶ月【ランクA】", "Mac mini M4 Pro", 24, 512],
  ["【中古】Apple iMac 24インチ 4.5K Retinaディスプレイ M1(CPU:8C/GPU:8C) 8GB/512GB ブルー MGPL3J/A (M1・2021)【ECセンター】保証期間1ヶ月【ランクA】", "iMac M1", 8, 512],
  ["【中古】Apple iMac 24インチ 4.5K Retinaディスプレイ M1(CPU:8C/GPU:8C) 8GB/256GB イエロー MGPK3J/A (M1・2021)【ECセンター】保証期間1ヶ月【ランクA】", "iMac M1", 8, 256],
  ["【中古】Apple iMac 24インチ CTO (M1・2021) グリーン M1(CPU:8C/GPU:8C)/16G/1T/TouchID搭載KB【ECセンター】保証期間1ヶ月【ランクA】", "iMac M1", 16, 1024],
  ["【中古】Apple iMac 24インチ CTO (M1・2021) シルバー M1(CPU:8C/GPU:7C)/8G/1T/1GbE(AC)/TouchID搭載KB(10キー付)【ECセンター】保証期間1ヶ月【ランクA】", "iMac M1", 8, 1024],
  ["【中古】Apple iMac 24インチ CTO (24インチ, 2024, 4ポート) M4(CPU:10C/GPU:10C)/24G/512G/Magic Mouse/TouchID搭載KB Nano-textureディスプレイ【ECセンター】保証期間1ヶ月【ランクA】", "iMac M4", 24, 512],
  ["【中古】Apple iMac 24インチ CTO (24インチ, 2024, 4ポート) M4(CPU:10C/GPU:10C)/32G/1T/Magic Mouse/TouchID搭載KB Nano-textureディスプレイ【ECセンター】保証期間1ヶ月【ランクA】", "iMac M4", 32, 1024],
  ["【中古】Apple Mac Studio CTO (2022) M1 Max(CPU:10C/GPU:24C)/32G/1T【ECセンター】保証期間1ヶ月【ランクA】", "Mac Studio M1 Max", 32, 1024],
  // Intel・iMac Pro・周辺機器
  ["【中古】Apple Mac mini 256GB MXNF2J/A (2018/2020)【府中ル・シーニュ】保証期間1ヶ月【ランクB】", null],
  ["【中古】Apple Mac mini CTO (Late 2014) Core i5(2.8G)/8G/1T(Fusion)/Intel Iris Graphics【川崎駅前】保証期間1ヶ月【ランクB】", null],
  ["【中古】Apple Mac mini CTO (Late 2018) Core i7(3.2G)/16G/128G(SSD)/Intel UHD 630【仙台イービーンズ】保証期間1ヶ月【ランクB】", null],
  ["【中古】Apple iMac 21.5インチ Retina 4Kディスプレイモデル MNDY2J/A (Mid 2017)【ECセンター】保証期間1ヶ月【ランクB】", null],
  ["【中古】Apple iMac 27インチ Retina 5Kディスプレイモデル MNEA2J/A (Mid 2017)【ECセンター】保証期間1ヶ月【ランクB】", null],
  ["【中古】Apple iMac Pro CTO (2017) Xeon W(3.0G/10C)/64G/1T(SSD)/Radeon Pro Vega 64【ECセンター】保証期間1ヶ月【ランクB】", null],
  ["【中古】UGREEN CM841-65847　Mac mini M4用 11-in-1 USB-Cドッキングステーション【ECセンター】保証期間1ヶ月【ランクA】", null],
  ["【中古】ORICO MiniLink Mac mini M4対応ドッキングステーション M47P【ECセンター】保証期間1ヶ月【ランクA】", null],
  ["【中古】Logicool MX MECHANICAL MINI for Mac Minimalist Wireless Illuminated Keyboard KX850MSG【川崎】保証期間1ヶ月【ランクA】", null],
  ["【中古】Logicool MX KEYS MINI for Mac KX700MSG [スペースグレー]【川崎】保証期間1ヶ月【ランクA】", null],

  // --- ソフマップ（akiba-u-shop） ---
  ["【中古】Apple(アップル) 〔展示品〕 Mac mini Late-2024 MU9D3J／A Apple M4 10コアCPU_10コアGPU 16GB SSD256GB シルバー 〔26.3 Tahoe〕", "Mac mini M4", 16, 256],
  ["【中古】Apple(アップル) Mac mini Late-2020 MGNR3J／A Apple M1 8コアCPU_8コアGPU 8GB SSD256GB 〔macOS v26.7.1〕", "Mac mini M1", 8, 256],
  ["【中古】Apple(アップル) Mac mini Late-2020 MGNR3J／A Apple M1 8コアCPU_8コアGPU 16GB SSD256GB 〔14.8 Sonoma〕", "Mac mini M1", 16, 256],
  ["【中古】Apple(アップル) Mac mini Late-2026 MHQM4J／A Apple M6 12コアCPU_12コアGPU 24GB SSD512GB シルバー 〔27.0 Golden Gate〕", "Mac mini M6", 24, 512],
  ["【中古】Apple(アップル) Mac mini Early-2023 MMFJ3J／A Apple M2 8コアCPU_10コアGPU 8GB SSD256GB シルバー 〔macOS v26.7.1〕", "Mac mini M2", 8, 256],
  ["【中古】Apple(アップル) Mac mini Late-2020 MGNT3J／A Apple M1 8コアCPU_8コアGPU 16GB SSD1TB シルバー", "Mac mini M1", 16, 1024],
  ["【中古】Apple(アップル) Mac mini Early-2023 MNH73J／A Apple M2 Pro 10コアCPU_16コアGPU 16GB SSD512GB シルバー", "Mac mini M2 Pro", 16, 512],
  ["【中古】Apple(アップル) Mac mini Late-2024 MCX44J／A Apple M4 Pro 12コアCPU_16コアGPU 24GB SSD512GB シルバー", "Mac mini M4 Pro", 24, 512],
  ["【中古】Apple(アップル) Mac mini Late-2024 MCX44J／A Apple M4 Pro 14コアCPU_20コアGPU 24GB SSD512GB シルバー", "Mac mini M4 Pro", 24, 512],
  ["【中古】Apple(アップル) Mac mini Late-2024 MCYT4J／A Apple M4 10コアCPU_10コアGPU 24GB SSD512GB シルバー", "Mac mini M4", 24, 512],
  ["【中古】Apple(アップル) iMac 24-inch Late-2024 MD3H4J／A Apple M4 10コアCPU_10コアGPU 16GB SSD256GB シルバー", "iMac M4", 16, 256],
  ["【中古】Apple(アップル) iMac 24-inch Late-2024 MWUV3J／A Apple M4 10コアCPU_10コアGPU 16GB SSD512GB シルバー", "iMac M4", 16, 512],
  ["【中古】Apple(アップル) iMac VESAマウント 24-inch Late-2024 MWUC3J／A Apple M4 8コアCPU_8コアGPU 16GB SSD256GB シルバー", "iMac M4", 16, 256],
  // CTO（Z13100057・Z133）は部品番号の形でない → 商品名の種類とチップ
  ["【中古】Apple(アップル) iMac VESAマウント 24-inch Mid-2021 Z13100057 Apple M1 8コアCPU_8コアGPU 16GB SSD512GB パープル", "iMac M1", 16, 512],
  ["【中古】Apple(アップル) iMac VESAマウント 24-inch Mid-2021 Z133 Apple M1 8コアCPU_8コアGPU 16GB SSD2TB オレンジ", "iMac M1", 16, 2048],
  ["【中古】Apple(アップル) Mac Studio Early-2025 MU963J／A Apple M4 Max 14コアCPU_32コアGPU 36GB SSD512GB シルバー", "Mac Studio M4 Max", 36, 512],
  ["【中古】Apple(アップル) 〔展示品〕 Mac Studio Early-2025 MU963J／A Apple M4 Max 14コアCPU_32コアGPU 36GB SSD512GB シルバー", "Mac Studio M4 Max", 36, 512],
  ["【中古】Apple(アップル) Mac mini Late-2012 MD387J／A Core_i5 2.5GHz 4GB HDD500GB 〔10.15 Catalina〕", null],
  ["【中古】Apple(アップル) iMac Pro 27-inch Late-2017 MQ2Y2J／A Xeon_W 3.2GHz 32GB SSD2TB", null],

  // --- イオシス（pc-good） ---
  ["中古パソコン Mac mini MGNR3J/A Late 2020【Apple M1/16GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス", "Mac mini M1", 16, 256],
  ["中古パソコン Mac mini MU9D3J/A Late 2024【Apple M4/16GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス", "Mac mini M4", 16, 256],
  ["中古パソコン Mac mini MCX44J/A Late 2024【Apple M4 Pro/24GB/512GB SSD】 Apple 当社6ヶ月保証 イオシス", "Mac mini M4 Pro", 24, 512],
  // F で始まる整備品 → M に読み替え
  ["中古パソコン Mac mini FU9D3J/A Late 2024【Apple M4/16GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス", "Mac mini M4", 16, 256],
  ["中古パソコン Mac mini FMFK3J/A Early 2023【Apple M2/8GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス", "Mac mini M2", 8, 512],
  ["中古パソコン Mac mini MNH73J/A Early 2023【Apple M2 Pro/16GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス", "Mac mini M2 Pro", 16, 512],
  // 米国版（LL/A）は部品番号の形にならない → 商品名の種類とチップ
  ["中古パソコン Mac mini MU9D3LL/A Late 2024【Apple M4/16GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス", "Mac mini M4", 16, 256],
  ["Logicool Logicool MX KEYS MINI for Mac KX700MSG スペースグレー【日本語配列】 [中古] 【当社1ヶ月間保証】 イオシス", null],
  ["Apple AirPods Max スペースグレイ MGYH3J/A [中古] 【当社1ヶ月間保証】 イオシス", null],
];

// 公式の表にある値の想定（手で作った例。商品名にない組み合わせの読み取り）
const SYNTH: Row[] = [
  // Mac Studio の Ultra（メモリ 192GB・512GB）
  ["中古パソコン Mac Studio MQH63J/A Mid 2023【Apple M2 Ultra/192GB/2TB SSD】 Apple 当社3ヶ月間保証 イオシス", "Mac Studio M2 Ultra", 192, 2048],
  ["中古パソコン Mac Studio MU973J/A Early 2025【Apple M3 Ultra/512GB/4TB SSD】 Apple 当社3ヶ月間保証 イオシス", "Mac Studio M3 Ultra", 512, 4096],
  ["中古パソコン Mac Studio MJMV2J/A Early 2022【Apple M1 Max/32GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス", "Mac Studio M1 Max", 32, 512],
  ["中古パソコン iMac 24インチ MQRK3J/A Late 2023 ブルー【Apple M3/8GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス", "iMac M3", 8, 256],
  // 部品番号の種類と商品名の種類が食い違う（iMac の番号で Mac mini）→ 決めない
  ["中古パソコン Mac mini MQRK3J/A Late 2023【Apple M3/8GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス", null],
  // M4／M4 Pro の表でチップが書かれていない → 決めない
  ["中古パソコン Mac mini MDAP4J/A Late 2024【16GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス", null],
];

let fail = 0;
const ng = (msg: string) => { fail++; console.log(`NG ${msg}`); };

for (const [title, want, mem, ssd] of [...ROWS, ...SYNTH]) {
  const got = canonicalMacDesktopModel(title);
  if (got !== want) { ng(`機種: ${title}\n   期待=${want} 結果=${got}`); continue; }
  if (want === null) continue;
  const spec = parseMacDesktopSpec(title);
  if (spec.memoryGB !== mem || spec.ssdGB !== ssd) ng(`メモリ/SSD: ${title}\n   期待=${mem}/${ssd} 結果=${spec.memoryGB}/${spec.ssdGB}`);
  // MacBook の読み取りには当たらない
  if (canonicalMacModel(title) !== null) ng(`MacBook として読まれた: ${title}`);
}
// MacBook の商品名はデスクトップにならない
for (const t of [
  "【中古】Apple MacBook Air 13インチ M2(CPU:8C/GPU:8C) 16GB/256GB スペースグレイ MC7U4J/A (M2,2022)【ECセンター】保証期間１ヶ月【ランクA】",
  "中古パソコン MacBook Air 13インチ MDHA4J/A Early 2026 スターライト【Apple M5/16GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス",
]) if (canonicalMacDesktopModel(t) !== null) ng(`MacBook がデスクトップになった: ${t}`);

// --- カタログ ---
const set = new Set(MAC_DESKTOP_MODELS);
if (set.size !== MAC_DESKTOP_MODELS.length) ng("MAC_DESKTOP_MODELS に重複がある");
for (const m of MAC_DESKTOP_MODELS) {
  if (!MAC_DESKTOP_INFO[m]) ng(`MAC_DESKTOP_INFO にない: ${m}`);
  if (!isMacDesktop(m)) ng(`isMacDesktop が false: ${m}`);
  if (!ALL_DEVICE_PAGE_MODELS.includes(m)) ng(`ALL_DEVICE_PAGE_MODELS にない: ${m}`);
  if (deviceOf(m) !== "mac") ng(`deviceOf が mac でない: ${m}`);
  if (modelPagePath(m) !== `/mac/${modelToSlug(m)}`) ng(`パスが想定と違う: ${m}`);
  if (slugToModel(modelToSlug(m)) !== m) ng(`slugToModel で戻らない: ${m}`);
  if (siblingModels(m).some((s) => !isMacDesktop(s) || s.split(" M")[0] !== m.split(" M")[0])) ng(`同じシリーズに別の種類がある: ${m}`);
  if (shopsFor(m).some((s) => !MAC_SHOPS.includes(s))) ng(`店の一覧に Mac 以外の店: ${m}`);
}
for (const k of Object.keys(MAC_DESKTOP_INFO)) if (!set.has(k)) ng(`カタログにない機種が MAC_DESKTOP_INFO にある: ${k}`);
const slugs = ALL_DEVICE_PAGE_MODELS.map(modelToSlug);
if (new Set(slugs).size !== slugs.length) ng("全機種のスラッグが重複");
if (MAC_DESKTOP_MODELS.some((m) => MAC_MODELS.includes(m))) ng("MacBook とデスクトップが重なる");
const want = { "Mac mini": 7, iMac: 4, "Mac Studio": 8 };
for (const s of MAC_DESKTOP_CATALOG) if (s.models.length !== want[s.series as keyof typeof want]) ng(`${s.series} の機種数 ${s.models.length}`);
if (modelToSlug("Mac mini M4 Pro") !== "mac-mini-m4-pro" || modelToSlug("iMac M3") !== "imac-m3" || modelToSlug("Mac Studio M2 Ultra") !== "mac-studio-m2-ultra") ng("スラッグの形が想定と違う");

// --- 行（lib/rakutenMac.ts）とルーティング（lib/rakutenShops.ts） ---
const item = (name: string, over: Partial<RakutenItem> = {}): RakutenItem => ({ code: "t", name, price: 99800, url: "https://item.rakuten.co.jp/x/y/", rank: null, nw: null, ...over });
const JAN = ROWS[0][0];
const jr = normalizeJanparaMac(item(JAN));
if (jr?.modelName !== "Mac mini M4" || jr.memoryGB !== 16 || jr.storage !== 256 || jr.conditionRank !== "A" || jr.color !== "シルバー") ng(`じゃんぱらの行: ${JSON.stringify(jr)}`);
const jcto = normalizeJanparaMac(item(ROWS[18][0]));
if (jcto?.modelName !== "iMac M1" || jcto.color !== "グリーン") ng(`じゃんぱら CTO の色: ${JSON.stringify(jcto)}`);
const sr = normalizeSofmapMac(item("【中古】Apple(アップル) Mac mini Late-2020 MGNT3J／A Apple M1 8コアCPU_8コアGPU 16GB SSD1TB シルバー", { rank: "B" }));
if (sr?.modelName !== "Mac mini M1" || sr.storage !== 1024 || sr.conditionRank !== "B" || sr.color !== "シルバー") ng(`ソフマップの行: ${JSON.stringify(sr)}`);
const ir = normalizeIosysMac(item(ROWS.find((r) => r[0].startsWith("中古パソコン Mac mini MCX44"))![0], { rank: "A" }));
if (ir?.modelName !== "Mac mini M4 Pro" || ir.memoryGB !== 24 || ir.storage !== 512 || ir.conditionRank !== "A") ng(`イオシスの行: ${JSON.stringify(ir)}`);
// iMac の「スタンド」は MacBook 用のアクセサリ判定に当てない
const stand = normalizeIosysMac(item("中古パソコン iMac 24インチ MQRK3J/A Late 2023 ブルー スタンド付き【Apple M3/8GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス"));
if (stand?.modelName !== "iMac M3") ng(`iMac のスタンドで落ちた: ${JSON.stringify(stand)}`);

const route = (shop: string, it: RakutenItem) => RAKUTEN_SHOPS[shop].normalize(it);
if (route("janpara", item(JAN))?.modelName !== "Mac mini M4") ng("route janpara");
if (route("akiba-u-shop", item(ROWS.find((r) => r[0].includes("MD3H4"))![0]))?.modelName !== "iMac M4") ng("route akiba-u-shop");
if (route("pc-good", item(ROWS.find((r) => r[0].includes("FU9D3"))![0]))?.modelName !== "Mac mini M4") ng("route pc-good");
// ゲオは Mac を取らない（今までどおり）
if (route("geo-mobile", item("【中古】【安心保証】 Mac mini 2024年 MU9D3J/A")) !== null) ng("ゲオの Mac mini が行になった");
// 周辺機器は行にならない（ほかの読み取りにも回らない）
for (const t of ["【中古】Logicool MX KEYS MINI for Mac KX700MSG [スペースグレー]【川崎】保証期間1ヶ月【ランクA】", "【中古】UGREEN CM841-65847　Mac mini M4用 11-in-1 USB-Cドッキングステーション【ECセンター】保証期間1ヶ月【ランクA】"]) {
  if (route("janpara", item(t)) !== null) ng(`周辺機器が行になった: ${t}`);
}
// iPhone のルーティングは変わらない
const iphone = route("janpara", item("【中古】Apple 国内版 【SIMフリー】 iPhone 16 Pro Max 256GB デザートチタニウム【ECセンター】保証期間1ヶ月【ランクB】"));
if (iphone?.modelName !== "iPhone 16 Pro Max") ng(`iPhone のルーティングが変わった: ${JSON.stringify(iphone)}`);

// --- 機種照合 ---
const mm = (q: string, name: string, w: boolean) => { if (matchesModel(q, name) !== w) ng(`matchesModel("${q}", "${name}") は ${w} のはず`); };
mm("Mac mini M4", "Mac mini M4", true);
mm("Mac mini M4", "Mac mini M4 Pro", false);
mm("Mac mini", "Mac mini M4 Pro", true);
mm("Mac mini", "Mac Studio M4 Max", false);
mm("iMac", "iMac M3", true);
mm("iMac M3", "iMac M4", false);
mm("Mac Studio M2 Max", "Mac Studio M2 Ultra", false);
mm("MacBook Air 13インチ M2", "Mac mini M2", false);
mm("Mac mini M2", "MacBook Air 13インチ M2", false);
mm("iPhone 13", "iMac M1", false);
mm("iMac M1", "iPhone 13", false);
mm("iPad Air (M2)", "iMac M1", false);

console.log(fail === 0 ? `OK（${ROWS.length + SYNTH.length}件・${MAC_DESKTOP_MODELS.length}機種）` : `${fail}件の違い`);
process.exit(fail === 0 ? 0 : 1);
