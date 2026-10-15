/**
 * Xperia・AQUOS の機種情報を、機種ページ・一覧に出す文にする（2026-10-15〜）。値は lib/xperiaCatalog.ts・lib/aquosCatalog.ts
 * （公式で確かめたものだけ。未確認は null で、ここでは何も出さない）
 */
import { CARRIER_LABELS, type AndroidInfo } from "@/lib/androidCommon";
import { AQUOS_INFO, isAquos } from "@/lib/aquosCatalog";
import { XPERIA_INFO, isXperia } from "@/lib/xperiaCatalog";

export const androidInfoOf = (model: string): AndroidInfo | undefined => XPERIA_INFO[model] ?? AQUOS_INFO[model];

export const isAndroidJp = (model: string) => isXperia(model) || isAquos(model);

/** "2025-10" → "2025年10月"、"2023" → "2023年" */
const jaDate = (s: string): string => {
  const [y, m] = s.split("-");
  return m ? `${y}年${Number(m)}月` : `${y}年`;
};

/** 発売の文（「日本では2025年10月に発売されました。」）。発売が分からなければ null */
export function releasedSentence(model: string): string | null {
  const info = androidInfoOf(model);
  if (!info?.released) return null;
  const when = jaDate(info.released);
  if (info.releasedNote === "au") return `日本では${when}に au から発売されました。`;
  if (info.releasedNote === "報道") return `日本では${when}に発売されました（報道による）。`;
  return `日本では${when}に発売されました。`;
}

/** セキュリティ更新の終わり。now は "2026-10" の形。終了済みなら "ended"、これからなら "active" */
export function securityState(info: AndroidInfo, now: string): "ended" | "active" | null {
  if (!info.securityUntil) return null;
  return info.securityUntil < now ? "ended" : "active";
}

/** 機種ページの「アップデート」の表示用の行（公式の値があるものだけ） */
export function updateRows(model: string, now: string): { label: string; value: string }[] {
  const info = androidInfoOf(model);
  if (!info) return [];
  const rows: { label: string; value: string }[] = [];
  if (info.osPolicy) rows.push({ label: "OS アップデート", value: info.osPolicy });
  if (info.securityUntil) {
    rows.push({
      label: "セキュリティ更新",
      value: securityState(info, now) === "ended" ? `${jaDate(info.securityUntil)}で終了済み` : `${jaDate(info.securityUntil)}まで`,
    });
  }
  return rows;
}

/** 機種ページの「型番」の行（公式で確かめた型番だけ。キャリアごと） */
export function codeRows(model: string): { label: string; value: string }[] {
  const info = androidInfoOf(model);
  if (!info) return [];
  return (Object.keys(CARRIER_LABELS) as (keyof typeof CARRIER_LABELS)[])
    .filter((k) => info.codes[k]?.length)
    .map((k) => ({ label: CARRIER_LABELS[k], value: info.codes[k]!.join("・") }));
}

/** 「いつまで使えるか」の答え。メーカーの公式資料の値があるときだけ（なければ null で、質問ごと出さない） */
export function supportSentence(model: string, now: string): string | null {
  const info = androidInfoOf(model);
  if (!info) return null;
  const parts: string[] = [];
  if (info.osPolicy) parts.push(`OS アップデートは${info.osPolicy}`);
  if (info.securityUntil) {
    parts.push(securityState(info, now) === "ended" ? `セキュリティ更新は${jaDate(info.securityUntil)}で終了しています` : `セキュリティ更新は${jaDate(info.securityUntil)}まで`);
  }
  if (parts.length === 0) return null;
  const maker = isXperia(model) ? "Sony" : "Sharp";
  return `${maker}の公式資料（${isXperia(model) ? "OS 更新の方針・法人向けの AER" : "OS バージョンアップの対象機種・法人向けの AER"}）では、${model}の${parts.join("、")}とされています。`;
}

/** 出典（機種ページの「アップデート」の注記） */
export function updateSource(model: string): { name: string; url: string }[] {
  return isXperia(model)
    ? [
        { name: "Sony「Xperia の製品ページ」", url: "https://www.sony.jp/xperia/product/index.html" },
        { name: "Sony「セキュリティアップデートの提供期間（AER）」", url: "https://www.sony.jp/xperia/product/aer/" },
      ]
    : [
        { name: "Sharp「OS バージョンアップ情報」", url: "https://k-tai.sharp.co.jp/support/osv/lineup.html" },
        { name: "Sharp「AER（法人向け）」", url: "https://k-tai.sharp.co.jp/business/aer_models.html" },
      ];
}
