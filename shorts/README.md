# YouTube ショート（shorts/）

サイトの相場と同じ数字から、縦 1080x1920・約40秒のショート動画（mp4）を作る。方針と根拠は `ideas/youtube-shorts.md`。

## コマンド

```
npx tsx shorts/make-short.tsx drops plan            # 台本 shorts/out/<日付>-drops/script.json を作る（あれば止まる。上書きは --force）
npx tsx shorts/make-short.tsx drops render          # 最新の台本から short-A/B/C.mp4 と youtube.txt を作る
npx tsx shorts/make-short.tsx budget plan           # 予算のテーマ（shorts/out/<日付>-budget/）
npx tsx shorts/make-short.tsx budget render         # short-A.mp4 と youtube.txt（budget は型 A だけ）
npx tsx shorts/make-short.tsx newused plan          # 新品と中古の差のテーマ（shorts/out/<日付>-newused/。型 A だけ）
npx tsx shorts/make-short.tsx newused render
npx tsx shorts/make-short.tsx provs plan            # Proと無印の差のテーマ（shorts/out/<日付>-provs/。型 A だけ）
npx tsx shorts/make-short.tsx provs render
npx tsx shorts/make-short.tsx fold plan             # 折りたたみの1世代前の差のテーマ（shorts/out/<日付>-fold/。型 A だけ）
npx tsx shorts/make-short.tsx fold render
npx tsx shorts/make-short.tsx pixelbudget plan      # 予算ぴったりで買える中古Pixel（shorts/out/<日付>-pixelbudget/。型 A だけ）
npx tsx shorts/make-short.tsx pixelbudget render
npx tsx shorts/make-short.tsx rank plan             # 状態ランク A と C の差のテーマ（shorts/out/<日付>-rank/。型 A だけ）
npx tsx shorts/make-short.tsx rank render
npx tsx shorts/make-short.tsx fold render --no-bgm  # BGM なし（声と効果音だけ）の short-A-nobgm.mp4 と youtube-nobgm.txt（BGM のクレジットなし）
npx tsx shorts/make-short.tsx drops render --dir shorts/out/2026-10-17-drops --keep-frames
npx tsx shorts/make-short.tsx drops render --no-voice  # VOICEVOX の声を入れない
npx tsx shorts/make-short.tsx --voice-test "今週いちばん値下がりした中古iPhoneは？"   # 声だけ試す（shorts/out/voice-test.wav）。--speaker 3 / --speaker ずんだもん/ノーマル・--speed 1.25
npx tsx shorts/stills.tsx [drops budget …]            # 動画を作らず、各テーマの最新の台本から つかみ・ランキング・1位の発表 の静止画（shorts/out/looks/）と一覧 shorts/out/looks-contact.png を作る
npx tsx shorts/make-short.tsx --voice-dump script     # 最後に書いた台本の全ナレーションの読み（エンジンの読み → 直した読み）を出す。"テキスト" でも可。--speaker で話者を変えて試せる
```

テーマ（`shorts/themes/`）:

- `drops`: 今週いちばん値下がりした中古iPhone（型 A・B・C）
- `budget`: 予算ぴったりで買える中古iPhone（型 A だけ・約35秒）
- 声は drops・budget が 春日部つむぎ（ノーマル・1.25倍。10/21〜。1本目の drops だけ ずんだもん）、newused・provs・fold は 青山龍星（ノーマル・1.25倍。クレジット「VOICEVOX:青山龍星」）、pixelbudget は 春日部つむぎ、rank は ずんだもん（ノーマル・1.25倍・口調は です・ます。クレジット「VOICEVOX:ずんだもん」）
  - 3万・5万・7万・10万円ごとに、相場（getModelMarket＝在庫がいちばん多い容量の中央値）が帯（0〜3万・3万超〜5万・5万超〜7万・7万超〜10万）に入る iPhone（iPhone 12 シリーズ以降と SE (第3世代)。11 系・SE (第2世代) は古すぎるので出さない・在庫5件以上）のうち、相場がいちばん高い機種。同じ相場なら発売の新しい方。帯が空なら「予算以下で発売年がいちばん新しい機種」
  - 注目は5万円の行（固定）。出すのは相場（容量つき）と在庫数だけ。最安は出さない（3万円の行より安く見えて分かりにくい）
  - 場面 hook（問い＋予算の札）→ ranking（4行。「○万円なら」の声に合わせて上から）→ reveal（注目）→ comment → outro（「あなたの予算なら…？」）
