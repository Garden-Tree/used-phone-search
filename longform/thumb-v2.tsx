/**
 * 横動画のサムネ・第2弾（2026-10-23〜）。ユーザーが選んだ型（1本目 G・L、2本目 G・K・O）を元にした派生
 *   npx tsx longform/thumb-v2.tsx <フォルダ>
 * 決まりは thumb-ab.tsx・thumb-chara.tsx と同じ（文字は最大・二重ふち・右下は空ける・立ち絵は CC BY-SA の写真と混ぜない）
 * 出力: <フォルダ>/thumb-ab/v2-*.png と credits-v2.txt
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { SITE } from "@/lib/brandColors";

type Photo = { file: string; credit: string; sa?: boolean };
const PH = {
  iphone13box: { file: "iphone13-tora-cut.png", credit: "iPhone 13 for Tora — Tatsuo Yamashita / CC BY 2.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_13_for_Tora_(52641558635).jpg）・背景を切り抜き" },
  iphone13photo: { file: "iphone13-tora.jpg", credit: "iPhone 13 for Tora — Tatsuo Yamashita / CC BY 2.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_13_for_Tora_(52641558635).jpg）" },
  iphone13blue: { file: "iphone13-hand-cut.png", credit: "iPhone 13 — Kskhh / CC BY-SA 4.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_13.jpg）・背景を切り抜き", sa: true },
  iphone14red: { file: "iphone14-red-cut.png", credit: "iPhone 14 Product Red — Hajoon0102 / CC BY-SA 4.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_14_Product_Red.jpg）・背景を切り抜き", sa: true },
  iphone15: { file: "iphone15-pd-single-cut.png", credit: "Apple iPhone 15 — Ka Kit Pang / Public domain / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:Apple_iPhone_15.jpeg）・切り抜き" },
  iphone16: { file: "iphone16-ultramarine-cut.png", credit: "iPhone 16 Ultramarine Rear — Padgriffin / CC BY 4.0 / Wikimedia Commons（https://commons.wikimedia.org/wiki/File:IPhone_16_Ultramarine_Rear.png）・背景を切り抜き" },
} satisfies Record<string, Photo>;

const W = 1280, H = 720;
const RED = SITE.price, YELLOW = "#FFE100", BLACK = "#0B0B0F", WHITE = "#FFFFFF", NAVY = SITE.brand900;

const b64 = (p: string) => readFileSync(p).toString("base64");
const photo = (p: Photo, style: Record<string, unknown>) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`data:image/${p.file.endsWith(".png") ? "png" : "jpeg"};base64,${b64(join(__dirname, "assets/photos", p.file))}`} style={{ position: "absolute", objectFit: p.file.endsWith(".png") ? "contain" : "cover", ...style }} />
);
const chara = (name: string, style: Record<string, unknown>) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`data:image/png;base64,${b64(join(__dirname, "assets/chara/expr", `${name}.png`))}`} style={{ position: "absolute", ...style }} />
);

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
const Bubble = ({ text, size, style }: { text: string; size: number; style: Record<string, unknown> }) => (
  <div style={{ position: "absolute", display: "flex", flexDirection: "column", padding: "12px 24px", borderRadius: 36, background: WHITE, border: `6px solid ${BLACK}`, ...style }}>
    {text.split("\n").map((l) => <div key={l} style={{ display: "flex", fontSize: size, fontWeight: 900, color: BLACK, lineHeight: 1.15, whiteSpace: "nowrap" }}>{l}</div>)}
  </div>
);

type Bar = { text: string; bg: string; color: string; key?: boolean };
/** G の土台: 左に色の帯を段にした巨大な文字。right に右側の絵 */
const Bars = ({ bars, bg, width, right }: { bars: Bar[]; bg: string; width: number; right: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: "Noto Sans JP" }}>
    {right}
    <div style={{ position: "absolute", left: 0, top: 24, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {bars.map((b, i) => {
        const size = fit(b.text, width, b.key ? 240 : 150);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", height: Math.round(size * 1.18), padding: "0 28px 0 34px", marginBottom: 14, background: b.bg, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}>
            <div style={{ display: "flex", fontSize: size, fontWeight: 900, color: b.color, letterSpacing: -6, lineHeight: 1, whiteSpace: "nowrap" }}>{b.text}</div>
          </div>
        );
      })}
    </div>
  </div>
);

