/**
 * 横動画のサムネ・「◯◯、まだ使う？」の型（2026-11-23・SE 3 の回から）
 *   npx tsx longform/thumb-v15-keep.tsx   → longform/2026-12-01-iphonese3-keep/thumb-keep.png（アップロードに使う）
 *
 * 伸びている動画の型（docs/video-competitors.md の 6）: 暗い地に問い「まだ使う？」を大きく＋2択の値段（続ける／替える）＋実機の写真。
 * 決まり: 文字は 104px 以上・画面の端から 60px 以上・右下（x1030〜・y600〜）に文字を置かない・数字は script.md にあるものだけ。
 * 写真: iPhone SE 3rd Gen — Toad40 / CC BY-SA 4.0 / Wikimedia Commons（加工は切り抜きの枠だけ。説明欄にクレジット）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";

const W = 1280, H = 720, EDGE = 60;
const RED = "#E11D1D", YELLOW = "#FFE100", BG = "#12122A", WHITE = "#FFFFFF";
const PHOTO = join(__dirname, "assets", "commons", "iphone-se3-front-red-toad40.jpg");

function jpegSize(b: Buffer) {
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error("jpeg size");
}

(async () => {
  const buf = readFileSync(PHOTO);
  const { w: iw, h: ih } = jpegSize(buf);
  // 写真は右側。本体（横 12〜92%・縦 6〜96%）を高さ 640px に
  const crop = { x: 0.12, y: 0.06, w: 0.8, h: 0.9 };
  const boxH = 600, k = boxH / (ih * crop.h), boxW = Math.round(iw * crop.w * k);
  const left = W - EDGE + 20 - boxW;
  const node = (
    <div style={{ display: "flex", position: "relative", width: W, height: H, background: BG, fontFamily: "Noto Sans JP" }}>
      <div style={{ display: "flex", position: "absolute", left, top: (H - boxH) / 2, width: boxW, height: boxH, overflow: "hidden", borderRadius: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/jpeg;base64,${buf.toString("base64")}`} width={Math.round(iw * k)} height={Math.round(ih * k)} alt=""
          style={{ position: "absolute", left: -Math.round(crop.x * iw * k), top: -Math.round(crop.y * ih * k) }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: EDGE, top: EDGE - 10 }}>
        <div style={{ display: "flex", fontSize: 110, fontWeight: 900, color: WHITE, lineHeight: 1.05 }}>iPhone SE 3</div>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 900, color: YELLOW, lineHeight: 1.1, letterSpacing: -4 }}>まだ使う？</div>
        <div style={{ display: "flex", marginTop: 26, padding: "6px 26px", background: WHITE, borderRadius: 16, fontSize: 104, fontWeight: 900, color: "#111", lineHeight: 1.1 }}>交換 1.2万円</div>
        <div style={{ display: "flex", marginTop: 18, padding: "6px 26px", background: RED, borderRadius: 16, fontSize: 104, fontWeight: 900, color: WHITE, lineHeight: 1.1 }}>替える +6.4万</div>
      </div>
    </div>
  );
  const fonts = await notoSansJp("iPhone SE 3まだ使う？交換1.2万円替える+6.4万");
  const res = new ImageResponse(node, { width: W, height: H, fonts });
  const out = join(__dirname, "2026-12-01-iphonese3-keep", "thumb-keep.png"); // thumbnail.png は video.tsx が上書きするので別の名前
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(out, { photoLeft: left, boxW });
})();
