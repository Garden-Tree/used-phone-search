/**
 * テーマ「中古でいちばん出回っている iPhone／Android は？ 在庫数ランキング」（10/27〜）。
 * stock＝iPhone、stockandroid＝Android（Pixel・Galaxy・Xperia・AQUOS をまとめて）、stockmac＝MacBook（10/29〜・lib/macCatalog.ts）、
 * stockipad＝iPad（11/2〜・lib/ipadCatalog.ts）、stockwatch＝Apple Watch（11/2〜・lib/watchCatalog.ts。DB の storage はケースの mm で、相場は在庫がいちばん多いケースのサイズの中央値）。場面・行・選び方は同じで、機種の範囲・ひと言・説明欄だけ違う
 *
 * 選び方（台本・説明欄・動画で同じ。主観は入れない）:
 * - 機種はサイトに機種ページのある機種（iPhone は lib/catalog.ts の ALL_PAGE_MODELS、Android は lib/pixelCatalog.ts・galaxyCatalog.ts・
 *   xperiaCatalog.ts・aquosCatalog.ts の表記）。DB のモデル名の表記ゆれは resolveModelNames で機種にまとめる（サイトの件数と同じ）
 * - 件数は販売中（isSoldOut=false）でジャンク品（J・ジャンク。lib/budgetStats.ts の NOT_JUNK）を除いた在庫。多い順（同じなら相場の高い方）
 * - 割合は、同じ範囲の機種（iPhone 全機種／Android 4ブランドの全機種）の件数の合計に対して（%・小数1桁）
 * - 相場はサイトと同じ「在庫がいちばん多い容量の中央値」（lib/marketStats.ts の getModelMarket と同じ primaryMedian。機種ページと同じ数字）
 * DB はモデル名ごとの集計（groupBy）1回と、上位の機種の容量別の集計・中央値の1行だけ。在庫の行を丸ごと取らない
 */
import prisma from "@/lib/prisma";
import { ALL_PAGE_MODELS, modelPagePath } from "@/lib/catalog";
import { storageLabel } from "@/lib/format";
import { resolveModelNames } from "@/lib/deviceSearch";
import { modelWhere, primaryMedian } from "@/lib/modelInventory";
import { NOT_JUNK } from "@/lib/budgetStats";
import { PIXEL_MODELS, isPixel, jaMonth, updateUntil } from "@/lib/pixelCatalog";
import { GALAXY_MODELS } from "@/lib/galaxyCatalog";
import { XPERIA_MODELS } from "@/lib/xperiaCatalog";
import { AQUOS_MODELS } from "@/lib/aquosCatalog";
import { MAC_MODELS } from "@/lib/macCatalog";
import { IPAD_MODELS } from "@/lib/ipadCatalog";
import { WATCH_MODELS } from "@/lib/watchCatalog";
import { GALAXY_SHOPS, IPAD_SHOPS, PIXEL_SHOPS, SHOPS } from "@/lib/shops";
import { activeAquosShops, activeMacShops, activeShops, activeWatchShops, activeXperiaShops } from "@/lib/activeShops";
import type { StockRow, StockScript } from "../types";

export type StockKind = "iphone" | "android" | "mac" | "ipad" | "watch" | "pixel" | "pro" | "galaxy" | "mini" | "xperia" | "aquos" | "ipadpro" | "ipadair";
const SHOWN = 3;

const man = (n: number) => n.toLocaleString();
const slash = (iso: string) => iso.replace(/-/g, "/");
const utm = (date: string, theme: StockScript["theme"]) => `utm_source=youtube&utm_medium=social&utm_campaign=shorts_${date.replace(/-/g, "")}_${theme}`;

