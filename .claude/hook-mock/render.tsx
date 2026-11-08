/**
 * ショートの 0秒目（つかみ）のモック3案。動画の 0.4秒目あたりの1コマを静止画にしたもの。
 *   npx tsx .claude/hook-mock/render.tsx
 * 題材は 13 Pro の電池（80%台と90%台の差 6,680円・11/8 のショートと同じ数字の例）。
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import React from "react";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { ON_DARK, SITE } from "@/lib/brandColors";

const W = 1080;
const H = 1920;
const OUT = resolve(__dirname);

const INK = SITE.ink;
const RED = ON_DARK.price;
const WHITE = ON_DARK.white;
const SUB = ON_DARK.sub;

/** A: 数字が走る。題名も帯もなく、差額のカウントアップだけ（0.4秒目＝途中の数字） */
function A() {
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: INK, color: WHITE, fontFamily: "Noto Sans JP" }}>
      <div style={{ display: "flex", fontSize: 54, fontWeight: 500, color: SUB, marginBottom: 40 }}>中古 iPhone 13 Pro、電池80%台と90%台の差</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <div style={{ display: "flex", fontSize: 330, fontWeight: 900, color: RED, letterSpacing: -8, lineHeight: 1 }}>4,320</div>
        <div style={{ display: "flex", fontSize: 120, fontWeight: 900, color: RED }}>円</div>
      </div>
      <div style={{ display: "flex", marginTop: 30, height: 14, width: 640, background: "rgba(255,255,255,0.15)", borderRadius: 7 }}>
        <div style={{ display: "flex", width: 414, height: 14, background: RED, borderRadius: 7 }} />
      </div>
      <div style={{ display: "flex", fontSize: 44, color: SUB, marginTop: 60 }}>（0.4秒目。数字は 6,680円まで走る）</div>
    </div>
  );
}

/** B: 棒が伸びる。在庫数の型と同じく、最初のコマから2本の棒が動く */
function Bar({ h, label, price, color, fill }: { h: number; label: string; price: string; color: string; fill: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 360 }}>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 900, color, marginBottom: 20 }}>{price}</div>
      <div style={{ display: "flex", alignItems: "flex-end", height: 820, width: 300 }}>
        <div style={{ display: "flex", width: 300, height: h, background: fill, borderRadius: 24 }} />
      </div>
      <div style={{ display: "flex", fontSize: 56, fontWeight: 900, color: WHITE, marginTop: 24 }}>{label}</div>
    </div>
  );
}
function B() {
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: INK, color: WHITE, fontFamily: "Noto Sans JP" }}>
      <div style={{ display: "flex", fontSize: 60, fontWeight: 500, color: SUB, marginBottom: 30 }}>iPhone 13 Pro（128GB）中古の相場</div>
      <div style={{ display: "flex", gap: 80 }}>
        <Bar h={560} label="電池 80%台" price="59,800円" color={WHITE} fill="rgba(255,255,255,0.35)" />
        <Bar h={400} label="電池 90%台" price="66,4" color={RED} fill={RED} />
      </div>
      <div style={{ display: "flex", fontSize: 44, color: SUB, marginTop: 60 }}>（0.4秒目。右の棒と数字が伸びている途中）</div>
    </div>
  );
}

/** C: 札が入ってくる。大きな値札1枚が画面の外から滑り込む（右にずれた位置＝途中） */
function C() {
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: INK, color: WHITE, fontFamily: "Noto Sans JP", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 940, padding: "60px 40px", background: WHITE, borderRadius: 40, transform: "translateX(140px) rotate(-6deg)", color: INK }}>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 500, color: SITE.inkSub }}>中古 iPhone 13 Pro 128GB・電池 90%台</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 20 }}>
          <div style={{ display: "flex", fontSize: 230, fontWeight: 900, color: SITE.price, lineHeight: 1 }}>66,480</div>
          <div style={{ display: "flex", fontSize: 90, fontWeight: 900, color: SITE.price }}>円</div>
        </div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 900, color: INK, marginTop: 30 }}>80%台より +6,680円</div>
      </div>
      <div style={{ display: "flex", fontSize: 44, color: SUB, marginTop: 120 }}>（0.4秒目。札が右から滑り込む途中・次に 80%台の札）</div>
    </div>
  );
}

async function main() {
  const text = "中古iPhone13Pro、電池80%台と90%台の差（128GB）中古の相場4,3206,680円まで走る（0.4秒目。数字は右の棒と数字が伸びている途中）59,80066,4札が右から滑り込む途中・次に80%台の札より+0123456789,.%・";
  const fonts = await notoSansJp(text);
  const shots: [string, () => JSX.Element][] = [["A-number", A], ["B-bars", B], ["C-tag", C]];
  mkdirSync(OUT, { recursive: true });
  for (const [name, el] of shots) {
    const res = new ImageResponse(el(), { width: W, height: H, fonts });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(await res.arrayBuffer()));
    console.log(name);
  }
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(OUT, "A-number.png"), "-i", join(OUT, "B-bars.png"), "-i", join(OUT, "C-tag.png"),
    "-filter_complex", "[0]scale=360:640[a];[1]scale=360:640[b];[2]scale=360:640[c];[a][b][c]hstack=3,pad=iw+48:ih+24:24:12:white", join(OUT, "contact.png")], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  console.log("contact.png");
}
main();
