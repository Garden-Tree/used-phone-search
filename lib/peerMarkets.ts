import prisma from "@/lib/prisma";
import { ALL_DEVICE_PAGE_MODELS, deviceOf } from "@/lib/catalog";
import { resolveModelNames } from "@/lib/deviceSearch";
import { medianPrice, modelWhere } from "@/lib/modelInventory";
import { rethrowDuringBuild } from "@/lib/buildGuard";
import { WATCH_CATALOG, WATCH_INFO, isWatchOS27 } from "@/lib/watchCatalog";
import { WATCH_SPECS } from "@/lib/watchSpecs";
import { specOf } from "@/lib/iphoneSpecs";

/**
 * 機種ページの「世代ごとの相場」「watchOS 27 に対応するいちばん安い機種」（Apple Watch）と
 * 「同じ ○インチの相場」（Galaxy）の数字（2026-11-12〜。見本 .claude/watch-links-mock/）。
 *
 * ビルドは機種ページの数だけ回るので、ページごとに全機種を問い合わせない:
 *   - 機種×容量（Watch はサイズ）の件数は、種類のまとまりごとに groupBy 1回（ワーカーごとに1回だけ。sameBudget の marketOf と同じ作り）
 *   - 中央値は必要になった機種×容量だけ1行取り出し（lib/modelInventory.ts の medianPrice）、ワーカーの中で使い回す
 * 相場の定義は機種ページと同じ（その容量の販売中在庫の中央値）。スペックは公式で確かめた値だけ（lib/watchSpecs.ts・watchCatalog.ts・*Specs.ts）
 */

type Counts = Map<string, Map<number, number>>;

const countsMemo = new Map<string, Promise<Counts>>();
const medianMemo = new Map<string, Promise<number | null>>();

/** models の機種×容量ごとの販売中の件数（groupBy 1回。表記ゆれは resolveModelNames で機種へまとめる） */
function countsOf(key: string, models: string[]): Promise<Counts> {
  let p = countsMemo.get(key);
  if (!p) {
    p = (async () => {
      const namesOf = new Map<string, string[]>();
      for (const m of models) namesOf.set(m, (await resolveModelNames([m])) ?? []);
      const allNames = [...new Set([...namesOf.values()].flat())];
      const groups = await prisma.deviceInventory.groupBy({
        by: ["modelName", "storage"],
        where: { isSoldOut: false, modelName: { in: allNames } },
        _count: { _all: true },
      });
      const result: Counts = new Map();
      for (const [m, names] of namesOf) {
        const set = new Set(names);
        const bySize = new Map<number, number>();
        for (const g of groups) {
          if (!set.has(g.modelName)) continue;
          bySize.set(g.storage, (bySize.get(g.storage) ?? 0) + g._count._all);
        }
        result.set(m, bySize);
      }
      return result;
    })();
    p.catch(() => countsMemo.delete(key));
    countsMemo.set(key, p);
  }
  return p;
}

/** 1機種・1容量の中央値（機種ページの相場と同じ取り方。ワーカーの中で使い回す） */
function medianOf(model: string, storage: number, count: number): Promise<number | null> {
  const key = `${model}:${storage}`;
  let p = medianMemo.get(key);
  if (!p) {
    p = (async () => medianPrice({ AND: [await modelWhere(model), { storage }] }, count))();
    p.catch(() => medianMemo.delete(key));
    medianMemo.set(key, p);
  }
  return p;
}

/** ビルドの時点の日付（JST の M/D） */
export const buildDay = () => new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" });

// ---------------------------------------------------------------- Apple Watch

const WATCH_MODELS_ALL = WATCH_CATALOG.flatMap((s) => s.models);

/** サイズの帯: 小さい方（40〜42mm）・大きい方（44〜46mm）・Ultra（49mm） */
type Band = "small" | "large" | "ultra";
const bandOf = (mm: number): Band => (mm >= 49 ? "ultra" : mm >= 44 ? "large" : "small");
const BAND_LABEL: Record<Band, string> = { small: "40〜42mm", large: "44〜46mm", ultra: "49mm" };

/** 「Apple Watch SE（第2世代）」→「SE（第2世代）」 */
export const watchShort = (model: string) => model.replace(/^Apple Watch\s*/, "");

export type WatchPeerRow = {
  model: string;
  size: number;
  count: number;
  median: number | null;
  /** このページの相場との差（円）。どちらかがないときは null */
  diff: number | null;
  chip: string | null;
  batteryHours: number | null;
  maxNits: number | null;
  watchOS27: boolean;
  ecg: boolean | null;
  alwaysOn: boolean | null;
  current: boolean;
};

