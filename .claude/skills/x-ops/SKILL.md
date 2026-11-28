---
name: x-ops
description: used.gadelog.com の X（@used_gadelog）の日々の運用。通知の確認と返事への返信、迷っている人への返信、いいね、フォロー、自分の投稿（画像つき）、記録とコミットまでを1回分まとめて行う。ユーザーが「X やって」「朝／昼／夕方／夜のツイート」「いいね・リプ・フォロー」「リプ返信して」などと言ったときに使う。
---

# X の運用（@used_gadelog）

記録は `ideas/x-posts-2026-10-12.md`（以下「X の記録」）。報告は日本語・短く。

## 停止中（11/17〜12/1・最優先）

- 11/17 にスパムのラベル。**Claude は X を一切操作しない**（投稿・返信・通知を開くことも）。ユーザーが手で1日1本・URL なし
- 「X やって」と言われたら停止を伝える。12/1 にラベルと表示を見て再開を相談（STATE 確認台帳）。再開は下の手順で、量はユーザーと決める
- 無料アカウント（有料は 11/16 解約）

## 再開後の方針（11/16 時点）

- 新しい人への返信・いいね・フォロー・RT はしない。**来た返事への返信だけ**。表示が100台に戻ったら広げるかを相談
- 量を戻すときも、数合わせの返信はしない。表示急落・返信が「追加の返信」に隠れる・ロック → 止めてユーザーに伝える

## 守ること（変えない）

- 自動化ツールなし。1件ずつ間をあけ、同じ文面を使い回さない
- **いいね・フォローは続けて押さない**（1件ごとに 20〜40秒・間に別の操作）。`/account/access`（ロボット確認）が出たら操作せずユーザーに頼む
- **いいね・フォローも JS の click() で押さない**（computer の画面クリック）。「自動的なもの」「これ以上フォローできません」が出た日はいいね・フォローをやめる
- **文字を JS（`execCommand('insertText')` 等）で入れない**。入力は `computer` の type だけ（10/19 に文が二重になった）
- **押す直前に毎回、`SideNav_AccountSwitcher_Button` の文字に「@used_gadelog」があるか確かめる**。ページを開くだけで個人の @Garden__Tree に戻ることがある。`UserAvatar-Container-used_gadelog` の有無では判定しない。切り替えはアカウントメニューから（パスワードは入れない）
- **返事が来たら必ず返す**（いいね＋返信）
- **知らない人への最初の返信にリンクなし**（聞かれたら貼る）。宣伝リプなし。往復になったら機種ページ（`modelPagePath`）の URL を1スレッド1回まで。アフィリエイトリンクは貼らない
- 返信しない: プロフィールに「ブロック」等・買った後・助言不要・業者。政治・炎上・企業広告・荒れた返信欄
- サイトの URL には `?utm_source=x&utm_medium=social&utm_campaign=post`（返信は `reply`）＋`&v=YYYYMMDD`（X のカードのキャッシュ対策）
- 数字はその場で DB から（下）。在庫1件などで言い切らない。新品価格は `lib/applePrices.ts`・`lib/officialPrices.ts` だけ
- **投稿の削除はしない**（崩れたらユーザーに頼む）
- 1機種の値動き速報は投稿しない。ただのリポストはしない

## Chrome の準備

1. ツールを1回で読み込む: `select:mcp__claude-in-chrome__list_connected_browsers,mcp__claude-in-chrome__select_browser,mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__upload_image`
2. Chrome は専用プロファイル「used」（list_connected_browsers の Browser 1 を select_browser）。つながらない → ユーザーに「used」の Chrome を開いて Connect を押してもらう（`Start-Process chrome` はふだんのプロファイルが開く）
3. 打鍵の前に `document.visibilityState === 'visible'` を確かめる。`hidden` なら前に出す:
   ```powershell
   Add-Type @"
   using System; using System.Runtime.InteropServices;
   public class F { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c); }
   "@
   $p = Get-Process chrome | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
   [F]::ShowWindow($p.MainWindowHandle,5) | Out-Null; [F]::SetForegroundWindow($p.MainWindowHandle)
   ```
   それでも `hidden` ならユーザーに X のタブを前に出してもらう
4. 古いタブで X が読み込まれない → 新しいタブ

## 1回分の手順

1. **通知**: `https://x.com/notifications` と `/notifications/mentions`。返事にはいいね＋返信（数字か次の一歩を1つ）。「買った」報告にはお祝い＋買った後に見ること。新フォロワーは中古スマホ・ガジェット系なら返す
2. **返信を書く**（再開で広げると決めたとき、迷っている人を `https://x.com/search?q=<機種名を含むクエリ>&f=live` で探す）:
   - 1〜3行。相場（容量つき）＋検品の視点1つ（電池表記・利用制限・赤ロム保証・OS 期限）。相手の予算に合わせ、スレッド上の自分の前の返信より高い機種を出さない
   - 敬語・絵文字なし・言い回しを毎回変える。文字数: `python .claude/skills/x-ops/xlen.py <下書き>`（上限280）
   - 送り方: `navigate` で相手の投稿へ → `location.pathname` と `[role=dialog]` がないかを確かめる → 返信欄を**座標でクリック**（直前に取り直す）→ `document.activeElement.closest('[data-testid=tweetTextarea_0]')` を確かめる → `type` → スクショで確かめて「返信」→ `https://x.com/used_gadelog/with_replies` で確認（出ていなくてもすぐ打ち直さない）
3. **自分の投稿**: 保存されやすい型を回す（場面別チェックリスト・機種の比較表 1080x1350・時期もの・月1の相場まとめスレッド）。毎回同じ骨格にしない
   - 1行目は見出しか数字・改行多め・最後に問い1行。**URL は本文に入れず自分への返信に**。ハッシュタグ0〜1
   - 画像は**ダイアログ内の**「画像や動画を追加」へ。例は `shorts/out/x-*.tsx`、フォントのサブセットに全文字
   - 「ポストする」は**直前のスクショの座標で押す**（ref では送られないことがある）。下書きが残っていないか・プロフィールに出たかを確かめる
   - 表示・いいね・保存を24h・48h後に X の記録へ（`a[href$="/analytics"]` の aria-label）
4. **記録とコミット**: X の記録の末尾に1行（返事への返信・返信の相手と数字・投稿・失敗）。`git add ideas/x-posts-2026-10-12.md && git commit -m "ideas: X <日付> <時間帯>"` → push。方針を変えたら STATE.md も

## 相場の引き方

```bash
npx tsx scripts/x-price.ts "iPhone 15" "Pixel 8a"
```
機種名は `lib/*Catalog.ts` の表記。在庫が数件なら「目安」。iOS 27 は iPhone 11 以降・SE 第2世代以降。