/** 範囲ごとの機種・DB のモデル名の頭・呼び名 */
const KINDS = {
  iphone: { theme: "stock", models: ALL_PAGE_MODELS, prefixes: ["iPhone"], label: "iPhone" },
  android: { theme: "stockandroid", models: [...PIXEL_MODELS, ...GALAXY_MODELS, ...XPERIA_MODELS, ...AQUOS_MODELS], prefixes: ["Pixel", "Galaxy", "Xperia", "AQUOS"], label: "Android" },
  // stockmac（10/29〜）: MacBook（lib/macCatalog.ts の MAC_MODELS。Apple シリコンの Air・Pro と Neo）。相場の容量は SSD
  mac: { theme: "stockmac", models: MAC_MODELS, prefixes: ["MacBook"], label: "MacBook" },
  // stockipad・stockwatch（11/2〜）: iPad（lib/ipadCatalog.ts の IPAD_MODELS）・Apple Watch（lib/watchCatalog.ts の WATCH_MODELS。容量の代わりにケースの mm）
  ipad: { theme: "stockipad", models: IPAD_MODELS, prefixes: ["iPad"], label: "iPad" },
  watch: { theme: "stockwatch", models: WATCH_MODELS, prefixes: ["Apple Watch"], label: "Apple Watch" },
  // stockpixel（11/3〜）: Google Pixel だけ（lib/pixelCatalog.ts の PIXEL_MODELS）。Android 全体の回（1位 Galaxy A25 5G）と1位が変わる
  pixel: { theme: "stockpixel", models: PIXEL_MODELS, prefixes: ["Pixel"], label: "Google Pixel" },
  // stockpro（11/3〜）: iPhone の Pro・Pro Max だけ（機種ページのある機種）。iPhone 全体の回（1位 SE 第3世代）と1位が変わる
  // stockgalaxy（11/4〜）: Galaxy だけ（lib/galaxyCatalog.ts の GALAXY_MODELS。S・A・Z）。Android 全体の回（1位 Galaxy A25 5G・10/29）と見せ方を変える
  galaxy: { theme: "stockgalaxy", models: GALAXY_MODELS, prefixes: ["Galaxy"], label: "Galaxy" },
  // stockmini（11/5〜）: iPad mini だけ（A17 Pro・第6世代・第5世代）。新型 A20 Pro の発売日（11/6）の夜の回。iPad 全体の回（1位 第8世代）と1位が変わる
  mini: { theme: "stockmini", models: IPAD_MODELS.filter((m) => m.startsWith("iPad mini")), prefixes: ["iPad mini"], label: "iPad mini" },
  // stockxperia（11/5〜）: Xperia だけ（lib/xperiaCatalog.ts の XPERIA_MODELS）。在庫数の型でまだ出していない種類
  xperia: { theme: "stockxperia", models: XPERIA_MODELS, prefixes: ["Xperia"], label: "Xperia" },
  // stockaquos（11/5〜）: AQUOS だけ（lib/aquosCatalog.ts の AQUOS_MODELS）
  aquos: { theme: "stockaquos", models: AQUOS_MODELS, prefixes: ["AQUOS"], label: "AQUOS" },
  // stockipadpro（11/5〜）: iPad Pro だけ
  ipadpro: { theme: "stockipadpro", models: IPAD_MODELS.filter((m) => m.startsWith("iPad Pro")), prefixes: ["iPad Pro"], label: "iPad Pro" },
  // stockipadair（11/8〜）: iPad Air だけ
  ipadair: { theme: "stockipadair", models: IPAD_MODELS.filter((m) => m.startsWith("iPad Air")), prefixes: ["iPad Air"], label: "iPad Air" },
  pro: { theme: "stockpro", models: ALL_PAGE_MODELS.filter((m) => /\sPro( Max)?$/.test(m)), prefixes: ["iPhone"], label: "iPhone Pro" },
} as const;

