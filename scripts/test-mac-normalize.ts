/**
 * MacBook の機種名・メモリ・SSD の読み取りの回帰テスト（npm run test:mac。違いがあれば exit 1）
 * 期待値は手で書いた表。商品名は 2026-10-15 に楽天の公開ページからコピーしたもの。新しい表記を見つけたら ROWS に足す。
 * model が null の行は「機種を決められない（Intel・アクセサリ・Pro/Max が分からない）」ことを確かめる（メモリ・SSD は見ない）。
 */
import { MAC_INFO, MAC_MODELS, canonicalMacModel, isMacOS27, parseMacSpec } from "@/lib/macCatalog";

type Row = [title: string, model: string | null, memoryGB?: number | null, ssdGB?: number | null];

const AIR_M1 = "MacBook Air M1";
const ROWS: Row[] = [
  // --- ソフマップ（akiba-u-shop） ---
  ["【中古】Apple(アップル) MacBook Air 13.3-inch Late-2020 MGN63J／A Apple M1 8コアCPU_7コアGPU 16GB SSD256GB スペースグレイ 〔26.3 Tahoe〕 【198-ud】", AIR_M1, 16, 256],
  ["【中古】Apple(アップル) MacBook Air 13.3-inch Late-2020 MGNA3J／A Apple M1 8コアCPU_8コアGPU 16GB SSD2TB シルバー 〔macOS v26.6.1〕 【276-ud】", AIR_M1, 16, 2048],
  ["【中古】Apple(アップル) MacBook Air 13.6-inch Mid-2022 MLY23J／A Apple M2 8コアCPU_10コアGPU 8GB SSD512GB スターライト 〔26.3 Tahoe〕 【276-ud】", "MacBook Air 13インチ M2", 8, 512],
  ["【中古】Apple(アップル) 〔展示品〕 MacBook Air 15.3-inch Mid-2023 CTOMQKT3J／A Apple M2 8コアCPU_10コアGPU 8GB SSD512GB シルバー 〔13.0 Ventura〕 【295-ud】", "MacBook Air 15インチ M2", 8, 512],
  ["【中古】Apple(アップル) MacBook Pro 14.2-inch Late-2023 MTL73J／A Apple M3 8コアCPU_10コアGPU 8GB SSD512GB スペースグレイ 〔26.3 Tahoe〕 【377-ud】", "MacBook Pro 14インチ M3", 8, 512],
  ["【中古】Apple(アップル) MacBook Air 15.3-inch Early-2025 MW1G3J／A Apple M4 10コアCPU_10コアGPU 16GB SSD256GB シルバー 〔26.3 Tahoe〕 【349-ud】", "MacBook Air 15インチ M4", 16, 256],
  ["【中古】Apple(アップル) MacBook Air 13.6-inch Early-2026 MDHE4J／A Apple M5 10コアCPU_8コアGPU 16GB SSD512GB ミッドナイト 〔26.3 Tahoe〕 【352-ud】", "MacBook Air 13インチ M5", 16, 512],
  ["【中古】Apple(アップル) MacBook Neo 13-inch Early-2026 MHFG4J／A Apple A18 Pro 6コアCPU_5コアGPU 8GB SSD512GB インディゴ 〔26.3 Tahoe〕 【262-ud】", "MacBook Neo", 8, 512],
  ["【中古】Apple(アップル) MacBook Pro 14.2-inch Late-2021 MKGQ3J／A Apple M1 Pro 10コアCPU_16コアGPU 16GB SSD1TB スペースグレイ 〔26.3 Tahoe〕 【258-ud】", "MacBook Pro 14インチ M1 Pro", 16, 1024],
  ["【中古】Apple(アップル) MacBook Pro 14.2-inch Late-2025 MDE64J／A Apple M5 10コアCPU_10コアGPU 24GB SSD1TB シルバー 〔26.3 Tahoe〕 【262-ud】", "MacBook Pro 14インチ M5", 24, 1024],
  // 公式表にない M2 Air 2024 構成 → 商品名の文字で決まる
  ["【中古】Apple(アップル) MacBook Air 13.6-inch Late-2024 MC7W4J／A Apple M2 8コアCPU_8コアGPU 16GB SSD256GB スターライト 〔26.3 Tahoe〕 【377-ud】", "MacBook Air 13インチ M2", 16, 256],
  ["【中古】Apple(アップル) MacBook Pro 13.3-inch Late-2020 MYDA2J／A Apple M1 8コアCPU_8コアGPU 16GB SSD256GB シルバー 〔26.3 Tahoe〕 【269-ud】", "MacBook Pro 13インチ M1", 16, 256],
  ["【中古】Apple(アップル) MacBook Air 13.3-inch Mid-2017 MQD32J／A Core_i5 1.8GHz 8GB SSD128GB 〔10.15 Catalina〕", null],

  // --- じゃんぱら（janpara） ---
  ["【中古】Apple MacBook Pro 13インチ M1(CPU:8C/GPU:8C) 8GB/512GB スペースグレイ MYD92J/A (M1・2020)【ECセンター】保証期間1ヶ月【ランクC】", "MacBook Pro 13インチ M1", 8, 512],
  ["【中古】Apple MacBook Air 13インチ M1(CPU:8C/GPU:7C) 8GB/256GB スペースグレイ MGN63J/A (M1・2020)【広島】保証期間1ヶ月【ランクA】", AIR_M1, 8, 256],
  ["【中古】Apple MacBook Pro 13インチ M2(CPU:8C/GPU:10C) 8GB/512GB スペースグレイ MNEJ3J/A (M2・2022)【中野】保証期間1ヶ月【ランクB】", "MacBook Pro 13インチ M2", 8, 512],
  ["【中古】Apple MacBook Air 13インチ CTO (M2,2022) スターライト M2(CPU:8C/GPU:10C)/16G/1T/35W AC(USB-Cx2)【大須2】保証期間1ヶ月【ランクA】", "MacBook Air 13インチ M2", 16, 1024],
  ["【中古】Apple MacBook Air 13インチ M2(CPU:8C/GPU:8C) 16GB/256GB スペースグレイ MC7U4J/A (M2,2022)【ECセンター】保証期間１ヶ月【ランクA】", "MacBook Air 13インチ M2", 16, 256],
  ["【中古】Apple MacBook Air 13インチ M3(CPU:8C/GPU:10C) 8GB/512GB ミッドナイト MRXW3J/A (13インチ, M3, 2024)【東池袋1丁目】保証期間1ヶ月【ランクC】", "MacBook Air 13インチ M3", 8, 512],
  ["【中古】Apple MacBook Air 13インチ CTO (M4, 2025) スターライト M4(CPU:10C/GPU:10C)/24G/512G【新宿2】保証期間1ヶ月【ランクA】", "MacBook Air 13インチ M4", 24, 512],
  ["【中古】Apple MacBook Air 13インチ (M4,2025) M4(CPU:10C/GPU:8C) 16GB/256GB ミッドナイト MW123J/A【札幌】保証期間1ヶ月【ランクB】", "MacBook Air 13インチ M4", 16, 256],
  ["【中古】Apple MacBook Pro 14インチ CTO (14インチ,M5) M5(CPU:10C/GPU:10C)/16G/1T スペースブラック【ECセンター】保証期間1ヶ月【ランクA】", "MacBook Pro 14インチ M5", 16, 1024],
  ["【中古】Apple MacBook Air 13インチ M5(CPU:10C/GPU:8C) 16GB/512GB ミッドナイト MDHE4J/A (13インチ,M5)【千葉】保証期間1ヶ月【ランクA】", "MacBook Air 13インチ M5", 16, 512],
  ["【未使用】Apple MacBook Neo 13インチ A18 Pro(CPU:6C/GPU:5C) 8GB/512GB シルバー MHFC4J/A (13インチ,A18 Pro)【新宿2】保証期間3ヶ月", "MacBook Neo", 8, 512],
  ["【未使用】Apple MacBook Pro 14インチ M5(CPU:10C/GPU:10C) 16GB/1TB シルバー MDE54J/A (14インチ,M5)【札幌】保証期間3ヶ月", "MacBook Pro 14インチ M5", 16, 1024],
  ["【中古】Apple MacBook Pro 13インチ Corei5:2GHz 256GB スペースグレイ MLL42J/A (Late 2016)【中野】保証期間1週間【ランクC】", null],

  // --- イオシス（pc-good） ---
  ["中古パソコン MacBook Air 13インチ MGN93J/A Late 2020 シルバー【Apple M1/16GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス", AIR_M1, 16, 512],
  ["中古パソコン 【電源アダプタ・ケーブル欠品】MacBook Air 13インチ MGN73J/A Late 2020 スペースグレイ【Apple M1/16GB/1TB SSD】 Apple 当社3ヶ月間保証 イオシス", AIR_M1, 16, 1024],
  // MYD82 は公式表にない（MYD83 はある）→ 商品名の文字で決まる
  ["中古パソコン MacBook Pro 13インチ MYD82B/A Late 2020 スペースグレイ【Apple M1/8GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス", "MacBook Pro 13インチ M1", 8, 256],
  ["中古パソコン MacBook Air 13インチ MGNA3JA/A Late 2020 シルバー【Apple M1/8GB/1TB SSD】 Apple 当社3ヶ月間保証 イオシス", AIR_M1, 8, 1024],
  ["中古パソコン MacBook Pro 16インチ MK1H3JA/A Late 2021 シルバー【Apple M1 Max(10コア)/64GB/1TB SSD】 Apple 当社3ヶ月間保証 イオシス", "MacBook Pro 16インチ M1 Max", 64, 1024],
  ["中古パソコン 【電源アダプタ・ケーブル欠品】MacBook Pro 13インチ MNEQ3J/A Mid 2022 シルバー【Apple M2/16GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス", "MacBook Pro 13インチ M2", 16, 512],
  ["中古パソコン MacBook Pro 14インチ MRX73J/A Late 2023 シルバー【Apple M3 Pro(12コア)/18GB/1TB SSD】 Apple 当社3ヶ月間保証 イオシス", "MacBook Pro 14インチ M3 Pro", 18, 1024],
  // FW103 = 整備品（F）。M に読み替えて MW103（Air 13 M4）
  ["中古パソコン MacBook Air 13インチ FW103J/A Early 2025 スターライト【Apple M4/16GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス", "MacBook Air 13インチ M4", 16, 512],
  ["中古パソコン MacBook Air 13インチ MDH84J/A Early 2026 シルバー【Apple M5/16GB/1TB SSD】 Apple 当社6ヶ月保証 イオシス", "MacBook Air 13インチ M5", 16, 1024],
  ["中古パソコン MacBook Pro 14インチ MGDR4J/A Early 2026 スペースブラック【Apple M5 Pro(15コア)/24GB/1TB SSD/16コアGPU】 Apple 当社3ヶ月間保証 イオシス", "MacBook Pro 14インチ M5 Pro", 24, 1024],
  // MEQJ4 は公式表にない（Nano-texture）→ 商品名の文字で決まる
  ["中古パソコン MacBook Pro 14インチ MEQJ4J/A Late 2025 スペースブラック【Apple M5(10コア)/16GB/1TB/10コアGPU/Nano-textureガラス】 Apple 当社3ヶ月間保証 イオシス", "MacBook Pro 14インチ M5", 16, 1024],
  ["中古パソコン MacBook Pro 14インチ MW2W3J/A Late 2024 シルバー【Apple M4(10コア)/16GB/512GB/10コアGPU】 Apple 当社3ヶ月間保証 イオシス", "MacBook Pro 14インチ M4", 16, 512],
  ["中古パソコン MacBook Pro 14インチ MRX33J/A Late 2023 スペースブラック【Apple M3 Pro(11コア)/18GB/512GB SSD】 Apple 当社3ヶ月間保証 イオシス", "MacBook Pro 14インチ M3 Pro", 18, 512],
  ["中古パソコン 【Refreshed PC】MacBook Air 13インチ MGN63J/A Late 2020 スペースグレイ【Apple M1/8GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス", AIR_M1, 8, 256],
  ["中古パソコン MacBook 12インチ MLHA2JA/A Early 2016 シルバー【Core m3(1.1GHz)/8GB/256GB SSD】 Apple 当社3ヶ月間保証 イオシス", null],

  // --- ゲオ（geo-mobile）: 部品番号と年のみ。メモリ・SSD は null ---
  // 16インチ 2021 は Pro/Max 混在でチップ表記なし → null が正しい
  ["【中古】【安心保証】 MacBookPro 2021年 MK1A3J/A", null],
  ["【中古】【安心保証】 MacBookAir 2020年 MGNE3J/A", AIR_M1, null, null],
  ["【中古】【安心保証】 MacBookAir 2022年 MLXW3J/A", "MacBook Air 13インチ M2", null, null],
  ["【中古】【安心保証】 MacBookAir 2013年 MD711J/A", null],
  ["【中古】【安心保証】 MacBook 2017年 MNYK2J/A", null],

  // --- その他（アクセサリ・モニタ・他機種） ---
  ["iphone 充電 ケーブル 純正 lightning タイプC Apple 1m 充電器 中古", null],
  ["BenQ ベンキュー 27型液晶モニター Mac向けシリーズ MA270U-JP", null],
  ["【中古】【安心保証】 MediaPad M5[32G] スペースグレイ", null],
];

