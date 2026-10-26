# YouTube ショート（引き継ぎ・10/17 時点。テーマ・声は 10/21 に更新）

構成と調査の経緯は `ideas/youtube-shorts.md`。使い方の詳細は `shorts/README.md`。

## いまの状態

- **チャンネル**: 「中古スマホ一括比較」@used_gadelog（ID UChEMmzg1RvjZ1LpiTxleGMA・10/17 開設）
  - 作成とログインはユーザー。アイコン・バナー・説明文・リンクは Claude が設定済み。
  - 設定の文面は `shorts/channel.md`、画像は `npx tsx shorts/brand.tsx` で作り直せる。
- **動画**: 試作は 10/17 のデータで3パターン（`shorts/out/2026-10-17-drops/`。out は Git に入らない）。
  - **まだ1本も投稿していない。**
- **音**: 効果音（ffmpeg で合成）＋ VOICEVOX のナレーション（任意・10/21〜。下の「ナレーション」）。BGM（`shorts/assets/bgm.mp3`）はまだない。
  - VOICEVOX はこの PC にまだ入っていない。声の重ね方はまねのエンジン（無音に近い WAV を返す）で確認済み。実際の声では未確認。

## 毎週の作り方

```
npx tsx shorts/make-short.tsx <drops|budget|pixelbudget|ipadbudget|macbudget|probudget|foldbudget|galaxybudget|bigbudget|newused|provs|promax|fold|rank|battery|gen|storage|rakutenmobile> plan     # 台本 script.json（--force で作り直し）
# script.json の scenes.comment.lines（検品担当のひと言・3行×16字まで）をユーザーと決めて書き換える
npx tsx shorts/make-short.tsx <drops|budget|pixelbudget|ipadbudget|macbudget|probudget|foldbudget|galaxybudget|bigbudget|newused|provs|promax|fold|rank|battery|gen|storage|rakutenmobile> render   # drops は short-A/B/C.mp4（--variant A|B|C で1つだけ）、ほかは short-A.mp4
- drops は plan に `--days N` で比べる期間を変えられる（既定7＝「今週」。7以外は「この1か月」「約1か月で」「来月」・帯の上の行は「毎日集計」。推移グラフはどちらも比べた期間だけ。10/24〜）。記録は iPhone 9/26・iPad 9/27・Galaxy／Pixel 9/30・MacBook 10/15・Apple Watch 10/16 から
npx tsx shorts/make-short.tsx <テーマ> render --no-bgm   # BGM なしの short-A-nobgm.mp4 と youtube-nobgm.txt（BGM のクレジットなし）。YouTube アプリの「音源を追加」で流行りの曲を付ける用
```

