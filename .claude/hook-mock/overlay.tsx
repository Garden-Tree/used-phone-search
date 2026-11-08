/**
 * 実写（Pexels）の上に重ねる文字の PNG（透明の地）を作り、ffmpeg で 0.5秒目のコマと 3秒の mp4 にする。
 *   npx tsx .claude/hook-mock/overlay.tsx
 * 出力: .claude/hook-mock/live-<案>.png（0.5秒目）・live-<案>.mp4（3秒）・contact-live.png
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
const STOCK = resolve(__dirname, "../../shorts/assets/stock");
const WHITE = ON_DARK.white;
const RED = ON_DARK.price;
const GREEN = SITE.safe;

// 縁取り（satori は text-stroke が効かないので 8方向の影で縁を作る）＋下に落ちる影
const o = 7;
const shadow = [[-o,-o],[o,-o],[-o,o],[o,o],[0,-o],[0,o],[-o,0],[o,0]].map(([x,y]) => `${x}px ${y}px 0 #000`).join(", ") + ", 0 10px 28px rgba(0,0,0,0.7)";
const big = (color: string, size: number) => ({ display: "flex", fontSize: size, fontWeight: 900, color, lineHeight: 1.15, whiteSpace: "nowrap", textShadow: shadow } as const);
/** 上下に黒のグラデーション（文字を読めるように。中央の実写は見せる） */
const Shade = () => (
  <>
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 760, background: "linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0))", display: "flex" }} />
    <div style={{ position: "absolute", left: 0, top: H - 700, width: W, height: 700, background: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.8))", display: "flex" }} />
  </>
);
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", background: "transparent", fontFamily: "Noto Sans JP" }}>
    {children}
  </div>
);

/** D 電池: 上に結論2行、下に電池1本（満ちる途中） */
const D = () => (
  <Frame>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 150 }}>
      <div style={big(WHITE, 120)}>電池90%台は</div>
      <div style={{ ...big(RED, 180), marginTop: 6 }}>+7,180円</div>
    </div>
    <div style={{ position: "absolute", left: (W - 300) / 2, top: H - 560, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", width: 100, height: 28, background: WHITE, borderRadius: "12px 12px 0 0" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 300, height: 400, padding: 16, borderRadius: 36, boxShadow: `0 0 0 12px ${WHITE}` }}>
        <div style={{ display: "flex", width: "100%", height: 190, background: GREEN, borderRadius: 20 }} />
      </div>
    </div>
  </Frame>
);
/** E 在庫数: 問い2行、下に棒1本 */
const E = () => (
  <Frame>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 150 }}>
      <div style={big(WHITE, 118)}>中古で</div>
      <div style={big(WHITE, 118)}>いちばん多いのは</div>
    </div>
    <div style={{ position: "absolute", left: 70, top: H - 520, display: "flex", alignItems: "center", width: 940, height: 150, background: "rgba(255,255,255,0.92)", borderRadius: 36 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 560, height: 150, background: SITE.price, borderRadius: 36, color: WHITE, fontSize: 100, fontWeight: 900 }}>？？？</div>
    </div>
    <div style={{ position: "absolute", left: 0, top: H - 330, width: W, ...big(RED, 140), justifyContent: "center" }}>412件</div>
  </Frame>
);
/** F 新旧比較: 結論2行、下に棒2本 */
const F = () => (
  <Frame>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 150 }}>
      <div style={big(WHITE, 120)}>中古の旧型なら</div>
      <div style={{ ...big(RED, 180), marginTop: 6 }}>6.9万円安い</div>
    </div>
    <div style={{ position: "absolute", left: 0, top: H - 620, width: W, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 80, height: 440 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", width: 300, height: 330, background: "rgba(255,255,255,0.8)", borderRadius: 26 }} />
        <div style={{ ...big(WHITE, 66), marginTop: 14 }}>新型</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", width: 300, height: 190, background: RED, borderRadius: 26 }} />
        <div style={{ ...big(RED, 66), marginTop: 14 }}>旧型</div>
      </div>
    </div>
  </Frame>
);
/** G 数字だけ */
const G = () => (
  <Frame>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 150 }}>
      <div style={big(WHITE, 110)}>電池90%台と</div>
      <div style={big(WHITE, 110)}>80%台の差</div>
    </div>
    <div style={{ position: "absolute", left: 0, top: H - 620, width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ ...big(RED, 290), letterSpacing: -6 }}>4,320</div>
      <div style={big(RED, 130)}>円</div>
    </div>
  </Frame>
);

const SHOTS: [string, () => JSX.Element, string][] = [
  ["D-battery", D, "pexels-15689201.mp4"],
  ["E-stock", E, "pexels-8551164.mp4"],
  ["F-newold", F, "pexels-15728690.mp4"],
  ["G-number", G, "pexels-6611951.mp4"],
];

async function main() {
  const fonts = await notoSansJp("電池90%台は+7,180円中古でいちばん多いのは？412件の旧型なら6.9万円安い新型旧型と80%台の差4,3200123456789,.%");
  const pngs: string[] = [];
  for (const [name, el, clip] of SHOTS) {
    const ov = join(OUT, `ov-${name}.png`);
    const res = new ImageResponse(el(), { width: W, height: H, fonts });
    writeFileSync(ov, Buffer.from(await res.arrayBuffer()));
    const src = join(STOCK, clip);
    // 実写を 1080x1920 に合わせ（はみ出す分は切る）、少し暗くして文字を重ねる。0.5秒目のコマと 3秒の mp4
    const vf = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.08[bg];[bg][1:v]overlay=0:0`;
    const still = join(OUT, `live-${name}.png`);
    let r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "0.5", "-i", src, "-i", ov, "-filter_complex", vf, "-frames:v", "1", still], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
    r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-loop", "1", "-i", ov, "-filter_complex", vf + ",format=yuv420p", "-t", "3", "-an", "-r", "30", "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", join(OUT, `live-${name}.mp4`)], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
    pngs.push(still);
    console.log(name);
  }
  const inputs = pngs.flatMap((f) => ["-i", f]);
  const filt = pngs.map((_, i) => `[${i}]scale=360:640[v${i}]`).join(";") + ";" + pngs.map((_, i) => `[v${i}]`).join("") + `hstack=${pngs.length},pad=iw+60:ih+24:30:12:white`;
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filt, join(OUT, "contact-live.png")], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  console.log("contact-live.png");
}
main();
