// TikTok のキャプション（tiktok.txt）を作る。script.json と youtube.txt（あれば youtube-nobgm.txt）から組み立てる
//   npx tsx shorts/tiktok-caption.ts shorts/out/<日付>-<テーマ> [--no-site]
//   --no-site: 「相場は used.gadelog.com で検索」の行を入れない（10/27〜 URL の文字が配信に響くかの試し。動画の締めの声はそのまま）
// 中身: つかみ（タイトル）→ 数字（説明欄の一覧の行・4行まで）→ データの出どころ → 「相場は used.gadelog.com で検索」（リンクにしない・utm なし）
//       → VOICEVOX のクレジット → ハッシュタグ3〜4個。BGM のクレジットは入れない（TikTok は --tiktok の版 short-A-tiktok.mp4 を上げる）
// 広告の回（rakutenmobile・タイトルが【PR】）は先頭に「#PR」。商用コンテンツの表示はコンソールに注意を出すだけ（キャプションには書かない）
// 決まりは .claude/skills/tiktok-ops/SKILL.md・経緯は ideas/2026-10-26-tiktok.md
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Script } from "./types";

/** TikTok のキャプションの上限（文字） */
const MAX_CAPTION = 2200;
/** フィードで「もっと見る」の前に見える目安（文字）。ここに要点を入れる */
const VISIBLE = 100;
/** 数字の行の数の上限（長いと読まれない） */
const MAX_NUMBER_LINES = 4;

/** 機種の種類ごとのハッシュタグ（3個）。テーマの1個（THEME_TAG）と合わせて4個まで */
const BASE_TAGS: Partial<Record<Script["theme"], string[]>> = {
  pixelbudget: ["#中古スマホ", "#Pixel", "#中古Pixel"],
  galaxybudget: ["#中古スマホ", "#Galaxy", "#中古Galaxy"],
  ipadbudget: ["#中古iPad", "#iPad", "#タブレット"],
  macbudget: ["#中古Mac", "#MacBook", "#中古パソコン"],
  fold: ["#中古スマホ", "#折りたたみスマホ", "#Galaxy"],
  foldbudget: ["#中古スマホ", "#折りたたみスマホ", "#Galaxy"],
  watchgen: ["#AppleWatch", "#中古", "#スマートウォッチ"],
  macgen: ["#中古Mac", "#MacBook", "#MacBookAir"],
  ipadgen: ["#中古iPad", "#iPad", "#タブレット"],
  pixelgen: ["#中古スマホ", "#Pixel", "#中古Pixel"],
  stockandroid: ["#中古スマホ", "#Android", "#Pixel"],
};
const IPHONE_TAGS = ["#中古iPhone", "#iPhone", "#中古スマホ"];
/** テーマの切り口のハッシュタグ（1個） */
const THEME_TAG: Partial<Record<Script["theme"], string>> = {
  drops: "#値下がり",
  budget: "#予算別",
  probudget: "#iPhonePro",
  bigbudget: "#大画面",
  pixelbudget: "#GooglePixel",
  newused: "#新品と中古",
  overnew: "#新品と中古",
  battery: "#バッテリー",
  batteryswap: "#電池交換",
  rank: "#状態ランク",
  unused: "#未使用品",
  ios27line: "#iOS27",
  rakutenmobile: "#楽天モバイル",
  stock: "#ランキング",
  stockandroid: "#ランキング",
};

const dir = process.argv[2]?.replace(/[\\/]+$/, "");
const noSite = process.argv.includes("--no-site");
if (!dir || !existsSync(`${dir}/script.json`)) {
  throw new Error("使い方: npx tsx shorts/tiktok-caption.ts shorts/out/<日付>-<テーマ>（script.json と youtube.txt があるフォルダ）");
}
const script = JSON.parse(readFileSync(`${dir}/script.json`, "utf8")) as Script;
// BGM なし版の説明（youtube-nobgm.txt）があればそちらを使う。どちらでもクレジットは VOICEVOX の行だけ拾う
const ytFile = existsSync(`${dir}/youtube-nobgm.txt`) ? `${dir}/youtube-nobgm.txt` : `${dir}/youtube.txt`;
if (!existsSync(ytFile)) throw new Error(`${dir}/youtube.txt がない。先に make-short.tsx の render で作る`);
const ytText = readFileSync(ytFile, "utf8");

