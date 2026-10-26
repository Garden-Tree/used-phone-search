import { cache } from "react";
import prisma from "@/lib/prisma";
import { ALL_DEVICE_PAGE_MODELS, modelToSlug } from "@/lib/catalog";
import { ALL_STORAGE } from "@/lib/priceHistory";
import { getModelStats } from "@/lib/modelStats";
import { getModelMarket } from "@/lib/marketStats";
import { yen } from "@/lib/format";
import { moveOf } from "@/lib/modelGuide";
import { rethrowDuringBuild } from "@/lib/buildGuard";

/**
 * 機種ページの「相場の見方（今日のデータから）」の文章。実データから言えることだけを書く（推測・意見は書かない）。
 * データがない項目は文ごと省く。DB は集計と数行の取得だけ（在庫の行を丸ごと取らない）。この関数では容量に触れない
 */

const stepNumber = (model: string, re: RegExp): string | null => {
  const m = model.match(re);
  if (!m) return null;
  const n = Number(m[2]);
  return n > 1 ? `${m[1]}${n - 1}${m[3]}` : null;
};

/**
 * 1つ前の世代（機種名の規則で決められるものだけ。決められない・カタログにないときは null）。
 * iPhone/Pixel/Galaxy/AQUOS/Watch は番号-1（同じ派生名）、Mac はチップ M(n-1)（同じ派生名）、
 * iPad は「第N世代」-1・M チップ-1、Xperia はローマ数字の1つ前。SE・iPad の A 系など境目が不規則なものは決めない
 */
export function previousGeneration(model: string): string | null {
  let cand: string | null = null;
  if (/^iPhone \d+/.test(model)) cand = stepNumber(model, /^(iPhone )(\d+)(.*)$/);
  else if (/^iPhone SE/.test(model)) cand = stepNumber(model, /^(iPhone SE \(第)(\d+)(世代\))$/);
  else if (/^iPad/.test(model)) {
    cand = stepNumber(model, /^(.*\(第)(\d+)(世代\))$/) ?? stepNumber(model, /^(.*\(M)(\d+)(\))$/);
  } else if (/^Pixel \d+/.test(model)) cand = stepNumber(model, /^(Pixel )(\d+)(.*)$/);
  else if (/^Galaxy/.test(model)) cand = stepNumber(model, /^(Galaxy (?:S|Z Fold|Z Flip|A))(\d+)(.*)$/);
  else if (/^MacBook/.test(model)) cand = stepNumber(model, /^(.* M)(\d)(( Pro| Max)?)$/);
  else if (/^AQUOS/.test(model)) cand = stepNumber(model, /^(AQUOS (?:R|sense|wish))(\d+)(( pro| plus)?)$/);
  else if (/^Apple Watch (Series|Ultra) \d+/.test(model)) cand = stepNumber(model, /^(Apple Watch (?:Series|Ultra) )(\d+)()$/);
  else if (/^Xperia/.test(model)) {
    const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    const m = model.match(/^(Xperia (?:1|5|10|Ace) )([IVX]+)$/);
    const i = m ? ROMAN.indexOf(m[2]) : -1;
    if (m && i > 1) cand = `${m[1]}${ROMAN[i - 1]}`;
  }
  return cand && ALL_DEVICE_PAGE_MODELS.includes(cand) ? cand : null;
}

/** 価格推移（Amazon を除く）の最新の記録と、30日前（なければ最も古い記録）の記録。相場と同じ容量（なければ全容量）で比べる */
const getMedianTrend = cache(async (model: string, storage: number | null) => {
  const slug = modelToSlug(model);
  const where = { modelSlug: slug, storage: storage ?? ALL_STORAGE };
  const latest = await prisma.priceSnapshot.findFirst({ where, orderBy: { date: "desc" }, select: { date: true, medianPrice: true, count: true } });
  if (!latest) return null;
  const target = new Date(latest.date);
  target.setUTCDate(target.getUTCDate() - 30);
  const past =
    (await prisma.priceSnapshot.findFirst({ where: { ...where, date: { lte: target } }, orderBy: { date: "desc" }, select: { date: true, medianPrice: true, count: true } })) ??
    (await prisma.priceSnapshot.findFirst({ where, orderBy: { date: "asc" }, select: { date: true, medianPrice: true, count: true } }));
  if (!past) return null;
  // 在庫が数件の日どうしの相場は1台で大きく動くので、値動きとして出さない（lib/modelGuide.ts の MIN_COUNT_FOR_TREND と同じ 10 件。10/23〜）
  if (latest.count < 10 || past.count < 10) return null;
  const days = Math.round((latest.date.getTime() - past.date.getTime()) / 86400000);
  return { now: latest.medianPrice, before: past.medianPrice, days };
});

