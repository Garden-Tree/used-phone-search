---
name: youtube-shorts
description: 【11/23〜 停止中。切り抜きショートは longform-video】used.gadelog.com の YouTube ショート（@used_gadelog「中古スマホ一括検索」）を作って投稿する。台本の作成（DB の相場）→ VOICEVOX のナレーション → BGM・音圧 → 書き出し → ユーザー確認 → YouTube Studio で投稿（説明欄に utm 付きリンクとクレジット）まで。ユーザーがオリジナルのショートの再開をはっきり頼んだときだけ使う。
---

# YouTube ショートの作り方（@used_gadelog）

> **11/23 の判定で、ショートは新しく作らない**（予約済みの 11/24 7:00 iPad 在庫数 stockipad まで。1本＝約1,000回で止まり、登録・サイト訪問に戻らないため。時間は横動画へ。`docs/retired.md`「YouTube ショート」・`docs/changes.md` 11/23）。
> このスキルは**再開するときの手順**として残す。再開はユーザーの指示があるときだけで、そのときは下の「11/23〜 の決まり」（週2本・7:00・在庫数／電池／1世代前）から始める。

- **頻度と作るネタは下の「11/23〜 の決まり」がいちばん優先**（週2本・7:00・在庫数／電池／1世代前だけ。11/22 までの1日2本・1日1本の試しは終了）。公開予約は最長2日後まで
- このスキル＝**作って投稿する手順**。コードの仕組み（コマンドの全部・テーマごとの選び方・調声・見た目の表・締めの関連動画）は `shorts/README.md`、やめたテーマの仕様と読みは `shorts/README-retired.md`。経緯（やめたこと）は `docs/retired.md`、VOICEVOX のキャラクターの規約は `docs/voicevox-terms.md`。記録は `ideas/YYYY-MM-DD.md`。報告は日本語
- チャンネルの説明は 11/23 に「まだ使う？・今買い？・どれを買う？を公式の仕様と毎日の相場で比べる」に変えた（docs/changes.md）
- このスキルの「決まっていること」は、10/21 からユーザーと何度も作り直して決めたもの。**勝手に元に戻さない**。やめたテーマも、ユーザーの指示なしに作り直さない

## 11/23〜 の決まり（いちばん優先）

- **週2本・7:00**（1日1本の試しは 11/23 で終了）。作るのは **在庫数ランキング（stock 系）・電池（battery・batteryswap）・1世代前（gen 系）だけ**
- **やめたネタ**: rank・unused（状態ランク）・drops（値下がり）・budget 系（予算ぴったり）・provs・promax・plusvs・plusmax・minie・oldpro・ultravs・mbpvsair（2機種の差）・newused・overnew・新型との比較・kaitori 系（買取・売る）・トーク型。11/19 までの再生の中央値が 150〜540回・見続けた% 11〜23%（ideas/2026-11-23-shorts.md）
- 在庫数ランキングでも、在庫の少ない機種群（iPad mini・AQUOS・iPad Pro・iPhone Pro）は伸びなかった

### 続けるテーマ（仕様は shorts/README.md「続けるテーマ」）

| 種類 | テーマ | 声 | 見た目 |
| --- | --- | --- | --- |
| 在庫数 | stock（iPhone） | つむぎ | ④ |
| | stockandroid・stockipad・stockwatch・stockpixel・stockgalaxy・stockxperia ほか | ずんだもん | ④ |
| | stockmac・stockmacdesk・stockfold | 青山龍星 | ④ |
| | stockup・stockdown（先週からの増減）・stockpro | つむぎ | ④ |
| 電池 | battery（90%台と80%台の差。`--small` で差の小さい順） | 青山龍星 | ④（電池の形） |
| | batteryswap（電池交換を足すと1つ上と同じ？） | ずんだもん | ④ |
| 1世代前 | gen（iPhone） | ずんだもん | ③ |
| | fold（折りたたみ） | 青山龍星 | ③ |
| | watchgen・ipadgen | つむぎ | ⑤・② |
| | macgen・pixelgen | ずんだもん | ⑤・① |

声は `make-short.tsx` の THEME_SPEAKER が plan で書く。AI の0秒目があるのは `shorts/liveClips.ts` の AI_CLIP_OF にあるテーマだけ（stockmini・stockmacdesk・ipadgen・macgen はなし）。

## 1回分の手順

0. **ネタを選ぶ前に `docs/videos.md` を読む**（これまでの全ショート・横動画のタイトル・テーマ・声・0秒目・視聴・継続）。同じテーマで1位が同じ回は避け、型ごとの本数をそろえる。書き出したら `npx tsx scripts/video-index.ts` で一覧を作り直す
1. **準備**
   - VOICEVOX アプリが起動しているか確かめる: `curl -s http://127.0.0.1:50021/version`。起動していなければ、ユーザーに起動を頼む。声なしで作らない
   - BGM `shorts/assets/bgm.mp3` があるか確かめる。git には入らないので、別の PC では置き直す