- `newused`: 新品より中古でいくら安い？（型 A だけ・約39秒。10/21〜）
  - Apple 公式の新品価格がある iPhone（`lib/applePrices.ts`）で、公式価格のある容量のうち中古の在庫がいちばん多い容量（在庫5件以上）の相場（中央値。最安ではない）と新品を比べ、差額（新品−相場）の大きい順。相場が新品以上の機種（発売直後）は出さない。3機種未満なら止まる
  - 場面 hook（問い＋「1位 ？？？」）→ ranking（3位・2位・伏せた1位。drops と同じ行の部品で、下段は容量・差額・率）→ reveal（1位の新品と中古の相場の2本の棒・差額と率）→ comment → outro（「新品と中古、どっちにする？」）。推移グラフはなし
  - ナレーション: ranking「3位は<機種>、<容量>。新品より<額>安いです。」・reveal「1位は<機種>、<容量>。新品の<額>に対して、中古の相場は<額>。<額>、<率>%安くなります。」（「新品<額>」だと数字に付いて「シンピンジュウ」と読まれる）

- `provs`: Proと無印、同じ容量でいくら違う？（型 A だけ・約31秒。10/22〜）
  - iPhone 13〜17 の無印と Pro の組（`themes/provs.ts` の PAIRS）で、両方に在庫5件以上ある容量のうちいちばん小さい容量の相場（中央値）どうしを比べ、差額（Pro − 無印）の大きい順。率は無印の相場に対して。3組未満なら止まる
  - 1位の無印を1つ上の容量（在庫5件以上）にしたときの相場の差を `scenes.upgrade` に入れ、1位の発表と説明欄に出す（在庫が足りなければ出さない）
  - 場面 hook → ranking（3位・2位・伏せた1位。行は「iPhone 16／16 Pro」・容量・+差額・+率）→ reveal（無印と Pro の2本の棒・差額と率・容量を上げたときの差）→ comment → outro（「あなたはPro派？無印派？」）
  - ナレーション: ranking「3位は<無印>と<番号 Pro>、<容量>。差は<額>です。」・reveal「1位は<無印>と<番号 Pro>。Proにすると、約<X.X>万円、およそ<Y>%高くなります。」

- `fold`: 折りたたみスマホ、1世代前にするといくら安い？（型 A だけ・約36秒。10/22〜）
  - 連続する2世代の組（`themes/fold.ts` の PAIRS: Galaxy Z Fold8→7・7→6・6→5、Galaxy Z Flip8→7・7→6・6→5、Pixel 11 Pro Fold→10 Pro Fold・10→9 Pro Fold）で、両方に在庫5件以上ある容量のうちいちばん小さい容量の相場（中央値）どうしを比べ、差額（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。差が0以下の組は出さない。3組未満なら止まる
  - 場面 hook → ranking（3位・2位・伏せた1位。行は「Galaxy Z Fold8／Fold7」・容量・−差額・−率）→ reveal（新しい方と1世代前の2本の棒・差額と率）→ comment → outro（「最新と1世代前、どっちにする？」）
  - ナレーション: ranking「3位は<新>から<旧（Galaxy Z・Pixel を外す）>、<容量>。差は<額>です。」・reveal「1位は<新>から<旧>。1世代前にすると、約<X.X>万円、およそ<Y>%安くなります。」
  - 読み: Galaxy→ギャラクシー・Z→ゼット・Fold→フォールド・Flip→フリップ・Pixel→ピクセル（`voice.ts` の speakable）。ギャラクシー・ピクセルは機種名の頭として切る（`voiceTuning.ts` の BRANDS。切らないと「ピクセルジュウ/イチプロ…」で11が「10・1」に聞こえた）
  - 説明欄のリンクは1位の1世代前（安い方）の機種ページ。utm の campaign の末尾は `_fold`。ハッシュタグ #折りたたみスマホ #Galaxy #Pixel

