/**
 * 横動画のサムネ・第5弾（2026-11-13）。差し替え用の F・G 案（A は今の thumbnail.png、D・E は thumb-v4a/v4b）
 *   npx tsx longform/thumb-v5.tsx [フォルダ名]   # 5本ぶん（下の PLANS）
 *   python -I longform/thumb-v5-contact.py       # 一覧 longform/thumb-v5-contact.png（A・第1案・F・G と 168x94）
 * 出力: <フォルダ>/thumb-F.png・thumb-G.png（1280x720）
 *
 * 第4弾との違い（YouTube の検索結果の上位を見て決めた）:
 * - 端末の絵が主役。F＝3〜6台を並べて札、G＝1〜2台を大きく＋巨大な数字や判定
 * - 端末は背面を描く（本体色・角の丸み・カメラの台座とレンズの並び）。SVG をコードで組む。写真・ロゴ・リンゴの形は使わない
 * - キャラなし・紺色の地なし
 * - 文字は 2〜3行・いちばん言いたい語は 180px 以上・太いふち取り
 * - 右下（x1030〜・y600〜）は再生時間の表示と重なるので何も置かない
 * - 数字・機種名は各フォルダの script.md・data.json にあるものだけ。「最安」「必ず」「絶対」・店の名前は書かない
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720;
const RED = "#E11D1D", GREEN = "#0E9F4F", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";
const FONT = "Noto Sans JP";

// ───────────────────────── 文字（thumb-v4a.tsx と同じ） ─────────────────────────

/** ふち取り文字（satori は text-stroke を描かないので16方向にずらして重ねる） */
function Outlined({ text, size, color, inner, outer, spacing = -4 }: { text: string; size: number; color: string; inner?: { w: number; c: string }; outer?: { w: number; c: string }; spacing?: number }) {
  const base = { display: "flex", fontSize: size, fontWeight: 900, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" } as const;
  const ring = (w: number, c: string, key: string) =>
    Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return <div key={`${key}${i}`} style={{ ...base, position: "absolute", left: Math.round(Math.cos(a) * w), top: Math.round(Math.sin(a) * w), color: c }}>{text}</div>;
    });
  return (
    <div style={{ display: "flex", position: "relative" }}>
      {outer && ring((inner?.w ?? 0) + outer.w, outer.c, "o")}
      {inner && ring(inner.w, inner.c, "i")}
      <div style={{ ...base, position: "relative", color }}>{text}</div>
    </div>
  );
}
const T = ({ x, y, children }: { x: number; y: number; children: ReactNode }) => <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "flex-end" }}>{children}</div>;
const Plain = ({ text, size, color, spacing = -3 }: { text: string; size: number; color: string; spacing?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, color, letterSpacing: spacing, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
);
const tagStyle = (size: number, bg: string, pad: number, radius: number) => ({ display: "flex", alignItems: "center", height: Math.round(size * 1.28), padding: `0 ${pad}px`, background: bg, borderRadius: radius, boxShadow: "5px 5px 0 rgba(0,0,0,0.35)" }) as const;
const Tag = ({ x, y, text, size, bg, color, pad = 24, radius = 0, rotate }: { x: number; y: number; text: string; size: number; bg: string; color: string; pad?: number; radius?: number; rotate?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, ...tagStyle(size, bg, pad, radius), ...(rotate ? { transform: `rotate(${rotate}deg)` } : {}) }}>
    <Plain text={text} size={size} color={color} />
  </div>
);
/** 札を cx の真ん中にそろえて置く（並べた端末の上・下に付ける） */
const TagC = ({ cx, y, text, size, bg, color, pad = 18, radius = 10, border }: { cx: number; y: number; text: string; size: number; bg: string; color: string; pad?: number; radius?: number; border?: string }) => (
  <div style={{ position: "absolute", left: cx - 220, top: y, width: 440, display: "flex", justifyContent: "center" }}>
    <div style={{ ...tagStyle(size, bg, pad, radius), ...(border ? { border: `4px solid ${border}` } : {}) }}>
      <Plain text={text} size={size} color={color} spacing={-2} />
    </div>
  </div>
);

