# shorts/（横動画が使う部分だけ）

オリジナルのショートは 11/23〜 作らない（いまのショートは横動画の切り抜き `longform/clip-short.tsx`）。テーマ・見た目・締めなどショートだけの仕組みは git の履歴（コードは残っていて動く）。

## 横動画（longform/）が使うもの

| ファイル | 使い方 |
| --- | --- |
| `voice.ts` | `synthesize`（合成＋キャッシュ）・`engineAvailable`・`visemesOf`（リップシンクの母音）。`longform/voice-draft.ts`・`timeline.ts`・`video.tsx`・各回の `kana.ts` が import |
| `voice.ts` の `READING_FIXES` | エンジンが読み違える語をかなに開く（`speakable` が最初に通す）。横動画の読み違いはここか `longform/script.ts` の forVoice |
| `voiceTuning.ts` | 調声（辞書の登録・数字の細切れをつなぐ・型名の後の数字を切る・長音を 0.12 秒以上に）。規則を変えたら TUNING_VERSION を上げる |
| `voice-dict.json` | VOICEVOX のユーザー辞書（語を足すときはここ）。**中身がキャッシュの鍵に入るので、足すと横動画の声は合成し直し**（`voice-draft.ts`） |
| `out/voice-cache/` | 合成した WAV と json（`spoken`・`kana` で読みを確かめる）。同じ文はアプリなしで使い回す |
| `assets/se/` | 効果音（効果音ラボ・クレジット不要） |
| `assets/bgm.mp3`・`bgm.json` | 横動画の BGM がないときの代わり（Git に入らない） |
| `scenes.tsx` の `SAFE` | 縦画面の安全な帯（上 280・下 480・右 190）。`clip-short.tsx` も守る |
| `themes/budget.ts`・`watchgen.ts`・`foldbudget.ts` | 一部の回の `data-query.ts` が関数・機種の表を import・考え方を写す |

## VOICEVOX

- アプリを起動するとエンジンが http://127.0.0.1:50021（別の場所なら `VOICEVOX_URL`）。確かめ: `curl -s http://127.0.0.1:50021/version`
- 話者は名前か ID（`"春日部つむぎ/ノーマル"`・`"ずんだもん/ノーマル"`）。既定の読点の間 `DEFAULT_PAUSE` 0.5（エンジンの半分。横動画も同じ）
- 読みに「ー」を書くとエンジンが 400 を返すので使わない。括弧は外して読ませる（間が空く）
- 声を使ったら説明欄に「VOICEVOX:<キャラクター名>」を必ず入れる（規約は `docs/voicevox-terms.md`）
- 読みの確かめ: `npx tsx shorts/make-short.tsx --voice-dump "テキスト"`（エンジンの読み → 直した読み。`--speaker` で話者を変える）・`--voice-test "テキスト"`（`shorts/out/voice-test.wav`）
