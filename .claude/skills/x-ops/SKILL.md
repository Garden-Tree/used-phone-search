---
name: x-ops
description: used.gadelog.com の X（@used_gadelog）の日々の運用。通知の確認と返事への返信、迷っている人への返信、いいね、フォロー、自分の投稿（画像つき）、記録とコミットまでを1回分まとめて行う。ユーザーが「X やって」「朝／昼／夕方／夜のツイート」「いいね・リプ・フォロー」「リプ返信して」などと言ったときに使う。
---

# X の運用（@used_gadelog）

ユーザーの Chrome（ログイン済み）で、1回分（朝・昼・午後・夕方・夜・寝る前のどれか）をまとめて行う。
報告は日本語。経緯の記録は `ideas/x-posts-2026-10-12.md`（以下「X の記録」）。

## 1日の目安（10/19〜・ユーザーの指示で緩めた。減らさない）

| 返信 | いいね | フォロー | 自分の投稿 |
|---|---|---|---|
| 15〜20件 | 40〜50件 | 20件 | 2〜3本 |

- 1回あたりはおおむね: 返信3〜5・いいね10〜15・フォロー4〜6・投稿は朝／昼／夜に1本ずつ。
- **数を合わせるための返信はしない**（相場で役に立てない話題は見送る）。
- 表示が急に落ちる・返信が「追加の返信」に隠れる・ロックがかかる、が出たら上限を戻してユーザーに伝える。

## 守ること（変えない）

- 自動化ツールは使わない。1件ずつ数秒〜数十秒あけ、同じ文面を使い回さない。
- **返事が来たら必ず返す**（いいね＋返信）。最優先。
- 返信しない人: プロフィールや投稿に「ブロック」「論点ズレ」などとある人・すでに買った人・アドバイスを求めていない人・業者／アフィリエイト。
- **知らない人への最初の返信にリンクを貼らない**（聞かれたときは貼る。例: 「相場はどこで分かる？」）。宣伝リプはしない。
- **相手から返事（お礼など）が来て往復になったら、話題の機種ページの URL を1つ添えてよい**（10/20 ユーザーと決定）。トップではなく機種ページ（`modelPagePath`）に。1スレッド1回まで、アフィリエイトリンクは貼らない。
- **X に貼るサイトの URL には計測用の印を付ける**（10/21〜）: 投稿は `?utm_source=x&utm_medium=social&utm_campaign=post`、返信は `...&utm_campaign=reply`。canonical は印なしの URL なので検索には影響しない。GA の参照元「x」で数える（t.co と合わせて見る）
- **URL の末尾に日付の印 `&v=YYYYMMDD` も付ける**（10/23〜。例 `...&utm_campaign=post&v=20261023`）。X は一度読んだ URL のカード（OG 画像）を数日〜1週間覚えていて、サイトの画像を変えても古いまま出る（10/23 にトップの URL で 10/21 より前の画像が出た）。日付を変えると新しい URL として読み直す
- 数字はその場で DB から引いた値だけ（下の「相場の引き方」）。在庫1件などの怪しい値で言い切らない。新品価格は公式で確かめた値（`lib/applePrices.ts`・`lib/officialPrices.ts`）だけ。
- **投稿の削除はしない**（禁止。崩れたらユーザーに頼む）。下書きを捨てるのは可。
- 「中古で買った」だけの検索は関係ない投稿（バイク・靴など）が混ざる → 機種名を必ず含める。

## Chrome の準備（ここで失敗すると文面が崩れる）

1. ツールは `mcp__claude-in-chrome__*`。まとめて読み込む:
   `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__file_upload,mcp__claude-in-chrome__upload_image`
2. 拡張がつながらない → Chrome が閉じている。PowerShell で `Start-Process chrome` してからもう一度。
3. 打鍵の前に必ず `document.visibilityState === 'visible'` を確かめる。`hidden` なら Chrome を前に出す（PowerShell）:
   ```powershell
   Add-Type @"
   using System; using System.Runtime.InteropServices;
   public class F { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c); }
   "@
   $p = Get-Process chrome | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
   [F]::ShowWindow($p.MainWindowHandle,5) | Out-Null; [F]::SetForegroundWindow($p.MainWindowHandle)
   ```
   それでも `hidden` ならユーザーに「X のタブを前に出してほしい」と頼む（ユーザーが別のタブを使っている）。
4. **文字を JS（`execCommand('insertText')` など）で入れない**。10/19 に文が二重になった返信が出た。入力は `computer` の type だけ。
5. 古いタブは大きさ0で X が読み込まれないことがある → 新しいタブを開く。

## 1回分の手順

### 1. 通知と返事（最優先）
- `https://x.com/notifications` と `https://x.com/notifications/mentions` を読む。
- 自分の投稿・返信への返事 → いいね＋返信（相手の話に合わせて、数字か次の一歩を1つ足す）。「買った」報告にはお祝いと、買った後に見ること（設定のバッテリー最大容量など）を短く。
- 新しいフォロワー → プロフィールを見て、中古スマホ・ガジェット・節約の人ならフォローを返す。懸賞・宣伝用の形は返さない。

### 2. 返信先を探す
`https://x.com/search?q=<クエリ>&f=live`（最新）で探す。よく当たったクエリ:
- `中古iPhone` ／ `中古スマホ` ／ `中古iPad` ／ `中古 Pixel` ／ `中古iPhone バッテリー` ／ `中古iPhone 相場`
- `("何にしよう" OR "どれにしよう" OR "どれがいい" OR "おすすめある" OR "買い替えようかな" OR "買おうかな") (iPhone OR iPad OR Pixel OR スマホ) lang:ja -filter:links -filter:replies -買取`
- `(スマホ OR iPhone OR iPad) (壊れた OR 割れた OR 寿命 OR 限界) (買う OR 買い替え OR 機種変更 OR 中古) lang:ja -filter:links -修理店`
- `(中古 (MacBook OR iPad OR "Apple Watch" OR Pixel OR Xperia)) (迷う OR 迷って OR どっち OR おすすめ OR どれが) lang:ja -filter:links`

