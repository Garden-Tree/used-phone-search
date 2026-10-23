/**
 * 横動画のサムネの案（YouTube の「テストと比較」用）を何枚か作る（2026-10-23〜）。
 *   npx tsx longform/thumb-ab.tsx <フォルダ>
 * 写真は longform/assets/photos/（Wikimedia Commons の CC 画像。Git に入れない）。出典は <フォルダ>/thumb-ab/credits.txt に書き、説明欄に載せる
 *
 * 再生の多いガジェット系のサムネを見て決めた決まり（10/23）:
 * - 文字が画面の半分以上。いちばん言いたい1語は高さの 1/3 以上（「買うな」「やめとけ5台」）
 * - 文字は極太で二重のふち（白の内側＋黒の外側）。色のついた帯（赤・黄・黒）を敷いて段にする
 * - 製品はくっきり（画面がついた明るい写真か、無地の上）。ごちゃついた背景の写真は小さく枠に入れる
 * - 右下は再生時間の表示で隠れるので何も置かない
 * 型: G 色帯3段 / H 1語 / I 写真を並べて値札 / J 端末の絵 / K 黒地に2段＋切り抜き / L 黄色地に切り抜きを並べる / M 赤黒の斜め分割
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { SITE } from "@/lib/brandColors";

type Photo = { file: string; credit: string; pos?: string };
type Plan = {
  /** 段にする文字（上から。key の段がいちばん大きい） */
  bars: { text: string; bg: string; color: string; key?: boolean }[];
  /** 1語で見せる案（H）の上の小さな行と、大きな語 */
  hero: { top: string; word: string };
  /** 写真（G・H で右に枠で置く） */
  photo: Photo;
  /** 切り抜き写真（K・L・M） */
  cut: Photo;
  /** 並べる切り抜き（L） */
  cutLineup: { label: string; price: string; photo: Photo }[];
  /** 並べる機種（I・J。値札は動画の数字） */
  lineup: { label: string; price: string; photo?: Photo; screen: [string, string] }[];
  lineupTitle: string;
};

const PHOTOS = {
  iphone13: { file: "iphone13-tora.jpg", credit: "iPhone 13 for Tora — Tatsuo Yamashita / CC BY 2.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_13_for_Tora_(52641558635).jpg）", pos: "62% 45%" },
  iphone14: { file: "iphone14-red.jpg", credit: "iPhone 14 Product Red — Hajoon0102 / CC BY-SA 4.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_14_Product_Red.jpg）", pos: "50% 25%" },
  iphone15: { file: "iphone15-pd-single.jpg", credit: "Apple iPhone 15 — Ka Kit Pang / Public domain / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:Apple_iPhone_15.jpeg）" },
} satisfies Record<string, Photo>;

/** 背景を切り抜いた写真（longform/assets/photos/*-cut.png。rembg で切り抜き・中の穴は埋める） */
const CUT = {
  iphone13: { file: "iphone13-hand-cut.png", credit: "iPhone 13 — Kskhh / CC BY-SA 4.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_13.jpg）・背景を切り抜き" },
  iphone14: { file: "iphone14-red-cut.png", credit: "iPhone 14 Product Red — Hajoon0102 / CC BY-SA 4.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_14_Product_Red.jpg）・背景を切り抜き" },
  iphone15: { file: "iphone15-pd-single-cut.png", credit: "Apple iPhone 15 — Ka Kit Pang / Public domain / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:Apple_iPhone_15.jpeg）・切り抜き" },
} satisfies Record<string, Photo>;

const W = 1280, H = 720;
const RED = SITE.price, YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF";