/** L の土台: 上に黒帯の問い・下に切り抜きを並べて値札。left にキャラを足せる */
const Lineup = ({ title, items, bg, left, titleH = 200, titleMax = 150 }: { title: string; items: { label: string; price: string; photo: Photo }[]; bg: string; left?: ReactNode; titleH?: number; titleMax?: number }) => {
  const x0 = left ? 330 : 30, slot = Math.floor((W - x0 - 30) / items.length);
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", position: "relative", background: bg, fontFamily: "Noto Sans JP" }}>
      <div style={{ display: "flex", height: titleH, alignItems: "center", justifyContent: "center", background: BLACK }}>
        {title.includes("|") ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Outlined text={title.split("|")[0]} size={Math.round(titleMax * 0.5)} color={WHITE} spacing={-4} />
            <div style={{ display: "flex", marginTop: 6 }}><Outlined text={title.split("|")[1]} size={fit(title.split("|")[1], 1230, titleMax)} color={YELLOW} spacing={-8} /></div>
          </div>
        ) : <Outlined text={title} size={fit(title, 1230, titleMax)} color={YELLOW} spacing={-8} />}
      </div>
      {items.map((l, i) => (
        <div key={l.label} style={{ position: "absolute", left: x0 + i * slot, top: titleH + 10, width: slot, height: H - titleH - 20, display: "flex" }}>
          {photo(l.photo, { left: 20, top: 20, width: slot - 40, height: 360 })}
          <div style={{ position: "absolute", left: 6, top: 0, display: "flex" }}><Outlined text={l.label} size={fit(l.label, slot - 20, 110)} color={BLACK} inner={{ w: 8, c: WHITE }} spacing={-4} /></div>
          <div style={{ position: "absolute", left: 6, bottom: 10, display: "flex" }}><Outlined text={l.price} size={fit(l.price, slot - 10, 140)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 6, c: BLACK }} spacing={-6} /></div>
        </div>
      ))}
      {left}
    </div>
  );
};

/** K の土台: 暗い地・左上から巨大な2〜3段・右に切り抜き。extra にキャラ */
const Kbase = ({ top, a, b, bg, right, extra }: { top: string; a: string; b: string; bg: string; right: ReactNode; extra?: ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, fontFamily: "Noto Sans JP" }}>
    {right}
    <div style={{ position: "absolute", left: 36, top: 36, display: "flex", flexDirection: "column" }}>
      <Outlined text={top} size={84} color={WHITE} outer={{ w: 6, c: BLACK }} />
      <div style={{ display: "flex", marginTop: 22 }}><Outlined text={a} size={fit(a, 780, 170)} color={WHITE} inner={{ w: 8, c: BLACK }} outer={{ w: 6, c: RED }} spacing={-6} /></div>
      <div style={{ display: "flex", marginTop: 18 }}><Outlined text={b} size={fit(b, 820, 260)} color={YELLOW} inner={{ w: 10, c: BLACK }} outer={{ w: 8, c: RED }} spacing={-10} /></div>
    </div>
    {extra}
  </div>
);

type Variant = { name: string; photos: Photo[]; chara?: boolean; el: () => ReactNode };

