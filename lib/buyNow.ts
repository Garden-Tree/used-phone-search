import { cache } from "react";
import prisma from "@/lib/prisma";
import { ALL_DEVICE_PAGE_MODELS, modelToSlug } from "@/lib/catalog";
import { ALL_STORAGE } from "@/lib/priceHistory";
import { getModelStats } from "@/lib/modelStats";
import { getModelMarket } from "@/lib/marketStats";
import { yen } from "@/lib/format";
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

/** 価格推移（全容量・Amazon を除く）の最新の記録と、30日前（なければ最も古い記録）の記録 */
const getMedianTrend = cache(async (model: string) => {
  const slug = modelToSlug(model);
  const where = { modelSlug: slug, storage: ALL_STORAGE };
  const latest = await prisma.priceSnapshot.findFirst({ where, orderBy: { date: "desc" }, select: { date: true, medianPrice: true } });
  if (!latest) return null;
  const target = new Date(latest.date);
  target.setUTCDate(target.getUTCDate() - 30);
  const past =
    (await prisma.priceSnapshot.findFirst({ where: { ...where, date: { lte: target } }, orderBy: { date: "desc" }, select: { date: true, medianPrice: true } })) ??
    (await prisma.priceSnapshot.findFirst({ where, orderBy: { date: "asc" }, select: { date: true, medianPrice: true } }));
  if (!past) return null;
  const days = Math.round((latest.date.getTime() - past.date.getTime()) / 86400000);
  return { now: latest.medianPrice, before: past.medianPrice, days };
});

export const getBuyNowNotes = cache(async (model: string): Promise<string[]> => {
  const notes: string[] = [];
  try {
    const stats = await getModelStats(model);
    if (stats.count === 0 || stats.minPrice === null || stats.medianPrice === null) return [];

    // 1. 相場と最安値の差
    const gap = stats.medianPrice - stats.minPrice;
    if (gap > 0) {
      notes.push(`最安値は相場（中央値 ${yen(stats.medianPrice)}）より${yen(gap)}低く、${yen(stats.minPrice)}です。この差は、1台だけの特価やバッテリーの弱い個体が最安値になっているときに大きくなります。`);
    }

    // 2. 30日の値動き
    const trend = await getMedianTrend(model);
    if (trend && trend.days >= 7 && trend.before > 0) {
      const span = trend.days >= 30 ? "この30日" : `記録のある過去${trend.days}日`;
      const diff = trend.now - trend.before;
      const rate = diff / trend.before;
      if (Math.abs(rate) <= 0.02) notes.push(`${span}で、相場はほぼ横ばいです（${yen(trend.before)}から${yen(trend.now)}。変化は2%以内）。`);
      else if (diff < 0) notes.push(`${span}で、相場は${yen(-diff)}下がりました（${yen(trend.before)}から${yen(trend.now)}）。`);
      else notes.push(`${span}で、相場は${yen(diff)}上がりました（${yen(trend.before)}から${yen(trend.now)}）。`);
    }

    // 3. 未使用品（ランクS）との差
    const rankS = stats.byRank.find((r) => r.key === "S");
    const rankA = stats.byRank.find((r) => r.key === "A");
    if (rankS && rankS.minPrice > 0) {
      let s = `未使用品（ランクS）は${yen(rankS.minPrice)}からです。`;
      if (rankA && rankA.minPrice > 0 && rankS.minPrice > rankA.minPrice) {
        s += `中古のランクA（最安${yen(rankA.minPrice)}）との差は${yen(rankS.minPrice - rankA.minPrice)}です。`;
      }
      notes.push(s);
    }

    // 4. 1つ前の世代との差
    const prev = previousGeneration(model);
    if (prev) {
      const market = (await getModelMarket([prev])).get(prev);
      if (market && market.count >= 3) {
        const d = stats.medianPrice - market.medianPrice;
        const rel = d > 0 ? `${model}より${yen(d)}低く` : d < 0 ? `${model}より${yen(-d)}高く` : `${model}と同じで`;
        notes.push(`1世代前の${prev}の相場は${yen(market.medianPrice)}で、${rel}${d === 0 ? "す" : "なっています"}。`);
      }
    }
  } catch (error) {
    rethrowDuringBuild(error);
    console.error("buy-now notes failed:", error);
    return [];
  }
  return notes;
});
