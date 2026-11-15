/**
 * motorola・arrows の機種名・容量・キャリア・色の読み取りの回帰テスト（npm run test:motorola-arrows。違いがあれば exit 1）。2026-11-15〜
 *
 * 1. ROWS: 手で期待値を書いた表（店ごとの書き方・誤爆しやすい名前）
 * 2. 楽天4店の実際の商品名（2026-11-15 の店内検索。店内の表記ゆれだけ違う重複は1件に。scripts/fixtures/rakuten-motorola-arrows-titles.json）を全部読ませて、
 *    取れた件数・取れなかった件数（理由別）を出す。カタログ外の機種（moto g8・g50・edge X30 など）・arrows ケータイ・Tab が行にならないことも確かめる
 * 3. カタログの整合（型番 → 機種・スラッグ・種類・店）と、検索の機種照合
 */
import fs from "node:fs";
import path from "node:path";
import { RAKUTEN_SHOPS } from "@/lib/rakutenShops";
import { MOTOROLA_CATALOG, MOTOROLA_INFO, MOTOROLA_MODELS, MOTOROLA_SPECS, MOTOROLA_STORAGE_ANY, MOTOROLA_STORAGE_SIMFREE, canonicalMotorolaModel } from "@/lib/motorolaCatalog";
import { ARROWS_CATALOG, ARROWS_CODE_STORAGE, ARROWS_INFO, ARROWS_MODELS, ARROWS_SPECS, canonicalArrowsModel } from "@/lib/arrowsCatalog";
import { XPERIA_INFO } from "@/lib/xperiaCatalog";
import { AQUOS_INFO } from "@/lib/aquosCatalog";
import { OPPO_INFO } from "@/lib/oppoCatalog";
import { XIAOMI_INFO } from "@/lib/xiaomiCatalog";
import { codeKey } from "@/lib/androidCommon";
import { androidInfoOf, codeRows, releasedSentence, supportSentence, updateRows } from "@/lib/androidInfo";
import { compareSpecOf } from "@/lib/androidSpecs";
import { specOf } from "@/lib/iphoneSpecs";
import { matchesModel } from "@/lib/modelMatch";
import { ALL_DEVICE_PAGE_MODELS, DEVICE_HUB, deviceOf, modelPagePath, modelToSlug, siblingModels, slugToModel } from "@/lib/catalog";
import { shopsFor } from "@/lib/shops";

let failures = 0;
const ng = (msg: string) => { failures++; console.log(`NG ${msg}`); };

type Want = { model: string; storage: number; carrier: string | null; rank: string; color: string; battery?: number | null; sim?: boolean };
// [店の shopCode, 商品名, fetch.php が送る rank, batt, 期待（null は行にしない）]
type Row = [shop: string, name: string, rank: string | null, batt: number | null, want: Want | null];