- 声は drops・budget が 春日部つむぎ（ノーマル・1.25倍。10/21〜。1本目の drops だけ ずんだもん）、newused・provs・fold は 青山龍星（ノーマル・1.25倍・10/21〜・provs・fold は 10/22〜）。pixelbudget は 春日部つむぎ、ipadbudget は 青山龍星（10/23〜）、rank は ずんだもん（ノーマル・1.25倍・10/22〜。口調は です・ます）。promax は 青山龍星、macbudget は 春日部つむぎ（10/23〜）。probudget は 春日部つむぎ、foldbudget は 青山龍星（10/24〜）。plusvs は 青山龍星（10/25〜）。minie・unused は 青山龍星（10/26〜）。bigbudget は 春日部つむぎ（10/26〜）。rakutenmobile（広告の回）は 春日部つむぎ（10/26〜）。読点・句点の間はエンジンの半分（pauseLengthScale 0.5。10/24〜。場面の切り替わりの間は変えない）。
- テーマ: drops（値下がりランキング）／budget（予算ぴったりで買える中古iPhone・帯ごとに相場がいちばん高い機種・iPhone 12 シリーズ以降と SE 第3世代・10/21〜）／newused（新品より中古でいくら安い？・Apple 公式の新品価格と同じ容量の中古の相場の差額ランキング・10/21〜）／provs（Proと無印、同じ容量でいくら違う？・iPhone 13〜17 の無印と Pro の同じ容量の相場の差額ランキング・10/22〜）／fold（折りたたみスマホ、1世代前にするといくら安い？・Galaxy Z Fold／Flip・Pixel Pro Fold の連続する2世代の同じ容量の相場の差額ランキング・10/22〜）／pixelbudget（予算ぴったりで買える中古Pixel・budget と同じ選び方でアップデート保証が残る Pixel・各行に保証の終わり・10/22〜）／ipadbudget（予算ぴったりで買える中古iPad・同じ選び方で iPadOS 27 対応の iPad・予算は5万〜15万円・各行に使える Apple Pencil・10/23〜）／rank（状態ランクでいくら違う？・iPhone 13〜16 の同じ容量のランク A と C の相場の差額ランキング・10/22〜）／promax（Pro MaxとPro、同じ容量でいくら違う？・iPhone 13〜18 の Pro と Pro Max・provs と同じ場面・10/23〜）／plusvs（Plusと無印、同じ容量でいくら違う？・iPhone 14〜16 の無印と Plus・provs と同じ場面・10/25〜）／minie（無印より安い“弟分”、いくら安い？・12／13 mini・16e／17e と無印の同じ容量の相場の差・10/26〜）／unused（未使用品（ランクS）は中古（ランクA）よりいくら高い？・iPhone 13〜17 の無印と Pro・ランクは各店の表記・10/26〜）／macbudget（予算ぴったりで買える中古MacBook・同じ選び方で予算は10万〜30万円・各行にチップと発売年・10/23〜）／probudget（予算ぴったりで買える中古iPhone Pro・同じ選び方で iPhone 13 Pro 以降の Pro・Pro Max・予算は7万〜20万円・各行に画面の大きさと端子・10/24〜）／foldbudget（予算ぴったりで買える中古折りたたみスマホ・同じ選び方で Galaxy Z Fold・Z Flip と Pixel の Fold・予算は5万〜20万円・各行に型と開いたときの画面・見た目は fold と同じ・10/24〜）／plusmax（PlusとPro Maxの差・10/26〜・つむぎ）／oldpro（1世代前のProと次の無印、どっちが安い？・10/26〜・ずんだもん）／rakutenmobile（**広告の回・楽天アフィリエイト**。楽天モバイルの料金 3段（税込・割引なし・公式の値だけ）と中古 iPhone 14 128GB の相場で2年の合計・最初の声で PR・左上に「PR」・説明欄の1行目に【PR】・楽天モバイルのリンクはショートの説明欄・コメントに貼らない・ポイント・キャンペーン・特典・「最安」「実質0円」「必ず安い」「無料」「お得」・ほかの会社の料金・すぐの解約や乗り換えは出さない・見た目は ⑥ AD・10/26〜・つむぎ）。選び方は `shorts/README.md`。
- **声の実験（10/26）**: plusmax・oldpro は、伸びた比べる型（plusvs・provs・promax ＝ 青山龍星）を つむぎ・ずんだもん で出し、青山龍星 が本当に強いかを見る。
- 同じテーマ・同じデータのショートを同じ日に2本出さない。
- 出力先は `shorts/out/<日付>-<テーマ>/`。`youtube.txt` にタイトル・説明文・ハッシュタグが入っている。
- 投稿は手動で、YouTube に出したものを X にも出す。Claude が Chrome で投稿するときは、直前にユーザーの確認をとる。
- 対象は iOS 27 対応の iPhone だけ（`ALL_CATALOG_MODELS`）。
- 推移は、在庫件数がふだんの半分未満の日を除く。縦軸は最高値の20%以上の幅をとる。

## TikTok（10/26〜）