/** ✕（赤の丸）と ○（白い丸に緑の輪）。図形で描く */
const Cross = ({ x, y, size }: { x: number; y: number; size: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", width: size, height: size, borderRadius: size, background: RED, border: `${Math.round(size * 0.07)}px solid ${WHITE}`, boxShadow: "0 6px 16px rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
    <div style={{ display: "flex", position: "relative", width: size * 0.56, height: size * 0.56 }}>
      <div style={{ position: "absolute", left: 0, top: size * 0.21, width: size * 0.56, height: size * 0.14, background: WHITE, borderRadius: 6, transform: "rotate(45deg)" }} />
      <div style={{ position: "absolute", left: 0, top: size * 0.21, width: size * 0.56, height: size * 0.14, background: WHITE, borderRadius: 6, transform: "rotate(-45deg)" }} />
    </div>
  </div>
);
const Maru = ({ x, y, size }: { x: number; y: number; size: number }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", width: size, height: size, borderRadius: size, background: WHITE, boxShadow: "0 6px 16px rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
    <div style={{ display: "flex", width: size * 0.78, height: size * 0.78, borderRadius: size, border: `${Math.round(size * 0.15)}px solid ${GREEN}` }} />
  </div>
);
/** 電池の絵（前面の画面に入れる。fill＝残りの割合 0〜1） */
const Cell = ({ w, fill, color }: { w: number; fill: number; color: string }) => (
  <div style={{ display: "flex", alignItems: "center" }}>
    <div style={{ display: "flex", width: w, height: w * 0.5, borderRadius: w * 0.1, border: `${Math.round(w * 0.07)}px solid #111827`, background: WHITE, padding: w * 0.04 }}>
      <div style={{ display: "flex", width: `${Math.round(fill * 100)}%`, height: "100%", borderRadius: w * 0.04, background: color }} />
    </div>
    <div style={{ display: "flex", width: w * 0.07, height: w * 0.2, borderRadius: 3, background: "#111827" }} />
  </div>
);

// ───────────────────────── 端末の絵（SVG をコードで組む。ロゴは描かない） ─────────────────────────

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** 2色を混ぜる（t=0 で a、1 で b） */
const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** カメラの並び: se＝1眼＋横にライト／xr＝大きい1眼＋下にライト／pill＝縦長の台座に2眼（X・XS）／pill16＝縦長の台座に2眼（16）
 *  sqv＝四角い台座に縦2眼（11・12）／sqd＝四角い台座に斜め2眼（13・14・15）／tri＝四角い台座に3眼（Pro）／one＝1眼＋右にライト（16e） */
type Cam = "se" | "xr" | "pill" | "pill16" | "sqv" | "sqd" | "tri" | "one";
type PhoneSpec = { cam: Cam; r: number; colors: Record<string, [string, string]>; front: "home" | "notch" | "island" };
/** 本体色は Apple が公表している色名に近い一般的な色（[明るい側, 暗い側]）。最初の色が既定 */
const PHONES: Record<string, PhoneSpec> = {
  X: { cam: "pill", r: 38, front: "notch", colors: { silver: ["#F1F2F4", "#C9CCD1"], gray: ["#5A5C61", "#2F3136"] } },
  XS: { cam: "pill", r: 38, front: "notch", colors: { gold: ["#F6E0CC", "#D9B899"], gray: ["#5A5C61", "#2F3136"] } },
  XR: { cam: "xr", r: 38, front: "notch", colors: { coral: ["#FF8A73", "#EC5E47"], blue: ["#6DB9EA", "#3F93CC"], yellow: ["#FBE27A", "#EFC94C"] } },
  "11": { cam: "sqv", r: 38, front: "notch", colors: { purple: ["#DCD4EA", "#B9ADD2"], green: ["#BFE8D6", "#93CDB5"], yellow: ["#FFEC9A", "#F2D562"] } },
  SE2: { cam: "se", r: 30, front: "home", colors: { red: ["#D5223C", "#9E0F26"], white: ["#F5F5F3", "#D7D7D4"], black: ["#3A3B3F", "#1B1C1F"] } },
  SE3: { cam: "se", r: 30, front: "home", colors: { red: ["#D5223C", "#9E0F26"], starlight: ["#FAF6EF", "#E5DCCB"], midnight: ["#2F3540", "#161A21"] } },
  "12": { cam: "sqv", r: 34, front: "notch", colors: { blue: ["#2C5F8E", "#143A5F"], purple: ["#CDBCE4", "#A994CC"], green: ["#D5EBD7", "#AED0B2"] } },
  "13": { cam: "sqd", r: 34, front: "notch", colors: { pink: ["#FBE3DF", "#EDC2BD"], blue: ["#4C82A0", "#2A5A78"], midnight: ["#2F3540", "#161A21"], starlight: ["#FAF6EF", "#E5DCCB"], red: ["#D5223C", "#9E0F26"], green: ["#4F6351", "#324334"] } },
  "14": { cam: "sqd", r: 34, front: "notch", colors: { yellow: ["#FAE889", "#EDCF55"], blue: ["#B4CCE2", "#8BAACB"], purple: ["#E6DDEE", "#C9BADB"] } },
  "15": { cam: "sqd", r: 36, front: "island", colors: { blue: ["#DCE5EC", "#B4C5D3"], pink: ["#F6DADD", "#E3B6BC"], green: ["#DCE7D4", "#B7CBAC"], yellow: ["#F6EFC9", "#E3D89E"] } },
  "16": { cam: "pill16", r: 36, front: "island", colors: { ultramarine: ["#9DB0F5", "#5B73D9"], teal: ["#B7DCD9", "#7FB9B5"], pink: ["#F7C6DE", "#EB93BF"], white: ["#F7F7F5", "#DADAD6"] } },
  "16e": { cam: "one", r: 36, front: "notch", colors: { white: ["#F7F7F5", "#DADAD6"], black: ["#3A3B3F", "#1B1C1F"] } },
  "13Pro": { cam: "tri", r: 34, front: "notch", colors: { sierra: ["#B9D3E6", "#8FB0C9"], graphite: ["#5D5C5A", "#33322F"] } },
};

const DEFS = `<defs>
<linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3F4F6"/><stop offset=".5" stop-color="#6B7280"/><stop offset="1" stop-color="#D1D5DB"/></linearGradient>
<radialGradient id="glass" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#3B4C7A"/><stop offset=".45" stop-color="#141B2E"/><stop offset="1" stop-color="#04060B"/></radialGradient>
<radialGradient id="flash" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#FFFDF0"/><stop offset="1" stop-color="#E9D9A6"/></radialGradient>
<filter id="sh" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#000" flood-opacity=".5"/></filter>
</defs>`;
/** レンズ1つ（金属の輪・黒いガラス・青い反射・白い光の点） */
const lens = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#ring)"/><circle cx="${cx}" cy="${cy}" r="${r * 0.84}" fill="#0A0D14"/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="url(#glass)"/><circle cx="${cx}" cy="${cy}" r="${r * 0.26}" fill="#03040A"/><ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.34}" rx="${r * 0.2}" ry="${r * 0.11}" fill="#fff" opacity=".6" transform="rotate(-35 ${cx - r * 0.3} ${cy - r * 0.34})"/>`;
const flash = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r + 1.2}" fill="#9CA3AF"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#flash)"/>`;
const mic = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="2.2" fill="#111827" opacity=".7"/>`;
/** カメラの台座（本体と同じ色で少し明るく、右下に影） */
const plate = (x: number, y: number, w: number, h: number, rx: number, c: [string, string]) =>
  `<rect x="${x + 2}" y="${y + 3.5}" width="${w}" height="${h}" rx="${rx}" fill="#000" opacity=".28"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${mix(c[0], "#ffffff", 0.22)}" stroke="${mix(c[1], "#000000", 0.18)}" stroke-width="1.6"/><rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" rx="${rx - 2.5}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>`;

