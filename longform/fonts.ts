/**
 * 横動画のコマ用のフォント（Noto Sans JP のサブセット）。render.ts と video.tsx で共有する
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notoSansJp } from "@/lib/ogFont";
import type { Timeline } from "./types";

/** フォントのサブセット用に、コマに出る文字を全部集める */
function allText(tl: Timeline, extra = ""): string {
  return JSON.stringify(tl) + readFileSync(join(__dirname, "scenes.tsx"), "utf8") + "0123456789,.%+−/：・→春日部つむぎずんだもん" + extra;
}

export const longFonts = (tl: Timeline, extra = "") => notoSansJp(allText(tl, extra));