- アカウント @used_gadelog（個人・PC の TikTok Studio にログイン済み）。調べた経緯は `ideas/2026-10-26-tiktok.md`、運用の手順と決まりは `.claude/skills/tiktok-ops/SKILL.md`。
- YouTube ショートの回を **BGM なしで書き出し直して**（`render --no-bgm` → `short-A-nobgm.mp4`）、TikTok Studio から1本ずつ手で上げる。自動化ツール・投稿のスクリプトは使わない（TikTok の禁止事項）。
- キャプション: `npx tsx shorts/tiktok-caption.ts shorts/out/<日付>-<テーマ>` → 同じフォルダの `tiktok.txt`（つかみ・数字・「相場は used.gadelog.com で検索」・VOICEVOX のクレジット・ハッシュタグ。BGM のクレジットと utm は入れない。広告の回は先頭に #PR）。
- フォロワー1,000人までは PR・アフィリエイトの回を出さない（プロフィールのリンクも置けない）。

## ナレーション（VOICEVOX）

1. VOICEVOX アプリを入れる（公式 https://voicevox.hiroshiba.jp/ から Windows 版。インストールはユーザー）。
2. アプリを起動したままにする（エンジンが http://127.0.0.1:50021 で動く）。
3. `npx tsx shorts/make-short.tsx --voice-test "今週いちばん値下がりした中古iPhoneは？"` で声と読みを確かめる（`shorts/out/voice-test.wav`）。話者を変えるなら `--speaker 2` や `--speaker 四国めたん/ノーマル`、速さは `--speed 1.25`（既定 1.25）。読みの確認は `--voice-dump script`（エンジンの読みと直した読みを並べて出す）。
4. 決めた話者を `script.json` の `voice.speaker` に書き、いつも通り `render`。声なしにするときは `--no-voice`。
- アプリが起動していなければ、声なしで今まで通り書き出す（止まらない）。
- 読む文・タイミング・音の重ね方は `shorts/README.md`「ナレーション」。
- **調声**（10/21〜）: `shorts/voiceTuning.ts`。ユーザー辞書（`shorts/voice-dict.json`）を render のたびに登録（あれば上書き・別の PC でも同じ）。数字・機種名のアクセント句を規則でつなぎ直す／切る。うまく読めない文は `script.json` の `narrationKana`（AquesTalk 風の読み）で場面ごとに直す。経緯は ideas/2026-10-21.md
  - 長音（10/21〜）: 「ジュウ」「パア」「ソオ」の伸ばす母音のモーラを、合成の直前に 0.12 秒以上へ延ばす（`lengthenLongVowels`。短すぎて「じゅよん」「ぱせんと」と聞こえたため）。読みに「ー」を書くとエンジンが 400 を返すので使わない。`--voice-dump` に「長音」と「モーラ」（母音の長さ）が出る
- 口調は です・ます
- **クレジット**: 声を使った動画は、説明文に「VOICEVOX:キャラクター名」（既定は「VOICEVOX:春日部つむぎ」）を入れる。`youtube.txt` に自動で入る。
- **規約（要確認）**: VOICEVOX はキャラクター（話者）ごとに利用規約が別にある。ずんだもん・四国めたんはクレジット表記があれば商用利用できるとされるが、細かい条件は各キャラクターの規約で要確認。**話者を変えるときは、そのキャラクターの規約を読んでから使う。**
  - 春日部つむぎ（全テーマの標準の声・10/21〜）: 公式の規約（https://tsumugi-official.studio.site/rule ・10/21 確認）で、VOICEVOX の声は商用・非商用ともに利用可。条件はクレジット「VOICEVOX:春日部つむぎ」を動画内か概要欄などに書くこと（自動で入る）。禁止は誹謗中傷・第三者に不快感や権利侵害・特定の思想や団体に関わるもの・二次配布など。規約は予告なく変わるので、毎月1日の見直しで開き直す。
  - ずんだもん（rank の声・10/22〜）: 規約（https://zunko.jp/con_ongen_kiyaku.html ・10/22 確認）で商用・非商用ともに利用可。条件はクレジット「VOICEVOX:ずんだもん」を説明欄など見れば分かる所に書くこと（自動で入る）。禁止は公序良俗に反する利用・政治や宗教・特定の個人や団体の非難や応援・情報商材とその宣伝・意図的な虚偽や誤解を招く内容など。毎月1日の見直しで開き直す。
  - 青山龍星（newused・provs・fold の声・10/21〜）: 規約（https://www.virvoxproject.com/voicevoxの利用規約 ・10/21 確認）で、個人はクレジット「VOICEVOX:青山龍星」を書けば商用利用できる（自動で入る）。**法人が関わる利用は、事前に ななはぴ への確認が要る**。毎月1日の見直しで開き直す。
