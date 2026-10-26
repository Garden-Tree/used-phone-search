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
 *   墨 ink の地（probudget）: 白 17.74・ON_DARK.sub 11.89・ON_DARK.inspect 8.23・ON_DARK.safe 11.71。淡い金 inspectLine の帯の上の ink 13.68
 *   楽天モバイルのピンク RAKUTEN_PINK #D9005B（rakutenmobile だけ・広告の回の強調）: 白い文字を載せて 5.12・白いカードの上 5.12・明るい地 ground の上 4.78
 *   （ground の上の ink 16.55・inkSub 7.05・safe 5.11）。brand50 の地は 4.58 で余裕がないので使わない
 */
import { ON_DARK, SITE } from "@/lib/brandColors";
import type { Script } from "./types";

/** 見出しの帯の形。full＝左右いっぱい・card＝角丸の箱・pill＝丸い端・tab＝左寄せの札と左の線・leaf＝対角だけ丸い・underline＝塗らずに下線・frame＝塗らずに太い枠 */
export type BandShape = "full" | "card" | "pill" | "tab" | "leaf" | "underline" | "frame";
/** つかみ（1コマ目）の型。number＝1位の額を先に出す・chips＝予算の札・coins＝予算の丸い札（数字を大きく）・split＝2つを並べて vs・fold＝折りたたみの形・abc＝ランクの札・battery＝縦の電池の形
 * phone＝スマホの形に「iOS 27」と「対応」の札（ios27line）・equation＝「古い方＋電池交換＝1つ上？」の式（batteryswap）・ratio＝新品と中古の2本の棒（overnew）・tiers＝料金の3段の階段と2年の差（rakutenmobile） */
export type HookKind = "number" | "chips" | "coins" | "split" | "fold" | "abc" | "battery" | "phone" | "equation" | "ratio" | "tiers";

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
 * 見た目は中身の型ごとに5つ（10/23 ユーザーの指示「多くても5種類」。⑤ Pro の予算別は 10/24〜）。テーマごとに変えるのは つかみの型（hook）だけ。
 * それぞれ再生の多かった回の見た目を残した（予算別 iPhone 1,057 回・Pro と無印 1,045 回）
 */
// ① 値下がり: 紺の地・左右いっぱいの赤い帯。つかみは 1位の下がった額
const DROPS: Omit<Look, "hook"> = {
  name: "値下がり（紺・赤い帯）", dark: true, bg: SITE.brand900, fg: ON_DARK.white, sub: ON_DARK.sub, accentOnBg: ON_DARK.price, url: ON_DARK.safe,
  band: { shape: "full", fill: SITE.price, text: ON_DARK.white, sub: ON_DARK.white },
  card: { radius: 28, shadow: "none" }, accent: SITE.price, chip: SITE.price,
};
// ② 予算別（iPhone・Pixel・iPad・MacBook）: 明るい地・藍の角丸の帯・縁と影のあるカード
const BUDGET: Omit<Look, "hook"> = {
  name: "予算別（明るい地・藍の帯）", dark: false, bg: SITE.ground, fg: SITE.ink, sub: SITE.inkSub, accentOnBg: SITE.price, url: SITE.safe,
  band: { shape: "card", fill: SITE.brand600, text: ON_DARK.white, sub: ON_DARK.white },
  card: { radius: 24, shadow: `${ring(3, SITE.line)}, 0 12px 28px rgba(17,24,39,0.10)` }, accent: SITE.price, chip: SITE.brand600,
};
// ③ 2つを比べる（新品と中古・Pro と無印・Pro Max と Pro・折りたたみの世代）: 紺の地・左寄せの藍の札（左に緑の線）・左に緑の線のカード。強調は緑
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

// ⑤ Pro だけの予算別（10/24〜）: 墨（ink）の地・淡い金（inspectLine）の丸い端の帯（墨の文字）・金の縁のカード・琥珀の札。
//    予算別の型だが、Pro の回だと1コマ目で分かるように明るい地の BUDGET と分ける（見た目は5種類まで。10/23 ユーザーの指示）
const PRO: Omit<Look, "hook"> = {
  name: "Pro の予算別（墨・金の帯）", dark: true, bg: SITE.ink, fg: ON_DARK.white, sub: ON_DARK.sub, accentOnBg: ON_DARK.inspect, url: ON_DARK.safe,
  band: { shape: "pill", fill: SITE.inspectLine, text: SITE.ink, sub: SITE.ink },
  card: { radius: 20, shadow: ring(6, SITE.inspectLine) }, accent: SITE.price, chip: SITE.inspect700,
};

