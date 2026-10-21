# YouTube ショート（shorts/）

サイトの相場と同じ数字から、縦 1080x1920・約40秒のショート動画（mp4）を作る。方針と根拠は `ideas/youtube-shorts.md`。

## コマンド

```
npx tsx shorts/make-short.tsx drops plan            # 台本 shorts/out/<日付>-drops/script.json を作る（あれば止まる。上書きは --force）
npx tsx shorts/make-short.tsx drops render          # 最新の台本から short-A/B/C.mp4 と youtube.txt を作る
npx tsx shorts/make-short.tsx budget plan           # 予算のテーマ（shorts/out/<日付>-budget/）
npx tsx shorts/make-short.tsx budget render         # short-A.mp4 と youtube.txt（budget は型 A だけ）
npx tsx shorts/make-short.tsx drops render --dir shorts/out/2026-10-17-drops --keep-frames
npx tsx shorts/make-short.tsx drops render --no-voice  # VOICEVOX の声を入れない
npx tsx shorts/make-short.tsx --voice-test "今週いちばん値下がりした中古iPhoneは？"   # 声だけ試す（shorts/out/voice-test.wav）。--speaker 3 / --speaker ずんだもん/ノーマル・--speed 1.25
npx tsx shorts/make-short.tsx --voice-dump script     # 最後に書いた台本の全ナレーションの読み（エンジンの読み → 直した読み）を出す。"テキスト" でも可。--speaker で話者を変えて試せる
```

テーマ（`shorts/themes/`）:

- `drops`: 今週いちばん値下がりした中古iPhone（型 A・B・C）
- `budget`: 予算ぴったりで買える中古iPhone（型 A だけ・約35秒）
- 声は全テーマ 春日部つむぎ（ノーマル・1.25倍。10/21〜。1本目の drops だけ ずんだもん）
  - 3万・5万・7万・10万円ごとに、相場（getModelMarket＝在庫がいちばん多い容量の中央値）が帯（0〜3万・3万超〜5万・5万超〜7万・7万超〜10万）に入る iPhone（iPhone 12 シリーズ以降と SE (第3世代)。11 系・SE (第2世代) は古すぎるので出さない・在庫5件以上）のうち、相場がいちばん高い機種。同じ相場なら発売の新しい方。帯が空なら「予算以下で発売年がいちばん新しい機種」
  - 注目は5万円の行（固定）。出すのは相場（容量つき）と在庫数だけ。最安は出さない（3万円の行より安く見えて分かりにくい）
  - 場面 hook（問い＋予算の札）→ ranking（4行。「○万円なら」の声に合わせて上から）→ reveal（注目）→ comment → outro（「あなたの予算なら…？」）

テーマを足すときは、`types.ts` に台本の型、`themes/` に「データ → 台本」、`voice.ts` に既定のナレーション、`scenes.tsx` に場面、`make-short.tsx` の `THEMES`・`THEME_SPEAKER` を足す。
同じテーマ・同じデータのショートを同じ日に2本出さない（ほぼ同じ内容は勧められにくい）。

## 毎週の流れ

1. `plan` で台本を作る（DB の既存の集計だけ読む）
2. `script.json` の `scenes.comment.lines`（検品担当のひと言）を**自分の判断で書き換える**（3行まで・1行16字以内）。タイトル・説明文も確認
3. 声: VOICEVOX アプリを起動しておけば、`render` がナレーション（春日部つむぎ）を自動で入れる（下の「ナレーション」）。自分で録った声を使う週は `<出力先>/voice.m4a`（mp3・wav も可）を置くと、コメント場面はそちらが優先
4. `render` で `short.mp4` と `youtube.txt`（タイトル・説明・ハッシュタグ）を作る。mp4 を再生して確認
5. YouTube に手動でアップロード（API の自動投稿はしない）。同じ動画を X にも投稿する

## ナレーション（VOICEVOX・任意）

