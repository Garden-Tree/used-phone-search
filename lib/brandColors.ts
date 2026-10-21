/**
 * サイトとショート・OG 画像で共有する色。
 * SITE は app/globals.css の @theme（--color-*）と必ず同じ値にする（サイトの色の正本は globals.css。変えるときは両方）。
 * ON_DARK は動画・画像で紺（brand-900 #1e1b4b）の地に置くための明るい版。同じ色相の明度だけ上げた（HSL の L を上げる）。
 * 括弧内は #1e1b4b に対する WCAG のコントラスト比（文字は 4.5 以上、大きな文字・図形は 3 以上を目安）
 */
export const SITE = {
  brand900: "#1e1b4b",
  brand800: "#312e81",
  brand600: "#4338ca",
  brand200: "#c7d2fe", // 紺の上で 10.72
  brand50: "#eef2ff",
  price: "#c8231b", // 白の上で 5.66（白の文字を載せても 5.66）
  safe: "#0f766e",
  warn: "#b91c1c",
  inspect50: "#fffbeb",
  inspectLine: "#f5e1a4",
  inspect800: "#92400e",
  inspect700: "#b45309", // 白の文字を載せて 5.02
  line: "#e5e7eb",
  lineSoft: "#f0f1f4",
  ground: "#f6f7f9",
  ink: "#111827",
  inkSub: "#4b5563", // 白の上で 7.56
  inkMute: "#6b7280", // 白の上で 4.83
} as const;

export const ON_DARK = {
  /** price #c8231b（色相 3°）の L 0.45→0.70。紺の上で 5.98 */
  price: "#ed7e78",
  /** safe #0f766e（色相 175°）の L 0.26→0.60。紺の上で 10.56 */
  safe: "#4ae8dc",
  /** inspect-700 #b45309（色相 26°）の L 0.37→0.65。紺の上で 7.41 */
  inspect: "#f69b55",
  /** ink-mute #6b7280（色相 220°）の L 0.46→0.65。紺の上で 6.32 */
  mute: "#9ea3ae",
  /** 紺の上の補足の文字は brand-200（10.72） */
  sub: SITE.brand200,
  white: "#ffffff", // 紺の上で 15.99
} as const;
