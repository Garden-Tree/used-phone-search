/**
 * YouTube チャンネルのアイコン（800x800）とバナー（2560x1440。どの端末でも見える中央 1546x423 に文字を置く）を作る
 *   npx tsx shorts/brand.tsx [出力先フォルダ]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notoSansJp } from "@/lib/ogFont";
import { ON_DARK, SITE } from "@/lib/brandColors";

const OUT = process.argv[2] ?? "shorts/out/brand";
// 色はサイトと同じ（lib/brandColors.ts）。赤い帯は白い文字を載せるので price（白とのコントラスト 5.66）、紺の地の URL は ON_DARK.safe
const NAVY = SITE.brand900;
const RED = SITE.price;
const TEAL = ON_DARK.safe;

async function save(name: string, el: React.ReactElement, width: number, height: number, text: string) {
  const res = new ImageResponse(el, { width, height, fonts: await notoSansJp(text) });
  writeFileSync(join(OUT, name), Buffer.from(await res.arrayBuffer()));
  console.log("saved", join(OUT, name));
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  // アイコン: 小さい丸でも読めるよう2行の大きな文字だけ
  await save(
    "icon.png",
    <div style={{ width: 800, height: 800, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: NAVY, fontFamily: "Noto Sans JP" }}>
      <div style={{ display: "flex", fontSize: 150, fontWeight: 900, color: "white", lineHeight: 1.15 }}>中古</div>
      <div style={{ display: "flex", fontSize: 150, fontWeight: 900, color: "white", lineHeight: 1.15 }}>スマホ</div>
      <div style={{ display: "flex", marginTop: 24, padding: "8px 40px", borderRadius: 999, background: RED, fontSize: 96, fontWeight: 900, color: "white" }}>相場</div>
    </div>,
    800, 800, "中古スマホ相場",
  );

  // バナー: 中央 1546x423 の中に収める
  const bannerText = "毎週更新 中古iPhone 値下がりランキング大手中古ショップ16店の相場を毎日集計・検品担当のひと言used.gadelog.com";
  await save(
    "banner.png",
    <div style={{ width: 2560, height: 1440, display: "flex", alignItems: "center", justifyContent: "center", background: NAVY, fontFamily: "Noto Sans JP" }}>
      <div style={{ width: 1546, height: 423, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", padding: "10px 36px", borderRadius: 20, background: RED, fontSize: 72, fontWeight: 900, color: "white", whiteSpace: "nowrap" }}>毎週更新 中古iPhone 値下がりランキング</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 48, fontWeight: 500, color: "white", opacity: 0.9 }}>大手中古ショップ16店の相場を毎日集計・検品担当のひと言</div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 56, fontWeight: 900, color: TEAL }}>used.gadelog.com</div>
      </div>
    </div>,
    2560, 1440, bannerText,
  );
}

main();
