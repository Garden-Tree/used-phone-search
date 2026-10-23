/**
 * ファビコンの案を作る（2026-10-23〜）。X・YouTube のアイコン（紺に「中古スマホ」）とそろえる
 *   npx tsx scripts/favicon-drafts.tsx → scratch/favicon/<案>-<大きさ>.png と並べた見本 sheet.png
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { SITE } from "@/lib/brandColors";

const NAVY = SITE.brand900, RED = SITE.price;
const OUT = "scratch/favicon";

// 案（512px で描いて縮める）
const DRAFTS: Record<string, () => React.ReactElement> = {
  // A: 紺の丸に白い「中古」（X・YouTube のアイコンと同じ色）
  A: () => (
    <div style={{ width: 512, height: 512, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: NAVY }}>
      <div style={{ display: "flex", fontSize: 230, fontWeight: 900, color: "white", letterSpacing: -10 }}>中古</div>
    </div>
  ),
  // B: 紺の角丸に白い「中」1字（16px でも読める）
  B: () => (
    <div style={{ width: 512, height: 512, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 110, background: NAVY }}>
      {/* 字の形の中心を角丸の真ん中に（そのままだと字が 22px 下にずれる・10/23 実測） */}
      <div style={{ display: "flex", position: "relative", top: -22, fontSize: 400, fontWeight: 900, color: "white", lineHeight: 1 }}>中</div>
    </div>
  ),
  // C: 紺の角丸にスマホの形（白い枠）と赤い「¥」
  C: () => (
    <div style={{ width: 512, height: 512, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 110, background: NAVY }}>
      <div style={{ display: "flex", width: 250, height: 420, alignItems: "center", justifyContent: "center", borderRadius: 54, border: "30px solid white", background: NAVY }}>
        <div style={{ display: "flex", fontSize: 230, fontWeight: 900, color: RED, lineHeight: 1 }}>¥</div>
      </div>
    </div>
  ),
};

(async () => {
  mkdirSync(OUT, { recursive: true });
  const fonts = await notoSansJp("中古¥");
  for (const [name, f] of Object.entries(DRAFTS)) {
    const res = new ImageResponse(f(), { width: 512, height: 512, fonts });
    writeFileSync(`${OUT}/${name}-512.png`, Buffer.from(await res.arrayBuffer()));
  }
  console.log("ok");
})();