let fail = 0;
const ng = (msg: string) => {
  fail++;
  console.log("NG: " + msg);
};

for (const [title, model, mem, ssd] of ROWS) {
  const got = canonicalMacModel(title);
  if (got !== model) ng(`機種 期待=${model} 結果=${got}\n    ${title}`);
  if (model !== null && mem !== undefined) {
    const s = parseMacSpec(title);
    if (s.memoryGB !== mem || s.ssdGB !== ssd) ng(`メモリ/SSD 期待=${mem}/${ssd} 結果=${s.memoryGB}/${s.ssdGB}\n    ${title}`);
  }
}

// 全 MAC_MODELS に MAC_INFO があり、逆もそう（macOS 27 対応）
for (const m of MAC_MODELS) {
  if (!MAC_INFO[m]) ng(`MAC_INFO にない機種: ${m}`);
  if (!isMacOS27(m)) ng(`macOS 27 対応でない機種: ${m}`);
}
const modelSet = new Set(MAC_MODELS);
if (modelSet.size !== MAC_MODELS.length) ng("MAC_MODELS に重複がある");
for (const k of Object.keys(MAC_INFO)) if (!modelSet.has(k)) ng(`MAC_CATALOG にない機種が MAC_INFO にある: ${k}`);

// partPrefixes が機種間で重複しない。例外は Pro/Max が同じ識別名を共有するグループ
// （同じ表を丸ごと持ち、画面サイズ・発売年・チップの世代が同じで Pro/Max だけが違う場合のみ許す）
const owner = new Map<string, string>();
for (const [name, info] of Object.entries(MAC_INFO)) {
  for (const p of info.partPrefixes) {
    const prev = owner.get(p);
    if (!prev) {
      owner.set(p, name);
      continue;
    }
    const a = MAC_INFO[prev];
    const sameGroup =
      JSON.stringify(a.partPrefixes) === JSON.stringify(info.partPrefixes) &&
      a.inch === info.inch &&
      a.year === info.year &&
      a.family === info.family &&
      a.chip.split(" ")[0] === info.chip.split(" ")[0] &&
      /(Pro|Max)$/.test(a.chip) &&
      /(Pro|Max)$/.test(info.chip);
    if (!sameGroup) ng(`部品番号 ${p} が別の機種で重複: ${prev} / ${name}`);
  }
}

console.log(fail === 0 ? `OK（${ROWS.length}件・${MAC_MODELS.length}機種）` : `${fail}件の違い`);
process.exit(fail === 0 ? 0 : 1);
