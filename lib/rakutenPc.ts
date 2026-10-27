import type { Prisma } from "@prisma/client";
import type { RakutenItem } from "@/lib/rakutenCommon";
import { RAKUTEN_JANPARA_SHOP } from "@/lib/rakutenJanpara";
import { RAKUTEN_SOFMAP_SHOP } from "@/lib/rakutenSofmap";
import { RAKUTEN_IOSYS_SHOP } from "@/lib/rakutenIosys";

/**
 * 楽天市場店の中古ノートパソコン（Windows）を PcInventory の行にする（2026-10-27〜）。
 * fetch.php が「ノートパソコン」（MacBook・Chromebook を除く）で引いた <shopCode>-pc.json.gz を scripts/ingest-rakuten-pc.ts が読む。
 * 読み取りは scraper/pc_spec.py（PC WRAP・Qualit）と同じ考え方。CPU・メモリ・ストレージのどれかが読めない商品は入れない。
 * リンクは楽天アフィリエイトだけ（lib/affiliate.ts が店名で決める。楽天の規約で A8 などは付けない）。
 *
 * 商品名の例（10/27 の楽天の検索ページ）:
 *   じゃんぱら  【中古】Panasonic Lets note SV9 CF-SV9R16VS 【i5-10310U 16G 256G(SSD) 1GbE WiFi 12LCD(1920x1200)】【アリオ倉敷】保証期間1ヶ月【ランクC】
 *              【中古】Lenovo IdeaPad Gaming 360 82K2008CJP シャドーブラック【R5 5600H 16G 512G(SSD) RTX3050 WiFi 15LCD(1920x1080/120Hz)】【中野】保証期間1ヶ月【ランクB】
 *   ソフマップ  【中古】Panasonic(パナソニック) Lets note SV9 CF-SV9R16VS 【262-ud】（スペックは商品説明 → fetch.php の spec「CPU:Core i5 10310U (1.7GHz)|メモリ:16GB|種類:SSD|容量:256GB|画面:12.1インチワイド」）
 *   イオシス    中古パソコン Latitude 5421【Core i7(2.5GHz)/32GB/256GB/Win11Pro】 DELL 当社3ヶ月間保証 イオシス（CPU の型番がない → 世代は null）
 */

type Row = Prisma.PcInventoryCreateManyInput;
type Cpu = { cpu: string; family: string; gen: number | null };

const NOT_PC = /MacBook|Chromebook|iPad|Surface\s*Duo|ケース|カバー|フィルム|バッテリー単品|ACアダプタ|キーボード単品|マウス/i;

