// YouTube Analytics API で動画ごとの数字を読む（読むだけ）。初回は scripts/yt-auth.ts。
//   npx tsx scripts/yt-metrics.ts            … 直近30日に公開した動画（既定）
//   npx tsx scripts/yt-metrics.ts --days 90  … 期間を変える
//   npx tsx scripts/yt-metrics.ts --out .claude/tmp/yt.tsv … TSV にも書く
// 数字は公開日〜昨日の累計。Studio の「視聴を選んだ割合」「表示回数・CTR」は API に無いことがあり、取れなければ空欄。
import { readFileSync, writeFileSync } from "node:fs";

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const days = Number(arg("--days", "30"));
const out = arg("--out", "");

const c = (() => { const r = JSON.parse(readFileSync(".secrets/yt-oauth-client.json", "utf8")); return r.installed ?? r.web; })();
const { refresh_token } = JSON.parse(readFileSync(".secrets/yt-token.json", "utf8"));

async function token() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token, grant_type: "refresh_token" }),
  });
  const t = await r.json();
  if (!t.access_token) throw new Error("token: " + JSON.stringify(t));
  return t.access_token as string;
}
async function main() {
const at = await token();
async function get(url: string) {
  const r = await fetch(url, { headers: { authorization: `Bearer ${at}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${url.split("?")[0]}: ${j.error?.message ?? JSON.stringify(j)}`);
  return j;
}
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const yesterday = ymd(new Date(Date.now() - 864e5));

// チャンネルと動画
const ch = (await get("https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true")).items?.[0];
if (!ch) throw new Error("チャンネルが見つからない（同意のときに @used_gadelog のアカウントを選んだか）");
console.log(`# ${ch.snippet.title}  登録 ${ch.statistics.subscriberCount}・再生 ${ch.statistics.viewCount}・動画 ${ch.statistics.videoCount}`);
const since = new Date(Date.now() - days * 864e5);
const ids: string[] = [];
let page = "";
for (;;) {
  const j = await get(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${ch.contentDetails.relatedPlaylists.uploads}${page ? `&pageToken=${page}` : ""}`);
  let old = false;
  for (const it of j.items) { if (new Date(it.contentDetails.videoPublishedAt ?? 0) < since) { old = true; continue; } ids.push(it.contentDetails.videoId); }
  if (old || !j.nextPageToken) break;
  page = j.nextPageToken;
}
type V = { id: string; title: string; published: string; status: string; sec: number };
const vids: V[] = [];
for (let i = 0; i < ids.length; i += 50) {
  const j = await get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${ids.slice(i, i + 50).join(",")}`);
  for (const v of j.items) {
    const m = v.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? [];
    vids.push({ id: v.id, title: v.snippet.title, published: v.snippet.publishedAt, status: v.status.privacyStatus, sec: (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) });
  }
}

// Analytics（動画ごと）。基本の指標 → 取れれば表示回数・CTR
const A = "https://youtubeanalytics.googleapis.com/v2/reports";
const base = `ids=channel==MINE&startDate=${ymd(since)}&endDate=${yesterday}&dimensions=video&maxResults=200&sort=-views`;
const rows = new Map<string, Record<string, number>>();
const take = (j: any) => { const h = j.columnHeaders.map((x: any) => x.name); for (const r of j.rows ?? []) { const o = rows.get(r[0]) ?? {}; h.forEach((n: string, k: number) => { if (k) o[n] = r[k]; }); rows.set(r[0], o); } };
take(await get(`${A}?${base}&metrics=views,engagedViews,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,subscribersGained`).catch(async (e) => {
  console.error("engagedViews なしで取り直す:", e.message);
  return get(`${A}?${base}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,subscribersGained`);
}));
try { take(await get(`${A}?${base}&metrics=videoThumbnailImpressions,videoThumbnailImpressionsClickRate`)); }
catch (e: any) { console.error("表示回数・CTR は取れない:", e.message); }

// 流入元（動画ごとのいちばん多い流入元）
const top = new Map<string, [string, number, number]>();
try {
  for (const v of vids) {
    const j = await get(`${A}?ids=channel==MINE&startDate=${ymd(since)}&endDate=${yesterday}&dimensions=insightTrafficSourceType&metrics=views&filters=video==${v.id}&sort=-views&maxResults=3`);
    const all = (j.rows ?? []).reduce((s: number, r: any) => s + r[1], 0);
    if (j.rows?.[0]) top.set(v.id, [j.rows[0][0], j.rows[0][1], all]);
  }
} catch (e: any) { console.error("流入元は取れない:", e.message); }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const head = ["video_id", "公開(JST)", "長さ", "種類", "状態", "再生", "エンゲージ", "平均視聴", "平均%", "表示", "CTR%", "いいね", "コメント", "登録", "流入元1位", "割合", "タイトル"];
const lines = [head.join("\t")];
for (const v of vids.sort((a, b) => b.published.localeCompare(a.published))) {
  const r = rows.get(v.id) ?? {};
  const t = top.get(v.id);
  const jst = new Date(new Date(v.published).getTime() + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " ");
  lines.push([v.id, jst, mmss(v.sec), v.sec <= 180 ? "short" : "long", v.status, r.views ?? 0, r.engagedViews ?? "", r.averageViewDuration != null ? mmss(r.averageViewDuration) : "", r.averageViewPercentage != null ? r.averageViewPercentage.toFixed(1) : "",
    r.videoThumbnailImpressions ?? "", r.videoThumbnailImpressionsClickRate != null ? (r.videoThumbnailImpressionsClickRate * 100).toFixed(1) : "", r.likes ?? "", r.comments ?? "", r.subscribersGained ?? "",
    t?.[0] ?? "", t && t[2] ? `${Math.round((t[1] / t[2]) * 100)}%` : "", v.title].join("\t"));
}
console.log(`# ${ymd(since)}〜${yesterday} に公開・${vids.length}本（Analytics は最大2〜3日遅れ）`);
console.log(lines.join("\n"));
if (out) { writeFileSync(out, lines.join("\n") + "\n"); console.log(`書き出し: ${out}`); }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
