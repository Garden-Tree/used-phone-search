# ショートのデザインの知見（11/9・検索と他チャンネル14本から）

数字の多くは制作会社・ツール会社のブログで、公式の基準ではない。うちの判定は Studio の「視聴を継続」（スワイプされなかった割合）で行う（11/8: 平均 23.7%・上位20本が 1,000〜1,232 で横並び）。

## 1. 0〜2秒（スワイプを止める）

- **実写か人**が1コマ目。文字と図だけの回は、他の人でも 800〜4,000 で止まる（11/9 に14本を確認）
- 文字は **1〜2行・1行5〜10字**・白に黒縁（または赤帯）。「流行ってるねんで」「買っちゃダメ」のような話し言葉
- あいさつ・自己紹介・題名から始めない。**結論か問い**から（tatap・0120）
- 数字・順位・比較は 2〜5秒目以降。1画面に1つ
- フックは3〜4型に絞って A/B（同じ本編で冒頭だけ2つ作る）。見る順は 3秒到達率 → 視聴維持 → 保存 → プロフィール遷移（bloomeria）

## 2. 文字（テロップ）

- 太字ゴシック・白文字＋黒縁がいちばん汎用（0120）。派手なフォントは1本に1〜2か所
- **1画面 6〜8語（日本語なら 10〜16字）**、最小 32pt 相当（fluxnote）。60秒で約240字が上限の目安（0120）
- 色は意味にだけ使う（強調・話者・章）。白＋アクセント2色まで（kinetic typography のガイド）
- 1〜2語だけ動かす。全部を動かすと読めない。動きは意味を補う（大きく＝重要、順に出る＝順序）
- 声より遅れずに出す（0120）
- **セーフゾーン**: 下 25%（題名・チャンネル名・字幕）と右 15%（ボタン列）に重要な文字を置かない。数字は資料でばらつく（上 100〜288px・下 180〜672px・右 80〜192px）。実機で確かめる。目安は**中央の 900×1,400px**（adaptlypost）
  - うちの帯 y250〜570・本文 y590〜1400 はこの中。注記 y1420 は下 25% に入るので実写モードでは出さない

## 3. 絵とテンポ

- **2〜3秒ごとに絵が変わる**と視聴維持が高い（fluxnote・単一ソース）。教育系は 3〜5秒（同）
- 素材（実写・B ロール・静止画）を回して単調を避ける。実写は少し速めてもよい（opus.pro）
- ループ: 最後のコマを最初につなげると再視聴が視聴時間に乗る
- 長さより保持率。30〜45秒が多いが、詰められるなら短く

## 4. データ（相場）の見せ方

- 横長の表を縦に押し込まない。**簡単にする**（gridline・凡例・注記を消す。onlinejournalismblog）
- **1つの図は1つの問いに答える**。大きな数字・アクセント1色・カウントアップ・最後にまとめのカード（hera・fluxnote）
- 1本に図は1〜2個まで（データ動画のガイド）
- うちへの当てはめ: ランキングの行は「機種名＋数字1つ」。容量・%・件数はカードから外し、言うなら声で。1位の発表は数字1つと棒1本

## 5. うちの型（11/9 時点）

| 場面 | 実写モード（`--live`） |
| --- | --- |
| 0〜3秒 | 実写（明るめ）＋2行＋図1つ（電池が満ちる・棒が伸びる・棒2本・数字）。帯なし |
| 3秒〜 | 実写（暗め・ぼかし）を敷いて、帯とカード。場面ごとに素材を替える。注記なし |
| 締め | 実写＋サイト名 |

次に削るもの: カードの中の小さい数字（容量・率・件数）→ 1行1数字。判定は 11/16 に視聴を継続 24%→40%。

## 出典

- [0120.co.jp テロップ設計](https://0120.co.jp/blog/video-125/)・[0120.co.jp 企画フレーム](https://0120.co.jp/blog/video-103/)
- [tatap ショート動画制作ガイド](https://tatap.jp/knowledge/short-video-production/)・[bloomeria フックの型](https://bloomeria.jp/blog/short-video-hook-templates-2026)
- [fluxnote 保持率](https://fluxnote.io/guides/faceless-shorts-retention-tips-2026)・[fluxnote テロップ](https://fluxnote.io/guides/faceless-shorts-text-overlay-tips-2026)・[easyviral 500本の分析](https://easyviral.ai/blog/we-analyzed-500-viral-faceless-shorts)
- [opus.pro 長さと構成](https://opus.pro/blog/ideal-youtube-shorts-length-format-retention)・[opus.pro フックの型](https://www.opus.pro/blog/youtube-shorts-hook-formulas)
- セーフゾーン: [adaptlypost](https://adaptlypost.com/blog/social-media-safe-zones-2026-complete-guide)・[socialync](https://www.socialync.io/tools/safe-zones/youtube-shorts)・[poster.ly](https://www.poster.ly/tools/youtube-shorts-safe-zone-checker)・[reap.video](https://reap.video/blog/short-form-video-safe-zones)
- 動く文字: [thesocialcat](https://thesocialcat.com/glossary/kinetic-typography)・[cursa](https://cursa.app/en/page/caption-systems-and-kinetic-text-for-clarity)
- データ: [onlinejournalismblog](https://onlinejournalismblog.com/2026/06/23/showing-charts-on-video-here-are-two-essential-techniques-to-make-them-effective/)・[hera.video](https://hera.video/blog/animated-infographic-video-generator-data-storytelling)・[XJTLU 論文](https://scholar.xjtlu.edu.cn/en/publications/design-guidelines-for-augmenting-short-form-videos-using-animated/)