export type WatchPeers = {
  /** 「Ultra」「Series」「SE」 */
  family: string;
  bandLabel: string;
  /** このページのサイズ（mm）と相場 */
  size: number;
  median: number;
  /** 同じシリーズの全世代（カタログの順＝新しい順） */
  generations: WatchPeerRow[];
  /** watchOS 27 の線の表（Ultra のページは null）。上が対応機種（安い3機種）、下が非対応 */
  os27: { above: WatchPeerRow[]; below: WatchPeerRow[]; omitted: WatchPeerRow[] } | null;
};

/** 線の表に載せる最小の件数（数件で相場が決まらないように） */
const OS27_MIN_COUNT = 3;
/** 線の上に並べる watchOS 27 対応機種の数・表の最大の行数 */
const OS27_ABOVE = 3;
const OS27_MAX_ROWS = 7;

export async function watchPeers(model: string, size: number | null): Promise<WatchPeers | null> {
  const info = WATCH_INFO[model];
  if (!info || size === null) return null;
  try {
    const counts = await countsOf("watch", WATCH_MODELS_ALL);
    const band = bandOf(size);
    const ownCount = counts.get(model)?.get(size) ?? 0;
    const own = ownCount > 0 ? await medianOf(model, size, ownCount) : null;
    if (own === null) return null;

    const rowOf = async (m: string): Promise<WatchPeerRow | null> => {
      const mmSize = WATCH_INFO[m]?.sizes.find((s) => bandOf(s) === band);
      if (mmSize === undefined) return null;
      const count = counts.get(m)?.get(mmSize) ?? 0;
      const median = count > 0 ? await medianOf(m, mmSize, count) : null;
      const spec = WATCH_SPECS[m];
      return {
        model: m, size: mmSize, count, median,
        diff: median === null ? null : median - own,
        chip: spec?.chip ?? null,
        batteryHours: spec?.batteryHours ?? null,
        maxNits: spec?.maxNits ?? null,
        watchOS27: isWatchOS27(m),
        ecg: spec ? spec.ecg : null,
        alwaysOn: spec ? spec.alwaysOn : null,
        current: m === model,
      };
    };

    const familyModels = WATCH_MODELS_ALL.filter((m) => WATCH_INFO[m].family === info.family);
    const generations = (await Promise.all(familyModels.map(rowOf))).filter((r): r is WatchPeerRow => r !== null);

    let os27: WatchPeers["os27"] = null;
    if (info.family !== "Ultra") {
      const pool = (await Promise.all(WATCH_MODELS_ALL.filter((m) => WATCH_INFO[m].family !== "Ultra").map(rowOf)))
        .filter((r): r is WatchPeerRow => r !== null && r.median !== null && (r.current || r.count >= OS27_MIN_COUNT));
      // 同じ相場なら、このページと同じシリーズを先に（SE のページで SE 第1世代と Series 6 が同額のとき SE を残す）
      const sameFamily = (r: WatchPeerRow) => (WATCH_INFO[r.model].family === info.family ? 0 : 1);
      const byPriceDesc = (a: WatchPeerRow, b: WatchPeerRow) => b.median! - a.median! || sameFamily(a) - sameFamily(b);
      const supported = pool.filter((r) => r.watchOS27).sort((a, b) => a.median! - b.median!);
      const aboveSet = supported.slice(0, OS27_ABOVE);
      const cur = pool.find((r) => r.current);
      if (cur?.watchOS27 && !aboveSet.includes(cur)) aboveSet.push(cur);
      const above = [...aboveSet].sort(byPriceDesc);
      const unsupported = pool.filter((r) => !r.watchOS27).sort(byPriceDesc);
      const room = Math.max(OS27_MAX_ROWS - above.length, 1);
      let below = unsupported.slice(0, room);
      if (cur && !cur.watchOS27 && !below.includes(cur)) below = [...below.slice(0, room - 1), cur].sort(byPriceDesc);
      const omitted = unsupported.filter((r) => !below.includes(r));
      if (above.length > 0) os27 = { above, below, omitted };
    }

    return { family: info.family, bandLabel: BAND_LABEL[band], size, median: own, generations, os27 };
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("watch peers failed:", error);
    return null;
  }
}

// ---------------------------------------------------------------- Galaxy（同じ画面サイズの iPhone・Pixel・Galaxy）

const PHONE_MODELS = ALL_DEVICE_PAGE_MODELS.filter((m) => {
  const d = deviceOf(m);
  return (d === "iphone" || d === "pixel" || d === "galaxy") && specOf(m) !== undefined;
});