- `pixelbudget`: 予算ぴったりで買える中古Pixel（型 A だけ・約38秒。10/22〜）
  - budget と同じ選び方・同じ場面（`themes/budget.ts` の `pickBudgetModels` を共有。台本の型も BudgetScript で theme が "pixelbudget"）。対象は `lib/pixelCatalog.ts` の Pixel のうち、Google のアップデート保証が作成月の時点で終わっていない機種（10/22 は Pixel 6・6 Pro を除外）。同じ相場なら販売開始の新しい方
  - この回の切り口: 各行と注目にアップデート保証の終わり（`updateUntil`。販売開始から5年／7年）を出す。注目のナレーションは在庫数の代わりに「アップデートは<年月>までです。」
  - 説明欄のリンクは注目の機種ページ・/pixel/budget/under-50000・/pixel。utm の campaign の末尾は `_pixelbudget`。ハッシュタグ #Pixel #中古スマホ
  - 読み: 「8a」→「ハチエー」（speakable の `(\d+)a`）、「XL」→「エックスエル」（ユーザー辞書＋ voiceTuning で「エル」を前の句につなぐ）、「Pixelは」「Pixelに」は機種名の頭で切らない

- `rank`: 状態ランクでいくら違う？中古iPhone（型 A だけ・約39秒。10/22〜）
  - iPhone 13〜16 の無印と Pro（`themes/rank.ts` の MODELS）で、在庫がいちばん多い容量のランク A・B・C（各店の表記を大文字にそろえる。S＝未使用品・D・ジャンク・不明は除く）の相場（中央値）を比べ、A − C の差額の大きい順。率は A の相場に対して。A・B・C のどれかが在庫5件未満の機種と、差が0以下の機種は出さない。3機種未満なら止まる
  - 場面 hook → ranking（3位・2位・伏せた1位。下段は容量・−差額・−率）→ reveal（ランク A・B・C の3本の棒と件数・A→C の差額と率）→ comment → outro（「あなたならランクA？C？」）。下の注記は「ランクは各店の表記・同じ容量の中央値」
  - ナレーション: ranking「3位は<機種>、<容量>。ランクAより、ランクCが<額>安いです。」・reveal「1位は<機種>。ランクCにすると、約<X.X>万円、およそ<Y>%安くなります。」（容量は画面だけ。読むと40秒を超えた）
  - 読み: 「ランクAとC」は「ラ'ンク/エ'イ/ト'/シ'イ」と1字ずつ切れるので、「ランクA」「ランクC」と書き、`voiceTuning.ts` の 6 で「ランク＋記号」と続く助詞を1つの句にする
  - ひと言の下書き「ランクの差は主に／外装の傷なので／電池は別に見ましょう」（サイトの説明「状態ランクは外装の傷の話」と同じ）。ランクの基準は店ごとに違い、ランクごとに店の顔ぶれも違う（説明欄に書く）
  - 説明欄のリンクは1位の機種ページ（ランク別の最安値の表がある）。utm の campaign の末尾は `_rank`

`--no-bgm`（どのテーマでも）: BGM を入れずに書き出す（声と効果音だけ。声のコンプレッサー・効果音の下げ方・-11 LUFS の2パスは同じ）。出力は `short-<型>-nobgm.mp4` と `youtube-nobgm.txt`（BGM のクレジットなし）で、BGM 入りの版は上書きしない。YouTube のスマホアプリで投稿し、「音源を追加」で流行りの曲を付けるとき用（曲の音量はアプリで下げる）。

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
  - 読みの直し（10/22〜・`voice.ts` の `READING_FIXES`。speakable が最初に通す。横動画 longform も同じ）: エンジンが読み違える語をかなに開く

    | 書く | 読ませる | エンジンの読み（直す前・つむぎ ID 8） |
    | --- | --- | --- |
    | 高すぎ | たかすぎ | コオスギ（文の頭など） |
    | 新すぎ | あたらしすぎ | シンスギ |
    | 古すぎ | ふるすぎ | イニシエスギ |
    | 古め | ふるめ | イニシエメ（10/17 drops の「古めの機種は」もこう読んでいた） |
    | 大きすぎ | おおきすぎ | タイキスギ |
    | 新しめ | あたらしめ | シンシメ |
    | 万件 | 万けん | ナナマンゲン（「1,816件」などは正しくケン） |

    怖すぎ・安すぎ・重すぎ・多すぎ・高め・安めは正しく読む。語を足したら `--voice-dump` で確かめる（その語を含む文だけキャッシュが外れる）
  - 長音（10/21〜）: 「ジュウ」「パア」「ソオ」の伸ばす母音のモーラを、合成の直前に 0.12 秒以上へ延ばす（`lengthenLongVowels`。短すぎて「じゅよん」「ぱせんと」と聞こえたため）。読みに「ー」を書くとエンジンが 400 を返すので使わない。`--voice-dump` に「長音」と「モーラ」（母音の長さ）が出る