const ROWS: Row[] = [
  // --- ゲオ（geo-mobile）。容量は "[256G]"・"[128GB/8GB]"・"[128GB ]" ---
  ["geo-mobile", "【中古】【安心保証】 motorola razr 50s[256G] SoftBank コアラグレイ", "B", null,
    { model: "motorola razr 50s", storage: 256, carrier: "SoftBank", rank: "B", color: "コアラグレイ", battery: null, sim: true }],
  ["geo-mobile", "【中古】【安心保証】 MOTOROLA moto g05[128GB/8GB] SIMフリー ミスティブルー", "A", null,
    { model: "motorola moto g05", storage: 128, carrier: "国内版", rank: "A", color: "ミスティブルー", sim: true }],
  ["geo-mobile", "【中古】【安心保証】 motorola razr 60d M-51F[256G] docomo ライトスカイホワイト", "A", null,
    { model: "motorola razr 60d", storage: 256, carrier: "docomo", rank: "A", color: "ライトスカイホワイト", sim: true }],
  // 発売日が公式で確かめられていない機種で「SIMフリー」の記載がない → SIM ロックありとして扱う（推測でフリーにしない）
  ["geo-mobile", "【中古】【安心保証】 motorola edge 60[128GB] UQモバイル ジブラルタルシーネイビー", "B", null,
    { model: "motorola edge 60", storage: 128, carrier: "au", rank: "B", color: "ジブラルタルシーネイビー", sim: false }],
  ["geo-mobile", "【中古】【安心保証】 SIMフリー moto g100[128GB] (5G) イリディセントスカイ", "B", null,
    { model: "motorola moto g100", storage: 128, carrier: "国内版", rank: "B", color: "イリディセントスカイ", sim: true }],
  ["geo-mobile", "【中古】【安心保証】 SIMフリー edge 20fusion[128G] エレキグラファイト", "B", null,
    { model: "motorola edge 20 fusion", storage: 128, carrier: "国内版", rank: "B", color: "エレキグラファイト" }],
  ["geo-mobile", "【中古】【安心保証】 SIMフリー edge 20[128G] フロストオニキス", "B", null,
    { model: "motorola edge 20", storage: 128, carrier: "国内版", rank: "B", color: "フロストオニキス" }],
  ["geo-mobile", "【中古】【安心保証】 MOTOROLA moto g32 XT2235-3[128GB] SIMフリー サテンシルバー mineo版", "B", null,
    { model: "motorola moto g32", storage: 128, carrier: "国内版", rank: "B", color: "サテンシルバー" }],
  ["geo-mobile", "【中古】【安心保証】 moto g52j 5G SPECIAL XT2219-1[256GB/8GB] SIMフリー パールホワイト", "B", null,
    { model: "motorola moto g52j 5G", storage: 256, carrier: "国内版", rank: "B", color: "パールホワイト" }],
  ["geo-mobile", "【中古】【安心保証】 moto g66y 5G A501MO[128GB] Y!mobile グレーミスト", "B", null,
    { model: "motorola moto g66y 5G", storage: 128, carrier: "SoftBank", rank: "B", color: "グレーミスト", sim: true }],
  ["geo-mobile", "【中古】【安心保証】 moto g37j XT2625-9[64GB] 楽天モバイル インペネトラブルグレイ", "B", null,
    { model: "motorola moto g37j", storage: 64, carrier: "楽天モバイル", rank: "B", color: "インペネトラブルグレイ" }],
  ["geo-mobile", "【中古】【安心保証】 motorola razr 60 ultra[512G] au スカラベグリーン", "B", null,
    { model: "motorola razr 60 ultra", storage: 512, carrier: "au", rank: "B", color: "スカラベグリーン" }],
  ["geo-mobile", "【中古】【安心保証】 arrows 5G F-51A[128GB ] docomo チタニウムシルバー", "C", null,
    { model: "arrows 5G", storage: 128, carrier: "docomo", rank: "C", color: "チタニウムシルバー" }],
  ["geo-mobile", "【中古】【安心保証】 arrows We2 Plus M06[256GB/8GB] 楽天モバイル スレートグレイ", "A", null,
    { model: "arrows We2 Plus", storage: 256, carrier: "楽天モバイル", rank: "A", color: "スレートグレイ", sim: true }],
  ["geo-mobile", "【中古】【安心保証】 arrows Alpha2 M10[512GB] SIMフリー レッド", "A", null,
    { model: "arrows Alpha2", storage: 512, carrier: "国内版", rank: "A", color: "レッド" }],
  ["geo-mobile", "【中古】【安心保証】 arrows We A101FC[64GB] SoftBank ターコイズ", "B", null,
    { model: "arrows We", storage: 64, carrier: "SoftBank", rank: "B", color: "ターコイズ", sim: true }],
  // 2021年10月より前の発売（Be4 Plus）で「SIMフリー」の記載がない → SIM ロックあり
  ["geo-mobile", "【中古】【安心保証】 arrows Be4 Plus F-41B[64GB] docomo ブラック", "B", null,
    { model: "arrows Be4 Plus", storage: 64, carrier: "docomo", rank: "B", color: "ブラック", sim: false }],
  ["geo-mobile", "【中古】【安心保証】 SIMフリー Moto G8[64G] ノイエブルー", "B", null, null],
  ["geo-mobile", "【中古】【安心保証】 SIMフリー moto g50[128G] メテオグレイ", "B", null, null],
  ["geo-mobile", "【中古】【安心保証】 moto g53y 5G[128GB/4GB] Y!mobile インクブラック", "B", null, null],
  ["geo-mobile", "【中古】【安心保証】 arrows Tab F-02K[32GB] docomo ブラック", "B", null, null],
  ["geo-mobile", "【中古】【安心保証】 arrows ケータイ ベーシック F-41C[8GB] docomo ゴールド", "B", null, null],
  // --- じゃんぱら（janpara）。ランクは名前の【ランクA】、未使用は S ---
  ["janpara", "【中古】MOTOROLA 国内版 【SIMフリー】 motorola edge 60 8GB 128GB PANTONE ジブラルタルシーネイビー【ECセンター】保証期間1ヶ月【ランクA】", null, 92,
    { model: "motorola edge 60", storage: 128, carrier: "国内版", rank: "A", color: "ジブラルタルシーネイビー", battery: 92, sim: true }],
  ["janpara", "【未使用】MOTOROLA 楽天モバイル 【SIMフリー】 moto g37j PANTONE Impenetrable(インペネトラブルグレイ) 4GB 64GB XT2625-9【小倉駅前】保証期間3ヶ月", null, null,
    { model: "motorola moto g37j", storage: 64, carrier: "楽天モバイル", rank: "S", color: "インペネトラブルグレイ" }],
  // 容量の書かれていない国内版: SIMフリー版の容量が公式で1つ（g06 は 128GB・razr 60 は 512GB）
  ["janpara", "【未使用】MOTOROLA 国内版 【SIMフリー】 moto g06 PANTONE Laurel Oak(ローレルオーク)【津田沼】保証期間3ヶ月", null, null,
    { model: "motorola moto g06", storage: 128, carrier: "国内版", rank: "S", color: "ローレルオーク" }],
  ["janpara", "【中古】MOTOROLA 国内版 【SIMフリー】 motorola razr 60 ジブラルタルシーネイビー【ECセンター】保証期間1ヶ月【ランクB】", null, null,
    { model: "motorola razr 60", storage: 512, carrier: "国内版", rank: "B", color: "ジブラルタルシーネイビー" }],
  ["janpara", "【未使用】MOTOROLA ymobile 【SIMフリー】 moto g66y 5G PANTONE Black Oyster 4GB 128GB A501MO【日本橋3】保証期間3ヶ月", null, null,
    { model: "motorola moto g66y 5G", storage: 128, carrier: "SoftBank", rank: "S", color: "Black Oyster" }],
  ["janpara", "【中古】MOTOROLA 国内版 【SIMフリー】 motorola razr 60 ultra 16GB 512GB スカラベグリーン PB8U0001JP【スマーク伊勢崎】保証期間1ヶ月【ランクA】", null, null,
    { model: "motorola razr 60 ultra", storage: 512, carrier: "国内版", rank: "A", color: "スカラベグリーン" }],
  ["janpara", "【中古】MOTOROLA mineo 【SIMフリー】 motorola edge 40 neo カリビアンブルー 8GB 256GB【ECセンター】保証期間1ヶ月【ランクA】", null, null,
    { model: "motorola edge 40 neo", storage: 256, carrier: null, rank: "A", color: "カリビアンブルー" }],
  ["janpara", "【中古】MOTOROLA 国内版 【SIMフリー】 moto g52j 5G II インクブラック 8GB 128GB PATM0004JP【川越クレアモール】保証期間1ヶ月【ランクB】", null, null,
    { model: "motorola moto g52j 5G", storage: 128, carrier: "国内版", rank: "B", color: "インクブラック" }],
  ["janpara", "【中古】Fujitsu docomo 【SIMロック解除済み】 arrows Be4 ゴールド 3GB 32GB F-41A【府中ル・シーニュ】保証期間1ヶ月【ランクC】", null, null,
    { model: "arrows Be4", storage: 32, carrier: "docomo", rank: "C", color: "ゴールド", sim: true }],
  ["janpara", "【中古】Fujitsu docomo 【SIMロックあり】 arrows Be4 Plus ホワイト 4GB 64GB F-41B【立川フロム中武】保証期間1ヶ月【ランクB】", null, null,
    { model: "arrows Be4 Plus", storage: 64, carrier: "docomo", rank: "B", color: "ホワイト", sim: false }],
  ["janpara", "【中古】FCNT UQmobile 【SIMフリー】 arrows We2 ライトオレンジ 4GB 64GB FCG02【広島本通】保証期間1ヶ月【ランクC】", null, null,
    { model: "arrows We2", storage: 64, carrier: "au", rank: "C", color: "ライトオレンジ" }],
  ["janpara", "【中古】FCNT 国内版 【SIMフリー】 arrows Alpha2 M10 レッド 8GB 256GB【道玄坂】保証期間1ヶ月【ランクA】", null, null,
    { model: "arrows Alpha2", storage: 256, carrier: "国内版", rank: "A", color: "レッド" }],
  ["janpara", "【中古】FCNT 楽天モバイル 【SIMフリー】 arrows We2 Plus スレートグレイ 8GB 256GB M06【浜松駅前】保証期間1ヶ月【ランクA】", null, null,
    { model: "arrows We2 Plus", storage: 256, carrier: "楽天モバイル", rank: "A", color: "スレートグレイ" }],
  ["janpara", "【中古】MOTOROLA 海外版 【SIMフリー】 moto edge X30 8GB 256GB【札幌】保証期間1ヶ月【ランクA】", null, null, null],
  ["janpara", "【中古】MOTOROLA 国内版 【SIMフリー】 moto g24 アイスグリーン 8GB 128GB PB1A0001JP【三宮駅前】保証期間1ヶ月【ランクA】", null, null, null],
  ["janpara", "【中古】Fujitsu ARROWS Tab EH FAREHT1 ブラック【Celeron N4000 4G 128G(Flash) WiFi 10.1LCD (タッチパネル)】【鹿児島中町】保証期間1ヶ月【ランクB】", null, null, null],
  // --- ソフマップ（akiba-u-shop）。ランク・バッテリーは fetch.php が送る値。キャリアは型番の後ろ ---
  ["akiba-u-shop", "【中古】Motorola(モトローラ) moto g66j 5G 128GB グレーミスト PB810001JP SIMフリー 【198-ud】", "A", 96,
    { model: "motorola moto g66j 5G", storage: 128, carrier: "国内版", rank: "A", color: "グレーミスト", battery: 96 }],
  ["akiba-u-shop", "【中古】Motorola(モトローラ) motorola razr 60 ultra 512GB スカラベグリーン MOG01 au SIMフリー 【349-ud】", "B", null,
    { model: "motorola razr 60 ultra", storage: 512, carrier: "au", rank: "B", color: "スカラベグリーン" }],
  ["akiba-u-shop", "【中古】Motorola(モトローラ) motorola edge 50s pro 256GB リュクスラベンダー MOSAH2 Softbank SIMフリー 【297-ud】", "B", null,
    { model: "motorola edge 50s pro", storage: 256, carrier: "SoftBank", rank: "B", color: "リュクスラベンダー" }],
  ["akiba-u-shop", "【中古】Motorola(モトローラ) moto g37j 64GB カプリシアン XT2625-9 楽天 SIMフリー 【305-ud】", "B", null,
    { model: "motorola moto g37j", storage: 64, carrier: "楽天モバイル", rank: "B", color: "カプリシアン" }],
  ["akiba-u-shop", "【中古】UQMOBILE motorola edge 60 128GB ジブラルタルシーネイビー MOG02 UQ mobile SIMフリー 【198-ud】", "B", null,
    { model: "motorola edge 60", storage: 128, carrier: "au", rank: "B", color: "ジブラルタルシーネイビー" }],
  ["akiba-u-shop", "【中古】ワイモバイル moto g66y 5G 128GB ディルグリーン MOSAL3 Y!mobile SIMフリー 【198-ud】", "B", null,
    { model: "motorola moto g66y 5G", storage: 128, carrier: "SoftBank", rank: "B", color: "ディルグリーン" }],
  ["akiba-u-shop", "【中古】FUJITSU(富士通） arrows Be4 Plus 64GB ブラック F-41B docomoロック解除SIMフリー 【198-ud】", "B", null,
    { model: "arrows Be4 Plus", storage: 64, carrier: "docomo", rank: "B", color: "ブラック", sim: true }],
  ["akiba-u-shop", "【中古】FCNT arrows We2 64GB ミストホワイト SBARW2 Softbank SIMフリー 【295-ud】", "A", null,
    { model: "arrows We2", storage: 64, carrier: "SoftBank", rank: "A", color: "ミストホワイト" }],
  ["akiba-u-shop", "【中古】arrows We3 64GB ブラック M09 楽天 SIMフリー 【377-ud】", "A", null,
    { model: "arrows We3", storage: 64, carrier: "楽天モバイル", rank: "A", color: "ブラック" }],
  // --- イオシス楽天市場店（pc-good）。容量が名前にないものは公式で容量が1つの機種・型番だけ行にする（推測しない） ---
  ["pc-good", "motorola razr60 XT2553-8 ジブラルタルシーネイビー 【国内版SIMフリー】 MOTOROLA 当社3ヶ月間保証 中古 イオシス", "B", null,
    { model: "motorola razr 60", storage: 512, carrier: "国内版", rank: "B", color: "ジブラルタルシーネイビー", battery: 80 }],
  ["pc-good", "motorola razr60d M-51F ライトスカイホワイト 【docomo版SIMフリー】 MOTOROLA 当社6ヶ月保証 未使用 イオシス", "A", null,
    { model: "motorola razr 60d", storage: 256, carrier: "docomo", rank: "S", color: "ライトスカイホワイト", battery: 100 }],
  ["pc-good", "【ネットワーク利用制限▲】motorola razr60s A503MO パルフェピンク 【SoftBank版SIMフリー】 MOTOROLA 当社3ヶ月間保証 中古 イオシス", "B", null,
    { model: "motorola razr 60s", storage: 256, carrier: "SoftBank", rank: "B", color: "パルフェピンク" }],
  // キャリア版（UQ）の edge 60 は容量を公式で確かめていない → 行にしない。g37j は容量の記載なし → 行にしない
  ["pc-good", "motorola edge60 XT2505-5 ジブラルタルシーネイビー 【UQmobile版SIMフリー】 MOTOROLA 当社3ヶ月間保証 中古 イオシス", "B", null, null],
  ["pc-good", "motorola moto g37j XT2625-9 カプリシアン 【Rakuten版SIMフリー】 MOTOROLA 当社3ヶ月間保証 中古 イオシス", "B", null, null],
  ["pc-good", "motorola razr fold XT2651-5 ブラッケンドブルー 【国内版SIMフリー】 MOTOROLA 当社3ヶ月間保証 中古 イオシス", "B", null, null],
  ["pc-good", "motorola moto g8 power XT2041-3 カプリブルー 【国内版SIMフリー】 MOTOROLA 当社6ヶ月保証 未使用 イオシス", "B", null, null],
  ["pc-good", "arrows We3 F-52G ブラック 【docomo版SIMフリー】 FCNT 当社3ヶ月間保証 中古 イオシス", "B", null,
    { model: "arrows We3", storage: 64, carrier: "docomo", rank: "B", color: "ブラック", battery: 80 }],
  ["pc-good", "arrows Alpha M08 ホワイト 【Rakuten版SIMフリー】 FCNT 当社3ヶ月間保証 中古 イオシス", "A", null,
    { model: "arrows Alpha", storage: 512, carrier: "楽天モバイル", rank: "A", color: "ホワイト" }],
  ["pc-good", "arrows Alpha2 M10 12GB/512GB インディゴ 【国内版SIMフリー】 FCNT 当社3ヶ月間保証 中古 イオシス", "A", null,
    { model: "arrows Alpha2", storage: 512, carrier: "国内版", rank: "A", color: "インディゴ" }],
  ["pc-good", "【ネットワーク利用制限▲】arrows Alpha2 M10 8GB/256GB ブルーグリーン 【mineo版SIMフリー】 FCNT 当社3ヶ月間保証 中古 イオシス", "B", null,
    { model: "arrows Alpha2", storage: 256, carrier: null, rank: "B", color: "ブルーグリーン" }],
  ["pc-good", "FUJITSU docomo arrowsケータイ ベーシック F-41C ネイビー [中古] 【当社3ヶ月間保証】 イオシス", "B", null, null],
  ["pc-good", "ARROWS Tab Q7310/DB FARQ26011【Core i5(1.7GHz)/8GB/128GB SSD/Win11Pro】 FUJITSU 当社3ヶ月間保証 中古 イオシス", "B", null, null],
];