// 動画ごとの文字（数字は公開した動画・説明欄と同じ）
const PLANS: Record<string, Plan> = {
  "2026-10-21-iphone-dore": {
    bars: [
      { text: "中古iPhone", bg: WHITE, color: BLACK },
      { text: "5万円なら", bg: RED, color: WHITE },
      { text: "iPhone 13", bg: YELLOW, color: BLACK, key: true },
    ],
    hero: { top: "中古iPhone 予算別の", word: "正解" },
    photo: PHOTOS.iphone13,
    lineup: [
      { label: "iPhone 13", price: "5.1万", photo: { ...PHOTOS.iphone13, pos: "62% 40%" }, screen: ["#C7D2FE", "#F0ABFC"] },
      { label: "iPhone 14", price: "6.6万", photo: { ...PHOTOS.iphone14, pos: "50% 30%" }, screen: ["#FECACA", "#FDE68A"] },
      { label: "iPhone 15", price: "9.1万", photo: PHOTOS.iphone15, screen: ["#BAE6FD", "#A7F3D0"] },
    ],
    lineupTitle: "どれ買うべき？!",
    cut: CUT.iphone13,
    cutLineup: [{ label: "13", price: "5.1万", photo: CUT.iphone13 }, { label: "14", price: "6.6万", photo: CUT.iphone14 }, { label: "15", price: "9.1万", photo: CUT.iphone15 }],
  },
  "2026-10-23-iphone-priority": {
    bars: [
      { text: "中古iPhone", bg: WHITE, color: BLACK },
      { text: "電池と容量は", bg: RED, color: WHITE },
      { text: "ケチるな", bg: YELLOW, color: BLACK, key: true },
    ],
    hero: { top: "中古iPhone 電池と容量は", word: "ケチるな" },
    photo: PHOTOS.iphone14,
    lineup: [
      { label: "世代", price: "−2.5万", screen: ["#C7D2FE", "#93C5FD"] },
      { label: "ランク", price: "−1.4万", screen: ["#E9D5FF", "#C4B5FD"] },
      { label: "電池", price: "+0.6万", screen: ["#FECACA", "#FCA5A5"] },
    ],
    lineupTitle: "お金をかける順番",
    cut: CUT.iphone14,
    cutLineup: [],
  },
};

const img = (p: Photo, style: Record<string, unknown>) => {
  const data = readFileSync(join(__dirname, "assets/photos", p.file)).toString("base64");
  // eslint-disable-next-line @next/next/no-img-element
  const png = p.file.endsWith(".png");
  // 切り抜き（PNG）は縮めて全体を見せる、写真（JPEG）は枠いっぱいに
  return <img src={`data:image/${png ? "png" : "jpeg"};base64,${data}`} style={{ position: "absolute", objectFit: png ? "contain" : "cover", objectPosition: p.pos ?? "50% 50%", ...style }} />;
};

/**
 * ふち取り文字。satori は -webkit-text-stroke を描かないので、同じ文字を16方向にずらして重ねる。
 * inner＝内側のふち（白など）、outer＝外側のふち（黒）
 */
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

/** 文字の幅（em）。全角1・半角0.6 */
const em = (t: string) => Array.from(t).reduce((w, c) => w + (c === " " ? 0.3 : c.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0);
const fit = (t: string, width: number, max: number) => Math.min(max, Math.floor(width / em(t)));

/** G: 色の帯を3段に敷いて巨大な文字＋右に写真の枠（「やめとけ5台／正解3台」型） */
const G = (p: Plan) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: BLACK, fontFamily: "Noto Sans JP" }}>
    <div style={{ position: "absolute", right: 30, top: 40, width: 360, height: 560, display: "flex", borderRadius: 28, overflow: "hidden", border: `10px solid ${WHITE}` }}>
      {img(p.photo, { left: 0, top: 0, width: 340, height: 540 })}
    </div>
    <div style={{ position: "absolute", left: 0, top: 26, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {p.bars.map((b, i) => {
        const size = fit(b.text, 820, b.key ? 230 : 150);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", height: Math.round(size * 1.18), padding: "0 30px 0 36px", marginBottom: 14, background: b.bg }}>
            <div style={{ display: "flex", fontSize: size, fontWeight: 900, color: b.color, letterSpacing: -6, lineHeight: 1, whiteSpace: "nowrap" }}>{b.text}</div>
          </div>
        );
      })}
    </div>
  </div>
);

/** H: 1語を画面の高さの半分近くまで（「買うな！」型）。暗い赤の地に白文字・赤と黒の二重ふち */
const Hh = (p: Plan) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: "radial-gradient(circle at 70% 40%, #7F1D1D 0%, #1F0A0A 70%)", fontFamily: "Noto Sans JP" }}>
    <div style={{ position: "absolute", right: 40, top: 40, width: 300, height: 440, display: "flex", borderRadius: 24, overflow: "hidden", border: `8px solid ${WHITE}`, transform: "rotate(6deg)" }}>
      {img(p.photo, { left: 0, top: 0, width: 284, height: 424 })}
    </div>
    <div style={{ position: "absolute", left: 40, top: 40, display: "flex" }}>
      <Outlined text={p.hero.top} size={fit(p.hero.top, 820, 92)} color={YELLOW} outer={{ w: 8, c: BLACK }} />
    </div>
    <div style={{ position: "absolute", left: 30, bottom: 40, display: "flex" }}>
      <Outlined text={p.hero.word} size={fit(p.hero.word, 1080, 330)} color={WHITE} inner={{ w: 10, c: RED }} outer={{ w: 10, c: BLACK }} spacing={-10} />
    </div>
  </div>
);

