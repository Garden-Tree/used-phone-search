/**
 * ショートの「関連動画」にする横動画（テーマ → 横動画）。対応はここだけに書く（10/26〜）。
 * YouTube Studio でショートに設定する「関連動画」もこの表と同じにする（.claude/skills/youtube-shorts/SKILL.md の YouTube 投稿）。
 * 締めの最後に、声の「くわしい解説は、下の関連動画からどうぞ」と合わせて、横動画のサムネを画面にも出す
 * （YouTube 公式ブログ 2026/7/14「関連動画からの流入」: 最後の5秒で声と画面の両方で誘導し、横動画のサムネを見せる）。
 * 札を出すのは RELATED_LONG_THEMES（types.ts・声で誘導するテーマ）だけ。ここにあっても、そこになければ出さない（ipadbudget）。
 * サムネは longform/<folder>/thumbnail.png（A 案。Git に入らない）。なければ何も描かず、前の「▼ くわしい解説は…」の札だけ出す
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { VIDEOS } from "@/lib/videos";
import { hasRelatedLong, type Script } from "./types";

/** id は YouTube の動画 ID（まだ公開前なら空）。title は公開時の題（lib/videos.ts にあればそこから） */
export type RelatedLong = { id: string; title: string; folder: string };

const PRO_OR_STANDARD: RelatedLong = { id: VIDEOS.proOrStandard.id, title: VIDEOS.proOrStandard.title, folder: "2026-10-25-pro-or-standard" };
const IPHONE_DORE: RelatedLong = { id: VIDEOS.iphoneDore.id, title: VIDEOS.iphoneDore.title, folder: "2026-10-21-iphone-dore" };
const DONT_BUY: RelatedLong = { id: "amx5UxG6wpI", title: "中古iPhone、買ってはいけない5つの条件｜検品担当が3.7万件の在庫で確かめた", folder: "2026-10-27-dont-buy" };
const HOW_OLD: RelatedLong = { id: VIDEOS.howOld.id, title: VIDEOS.howOld.title, folder: "2026-10-26-how-old" };
const IPAD_DORE: RelatedLong = { id: VIDEOS.ipadDore.id, title: VIDEOS.ipadDore.title, folder: "2026-10-23-ipad-dore" };
// 10/28 公開予定。ID は公開してから入れる
// 横動画10本目（10/27 にユーザーが予約から公開に）
const BATTERY: RelatedLong = { id: "GcXIO15l6fU", title: "中古iPhoneのバッテリー、何%なら買っていい？85%以上が正解の理由を3.7万件の相場で", folder: "2026-10-29-battery" };
const BIG_SCREEN: RelatedLong = { id: "q9g7h5KLyfk", title: "大きい画面の中古iPhone、どれを買う？Plus・Pro Max・Airを7千件の相場で比較", folder: "2026-10-28-big-screen" };
// 横動画11本目（広告の回・楽天モバイル）。まだ公開前なので ID は空。公開したら ID を入れ、types.ts の RELATED_LONG_THEMES に rakutenmobile を足す
// （それまでは RELATED_LONG_THEMES にないので、締めは関連動画の声・札なしのいつもの形）
const RAKUTEN_MOBILE: RelatedLong = { id: "Ua3ZRui2G4w", title: "【PR】中古iPhone＋楽天モバイル、2年でいくら？", folder: "2026-10-31-rakuten-mobile" };

export const RELATED_LONG: Partial<Record<Script["theme"], RelatedLong>> = {
  provs: PRO_OR_STANDARD, promax: PRO_OR_STANDARD, probudget: PRO_OR_STANDARD, plusvs: PRO_OR_STANDARD, minie: PRO_OR_STANDARD, plusmax: PRO_OR_STANDARD,
  budget: IPHONE_DORE, drops: IPHONE_DORE, newused: IPHONE_DORE, overnew: IPHONE_DORE,
  battery: BATTERY, batteryswap: BATTERY, storage: DONT_BUY, rank: DONT_BUY, unused: DONT_BUY,
  gen: HOW_OLD, ios27line: HOW_OLD, oldpro: HOW_OLD,
  ipadbudget: IPAD_DORE,
  bigbudget: BIG_SCREEN,
  rakutenmobile: RAKUTEN_MOBILE,
};

/** 締めに札を出す横動画（声で誘導するテーマだけ） */
export const relatedLongOf = (s: Script): RelatedLong | null => (hasRelatedLong(s) ? RELATED_LONG[s.theme] ?? null : null);

const THUMB_W = 720;
const cache = new Map<string, string | null>();
/**
 * 横動画のサムネを幅 720px の JPEG にして data URL で返す（ImageResponse に埋め込む。元の PNG 約300KB → 約50KB）。
 * ファイルがない・ffmpeg が失敗したときは null（何も描かない）。1回読んだら覚えておく（コマごとに読み直さない）
 */
export function relatedThumb(s: Script): string | null {
  const v = relatedLongOf(s);
  if (!v) return null;
  if (cache.has(v.folder)) return cache.get(v.folder)!;
  const file = resolve(__dirname, "..", "longform", v.folder, "thumbnail.png");
  let url: string | null = null;
  if (existsSync(file)) {
    const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${THUMB_W}:-2`, "-frames:v", "1", "-q:v", "3", "-f", "image2pipe", "-vcodec", "mjpeg", "-"], { maxBuffer: 16 * 1024 * 1024 });
    if (r.status === 0 && r.stdout?.length) url = `data:image/jpeg;base64,${r.stdout.toString("base64")}`;
    else console.warn(`関連動画のサムネを読めませんでした（${file}）。札だけ出します`);
  } else console.warn(`関連動画のサムネがありません（${file}）。札だけ出します`);
  cache.set(v.folder, url);
  return url;
}

/**
 * 締めの声（1つの音声）の中で「くわしい解説は…」が始まる秒の目安。エンジンの読み（kana）のモーラ数の割合から出す
 * （「、」「？」の間は 2 モーラ分と数える）。読みがなければ null（scenes.tsx の既定 2.2k 秒）
 */
export function relatedLineStart(clip: { dur: number; kana?: unknown }): number | null {
  const kana = typeof clip.kana === "string" ? clip.kana : null;
  if (!kana) return null;
  const i = kana.indexOf("クワシ");
  if (i < 0) return null;
  const weight = (x: string) => {
    let w = 0;
    for (const ch of x) {
      if (/[、？。！]/.test(ch)) w += 2;
      else if (/[ァィゥェォャュョヮ]/.test(ch)) continue; // 拗音は前の音と1モーラ
      else if (/[ァ-ヺ]/.test(ch)) w += 1;
    }
    return w;
  };
  const before = weight(kana.slice(0, i));
  const total = before + weight(kana.slice(i));
  return total ? (clip.dur * before) / total : null;
}