- VOICEVOX アプリ（https://voicevox.hiroshiba.jp/ ）を入れて起動すると、エンジンが http://127.0.0.1:50021 で動く。`render` はそこへ文を送って WAV を作る。別の場所なら環境変数 `VOICEVOX_URL`
- **起動していなければ「接続できません」と出して、声なしで今まで通り書き出す**（止まらない）
- 読む文は `script.json` の `narration`（場面ごと: hook・ranking・reveal・trend・comment・outro）。書かない場面は既定の文（`shorts/voice.ts` の `defaultNarration`）、空文字 `""` にするとその場面は声なし
  - 既定（台本の数字だけ。`defaultNarration`）: hook「今週いちばん値下がりした中古iPhoneは…？」・ranking「3位は<機種>、マイナス<額>。2位は…」（1位は伏せる。ランキングの場面は 3位・2位・伏せた1位の3行だけ。文ごとに合成し、各行は「○位は」の声の 0.15 秒前に出る。声なしは決まった間隔。render がタイムライン（場面・行・声の秒）を出す）・reveal「1位は<機種>、<容量>。1週間で<額>、<率>%の値下がりです。相場は<前>から、<後>になりました。」・trend（A だけ・4秒）「<日付>に大きく下がりました。」（前の日からいちばん下がった日。画面は線・最初と最後の値・その日の印だけ）・comment は `comment.lines` だけ（札の「検品担当のひと言」は読まない。「〜でも」の後に読点、「おすすめ」で終われば「です」）・outro「全機種の相場は、プロフィールのリンクから見られます。来週の1位は、どの機種でしょう？」
  - `plan` は comment 以外を書き出す（comment は lines を直せば声も変わる）。「円安」は為替と聞き違えるので「マイナス○円」と読む
  - B・C の冒頭（hookNum・hookChart）は hook の文を読む。英字の機種名・GB・% は読み上げのときだけカナに直す（`speakable`）
- 話者は `script.json` の `voice`: `{ "speaker": "春日部つむぎ/ノーマル", "speedScale": 1.25 }`。plan がテーマごとに書く（いまは全テーマ 春日部つむぎ。`make-short.tsx` の `THEME_SPEAKER`）。ほかに `intonationScale`（抑揚）・`pitchScale`（音高）・`pauseLengthScale`（読点の間）も書ける（書かなければエンジンの既定）。speaker は ID か名前（`"春日部つむぎ/ノーマル"`・`"ずんだもん/ノーマル"`・`3`）。既定は 春日部つむぎ（ノーマル・標準の VOICEVOX で ID 8）
- 声は場面の頭から流れる。場面が「声＋0.5秒」より短ければ場面を延ばす（60秒を超えたら注意を出す）。声の間は効果音・BGM を下げ、声があるときは全体を -11 LUFS にそろえる
- **調声**（`shorts/voiceTuning.ts`）: ① `shorts/voice-dict.json` をユーザー辞書に登録（同じ語があれば上書き。語を足すときはこの JSON に書く）② エンジンの読み（AquesTalk 風）を規則で直す: 数字の細切れ（ニヒャク/ゴジュウ/ロク）をつなぐ（万の後は切る）・「アイフォン/ジュウナナ/プロマックス」に切る・「値下がり/した」をつなぐ ③ それでも変な文は `script.json` の `narrationKana`（例 `{ "reveal": "イチイ'ワ、アイフォ'ン/ジュウナ'ナ/..." }`）で場面ごとに読みを指定。`--voice-dump script` の after をコピーして直すのが早い
  - 長音（10/21〜）: 「ジュウ」「パア」「ソオ」の伸ばす母音のモーラを、合成の直前に 0.12 秒以上へ延ばす（`lengthenLongVowels`。短すぎて「じゅよん」「ぱせんと」と聞こえたため）。読みに「ー」を書くとエンジンが 400 を返すので使わない。`--voice-dump` に「長音」と「モーラ」（母音の長さ）が出る
- 声があるときは、いったん無圧縮で混ぜて loudnorm の2パスで -11 LUFS にそろえる（1パスだと -15.5 ほどで止まる）
- 合成した WAV は `shorts/out/voice-cache/`（文・読みの手直し・話者・調声の設定・規則の版・辞書のハッシュ）。同じ文はアプリなしでも使い回す
- **声を使ったら `youtube.txt` の説明文の最後に「VOICEVOX:春日部つむぎ」（話者のキャラクター名）が自動で入る**。消さない。キャラクターごとに利用規約が違う（docs/youtube-shorts.md）

## BGM

YouTube オーディオライブラリで曲を選んでダウンロードし、`shorts/assets/bgm.mp3` に置く（Git には入らない）。なければ無音の音声トラックが付く。
曲名は `shorts/assets/bgm.json`（`title`・`artist`・`source`。Git に入る）に書く。bgm.mp3 があれば、render が説明文に「BGM: 曲名 - アーティスト（入手元）」を入れる。曲を替えたら JSON も直す。音量は 4% で一定、最後の3秒で小さくする。

## セーフエリア

YouTube の画面表示に隠れる上 220px・下 420px・右 140px には文字を置かない（`scenes.tsx` の `SAFE`）。

## 運用の決まり

- 型（見た目・長さ）は統一し、**テーマは毎週ローテーション**（値下がり → 予算 → 2機種比較 → 豆知識）。
- **毎回、検品担当のひと言を人が書く**。テンプレートだけの繰り返し動画は収益化の対象外になりうる（ideas/youtube-shorts.md）。
