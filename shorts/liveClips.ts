/**
 * 実写のつかみに使う Pexels の縦動画（shorts/assets/stock/・git には入れない・Pexels ライセンスでクレジット不要）。
 * 11/9 に 40本落とした中から、画面が白いモックアップ素材と、他社のロゴ・アプリの画面がはっきり映るものを除いた9本。
 * 直リンク: https://videos.pexels.com/video-files/<id>/<id>-hd_1080_1920_<fps>fps.mp4（ページの download は HTML が返る）
 * 機種名を言う場面には使わない（素材の機種と話す機種は一致しない）。1コマ目の雰囲気づくりだけ
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
] as const;

/** 日付（YYYY-MM-DD）で順に回す */
export function pickLiveClip(date: string): string {
  const d = new Date(date + "T00:00:00+09:00");
  const day = Math.floor(d.getTime() / 86400000);
  return LIVE_CLIPS[((day % LIVE_CLIPS.length) + LIVE_CLIPS.length) % LIVE_CLIPS.length];
}