function camera(cam: Cam, c: [string, string]): string {
  switch (cam) {
    case "se": return lens(36, 32, 12.5) + mic(58, 32) + flash(73, 32, 6);
    case "xr": return lens(44, 44, 23) + mic(44, 76) + flash(44, 92, 8);
    case "one": return lens(42, 42, 19) + mic(70, 42) + flash(86, 42, 7);
    case "pill": return `<rect x="24" y="22" width="43" height="96" rx="21.5" fill="#000" opacity=".25" transform="translate(2 3)"/><rect x="22" y="20" width="43" height="96" rx="21.5" fill="#15171C" stroke="url(#ring)" stroke-width="2.5"/>` + lens(43.5, 41, 15.5) + flash(43.5, 68, 5.5) + lens(43.5, 95, 15.5);
    case "pill16": return plate(18, 18, 54, 108, 27, c) + lens(45, 46, 21) + lens(45, 98, 21) + flash(92, 72, 7.5) + mic(92, 96);
    case "sqv": return plate(13, 13, 90, 90, 25, c) + lens(40, 38, 16.5) + lens(40, 78, 16.5) + flash(78, 46, 7.5) + mic(78, 72);
    case "sqd": return plate(13, 13, 94, 94, 27, c) + lens(40, 40, 19.5) + lens(80, 80, 19.5) + flash(81, 37, 7) + mic(39, 83);
    case "tri": return plate(11, 11, 104, 104, 28, c) + lens(38, 38, 18.5) + lens(38, 88, 18.5) + lens(86, 63, 18.5) + flash(87, 31, 6) + `<circle cx="87" cy="95" r="7" fill="#0A0D14"/>` + mic(62, 63);
  }
}

const PM = 26; // SVG の余白（影のぶん）
/** iPhone の絵（200x410 の中に描く）。back＝背面／front＝前面（画面は screen の2色） */
function phoneSvg(model: string, color: string | undefined, o: { dim?: boolean; front?: boolean; screen?: [string, string] }): string {
  const spec = PHONES[model];
  const c = spec.colors[color ?? Object.keys(spec.colors)[0]];
  const r = spec.r;
  const frame = `<linearGradient id="fr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${mix(c[1], "#000000", 0.25)}"/><stop offset=".12" stop-color="${mix(c[0], "#ffffff", 0.45)}"/><stop offset=".5" stop-color="${mix(c[1], "#000000", 0.05)}"/><stop offset=".9" stop-color="${mix(c[0], "#ffffff", 0.35)}"/><stop offset="1" stop-color="${mix(c[1], "#000000", 0.3)}"/></linearGradient>`;
  const body = `<linearGradient id="bd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(c[0], "#ffffff", 0.18)}"/><stop offset=".55" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>`;
  const btn = mix(c[1], "#000000", 0.25);
  const buttons = `<rect x="-3" y="92" width="5" height="20" rx="2" fill="${btn}"/><rect x="-3" y="126" width="5" height="34" rx="2" fill="${btn}"/><rect x="-3" y="168" width="5" height="34" rx="2" fill="${btn}"/><rect x="198" y="140" width="5" height="54" rx="2" fill="${btn}"/>`;
  const shell = `${buttons}<rect x="0" y="0" width="200" height="410" rx="${r}" fill="url(#fr)"/>`;
  let inner: string;
  if (o.front) {
    const s = o.screen ?? ["#C7D2FE", "#F0ABFC"];
    const scr = `<linearGradient id="sc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s[0]}"/><stop offset="1" stop-color="${s[1]}"/></linearGradient>`;
    if (spec.front === "home") {
      inner = `<defs>${scr}</defs><rect x="4" y="4" width="192" height="402" rx="${r - 4}" fill="#0B0B0D"/><rect x="13" y="58" width="174" height="294" fill="url(#sc)"/><rect x="82" y="29" width="36" height="6" rx="3" fill="#2A2B30"/><circle cx="100" cy="380" r="17" fill="none" stroke="#3A3B40" stroke-width="2.5"/>`;
    } else {
      const cut = spec.front === "island" ? `<rect x="68" y="20" width="64" height="19" rx="9.5" fill="#0B0B0D"/>` : `<path d="M58 10 h84 v10 a13 13 0 0 1 -13 13 h-58 a13 13 0 0 1 -13 -13 z" fill="#0B0B0D"/>`;
      inner = `<defs>${scr}</defs><rect x="4" y="4" width="192" height="402" rx="${r - 4}" fill="#0B0B0D"/><rect x="11" y="11" width="178" height="388" rx="${r - 10}" fill="url(#sc)"/>${cut}<path d="M11 11 h120 l-120 190 z" fill="#fff" opacity=".12"/>`;
    }
  } else {
    inner = `<rect x="4.5" y="4.5" width="191" height="401" rx="${r - 4.5}" fill="url(#bd)"/><clipPath id="cl"><rect x="4.5" y="4.5" width="191" height="401" rx="${r - 4.5}"/></clipPath><g clip-path="url(#cl)"><path d="M120 0 L200 0 L200 410 L150 410 Z" fill="#000" opacity=".07"/><path d="M0 0 L70 0 L0 260 Z" fill="#fff" opacity=".12"/><path d="M96 0 L128 0 L18 410 L-14 410 Z" fill="#fff" opacity=".06"/></g>${camera(spec.cam, c)}`;
  }
  const dim = o.dim ? `<rect x="-3" y="0" width="206" height="410" rx="${r}" fill="#1F2937" opacity=".45"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PM} ${-PM} ${200 + PM * 2} ${410 + PM * 2}" width="${200 + PM * 2}" height="${410 + PM * 2}">${DEFS}<defs>${frame}${body}</defs><g filter="url(#sh)">${shell}${inner}${dim}</g></svg>`;
}