選ぶ基準: 個人で、いま迷っている・質問している・予算や機種を出している投稿。24時間以内、表示が多いものを早めに。

### 3. 返信を書く
- 相場を引く（下）→ 1〜3行の要点。型: 「〇〇なら△△がおすすめ／中古の相場（128GB）は約X万円・最安Y万円台／バッテリー85%以上・iOS 27 対応・保証を見ると安心」。
- 検品担当の視点を1つ足す（バッテリー表記の違い・ネットワーク利用制限○△・赤ロム保証・OS の更新期限・容量）。
- 敬語でやわらかく、「。」は控えめ、絵文字なし。毎回言い回しを変える。
- 文字数を確かめる: `python .claude/skills/x-ops/xlen.py <下書きファイル>`（日本語=2・英数=1・URL=23・上限280）。
- 投稿の手順（ずれると別のスレッドや新規投稿に入る）:
  1. `navigate` で相手の投稿の URL へ（`location.href` で動かすと JS の変数が消える）。
  2. `location.pathname` が相手の投稿か、`[role=dialog]` が開いていないかを JS で確かめる。
  3. 返信欄を**座標でクリック**（ref のクリックは新規投稿のダイアログを開くことがある）→ `type` で本文。
  4. スクショで本文と返信先を確かめてから「返信」を押す。
  5. 数秒待ち、`https://x.com/used_gadelog/with_replies` で出ているか・文面が正しいかを確かめる。出ていなくてもすぐ打ち直さない（表示が遅れるだけのことがある。返信欄が空になったかで判断）。
- 画像を添えるのは相手が機種名を出したときだけ（その機種の OG 画像 `https://used.gadelog.com/iphone/<slug>/opengraph-image`、返信の半分まで）。

### 4. いいね・フォロー
- いいね: 中古スマホを買った・迷っている・役に立つ情報の投稿。JS のクリックでよい（裏のタブでも動く）:
  ```js
  // 投稿のページで
  document.querySelector('article [data-testid="like"]')?.click()
  ```
- フォロー: 返信した人・掲載店や中古スマホの店・モバイル情報の人。プロフィールで
  `document.querySelector('button[aria-label="フォロー @<ID>"]')?.click()` → `aria-label` が「フォロー中 @<ID>」に変わったかで確かめる。
- フォロー解除の繰り返し・フォロー返し狙いの大量フォローはしない。

### 5. 自分の投稿（朝・昼・夜）
- 型を回す: ①相場の表（`npm run x:market -- <フォルダ>`）②検品担当の「買う前の注意点」（画像なし可）③相場データの分析（世代差・ランク差・新品との差・値下がり TOP5 `npx tsx shorts/x-image.tsx <台本のフォルダ>`）。前回と違う型にする。
- 1行目は【】の見出し、短い行で改行多め、具体的な数字、最後に答えやすい問いを1行、URL とハッシュタグ1〜2個（#中古iPhone など）。リンクは本文か自分への返信（A/B）。アフィリエイトリンクは貼らない。
- 数字は投稿の直前に取り直す。画像は 1200x675、作りかけの例は `shorts/out/x-*.tsx`（タイトル帯は `height:84・alignItems:center・lineHeight:1`）。フォントのサブセットに画像の全文字を入れる。
- 画像は**ダイアログ内の**「画像や動画を追加」へ入れる（ホームの投稿欄に入れると下書きが残る）。
- 投稿したらプロフィールで出ているか確かめる。

### 6. 記録とコミット
- X の記録の末尾に1行で追記: 時間帯・返事への返信・返信（相手の ID、何を聞かれ何を答えたか、使った数字）・いいね数と傾向・フォロー（ID）・投稿（型・画像・リンクの置き場所・文字数）・失敗と対処。
- 1日の最後の回は、その日の合計（返信／返事への返信／いいね／フォロー／投稿）も書く。
- 運用の方針を変えたときは STATE.md も同じターンで更新（5KB 以内）。
- `git add ideas/x-posts-2026-10-12.md && git commit -m "ideas: X <日付> <時間帯>（返信N・いいねN・フォローN）"`（コミットの末尾に指定の Co-Authored-By）→ `git push`。push だけではデプロイされない（関係なし）。

## 相場の引き方

```bash
npx tsx scripts/x-price.ts "iPhone 15" "iPhone 13 mini" "Pixel 8a"
```
出力: 最安・相場（在庫がいちばん多い容量の中央値）・件数・公式の新品価格（あれば）。機種名は `lib/*Catalog.ts` の表記（例 "iPhone SE (第3世代)" などは catalog で確かめる）。
在庫が少ない（数件）の機種や容量は「目安」にとどめる。iOS 27 の対応は iPhone 11 以降と SE 第2世代以降。

## 最後の報告（ユーザーへ）

日本語で短く:
- 返事への返信（誰に・何を）
- 返信 N件（相手の悩み → 答えた数字を1行ずつ。投稿されたことを確かめたと書く）
- いいね N件・フォロー N件（誰を）
- 投稿（あれば本文の要点と画像）
- 失敗や気づき（あれば正直に）
- 今日の合計と目安との比較を表で