/** "iPhone 13" → "13"・"iPhone SE (第3世代)" → "SE（第3世代）"（タイトルの答え。iPhone は「中古でいちばん多いiPhoneは」に続ける） */
const titleName = (kind: StockKind, model: string) => (kind === "iphone" || kind === "pro" ? model.replace(/^iPhone\s+/, "").replace(/\s*\((第\d世代)\)$/, "（$1）") : kind === "mac" ? model.replace(/^MacBook\s+/, "")
  // "iPad (第9世代)" → "iPad（第9世代）"・"Apple Watch Series 9" → "Series 9"
  : kind === "xperia" ? model.replace(/^Xperia\s+/, "") : kind === "aquos" ? model.replace(/^AQUOS\s+/, "") : kind === "ipadpro" ? model.replace(/^iPad Pro\s+/, "").replace(/\s*\(([^)]+)\)$/, "（$1）") : kind === "ipadair" ? model.replace(/^iPad Air\s*/, "").replace(/^\(([^)]+)\)$/, "$1").replace(/\s*\(([^)]+)\)$/, "（$1）") : kind === "mini" ? model.replace(/^iPad mini\s*\(([^)]+)\)$/, "$1") : kind === "ipad" ? model.replace(/\s*\(([^)]+)\)$/, "（$1）") : kind === "watch" ? model.replace(/^Apple Watch\s+/, "") : kind === "galaxy" ? model.replace(/^Galaxy\s+/, "") : model);