/** CPU。「Core i5 10310U」「Core i5-1.7GHz(10310U)」「i5-10310U」（じゃんぱら）「R5 5600H」「Ryzen5(2.1GHz)」「Core i7(2.5GHz)」（型番なし） */
export function parseCpu(text: string): Cpu | null {
  let m = text.match(/Core\s?Ultra\s?([579])[\s-]*(?:[\d.]+G(?:Hz)?)?\s*\(?\s*(\d{3}[A-Z]{0,2})?/i);
  if (m) return { cpu: `Core Ultra ${m[1]}${m[2] ? ` ${m[2].toUpperCase()}` : ""}`, family: `Core Ultra ${m[1]}`, gen: null };
  m = text.match(/(?:Core\s?)?\b(i[3579])[\s-]*(?:[\d.]+G(?:Hz)?)?\s*\(?\s*(\d{4,5})([A-Z]{0,2}\d?)/i);
  if (m) {
    const digits = m[2];
    const gen = digits.length === 5 || digits[0] === "1" ? Number(digits.slice(0, 2)) : Number(digits[0]);
    return { cpu: `Core ${m[1].toLowerCase()}-${digits}${m[3].toUpperCase()}`, family: `Core ${m[1].toLowerCase()}`, gen };
  }
  m = text.match(/Core\s?(i[3579])/i);
  if (m) {
    // 型番がない（イオシス）。「第10世代」と書いてあればそれを世代にする
    const g = text.match(/第\s?(\d{1,2})\s?世代/);
    return { cpu: `Core ${m[1].toLowerCase()}`, family: `Core ${m[1].toLowerCase()}`, gen: g ? Number(g[1]) : null };
  }
  m = text.match(/(?:Ryzen\s?|\bR)([3579])(?:\s?PRO)?[\s-]*(?:\(?[\d.]+GHz\)?)?\s*(\d{4})?([A-Z]{0,2}\d?)/i);
  if (m && (/Ryzen/i.test(text) || m[2])) {
    return { cpu: `Ryzen ${m[1]}${m[2] ? ` ${m[2]}${(m[3] ?? "").toUpperCase()}` : ""}`, family: `Ryzen ${m[1]}`, gen: null };
  }
  m = text.match(/(Celeron|Pentium|Atom|Core\s?m3)/i);
  if (m) {
    const name = /m3/i.test(m[1]) ? "Core m3" : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    return { cpu: name, family: name, gen: null };
  }
  return null;
}

/** Windows 11 の対応 CPU か（Microsoft の一覧: Intel 第8世代以降・Core Ultra・Ryzen 2000 以降）。世代が分からないときは、商品が Windows 11 で売られていれば対応とみなす */
export function windows11Ok(c: Cpu, text: string): boolean {
  if (c.family.startsWith("Core Ultra")) return true;
  if (c.family.startsWith("Core i")) return c.gen !== null ? c.gen >= 8 : /Win(?:dows)?\s?11/i.test(text);
  if (c.family.startsWith("Ryzen")) {
    const m = c.cpu.match(/Ryzen \d (\d)\d{3}/);
    return m ? Number(m[1]) >= 2 : /Win(?:dows)?\s?11/i.test(text);
  }
  return false;
}

const toGB = (n: string, unit: string) => Math.round(Number(n) * (/^T/i.test(unit) ? 1000 : 1));

const MAKERS: [string, RegExp][] = [
  ["Lenovo", /Lenovo|レノボ|ThinkPad|IdeaPad|ThinkBook/i],
  ["HP", /\bHP\b|Hewlett|ProBook|EliteBook|Pavilion/i],
  ["Dell", /Dell|Latitude|Vostro|Inspiron|XPS|Alienware/i],
  ["富士通", /富士通|Fujitsu|LIFEBOOK|FMV/i],
  ["NEC", /\bNEC\b|VersaPro|LAVIE/i],
  ["Dynabook", /dynabook|東芝|Toshiba/i],
  ["Panasonic", /Panasonic|パナソニック|Let'?s\s?note|CF-[A-Z]{2}/i],
  ["Microsoft", /Surface|Microsoft/i],
  ["VAIO", /VAIO/i],
  ["ASUS", /ASUS/i],
  ["Acer", /Acer/i],
  ["MSI", /\bMSI\b/i],
];
const makerOf = (text: string) => MAKERS.find(([, re]) => re.test(text))?.[0] ?? "その他";

/** 専用 GPU（RTX3050・GeForce GTX 1650 など）。内蔵だけなら null */
const gpuOf = (text: string) => text.match(/((?:GeForce\s?)?(?:RTX|GTX|MX)\s?A?\d{3,4}(?:\s?Ti)?|Radeon\s?RX\s?\d{3,4}[A-Z]?|Quadro\s?\S+)/i)?.[1] ?? null;

/** 商品名の先頭の飾り（【中古】・中古パソコン）と、スペックの【…】以降を落とした機種名 */
function productOf(name: string): string {
  return name
    .replace(/^【中古】\s*|^中古パソコン\s*/g, "")
    .split(/【/)[0]
    .replace(/\(([^)]*)\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const rankOf = (item: RakutenItem) => {
  const r = item.rank ?? item.name.match(/【ランク([SABCDJ])】/)?.[1] ?? null;
  return r && /^[SABCJ]$/.test(r) ? r : null;
};

function build(shopName: string, item: RakutenItem, specText: string, memoryGB: number | null, storage: [number, string] | null, screen: number | null): Row | null {
  if (!item.url || !(item.price > 0) || NOT_PC.test(item.name)) return null;
  const cpu = parseCpu(specText);
  const rank = rankOf(item);
  if (!cpu || !memoryGB || !storage || !rank) return null;
  return {
    shopName,
    formFactor: "note",
    maker: makerOf(item.name),
    productName: productOf(item.name),
    cpu: cpu.cpu,
    cpuFamily: cpu.family,
    cpuGen: cpu.gen,
    win11: windows11Ok(cpu, `${item.name} ${specText}`),
    memoryGB,
    storageGB: storage[0],
    storageType: storage[1],
    gpu: gpuOf(item.name),
    screenInch: screen,
    conditionRank: rank,
    rankLabel: rank,
    stock: null,
    price: item.price,
    url: item.url,
  };
}

/** じゃんぱら: 商品名の【i5-10310U 16G 256G(SSD) … 12LCD(…)】 */
export function normalizeJanparaPc(item: RakutenItem): Row | null {
  const spec = item.name.match(/【([^】]*\d+G[^】]*)】/)?.[1] ?? "";
  const mem = spec.match(/(?:^|\s)(\d{1,3})G(?:B)?(?=\s)/);
  const sto = spec.match(/(\d+(?:\.\d+)?)(G|T)B?\s*\((SSD|HDD|eMMC)\)/i);
  const inch = spec.match(/(\d{2}(?:\.\d)?)\s*(?:LCD|インチ|型)/);
  return build(RAKUTEN_JANPARA_SHOP, item, spec, mem ? Number(mem[1]) : null, sto ? [toGB(sto[1], sto[2]), sto[3].toUpperCase() === "HDD" ? "HDD" : "SSD"] : null, inch ? Number(inch[1]) : null);
}

/** ソフマップ: fetch.php の spec「CPU:…|メモリ:16GB|種類:SSD|容量:256GB|画面:12.1インチワイド」 */
export function normalizeSofmapPc(item: RakutenItem): Row | null {
  const spec = item.spec ?? "";
  const get = (k: string) => spec.match(new RegExp(`(?:^|\\|)${k}:([^|]*)`))?.[1] ?? "";
  const mem = get("メモリ").match(/(\d+(?:\.\d+)?)\s*(GB|TB)/i);
  const sto = get("容量").match(/(\d+(?:\.\d+)?)\s*(GB|TB)/i);
  const inch = get("画面").match(/(\d{1,2}(?:\.\d)?)\s*(?:インチ|型)/);
  const kind = /HDD/i.test(get("種類")) ? "HDD" : "SSD";
  return build(RAKUTEN_SOFMAP_SHOP, item, `${get("CPU")} ${get("OS")}`, mem ? toGB(mem[1], mem[2]) : null, sto ? [toGB(sto[1], sto[2]), kind] : null, inch ? Number(inch[1]) : null);
}

/** イオシス: 商品名の【Core i7(2.5GHz)/32GB/256GB/Win11Pro】（1つ目の GB がメモリ・2つ目がストレージ） */
export function normalizeIosysPc(item: RakutenItem): Row | null {
  const spec = item.name.match(/【([^】]*GB[^】]*)】/)?.[1] ?? "";
  const sizes = [...spec.matchAll(/(\d+(?:\.\d+)?)\s*(GB|TB)(\s*(?:SSD|HDD|eMMC))?/gi)];
  if (sizes.length < 2) return null;
  const inch = item.name.match(/(\d{2}(?:\.\d)?)\s*(?:インチ|型)/);
  const kind = /HDD/i.test(sizes[1][3] ?? "") ? "HDD" : "SSD";
  return build(RAKUTEN_IOSYS_SHOP, item, spec, toGB(sizes[0][1], sizes[0][2]), [toGB(sizes[1][1], sizes[1][2]), kind], inch ? Number(inch[1]) : null);
}

/** 中古パソコンを取り込む楽天の店（キーは shopCode。fetch.php の PC_SHOP_CODES と同じ） */
export const RAKUTEN_PC_SHOPS: Record<string, { shopName: string; normalize: (item: RakutenItem) => Row | null }> = {
  "akiba-u-shop": { shopName: RAKUTEN_SOFMAP_SHOP, normalize: normalizeSofmapPc },
  janpara: { shopName: RAKUTEN_JANPARA_SHOP, normalize: normalizeJanparaPc },
  "pc-good": { shopName: RAKUTEN_IOSYS_SHOP, normalize: normalizeIosysPc },
};