/** 数字タイル（getBuyNowStats）の元になる、今日のデータから言える事実。DB の読みは1回分 */
type BuyNowFacts = {
  min: number;
  median: number;
  /** 相場の容量（在庫がいちばん多い容量） */
  medianStorage: number | null;
  trend: { now: number; before: number; days: number } | null;
  rankS: { minPrice: number } | null;
  rankA: { minPrice: number } | null;
  prev: { name: string; median: number; storage: number | null } | null;
};

const getBuyNowFacts = cache(async (model: string): Promise<BuyNowFacts | null> => {
  const stats = await getModelStats(model);
  if (stats.count === 0 || stats.minPrice === null || stats.medianPrice === null) return null;
  const trend = await getMedianTrend(model, stats.medianStorage);
  const s = stats.byRank.find((r) => r.key === "S");
  const a = stats.byRank.find((r) => r.key === "A");
  let prev: BuyNowFacts["prev"] = null;
  const prevName = previousGeneration(model);
  if (prevName) {
    const market = (await getModelMarket([prevName])).get(prevName);
    if (market && market.count >= 3) prev = { name: prevName, median: market.medianPrice, storage: market.medianStorage };
  }
  return {
    min: stats.minPrice,
    median: stats.medianPrice,
    medianStorage: stats.medianStorage,
    trend,
    rankS: s && s.minPrice > 0 ? { minPrice: s.minPrice } : null,
    rankA: a && a.minPrice > 0 ? { minPrice: a.minPrice } : null,
    prev,
  };
});

/** 機種ページの数字タイル1枚分。tone: up=上昇（赤）・down=下落／お得（緑青）・flat=色なし */
export type StatTile = { label: string; value: string; sub?: string; tone: "up" | "down" | "flat" };

const signedYen = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toLocaleString()}円`;

/**
 * 数字タイル（最大4枚）。データが無い項目は出さない（推測は書かない）。10/27〜 値動きは矢印と金額だけ（「↘ −2,300円」）、注記は最小限
 */
export const getBuyNowStats = cache(async (model: string): Promise<StatTile[]> => {
  const tiles: StatTile[] = [];
  try {
    const f = await getBuyNowFacts(model);
    if (!f) return [];

    // 1. 相場の変化（記録が7日分以上あるとき）。容量は要約カードの「相場（128GB）」に1回だけ書く
    const t = f.trend;
    if (t && t.days >= 7 && t.before > 0) {
      const m = moveOf(t.now - t.before, t.before);
      tiles.push({ label: `${t.days >= 30 ? "30日" : `${t.days}日`}の相場`, value: m.text, tone: m.tone });
    }

    // 2. 最安値と相場の差
    const gap = f.median - f.min;
    if (gap > 0) tiles.push({ label: "最安値と相場の差", value: yen(gap), tone: "down" });

    // 3. 未使用品（ランクS）
    if (f.rankS) {
      const d = f.rankA && f.rankS.minPrice > f.rankA.minPrice ? f.rankS.minPrice - f.rankA.minPrice : null;
      tiles.push({ label: "未使用品（ランクS）", value: `${yen(f.rankS.minPrice)}〜`, sub: d !== null ? `Aより +${d.toLocaleString()}円` : undefined, tone: "flat" });
    }

    // 4. 1世代前の相場（このモデルとの差は、1世代前から見た値）
    if (f.prev) {
      tiles.push({ label: `1世代前 ${f.prev.name}`, value: yen(f.prev.median), sub: `差 ${signedYen(f.prev.median - f.median)}`, tone: "flat" });
    }
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("buy-now stats failed:", error);
    return [];
  }
  return tiles.slice(0, 4);
});
