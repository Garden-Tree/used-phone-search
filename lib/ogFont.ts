/**
 * OGP 画像（next/og の ImageResponse）用の日本語フォント。
 * ImageResponse は同梱できるサイズが 500KB までで Noto Sans JP 全体は入らないため、
 * Google Fonts の text= 指定で「画像に使う文字だけ」のサブセット TTF を取得する。
 */
async function loadGoogleFont(weight: number, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!src) throw new Error(`Failed to load Noto Sans JP ${weight}`);
  const res = await fetch(src[1]);
  if (!res.ok) throw new Error(`Failed to download Noto Sans JP ${weight}: HTTP ${res.status}`);
  return res.arrayBuffer();
}

/** 画像内の文字列をまとめて渡すと、ImageResponse の fonts オプションを返す */
export async function notoSansJp(text: string) {
  // 重複を除いてリクエストを短くする
  const chars = Array.from(new Set(Array.from(text))).join("");
  const [regular, bold] = await Promise.all([loadGoogleFont(500, chars), loadGoogleFont(900, chars)]);
  return [
    { name: "Noto Sans JP", data: regular, weight: 500 as const, style: "normal" as const },
    { name: "Noto Sans JP", data: bold, weight: 900 as const, style: "normal" as const },
  ];
}

/**
 * 1行に収まる文字サイズ（px）。太字の目安幅: 漢字・かな 1.0em、英数字 0.6em、空白 0.3em。
 * 長い機種名（「iPad Pro 12.9インチ 第6世代」など）が画像からはみ出さないようにする
 */
export function fitFontSize(text: string, maxWidth: number, maxSize: number, minSize = 28): number {
  const em = Array.from(text).reduce((w, c) => w + (c === " " ? 0.3 : c.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0);
  return Math.max(minSize, Math.min(maxSize, Math.floor(maxWidth / em)));
}
