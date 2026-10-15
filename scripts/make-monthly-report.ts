/**
 * 月次レポート（中古スマホ相場）の素材を作る。数字は全部 DB（PriceSnapshot・DeviceInventory の集計）から。意見は書かない
 *   npm run report:monthly -- <YYYY-MM> [iphone|ipad|pixel|galaxy|mac]   （既定は iphone）
 * 出力: ideas/reports/<YYYY-MM>-<device>.md（記事の下書き）と同名 .json（X 用画像などの元）
 * - 相場の変化は PriceSnapshot（storage=0 = 全容量）の月初と月末（月の途中なら最新日）どうしを比べる。月初の記録が無い機種は、記録がある最も古い日から
 * - Amazon の価格は PriceSnapshot に入らない（lib/priceHistory.ts）ので、レポートにも入らない
 * - DB は読むだけ。PriceSnapshot は date と modelSlug in で絞る。在庫の合計は groupBy（行は取らない）
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import prisma from "@/lib/prisma";
import { ALL_PAGE_MODELS, modelToSlug } from "@/lib/catalog";
import { IPAD_CATALOG } from "@/lib/ipadCatalog";
import { PIXEL_CATALOG } from "@/lib/pixelCatalog";
import { GALAXY_CATALOG } from "@/lib/galaxyCatalog";
import { MAC_CATALOG } from "@/lib/macCatalog";
import { ALL_STORAGE, jstToday } from "@/lib/priceHistory";
import { activeMacShops, activeShops } from "@/lib/activeShops";
import { GALAXY_SHOPS, IPAD_SHOPS, PIXEL_SHOPS, SHOPS } from "@/lib/shops";

const ym = process.argv[2];
const DEVICE = (process.argv[3] ?? "iphone") as "iphone" | "ipad" | "pixel" | "galaxy" | "mac";
if (!ym || !/^\d{4}-(0[1-9]|1[0-2])$/.test(ym) || !["iphone", "ipad", "pixel", "galaxy", "mac"].includes(DEVICE)) {
  console.error("usage: npm run report:monthly -- <YYYY-MM> [iphone|ipad|pixel|galaxy|mac]");
  process.exit(1);
}

const CATALOGS = {
  iphone: { name: "iPhone", models: ALL_PAGE_MODELS, prefix: "iPhone", series: null as { series: string; models: string[] }[] | null },
  ipad: { name: "iPad", models: IPAD_CATALOG.flatMap((s) => s.models), prefix: "iPad", series: IPAD_CATALOG },
  pixel: { name: "Pixel", models: PIXEL_CATALOG.flatMap((s) => s.models), prefix: "Pixel", series: PIXEL_CATALOG },
  galaxy: { name: "Galaxy", models: GALAXY_CATALOG.flatMap((s) => s.models), prefix: "Galaxy", series: GALAXY_CATALOG },
  mac: { name: "MacBook", models: MAC_CATALOG.flatMap((s) => s.models), prefix: "MacBook", series: MAC_CATALOG },
};
const C = CATALOGS[DEVICE];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const jaDate = (s: string) => `${Number(s.slice(5, 7))}月${Number(s.slice(8, 10))}日`;
const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("ja-JP")}円`;
const pct = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n).toFixed(1)}%`;

type Row = {
  model: string;
  slug: string;
  startDate: string;
  endDate: string;
  days: number; // 記録のある日数（月初〜月末の間）
  startMedian: number;
  startMin: number;
  startCount: number;
  endMedian: number;
  endMin: number;
  endCount: number;
  change: number;
  changePct: number;
  gap: number; // 相場 - 最安値（月末）
  gapPct: number;
};

async function main() {
  const [y, m] = ym.split("-").map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthLast = new Date(Date.UTC(y, m, 0));
  const today = jstToday();
  const rangeEnd = monthLast.getTime() > today.getTime() ? today : monthLast;
  const partial = monthLast.getTime() > today.getTime();

  const slugs = C.models.map(modelToSlug);
  const snaps = await prisma.priceSnapshot.findMany({
    where: { date: { gte: monthStart, lte: rangeEnd }, modelSlug: { in: slugs }, storage: ALL_STORAGE },
    select: { date: true, modelSlug: true, minPrice: true, medianPrice: true, count: true },
    orderBy: { date: "asc" },
  });
  if (snaps.length === 0) {
    console.error(`${ym} の ${C.name} の記録がありません`);
    process.exit(1);
  }
  const endDate = iso(new Date(Math.max(...snaps.map((s) => s.date.getTime()))));
  const startDate = iso(new Date(Math.min(...snaps.map((s) => s.date.getTime()))));
  const allDays = new Set(snaps.map((s) => iso(s.date))).size;

  const bySlug = new Map<string, typeof snaps>();
  for (const s of snaps) (bySlug.get(s.modelSlug) ?? bySlug.set(s.modelSlug, []).get(s.modelSlug)!).push(s);

  const rows: Row[] = [];
  const noData: string[] = [];
  for (const model of C.models) {
    const list = bySlug.get(modelToSlug(model));
    const last = list?.[list.length - 1];
    // 最新日に記録が無い機種（在庫ゼロ）は表に入れない
    if (!list || !last || iso(last.date) !== endDate) {
      noData.push(model);
      continue;
    }
    const first = list[0];
    rows.push({
      model,
      slug: modelToSlug(model),
      startDate: iso(first.date),
      endDate: iso(last.date),
      days: list.length,
      startMedian: first.medianPrice,
      startMin: first.minPrice,
      startCount: first.count,
      endMedian: last.medianPrice,
      endMin: last.minPrice,
      endCount: last.count,
      change: last.medianPrice - first.medianPrice,
      changePct: ((last.medianPrice - first.medianPrice) / first.medianPrice) * 100,
      gap: last.medianPrice - last.minPrice,
      gapPct: ((last.medianPrice - last.minPrice) / last.medianPrice) * 100,
    });
  }

  // 変化の上位（在庫が少ない機種はぶれるので、月末の在庫が5件以上）。記録が1日だけの機種（変化なし）は除く
  const MIN_COUNT = 5;
  const movers = rows.filter((r) => r.startDate !== r.endDate && r.endCount >= MIN_COUNT && r.startCount >= MIN_COUNT);
  const down = [...movers].filter((r) => r.change < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 5);
  const up = [...movers].filter((r) => r.change > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  const gapTop = rows.filter((r) => r.endCount >= MIN_COUNT).sort((a, b) => b.gapPct - a.gapPct).slice(0, 5);

  // 世代ごとの相場の並び
  let gens: { label: string; row: Row }[][] = [];
  const byModel = new Map(rows.map((r) => [r.model, r]));
  if (DEVICE === "iphone") {
    const base = ALL_PAGE_MODELS.filter((n) => /^iPhone \d+$/.test(n));
    const pro = ALL_PAGE_MODELS.filter((n) => /^iPhone \d+ Pro$/.test(n));
    gens = [base, pro, ["iPhone SE (第3世代)", "iPhone SE (第2世代)"]].map((names) => names.flatMap((n) => (byModel.get(n) ? [{ label: n, row: byModel.get(n)! }] : [])));
  } else if (C.series && DEVICE !== "mac") {
    // MacBook は機種の種類（Air/Pro・チップ）が混ざり世代の並びにならないので出さない
    // シリーズごとの先頭の機種（カタログの順）
    gens = [C.series.flatMap((s) => (byModel.get(s.models[0]) ? [{ label: s.models[0], row: byModel.get(s.models[0])! }] : []))];
  }
  gens = gens.filter((g) => g.length >= 2);

  // 店数と在庫の総数（いま。月が終わっていれば「取得時点」の値）
  const shops =
    DEVICE === "mac" ? await activeMacShops()
    : await activeShops(DEVICE === "ipad" ? IPAD_SHOPS : DEVICE === "pixel" ? PIXEL_SHOPS : DEVICE === "galaxy" ? GALAXY_SHOPS : SHOPS);
  const stockByModel = await prisma.deviceInventory.groupBy({
    by: ["modelName"],
    where: { isSoldOut: false, modelName: { startsWith: C.prefix } },
    _count: { _all: true },
  });
  const catalogSet = new Set(C.models);
  const stockTotal = stockByModel.filter((g) => catalogSet.has(g.modelName)).reduce((n, g) => n + g._count._all, 0);
  const allStockGroups = await prisma.deviceInventory.groupBy({ by: ["shopName"], where: { isSoldOut: false }, _count: { _all: true } });
  const allStock = allStockGroups.reduce((n, g) => n + g._count._all, 0);
  const fetched = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  // ---- Markdown ----
  const title = `中古${C.name}相場レポート（${y}年${m}月）`;
  const span = startDate === endDate ? `${jaDate(endDate)}の1日分` : `${jaDate(startDate)}〜${jaDate(endDate)}`;
  const L: string[] = [];
  L.push(`# ${title}`, "");
  L.push(`対象期間: ${span}（記録 ${allDays}日分）${partial ? "。月の途中のため、取得できた最新日までの数字" : ""}`, "");
  if (startDate > iso(monthStart)) L.push(`月初（${jaDate(iso(monthStart))}）の記録が無いため、${jaDate(startDate)}の記録を月初として比べている。`, "");
  L.push("相場は在庫の中央値（全容量）、最安値は全容量の最安。Amazon 整備済み品は含まない。", "");

  L.push(`## ${C.name}の相場一覧`, "");
  if (startDate === endDate) {
    L.push(`| 機種 | 相場（${jaDate(endDate)}） | 最安値 | 在庫 |`, "| --- | ---: | ---: | ---: |");
    for (const r of rows) L.push(`| ${r.model} | ${yen(r.endMedian)} | ${yen(r.endMin)} | ${r.endCount.toLocaleString("ja-JP")}件 |`);
  } else {
    L.push(`| 機種 | 相場（${jaDate(startDate)}） | 相場（${jaDate(endDate)}） | 変化 | 最安値（${jaDate(endDate)}） | 在庫（${jaDate(endDate)}） |`);
    L.push("| --- | ---: | ---: | ---: | ---: | ---: |");
    for (const r of rows) {
      const note = r.startDate !== startDate ? `（${jaDate(r.startDate)}〜）` : "";
      L.push(`| ${r.model} | ${yen(r.startMedian)}${note} | ${yen(r.endMedian)} | ${r.startDate === r.endDate ? "記録1日" : `${signed(r.change)}（${pct(r.changePct)}）`} | ${yen(r.endMin)} | ${r.endCount.toLocaleString("ja-JP")}件 |`);
    }
  }
  L.push("");

  const moverTable = (list: Row[]) => {
    const t = ["| 機種 | 月初 | 月末 | 変化 |", "| --- | ---: | ---: | ---: |"];
    for (const r of list) t.push(`| ${r.model} | ${yen(r.startMedian)} | ${yen(r.endMedian)} | ${signed(r.change)}（${pct(r.changePct)}） |`);
    return t;
  };
  L.push(`## 1か月の相場の変化`, "");
  if (movers.length === 0) {
    L.push(`記録が${allDays}日分のため、変化は出せていない。`, "");
  } else {
    L.push(`### 相場が下がった機種 上位${down.length}`, "", ...(down.length ? moverTable(down) : ["下がった機種はなし。"]), "");
    L.push(`### 相場が上がった機種 上位${up.length}`, "", ...(up.length ? moverTable(up) : ["上がった機種はなし。"]), "");
    L.push(`（比べた2時点の在庫がどちらも${MIN_COUNT}件以上の機種だけ。表の「月初」「月末」は ${jaDate(startDate)}・${jaDate(endDate)}。）`, "");
  }

  if (gens.length) {
    L.push(`## 世代ごとの相場の並び`, "");
    for (const g of gens) {
      L.push("| 機種 | 相場 | 1つ前の世代との差 |", "| --- | ---: | ---: |");
      g.forEach((x, i) => {
        const prev = g[i + 1];
        L.push(`| ${x.label} | ${yen(x.row.endMedian)} | ${prev ? `${signed(x.row.endMedian - prev.row.endMedian)}` : "-"} |`);
      });
      L.push("");
    }
    L.push(`（${jaDate(endDate)}時点の相場。差は「その機種 − 1つ前の世代」。）`, "");
  }

  L.push(`## 最安値と相場の差が大きい機種 TOP${gapTop.length}`, "");
  L.push("| 機種 | 最安値 | 相場 | 差 |", "| --- | ---: | ---: | ---: |");
  for (const r of gapTop) L.push(`| ${r.model} | ${yen(r.endMin)} | ${yen(r.endMedian)} | ${yen(r.gap)}（${r.gapPct.toFixed(1)}%） |`);
  L.push("", `（${jaDate(endDate)}時点。在庫${MIN_COUNT}件以上の機種。差 = 相場 − 最安値。）`, "");

  L.push(`## 対象の店と在庫`, "");
  L.push(`- 在庫が見える店: ${shops.length}店（${shops.map((s) => s.name).join("・")}）`);
  L.push(`- ${C.name}の在庫: ${stockTotal.toLocaleString("ja-JP")}件（取得日 ${jaDate(fetched)}）`);
  L.push(`- 全機種の在庫: ${allStock.toLocaleString("ja-JP")}件`);
  if (noData.length) L.push(`- ${jaDate(endDate)}に在庫の記録が無い機種: ${noData.join("・")}`);
  L.push("");
  L.push(`数字は used.gadelog.com の在庫（${shops.length}店・${stockTotal.toLocaleString("ja-JP")}件）から。取得日 ${jaDate(fetched)}`, "");

  const dir = join(process.cwd(), "ideas", "reports");
  mkdirSync(dir, { recursive: true });
  const base = join(dir, `${ym}-${DEVICE}`);
  writeFileSync(`${base}.md`, L.join("\n"));
  writeFileSync(
    `${base}.json`,
    JSON.stringify(
      { month: ym, device: DEVICE, startDate, endDate, recordedDays: allDays, partial, shops: shops.map((s) => s.name), stockTotal, allStock, fetched, rows, down, up, gapTop, generations: gens.map((g) => g.map((x) => ({ model: x.label, median: x.row.endMedian }))), noData },
      null,
      2,
    ),
  );
  console.log(`saved ${base}.md / .json（${rows.length}機種・店${shops.length}・在庫${stockTotal}件）`);
}

main().finally(() => prisma.$disconnect());