const DORE: Variant[] = [
  // G2b（10/23 ユーザー指示）: G2 の「迷ったらコレ！」と写真を大きく
  { name: "G2b", photos: [PH.iphone13box], chara: true, el: () => (
    <Bars bg={`linear-gradient(135deg, ${NAVY} 0%, ${BLACK} 70%)`} width={700} bars={[{ text: "中古iPhone", bg: WHITE, color: BLACK }, { text: "5万円なら", bg: RED, color: WHITE }, { text: "iPhone 13", bg: YELLOW, color: BLACK, key: true }]}
      right={<>
        {chara("tsumugi-wink", { left: 860, top: 150, height: 660 })}
        {photo(PH.iphone13box, { left: 680, top: 360, width: 480, height: 340, transform: "rotate(-8deg)" })}
        <Bubble text={"迷ったら\nコレ！"} size={76} style={{ left: 900, top: 20 }} />
      </>} />
  ) },
  // L1b（10/23 ユーザー指示）: 見出しを「中古iPhone どれを買う？」にして大きく
  { name: "L1b", photos: [PH.iphone13blue, PH.iphone14red, PH.iphone15], el: () => (
    <Lineup bg={YELLOW} title="中古iPhone|どれを買う？" titleH={300} titleMax={190} items={[{ label: "13", price: "5.1万", photo: PH.iphone13blue }, { label: "14", price: "6.6万", photo: PH.iphone14red }, { label: "15", price: "9.1万", photo: PH.iphone15 }]} />
  ) },
  // G1: G のまま、右の写真の枠の前につむぎのウインクを重ねる
  { name: "G1", photos: [PH.iphone13box], chara: true, el: () => (
    <Bars bg={BLACK} width={780} bars={[{ text: "中古iPhone", bg: WHITE, color: BLACK }, { text: "5万円なら", bg: RED, color: WHITE }, { text: "iPhone 13", bg: YELLOW, color: BLACK, key: true }]}
      right={<>
        <div style={{ position: "absolute", left: 830, top: 40, width: 420, height: 330, display: "flex", borderRadius: 26, background: WHITE, transform: "rotate(5deg)" }} />
        {photo(PH.iphone13box, { left: 850, top: 70, width: 380, height: 270, transform: "rotate(5deg)" })}
        {chara("tsumugi-wink", { left: 860, top: 320, height: 500 })}
      </>} />
  ) },
  // G2: 写真の枠をやめて、つむぎが箱入りの iPhone 13 を持つ形＋吹き出し
  { name: "G2", photos: [PH.iphone13box], chara: true, el: () => (
    <Bars bg={`linear-gradient(135deg, ${NAVY} 0%, ${BLACK} 70%)`} width={760} bars={[{ text: "中古iPhone", bg: WHITE, color: BLACK }, { text: "5万円なら", bg: RED, color: WHITE }, { text: "iPhone 13", bg: YELLOW, color: BLACK, key: true }]}
      right={<>
        {chara("tsumugi-wink", { left: 830, top: 120, height: 680 })}
        {photo(PH.iphone13box, { left: 760, top: 400, width: 330, height: 230, transform: "rotate(-8deg)" })}
        <Bubble text={"迷ったら\nコレ！"} size={48} style={{ left: 1010, top: 40 }} />
      </>} />
  ) },
  // G3: 帯の色を黄・黒・赤に。相場の札を右上に
  { name: "G3", photos: [PH.iphone13box], chara: true, el: () => (
    <Bars bg={YELLOW} width={760} bars={[{ text: "予算5万円", bg: BLACK, color: YELLOW }, { text: "買うなら", bg: WHITE, color: BLACK }, { text: "iPhone 13", bg: RED, color: WHITE, key: true }]}
      right={<>
        {chara("tsumugi-wink", { left: 860, top: 160, height: 640 })}
        {photo(PH.iphone13box, { left: 800, top: 430, width: 300, height: 210, transform: "rotate(6deg)" })}
        <div style={{ position: "absolute", left: 900, top: 26, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 22px", borderRadius: 20, background: WHITE, border: `6px solid ${BLACK}` }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 900, color: BLACK }}>中古の相場</div>
          <Outlined text="5.1万円" size={86} color={RED} spacing={-4} />
        </div>
      </>} />
  ) },
  // L1: L のまま（写真3台・値札）。上の問いを黄色に
  { name: "L1", photos: [PH.iphone13blue, PH.iphone14red, PH.iphone15], el: () => (
    <Lineup bg={YELLOW} title="中古iPhone どれ買うべき？!" items={[{ label: "13", price: "5.1万", photo: PH.iphone13blue }, { label: "14", price: "6.6万", photo: PH.iphone14red }, { label: "15", price: "9.1万", photo: PH.iphone15 }]} />
  ) },
  // L2: つむぎのウインクを左に。写真は CC BY・PD の2台（13 と 15）
  { name: "L2", photos: [PH.iphone13box, PH.iphone15], chara: true, el: () => (
    <Lineup bg={YELLOW} title="中古iPhone 予算別どれ買う？!" items={[{ label: "5万円", price: "iPhone 13", photo: PH.iphone13box }, { label: "10万円", price: "iPhone 15", photo: PH.iphone15 }]}
      left={<>{chara("tsumugi-wink", { left: -10, top: 230, height: 520 })}<Bubble text={"迷ったら\nコレ！"} size={40} style={{ left: 150, top: 220 }} /></>} />
  ) },
  // L3: 地を白・値札を赤い札に。上の帯を赤
  { name: "L3", photos: [PH.iphone13blue, PH.iphone14red, PH.iphone15], el: () => (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: WHITE, fontFamily: "Noto Sans JP" }}>
      <div style={{ display: "flex", height: 190, alignItems: "center", justifyContent: "center", background: RED }}>
        <Outlined text="予算別 どれ買う？!" size={fit("予算別 どれ買う？!", 1200, 160)} color={WHITE} outer={{ w: 8, c: BLACK }} spacing={-6} />
      </div>
      <div style={{ display: "flex", flexGrow: 1, justifyContent: "space-around", alignItems: "flex-end", padding: "0 30px 20px" }}>
        {[{ l: "iPhone 13", p: "5.1万", ph: PH.iphone13blue }, { l: "iPhone 14", p: "6.6万", ph: PH.iphone14red }, { l: "iPhone 15", p: "9.1万", ph: PH.iphone15 }].map((x) => (
          <div key={x.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 380, height: 510, position: "relative" }}>
            {photo(x.ph, { left: 60, top: 0, width: 260, height: 340 })}
            <div style={{ position: "absolute", top: 330, display: "flex", fontSize: 54, fontWeight: 900, color: BLACK }}>{x.l}</div>
            <div style={{ position: "absolute", bottom: 0, display: "flex", padding: "0 22px", borderRadius: 18, background: RED }}><div style={{ display: "flex", fontSize: 110, fontWeight: 900, color: WHITE, letterSpacing: -4, lineHeight: 1.1 }}>{x.p}</div></div>
          </div>
        ))}
      </div>
    </div>
  ) },
];

