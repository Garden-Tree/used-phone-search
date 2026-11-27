/**
 * デザインの案を静止画で見比べる（11/28〜）。台本のフォルダの timeline.json を読み、1つの章の scene に上書きして1コマ書き出す
 *
 *   npx tsx longform/design-mock.ts <台本のフォルダ> <秒> <出力.png> '<上書きの JSON>'
 *   例: npx tsx longform/design-mock.ts longform/fx-sample4 39 out.png '{"style":"net"}'
 *
 * 上書きはその秒の章の scene にマージする（stamp は stamp どうしでマージ）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadCharaArt } from "./art";
import { longFonts } from "./fonts";
import { H, W, frameAt } from "./scenes";
import type { Timeline } from "./types";

(async () => {
  const [dir, at, out, json = "{}"] = process.argv.slice(2);
  const tl = JSON.parse(readFileSync(join(dir, "timeline.json"), "utf8")) as Timeline;
  const t = Number(at);
  const over = JSON.parse(json) as Record<string, unknown>;
  const ch = tl.chapters.find((c) => t >= c.start && t < c.end) ?? tl.chapters[tl.chapters.length - 1];
  const sc = ch.scene as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    sc[k] = k === "stamp" && sc.stamp && v ? { ...(sc.stamp as object), ...(v as object) } : v;
  }
  const fonts = await longFonts(tl, "★払うのは売る2年で");
  const { art } = loadCharaArt(join(dir, "frames"));
  const res = new ImageResponse(frameAt(tl, t, { art }), { width: W, height: H, fonts });
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log("saved", out);
})();