/** 楽天モバイルのショッキングピンク（lib/simPlans.ts のボタンの色と同じ）。rakutenmobile の強調だけに使う（サイトの色 lib/brandColors.ts の例外） */
const RAKUTEN_PINK = "#D9005B";
// ⑥ 広告の回（rakutenmobile・10/26〜）: 明るい地 ground・塗らない見出し（墨の文字）にピンクの下線・灰の縁と影のカード・ピンクの札と強調。
//    見た目は5つまで（10/23 ユーザーの指示）の例外。広告の回だと1コマ目で分かるように、ふだんの回（①〜⑤）と同じにしない。
//    ピンクは強調・札・下線だけ（地や帯の塗りには使わない）。左上の「PR」の札は scenes.tsx の PrMark
const AD: Omit<Look, "hook"> = {
  name: "広告の回（明るい地・ピンクの下線）", dark: false, bg: SITE.ground, fg: SITE.ink, sub: SITE.inkSub, accentOnBg: RAKUTEN_PINK, url: SITE.safe,
  band: { shape: "underline", fill: SITE.ground, text: SITE.ink, sub: SITE.inkSub, stripe: RAKUTEN_PINK },
  card: { radius: 24, shadow: `${ring(3, SITE.line)}, 0 12px 28px rgba(17,24,39,0.10)` }, accent: RAKUTEN_PINK, chip: RAKUTEN_PINK,
};

export const LOOKS: Record<Script["theme"], Look> = {
  drops: { ...DROPS, hook: "number" },
  budget: { ...BUDGET, hook: "chips" },
  pixelbudget: { ...BUDGET, hook: "chips" },
  macbudget: { ...BUDGET, hook: "chips" },
  probudget: { ...PRO, hook: "chips" },
  // 折りたたみの予算別（10/24〜）: 見た目は5つまで（10/23 ユーザーの指示）なので新しく作らず、fold と同じ VERSUS（紺・左寄せの札・緑）を使う。
  // つかみは予算の札（chips）。fold のつかみ（開いた折りたたみの形）は FoldScript のランキングの値を使うので使えない
  foldbudget: { ...VERSUS, hook: "chips" },
  // Galaxy の予算別（10/25〜）: 見た目は5つまでなので新しく作らない。1コマ目が直前の予算別（明るい地の BUDGET・Pro の PRO・折りたたみの VERSUS）と
  // 続けて同じにならないよう、紺の地・赤い帯の DROPS を使う（つかみは予算の札）
  galaxybudget: { ...DROPS, hook: "chips" },
  // 大きい画面の予算別（10/26〜）: 見た目は5つまでなので新しく作らない。galaxybudget（① DROPS）・probudget（⑤ PRO）と違い、直前に公開する plusmax（③ VERSUS）・oldpro（⑤ PRO）とも
  // 続かない ② BUDGET（明るい地・藍の帯。予算の札）
  bigbudget: { ...BUDGET, hook: "chips" },
  // iPad は予算の丸い札（淡い金・数字を大きく）
  ipadbudget: { ...BUDGET, coin: { fill: SITE.inspectLine, text: SITE.brand900 }, hook: "coins" },
  newused: { ...VERSUS, hook: "split" },
  provs: { ...VERSUS, hook: "split" },
  promax: { ...VERSUS, hook: "split" },
  // plusvs（10/25〜）: provs と同じ VERSUS。直前の回（19時の drops ＝ ① DROPS）と見た目が続かない
  plusvs: { ...VERSUS, hook: "split" },
  // minie・unused（10/26〜）: 見た目は5つまでなので新しく作らない。同じ日の plusvs（③ VERSUS）と続かないよう、minie は ② BUDGET（明るい地。
  // つかみの「無印 vs mini・e」の右の札は price の赤＝白い文字 5.66。BUDGET の chip は左の札と同じ brand600 なので使わない）、unused は rank と同じ ④ CONDITION
  minie: { ...BUDGET, hook: "split" },
  unused: { ...CONDITION, hook: "split" },
  // plusmax・oldpro（10/26〜・声の実験。強い「2つを比べて差を言う」型を つむぎ・ずんだもん で）: 直前の unused（④ CONDITION）と続かないよう、
  // plusmax は比べる型の ③ VERSUS、oldpro は ⑤ PRO（墨の地・金の帯。左の「前のPro」の札は chip の inspect700＝白い文字 5.02、右の無印は budget）
  plusmax: { ...VERSUS, hook: "split" },
  oldpro: { ...PRO, hook: "split" },
  fold: { ...VERSUS, hook: "fold" },
  rank: { ...CONDITION, hook: "abc" },
  battery: { ...CONDITION, hook: "battery" },
  gen: { ...VERSUS, hook: "split" },
  storage: { ...VERSUS, hook: "split" },
  // 10/25〜 の3テーマ。公開順（galaxybudget ①→ ios27line ③→ batteryswap ④→ overnew ②）で前の回と同じ見た目が続かないように選んだ（見た目は5つまでなので新しく作らない）
  ios27line: { ...VERSUS, hook: "phone" },
  batteryswap: { ...CONDITION, hook: "equation" },
  overnew: { ...BUDGET, hook: "ratio" },
  rakutenmobile: { ...AD, hook: "tiers" },
  // ipadmini（10/27〜・新型 iPad mini の回）: 新型と中古の旧型を比べる回なので newused と同じ ③ VERSUS（見た目は5つまでなので新しく作らない）。
  // つかみは「新型 vs 旧型」の札と新型の公式価格
  ipadmini: { ...VERSUS, hook: "split" },
};

export const lookOf = (s: Script): Look => LOOKS[s.theme];