const PRIORITY: Variant[] = [
  // G2b（10/23 ユーザー指示）: セリフを大きく、つむぎを右に、その左に iPhone を上から重ねる
  { name: "G2b", photos: [PH.iphone16], chara: true, el: () => (
    <Bars bg={`linear-gradient(135deg, ${NAVY} 0%, ${BLACK} 70%)`} width={720} bars={[{ text: "中古iPhone", bg: WHITE, color: BLACK }, { text: "電池と容量は", bg: RED, color: WHITE }, { text: "ケチるな", bg: YELLOW, color: BLACK, key: true }]}
      right={<>
        {chara("tsumugi-wink", { left: 940, top: 150, height: 660 })}
        {photo(PH.iphone16, { left: 760, top: 250, width: 270, height: 460, transform: "rotate(-12deg)" })}
        <Bubble text={"ここは\nケチらないで！"} size={60} style={{ left: 770, top: 20 }} />
      </>} />
  ) },
  // O1b（10/23 ユーザー指示）: O1 のセリフを大きく・一番上に「中古iPhone」
  { name: "O1b", photos: [PH.iphone16], chara: true, el: () => (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: `radial-gradient(circle at 70% 50%, #FFF7AE 0%, ${YELLOW} 45%, #F59E0B 100%)`, fontFamily: "Noto Sans JP" }}>
      {photo(PH.iphone16, { left: 900, top: 270, width: 290, height: 430, transform: "rotate(8deg)" })}
      {chara("tsumugi-surprised", { left: -30, top: 110, height: 760 })}
      <div style={{ position: "absolute", left: 380, top: 16, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", padding: "2px 22px", background: BLACK, color: WHITE, fontSize: 64, fontWeight: 900 }}>中古iPhone</div>
        <div style={{ display: "flex", marginTop: 10 }}><Outlined text="電池と容量は" size={fit("電池と容量は", 860, 124)} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} /></div>
        <div style={{ display: "flex", marginTop: 4 }}><Outlined text="ケチるな" size={fit("ケチるな", 880, 200)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
      </div>
      <Bubble text={"たった\n+6千円だよ！"} size={64} style={{ left: 300, top: 470 }} />
    </div>
  ) },
  // G1: 写真の枠の代わりに、青ざめたずんだもん＋iPhone 16
  { name: "G1", photos: [PH.iphone16], chara: true, el: () => (
    <Bars bg={BLACK} width={780} bars={[{ text: "中古iPhone", bg: WHITE, color: BLACK }, { text: "電池と容量は", bg: RED, color: WHITE }, { text: "ケチるな", bg: YELLOW, color: BLACK, key: true }]}
      right={<>{photo(PH.iphone16, { left: 980, top: 40, width: 280, height: 520, transform: "rotate(10deg)" })}{chara("zundamon-shock", { left: 820, top: 260, height: 520 })}</>} />
  ) },
  // G2: つむぎのウインク＋吹き出し
  { name: "G2", photos: [PH.iphone16], chara: true, el: () => (
    <Bars bg={`linear-gradient(135deg, ${NAVY} 0%, ${BLACK} 70%)`} width={760} bars={[{ text: "中古iPhone", bg: WHITE, color: BLACK }, { text: "電池と容量は", bg: RED, color: WHITE }, { text: "ケチるな", bg: YELLOW, color: BLACK, key: true }]}
      right={<>{photo(PH.iphone16, { left: 1010, top: 260, width: 250, height: 440, transform: "rotate(-10deg)" })}{chara("tsumugi-wink", { left: 800, top: 140, height: 660 })}<Bubble text={"ここは\nケチらないで"} size={40} style={{ left: 980, top: 30 }} /></>} />
  ) },
  // K1: K の写真を iPhone 16 に（CC BY）・ずんだもんを右手前に
  { name: "K1", photos: [PH.iphone16], chara: true, el: () => (
    <Kbase bg="radial-gradient(circle at 78% 45%, #3F3F46 0%, #09090B 65%)" top="中古iPhone" a="電池と容量は" b="ケチるな"
      right={photo(PH.iphone16, { left: 860, top: 20, width: 380, height: 640, transform: "rotate(10deg)" })}
      extra={chara("zundamon-shock", { left: 770, top: 380, height: 420 })} />
  ) },
  // K2: 地を赤に・つむぎの驚き
  { name: "K2", photos: [PH.iphone16], chara: true, el: () => (
    <Kbase bg="radial-gradient(circle at 75% 45%, #DC2626 0%, #7F1D1D 70%)" top="中古iPhone" a="電池と容量は" b="ケチるな"
      right={photo(PH.iphone16, { left: 900, top: 30, width: 340, height: 600, transform: "rotate(-8deg)" })}
      extra={chara("tsumugi-surprised", { left: 780, top: 330, height: 470 })} />
  ) },
  // K3: キャラなし・写真は赤い iPhone 14（元の K）を紺の地で
  { name: "K3", photos: [PH.iphone14red], el: () => (
    <Kbase bg={`radial-gradient(circle at 78% 45%, #312E81 0%, ${BLACK} 70%)`} top="中古iPhone" a="電池と容量は" b="ケチるな"
      right={photo(PH.iphone14red, { left: 820, top: 30, width: 440, height: 660, transform: "rotate(10deg)" })} />
  ) },
  // O1: O をつむぎの驚きで・地を白から黄
  { name: "O1", photos: [PH.iphone16], chara: true, el: () => (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: `radial-gradient(circle at 70% 50%, #FFF7AE 0%, ${YELLOW} 45%, #F59E0B 100%)`, fontFamily: "Noto Sans JP" }}>
      {photo(PH.iphone16, { left: 880, top: 230, width: 300, height: 470, transform: "rotate(8deg)" })}
      {chara("tsumugi-surprised", { left: -30, top: 110, height: 760 })}
      <div style={{ position: "absolute", left: 380, top: 24, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <Outlined text="電池と容量は" size={fit("電池と容量は", 860, 140)} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} />
        <div style={{ display: "flex", marginTop: 6 }}><Outlined text="ケチるな" size={fit("ケチるな", 880, 220)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
      </div>
      <Bubble text={"たった\n+6千円だよ！"} size={44} style={{ left: 330, top: 470 }} />
    </div>
  ) },
];