/** 端末の絵（ロゴなし・明るい画面）。写真がごちゃつくときの代わり */
function Phone({ w, h, screen }: { w: number; h: number; screen: [string, string] }) {
  return (
    <div style={{ display: "flex", width: w, height: h, borderRadius: w * 0.16, background: "#1F2937", padding: w * 0.045, boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}>
      <div style={{ display: "flex", flexGrow: 1, borderRadius: w * 0.12, background: `linear-gradient(160deg, ${screen[0]}, ${screen[1]})`, justifyContent: "center" }}>
        <div style={{ display: "flex", width: w * 0.32, height: w * 0.09, marginTop: w * 0.05, borderRadius: 99, background: "#111827" }} />
      </div>
    </div>
  );
}

/** I: 上に機種を並べて値札（写真）・下の白地に赤い極太の問い（「どれ買うべき？!」型） */
const I = (p: Plan) => (
  <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: WHITE, fontFamily: "Noto Sans JP" }}>
    <div style={{ display: "flex", height: 430, padding: "20px 24px 0", justifyContent: "space-between" }}>
      {p.lineup.map((l) => (
        <div key={l.label} style={{ display: "flex", position: "relative", width: 400, height: 410, borderRadius: 20, overflow: "hidden", background: "#E5E7EB" }}>
          {l.photo ? img(l.photo, { left: 0, top: 0, width: 400, height: 410 }) : <div style={{ display: "flex", width: 400, height: 410, alignItems: "center", justifyContent: "center" }}><Phone w={190} h={360} screen={l.screen} /></div>}
          <div style={{ position: "absolute", left: 0, top: 0, display: "flex", padding: "6px 18px", background: BLACK, color: WHITE, fontSize: 46, fontWeight: 900, borderBottomRightRadius: 16 }}>{l.label}</div>
          <div style={{ position: "absolute", left: 14, bottom: 14, display: "flex" }}>
            <Outlined text={l.price} size={110} color={RED} inner={{ w: 8, c: WHITE }} outer={{ w: 5, c: BLACK }} />
          </div>
        </div>
      ))}
    </div>
    <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
      <Outlined text={p.lineupTitle} size={fit(p.lineupTitle, 1180, 230)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} />
    </div>
  </div>
);

/** J: I と同じ形で、写真の代わりに端末の絵（無地で製品がくっきり） */
const J = (p: Plan) => (
  <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #F8FAFC, #E2E8F0)", fontFamily: "Noto Sans JP" }}>
    <div style={{ display: "flex", height: 440, padding: "16px 60px 0", justifyContent: "space-between", alignItems: "flex-end" }}>
      {p.lineup.map((l) => (
        <div key={l.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 900, color: BLACK, marginBottom: 8 }}>{l.label}</div>
          <Phone w={180} h={330} screen={l.screen} />
          <div style={{ position: "absolute", bottom: -10, display: "flex" }}>
            <Outlined text={l.price} size={104} color={RED} inner={{ w: 8, c: WHITE }} outer={{ w: 5, c: BLACK }} />
          </div>
        </div>
      ))}
    </div>
    <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", background: BLACK, marginTop: 20 }}>
      <Outlined text={p.lineupTitle} size={fit(p.lineupTitle, 1180, 200)} color={YELLOW} outer={{ w: 8, c: RED }} spacing={-8} />
    </div>
  </div>
);

