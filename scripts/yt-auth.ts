// YouTube Analytics API（読むだけ）の初回の同意。1回だけ手で回す。
//   1. Google Cloud で OAuth クライアント（デスクトップ アプリ）を作り、JSON を .secrets/yt-oauth-client.json に置く
//   2. npx tsx scripts/yt-auth.ts → ブラウザで @used_gadelog（中古スマホ一括検索）のアカウントを選んで許可
//   3. .secrets/yt-token.json に refresh token が入る（git には入れない）
// 手順の詳細は docs/operations.md「YouTube Analytics API」。
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { exec } from "node:child_process";
import { AddressInfo } from "node:net";

const CLIENT = ".secrets/yt-oauth-client.json";
const TOKEN = ".secrets/yt-token.json";
const SCOPES = [
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/youtube.readonly",
];

const raw = JSON.parse(readFileSync(CLIENT, "utf8"));
const c = raw.installed ?? raw.web;
if (!c?.client_id) throw new Error(`${CLIENT} に client_id がない（デスクトップ アプリの OAuth クライアントの JSON を置く）`);

const server = createServer(async (req, res) => {
  const u = new URL(req.url ?? "/", "http://127.0.0.1");
  const code = u.searchParams.get("code");
  if (!code) { res.end(u.searchParams.get("error") ?? "no code"); return; }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: c.client_id, client_secret: c.client_secret, redirect_uri: redirect, grant_type: "authorization_code" }),
  });
  const t = await r.json();
  if (!t.refresh_token) { res.end("失敗: " + JSON.stringify(t.error ?? t)); console.error(t); server.close(); return; }
  mkdirSync(".secrets", { recursive: true });
  writeFileSync(TOKEN, JSON.stringify({ refresh_token: t.refresh_token, scope: t.scope, saved: new Date().toISOString() }, null, 2));
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("保存しました。このタブは閉じてかまいません。");
  console.log(`保存: ${TOKEN}（scope: ${t.scope}）`);
  server.close();
});
let redirect = "";
server.listen(0, "127.0.0.1", () => {
  redirect = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: c.client_id, redirect_uri: redirect, response_type: "code",
    scope: SCOPES.join(" "), access_type: "offline", prompt: "consent select_account",
  });
  console.log("ブラウザで開く（開かなければ下の URL を手で）:\n" + url);
  exec(process.platform === "win32" ? `start "" "${url}"` : `open "${url}"`);
});