- 話者はテーマごとに変えられる（`shorts/make-short.tsx` の `THEME_SPEAKER`。drops・budget・pixelbudget・macbudget・probudget は 春日部つむぎ、newused・provs・promax・plusvs・minie・unused・fold・foldbudget・ipadbudget は 青山龍星、rank・oldpro は ずんだもん、plusmax は 春日部つむぎ）。名前で指定し、ID はエンジンから引く。

## 3パターンの比較

| | 長さ | 冒頭 |
|---|---|---|
| A 標準 | 29秒（声あり 46.5秒） | 「今週いちばん値下がりした中古iPhoneは…？」→ ランキング（3位・2位）→ 発表 → 30日グラフ → ひと言 |
| B 速い | 19秒（声あり 39.6秒） | 「−5,489円」を先に（機種は隠す）→ 速いランキング → 発表 → ひと言 |
| C グラフ先 | 24秒（声あり 41.3秒） | 機種名を隠したグラフ → ランキング → 発表 → ひと言 |

- 週ごとに A→B→C を回す。2巡（6週）で判断する。
- 同じ週に似た動画を並べない。「繰り返しコンテンツ」で収益化の対象外になるおそれがある。
- 比べる数字: YouTube Studio の「視聴を選んだ割合」（目安70%以上）と平均視聴率。サイトへの流入は GA の `utm_source=youtube` で見る。
- 記録は `ideas/youtube-shorts.md` に追記する。

## 決まっていること

- 1本ごとに、検品担当のひと言（人の判断）を入れる。完全自動の量産はしない。
- 画面の配置
  - 上 250px・下 440px は YouTube の表示で隠れる。ここには何も置かない。
  - 左右の余白は 80px。文字は中央そろえ。
  - 見出しの帯と白いカードを使う。地・帯の色と形・カードの縁・強調色・つかみはテーマごとに変える（10/22〜・`shorts/looks.ts`。表は shorts/README.md）。
  - 確かめるときは `npx tsx shorts/stills.tsx` の静止画の一覧（`shorts/out/looks-contact.png`）で見る。mp4 の書き出しは重いので、確かめのためには作らない。
- 太字は weight 900。フォントは画面の全文字（scenes.tsx の文字を含む）でサブセット化する。抜けると別のフォントで表示される。
- 素材
  - 楽天などの商品画像・Apple 公式画像は使わない（規約・著作権）。
  - 使ってよいのは、自分で描いた図・サイトの画面・ユーザーが撮った写真。

## 次にやること（順に）

1. 1本目（A）を投稿する。ひと言はユーザーと決める。
2. ユーザーが決めたら、追加の素材を入れる。
   - 1位の発表に、機種のシルエット（自分で描く）。
   - 締めに、サイトの機種ページのスクショ。
3. テーマを増やす（4週で一巡）: 予算別（budget・10/21 に追加）・2機種比較・検品担当の豆知識。`shorts/themes/` に足す。
4. BGM: ユーザーが YouTube オーディオライブラリから選んで置く。
   - VOICEVOX を入れたら、実際の声で1本書き出して、声の大きさ・効果音の下がり方・読み間違い（機種名）を聞いて確かめる。
5. 8週続けて、再生数・登録者・流入で続けるか決める。
