// YouTube の検索候補（サジェスト）を集める。横動画のネタ選び用（読むだけ）。
//   npx tsx scripts/yt-suggest.ts                 … 既定の種の語
//   npx tsx scripts/yt-suggest.ts 中古ipad 中古pixel … 種を指定
// 種の語に「あ〜わ」「a〜z」を足した候補も取る（よく使われる掘り方）。結果は候補の出た回数の多い順。
// 送るのは種の語だけ（個人の情報は送らない）。間に 150ms あける。
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ["中古iphone", "中古 スマホ", "中古ipad", "中古pixel", "中古macbook", "中古 galaxy", "iphone 買い替え", "iphone 何年使える"];
const tails = ["", ..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ".split(""), ..."abcdefghijklmnopqrstuvwxyz".split("")];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function suggest(q: string): Promise<string[]> {
  const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=ja&gl=jp&q=${encodeURIComponent(q)}`, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) return [];
  const buf = Buffer.from(await r.arrayBuffer());
  const txt = new TextDecoder(/charset=([\w-]+)/i.exec(r.headers.get("content-type") ?? "")?.[1] ?? "utf-8").decode(buf);
  try { return JSON.parse(txt)[1] ?? []; } catch { return []; }
}

async function main() {
  for (const seed of seeds) {
    const count = new Map<string, number>();
    for (const t of tails) {
      for (const s of await suggest(t ? `${seed} ${t}` : seed)) count.set(s, (count.get(s) ?? 0) + (t ? 1 : 3));
      await sleep(150);
    }
    const top = [...count].sort((a, b) => b[1] - a[1]).slice(0, 40);
    console.log(`\n## ${seed}（${count.size}件）`);
    console.log(top.map(([s]) => s).join(" / "));
  }
}
main();
