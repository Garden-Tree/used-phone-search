/** 台詞ごとの読み（アクセント句）を出す。声はキャッシュから（voice-draft.ts のあとに回す） */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { synthesize } from "../../shorts/voice";
import { DEFAULT_LONG_SPEED, LONG_PAUSE, SPEAKERS, forVoice, scriptItems } from "../script";

(async () => {
  const dir = "longform/2026-10-28-big-screen";
  let n = 0;
  for (const it of scriptItems(readFileSync(join(dir, "script.md"), "utf8"))) {
    if (!it.text) continue;
    const clip = await synthesize(forVoice(it.text), { speaker: SPEAKERS[it.who!], speedScale: DEFAULT_LONG_SPEED, pauseLengthScale: LONG_PAUSE }, true);
    console.log(`${++n} ${it.who}: ${clip?.kana ?? "(読みなし)"}`);
  }
})();