2. **台本**: `npx tsx shorts/make-short.tsx <stock|stockandroid|stockmac|stockipad|stockwatch|stockpixel|stockpro|stockgalaxy|stockmini|stockxperia|stockaquos|stockipadpro|stockipadair|stockfold|stockmacdesk|stockup|stockdown|battery|batteryswap|gen|fold|watchgen|macgen|ipadgen|pixelgen> plan [--dir shorts/out/<公開日>-<テーマ>] [--live | --live ai]`
   - `shorts/out/<日付>-<テーマ>/script.json` ができる（すでにあれば止まる。上書きは `--force`）。公開日のフォルダにしたら説明欄の utm の日付も公開日に直す
   - 検品担当のひと言（`comment.lines`・3行まで・1行16字以内）、ナレーション、タイトル、説明文を確かめる。ひと言は下書きなので中身に合わせて直す
   - **前の回と同じ中身にしない**（10/25）: ランキング型は数日では1位が変わらない。plan の1位とタイトルを前の回（shorts/out の同じテーマ）と比べ、ほぼ同じなら作らない。在庫数は1位と2位が近ければ公開の前日に `--force` で取り直す
   - **声を変えて試す**ときは script.json の `voice.speaker` を書き換える（例 "ずんだもん/ノーマル"）。1本で変えるのは1つだけ。結果は公開48時間後の再生数と「視聴を選んだ割合」で ideas に記録
3. **読みを確かめる**: `npx tsx shorts/make-short.tsx --voice-dump script`（最後に書いた台本・その台本の話者で）
   - アクセント句の直す前と後が出る。機種名・数字が細切れになっていないかを見る
   - 直らない場面は、script.json の `narrationKana` に読みを書く
4. **書き出し**: `npx tsx shorts/make-short.tsx <テーマ> render [--dir <フォルダ>]`
   - `short-A.mp4` と `youtube.txt` ができる。`--no-bgm`・`--tiktok` は別のファイル（README）。重い処理なので、render は1本ずつ（同時に走らせない。この PC は負荷で落ちる）
   - 長さ（60秒以内。今は30〜40秒）、音量（-11 LUFS 前後）、タイムライン（場面・行・声の秒）を確かめる
   - 静止画（`ffmpeg -ss <秒> -i short-A.mp4 -frames:v 1 x.png` を Read）で、ランキング・1位の発表・ひと言・締めと、**帯の外（上 280・下 480）と右の 190px に文字がないか**を見る（`shorts/safe-check.tsx` でも数えられる）
5. **ユーザーに見せる**: A を SendUserFile で送り、OK をもらう。**投稿はユーザーの OK のあと**
6. **投稿**（下の「YouTube 投稿」）→ 記録とコミット

## 決まっていること（作り直しで決めたもの）

### 画面
- **ランキングは3位・2位・1位（伏せ字）の3行だけ。** 4位・5位は出さない。空いた分、行と文字を大きくする（行の高さ 260px、機種名は最大80px で、幅に合わせて縮める）
- **ランキングの行は、声に合わせて出す。** 声は文ごとに合成し、各行は「○位は」の0.15秒前に出す。決まった間隔では出さない
- **上部の見出しの帯は大きく**（上の行は最大52px、題は2行で最大104px）。帯の上端は y280。2行は必ず同じ大きさ（11/20 ユーザー「フォントサイズは統一」）。実写の回で題が長いときは `scenes.tsx` の LIVE_HEAD_TITLE に短い題を足す
- **上と下（と右）に読ませるものを置かない**（11/14 ユーザー「被って見えないから」）。文字・数字・棒・札はすべて**安全な帯 y280〜1440・x70〜890** の中（上 280・下 480・右 190px を空ける。右は 11/16〜 ユーザー「開けるようにして」）。地の色・実写・飾りの線は端まで敷いてよい。値は `scenes.tsx` の `SAFE` の1か所（README「セーフエリア」）
- **場面の間に空白を作らない。** 声のある場面の長さは「声の終わり＋0.5秒」。文字やグラフは、場面の頭から出す（出る動きは0.25秒）
- **つかみ（hook）は t=0 で絵がそろっている**（出る動きなし）。出だしの1秒（つかみの絵と最初の声）を最優先で作る