/** iPhone を置く（x・y・h は本体そのものの左上と高さ。幅は h×200/410）。children は前面の画面の上に重ねる */
function Phone({ model, color, x, y, h, rotate, dim, front, screen, children }: { model: string; color?: string; x: number; y: number; h: number; rotate?: number; dim?: boolean; front?: boolean; screen?: [string, string]; children?: ReactNode }) {
  const s = h / 410, w = 200 * s;
  return (
    <div style={{ position: "absolute", left: x - PM * s, top: y - PM * s, width: w + PM * 2 * s, height: h + PM * 2 * s, display: "flex", ...(rotate ? { transform: `rotate(${rotate}deg)` } : {}) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svgUri(phoneSvg(model, color, { dim, front, screen }))} width={Math.round(w + PM * 2 * s)} height={Math.round(h + PM * 2 * s)} alt="" />
      {children && <div style={{ position: "absolute", left: PM * s, top: PM * s, width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>}
    </div>
  );
}

/** iPad のカメラ: flush＝小さい1眼（無印 第8・第9世代）／bump＝出っ張った1眼（Air）／pro＝四角い台座に2眼 */
type PadSpec = { cam: "flush" | "bump" | "pro"; front: "home" | "full"; colors: Record<string, [string, string]>; dots: boolean };
const PADS: Record<string, PadSpec> = {
  "8": { cam: "flush", front: "home", dots: false, colors: { silver: ["#ECEDEF", "#C6C9CE"], gray: ["#6A6C72", "#3D3F45"], gold: ["#F4E0CD", "#DDBFA2"] } },
  "9": { cam: "flush", front: "home", dots: false, colors: { silver: ["#ECEDEF", "#C6C9CE"], gray: ["#6A6C72", "#3D3F45"] } },
  Air5: { cam: "bump", front: "full", dots: true, colors: { blue: ["#A9C6E4", "#7FA5CC"], purple: ["#CFC6E8", "#AC9FD3"], pink: ["#F3D2D0", "#E0AFAC"], starlight: ["#F6EFE4", "#E0D4C0"], gray: ["#6A6C72", "#3D3F45"] } },
  AirM2: { cam: "bump", front: "full", dots: true, colors: { purple: ["#DAD3EC", "#B8ADD8"], blue: ["#C9D9E8", "#A3BAD0"], starlight: ["#F6EFE4", "#E0D4C0"] } },
  Pro11: { cam: "pro", front: "full", dots: true, colors: { gray: ["#72747A", "#44464C"], silver: ["#ECEDEF", "#C6C9CE"] } },
};
/** iPad の絵（300x416 の中に描く・縦向き） */
function padSvg(model: string, color: string | undefined, o: { dim?: boolean; front?: boolean; screen?: [string, string] }): string {
  const spec = PADS[model];
  const c = spec.colors[color ?? Object.keys(spec.colors)[0]];
  const defs = `<linearGradient id="fr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${mix(c[1], "#000000", 0.25)}"/><stop offset=".08" stop-color="${mix(c[0], "#ffffff", 0.45)}"/><stop offset=".5" stop-color="${mix(c[1], "#000000", 0.05)}"/><stop offset=".93" stop-color="${mix(c[0], "#ffffff", 0.35)}"/><stop offset="1" stop-color="${mix(c[1], "#000000", 0.3)}"/></linearGradient><linearGradient id="bd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(c[0], "#ffffff", 0.2)}"/><stop offset=".55" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>`;
  const rr = spec.front === "home" ? 20 : 24;
  let inner: string;
  if (o.front) {
    const s = o.screen ?? ["#BAE6FD", "#DDD6FE"];
    const scr = `<linearGradient id="sc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s[0]}"/><stop offset="1" stop-color="${s[1]}"/></linearGradient>`;
    inner = spec.front === "home"
      ? `<defs>${scr}</defs><rect x="4" y="4" width="292" height="408" rx="${rr - 4}" fill="#F4F4F2"/><rect x="18" y="46" width="264" height="324" fill="url(#sc)"/><circle cx="150" cy="25" r="3.5" fill="#2A2B30"/><circle cx="150" cy="391" r="13" fill="none" stroke="#B8BABF" stroke-width="2.2"/>`
      : `<defs>${scr}</defs><rect x="4" y="4" width="292" height="408" rx="${rr - 4}" fill="#0B0B0D"/><rect x="18" y="18" width="264" height="380" rx="8" fill="url(#sc)"/><path d="M18 18 h170 l-170 230 z" fill="#fff" opacity=".12"/>`;
  } else {
    const cam = spec.cam === "flush" ? lens(30, 30, 10) + mic(52, 30)
      : spec.cam === "bump" ? `<circle cx="38" cy="40" r="19" fill="#000" opacity=".25"/>` + lens(36, 37, 19) + mic(66, 37)
      : plate(16, 16, 74, 74, 20, c) + lens(38, 38, 14) + lens(68, 68, 14) + flash(68, 36, 5.5) + `<circle cx="38" cy="68" r="6" fill="#0A0D14"/>`;
    const dots = spec.dots ? [138, 150, 162].map((x) => `<circle cx="${x}" cy="392" r="3" fill="${mix(c[1], "#000000", 0.3)}"/>`).join("") : "";
    inner = `<rect x="4.5" y="4.5" width="291" height="407" rx="${rr - 4.5}" fill="url(#bd)"/><clipPath id="cl"><rect x="4.5" y="4.5" width="291" height="407" rx="${rr - 4.5}"/></clipPath><g clip-path="url(#cl)"><path d="M190 0 L300 0 L300 416 L230 416 Z" fill="#000" opacity=".07"/><path d="M0 0 L110 0 L0 280 Z" fill="#fff" opacity=".18"/><path d="M150 0 L196 0 L40 416 L-6 416 Z" fill="#fff" opacity=".09"/></g>${cam}${dots}`;
  }
  const btn = mix(c[1], "#000000", 0.25);
  const dim = o.dim ? `<rect x="0" y="0" width="300" height="416" rx="${rr}" fill="#1F2937" opacity=".62"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PM} ${-PM} ${300 + PM * 2} ${416 + PM * 2}" width="${300 + PM * 2}" height="${416 + PM * 2}">${DEFS}<defs>${defs}</defs><g filter="url(#sh)"><rect x="232" y="-3" width="34" height="5" rx="2" fill="${btn}"/><rect x="298" y="40" width="5" height="30" rx="2" fill="${btn}"/><rect x="298" y="76" width="5" height="30" rx="2" fill="${btn}"/><rect x="0" y="0" width="300" height="416" rx="${rr}" fill="url(#fr)"/>${inner}${dim}</g></svg>`;
}
/** iPad を置く（x・y・h は本体の左上と高さ。幅は h×300/416） */
function Pad({ model, color, x, y, h, rotate, dim, front, screen }: { model: string; color?: string; x: number; y: number; h: number; rotate?: number; dim?: boolean; front?: boolean; screen?: [string, string] }) {
  const s = h / 416, w = 300 * s;
  return (
    <div style={{ position: "absolute", left: x - PM * s, top: y - PM * s, width: w + PM * 2 * s, height: h + PM * 2 * s, display: "flex", ...(rotate ? { transform: `rotate(${rotate}deg)` } : {}) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svgUri(padSvg(model, color, { dim, front, screen }))} width={Math.round(w + PM * 2 * s)} height={Math.round(h + PM * 2 * s)} alt="" />
    </div>
  );
}
/** ペン（白い棒と先の円すい） */
function Pen({ x, y, len, rotate }: { x: number; y: number; len: number; rotate: number }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 64 ${len + 40}" width="64" height="${len + 40}">${DEFS}<defs><linearGradient id="pn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D1D5DB"/><stop offset=".3" stop-color="#FFFFFF"/><stop offset=".75" stop-color="#F3F4F6"/><stop offset="1" stop-color="#9CA3AF"/></linearGradient></defs><g filter="url(#sh)"><path d="M0 12 a12 12 0 0 1 24 0 v${len - 52} l-9 38 a3 3 0 0 1 -6 0 l-9 -38 z" fill="url(#pn)" stroke="#9CA3AF" stroke-width="1.2"/><path d="M0 ${len - 40} h24" stroke="#9CA3AF" stroke-width="1.5"/></g></svg>`;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", transform: `rotate(${rotate}deg)` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svgUri(svg)} width={64} height={len + 40} alt="" />
    </div>
  );
}

const Frame = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: FONT, overflow: "hidden" }}>{children}</div>
);
/** 端末の後ろに置く光（主役の1台を目立たせる） */
const Glow = ({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) => (
  <div style={{ position: "absolute", left: cx - r, top: cy - r, width: r * 2, height: r * 2, display: "flex", borderRadius: r, background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 68%)` }} />
);
const DARK = "radial-gradient(circle at 50% 38%, #525B6B 0%, #232A36 48%, #0B0B0F 100%)";
const DESK = "linear-gradient(180deg, #FBF3E4 0%, #EAD7B7 62%, #D9BE93 100%)";

type Plan = { F: () => ReactNode; G: () => ReactNode };

const PLANS: Record<string, Plan> = {
  // 1本目「いま買うならどれ？」
  //   script.md「11:05 まとめ」: 3万円なら SE 第3世代か 12 mini・5万円なら iPhone 13・7万円なら 14・10万円なら iPhone 15
  //   「0:00 結論」迷ったら5万円なら iPhone 13 ／「3:05」13 の相場 5.1万円（128GB）
  "2026-10-21-iphone-dore": {
    // F: 黒〜グレーの地。予算の札＋4台（SE3・13・14・15）の背面＋「どれが正解？」。13 だけ光と赤い札
    F: () => {
      const cols = [{ cx: 165, b: "3万円", m: "SE3", c: "red", n: "SE 第3世代" }, { cx: 480, b: "5万円", m: "13", c: "pink", n: "iPhone 13" }, { cx: 795, b: "7万円", m: "14", c: "yellow", n: "iPhone 14" }, { cx: 1110, b: "10万円", m: "15", c: "blue", n: "iPhone 15" }];
      return (
        <Frame bg={DARK}>
          <Glow cx={480} cy={290} r={300} color="rgba(255,225,0,0.9)" />
          {cols.map((p) => <Phone key={p.m} model={p.m} color={p.c} x={p.cx - 85} y={104} h={348} />)}
          {cols.map((p) => <TagC key={p.m} cx={p.cx} y={12} text={p.b} size={66} bg={p.m === "13" ? RED : YELLOW} color={p.m === "13" ? WHITE : BLACK} />)}
          {cols.map((p) => <TagC key={p.m} cx={p.cx} y={404} text={p.n} size={50} bg={WHITE} color={BLACK} border={BLACK} />)}
          <T x={8} y={512}><Outlined text="どれが正解？" size={180} color={YELLOW} inner={{ w: 9, c: BLACK }} outer={{ w: 5, c: WHITE }} spacing={-8} /></T>
        </Frame>
      );
    },
    // G: 黄の地（第1案 D の文字）＋ iPhone 13 の背面を大きく2台
    G: () => (
      <Frame bg={`radial-gradient(circle at 30% 35%, #FFF7AE 0%, ${YELLOW} 50%, #F5B400 100%)`}>
        <Phone model="13" color="pink" x={1064} y={70} h={500} rotate={13} />
        <Phone model="13" color="blue" x={912} y={28} h={556} rotate={-5} />
        <T x={30} y={30}><Outlined text="5万円" size={270} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
        <T x={690} y={180}><Plain text="なら" size={100} color={BLACK} /></T>
        <T x={32} y={330}><Outlined text="iPhone 13" size={176} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></T>
        <Tag x={36} y={566} text="中古の相場 5.1万円" size={78} bg={BLACK} color={WHITE} />
      </Frame>
    ),
  },
  // 6本目「何世代まで買っていい？」
  //   script.md「0:00 結論」最低ラインは iPhone 11 と SE 第2世代／「1:35」X・XS・XR は iOS 27 非対応、11・SE 第2世代・12 は対応
  "2026-10-26-how-old": {
    // F: 黒〜グレーの地。新しい順に 12・SE2・11｜XR・XS・X を並べ、11 と XR の間に「ここまで」の線
    F: () => {
      const ok = [{ cx: 110, m: "12", c: "blue", n: "12" }, { cx: 290, m: "SE2", c: "red", n: "SE2" }, { cx: 470, m: "11", c: "purple", n: "11" }];
      const ng = [{ cx: 730, m: "XR", c: "coral", n: "XR" }, { cx: 910, m: "XS", c: "gold", n: "XS" }, { cx: 1090, m: "X", c: "silver", n: "X" }];
      return (
        <Frame bg={DARK}>
          <div style={{ position: "absolute", left: 606, top: 214, width: 674, height: 506, display: "flex", background: "rgba(127,29,29,0.55)" }} />
          <T x={22} y={30}><Outlined text="買うなら" size={124} color={WHITE} outer={{ w: 7, c: BLACK }} spacing={-5} /></T>
          <T x={500} y={10}><Outlined text="ここまで" size={190} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 6, c: BLACK }} spacing={-8} /></T>
          {ok.map((p) => <Phone key={p.m} model={p.m} color={p.c} x={p.cx - 74} y={292} h={304} />)}
          {ng.map((p) => <Phone key={p.m} model={p.m} color={p.c} x={p.cx - 74} y={292} h={304} dim />)}
          {ok.map((p) => <TagC key={p.m} cx={p.cx} y={222} text={p.n} size={50} bg={WHITE} color={BLACK} />)}
          {ng.map((p) => <TagC key={p.m} cx={p.cx} y={222} text={p.n} size={50} bg="#374151" color={WHITE} />)}
          <div style={{ position: "absolute", left: 594, top: 206, width: 14, height: 514, display: "flex", background: RED, border: `3px solid ${WHITE}` }} />
          <Tag x={30} y={618} text="iOS 27 に対応" size={66} bg={GREEN} color={WHITE} radius={8} />
          <Tag x={660} y={470} text="iOS 27 非対応" size={70} bg={RED} color={WHITE} radius={8} rotate={-5} />
        </Frame>
      );
    },
    // G: 赤と緑に割った暗い地（第1案 E の文字）＋ XR と 11 の背面を大きく
    G: () => (
      <Frame bg="linear-gradient(98deg, #7F1D1D 0%, #3B0A0A 49.8%, #064E3B 50.2%, #022C22 100%)">
        <Phone model="XR" color="coral" x={36} y={44} h={540} rotate={-4} dim />
        <T x={318} y={24}><Outlined text="XR" size={236} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-8} /></T>
        <Cross x={150} y={250} size={170} />
        <T x={330} y={300}><Plain text="iOS 27" size={84} color={WHITE} /></T>
        <T x={326} y={396}><Plain text="非対応" size={100} color="#FCA5A5" /></T>
        <Phone model="11" color="green" x={672} y={44} h={540} rotate={4} />
        <T x={962} y={24}><Outlined text="11" size={250} color={YELLOW} outer={{ w: 8, c: BLACK }} spacing={-8} /></T>
        <Maru x={720} y={290} size={170} />
        <T x={966} y={300}><Plain text="iOS 27" size={84} color={WHITE} /></T>
        <T x={962} y={396}><Plain text="対応" size={100} color="#6EE7B7" /></T>
        <Tag x={300} y={612} text="中古の最低ライン" size={72} bg={YELLOW} color={BLACK} />
      </Frame>
    ),
  },
  // 7本目「買ってはいけない5つの条件」
  //   script.md「0:00 結論」電池80%未満／いちばん安い1台に飛びつく／64GB／新品より高い中古／赤ロム保証が書いてない店
  //   「1:30」Apple の電池交換 13 は 15,600円
  "2026-10-27-dont-buy": {
    // F: 赤黒の地。5台（iPhone 13 の色違い）に条件の札と ✕。「この5つは／買うな」
    F: () => {
      const cols = [{ cx: 140, c: "pink", t: ["電池", "80%未満"] }, { cx: 390, c: "blue", t: ["安すぎる", "1台"] }, { cx: 640, c: "starlight", t: ["64GB"] }, { cx: 890, c: "midnight", t: ["新品より", "高い"] }, { cx: 1140, c: "red", t: ["赤ロム"] }];
      return (
        <Frame bg={`radial-gradient(circle at 50% 45%, #8B1C1C 0%, #3A0C0C 50%, ${BLACK} 100%)`}>
          <Tag x={0} y={14} text="中古iPhone" size={78} bg={YELLOW} color={BLACK} />
          <T x={560} y={10}><Outlined text="この5つは" size={104} color={WHITE} outer={{ w: 7, c: BLACK }} spacing={-5} /></T>
          {cols.map((p) => <Phone key={p.c} model="13" color={p.c} x={p.cx - 62} y={250} h={254} />)}
          {cols.map((p) => <Cross key={p.c} x={p.cx - 48} y={356} size={96} />)}
          {cols.map((p) => (
            <div key={p.c} style={{ position: "absolute", left: p.cx - 125, top: 128, width: 250, height: 116, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 236, height: 116, background: WHITE, borderRadius: 12, boxShadow: "5px 5px 0 rgba(0,0,0,0.35)" }}>
                {p.t.map((l) => <Plain key={l} text={l} size={p.t.length === 1 ? 66 : 50} color={BLACK} spacing={-2} />)}
              </div>
            </div>
          ))}
          <T x={22} y={508}><Outlined text="買うな" size={186} color={WHITE} inner={{ w: 10, c: RED }} outer={{ w: 7, c: BLACK }} spacing={-8} /></T>
          <Tag x={650} y={524} text="検品担当が選んだ" size={56} bg={BLACK} color={YELLOW} radius={8} />
        </Frame>
      );
    },
    // G: 黒の地。電池の減った前面1台＋背面1台を大きく。「電池80%未満／買うな／交換すると15,600円」（第1案 E の文字）
    G: () => (
      <Frame bg={`radial-gradient(circle at 18% 55%, #7F1D1D 0%, ${BLACK} 58%)`}>
        <Phone model="13" color="midnight" x={170} y={70} h={560} rotate={9} />
        <Phone model="13" color="starlight" x={36} y={96} h={560} rotate={-6} front screen={["#FECACA", "#FDE68A"]}><Cell w={170} fill={0.18} color={RED} /></Phone>
        <Cross x={20} y={30} size={150} />
        <T x={500} y={30}><Plain text="電池" size={100} color={WHITE} /></T>
        <T x={712} y={14}><Outlined text="80%未満" size={128} color={YELLOW} outer={{ w: 6, c: BLACK }} spacing={-6} /></T>
        <T x={478} y={176}><Outlined text="買うな" size={270} color={WHITE} inner={{ w: 10, c: RED }} outer={{ w: 8, c: BLACK }} spacing={-10} /></T>
        <Tag x={500} y={486} text="交換すると15,600円" size={76} bg={YELLOW} color={BLACK} />
      </Frame>
    ),
  },
  // 4本目「店選びの正解は？」
  //   script.md「4:00」安い順に5店並べた1位と5位の差（128GB）: 13 5,200円・14 6,200円・15 7,266円・16 15,820円
  //   「0:00」どの機種でも最安、っていう店はない／「0:50」16店・最安を数えた41機種
  "2026-10-24-where-to-buy": {
    // F: 黒〜グレーの地。13・14・15・16 の背面＋機種名の札＋店による差の札。「店で／1.6万円差」
    F: () => {
      const cols = [{ cx: 165, m: "13", c: "blue", d: "5,200円" }, { cx: 480, m: "14", c: "purple", d: "6,200円" }, { cx: 795, m: "15", c: "pink", d: "7,266円" }, { cx: 1110, m: "16", c: "ultramarine", d: "15,820円" }];
      return (
        <Frame bg={DARK}>
          <Glow cx={1110} cy={280} r={290} color="rgba(255,225,0,0.9)" />
          {cols.map((p) => <Phone key={p.m} model={p.m} color={p.c} x={p.cx - 85} y={98} h={348} />)}
          {cols.map((p) => <TagC key={p.m} cx={p.cx} y={12} text={`iPhone ${p.m}`} size={54} bg={WHITE} color={BLACK} />)}
          {cols.map((p) => <TagC key={p.m} cx={p.cx} y={384} text={`差 ${p.d}`} size={48} bg={p.m === "16" ? RED : YELLOW} color={p.m === "16" ? WHITE : BLACK} border={BLACK} />)}
          <T x={14} y={572}><Outlined text="店で" size={110} color={WHITE} outer={{ w: 7, c: BLACK }} spacing={-4} /></T>
          <T x={236} y={516}><Outlined text="1.6万円差" size={180} color={YELLOW} inner={{ w: 9, c: RED }} outer={{ w: 6, c: BLACK }} spacing={-9} /></T>
        </Frame>
      );
    },
    // G: 赤黒の地。「ぜんぶ安い店は／0店」＋背面2台を大きく
    G: () => (
      <Frame bg="radial-gradient(circle at 30% 55%, #9B1C1C 0%, #2A0A0A 60%, #0B0B0F 100%)">
        <Phone model="16" color="ultramarine" x={984} y={30} h={540} rotate={7} />
        <Phone model="15" color="pink" x={770} y={176} h={420} rotate={-7} />
        <Tag x={0} y={24} text="ぜんぶ安い店は" size={118} bg={YELLOW} color={BLACK} />
        <T x={40} y={196}><Outlined text="0店" size={380} color={WHITE} inner={{ w: 12, c: RED }} outer={{ w: 9, c: BLACK }} spacing={-10} /></T>
        <Tag x={0} y={606} text="16店・41機種で比較" size={74} bg={WHITE} color={BLACK} />
      </Frame>
    ),
  },
  // 3本目「【中古iPad】いま買うならどれ？」
  //   script.md「0:00 結論」5万円なら無印の第9世代・7万円なら iPad Air の第5世代・10万円なら絵を描くなら Air 11インチ M2、動画やゲームなら iPad Pro 11インチ 第3世代
  //   「1:30」第8世代は iPadOS 27 に対応していない
  "2026-10-23-ipad-dore": {
    // F: 明るい机の色の地。予算の札＋4台（第9世代・Air 第5世代・Air M2・Pro 11）の背面＋「どれを選ぶ？」
    F: () => {
      const cols = [{ cx: 165, b: "5万円", m: "9", c: "silver", n: "第9世代" }, { cx: 480, b: "7万円", m: "Air5", c: "blue", n: "Air 第5世代" }, { cx: 795, b: "10万円", m: "AirM2", c: "purple", n: "Air M2" }, { cx: 1110, b: "10万円", m: "Pro11", c: "gray", n: "Pro 11" }];
      return (
        <Frame bg={DESK}>
          <Glow cx={480} cy={280} r={290} color="rgba(225,29,29,0.75)" />
          {cols.map((p) => <Pad key={p.m} model={p.m} color={p.c} x={p.cx - 124} y={100} h={344} />)}
          {cols.map((p) => <TagC key={p.m} cx={p.cx} y={12} text={p.b} size={66} bg={p.m === "Air5" ? RED : BLACK} color={p.m === "Air5" ? WHITE : YELLOW} />)}
          {cols.map((p) => <TagC key={p.m} cx={p.cx} y={398} text={p.n} size={50} bg={WHITE} color={BLACK} border={BLACK} />)}
          <T x={8} y={512}><Outlined text="どれを選ぶ？" size={180} color={RED} inner={{ w: 9, c: WHITE }} outer={{ w: 6, c: BLACK }} spacing={-8} /></T>
        </Frame>
      );
    },
    // G: 白〜うすい黄の地（第1案 D の文字）＋ Air 第5世代の背面を大きく＋ペン
    G: () => (
      <Frame bg={`linear-gradient(180deg, ${WHITE} 0%, #FFF3A6 100%)`}>
        <Pad model="Air5" color="blue" x={872} y={44} h={520} rotate={5} />
        <Pen x={1196} y={96} len={400} rotate={12} />
        <Tag x={0} y={22} text="絵を描く中古iPad" size={80} bg={BLACK} color={YELLOW} />
        <T x={30} y={150}><Outlined text="7万円" size={310} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-12} /></T>
        <T x={40} y={492}><Outlined text="Air 第5世代" size={160} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-6} /></T>
      </Frame>
    ),
  },
};

(async () => {
  const only = process.argv[2]?.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const [key, plan] of Object.entries(PLANS)) {
    if (only && only !== key) continue;
    for (const v of ["F", "G"] as const) {
      const res = new ImageResponse(<>{plan[v]()}</>, { width: W, height: H, fonts });
      writeFileSync(join(__dirname, key, `thumb-${v}.png`), Buffer.from(await res.arrayBuffer()));
    }
    console.log(`F・G → longform/${key}`);
  }
})();