export async function buildStockScript(date: string, kind: StockKind): Promise<StockScript> {
  const k = KINDS[kind];
  // モデル名ごとの件数（ジャンク品を除く販売中）。1回の groupBy で範囲の全モデル名を数え、表記ゆれは機種へまとめる
  const groups = await prisma.deviceInventory.groupBy({
    by: ["modelName"],
    where: { isSoldOut: false, ...NOT_JUNK, OR: k.prefixes.map((p) => ({ modelName: { startsWith: p } })) },
    _count: { _all: true },
  });
  const byName = new Map(groups.map((g) => [g.modelName, g._count._all]));
  const owner = new Map<string, string[]>();
  const counts: { model: string; count: number; names: string[] }[] = [];
  for (const model of k.models) {
    const names = ((await resolveModelNames([model])) ?? []).filter((n) => byName.has(n));
    names.forEach((n) => owner.set(n, [...(owner.get(n) ?? []), model]));
    const count = names.reduce((a, n) => a + (byName.get(n) ?? 0), 0);
    if (count > 0) counts.push({ model, count, names });
  }
  // 確かめ: 2つの機種に数えたモデル名（二重に数える）・どの機種にも入らないモデル名（表記ゆれで落ちた在庫）
  for (const [name, models] of owner) if (models.length > 1) console.log(`  ★注意: 「${name}」を ${models.join("・")} の両方に数えています`);
  const orphans = [...byName].filter(([n]) => !owner.has(n)).sort((a, b) => b[1] - a[1]);
  if (orphans.length) console.log(`  機種ページのないモデル名（合計に入れない）: ${orphans.map(([n, c]) => `「${n}」${c}件`).join("・")}`);
  const total = counts.reduce((a, r) => a + r.count, 0);
  if (counts.length < SHOWN) throw new Error(`在庫のある${k.label}が ${counts.length} 機種しかありません（${SHOWN}機種以上必要）`);
  counts.sort((a, b) => b.count - a.count);
  counts.slice(0, 8).forEach((r, i) => console.log(`  ${i + 1}. ${r.model} ${man(r.count)}件（${(Math.round((r.count / total) * 1000) / 10).toFixed(1)}%）${r.names.length > 1 ? ` ← モデル名 ${r.names.map((n) => `「${n}」${byName.get(n)}件`).join("・")}` : ""}`));
  console.log(`  合計 ${man(total)}件（${counts.length}機種）`);

  // 上位だけ相場（機種ページと同じ primaryMedian）。同じ件数が3位の境にあれば、相場の高い方を上にする
  const cut = counts.filter((r) => r.count >= counts[SHOWN - 1].count);
  const rows: StockRow[] = [];
  for (const r of cut) {
    const p = await primaryMedian(await modelWhere(r.model));
    if (!p) throw new Error(`${r.model} の相場が取れません`);
    rows.push({ model: r.model, count: r.count, share: Math.round((r.count / total) * 1000) / 10, storage: storageLabel(p.storage, r.model), storageGb: p.storage, median: p.price, storageCount: p.count });
  }
  rows.sort((a, b) => b.count - a.count || b.median - a.median);
  const items = rows.slice(0, SHOWN);
  const top = items[0];

  const shops = kind === "iphone" || kind === "pro"
    ? await activeShops(SHOPS)
    : kind === "mac" ? await activeMacShops()
    : kind === "ipad" || kind === "mini" || kind === "ipadpro" || kind === "ipadair" ? await activeShops(IPAD_SHOPS)
    : kind === "watch" ? await activeWatchShops()
    : kind === "pixel" ? await activeShops(PIXEL_SHOPS)
    : kind === "galaxy" ? await activeShops(GALAXY_SHOPS)
    : kind === "xperia" ? await activeXperiaShops()
    : kind === "aquos" ? await activeAquosShops()
    : [...(await activeShops(PIXEL_SHOPS)), ...(await activeShops(GALAXY_SHOPS)), ...(await activeXperiaShops()), ...(await activeAquosShops())];
  const shopCount = new Set(shops.map((s) => s.name)).size;

  // 検品担当のひと言の下書き（1行16字以内・3行まで）。数字は入れない（画面と声に件数がある）
  // iPhone: 在庫が多い機種は同じ機種の中で電池・保証を比べて選べる。Android: アップデートの期限は機種で違う（Pixel は Google 公式の保証、Galaxy は公式の保証期間が出ていない）
  const pixelUntil = (kind === "android" || kind === "pixel") && isPixel(top.model) ? updateUntil(top.model) : undefined;
  // Mac: Apple シリコンの MacBook はメモリを後から増やせない。在庫が多い機種はメモリ・SSD の構成を選べる
  const lines = kind === "iphone" || kind === "pro"
    ? ["在庫が多い機種ほど", "電池の%と保証を", "比べて選べます"]
    : kind === "mac" ? ["在庫が多い機種ほど", "メモリとSSDの", "構成を選べます"]
    // iPad: 同じ機種でも Wi-Fi と Cellular・容量が分かれる。Watch: 中古はバンド・充電ケーブルが付かない在庫もある（watchgen と同じ声かけ）
    : kind === "ipad" || kind === "ipadpro" || kind === "ipadair" ? ["在庫が多い機種ほど", "容量と通信方式を", "選んで買えます"]
    : kind === "watch" ? ["中古のWatchは", "電池の最大容量と", "バンドの付属を確認"]
    // Galaxy: 中古はキャリア版が多い（galaxybudget と同じ声かけ）
    // iPad mini: 世代で使える Pencil が違う（ipadbudget と同じ声かけ・lib/ipadPencil.ts）
    : kind === "xperia" || kind === "aquos" ? ["キャリア版は", "使う回線に対応か", "確認しましょう"]
    : kind === "mini" ? ["iPad miniは世代で", "使えるPencilが", "違います"]
    : kind === "galaxy" ? ["キャリア版は", "使う回線に対応か", "確認しましょう"]
    : pixelUntil
      ? [`${top.model}は`, "アップデート保証が", `${jaMonth(pixelUntil)}まで`]
      : ["Androidは機種ごとに", "アップデートの期限を", "確認しましょう"];
  if (pixelUntil) console.log(`  アップデート保証: ${top.model} ${jaMonth(pixelUntil)}まで（Google 公式）`);

  const theme = k.theme;
  const rawTitle = `中古でいちばん多い${k.label}は${titleName(kind, top.model)}！在庫${man(top.count)}件ランキング`;
  const title = rawTitle.length <= 60 ? rawTitle : `中古でいちばん多い${k.label}は？在庫${man(top.count)}件ランキング`;
  const rowText = (r: StockRow, i: number) => `${i + 1}位 ${r.model} 在庫${man(r.count)}件（${r.share.toFixed(1)}%）・相場${man(r.median)}円（${r.storage}）`;
  const scope = kind === "iphone" ? "iPhone" : kind === "pro" ? "iPhone Pro（Pro・Pro Max）" : kind === "mac" ? "MacBook（Air・Pro・Neo）" : kind === "ipad" ? "iPad（無印・Air・Pro・mini）" : kind === "xperia" ? "Xperia" : kind === "aquos" ? "AQUOS" : kind === "ipadpro" ? "iPad Pro" : kind === "ipadair" ? "iPad Air" : kind === "mini" ? "iPad mini（A17 Pro・第6世代・第5世代）" : kind === "watch" ? "Apple Watch（Series・Ultra・SE）" : kind === "pixel" ? "Google Pixel" : kind === "galaxy" ? "Galaxy（S・A・Z）" : "Android（Pixel・Galaxy・Xperia・AQUOS）";
  const description = [
    `中古でいちばん出回っている${scope}は？ 大手中古ショップの在庫の数のランキングです。1位は${top.model}で、在庫${man(top.count)}件。${k.label}全体の${top.share.toFixed(1)}%です。相場は${kind === "mac" ? "SSD " : kind === "watch" ? "ケース " : ""}${top.storage}で${man(top.median)}円。`,
    "",
    ...items.map(rowText),
    "",
    `選び方: サイトに機種ページのある${scope}の${counts.length}機種で、販売中の在庫からジャンク品を除いた件数の多い順。割合はその合計${man(total)}件に対して。相場は在庫がいちばん多い${kind === "watch" ? "ケースのサイズ" : "容量"}の中央値（機種ページと同じ）。データ: 大手中古ショップ${shopCount}店の在庫（${slash(date)}時点）。`,
    "",
    // utm で YouTube から来た人を GA で数える（canonical は印なしなので検索には影響しない）
    `${top.model}の店ごとの在庫と最安値: https://used.gadelog.com${modelPagePath(top.model)}?${utm(date, theme)}`,
    kind === "mac" ? `中古MacBookの全機種の相場: https://used.gadelog.com/mac?${utm(date, theme)}`
    : kind === "ipad" || kind === "mini" ? `中古iPadの全機種の相場: https://used.gadelog.com/ipad?${utm(date, theme)}`
    : kind === "watch" ? `Apple Watch 全機種の中古相場: https://used.gadelog.com/watch?${utm(date, theme)}`
    : kind === "pixel" ? `Google Pixel 全機種の中古相場・アップデート保証の期限: https://used.gadelog.com/pixel?${utm(date, theme)}`
    : kind === "galaxy" ? `Galaxy 全機種の中古相場: https://used.gadelog.com/galaxy?${utm(date, theme)}`
    : kind === "xperia" ? `Xperia 全機種の中古相場: https://used.gadelog.com/xperia?${utm(date, theme)}`
    : kind === "aquos" ? `AQUOS 全機種の中古相場: https://used.gadelog.com/aquos?${utm(date, theme)}`
    : kind === "ipadpro" || kind === "ipadair" ? `iPad 全機種の中古相場: https://used.gadelog.com/ipad?${utm(date, theme)}`
    : `全機種の中古相場: https://used.gadelog.com/?${utm(date, theme)}`,
  ].join("\n");

  return {
    theme,
    date,
    shopCount,
    scenes: {
      total,
      modelCount: counts.length,
      ranking: { items },
      comment: { speaker: "検品担当", lines },
      outro: {
        lines: ["全機種の相場は", "プロフィールのリンクから"],
        url: "used.gadelog.com",
        note: `大手中古ショップ${shopCount}店の在庫から・${slash(date)}`,
        question: "あなたなら どれにする？",
      },
    },
    youtube: { title, description, hashtags: kind === "pro" ? ["#中古iPhone", "#iPhonePro"] : kind === "iphone" ? ["#中古iPhone", "#iPhone"] : kind === "mac" ? ["#MacBook", "#中古MacBook"] : kind === "xperia" ? ["#Xperia", "#中古スマホ"] : kind === "aquos" ? ["#AQUOS", "#中古スマホ"] : kind === "ipadpro" ? ["#iPadPro", "#中古iPad"] : kind === "ipadair" ? ["#iPadAir", "#中古iPad"] : kind === "mini" ? ["#iPadmini", "#中古iPad"] : kind === "ipad" ? ["#iPad", "#中古iPad"] : kind === "watch" ? ["#AppleWatch", "#中古"] : kind === "pixel" ? ["#Pixel", "#中古スマホ"] : kind === "galaxy" ? ["#Galaxy", "#中古スマホ"] : ["#中古スマホ", "#Android"] },
  };
}