const u = "https://item.rakuten.co.jp/x/1/";
const normalize = (shop: string, name: string, rank: string | null = "B", batt: number | null = null, i = 0) =>
  RAKUTEN_SHOPS[shop].normalize({ code: `x${i}`, name, price: 12345, url: u, rank, nw: null, car: null, batt });

ROWS.forEach(([shop, name, rank, batt, want], i) => {
  const got = normalize(shop, name, rank, batt, i);
  const label = name.slice(0, 80);
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
  check("メーカー", got.manufacturer, want.model.startsWith("arrows ") ? "FCNT" : "Motorola");
  check("価格", got.price, 12345);
});

// ---- 機種名の決め方（型番を優先・空白のゆれ・誤爆しやすい組） ----
const MOTO_CASES: [string, string | null][] = [
  ["motorola razr 50", "motorola razr 50"], ["razr50", "motorola razr 50"], ["razr 50s", "motorola razr 50s"], ["razr 50d", "motorola razr 50d"],
  ["razr 50 ultra", "motorola razr 50 ultra"], ["razr40 Ultra", "motorola razr 40 ultra"], ["razr 40", "motorola razr 40"], ["razr 40s", "motorola razr 40s"],
  ["razr60", "motorola razr 60"], ["razr60d", "motorola razr 60d"], ["razr 60s", "motorola razr 60s"], ["razr60 ultra", "motorola razr 60 ultra"], ["motorola razr fold", "motorola razr fold"],
  ["edge 60", "motorola edge 60"], ["edge60", "motorola edge 60"], ["edge 60 pro", "motorola edge 60 pro"], ["edge 60s pro", "motorola edge 60s pro"],
  ["edge 50 pro", "motorola edge 50 pro"], ["edge 50s pro", "motorola edge 50s pro"], ["edge 40 neo", "motorola edge 40 neo"], ["edge 40", "motorola edge 40"],
  ["edge 30 PRO", "motorola edge 30 pro"], ["edge 20fusion", "motorola edge 20 fusion"], ["edge 20", "motorola edge 20"], ["edge 70 fusion", "motorola edge 70 fusion"],
  ["moto g05", "motorola moto g05"], ["moto g06", "motorola moto g06"], ["moto g64 5G", "motorola moto g64 5G"], ["moto g64", "motorola moto g64 5G"], ["moto g64y 5G", "motorola moto g64y 5G"],
  ["moto g66j 5G", "motorola moto g66j 5G"], ["moto g66y 5G", "motorola moto g66y 5G"], ["moto g53j 5G", "motorola moto g53j 5G"], ["moto G13", "motorola moto g13"],
  ["moto g52j 5G", "motorola moto g52j 5G"], ["moto g52j 5G II", "motorola moto g52j 5G"], ["moto g31", "motorola moto g31"], ["moto g100", "motorola moto g100"], ["moto e32s", "motorola moto e32s"],
  ["motorola M-51F", "motorola razr 60d"],
  // カタログ外・別の機種
  ["moto g53y 5G", null], ["moto g50", null], ["moto g10", null], ["moto g30", null], ["Moto G8", null], ["moto g8 power", null], ["Moto G Pro", null], ["moto g24", null],
  ["moto edge X30", null], ["edge 70", null], ["razr 5G", null], ["moto e7", null], ["moto tab g70", null],
];
for (const [raw, want] of MOTO_CASES) {
  const got = canonicalMotorolaModel(raw);
  if (got !== want) ng(`motorola: ${raw} → ${got}（期待 ${want}）`);
}
const ARROWS_CASES: [string, string | null][] = [
  ["arrows We", "arrows We"], ["arrows We2", "arrows We2"], ["arrows We2 Plus", "arrows We2 Plus"], ["arrows We3", "arrows We3"],
  ["arrows Alpha", "arrows Alpha"], ["arrows Alpha2", "arrows Alpha2"], ["arrows N", "arrows N"], ["arrows NX9", "arrows NX9"], ["arrows 5G", "arrows 5G"],
  ["arrows Be4", "arrows Be4"], ["arrows Be4 Plus", "arrows Be4 Plus"],
  // 型番が名前より先
  ["arrows F-52G", "arrows We3"], ["arrows FCG02", "arrows We2"], ["arrows A402FC", "arrows We2"], ["arrows M07", "arrows We2"], ["arrows M06", "arrows We2 Plus"],
  ["arrows We F-52E", "arrows We2"],
  // カタログ外
  ["arrows ケータイ F-03L", null], ["arrowsケータイ ベーシック F-41C", null], ["arrows Tab F-02K", null], ["ARROWS Tab EH", null], ["arrows Be F-04K", null],
  ["arrows NX F-01K", null], ["arrows M05", null], ["arrows", null], ["arrows We4", null],
];
for (const [raw, want] of ARROWS_CASES) {
  const got = canonicalArrowsModel(raw);
  if (got !== want) ng(`arrows: ${raw} → ${got}（期待 ${want}）`);
}

