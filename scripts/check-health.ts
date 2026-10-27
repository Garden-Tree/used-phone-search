/**
 * データ更新の監視（GitHub Actions のビルド前に実行）。問題があれば一覧を出して終了コード 1 にする
 * （Actions の失敗通知で気づける。サイトの書き出し・配置はそのまま続ける）。
 *
 * 一時的な取得の失敗（1店の 403・429・タイムアウト）で毎回ジョブを赤くしないよう、警告と失敗を分ける（docs/operations.md）:
 *   失敗 … lib/health.ts の問題（24時間更新なし・価格推移の停止・DB に接続できない）
 *          ／ 1店でも最終更新が FAIL_HOURS より古い（取得が2周期続けて止まった）
 *          ／ WARN_HOURS より古い店が2店以上（まとめて止まった）
 *          ／ 「〇〇 が0件」が前回の実行（公開中の /health.json）にもあった（2回続いた）
 *   警告 … 最終更新が WARN_HOURS より古い店が1店だけ ／ 「〇〇 が0件」が今回だけ
 *          ／ 在庫を全部隠した店（取得が12時間止まり scraper/common.py の hide_stale_inventory が隠した）の更新なし
 * Amazon は取得を1日2〜3回に間引くので、年齢の判定から外す（lib/health.ts の24時間判定だけ）。
 *   npx tsx scripts/check-health.ts [--previous <health.json のパスか URL>] [--report <health.json のパス>]
 *   --report … DB を読まずに、その結果で判定だけ試す（判定の確認用）
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { AMAZON_SHOP_NAMES } from "@/lib/amazonShops";
import { checkHealth, type HealthReport } from "@/lib/health";
import prisma from "@/lib/prisma";

// 楽天は6時間ごとに取り込む（取り込み直後〜6.5時間が普段の古さ）。1周期抜けると約12.5時間、2周期で約18.5時間。
// スクレイパー・Yahoo は毎回（3〜6時間ごと）取り込むので、2周期抜けた時点で 13 時間前後になる
const WARN_HOURS = 8;
const FAIL_HOURS = 13;
// 中古パソコンの店（PC WRAP・Qualit。DeviceInventory には Mac だけ入る）は前回から11時間たってから取る（1日2回・.github/workflows/scraper.yaml「中古パソコンの取得」）。
// 普段の古さが17時間前後になるので別の基準で見る（10/28 に「9時間更新なし・2店」で毎回失敗になった）
const PC_SHOP_NAMES = new Set(["PC WRAP", "Qualit"]);
const PC_WARN_HOURS = 18;
const PC_FAIL_HOURS = 30;
const PREVIOUS_URL = "https://used.gadelog.com/health.json";

const isMissing = (p: string) => / が0件$/.test(p);

/** 前回の実行の結果（直前の配置で書き出された /health.json）。読めなければ null */
async function loadPrevious(): Promise<HealthReport | null> {
  const i = process.argv.indexOf("--previous");
  const src = i >= 0 ? process.argv[i + 1] : PREVIOUS_URL;
  try {
    if (!/^https?:/.test(src)) return JSON.parse(readFileSync(src, "utf8"));
    const res = await fetch(`${src}?t=${Date.now()}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthReport;
  } catch (e) {
    console.log(`前回の /health.json を読めない（${e instanceof Error ? e.message : e}）。「0件」は続いたものとして扱う`);
    return null;
  }
}

async function main() {
  const ri = process.argv.indexOf("--report");
  const report: HealthReport = ri >= 0 ? JSON.parse(readFileSync(process.argv[ri + 1], "utf8")) : await checkHealth();
  for (const s of report.shops ?? []) {
    console.log(`${s.shop}: ${s.count}件 / ${s.ageHours ?? "?"}時間前 ${JSON.stringify(s.devices)}`);
  }
  console.log(`価格推移の最終記録日: ${report.lastPriceSnapshot ?? "-"}`);

  const failures: string[] = [];
  const warnings: string[] = [];

  // lib/health.ts の問題: 「0件」以外はそのまま失敗
  failures.push(...report.problems.filter((p) => !isMissing(p)));

  // 「0件」: 前回もあれば失敗、今回だけなら警告（その種類の一覧だけ一時的に取れなかった回。10/20 ダイワンの Galaxy）
  const missing = report.problems.filter(isMissing);
  if (missing.length > 0) {
    const previous = await loadPrevious();
    const before = new Set(previous ? previous.problems.filter(isMissing) : missing);
    for (const p of missing) (before.has(p) ? failures : warnings).push(before.has(p) && previous ? `${p}（前回も）` : p);
  }

  // 最終更新の古さ（取得に失敗した店は前回の在庫のまま残り、最終更新が進まない）
  // 在庫を全部隠した店（取得が12時間止まって scraper/common.py が隠した。公式サイトの休止など）は、画面に古い価格が出ないので警告だけにする
  for (const s of (report.shops ?? []).filter((s) => s.hidden && !AMAZON_SHOP_NAMES.has(s.shop))) {
    warnings.push(`${s.shop}: ${s.ageHours ?? "?"}時間更新なし（在庫は隠し中。取得が戻れば自動で表示）`);
  }
  for (const s of (report.shops ?? []).filter((s) => PC_SHOP_NAMES.has(s.shop) && !s.hidden && s.ageHours !== null && s.ageHours > PC_WARN_HOURS)) {
    const msg = `${s.shop}: ${s.ageHours}時間更新なし（中古パソコンの店）`;
    if (s.ageHours! > PC_FAIL_HOURS) failures.push(`${msg}（${PC_FAIL_HOURS}時間超）`);
    else warnings.push(`${msg}（${PC_FAIL_HOURS}時間を超えたら失敗）`);
  }
  const old = (report.shops ?? []).filter((s) => !AMAZON_SHOP_NAMES.has(s.shop) && !PC_SHOP_NAMES.has(s.shop) && !s.stale && !s.hidden && s.ageHours !== null && s.ageHours > WARN_HOURS);
  for (const s of old) {
    const msg = `${s.shop}: ${s.ageHours}時間更新なし`;
    if (s.ageHours! > FAIL_HOURS) failures.push(`${msg}（${FAIL_HOURS}時間超）`);
    else if (old.length >= 2) failures.push(`${msg}（${WARN_HOURS}時間超の店が${old.length}店）`);
    else warnings.push(`${msg}（1店だけ。${FAIL_HOURS}時間を超えたら失敗）`);
  }

  for (const w of warnings) console.log(`::warning::データ更新: ${w}`);
  if (failures.length > 0) {
    console.error("問題あり:\n" + failures.map((p) => `- ${p}`).join("\n"));
    process.exitCode = 1;
  } else if (warnings.length > 0) {
    console.log("警告のみ（一時的な取得の失敗とみなす。続けば失敗になる）");
  }
  await prisma.$disconnect();
}

main();
