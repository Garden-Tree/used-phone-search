/**
 * 実写のつかみに使う Pexels の縦動画（shorts/assets/stock/・git には入れない・Pexels ライセンスでクレジット不要）。
 * 11/9 に 40本落とした中から、画面が白いモックアップ素材と、他社のロゴ・アプリの画面がはっきり映るものを除いた9本。
 * 直リンク: https://videos.pexels.com/video-files/<id>/<id>-hd_1080_1920_<fps>fps.mp4（ページの download は HTML が返る）
 * 機種名を言う場面には使わない（素材の機種と話す機種は一致しない）。1コマ目の雰囲気づくりだけ
 *
 * Pixabay（pixabay-<id>.mp4・取得日 2026-11-13・Pixabay Content License＝無料・商用可・表記不要）:
 * - 元ページ: https://pixabay.com/videos/id-<id>/（<語>-<id> の URL へ転送される）。ページで「Free for use under the Pixabay Content License」を確かめたものだけ
 * - 識別できるロゴ・ブランド・他社アプリの画面が映る素材は商用に使えない（ライセンス要約）ので入れない。「AI generated」表示・Editorial の注意書きがあるものも入れない
 * - 直リンク: https://cdn.pixabay.com/video/<年>/<月>/<日>/<id>[-<番号>]_large.mp4（各ページの JSON-LD の contentUrl。ログイン不要）
 * - Pixabay の縦動画には条件に合うものがなかった（顔・モックアップ・AI 生成・ロゴ）ので、入れた6本はどれも横 4K（3840x2160）の
 *   手元の部分を 9:16 に切り出して 1080x1920 にしたもの（音なし・15秒まで）。横のフル HD は切り出すと 607x1080 しか残らないので入れない
 */
export const LIVE_CLIPS = [
  "pexels-15689201.mp4", // 手に持ったスマホ・近い
  "pexels-8551164.mp4", // 白いシャツ・スマホを操作
  "pexels-8551158.mp4", // 黒い服・スマホを操作
  "pexels-6611951.mp4", // 暗い部屋・片手
  "pexels-6265853.mp4", // 窓辺でスマホをかざす
  "pexels-10374885.mp4", // 机の上で操作
  "pexels-10374888.mp4", // 座ってスマホ
  "pexels-6612519.mp4", // 箱を開ける手元
  "pexels-15728690.mp4", // 箱から出す（Apple のロゴが映るので 1秒目から・切り出しに注意）
  "pixabay-142641.mp4", // コートの人・両手で黒いスマホ（屋外）
  "pixabay-47743.mp4", // 水色のケースのスマホを操作・寄り（明るい）
  "pixabay-202987.mp4", // 暗い店内・両手で文字を打つ
  "pixabay-79338.mp4", // 青い服・ひざの上で赤いケースのスマホ
] as const;

/** 日付（YYYY-MM-DD）で順に回す */
export function pickLiveClip(date: string): string {
  const d = new Date(date + "T00:00:00+09:00");
  const day = Math.floor(d.getTime() / 86400000);
  return LIVE_CLIPS[((day % LIVE_CLIPS.length) + LIVE_CLIPS.length) % LIVE_CLIPS.length];
}
