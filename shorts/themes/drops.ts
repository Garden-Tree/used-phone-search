/** テーマ「今週いちばん値下がりした中古iPhone」: DB の集計 → 台本 */
import { getPriceDrops } from "@/lib/marketStats";
import { ALL_STORAGE, getPriceHistory } from "@/lib/priceHistory";
import { ALL_CATALOG_MODELS, modelPagePath, modelToSlug, slugToModel } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import { MONTH_PERIOD, WEEK_PERIOD, type Script } from "../types";

const man = (n: number) => n.toLocaleString();
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

const utm = (date: string) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}`;

export async function buildDropsScript(date: string, days = 7): Promise<Script> {
  // 値下がり（days 日前との比較）から iOS 27 対応の iPhone だけ上位5つ（非対応の古い機種はすすめない）
  const period = days === 7 ? WEEK_PERIOD : MONTH_PERIOD(days);
  const supported = new Set(ALL_CATALOG_MODELS.map(modelToSlug));
  const all = await getPriceDrops(days, 60, 5);
  const drops = all.filter((d) => supported.has(d.modelSlug)).slice(0, 5);
  if (drops.length < 3) {
    throw new Error(`値下がりした iOS 27 対応の iPhone が ${drops.length} 機種しかありません（3機種以上必要）。価格推移の記録が7日分ない可能性があります`);
  }
  const top = drops[0];
  const nameOf = (slug: string) => slugToModel(slug) ?? slug;
  const topModel = nameOf(top.modelSlug);
  const topStorage = storageLabel(top.storage, topModel);

  // 1位の推移（その容量・比べた期間だけ）。全容量は使わない
  const history = await getPriceHistory(top.modelSlug, 30);
  // 在庫の件数がふだんの半分未満の日（記録を始めた日・取り込みの失敗）は相場がぶれるので除く
  const raw = top.storage === ALL_STORAGE ? [] : (history[top.storage] ?? []);
  const typical = [...raw].map((p) => p.count).sort((a, b) => a - b)[Math.floor(raw.length / 2)] ?? 0;
  // 推移は比べた期間だけ（期間の外の上下を「大きく下がった日」と読まないように。10/24）
  const points = raw.filter((p) => p.count >= typical / 2 && p.date >= top.fromDate.slice(0, 10)).map((p) => ({ date: p.date, median: p.medianPrice }));

  const shopCount = (await activeShops(SHOPS)).length;

  // コメントの下書き（人が書き換える前提）。古めの機種はバッテリーと状態ランクの注意
  // iPhone Air は番号がないので新しい方（17 と同じ年）に数える
  const gen = topModel.includes("iPhone Air") ? 17 : Number(topModel.match(/iPhone (\d+)/)?.[1] ?? 0);
  const lines = gen >= 15
    ? ["安くなった週でも", "バッテリー85%以上を", "選ぶのがおすすめ"]
    : ["古めの機種は", "バッテリー85%以上と", "状態ランクを確認"];

  const rawTitle = `${topModel}、${period.span}−${man(top.drop)}円！${period.name}の中古iPhone値下がりランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `${period.span}−${man(top.drop)}円！${period.name}の中古iPhone値下がりランキング`;
  const description = [
    `${period.lead}いちばん値下がりした中古iPhoneのランキングです。1位は${topModel}（${topStorage}）で、相場が${man(top.before)}円から${man(top.after)}円へ（−${man(top.drop)}円・−${top.rate.toFixed(1)}%）。`,
    "",
    // 動画は3位までなので、説明欄も3位まで（10/21 ユーザーの指示）
    ...drops.slice(0, 3).map((d, i) => `${i + 1}位 ${nameOf(d.modelSlug)}（${storageLabel(d.storage, nameOf(d.modelSlug))}） −${d.rate.toFixed(1)}%（−${man(d.drop)}円）`),
    "",
    `対象: iOS 27 対応の iPhone。データ: 大手中古ショップ${shopCount}店の在庫の中央値（相場＝在庫がいちばん多い容量の中央値）。${md(top.fromDate)}〜${md(top.toDate)}の比較。`,
    "",
    // 説明欄のリンク。YouTube から来た人を GA で数えるため utm を付ける（canonical は印なしなので検索には影響しない）
    `${topModel}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(topModel)}?${utm(date)}`,
    `全機種の中古相場: https://used.gadelog.com/?${utm(date)}`,
  ].join("\n");

  return {
    theme: "drops",
    date,
    fromDate: top.fromDate,
    toDate: top.toDate,
    shopCount,
    ...(days === 7 ? {} : { period }),
    scenes: {
      hook: { label: `${period.lead}いちばん値下がりした中古iPhone`, model: topModel, storage: topStorage, drop: top.drop, before: top.before, after: top.after },
      ranking: {
        title: `${period.name}の値下がり率 TOP5`,
        items: drops.map((d) => ({ model: nameOf(d.modelSlug), storage: storageLabel(d.storage, nameOf(d.modelSlug)), before: d.before, after: d.after, drop: d.drop, rate: d.rate })),
      },
      trend: { model: topModel, storage: topStorage, days: Math.max(points.length - 1, 0), points },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${date.replace(/-/g, "/")}`,
      },
    },
    youtube: { title, description, hashtags: ["#中古iPhone", "#iPhone"] },
  };
}
