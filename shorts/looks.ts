/**
 * 見た目（地・見出しの帯・カード・強調色・つかみの型）。2026/10 の YouTube の方針（テンプレートの一括加工は独自とみなさない）と、
 * 1コマ目がどの回も同じだとスワイプされやすいことから、中身の型ごとに見た目を変える（10/22 はテーマごとに9つ → 10/23 に型ごとの4つへ）。
 * 色はすべて lib/brandColors.ts から。括弧内は WCAG のコントラスト比（文字は 4.5 以上）。
 *   紺 brand900 の地: 白 15.99・brand200 10.72・ON_DARK.price 5.98・safe 10.56・inspect 7.41
 *   紺 brand800 の地: 白 11.42・brand200 7.66・ON_DARK.safe 7.54・inspect 5.30（ON_DARK.price は 4.27 なので使わない）
 *   明るい地 ground / brand50 / inspect50: ink 15.9〜17.1・inkSub 6.8〜7.3・price 5.1〜5.5・safe 4.9〜5.3
 *   帯の白い文字: price 5.66・brand600 7.90・safe 5.47・inspect700 5.02・ink 17.74
 *   白いカードの上: price 5.66・safe 5.47・inspect700 5.02・inkSub 7.56
 *   藍 brand600 の地（ipadbudget）: 白 7.90・brand200 5.30・inspectLine 6.09・ON_DARK.safe 5.22（ON_DARK.inspect 3.66・ON_DARK.price 2.96 は使わない）
 *   inspectLine の丸い札の上: brand900 12.32
 *   墨 ink の地（battery）: 白 17.74。ON_DARK.safe・ON_DARK.sub は brand900 の地より暗い地なので比は上がる
 */
import { ON_DARK, SITE } from "@/lib/brandColors";
import type { Script } from "./types";

/** 見出しの帯の形。full＝左右いっぱい・card＝角丸の箱・pill＝丸い端・tab＝左寄せの札と左の線・leaf＝対角だけ丸い・underline＝塗らずに下線・frame＝塗らずに太い枠 */
export type BandShape = "full" | "card" | "pill" | "tab" | "leaf" | "underline" | "frame";
/** つかみ（1コマ目）の型。number＝1位の額を先に出す・chips＝予算の札・coins＝予算の丸い札（数字を大きく）・split＝2つを並べて vs・fold＝折りたたみの形・abc＝ランクの札・battery＝縦の電池の形 */
export type HookKind = "number" | "chips" | "coins" | "split" | "fold" | "abc" | "battery";

export type Look = {
  /** 記録用の名前（README・SKILL の表と同じ） */
  name: string;
  dark: boolean;
  /** 地 */
  bg: string;
  /** 地の上の文字・補足（注記・日付）・強調（金額）・URL */
  fg: string;
  sub: string;
  accentOnBg: string;
  url: string;
  /** 見出しの帯（fill を塗り、text・sub の色で書く。stripe は tab の左の線・underline の下線） */
  band: { shape: BandShape; fill: string; text: string; sub: string; stripe?: string };
  /** 白いカードの角・縁（boxShadow。レイアウトの幅を変えない） */
  card: { radius: number; shadow: string };
  /** 白いカードの上の強調（差額・率）と、白い文字を載せる札の色 */
  accent: string;
  chip: string;
  /** coins の丸い札の塗りと文字（なければ chip と白） */
  coin?: { fill: string; text: string };
  hook: HookKind;
};

const ring = (w: number, color: string) => `0 0 0 ${w}px ${color}`;

/**
 * 見た目は中身の型ごとに4つ（10/23 ユーザーの指示「多くても5種類」）。テーマごとに変えるのは つかみの型（hook）だけ。
 * それぞれ再生の多かった回の見た目を残した（予算別 iPhone 1,057 回・Pro と無印 1,045 回）
 */
// ① 値下がり: 紺の地・左右いっぱいの赤い帯。つかみは 1位の下がった額
const DROPS: Omit<Look, "hook"> = {
  name: "値下がり（紺・赤い帯）", dark: true, bg: SITE.brand900, fg: ON_DARK.white, sub: ON_DARK.sub, accentOnBg: ON_DARK.price, url: ON_DARK.safe,
  band: { shape: "full", fill: SITE.price, text: ON_DARK.white, sub: ON_DARK.white },
  card: { radius: 28, shadow: "none" }, accent: SITE.price, chip: SITE.price,
};
// ② 予算別（iPhone・Pixel・iPad）: 明るい地・藍の角丸の帯・縁と影のあるカード
const BUDGET: Omit<Look, "hook"> = {
  name: "予算別（明るい地・藍の帯）", dark: false, bg: SITE.ground, fg: SITE.ink, sub: SITE.inkSub, accentOnBg: SITE.price, url: SITE.safe,
  band: { shape: "card", fill: SITE.brand600, text: ON_DARK.white, sub: ON_DARK.white },
  card: { radius: 24, shadow: `${ring(3, SITE.line)}, 0 12px 28px rgba(17,24,39,0.10)` }, accent: SITE.price, chip: SITE.brand600,
};
// ③ 2つを比べる（新品と中古・Pro と無印・折りたたみの世代）: 紺の地・左寄せの藍の札（左に緑の線）・左に緑の線のカード。強調は緑
const VERSUS: Omit<Look, "hook"> = {
  name: "比べる（紺・左寄せの札・緑）", dark: true, bg: SITE.brand900, fg: ON_DARK.white, sub: ON_DARK.sub, accentOnBg: ON_DARK.safe, url: ON_DARK.safe,
  band: { shape: "tab", fill: SITE.brand600, text: ON_DARK.white, sub: ON_DARK.white, stripe: ON_DARK.safe },
  card: { radius: 12, shadow: `-14px 0 0 0 ${ON_DARK.safe}` }, accent: SITE.safe, chip: SITE.safe,
};
// ④ 状態の差（状態ランク・電池）: 生成り（inspect50）の地・墨（ink）の帯・琥珀の線の縁と影のカード
const CONDITION: Omit<Look, "hook"> = {
  name: "状態の差（生成り・墨の帯）", dark: false, bg: SITE.inspect50, fg: SITE.ink, sub: SITE.inkSub, accentOnBg: SITE.price, url: SITE.safe,
  band: { shape: "card", fill: SITE.ink, text: ON_DARK.white, sub: ON_DARK.white },
  card: { radius: 28, shadow: `${ring(3, SITE.inspectLine)}, 0 14px 30px rgba(146,64,14,0.14)` }, accent: SITE.price, chip: SITE.ink,
};

export const LOOKS: Record<Script["theme"], Look> = {
  drops: { ...DROPS, hook: "number" },
  budget: { ...BUDGET, hook: "chips" },
  pixelbudget: { ...BUDGET, hook: "chips" },
  // iPad は予算の丸い札（淡い金・数字を大きく）
  ipadbudget: { ...BUDGET, coin: { fill: SITE.inspectLine, text: SITE.brand900 }, hook: "coins" },
  newused: { ...VERSUS, hook: "split" },
  provs: { ...VERSUS, hook: "split" },
  fold: { ...VERSUS, hook: "fold" },
  rank: { ...CONDITION, hook: "abc" },
  battery: { ...CONDITION, hook: "battery" },
  gen: { ...VERSUS, hook: "split" },
  storage: { ...VERSUS, hook: "split" },
};

export const lookOf = (s: Script): Look => LOOKS[s.theme];