// 4本目「どこで買う？」（10/24）: サムネは「どこで買う？」＋「1.6万円差」（iPhone 16 128GB の店ごとの最安値・安い順の1位と5位の差 15,820円）。
// タイトル（店選びの正解・保証・電池表記・赤ロム）と言葉を重ねない。写真は CC BY の iPhone 16 だけ（立ち絵と混ぜてよい）
const WHERE: Variant[] = [
  // G2b: 2本目・1本目で選ばれた型。帯3段＋つむぎのウインク＋iPhone 16＋吹き出し
  { name: "G2b", photos: [PH.iphone16], chara: true, el: () => (
    <Bars bg={`linear-gradient(135deg, ${NAVY} 0%, ${BLACK} 70%)`} width={720} bars={[{ text: "中古iPhone", bg: WHITE, color: BLACK }, { text: "どこで買う？", bg: RED, color: WHITE }, { text: "1.6万円差", bg: YELLOW, color: BLACK, key: true }]}
      right={<>
        {chara("tsumugi-wink", { left: 940, top: 150, height: 660 })}
        {photo(PH.iphone16, { left: 760, top: 250, width: 270, height: 460, transform: "rotate(-12deg)" })}
        <Bubble text={"同じ機種でも\n店で違う！"} size={58} style={{ left: 790, top: 20 }} />
      </>} />
  ) },
  // O1b: 黄色の地・つむぎの驚き・上に「中古iPhone」
  { name: "O1b", photos: [PH.iphone16], chara: true, el: () => (
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: `radial-gradient(circle at 70% 50%, #FFF7AE 0%, ${YELLOW} 45%, #F59E0B 100%)`, fontFamily: "Noto Sans JP" }}>
      {photo(PH.iphone16, { left: 900, top: 270, width: 290, height: 430, transform: "rotate(8deg)" })}
      {chara("tsumugi-surprised", { left: -30, top: 110, height: 760 })}
      <div style={{ position: "absolute", left: 380, top: 16, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", padding: "2px 22px", background: BLACK, color: WHITE, fontSize: 64, fontWeight: 900 }}>中古iPhone</div>
        <div style={{ display: "flex", marginTop: 10 }}><Outlined text="どこで買う？" size={fit("どこで買う？", 860, 130)} color={WHITE} outer={{ w: 9, c: BLACK }} spacing={-6} /></div>
        <div style={{ display: "flex", marginTop: 4 }}><Outlined text="1.6万円差" size={fit("1.6万円差", 880, 200)} color={RED} inner={{ w: 10, c: WHITE }} outer={{ w: 8, c: BLACK }} spacing={-8} /></div>
      </div>
      <Bubble text={"同じiPhone 16\nなのに！"} size={60} style={{ left: 300, top: 480 }} />
    </div>
  ) },
  // G1: 黒の地・青ざめたずんだもん＋iPhone 16
  { name: "G1", photos: [PH.iphone16], chara: true, el: () => (
    <Bars bg={BLACK} width={780} bars={[{ text: "中古iPhone", bg: WHITE, color: BLACK }, { text: "どこで買う？", bg: RED, color: WHITE }, { text: "1.6万円差", bg: YELLOW, color: BLACK, key: true }]}
      right={<>{photo(PH.iphone16, { left: 980, top: 40, width: 280, height: 520, transform: "rotate(10deg)" })}{chara("zundamon-shock", { left: 820, top: 260, height: 520 })}</>} />
  ) },
];