### ナレーション（VOICEVOX）
- 声はテーマごと（上の表）。名前で指定する（`voice.ts` の `DEFAULT_SPEAKER`・`make-short.tsx` の `THEME_SPEAKER`）。ID はエンジンの GET /speakers から引く
- 説明欄のクレジット「VOICEVOX:<キャラクター名>」は render が自動で入れる。消さない。キャラクターごとの規約を読んでから使う（docs/voicevox-terms.md。青山龍星は法人が関わる利用は事前に ななはぴ へ確認）
- 話者を変えたら `--voice-dump` で読みを、render のタイムラインで長さを見直す（話者で間合いが違う）
- **速さ 1.25倍**（`voice.speedScale`）。**読点・句点の間は半分（pauseLengthScale 0.5）**（10/24 ユーザー「ポーズが長い、半分くらいで」）。口調は「です・ます」。「のだ」口調は使わない
- comment はひと言の本文だけ読む（「検品担当のひと言」は画面に出ているので読まない）
- 数字はすべて台本のデータから。作り話や推測の数字は入れない
- **調声**: `shorts/voiceTuning.ts`（句の切れ目の直し）・`shorts/voice-dict.json`（ユーザー辞書。render の前に自動で登録）・`voice.ts` の READING_FIXES。数字は1つの句につなぐ。機種名は「ブランド／番号／型名」で分ける。問いかけは「？」で終える。仕組みは README「ナレーション」

### 続けるテーマの読み（確かめ済み）
- **gen**: 「USB-C」は「ユウエスビイ、シイ」と切れるので、narration.comment に「ユーエスビーシー」と書く
- **fold**: Galaxy ギャラクシー・Z ゼット・Fold フォールド・Flip フリップ・Pixel ピクセル。ブランドは機種名の頭で切る（BRANDS。切らないと11が「10・1」に聞こえる）。ranking は旧の Galaxy Z・Pixel を外す（「3位はGalaxy Z Fold8からFold7、256GB。差は66,000円です。」）
- **watchgen・macgen・ipadgen・pixelgen**: Series シリーズ（BRANDS で頭を切る）・Ultra 2〜4 ウルトラツー〜フォー・M1〜M5 エムワン〜エムファイブ・mm ミリ・Watch ウォッチ・Google グウグル・XL エックスエル。組の読みは `voice.ts` の devicePair
- **batteryswap**: 「1つ上」は READING_FIXES で「ひとつうえ」（ずんだもんが「ヒトツジョウ」と読んだ）
- **stock 系**: 161,980円のような額は「16万せん980」になるので narration は「約16.2万円」（画面はそのまま）。「1,753件」の「3件」はサンゲン → READING_FIXES で「3ケン」。iPad の「(A16)」は読点に・「SE 3」はエスイースリー・Watch は「Series 10」だけ読む。Mac mini マックミニ・iMac アイマック・Mac Studio マックスタジオ
- 「iPhone SE (第3世代)」は括弧を外して読ませる。「−8,000円」は「マイナス8,000円」

### 音
- **BGM**: YouTube オーディオライブラリの「帰属表示が不要」な曲（今は「Okay For Now - Televisions」）。歌の入った曲は使わない。**音量は 4% で一定**（声の切れ目で上げ下げしない）。最後の3秒だけ小さくしていく
- **音圧は大きく、特に声。** 声: コンプレッサー（threshold 0.1・ratio 3・makeup 2）をかけて1.3倍。全体: loudnorm の2パスで -11 LUFS（LRA 7・TP -1）。効果音は声の間 25%
  - YouTube は再生時に -14 前後へ下げるので、効くのは「声と BGM の差」

### 見た目・色（`shorts/looks.ts`・表と締めの仕組みは README）
- **見た目は5つ**（10/23 ユーザー「多くても5種類」）。テーマを選べば地・帯・カード・強調色とつかみが自動で決まる（手で選ばない）。**続けて公開するショートは、前の回と違う見た目（①〜⑤）にする**（在庫数・電池はどれも ④）
- 変えないもの: 帯の位置（y280〜572）・文字の大きさ・行と声の同期・場面の長さ・声・音・順位の札の色（1位 price・2位 ink-mute・3位 inspect-700）・検品担当の札
- 色はすべて `lib/brandColors.ts`（サイトと同じ）。文字のコントラスト比4.5以上（比は looks.ts の頭）
- 確かめ方: `npx tsx shorts/stills.tsx [テーマ…]`（つかみ・ランキング・1位の発表）・`--outro <テーマ…>`（締めの最後のコマ）

### 締めの関連動画
- テーマ → 横動画は **`shorts/relatedLong.ts` の RELATED_LONG だけ**に書く。札とサムネが出るのは RELATED_LONG_THEMES のテーマ（続けるテーマでは stock・battery・batteryswap・gen）。新しい横動画は公開して ID が分かってから足す

