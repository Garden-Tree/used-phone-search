/**
 * テーマごとの見た目（地・見出しの帯・カード・強調色・つかみの型）。2026/10 の YouTube の方針（テンプレートの一括加工は独自とみなさない）と、
 * 1コマ目がどの回も同じだとスワイプされやすいことから、テーマごとに1コマ目から見た目を変える（10/22）。
 * 色はすべて lib/brandColors.ts から。括弧内は WCAG のコントラスト比（文字は 4.5 以上）。
 *   紺 brand900 の地: 白 15.99・brand200 10.72・ON_DARK.price 5.98・safe 10.56・inspect 7.41
 *   紺 brand800 の地: 白 11.42・brand200 7.66・ON_DARK.safe 7.54・inspect 5.30（ON_DARK.price は 4.27 なので使わない）
 *   明るい地 ground / brand50 / inspect50: ink 15.9〜17.1・inkSub 6.8〜7.3・price 5.1〜5.5・safe 4.9〜5.3
 *   帯の白い文字: price 5.66・brand600 7.90・safe 5.47・inspect700 5.02・ink 17.74
 *   白いカードの上: price 5.66・safe 5.47・inspect700 5.02・inkSub 7.56
 */
import { ON_DARK, SITE } from "@/lib/brandColors";
import type { Script } from "./types";

/** 見出しの帯の形。full＝左右いっぱい・card＝角丸の箱・pill＝丸い端・tab＝左寄せの札と左の線・leaf＝対角だけ丸い・underline＝塗らずに下線 */
export type BandShape = "full" | "card" | "pill" | "tab" | "leaf" | "underline";
/** つかみ（1コマ目）の型。number＝1位の額を先に出す・chips＝予算の札・split＝2つを並べて vs・fold＝折りたたみの形・abc＝ランクの札 */
export type HookKind = "number" | "chips" | "split" | "fold" | "abc";

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
  hook: HookKind;
};

const ring = (w: number, color: string) => `0 0 0 ${w}px ${color}`;

export const LOOKS: Record<Script["theme"], Look> = {
  // 値下がり: 紺の地・左右いっぱいの赤い帯（今までの見た目を受け継ぐ）。つかみは 1位の下がった額
  drops: {
    name: "紺・赤い帯（全幅）", dark: true, bg: SITE.brand900, fg: ON_DARK.white, sub: ON_DARK.sub, accentOnBg: ON_DARK.price, url: ON_DARK.safe,
    band: { shape: "full", fill: SITE.price, text: ON_DARK.white, sub: ON_DARK.white },
    card: { radius: 28, shadow: "none" }, accent: SITE.price, chip: SITE.price, hook: "number",
  },
  // 予算 iPhone: 明るい地・藍の角丸の帯・縁と影のあるカード。つかみは予算の札
  budget: {
    name: "明るい地・藍の帯", dark: false, bg: SITE.ground, fg: SITE.ink, sub: SITE.inkSub, accentOnBg: SITE.price, url: SITE.safe,
    band: { shape: "card", fill: SITE.brand600, text: ON_DARK.white, sub: ON_DARK.white },
    card: { radius: 24, shadow: `${ring(3, SITE.line)}, 0 12px 28px rgba(17,24,39,0.10)` }, accent: SITE.price, chip: SITE.brand600, hook: "chips",
  },
  // 予算 Pixel: 藍（brand800）の地・緑の丸い帯・緑の縁のカード。つかみは予算の札とアップデートの年
  pixelbudget: {
    name: "藍の地・緑の丸い帯", dark: true, bg: SITE.brand800, fg: ON_DARK.white, sub: ON_DARK.sub, accentOnBg: ON_DARK.safe, url: ON_DARK.safe,
    band: { shape: "pill", fill: SITE.safe, text: ON_DARK.white, sub: ON_DARK.white },
    card: { radius: 40, shadow: ring(6, ON_DARK.safe) }, accent: SITE.price, chip: SITE.safe, hook: "chips",
  },
  // 新品と中古: 薄い藍（brand50）の地・塗らない見出しに赤い下線・藍の縁のカード。つかみは「新品 vs 中古」
  newused: {
    name: "薄い藍の地・下線の見出し", dark: false, bg: SITE.brand50, fg: SITE.ink, sub: SITE.inkSub, accentOnBg: SITE.price, url: SITE.safe,
    band: { shape: "underline", fill: "transparent", text: SITE.ink, sub: SITE.inkSub, stripe: SITE.price },
    card: { radius: 16, shadow: ring(4, SITE.brand200) }, accent: SITE.price, chip: SITE.price, hook: "split",
  },
  // Pro と無印: 紺の地・左寄せの藍の札（左に緑の線）・左に緑の線のカード。強調は緑。つかみは「無印 vs Pro」
  provs: {
    name: "紺・左寄せの札・緑", dark: true, bg: SITE.brand900, fg: ON_DARK.white, sub: ON_DARK.sub, accentOnBg: ON_DARK.safe, url: ON_DARK.safe,
    band: { shape: "tab", fill: SITE.brand600, text: ON_DARK.white, sub: ON_DARK.white, stripe: ON_DARK.safe },
    card: { radius: 12, shadow: `-14px 0 0 0 ${ON_DARK.safe}` }, accent: SITE.safe, chip: SITE.safe, hook: "split",
  },
  // 折りたたみ: 藍（brand800）の地・琥珀の対角の帯・琥珀の縁のカード。強調は琥珀。つかみは折りたたみの形（図形だけ）
  fold: {
    name: "藍の地・琥珀の帯", dark: true, bg: SITE.brand800, fg: ON_DARK.white, sub: ON_DARK.sub, accentOnBg: ON_DARK.inspect, url: ON_DARK.safe,
    band: { shape: "leaf", fill: SITE.inspect700, text: ON_DARK.white, sub: ON_DARK.white },
    card: { radius: 44, shadow: ring(6, ON_DARK.inspect) }, accent: SITE.inspect700, chip: SITE.inspect700, hook: "fold",
  },
  // 状態ランク: 生成り（inspect50）の地・墨（ink）の帯・影のカード。つかみは A・B・C の札
  rank: {
    name: "生成りの地・墨の帯", dark: false, bg: SITE.inspect50, fg: SITE.ink, sub: SITE.inkSub, accentOnBg: SITE.price, url: SITE.safe,
    band: { shape: "card", fill: SITE.ink, text: ON_DARK.white, sub: ON_DARK.white },
    card: { radius: 28, shadow: `${ring(3, SITE.inspectLine)}, 0 14px 30px rgba(146,64,14,0.14)` }, accent: SITE.price, chip: SITE.ink, hook: "abc",
  },
};

export const lookOf = (s: Script): Look => LOOKS[s.theme];
