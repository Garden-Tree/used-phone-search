/**
 * 0秒目のモック 第2弾（11/9・他チャンネル14本を見て）: 文字は1〜2行・1行8字まで・図は1つ・帯なし。0.5秒目のコマ。
 *   npx tsx .claude/hook-mock/render2.tsx  → .claude/hook-mock/contact2.png
 */
import React from "react";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { ON_DARK, SITE } from "@/lib/brandColors";

const W = 1080;
const H = 1920;
const OUT = resolve(__dirname);
const INK = SITE.ink;
const RED = ON_DARK.price;
const WHITE = ON_DARK.white;
const GREEN = SITE.safe;
const CREAM = SITE.inspect50;

const big = (color: string, size = 150) => ({ display: "flex", fontSize: size, fontWeight: 900, color, lineHeight: 1.15, whiteSpace: "nowrap" } as const);

/** D 電池: 2行の結論＋電池1本が満ちる */
function D() {
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: INK, color: WHITE, fontFamily: "Noto Sans JP" }}>
      <div style={big(WHITE, 120)}>電池90%台は</div>
      <div style={{ ...big(RED, 190), marginTop: 10 }}>+7,180円</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 90 }}>
        <div style={{ display: "flex", width: 150, height: 40, background: WHITE, borderRadius: "16px 16px 0 0" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 440, height: 620, padding: 22, borderRadius: 48, boxShadow: `0 0 0 16px ${WHITE}` }}>
          <div style={{ display: "flex", width: "100%", height: 300, background: GREEN, borderRadius: 26 }} />
        </div>
      </div>
    </div>
  );
}

/** E 在庫数: 1行の問い＋棒1本が伸びる（順位の表は2コマ目から） */
function E() {
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: CREAM, color: INK, fontFamily: "Noto Sans JP" }}>
      <div style={big(INK, 118)}>中古で</div>
      <div style={{ ...big(INK, 118) }}>いちばん多いのは</div>
      <div style={{ display: "flex", alignItems: "center", width: 940, height: 170, marginTop: 110, background: WHITE, borderRadius: 40, boxShadow: "0 0 0 4px #e5d9c3" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 560, height: 170, background: SITE.price, borderRadius: 40, color: WHITE, fontSize: 110, fontWeight: 900 }}>？？？</div>
      </div>
      <div style={{ ...big(SITE.price, 150), marginTop: 70 }}>412件</div>
    </div>
  );
}

/** F 新旧比較: 2行の結論＋2本の棒（数字なし。金額は2コマ目） */
function F() {
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: SITE.brand900, color: WHITE, fontFamily: "Noto Sans JP" }}>
      <div style={big(WHITE, 120)}>中古の旧型なら</div>
      <div style={{ ...big(RED, 190), marginTop: 10 }}>6.9万円安い</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 90, marginTop: 110, height: 560 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", width: 340, height: 420, background: "rgba(255,255,255,0.35)", borderRadius: 30 }} />
          <div style={{ ...big(WHITE, 72), marginTop: 20 }}>新型</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", width: 340, height: 240, background: RED, borderRadius: 30 }} />
          <div style={{ ...big(RED, 72), marginTop: 20 }}>旧型</div>
        </div>
      </div>
    </div>
  );
}

/** G 電池・数字だけ: 1行＋巨大な数字（図なし。数字が走る） */
function G() {
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: INK, color: WHITE, fontFamily: "Noto Sans JP" }}>
      <div style={big(WHITE, 110)}>電池90%台と</div>
      <div style={big(WHITE, 110)}>80%台の差</div>
      <div style={{ ...big(RED, 300), marginTop: 80, letterSpacing: -6 }}>4,320</div>
      <div style={{ ...big(RED, 140) }}>円</div>
    </div>
  );
}

async function main() {
  const text = "電池90%台は+7,180円中古でいちばん多いのは？412件の旧型なら6.9万円安い新型旧型と80%台の差4,3200123456789,.%";
  const fonts = await notoSansJp(text);
  const shots: [string, () => JSX.Element][] = [["D-battery", D], ["E-stock", E], ["F-newold", F], ["G-number", G]];
  for (const [name, el] of shots) {
    const res = new ImageResponse(el(), { width: W, height: H, fonts });
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(await res.arrayBuffer()));
  }
  const inputs = shots.flatMap(([name]) => ["-i", join(OUT, `${name}.png`)]);
  const filt = shots.map((_, i) => `[${i}]scale=360:640[v${i}]`).join(";") + ";" + shots.map((_, i) => `[v${i}]`).join("") + `hstack=4,pad=iw+60:ih+24:30:12:white`;
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filt, join(OUT, "contact2.png")], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  console.log("contact2.png");
}
main();