## YouTube 投稿（ユーザーの Chrome・YouTube Studio）

- **説明欄**（`youtube.txt`。`shorts/themes/<テーマ>.ts` が作る）: ランキングは**3位まで**（動画と合わせる）・選び方のルール・機種ページとトップのリンク（**utm** `?utm_source=youtube&utm_medium=social&utm_campaign=shorts_YYYYMMDD_<テーマ>`）・「VOICEVOX:<キャラクター名>」・「BGM: <曲名> - <アーティスト>（YouTube オーディオライブラリ）」（どちらも render が自動で入れる。BGM は `shorts/assets/bgm.json`）・ハッシュタグ（最大3つがタイトル上に出る）
  - ショートの説明欄のリンクは押せない（2023年8月〜）。押せる入口はチャンネルのページのリンク（`utm_medium=channel`）と、締めのナレーション
- **手順**（ショートは Claude が上げる。ファイルは 10MB 以内）
  1. 「作成」→「動画をアップロード」→ ファイル入力に `file_upload` で short-A.mp4 を入れる
  2. タイトルの欄を座標でクリック → ctrl+a → type。説明の欄の位置は JS で取り直す（タグの候補が出ると位置がずれる）
  3. 入力後、**Escape を押さない。** 押すとアップロードの画面ごと閉じる。閉じたときは、「コンテンツ」の行の「ドラフトを編集」で戻れる（タイトルと説明は保存されている）
  4. 設定: 「いいえ、子ども向けではありません」・詳細設定を表示 →「有料プロモーションなし」・改変/合成コンテンツ「いいえ」（キャラクター音声で、実在の人をリアルに見せていないため）
     - **`--live ai`（liveClip が `ai-` で始まる回・11/16〜）は「改変されたコンテンツ」を はい にする**（render が同じフォルダに `upload-note.txt` を書く。説明欄には貼らない）。実写（pexels・pixabay）と図だけの回は いいえ のまま
     - 0秒目は 11/22 に判定（AI 45.4%・実写 43.4% で差なし）。交互を続け、新しい AI クリップは作らない。カードだけの0秒目はやめる
     - **関連動画**（詳細の「関連動画」）は `shorts/relatedLong.ts` の RELATED_LONG でそのテーマに書いた横動画にする。締めの画面のサムネと同じ動画でないといけない。違う動画にしたいときは、先に表を直してから書き出す
  5. 次へ ×3 → チェックで問題がないことを確かめる → 公開（予約は**最長2日後**・7:00。相場が動くため）
  6. 共有画面の URL（youtube.com/shorts/<ID>）を控える
  7. **公開されたら問いかけの固定コメント**（10/25〜）: `youtube.com/shorts/<ID>` で開き（watch?v= はショートの画面に切り替わる）、右の「コメント」ボタン → 下の「コメントする…」をクリック（activeElement が contenteditable-root か確かめる）→ computer の type → 「コメント」→ ⋮ →「固定」→ 確認の「固定」。締めの声と同じ向きの問いを1行。リンクは入れない（押せない）。コメントが来たら相場を引いて返す
- 公開済みの動画の説明欄は、Studio の動画の詳細で直せる（`#save`）
- **同じテーマ・同じデータのショートを同じ日に2本出さない。同じ動画を2本上げない**（10/21 に上げ直したら初動が 1回 対 84回）。直したい点は公開前に直す。公開後なら次の回に回す
- 動画の削除はしない（ユーザーがする）。非公開・公開の切り替えは、ユーザーの指示があればする
- チャンネル名は「中古スマホ一括検索」（サイト名と同じ）。名前の変更は14日で2回まで

## 分かっていること
- 再生数を分けるのは Studio の「**視聴を継続**」（スワイプされずに見られた割合）→ **出だしの1秒を最優先**。新しい型の判定は公開48時間で。種類ごとの数字は ideas/2026-11-23-shorts.md、10/22〜10/26 の調査（公式の説明・独自コンテンツの方針）の原文は `shorts/README-retired.md` の末尾
- 毎回、検品担当のひと言と数字の解釈を変える（2026/10〜 テンプレートの一括加工は独自とみなされない）

## 記録とコミット
- `ideas/YYYY-MM-DD.md` に記録する: 動画の URL・型・長さ・音量・1〜3位・直したこと
- STATE.md・docs/changes.md を更新する（CLAUDE.md の規則）。`npx tsx scripts/video-index.ts` で docs/videos.md を作り直す
- コードを変えたときは、`shorts/README.md` も直す（規約に関わるときは `docs/voicevox-terms.md`）
- 数日後、YouTube Studio の再生数と、GA の参照元 `youtube`（utm_source=youtube）を見る
