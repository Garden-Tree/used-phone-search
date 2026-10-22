# 横動画（longform/）

台本（`<フォルダ>/script.md`・つむぎとずんだもんの掛け合い）と数字（`<フォルダ>/data.json`）から、横 1920x1080 の動画を作るための土台。
作り方はショート（`shorts/`）と同じ: React の1コマ → `ImageResponse`（next/og）で PNG → ffmpeg。色は `lib/brandColors.ts` だけ。

## コマンド

```
npx tsx longform/voice-draft.ts longform/2026-10-21-iphone-dore            # 声だけの試作（voice-draft.m4a・chapters.txt）。VOICEVOX（CPU）が要る
npx tsx longform/timeline.ts    longform/2026-10-21-iphone-dore            # 時間割 timeline.json（エンジン不要。声の長さはキャッシュから）
npx tsx longform/render.ts      longform/2026-10-21-iphone-dore stills     # 章ごとの見本 stills/ch01〜12.png と一覧 stills/contact.png
npx tsx longform/render.ts      longform/2026-10-21-iphone-dore frame 95.5 # その秒の1枚（stills/at-95.5.png）
```

- 動画全体の書き出しはまだない（PC が重い処理で落ちるので、作るときも1コマずつ順に・ffmpeg は1本・2スレッドまで）
- `timeline.json` と `frames/` は Git に入れない（.gitignore）。`stills/` は小さいので残す

## ファイル

| ファイル | 役割 |
| --- | --- |
| `script.ts` | script.md を章・【画面】・台詞に分ける。行の間 0.25 秒・章の間 0.8 秒・速さ 1.15・読みの直し（forVoice） |
| `voice-draft.ts` | 声だけの試作（script.ts を使う） |
| `types.ts` | data.json と timeline.json の型 |
| `timeline.ts` | 台詞ごとの声の長さ → 開始秒・字幕のページ（2行まで）・各項目の出る秒 |
| `scenes.tsx` | 1コマ（`frameAt(timeline, t)`）。いつも出る枠と、中央のカードの部品 |
| `render.ts` | PNG にする（見本の静止画・1枚） |

## 画面の配置（いつも同じ）

- 左上: 章の帯（`03/12 3万円台`）・右上: used.gadelog.com
- 中央: 白いカード（部品は下の5つ。data.json の `scene.type`）
- 左右: 話し手の枠（左＝ずんだもん・右＝つむぎ）。**立ち絵の規約を確かめるまでは名前の札だけ**（話している人を塗る）
- 下: 字幕（話し手の名前と色。つむぎ inspect-700・ずんだもん safe）。2行まで、長い台詞はページに分ける。英数字の語・カタカナの語・「1.5万円」は行の途中で切らない
- 最下: 「2026/10/21 時点・大手中古ショップ17店の在庫から」

## 部品（data.json の scene）

| type | 中身 | 例 |
| --- | --- | --- |
| `bigNumber` | 大きな数字・言葉（2〜3個） | 結論（5万円なら iPhone 13）・調べ方（17店・約7万件・1日4回） |
| `bars` | 横棒（機種×相場）＋最安の赤い点・在庫数・おすすめ札 | 予算別の4章 |
| `pairs` | 2本ずつの棒と差（色は SITE のキー） | Proと無印・新品と中古 |
| `table` | 表（emphasis の列を赤く） | 値下がり・電池の書き方・まとめ |
| `checklist` | 番号つきの行を1つずつ出す | 買う前に見る3つのこと |

- 各項目の `cue` は「この文字列を含む台詞が始まったら出す」。見つからなければ timeline.ts が警告して最初から出す
- 数字は data.json だけに書く（台本の数字をそのまま写す。作る日に取り直したら両方直す）

## 声のキャッシュ

timeline.ts は `shorts/voice.ts` の `synthesize`（オフライン）で声の長さを読む。キャッシュの鍵に辞書（`shorts/voice-dict.json`）が入るため、
ショートで辞書を足すと当たらなくなる。そのときは同じ文・話し手・速さの古いキャッシュで長さだけ測る（`stale: true`）。
書き出す前に voice-draft.ts を回して、今の辞書で合成し直す。
