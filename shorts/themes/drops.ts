/** テーマ「今週いちばん値下がりした中古iPhone」: DB の集計 → 台本 */
import { getPriceDrops } from "@/lib/marketStats";
import { ALL_STORAGE, getPriceHistory } from "@/lib/priceHistory";
import { ALL_CATALOG_MODELS, modelToSlug, slugToModel } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { SHOPS } from "@/lib/shops";
import { activeShops } from "@/lib/activeShops";
import type { Script } from "../types";

const man = (n: number) => n.toLocaleString();
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

export async function buildDropsScript(date: string): Promise<Script> {
  // 値下がり（7日前との比較）から iOS 27 対応の iPhone だけ上位5つ（非対応の古い機種はすすめない）
  const supported = new Set(ALL_CATALOG_MODELS.map(modelToSlug));
  const all = await getPriceDrops(7, 40, 5);
  const drops = all.filter((d) => supported.has(d.modelSlug)).slice(0, 5);
  if (drops.length < 3) {
    throw new Error(`値下がりした iOS 27 対応の iPhone が ${drops.length} 機種しかありません（3機種以上必要）。価格推移の記録が7日分ない可能性があります`);
  }
  const top = drops[0];
  const nameOf = (slug: string) => slugToModel(slug) ?? slug;
  const topModel = nameOf(top.modelSlug);
  const topStorage = storageLabel(top.storage, topModel);

  // 1位の30日の推移（その容量）。全容量は使わない
  const history = await getPriceHistory(top.modelSlug, 30);
  // 在庫の件数がふだんの半分未満の日（記録を始めた日・取り込みの失敗）は相場がぶれるので除く
  const raw = top.storage === ALL_STORAGE ? [] : (history[top.storage] ?? []);
  const typical = [...raw].map((p) => p.count).sort((a, b) => a - b)[Math.floor(raw.length / 2)] ?? 0;
  const points = raw.filter((p) => p.count >= typical / 2).map((p) => ({ date: p.date, median: p.medianPrice }));

  const shopCount = (await activeShops(SHOPS)).length;

  // コメントの下書き（人が書き換える前提）。古めの機種はバッテリーと状態ランクの注意
  const gen = Number(topModel.match(/iPhone (\d+)/)?.[1] ?? 0);
  const lines = gen >= 15
    ? ["安くなった週でも", "バッテリー85%以上を", "選ぶのがおすすめ"]
    : ["古めの機種は", "バッテリー85%以上と", "状態ランクを確認"];

  const rawTitle = `${topModel}、1週間で−${man(top.drop)}円！今週の中古iPhone値下がりランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `1週間で−${man(top.drop)}円！今週の中古iPhone値下がりランキング`;
  const description = [
    `今週いちばん値下がりした中古iPhoneのランキングです。1位は${topModel}（${topStorage}）で、相場が${man(top.before)}円から${man(top.after)}円へ（−${man(top.drop)}円・−${top.rate.toFixed(1)}%）。`,
    "",
    ...drops.map((d, i) => `${i + 1}位 ${nameOf(d.modelSlug)}（${storageLabel(d.storage, nameOf(d.modelSlug))}） −${d.rate.toFixed(1)}%（−${man(d.drop)}円）`),
    "",
    `対象: iOS 27 対応の iPhone。データ: 大手中古ショップ${shopCount}店の在庫の中央値（相場＝在庫がいちばん多い容量の中央値）。${md(top.fromDate)}〜${md(top.toDate)}の比較。`,
    "全機種の相場はプロフィールのリンクから（used.gadelog.com）",
  ].join("\n");

  return {
    theme: "drops",
    date,
    fromDate: top.fromDate,
    toDate: top.toDate,
    shopCount,
    scenes: {
      hook: { label: "今週いちばん値下がりした中古iPhone", model: topModel, storage: topStorage, drop: top.drop, before: top.before, after: top.after },
      ranking: {
        title: "1週間の値下がり率 TOP5",
        items: drops.map((d) => ({ model: nameOf(d.modelSlug), storage: storageLabel(d.storage, nameOf(d.modelSlug)), before: d.before, after: d.after, drop: d.drop, rate: d.rate })),
      },
      trend: { model: topModel, storage: topStorage, days: 30, points },
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
