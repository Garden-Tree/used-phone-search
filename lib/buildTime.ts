/**
 * サイトを書き出した（next build）時刻。Amazon の価格に「○時点」を添えるのに使う（Creators API の規約）。
 * 値は next.config.ts の env.NEXT_PUBLIC_BUILD_TIME がビルド時に埋め込む（クライアントコンポーネントでも
 * ブラウザで開いた時刻にならず、サーバーとブラウザで表示がずれない）。埋め込みがない開発中は読み込んだ時刻
 */
const iso = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

/** "10/9 14:52"（日本時間） */
export const BUILD_TIME = (() => {
  const jst = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()} ${hh}:${mm}`;
})();