const title = script.youtube.title.trim();
const isAd = script.theme === "rakutenmobile" || title.startsWith("【PR】");
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

/** 説明欄を段落に分ける */
const paragraphs = script.youtube.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
/** 数字の一覧の段落: どの行も「円」を含み、リンク・選び方・データの説明でない */
const isNumberBlock = (p: string) => {
  const lines = p.split("\n");
  return lines.length >= 2 && lines.every((l) => l.includes("円") && !/https?:\/\//.test(l) && !/^(選び方|データ|参考|相場＝|料金＝|【PR】)/.test(l));
};
const numberBlock = paragraphs.find(isNumberBlock);
/** 一覧がなければ、説明欄の最初の段落（【PR】の行を除く） */
const lead = paragraphs.find((p) => !p.startsWith("【PR】") && !/https?:\/\//.test(p));
const numbers = numberBlock
  ? numberBlock.split("\n").slice(0, MAX_NUMBER_LINES).map((l) => l.replace(/^・/, "").trim())
  : lead ? [lead] : [];

/** 広告の説明（「【PR】この動画は…広告を含みます。」）。キャプションでも分かるように残す */
const prLine = paragraphs.find((p) => p.startsWith("【PR】"))?.split("\n")[0];

/** クレジット: youtube.txt の「VOICEVOX:」の行だけ（BGM の行は入れない） */
const credits = [...new Set(ytText.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("VOICEVOX:")))];
if (!credits.length) console.warn("★注意: youtube.txt に VOICEVOX のクレジットがない。声の話者を確かめて手で足す");

const tags = [...(BASE_TAGS[script.theme] ?? IPHONE_TAGS)];
const themeTag = THEME_TAG[script.theme];
if (themeTag && !tags.includes(themeTag)) tags.push(themeTag);

const hook = isAd ? `#PR ${title.replace(/^【PR】\s*/, "")}` : title;
const caption = [
  hook,
  ...(prLine ? [prLine] : []),
  "",
  ...numbers,
  `（大手中古ショップ${script.shopCount}店の在庫の相場・${md(script.date)}時点）`,
  "",
  ...(noSite ? [] : ["相場は used.gadelog.com で検索", ""]),
  ...credits,
  "",
  tags.slice(0, 4).join(" "),
].join("\n").replace(/\n{3,}/g, "\n\n").trim();

if (caption.length > MAX_CAPTION) throw new Error(`キャプションが ${caption.length} 字（上限 ${MAX_CAPTION}）。数字の行を減らす`);
writeFileSync(`${dir}/tiktok.txt`, caption + "\n");

console.log(caption);
console.log("----");
console.log(`saved ${dir}/tiktok.txt（${caption.length} 字・クレジットは ${ytFile.replace(/^.*[\\/]/, "")} から）`);
console.log(`最初の ${VISIBLE} 字: ${caption.slice(0, VISIBLE).replace(/\n/g, " / ")}`);
if (isAd) {
  console.warn("★広告の回: 投稿の前に「コンテンツの開示（商用コンテンツ）」をオンにする（ブランドコンテンツポリシー）。フォロワー1,000人までは PR の回を出さない（.claude/skills/tiktok-ops/SKILL.md）");
}
// 上げるのは TikTok 用の書き出し（BGM なし・締めが「used.gadelog.com で検索」）。なければ BGM なし版（締めが「プロフィールのリンクから」）
const tiktokHint = `npx tsx shorts/make-short.tsx ${script.theme} render --tiktok --dir ${dir}`;
if (existsSync(`${dir}/short-A-tiktok.mp4`)) console.log(`上げる動画: ${dir}/short-A-tiktok.mp4`);
else if (existsSync(`${dir}/short-A-nobgm.mp4`)) {
  console.warn(`★注意: ${dir}/short-A-tiktok.mp4 がない。short-A-nobgm.mp4 は締めが「プロフィールのリンクから」・関連動画の誘導つき。TikTok 用に書き出す（${tiktokHint}）`);
} else console.warn(`★注意: ${dir}/short-A-tiktok.mp4 がない。TikTok には TikTok 用の書き出しを上げる（${tiktokHint}）`);
