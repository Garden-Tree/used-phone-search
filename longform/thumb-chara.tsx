/**
 * 横動画のサムネの案・キャラ入り（2026-10-23〜）。thumb-ab.tsx のキャラあり版
 *   npx tsx longform/thumb-chara.tsx <フォルダ>
 * 「ずんだもん解説」系の再生の多いサムネ（10/23 調べ）の型:
 * - 上に2〜3枚のパネル（黄色の見出し札＋製品＋値段）、下に画面幅いっぱいの極太の見出し（白に黒と赤の二重ふち）
 * - キャラは表情を変えて（驚き・青ざめ・ウインク）、吹き出しでひと言
 * 立ち絵は CC BY・CC0・パブリックドメインの写真とだけ組む（CC BY-SA の写真とは混ぜない）
 * 立ち絵は longform/assets/chara/expr/（chara-expr.py）。写真は longform/assets/photos/*-cut.png
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { SITE } from "@/lib/brandColors";

type Photo = { file: string; credit: string };
type Panel = { head: string; photo?: Photo; label?: string; value?: string; minus?: boolean };
type Plan = {
  panels: Panel[];
  chara: string; bubble: string;
  headline: [string, string];
  big: { chara: string; bubble: string; lines: [string, string]; photo: Photo };
};

const PH = {
  iphone13: { file: "iphone13-tora-cut.png", credit: "iPhone 13 for Tora — Tatsuo Yamashita / CC BY 2.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_13_for_Tora_(52641558635).jpg）・背景を切り抜き" },
  iphone15: { file: "iphone15-pd-single-cut.png", credit: "Apple iPhone 15 — Ka Kit Pang / Public domain / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:Apple_iPhone_15.jpeg）・切り抜き" },
  iphone16: { file: "iphone16-ultramarine-cut.png", credit: "iPhone 16 Ultramarine Rear — Padgriffin / CC BY 4.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_16_Ultramarine_Rear.png）・背景を切り抜き" },
  iphone13pro: { file: "iphone13pro-cc0-cut.png", credit: "iPhone 13 Pro — NutzerAusBerlin / CC0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_13_Pro_20260925_Sierrablau.jpg）・背景を切り抜き" },
} satisfies Record<string, Photo>;

const W = 1280, H = 720;
const RED = SITE.price, BLUE = "#2563EB", YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";

// 数字は公開した動画・説明欄と同じ
const PLANS: Record<string, Plan> = {
  "2026-10-21-iphone-dore": {
    panels: [
      { head: "5万円なら", photo: PH.iphone13, label: "iPhone 13" },
      { head: "10万円なら", photo: PH.iphone15, label: "iPhone 15" },
    ],
    chara: "zundamon-surprised", bubble: "5万円で\n十分なのだ!?",
    headline: ["中古iPhone ", "予算別の正解"],
    big: { chara: "tsumugi-wink", bubble: "迷ったらコレ！", lines: ["5万円なら", "iPhone 13"], photo: PH.iphone13 },
  },
  "2026-10-23-iphone-priority": {
    panels: [
      { head: "1世代前", value: "−2.5万", minus: true },
      { head: "ランクC", value: "−1.4万", minus: true },
      { head: "電池90%台", value: "+0.6万" },
    ],
    chara: "tsumugi-surprised", bubble: "電池は\nケチらないで！",
    headline: ["中古iPhone ", "お金をかける順番"],
    big: { chara: "zundamon-shock", bubble: "ケチったら\n損なのだ…", lines: ["電池と容量は", "ケチるな"], photo: PH.iphone16 },
  },
};

const b64 = (path: string) => readFileSync(path).toString("base64");
const photo = (p: Photo, style: Record<string, unknown>) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`data:image/png;base64,${b64(join(__dirname, "assets/photos", p.file))}`} style={{ position: "absolute", objectFit: "contain", ...style }} />
);
const chara = (name: string, style: Record<string, unknown>) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`data:image/png;base64,${b64(join(__dirname, "assets/chara/expr", `${name}.png`))}`} style={{ position: "absolute", ...style }} />
);

/** ふち取り文字（同じ文字を16方向にずらして重ねる。satori は text-stroke を描かない） */
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
const em = (t: string) => Array.from(t).reduce((w, c) => w + (c === " " ? 0.3 : c.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0);
const fit = (t: string, width: number, max: number) => Math.min(max, Math.floor(width / em(t)));

/** 吹き出し（白・黒い縁） */
const Bubble = ({ text, size, style }: { text: string; size: number; style: Record<string, unknown> }) => (
  <div style={{ position: "absolute", display: "flex", flexDirection: "column", padding: "14px 26px", borderRadius: 40, background: WHITE, border: `6px solid ${BLACK}`, ...style }}>
    {text.split("\n").map((l) => <div key={l} style={{ display: "flex", fontSize: size, fontWeight: 900, color: BLACK, lineHeight: 1.15, whiteSpace: "nowrap" }}>{l}</div>)}
  </div>
);

/** N: 右にパネル（黄色の見出し札＋製品か値段）・左にキャラと吹き出し・下に極太の見出し（ずんだもん解説の型） */
const N = (p: Plan) => {
  const n = p.panels.length, area = 900, gap = 16, pw = Math.floor((area - gap * (n - 1)) / n);
  const hs = fit(p.headline[1], 1160, 210);
  return (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: "linear-gradient(160deg, #3B0A0A 0%, #0B0B0F 60%)", fontFamily: "Noto Sans JP" }}>
      <div style={{ position: "absolute", left: 360, top: 18, display: "flex" }}>
        {p.panels.map((pa, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", width: pw, height: 420, marginLeft: i ? gap : 0, background: WHITE, borderRadius: 18, overflow: "hidden", border: `5px solid ${BLACK}` }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 90, background: YELLOW, fontSize: fit(pa.head, pw - 30, 66), fontWeight: 900, color: BLACK }}>{pa.head}</div>
            <div style={{ display: "flex", position: "relative", flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
              {pa.photo ? photo(pa.photo, { left: 10, top: 6, width: pw - 20, height: 240 }) : null}
              {pa.label ? <div style={{ position: "absolute", bottom: 8, display: "flex" }}><Outlined text={pa.label} size={fit(pa.label, pw - 30, 70)} color={BLACK} inner={{ w: 6, c: WHITE }} /></div> : null}
              {pa.value ? <Outlined text={pa.value} size={fit(pa.value, pw - 24, 130)} color={pa.minus ? BLUE : RED} inner={{ w: 6, c: WHITE }} outer={{ w: 4, c: BLACK }} spacing={-6} /> : null}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: W, height: 250, display: "flex", alignItems: "center", justifyContent: "center", background: RED }}>
        <Outlined text={p.headline[1]} size={hs} color={YELLOW} inner={{ w: 8, c: BLACK }} outer={{ w: 6, c: WHITE }} spacing={-10} />
      </div>
      <div style={{ position: "absolute", left: 24, top: 446, display: "flex", padding: "2px 16px", background: BLACK, color: WHITE, fontSize: 44, fontWeight: 900 }}>{p.headline[0].trim()}</div>
      {chara(p.chara, { left: -20, top: 40, height: 430 })}
      <Bubble text={p.bubble} size={34} style={{ left: 150, top: 14 }} />
    </div>
  );
};

/** O: キャラを大きく左に・右上に巨大な2段・右に製品（「買ってみた」型） */
const O = (p: Plan) => {
  const b = p.big;
  return (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: `radial-gradient(circle at 70% 50%, #FFF7AE 0%, ${YELLOW} 45%, #F59E0B 100%)`, fontFamily: "Noto Sans JP" }}>
      {photo(b.photo, { left: 760, top: 210, width: 420, height: 480, transform: "rotate(8deg)" })}
      {chara(b.chara, { left: -40, top: 120, height: 760 })}
      <div style={{ position: "absolute", left: 400, top: 24, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <Outlined text={b.lines[0]} size={fit(b.lines[0], 840, 140)} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
        <div style={{ display: "flex", marginTop: 6 }}><Outlined text={b.lines[1]} size={fit(b.lines[1], 860, 200)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
      </div>
      <Bubble text={b.bubble} size={46} style={{ left: 330, top: 470 }} />
    </div>
  );
};

(async () => {
  const dir = process.argv[2];
  const key = dir.replace(/\\/g, "/").split("/").filter(Boolean).pop()!;
  const plan = PLANS[key];
  if (!plan) throw new Error(`サムネの案がありません: ${key}`);
  const out = join(dir, "thumb-ab");
  mkdirSync(out, { recursive: true });
  const fonts = await notoSansJp([...plan.panels.flatMap((x) => [x.head, x.label ?? "", x.value ?? ""]), plan.bubble, ...plan.headline, plan.big.bubble, ...plan.big.lines].join(""));
  for (const [name, f] of Object.entries({ N, O })) {
    const res = new ImageResponse(f(plan), { width: W, height: H, fonts });
    writeFileSync(join(out, `${name}.png`), Buffer.from(await res.arrayBuffer()));
  }
  const photos = [...plan.panels.flatMap((x) => (x.photo ? [x.photo] : [])), plan.big.photo];
  writeFileSync(join(out, "credits-chara.txt"), [...new Set(photos.map((x) => x.credit))].map((c) => `サムネイル画像: ${c}`).join("\n") + "\n");
  console.log(`キャラ入りのサムネの案 → ${out}`);
})();