const PLANS: Record<string, Variant[]> = { "2026-10-21-iphone-dore": DORE, "2026-10-23-iphone-priority": PRIORITY, "2026-10-24-where-to-buy": WHERE };

(async () => {
  const dir = process.argv[2];
  const key = dir.replace(/\\/g, "/").split("/").filter(Boolean).pop()!;
  const vs = PLANS[key];
  if (!vs) throw new Error(`サムネの案がありません: ${key}`);
  for (const v of vs) if (v.chara && v.photos.some((p) => "sa" in p && p.sa)) throw new Error(`${v.name}: 立ち絵と CC BY-SA の写真は混ぜない`);
  const out = join(dir, "thumb-ab");
  mkdirSync(out, { recursive: true });
  const fonts = await notoSansJp(readFileSync(__filename, "utf8"));
  for (const v of vs) {
    const res = new ImageResponse(<>{v.el()}</>, { width: W, height: H, fonts });
    writeFileSync(join(out, `v2-${v.name}.png`), Buffer.from(await res.arrayBuffer()));
  }
  writeFileSync(join(out, "credits-v2.txt"), vs.map((v) => `${v.name}: ${v.photos.map((p) => p.credit).join(" / ")}`).join("\n") + "\n");
  console.log(`${vs.length}案 → ${out}`);
})();
