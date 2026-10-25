/**
 * YouTube の横動画（@used_gadelog）。サイトの同じテーマのページに埋め込む（10/25〜）。
 * 題は YouTube の公開時の題と同じに。asOf は動画の数字の時点（longform/<フォルダ>/data.json の date）。
 */
export type Video = { id: string; title: string; minutes: number; asOf: string };

export const VIDEOS = {
  iphoneDore: { id: "R1Aki2b5mds", title: "【中古iPhone】いま買うならどれ？17店・約7万件の相場で予算別に本気で選んだ", minutes: 10, asOf: "2026-10-21" },
  priceFactors: { id: "S8Oa_pOJ8NY", title: "【中古iPhone】どこにお金をかけるべき？ 世代・Pro・ランク・容量・電池を約7万件の相場で比べた", minutes: 9, asOf: "2026-10-23" },
  ipadDore: { id: "SHyQRQ8wAic", title: "【中古iPad】いま買うならどれ？ 16店の相場で「使い方別」に選んだ（無印・Air・mini・Pro）", minutes: 8, asOf: "2026-10-23" },
  whereToBuy: { id: "P78xAKBa274", title: "中古iPhone、店選びの正解は？16店の保証・電池表記・赤ロムを比較", minutes: 8, asOf: "2026-10-24" },
  proOrStandard: { id: "Bmp5EgeiqW0", title: "中古iPhone、Proの差額で何が増える？120Hz・望遠カメラ・容量を相場で比較", minutes: 10, asOf: "2026-10-24" },
} satisfies Record<string, Video>;

/** 機種ページに出す横動画。Proと無印の回は iPhone 13〜17 の無印・Pro・Pro Max を比べている */
export function videoForModel(model: string): Video | null {
  if (/^iPhone 1[3-7]( Pro( Max)?)?$/.test(model)) return VIDEOS.proOrStandard;
  return null;
}