- 声があるときは、いったん無圧縮で混ぜて loudnorm の2パスで -11 LUFS にそろえる（1パスだと -15.5 ほどで止まる）
- 合成した WAV は `shorts/out/voice-cache/`（文・読みの手直し・話者・調声の設定・規則の版・辞書のハッシュ）。同じ文はアプリなしでも使い回す
- **声を使ったら `youtube.txt` の説明文の最後に「VOICEVOX:春日部つむぎ」（話者のキャラクター名）が自動で入る**。消さない。キャラクターごとに利用規約が違う（docs/youtube-shorts.md）

## BGM

YouTube オーディオライブラリで曲を選んでダウンロードし、`shorts/assets/bgm.mp3` に置く（Git には入らない）。なければ無音の音声トラックが付く。
曲名は `shorts/assets/bgm.json`（`title`・`artist`・`source`。Git に入る）に書く。bgm.mp3 があれば、render が説明文に「BGM: 曲名 - アーティスト（入手元）」を入れる。曲を替えたら JSON も直す。音量は 4% で一定、最後の3秒で小さくする。

## テーマごとの見た目（`looks.ts`）

テーマごとに地・見出しの帯・カード・強調色・つかみ（1コマ目）を変える（10/22〜。テンプレートの一括加工と見られないように・1コマ目でスワイプされないように）。色は `lib/brandColors.ts` だけ、文字のコントラストは 4.5 以上（比は looks.ts の頭）。場面の長さ・声・音・順位の札の色は全テーマ同じ。

| テーマ | 地 | 見出しの帯 | カード | 強調 | つかみ（t=0） |
| --- | --- | --- | --- | --- | --- |
| drops | 紺 brand900 | 赤 price・左右いっぱい | 角丸28・縁なし | price | 問い＋「1位 ？？？ 1週間で −8,000円」 |
| budget | 明るい ground | 藍 brand600・角丸の箱 | 灰の縁＋影 | price（札は brand600） | 問い＋予算の札 2×2（「なら？」） |
| pixelbudget | 藍 brand800 | 緑 safe・丸い端 | 緑の縁 | price（札は safe） | 問い＋予算の札 2×2（アップデートの終わり） |
| newused | 薄い藍 brand50 | 塗らない・赤い下線 | brand200 の縁 | price | 問い＋「新品 vs 中古」＋最大の差額 |
| provs | 紺 brand900 | 藍の札・左寄せ・左に緑の線 | 左に緑の線 | safe | 問い＋「無印 vs Pro」＋最大の差額 |
| fold | 藍 brand800 | 琥珀 inspect700・対角だけ丸い | 琥珀の縁 | inspect700 | 問い＋開いた折りたたみの形（図形）＋最大の差額 |
| rank | 生成り inspect50 | 墨 ink・角丸の箱 | 琥珀の線の縁＋影 | price | 問い＋ランク A・B・C の札＋A→C の最大の差額 |

## セーフエリア

YouTube の画面表示に隠れる上 220px・下 420px・右 140px には文字を置かない（`scenes.tsx` の `SAFE`）。

## 運用の決まり

- 長さと配置は統一し、見た目はテーマごとに変える（`looks.ts`）。**テーマは毎週ローテーション**（値下がり → 予算 → 2機種比較 → 豆知識）。
- **毎回、検品担当のひと言を人が書く**。テンプレートだけの繰り返し動画は収益化の対象外になりうる（ideas/youtube-shorts.md）。
