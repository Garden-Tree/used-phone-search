/**
 * YouTube の横動画（@used_gadelog）。サイトの同じテーマのページに埋め込む（10/25〜）。
 * 題は YouTube の公開時の題と同じに。asOf は動画の数字の時点（longform/<フォルダ>/data.json の date）。
 */
export type Video = { id: string; title: string; minutes: number; asOf: string; /** 機種ページに出すときの見出し */ heading?: string };

export const VIDEOS = {
  iphoneDore: { id: "R1Aki2b5mds", title: "【中古iPhone】いま買うならどれ？17店・約7万件の相場で予算別に本気で選んだ", minutes: 10, asOf: "2026-10-21" },
  priceFactors: { id: "S8Oa_pOJ8NY", title: "【中古iPhone】どこにお金をかけるべき？ 世代・Pro・ランク・容量・電池を約7万件の相場で比べた", minutes: 9, asOf: "2026-10-23" },
  ipadDore: { id: "SHyQRQ8wAic", title: "【中古iPad】いま買うならどれ？ 16店の相場で「使い方別」に選んだ（無印・Air・mini・Pro）", minutes: 8, asOf: "2026-10-23" },
  whereToBuy: { id: "P78xAKBa274", title: "中古iPhone、店選びの正解は？16店の保証・電池表記・赤ロムを比較", minutes: 8, asOf: "2026-10-24" },
  proOrStandard: { id: "Bmp5EgeiqW0", title: "中古iPhone、Proの差額で何が増える？120Hz・望遠カメラ・容量を相場で比較", minutes: 10, asOf: "2026-10-24", heading: "Proと無印の違いを動画で見る" },
  // 10/28 公開（新型 MacBook Pro M6 の発表の翌日）
  mbpM6: { id: "iAzTGx6wsTs", title: "新型MacBook Pro M6 買う？中古のM5・M4にする？差は5.3万〜7.9万円｜新旧の違いと中古の相場で比べた", minutes: 8, asOf: "2026-10-28", heading: "新型 M6 と中古の差を動画で見る" },
  // 10/29 公開（タッチ対応の PROLED 発表の翌日・4択は 24GB・1TB でそろえた）
  mbpProled: { id: "goOpevlUKTw", title: "MacBook Pro、どれ買う？新型PROLED・新型M6・今のモデル・中古の4択を値段と違いで比べた", minutes: 8, asOf: "2026-10-29", heading: "新型2つ・今のモデル・中古の4択を動画で見る" },
  howOld: { id: "T7ltgSB-4XM", title: "中古iPhoneは何世代まで買っていい？iOS 27・修理の期間・相場で最低ラインを決めた", minutes: 9, asOf: "2026-10-25", heading: "何世代前まで買っていいかを動画で見る" },
} satisfies Record<string, Video>;

/**
 * 機種ページに出す横動画。Proと無印の回は iPhone 13〜17 の無印・Pro・Pro Max を比べている。
 * 何世代までの回は X〜12・SE（第2・第3世代）の iOS 27 対応・修理の期間・相場が中心（10/25〜）
 */
export function videoForModel(model: string): Video | null {
  if (/^iPhone 1[3-7]( Pro( Max)?)?$/.test(model)) return VIDEOS.proOrStandard;
  // 4択の回の中心（中古の M5 Pro 24GB・1TB と、16インチ M5 Pro）
  if (/^MacBook Pro 1[46]インチ M5 Pro$/.test(model)) return VIDEOS.mbpProled;
  // 新型 M6 の回で比べた MacBook Pro 14インチ（M5・M5 Pro・M4・M3・M1 Pro）
  if (/^MacBook Pro 14インチ (M5( Pro)?|M4|M3|M1 Pro)$/.test(model)) return VIDEOS.mbpM6;
  if (/^iPhone (1[12]( mini| Pro( Max)?)?|X[SR]?( Max)?|SE \(第[23]世代\))$/.test(model)) return VIDEOS.howOld;
  return null;
}