/** 同じ画面サイズの幅（インチ）。±0.1 */
const SCREEN_WIDTH = 0.1;
/** 相場が数件の在庫で決まらないように（sameBudget と同じ） */
const SCREEN_MIN_COUNT = 5;
const SCREEN_MAX_ROWS = 6;
/** 同じシリーズの前後以外で、1つのメーカーから足す数 */
const SCREEN_PER_BRAND = 2;

/** 比べる画面（インチ）。折りたたみは内側（メイン）の画面で、折りたたみどうしだけ比べる */
const screenOf = (model: string) => {
  const s = specOf(model);
  if (!s) return null;
  return s.displayInner ? { inch: s.displayInner, fold: true } : { inch: s.display, fold: false };
};

/** Galaxy の系統と世代（「Galaxy S23 Ultra」→ S Ultra・23、「Galaxy Z Fold7」→ Z Fold・7、「Galaxy A55 5G」→ A5・55） */
function galaxyLine(model: string): { line: string; gen: number } | null {
  const m = model.match(/^Galaxy (S|Z Fold|Z Flip|A)(\d+)(.*)$/);
  if (!m) return null;
  const gen = Number(m[2]);
  const suffix = m[3].replace(/\s*5G$/, "").trim();
  const line = m[1] === "A" ? `A${m[2][0]}` : m[1];
  return { line: `${line}|${suffix}`, gen };
}

const brandOf = (model: string) => deviceOf(model);

export type ScreenPeerRow = { model: string; inch: number; median: number; count: number; diff: number; current: boolean };
export type ScreenPeers = { storage: number; minInch: number; maxInch: number; fold: boolean; rows: ScreenPeerRow[] };

export async function screenPeers(model: string, storage: number | null): Promise<ScreenPeers | null> {
  const own = screenOf(model);
  if (!own || storage === null) return null;
  try {
    const counts = await countsOf("phones", PHONE_MODELS);
    const ownCount = counts.get(model)?.get(storage) ?? 0;
    const ownMedian = ownCount > 0 ? await medianOf(model, storage, ownCount) : null;
    if (ownMedian === null) return null;

    const candidates = PHONE_MODELS.filter((m) => {
      if (m === model) return false;
      const s = screenOf(m);
      if (!s || s.fold !== own.fold || Math.abs(s.inch - own.inch) > SCREEN_WIDTH + 1e-9) return false;
      return (counts.get(m)?.get(storage) ?? 0) >= SCREEN_MIN_COUNT;
    });
    const rows: ScreenPeerRow[] = [];
    for (const m of candidates) {
      const count = counts.get(m)!.get(storage)!;
      const median = await medianOf(m, storage, count);
      if (median !== null) rows.push({ model: m, inch: screenOf(m)!.inch, median, count, diff: median - ownMedian, current: false });
    }

    // 同じシリーズの1つ前・1つ後の世代は先に入れる
    const mine = galaxyLine(model);
    const sameLine = mine ? rows.filter((r) => galaxyLine(r.model)?.line === mine.line) : [];
    const prev = sameLine.filter((r) => galaxyLine(r.model)!.gen < mine!.gen).sort((a, b) => galaxyLine(b.model)!.gen - galaxyLine(a.model)!.gen)[0];
    const next = sameLine.filter((r) => galaxyLine(r.model)!.gen > mine!.gen).sort((a, b) => galaxyLine(a.model)!.gen - galaxyLine(b.model)!.gen)[0];
    const picked: ScreenPeerRow[] = [prev, next].filter((r): r is ScreenPeerRow => r !== undefined);
    // 残りは相場の近い順（1つのメーカーから SCREEN_PER_BRAND まで）
    const perBrand = new Map<string, number>();
    for (const r of rows.filter((r) => !picked.includes(r)).sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))) {
      if (picked.length >= SCREEN_MAX_ROWS - 1) break;
      const b = brandOf(r.model);
      if ((perBrand.get(b) ?? 0) >= SCREEN_PER_BRAND) continue;
      perBrand.set(b, (perBrand.get(b) ?? 0) + 1);
      picked.push(r);
    }
    if (picked.length === 0) return null;

    const all = [...picked, { model, inch: own.inch, median: ownMedian, count: ownCount, diff: 0, current: true }]
      .sort((a, b) => b.median - a.median);
    const inches = all.map((r) => r.inch);
    return { storage, minInch: Math.min(...inches), maxInch: Math.max(...inches), fold: own.fold, rows: all };
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("screen peers failed:", error);
    return null;
  }
}