// ---- 楽天4店の実際の商品名を全部読ませる ----
const FIXTURE = path.join(__dirname, "fixtures", "rakuten-motorola-arrows-titles.json");
const titles = JSON.parse(fs.readFileSync(FIXTURE, "utf8")) as Record<string, string[]>;
const SHOP_LABEL: Record<string, string> = { "geo-mobile": "ゲオ", janpara: "じゃんぱら", "akiba-u-shop": "ソフマップ", "pc-good": "イオシス" };
/** 行にならなかった理由（行にならないのが正しいもの・直すべきもの） */
function reasonOf(shop: string, name: string): string {
  if (/ケータイ|Tab\b/i.test(name)) return "ケータイ・タブレット（取らない）";
  const model = /arrows/i.test(name) ? canonicalArrowsModel(name) : canonicalMotorolaModel(name);
  if (!model) return "カタログ外の機種（moto g8・g50・g53y・edge X30 など）";
  if (shop === "pc-good" || shop === "janpara") return "容量が名前になく、公式で1つに決まらない（推測しない）";
  return "書式が読めない";
}
// カタログ外・ケータイ・タブレットなど、行にしてはいけない商品名
const MUST_SKIP = /ケータイ|Tab\b|g6plus|G Pro|G8|G9|g50|g30|g10(?!\d)|e7\b|Motoe5|g53y|X30|g24/i;
let total = 0;
let parsedTotal = 0;
const reasons = new Map<string, number>();
const fieldMissing = { carrier: 0, color: 0 };
const byModel = new Map<string, number>();
const perBrand = { motorola: [0, 0], arrows: [0, 0] };
for (const [shop, list] of Object.entries(titles)) {
  let parsed = 0;
  for (const name of list) {
    total++;
    const brand = /arrows/i.test(name) ? "arrows" : "motorola";
    perBrand[brand][0]++;
    const got = normalize(shop, name);
    if (MUST_SKIP.test(name) && got) ng(`カタログ外・ケータイ・タブレットが行になった: ${name.slice(0, 80)} → ${got.modelName}`);
    if (!got) {
      const r = reasonOf(shop, name);
      reasons.set(r, (reasons.get(r) ?? 0) + 1);
      if (r === "書式が読めない") ng(`書式が読めない: [${shop}] ${name}`);
      continue;
    }
    parsed++;
    perBrand[brand][1]++;
    byModel.set(got.modelName, (byModel.get(got.modelName) ?? 0) + 1);
    if (!got.carrier) fieldMissing.carrier++;
    // 色が商品名に書かれていない商品（ソフマップの "motorola edge 60 128GB PBAJ0003JP"）だけは "-" を許す
    if (got.color === "-" || got.color === "不明") {
      fieldMissing.color++;
      if (/[ァ-ヶ]{3,}/.test(name.replace(/【[^】]*】|\([^)]*\)|モトローラ|富士通|ワイモバイル/g, ""))) ng(`色が読めない: ${name.slice(0, 80)}`);
    }
    if (!(got.storage > 0)) ng(`容量が0: ${name.slice(0, 80)}`);
  }
  parsedTotal += parsed;
  console.log(`${SHOP_LABEL[shop] ?? shop}: ${list.length} 件中 ${parsed} 件を行にした`);
}
console.log(`合計: ${total} 件中 ${parsedTotal} 件（機種 ${byModel.size}）。motorola ${perBrand.motorola[0]} 件中 ${perBrand.motorola[1]} 件・arrows ${perBrand.arrows[0]} 件中 ${perBrand.arrows[1]} 件。キャリアなし ${fieldMissing.carrier} 件（mineo・IIJmio）・色の記載なし ${fieldMissing.color} 件`);
for (const [r, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  行にしない: ${r} ${n} 件`);

// ---- 検索の機種照合: 正式名は完全一致。ultra・s・d・pro・Plus 違いは当たらない ----
const mm = (q: string, name: string, want: boolean) => { if (matchesModel(q, name) !== want) ng(`matchesModel("${q}", "${name}") は ${want} のはず`); };
mm("motorola razr 50", "motorola razr 50", true); mm("motorola razr 50", "motorola razr 50 ultra", false); mm("motorola razr 50", "motorola razr 50s", false);
mm("motorola edge 60", "motorola edge 60 pro", false); mm("motorola moto g64 5G", "motorola moto g64y 5G", false);
mm("arrows We2", "arrows We2 Plus", false); mm("arrows Alpha", "arrows Alpha2", false); mm("arrows We", "arrows We3", false);
mm("motorola", "motorola razr 60", true); mm("arrows", "arrows We3", true); mm("arrows We3", "iPhone 15", false); mm("iPhone 15", "arrows We3", false);
mm("OPPO A5 5G", "motorola moto g05", false); mm("Xperia 1 V", "arrows We", false);

// ---- カタログの整合 ----
for (const [name, prefix, models, info, catalog, canon, specs] of [
  ["motorola", "motorola ", MOTOROLA_MODELS, MOTOROLA_INFO, MOTOROLA_CATALOG, canonicalMotorolaModel, MOTOROLA_SPECS],
  ["arrows", "arrows ", ARROWS_MODELS, ARROWS_INFO, ARROWS_CATALOG, canonicalArrowsModel, ARROWS_SPECS],
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
    for (const c of codes) if (canon(`${prefix}${c} 64GB`) !== m) ng(`${name}: 型番 ${c} から ${m} に決まらない（→ ${canon(`${prefix}${c} 64GB`)}）`);
    if (Object.values(i.codes).flat().length > 0 && codeRows(m).length === 0) ng(`${name}: 型番の表示がない: ${m}`);
    if (i.released && !releasedSentence(m)) ng(`${name}: 発売の文が作れない: ${m}`);
    if (!i.released && releasedSentence(m) !== null) ng(`${name}: 発売日が未確認なのに発売の文が出る: ${m}`);
    if (updateRows(m, "2026-11").length > 0 || supportSentence(m, "2026-11") !== null) ng(`${name}: 公式の値がないのに更新情報が出る: ${m}`);
    if (deviceOf(m) !== name) ng(`deviceOf が ${name} でない: ${m}`);
    if (!modelPagePath(m).startsWith(`/${name}/`)) ng(`パスが /${name}/ で始まらない: ${m}`);
    if (slugToModel(modelToSlug(m)) !== m) ng(`スラッグから戻らない: ${m}`);
    if (!ALL_DEVICE_PAGE_MODELS.includes(m)) ng(`ALL_DEVICE_PAGE_MODELS にない: ${m}`);
    if (specOf(m) !== undefined) ng(`specOf に入っている（機種ページにスペックの節が出る）: ${m}`);
    if (specs[m] && compareSpecOf(m) !== specs[m]) ng(`compareSpecOf から引けない: ${m}`);
  }
  for (const k of Object.keys(specs)) if (!models.includes(k)) ng(`${name}: スペックの機種がカタログにない: ${k}`);
}
for (const k of [...Object.keys(MOTOROLA_STORAGE_ANY), ...Object.keys(MOTOROLA_STORAGE_SIMFREE)]) if (!MOTOROLA_MODELS.includes(k)) ng(`motorola: 容量の表の機種がカタログにない: ${k}`);
for (const c of Object.keys(ARROWS_CODE_STORAGE)) if (!canonicalArrowsModel(`arrows ${c}`)) ng(`arrows: 容量の表の型番 ${c} が機種に決まらない`);
// 型番はメーカーをまたいで重複しない（Xperia・AQUOS・OPPO・Xiaomi も含めて）
const seen = new Map<string, string>();
for (const [model, i] of [...Object.entries(XPERIA_INFO), ...Object.entries(AQUOS_INFO), ...Object.entries(OPPO_INFO), ...Object.entries(XIAOMI_INFO), ...Object.entries(MOTOROLA_INFO), ...Object.entries(ARROWS_INFO)]) {
  for (const c of [...Object.values(i.codes).flat(), ...(i.unconfirmed ?? [])]) {
    const k = codeKey(c);
    if (seen.has(k) && seen.get(k) !== model) ng(`型番 ${c} が ${seen.get(k)} と ${model} で重複`);
    seen.set(k, model);
  }
}
const slugs = ALL_DEVICE_PAGE_MODELS.map(modelToSlug);
if (new Set(slugs).size !== slugs.length) ng("機種ページのスラッグが重複");
if (modelToSlug("motorola moto g66j 5G") !== "motorola-moto-g66j-5g" || modelToSlug("arrows We2 Plus") !== "arrows-we2-plus") ng("スラッグの形が想定と違う");
if (DEVICE_HUB.motorola.path !== "/motorola" || DEVICE_HUB.arrows.path !== "/arrows") ng("DEVICE_HUB の motorola・arrows が想定と違う");
if (siblingModels("arrows We3").includes("arrows Alpha") || !siblingModels("arrows We3").includes("arrows We2")) ng("siblingModels(arrows We3) が想定と違う");
if (deviceOf("iPhone 15") !== "iphone" || deviceOf("Galaxy S24") !== "galaxy" || deviceOf("Xperia 1 VII") !== "xperia" || deviceOf("OPPO Reno13 A") !== "oppo" || deviceOf("Xiaomi 15") !== "xiaomi") ng("deviceOf が既存機種で変わった");
const shopLabels4 = shopsFor("motorola razr 60").map((s) => s.label).join(",");
if (shopLabels4 !== "イオシス,じゃんぱら,ゲオモバイル,ソフマップ" || shopLabels4 !== shopsFor("arrows We3").map((s) => s.label).join(",")) ng(`motorola・arrows の店が想定と違う: ${shopLabels4}`);
if (releasedSentence("arrows We") !== "日本では2021年12月に発売されました（ドコモ・au・SoftBank）。") ng(`発売の文が想定と違う: ${releasedSentence("arrows We")}`);

if (failures > 0) { console.log(`\n${failures} 件失敗`); process.exit(1); }
console.log(`OK（手書きの表 ${ROWS.length} 件・名前 ${MOTO_CASES.length + ARROWS_CASES.length} 件・機種 motorola ${MOTOROLA_MODELS.length}・arrows ${ARROWS_MODELS.length}）`);
