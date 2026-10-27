/**
 * 楽天の中古ノートパソコンの読み取りの確かめ（npx tsx scripts/test-rakuten-pc.ts）。商品名は 10/27 の楽天の検索ページの実例
 */
import { normalizeIosysPc, normalizeJanparaPc, normalizeSofmapPc } from "@/lib/rakutenPc";
import type { RakutenItem } from "@/lib/rakutenCommon";

const item = (name: string, extra: Partial<RakutenItem> = {}): RakutenItem => ({ code: "x", name, price: 30000, url: "https://item.rakuten.co.jp/x/1/", rank: null, nw: null, ...extra });

// [読み取り関数, 商品, 期待（cpu・世代・win11・メモリ・容量・種類・画面・ランク）または null]
const CASES: [(i: RakutenItem) => unknown, RakutenItem, [string, number | null, boolean, number, number, string, number | null, string] | null][] = [
  [normalizeJanparaPc, item("【中古】Panasonic Lets note SV9 CF-SV9R16VS 【i5-10310U 16G 256G(SSD) 1GbE WiFi 12LCD(1920x1200)】【アリオ倉敷】保証期間1ヶ月【ランクC】"),
    ["Core i5-10310U", 10, true, 16, 256, "SSD", 12, "C"]],
  [normalizeJanparaPc, item("【中古】Lenovo IdeaPad Gaming 360 82K2008CJP シャドーブラック【R5 5600H 16G 512G(SSD) RTX3050 WiFi 15LCD(1920x1080/120Hz)】【中野】保証期間1ヶ月【ランクB】"),
    ["Ryzen 5 5600H", null, true, 16, 512, "SSD", 15, "B"]],
  [normalizeSofmapPc, item("【中古】Panasonic(パナソニック) Lets note SV9 CF-SV9R16VS 【262-ud】", { rank: "C", spec: "CPU:Core i5 10310U (1.7GHz)|メモリ:16GB|種類:SSD|容量:256GB|画面:12.1インチワイド" }),
    ["Core i5-10310U", 10, true, 16, 256, "SSD", 12.1, "C"]],
  [normalizeIosysPc, item("中古パソコン Latitude 5421【Core i7(2.5GHz)/32GB/256GB/Win11Pro】 DELL 当社3ヶ月間保証 イオシス", { rank: "B" }),
    ["Core i7", null, true, 32, 256, "SSD", null, "B"]],
  [normalizeIosysPc, item("中古パソコン Surface Laptop3 15インチ ブラック V9R-00039【Ryzen5(2.1GHz)/16GB/256GB SSD/Win11Home】 MICROSOFT 当社3ヶ月間保証 イオシス", { rank: "A" }),
    ["Ryzen 5", null, true, 16, 256, "SSD", 15, "A"]],
  [normalizeJanparaPc, item("【中古】Apple MacBook Air 13インチ M2 16GB/256GB【ランクA】"), null],
];

let failed = 0;
for (const [fn, it, want] of CASES) {
  const r = fn(it) as Record<string, unknown> | null;
  const have = r && [r.cpu, r.cpuGen, r.win11, r.memoryGB, r.storageGB, r.storageType, r.screenInch, r.conditionRank];
  if (JSON.stringify(have) !== JSON.stringify(want)) {
    failed++;
    console.log(`NG ${it.name}\n   want ${JSON.stringify(want)}\n   got  ${JSON.stringify(have)}`);
  }
}
console.log(`${CASES.length - failed}/${CASES.length} OK`);
process.exitCode = failed ? 1 : 0;