/** K: 黒地・左に巨大な2段（上は白・下は黄で最大）・右に切り抜きを大きく傾けて（「iPhone17最強 だが買うな」型） */
const K = (p: Plan) => {
  const [a, b] = [p.bars[p.bars.length - 2].text, p.bars[p.bars.length - 1].text];
  return (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: "radial-gradient(circle at 78% 45%, #3F3F46 0%, #09090B 65%)", fontFamily: "Noto Sans JP" }}>
      {img(p.cut, { right: -10, top: 30, width: 520, height: 680, transform: "rotate(10deg)" })}
      <div style={{ position: "absolute", left: 36, top: 40, display: "flex", flexDirection: "column" }}>
        <Outlined text={p.bars[0].text} size={84} color={WHITE} outer={{ w: 6, c: BLACK }} />
        <div style={{ display: "flex", marginTop: 24 }}><Outlined text={a} size={fit(a, 780, 170)} color={WHITE} inner={{ w: 8, c: BLACK }} outer={{ w: 6, c: RED }} spacing={-6} /></div>
        <div style={{ display: "flex", marginTop: 20 }}><Outlined text={b} size={fit(b, 800, 250)} color={YELLOW} inner={{ w: 10, c: BLACK }} outer={{ w: 8, c: RED }} spacing={-10} /></div>
      </div>
    </div>
  );
};

/** L: 黄色の地に切り抜きを3台並べて赤い値札・上に黒の極太の問い（並べる型を無地で） */
const L = (p: Plan) => p.cutLineup.length ? (
  <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: YELLOW, fontFamily: "Noto Sans JP" }}>
    <div style={{ display: "flex", height: 210, alignItems: "center", justifyContent: "center", background: BLACK }}>
      <Outlined text={`中古iPhone ${p.lineupTitle}`} size={fit(`中古iPhone ${p.lineupTitle}`, 1220, 150)} color={WHITE} spacing={-6} />
    </div>
    <div style={{ display: "flex", flexGrow: 1, justifyContent: "space-around", alignItems: "flex-end", padding: "0 40px" }}>
      {p.cutLineup.map((l) => (
        <div key={l.label} style={{ display: "flex", position: "relative", width: 360, height: 500 }}>
          {img(l.photo, { left: 40, top: 10, width: 280, height: 420 })}
          <div style={{ position: "absolute", left: 0, top: 0, display: "flex" }}><Outlined text={l.label} size={120} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-4} /></div>
          <div style={{ position: "absolute", left: 10, bottom: 10, display: "flex" }}><Outlined text={l.price} size={130} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 6, c: BLACK }} spacing={-6} /></div>
        </div>
      ))}
    </div>
  </div>
) : null;

/** M: 赤と黒の斜め分割・中央に切り抜き・上下に巨大な文字（警告型） */
const M = (p: Plan) => {
  const [a, b] = [p.bars[p.bars.length - 2].text, p.bars[p.bars.length - 1].text];
  return (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: `linear-gradient(115deg, ${RED} 0%, ${RED} 55%, ${BLACK} 55%, ${BLACK} 100%)`, fontFamily: "Noto Sans JP" }}>
      {img(p.cut, { left: 760, top: 20, width: 460, height: 680, transform: "rotate(-8deg)" })}
      <div style={{ position: "absolute", left: 36, top: 36, display: "flex" }}><Outlined text={a} size={fit(a, 760, 150)} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-6} /></div>
      <div style={{ position: "absolute", left: 30, bottom: 50, display: "flex" }}><Outlined text={b} size={fit(b, 900, 260)} color={YELLOW} inner={{ w: 10, c: BLACK }} outer={{ w: 8, c: WHITE }} spacing={-10} /></div>
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
  const fonts = await notoSansJp([...plan.bars.map((b) => b.text), plan.hero.top, plan.hero.word, ...plan.lineup.flatMap((l) => [l.label, l.price]), plan.lineupTitle, "中古iPhone ", ...plan.cutLineup.flatMap((l) => [l.label, l.price])].join(""));
  for (const [name, f] of Object.entries({ G, H: Hh, I, J, K, L, M })) {
    const el = f(plan);
    if (!el) continue;
    const res = new ImageResponse(el, { width: W, height: H, fonts });
    writeFileSync(join(out, `${name}.png`), Buffer.from(await res.arrayBuffer()));
  }
  const credits = [...new Set([plan.photo.credit, ...plan.lineup.flatMap((l) => (l.photo ? [l.photo.credit] : [])), plan.cut.credit, ...plan.cutLineup.map((l) => l.photo.credit)])];
  writeFileSync(join(out, "credits.txt"), credits.map((c) => `サムネイル画像: ${c}`).join("\n") + "\n");
  console.log(`サムネの案 → ${out}`);
})();
