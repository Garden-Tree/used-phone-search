# YouTube ショート（shorts/）

サイトの相場と同じ数字から、縦 1080x1920・約40秒のショート動画（mp4）を作る。方針と根拠は `ideas/youtube-shorts.md`。

## コマンド

```
npx tsx shorts/make-short.tsx drops plan            # 台本 shorts/out/<日付>-drops/script.json を作る（あれば止まる。上書きは --force）
npx tsx shorts/make-short.tsx drops render          # 最新の台本から short-A/B/C.mp4 と youtube.txt を作る
npx tsx shorts/make-short.tsx drops plan --days 24  # 比べる期間を変える（7日以外は「この1か月」の言い方・フォルダ <日付>-drops-24d。render は --dir で。10/24〜）
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
npx tsx shorts/make-short.tsx ipadbudget plan       # 予算ぴったりで買える中古iPad（shorts/out/<日付>-ipadbudget/。型 A だけ）
npx tsx shorts/make-short.tsx ipadbudget render
npx tsx shorts/make-short.tsx promax plan           # Pro MaxとProの差のテーマ（shorts/out/<日付>-promax/。型 A だけ）
npx tsx shorts/make-short.tsx plusvs plan           # Plusと無印の差のテーマ（shorts/out/<日付>-plusvs/。型 A だけ・10/25〜）
npx tsx shorts/make-short.tsx minie plan            # 無印と弟分（mini・e）の差のテーマ（型 A だけ・10/26〜）
npx tsx shorts/make-short.tsx unused plan           # 未使用品（ランクS）とランクAの差のテーマ（型 A だけ・10/26〜）
npx tsx shorts/make-short.tsx plusmax plan          # PlusとPro Maxの差のテーマ（型 A だけ・10/26〜・つむぎ）
npx tsx shorts/make-short.tsx oldpro plan           # 1世代前のProと次の無印、どっちが安い？（型 A だけ・10/26〜・ずんだもん）
npx tsx shorts/make-short.tsx macbudget plan        # 予算ぴったりで買える中古MacBook（shorts/out/<日付>-macbudget/。型 A だけ）
npx tsx shorts/make-short.tsx probudget plan        # 予算ぴったりで買える中古iPhone Pro（shorts/out/<日付>-probudget/。型 A だけ）
npx tsx shorts/make-short.tsx foldbudget plan       # 予算ぴったりで買える中古折りたたみスマホ（shorts/out/<日付>-foldbudget/。型 A だけ）
npx tsx shorts/make-short.tsx rank plan             # 状態ランク A と C の差のテーマ（shorts/out/<日付>-rank/。型 A だけ）
npx tsx shorts/make-short.tsx rank render
npx tsx shorts/make-short.tsx ios27line plan        # iOS 27 に対応する、いちばん安い中古iPhone（shorts/out/<日付>-ios27line/。型 A だけ・10/25〜）
npx tsx shorts/make-short.tsx batteryswap plan      # 電池交換を足すと、1つ上の世代と同じ値段？（shorts/out/<日付>-batteryswap/。型 A だけ・10/25〜）
npx tsx shorts/make-short.tsx overnew plan          # 中古なのに新品より高い？新品との差がいちばん小さい中古iPhone（shorts/out/<日付>-overnew/。型 A だけ・10/25〜）
npx tsx shorts/make-short.tsx rakutenmobile plan    # 楽天モバイルは使った量で3段階｜中古iPhone 14と2年でいくら？（広告の回・PR。型 A だけ・10/26〜・つむぎ）
npx tsx shorts/make-short.tsx fold render --no-bgm  # BGM なし（声と効果音だけ）の short-A-nobgm.mp4 と youtube-nobgm.txt（BGM のクレジットなし）
npx tsx shorts/make-short.tsx fold render --tiktok  # TikTok 用の short-A-tiktok.mp4（BGM なし・締めは「used.gadelog.com で検索」）
npx tsx shorts/make-short.tsx drops render --dir shorts/out/2026-10-17-drops --keep-frames
npx tsx shorts/make-short.tsx drops render --no-voice  # VOICEVOX の声を入れない
npx tsx shorts/make-short.tsx --voice-test "今週いちばん値下がりした中古iPhoneは？"   # 声だけ試す（shorts/out/voice-test.wav）。--speaker 3 / --speaker ずんだもん/ノーマル・--speed 1.25
npx tsx shorts/stills.tsx [drops budget …]            # 動画を作らず、各テーマの最新の台本から つかみ・ランキング・1位の発表 の静止画（shorts/out/looks/）と一覧 shorts/out/looks-contact.png を作る
npx tsx shorts/stills.tsx --outro [plusmax …]          # 締めの最後のコマだけ（関連動画の札・横動画のサムネ）。shorts/out/looks/<テーマ>-outro.png と looks-contact-outro.png
npx tsx shorts/make-short.tsx --voice-dump script     # 最後に書いた台本の全ナレーションの読み（エンジンの読み → 直した読み）を出す。"テキスト" でも可。--speaker で話者を変えて試せる
```

テーマ（`shorts/themes/`）:

- `drops`: 今週いちばん値下がりした中古iPhone（型 A・B・C）
- `budget`: 予算ぴったりで買える中古iPhone（型 A だけ・約35秒）
- 声は drops・budget が 春日部つむぎ（ノーマル・1.25倍。10/21〜。1本目の drops だけ ずんだもん）、newused・provs・fold は 青山龍星（ノーマル・1.25倍。クレジット「VOICEVOX:青山龍星」）、pixelbudget は 春日部つむぎ、ipadbudget は 青山龍星、rank は ずんだもん（ノーマル・1.25倍・口調は です・ます。クレジット「VOICEVOX:ずんだもん」）、promax は 青山龍星、macbudget は 春日部つむぎ、probudget は 春日部つむぎ（10/24〜）、foldbudget は 青山龍星（10/24〜）、plusvs は 青山龍星（10/25〜）、minie・unused は 青山龍星（10/26〜）
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

- `promax`: Pro MaxとPro、同じ容量でいくら違う？（型 A だけ・約35秒。10/23〜）
  - `themes/promax.ts`（provs を写したもの）。台本の型は provs と同じ ProVsScript で theme が "promax"（base＝Pro・pro＝Pro Max。`types.ts` の `isProVs`）。場面・行の部品も provs と共有（棒の札・注記・つかみの札だけ「Pro／Pro Max」に）
  - 組は iPhone 13〜18 の Pro と Pro Max。容量は両方に在庫5件以上の最小の容量、差（Pro Max − Pro）の大きい順、率は Pro に対して。1位の Pro を1つ上の容量にしたときの差（`scenes.upgrade`）も出す
  - ナレーション: ranking「3位は<Pro>と<番号 Pro Max>、<容量>。差は<額>です。」・reveal「1位は<Pro>と<番号 Pro Max>。Pro Maxにすると、約<X.X>万円、およそ<Y>%高くなります。」・outro「…あなたは、Pro Max派？Pro派？」＋関連動画の誘導。utm の末尾 `_promax`

- `plusvs`: Plusと無印、同じ容量でいくら違う？（型 A だけ・約36秒。10/25〜）
  - `themes/plusvs.ts`（provs を写したもの）。台本の型は ProVsScript で theme が "plusvs"（base＝無印・pro＝Plus）。場面・行の部品も provs と共有（棒の札・つかみの札だけ「無印／Plus」に）
  - 組は iPhone 14／14 Plus・15／15 Plus・16／16 Plus（17 に Plus はない）。容量は両方に在庫5件以上の最小の容量、差（Plus − 無印）の大きい順、率は無印に対して。Plus の方が安い（差0以下）組は外して plan のログに「★注意」で出す。3組未満なら止まる
  - ナレーション: ranking「3位は<無印>と<番号 Plus>、<容量>。差は<額>です。」・reveal「1位は<無印>と<番号 Plus>。Plusにすると、約<X.X>万円、およそ<Y>%高くなります。」・outro「…あなたは、大きい画面のPlus派？無印派？」＋関連動画の誘導。説明欄のリンクは1位の Plus の機種ページと /iphone。utm の末尾 `_plusvs`

- `minie`: 無印より安い“弟分”、いくら安い？（型 A だけ・約34秒。10/26〜）
  - `themes/minie.ts`（plusvs を写したもの）。台本の型は MinieScript で、行は FoldRow（newer＝無印・older＝弟分）。行と1位の部品は fold・gen と共有（機種名だけ弟分を先に「iPhone 17e／17」）
  - 組は iPhone 12／12 mini・13／13 mini・16／16e・17／17e。容量は両方に在庫5件以上の最小の容量、差（無印 − 弟分）の大きい順、率は無印に対して。弟分の方が高い（差0以下）組は外して plan のログに「★注意」。3組未満なら止まる
  - ナレーション: ranking「3位は<弟分>と<番号>、<容量>。差は<額>です。」・reveal「1位は<弟分>と<番号>。弟分にすると、約<X.X>万円、およそ<Y>%安くなります。」・outro「…あなたは、安い弟分派？無印派？」（3組がすべて mini なら「小さい・安い弟分派？」）＋関連動画の誘導。説明欄のリンクは1位の弟分の機種ページと /iphone。utm の末尾 `_minie`

- `plusmax`: 大画面はPlusとPro Max、同じ容量でいくら違う？（型 A だけ・約37秒。10/26〜・春日部つむぎ）
  - `themes/plusmax.ts`（plusvs を写したもの。ProVsScript で base＝Plus・pro＝Pro Max）。組は 14・15・16 の Plus／Pro Max。容量は両方に在庫20件以上の最小の容量、差（Pro Max − Plus）の大きい順、率は Plus に対して。差0以下は外して「★注意」
  - ナレーション: reveal「1位は<Plus>と<番号 Pro Max>。Pro Maxにすると、約<X.X>万円、およそ<Y>%高くなります。」・outro「…あなたは、Plus派？Pro Max派？」。utm の末尾 `_plusmax`。見た目 ③ VERSUS

- `oldpro`: 1世代前のProと最新の無印、どっちが安い？（型 A だけ・約40秒。10/26〜・ずんだもん・です・ます）
  - `themes/oldpro.ts`。台本の型は OldProScript（行は OldProRow。older＝1世代前の Pro・newer＝次の世代の無印・diff＝無印 − Pro の向きつき）。組は 13 Pro／14・14 Pro／15・15 Pro／16・16 Pro／17。容量は両方に在庫20件以上の最小の容量。差の大きさの大きい順で、Pro の方が高い組も落とさず「○○が安い」を出す。率は高い方に対して
  - ひと言は1位の組のチップ・端子（lib/iphoneSpecs.ts）が同じか違うかだけ。ナレーション: ranking「3位は<Pro>と<番号>、<容量>。<安い方>が<額>安いです。」・reveal「…<安い方>が、約<X.X>万円、およそ<Y>%安くなります。」。utm の末尾 `_oldpro`（リンクは1位の安い方）。見た目 ⑤ PRO
- plusmax・oldpro は**声の実験**（10/26）: 伸びた比べる型を 青山龍星 以外の声（つむぎ・ずんだもん）で出す

- `unused`: 未使用品（ランクS）は、中古（ランクA）よりいくら高い？（型 A だけ・約34秒。10/26〜）
  - `themes/unused.ts`（rank を写したもの）。iPhone 13〜17 の無印と Pro で、在庫がいちばん多い容量のランクS（未使用品）と A の相場（中央値）を比べ、差（S − A）の大きい順。率は A に対して。S・A どちらかの在庫が20件未満の機種は出さない（10/26: 5件だと iPhone 13 のランクS 6件・2店で1位になった）。S の方が安い（差0以下）機種は外して「★注意」。3機種未満なら止まる
  - 場面は battery と同じ形（1位は ランクA・未使用品 の2本の棒）。注記「ランクは各店の表記（S＝未使用品）・同じ容量の中央値」
  - ナレーション: ranking「3位は<機種>、<容量>。ランクAより、未使用品が<額>高いです。」・reveal「1位は<機種>。未使用品にすると、約<X.X>万円、およそ<Y>%高くなります。」・outro「…あなたは、未使用品派？中古のランクA派？」＋関連動画の誘導。utm の末尾 `_unused`

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
- `ipadbudget`: 予算ぴったりで買える中古iPad（型 A だけ。10/23〜）
  - budget と同じ選び方・同じ場面（`pickBudgetModels` を共有・台本の型は BudgetScript で theme が "ipadbudget"）。対象は `lib/ipadCatalog.ts` の iPad のうち **iPadOS 27 対応の機種**（`lib/ipadSpecs.ts` の IPADOS27_MODELS・Apple 公式）。同じ相場なら発売年の新しい方
  - **予算は 5万・7万・10万・15万円**（`IPAD_SHORT_BUDGETS`）。相場3万円以下の iPad は 10/23 時点ですべて iPadOS 27 非対応で、3万円の行が作れないため。注目は budget と同じ5万円の行
  - この回の切り口: 各行と注目に使える Apple Pencil（`pencil`。`lib/ipadPencil.ts`・Apple 公式の互換性。「Pencil USB-C／第1世代」）。注目のナレーションは在庫数を読む。下の注記に「PencilはApple公式」
  - 説明欄のリンクは注目の機種ページ・/ipad/budget/under-50000・/ipad。utm の campaign の末尾は `_ipadbudget`。ハッシュタグ #iPad #中古iPad。第10世代・A16 は「第1世代はUSB-Cアダプタが必要」を添える
  - 読み: 機種名の括弧のチップ名は読点に（「iPad Pro 11インチ (M4)」→「…11インチ、M4」。voice.ts の spokenModel）。「(第9世代)」は speakable が括弧を外す

- `macbudget`: 予算ぴったりで買える中古MacBook（型 A だけ・約45秒。10/23〜）
  - budget と同じ選び方・同じ場面（`pickBudgetModels` を共有・台本の型は BudgetScript で theme が "macbudget"）。対象は `lib/macCatalog.ts` の MAC_MODELS（在庫5件以上）。同じ相場なら発売年の新しい方
  - **予算は 10万・15万・20万・30万円**（`MAC_SHORT_BUDGETS`）。10/23 は在庫5件以上の最安が MacBook Air M1 の相場 81,980円で、5万・7万円の帯が空になるため。帯ごとの候補は 2・4・8・7機種（plan が毎回出す）。注目は15万円の行（`MAC_PICK_BUDGET`・4つの予算の2番目）
  - この回の切り口: 各行にチップと発売年（`chip`。`MAC_INFO`。「M3チップ・2024年発売」）、つかみの札と注目にチップ。注目のナレーションは在庫数を読む
  - 説明欄のリンクは注目の機種ページ・/mac。utm の末尾は `_macbudget`。ハッシュタグ #MacBook #中古MacBook。関連動画の締めは付けない
  - 読み: 「MacBook Air 13インチ」は型名と数字がくっつく（「エ'アアジュウ/サンイ'ンチ」）ので、`voiceTuning.ts` の 2b で切り離して「ジュウサンインチ」をつなぐ。「相場14万」の「ソオバジュウ」も同じ

- `probudget`: 予算ぴったりで買える中古iPhone Pro（型 A だけ・約46秒。10/24〜）
  - budget と同じ選び方・同じ場面（`pickBudgetModels` を共有・台本の型は BudgetScript で theme が "probudget"）。対象は iPhone 13 Pro 以降の Pro・Pro Max（`themes/probudget.ts` の PRO_MODELS・在庫5件以上）。同じ相場なら発売年の新しい方
  - **予算は 7万・10万・15万・20万円**（`PRO_SHORT_BUDGETS`）。10/24 は在庫5件以上の Pro の最安が iPhone 13 Pro の相場 65,980円で、5万円の帯が空になるため。帯ごとの候補は 1・2・3・3機種（plan が毎回、帯ごとの機種と相場を出す）。注目は10万円の行（`PRO_PICK_BUDGET`・4つの予算の2番目）
  - この回の切り口: 各行と注目に画面の大きさと端子（`spec`。「6.1インチ・Lightning」。`lib/iphoneSpecs.ts`・Apple 公式）と発売年。14 Pro までは Lightning・15 Pro から USB-C。注目のナレーションは在庫数を読む。下の注記に「画面と端子はApple公式」
  - ひと言の下書きは、注目が Lightning なら「14 Proまでは／Lightning端子／15 ProからUSB-Cです」（声は narration.comment に「ユーエスビーシー」と書く）、USB-C なら「Proでも中古は／バッテリー85%以上を／選びましょう」
  - 説明欄のリンクは注目の機種ページ・/iphone/where-to-buy・トップ。utm の末尾は `_probudget`。ハッシュタグ #中古iPhone #iPhonePro。関連動画の締めあり（RELATED_LONG_THEMES）
  - 見た目は5つ目の型 PRO（墨 ink の地・淡い金 inspectLine の丸い端の帯に墨の文字・金の縁のカード・琥珀 inspect700 の予算の札）。予算別だが、Pro の回だと1コマ目で分かるように BUDGET と分けた
  - 読み: つかみの「中古iPhone Proは」が1つの句（「チュウコアイフォン'プロワ」）になるので、10/24 は narrationKana.hook で「チュ'ウコ/アイフォ'ン/プ'ロワ？」に切った
- `foldbudget`: 予算ぴったりで買える中古折りたたみスマホ（型 A だけ。10/24〜）
  - budget と同じ選び方・同じ場面（`pickBudgetModels` を共有・台本の型は BudgetScript で theme が "foldbudget"）。対象は Galaxy Z Fold・Z Flip と Pixel の Fold（`themes/foldbudget.ts` の FOLD_MODELS・在庫5件以上・Pixel はアップデート保証が終わった機種を除く）。同じ相場なら発売の新しい方
  - **予算は 5万・10万・15万・20万円**（`FOLD_SHORT_BUDGETS`）。10/24 は帯ごとの候補が 2・4・3・3機種（plan が毎回、帯ごとの機種・相場・件数を出す）。注目は10万円の行（`FOLD_PICK_BUDGET`・4つの予算の2番目）
  - この回の切り口: 各行と注目に型と開いたときの画面（`spec`。「Fold型・開いて7.6インチ」。型は機種名、画面は `lib/galaxySpecs.ts`・`lib/pixelSpecs.ts` の displayInner）と発売年月。注目のナレーションは在庫数を読む。下の注記に「画面は公式の仕様」
  - ひと言の下書きは「折りたたみの中古は／折り目とヒンジを／確認しましょう」（fold と同じく折りたたみならではの確認）
  - 説明欄のリンクは注目の機種ページ・/galaxy・/pixel。utm の末尾は `_foldbudget`。ハッシュタグ #折りたたみスマホ #Galaxy。関連動画の締めはなし（RELATED_LONG_THEMES に入れない）
  - 見た目は fold と同じ VERSUS（見た目の型は5つまで。10/23 ユーザーの指示）。つかみは予算の札（chips）。声は 青山龍星
- `galaxybudget`: 予算ぴったりで買える中古Galaxy（型 A だけ。10/25〜）
  - budget と同じ選び方・同じ場面（`pickBudgetModels` を共有・BudgetScript で theme が "galaxybudget"）。対象は Galaxy のうち Z Fold・Z Flip を除く S・A シリーズ（`themes/galaxybudget.ts` の GALAXY_BAR_MODELS・在庫5件以上）。同じ相場なら発売の新しい方
  - **予算は 3万・4万・7万・9万円**（`GALAXY_SHORT_BUDGETS`。相場に近い額でぴったりに見せる・10/24 ユーザーの指示）。注目は4万円の行（`GALAXY_PICK_BUDGET`）
  - 切り口: 各行と注目に画面の大きさ（`spec`「画面6.1インチ」。`lib/galaxySpecs.ts` の display）と発売年月。ひと言の下書きは「キャリア版は／使う回線に対応か／確認しましょう」
  - 説明欄のリンクは注目の機種ページ・/galaxy。utm の末尾は `_galaxybudget`。ハッシュタグ #Galaxy #中古スマホ。関連動画の締めはなし
  - 見た目は DROPS（紺・赤い帯。5つの型から、直前の予算別と1コマ目が続けて同じにならないもの）。つかみは予算の札（chips）。声は 青山龍星。読みは「5G」→ファイブジー・「Ultra」→ウルトラ（`voice.ts` の speakable）

- `rank`: 状態ランクでいくら違う？中古iPhone（型 A だけ・約39秒。10/22〜）
  - iPhone 13〜16 の無印と Pro（`themes/rank.ts` の MODELS）で、在庫がいちばん多い容量のランク A・B・C（各店の表記を大文字にそろえる。S＝未使用品・D・ジャンク・不明は除く）の相場（中央値）を比べ、A − C の差額の大きい順。率は A の相場に対して。A・B・C のどれかが在庫5件未満の機種と、差が0以下の機種は出さない。3機種未満なら止まる
  - 場面 hook → ranking（3位・2位・伏せた1位。下段は容量・−差額・−率）→ reveal（ランク A・B・C の3本の棒と件数・A→C の差額と率）→ comment → outro（「あなたならランクA？C？」）。下の注記は「ランクは各店の表記・同じ容量の中央値」
  - ナレーション: ranking「3位は<機種>、<容量>。ランクAより、ランクCが<額>安いです。」・reveal「1位は<機種>。ランクCにすると、約<X.X>万円、およそ<Y>%安くなります。」（容量は画面だけ。読むと40秒を超えた）
  - 読み: 「ランクAとC」は「ラ'ンク/エ'イ/ト'/シ'イ」と1字ずつ切れるので、「ランクA」「ランクC」と書き、`voiceTuning.ts` の 6 で「ランク＋記号」と続く助詞を1つの句にする
  - ひと言の下書き「ランクの差は主に／外装の傷なので／電池は別に見ましょう」（サイトの説明「状態ランクは外装の傷の話」と同じ）。ランクの基準は店ごとに違い、ランクごとに店の顔ぶれも違う（説明欄に書く）
  - 説明欄のリンクは1位の機種ページ（ランク別の最安値の表がある）。utm の campaign の末尾は `_rank`

- `ios27line`: iOS 27 に対応する、いちばん安い中古iPhoneは？（型 A だけ・約38秒。10/25〜・ずんだもん）
  - 対象は iOS 27 対応の iPhone（`lib/catalog.ts` の IPHONE_CATALOG＝iPhone 11 以降と SE 第2世代以降。Apple 公式 https://www.apple.com/jp/ios/）。相場は getModelMarket と同じ「在庫がいちばん多い容量の中央値」（primaryMedian・その容量の在庫5件以上）。**相場の安い順**に3位・2位・1位（同じなら発売の新しい方）
  - 1位には、同じ容量で在庫5件以上の **iOS 27 非対応（LEGACY_SERIES）で発売がいちばん新しい機種**（同じ年なら安い方）との差（`scenes.legacy`）を添える。10/25 は SE (第2世代) 64GB 20,680円 vs XR 64GB 19,580円（差1,100円）
  - 場面 hook（スマホの形に「iOS 27」「対応」の札＋最安の相場）→ ranking（下段は容量・相場・発売年）→ reveal（1位の相場（大）と、対応・非対応の2本の棒・差）→ comment → outro
  - ナレーション: ranking「3位は<機種>、<容量>。相場<額>です。」・reveal「1位は<機種>。相場<額>。iOS 27非対応の<機種>との差は、<額>です。」（容量は画面だけ）。読み: iOS→アイオーエス・XR→テンアール・XS→テンエス・X→テン（`voice.ts` の speakable）
  - ひと言の下書き「OSの対応が／終わる前に／買い替えも計画を」。見出しの帯「iOS 27対応で／いちばん安い中古iPhone」・注記「iOS 27対応はApple公式」。utm の末尾 `_ios27line`・#中古iPhone #iPhone #iOS27。関連動画の締めあり
- `batteryswap`: 電池交換を足すと、1つ上の世代と同じ値段？（型 A だけ・約39秒。10/25〜・ずんだもん）
  - 組は古い方 → 1つ上の世代（`themes/batteryswap.ts` の PAIRS。無印 11→12〜16→17・12 mini→13 mini・Plus・Pro・Pro Max（〜18）・16e→17e・SE 第2→第3世代）。古い方に Apple 公式の電池交換の料金（`lib/appleRepairPrices.ts`）がある組だけ
  - 容量は gen と同じ（両方に在庫5件以上のいちばん小さい容量）。合計＝古い方の相場＋電池交換、差＝1つ上の相場−合計。**差の絶対値の小さい順**（「ほぼ同じ値段」が1位）。差が負なら1つ上の世代の方が安い
  - 場面 hook（「中古 ＋ 電池交換 ＝ 1つ上」の札3つ＋最小の差）→ ranking（行は「iPhone 13／14」、下段は容量・差・「1つ上が高い／安い」）→ reveal（古い方の相場と電池交換の積み上げの棒・1つ上の棒・差）→ comment → outro
  - ナレーション: ranking「3位は<古い方>と<1つ上の番号>、<容量>。差は<額>です。」・reveal「1位は<古い方>。電池交換を足すと、<合計>。<1つ上>の方が、<額>安いです。」（1つ上が高いなら「<1つ上>との差は、<額>だけです。」）。読み: 「1つ上」は「ヒトツジョウ」と読まれるので READING_FIXES で「ひとつうえ」
  - ひと言の下書きは、1つ上の方が安いなら「電池交換するより／1つ上の世代が／安く買えます」、ほかは「差がこれだけなら／1つ上の世代も／検討しましょう」。見出しの帯「電池交換を足すと／1つ上の世代と同じ値段？」・注記「電池交換はApple公式」。説明欄のリンクは両方の機種ページ。utm の末尾 `_batteryswap`・#中古iPhone #iPhone #電池交換。関連動画の締めあり
- `overnew`: 中古なのに新品より高い？新品との差がいちばん小さい中古iPhone（型 A だけ・約38秒。10/25〜・ずんだもん）
  - newused の裏返し。対象・容量の決め方は newused と同じ（Apple 公式の新品価格がある iPhone・公式価格のある容量で在庫がいちばん多い容量・在庫5件以上）。**中古の相場÷新品の高い順**。中古が新品以上の機種も入れる（1位なら「新品より +○円」）
  - 場面 hook（新品 100% と中古の割合の2本の棒＋「新品より +○円」か「新品の○%」）→ ranking（下段は容量・新品の○%・差）→ reveal（新品と中古の相場の2本の棒・高い方を幅いっぱい）→ comment → outro
  - ナレーション: ranking「3位は<機種>、<容量>。新品のおよそ<率>%です。」（中古が新品以上なら「新品より<額>高いです。」）・reveal「1位は<機種>、<容量>。中古の相場が、新品より<額>高くなっています。」
  - 公式価格のある機種は6つ（`lib/applePrices.ts`）なので、並びは newused と裏返しになりやすい。10/25 は 18 Pro・18 Pro Max・17e で、newused（Air・16・17）とは重ならなかった。18 Pro Max は在庫5件ちょうど
  - ひと言の下書きは、中古が新品以上なら「発売直後の中古は／新品の値段と／比べてから買いましょう」、ほかは「差が小さいなら／保証のある新品も／考えましょう」。utm の末尾 `_overnew`。関連動画の締めあり

`--no-bgm`（どのテーマでも）: BGM を入れずに書き出す（声と効果音だけ。声のコンプレッサー・効果音の下げ方・-11 LUFS の2パスは同じ）。出力は `short-<型>-nobgm.mp4` と `youtube-nobgm.txt`（BGM のクレジットなし）で、BGM 入りの版は上書きしない。YouTube のスマホアプリで投稿し、「音源を追加」で流行りの曲を付けるとき用（曲の音量はアプリで下げる）。

`--tiktok`（TikTok 用・10/27〜）: `--no-bgm` と同じ音で、締めだけ変えた `short-<型>-tiktok.mp4`（と `youtube-nobgm.txt`）。TikTok はプロフィールのリンクがフォロワー1,000人からで、関連動画もないため（`voice.ts` の `forTikTok`）:
  - 画面: 「プロフィールのリンクから」の行を外し、「全機種の相場は／used.gadelog.com（大きいまま）／で検索」。関連動画のサムネ・「▼ 下の関連動画から ▼」の札は出さない。問いの行はそのまま
  - 声: 「プロフィールのリンクから見られます」→「used.gadelog.com で見られます」（読みは「ユーズド・ガデログ・ドットコム」。`speakable` と `voice-dict.json` のガデログ）。「くわしい解説は、下の関連動画からどうぞ。」は外す。テーマごとの問いの文はそのまま
  - `tiktok-caption.ts` は `short-A-tiktok.mp4` があるかを見る（なければ書き出しのコマンドを出す）。運用は `.claude/skills/tiktok-ops/SKILL.md`

テーマを足すときは、`types.ts` に台本の型、`themes/` に「データ → 台本」、`voice.ts` に既定のナレーション、`scenes.tsx` に場面、`make-short.tsx` の `THEMES`・`THEME_SPEAKER` を足す。
同じテーマ・同じデータのショートを同じ日に2本出さない（ほぼ同じ内容は勧められにくい）。

## 予算を変える・前の回と同じ中身にしない（10/25〜）

- ランキング型（provs・plusvs・plusmax・oldpro・minie・unused・battery・rank・gen・storage・newused・fold・ios27line・batteryswap・overnew）は数日では1位が変わらない（10/25 に作り直すと 10/22〜23 とほぼ同じだった）。plan の1位とタイトルを前の回と比べ、ほぼ同じなら作らない
- **予算と相場は1万円以内**（10/25 ユーザーの指示）: 各行は帯 (max(前の予算, 予算−1万円), 予算] の機種だけ。帯に機種がなければ plan がエラーになるので予算を変える（`themes/budget.ts` の BUDGET_GAP）
- 予算別（budget・ipadbudget・pixelbudget・foldbudget）は `--budgets 40000,60000,80000,120000 --pick 40000` で予算の並びと注目を変えられる（`themes/budget.ts` の BudgetOpts）。注目の予算は予算別ページ（`lib/budgets.ts`）がある額にする（説明欄のリンク先）
- 声の実験は script.json の `voice.speaker` を書き換えて render する
- 出だしの実験（答えから始める）は script.json に `hookStyle: "answer"`・`hookLines`（つかみの大きな文字・問いの代わり）・`narration.hook`（答えの文）をそろえて書く。`hookLines` は SplitHook（provs・promax・plusvs・plusmax・minie・oldpro・unused・gen・storage・newused・ipadmini）と BudgetHook（budget・pixelbudget・macbudget・probudget・foldbudget・galaxybudget・bigbudget）のテーマで効く（10/27〜）
- plan のフォルダは `<作った日>-<テーマ>` なので、同じテーマを別の予算で何本も作るときは、plan のたびにフォルダを公開日の名前に移し（例 `2026-10-29-budget`）、説明欄の utm の日付も公開日に直す。render は `--dir` でフォルダを指定する（指定しないと名前がいちばん後のフォルダを使う）

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
- 話者は `script.json` の `voice`: `{ "speaker": "春日部つむぎ/ノーマル", "speedScale": 1.25 }`。plan がテーマごとに書く（いまは全テーマ 春日部つむぎ。`make-short.tsx` の `THEME_SPEAKER`）。ほかに `intonationScale`（抑揚）・`pitchScale`（音高）・`pauseLengthScale`（読点の間）も書ける（抑揚・音高は書かなければエンジンの既定。読点の間は書かなければ 0.5＝エンジンの半分。10/24〜）。speaker は ID か名前（`"春日部つむぎ/ノーマル"`・`"ずんだもん/ノーマル"`・`3`）。既定は 春日部つむぎ（ノーマル・標準の VOICEVOX で ID 8）
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
  - 数字の切り離し（10/23〜・`voiceTuning.ts` の 2b・TUNING_VERSION 7）: 型名（Air・Pro など）・「相場」・「ショップ」の後ろにくっついた数字を切り、後ろの数字とつなぐ（「エ'アアジュウ/サンイ'ンチ」→「エ'アア/ジュウサンイ'ンチ」・「ソオバジュウ'/ヨンマ'ン」→「ソオバ'/ジュウヨンマ'ン」・「チュウコショ'ップジュウ/ロク'テン」→「…ショ'ップ/ジュウロク'テン」）。「iPadOS」の「オオエ'/ス'」は1つの句に（「オオエス'」）
  - 長音（10/21〜）: 「ジュウ」「パア」「ソオ」の伸ばす母音のモーラを、合成の直前に 0.12 秒以上へ延ばす（`lengthenLongVowels`。短すぎて「じゅよん」「ぱせんと」と聞こえたため）。読みに「ー」を書くとエンジンが 400 を返すので使わない。`--voice-dump` に「長音」と「モーラ」（母音の長さ）が出る
- 声があるときは、いったん無圧縮で混ぜて loudnorm の2パスで -11 LUFS にそろえる（1パスだと -15.5 ほどで止まる）
- 合成した WAV は `shorts/out/voice-cache/`（文・読みの手直し・話者・調声の設定・規則の版・辞書のハッシュ）。同じ文はアプリなしでも使い回す
- **声を使ったら `youtube.txt` の説明文の最後に「VOICEVOX:春日部つむぎ」（話者のキャラクター名）が自動で入る**。消さない。キャラクターごとに利用規約が違う（docs/youtube-shorts.md）

## BGM

YouTube オーディオライブラリで曲を選んでダウンロードし、`shorts/assets/bgm.mp3` に置く（Git には入らない）。なければ無音の音声トラックが付く。
曲名は `shorts/assets/bgm.json`（`title`・`artist`・`source`。Git に入る）に書く。bgm.mp3 があれば、render が説明文に「BGM: 曲名 - アーティスト（入手元）」を入れる。曲を替えたら JSON も直す。音量は 4% で一定、最後の3秒で小さくする。

## テーマごとの見た目（`looks.ts`）

中身の型ごとに地・見出しの帯・カード・強調色を変え、テーマごとにつかみ（1コマ目）を変える（10/22〜・10/23 に5つへ。テンプレートの一括加工と見られないように・1コマ目でスワイプされないように）。色は `lib/brandColors.ts` だけ、文字のコントラストは 4.5 以上（比は looks.ts の頭）。場面の長さ・声・音・順位の札の色は全テーマ同じ。

**見た目は5つ**（10/23 ユーザーの指示「多くても5種類」。`LOOKS`）。テーマごとに変えるのは**つかみ（1コマ目）だけ**。
- `bigbudget`: 予算ぴったりで買える 大きい画面の中古iPhone（型 A だけ。10/26〜）
  - budget と同じ選び方・同じ場面（`pickBudgetModels` を共有・BudgetScript で theme が "bigbudget"）。対象は画面6.5インチ以上の iPhone（`themes/bigbudget.ts` の BIG_MODELS＝`lib/iphoneSpecs.ts` の display。11 Pro Max・Pro Max・Plus・Air。iOS 27 非対応の XS Max は除く・在庫5件以上）
  - **予算は 5万・8万・11万・15万円**（`BIG_SHORT_BUDGETS`）。注目は8万円の行（`BIG_PICK_BUDGET`）。plan が帯ごとの候補を出す
  - 切り口: 各行と注目に画面の大きさ（`spec`「画面6.7インチ」・Apple 公式）と発売年。見出しの帯「予算ぴったりで買える／大きい画面の中古iPhone」・注記「画面はApple公式」。ひと言の下書きは「大きい画面は／画面の修理代が／高めです」（Apple の保証外の画面修理 Plus・Air 57,800円・Pro Max 64,800円＞無印。`lib/appleRepairPrices.ts`。ひと言に数字は出さない）
  - 説明欄のリンクは注目の機種ページ・/iphone。utm の末尾は `_bigbudget`。ハッシュタグ #中古iPhone #iPhone。関連動画の締めあり（RELATED_LONG_THEMES）
  - 見た目は ② BUDGET（直前の plusmax ③・oldpro ⑤ と続かない）。つかみは予算の札（chips）。声は 春日部つむぎ
- `rakutenmobile`: 楽天モバイルは使った量で3段階｜中古iPhone 14と2年でいくら？（**広告の回・楽天アフィリエイト**。型 A だけ。10/26〜）
  - 横動画11本目（`longform/2026-10-31-rakuten-mobile`）の案2（`shorts-ideas.md`）。場面は hook（題「楽天モバイルの料金は／使った量で3段階」・料金の階段・「2年で差」）→ ranking（料金の3段を声に合わせて上から）→ reveal（中古 iPhone 14 128GB の相場＋月額×24 の3本の棒・上と下の段の差）→ comment → outro
  - 数字: 料金は Rakuten最強プラン（税込・割引なし）3GBまで 1,078円・20GBまで 2,178円・無制限 3,278円（`themes/rakutenmobile.ts` の TIERS。確かめた日は `lib/simPlans.ts` の SIM_PRICES_CHECKED。3GBまでが SIM_PLANS の monthlyFrom と違えば plan が止まる）。端末は iPhone 14 128GB・ジャンクを除く中央値（DB の groupBy と中央値の1行だけ）。2年＝相場＋月額×24（ずっと同じ段）、差＝上の段 − 下の段の2年
  - **PR の表示**: 声では読まない（ユーザー 10/26）・画面の左上に小さく「PR」（全場面。`scenes.tsx` の PrMark）・説明欄の1行目「【PR】この動画は楽天アフィリエイトの広告を含みます。」・タイトルの頭に【PR】
  - **言わない・書かないこと**: ポイント・キャンペーン・特典／「最安」「実質0円」「必ず安い」「無料」「お得」／ほかの会社の料金／すぐの解約・乗り換えの促し。**楽天モバイルのリンクはショートの説明欄・コメントに貼らない**（横動画の説明欄だけ）。説明欄のリンクは iPhone 14 の機種ページとトップだけ（utm の末尾 `_rakutenmobile`）。ハッシュタグ #中古iPhone #iPhone #楽天モバイル
  - 見た目は ⑥ 広告の回 AD（5つの例外。明るい地・塗らない見出しにピンク #D9005B の下線・ピンクの札と強調。つかみは料金の階段 tiers）。声は 春日部つむぎ（口調は「〜よ・〜ね」）。ひと言の下書き「まず iPhoneの設定の／モバイル通信で／今の使った量を見てね」
  - 関連動画の締めは、横動画11本目を公開して ID が分かるまで付けない（`relatedLong.ts` の RAKUTEN_MOBILE は ID が空・`types.ts` の RELATED_LONG_THEMES にまだ入れない）

**続けて公開するショートは、前の回と違う見た目（①〜⑤）にする**（10/24 15:00 の値下がり1か月 → 10/25 8:00 の galaxybudget が同じ①で続いた）。

| 見た目 | 地 | 見出しの帯 | カード | 強調 | 使うテーマ（つかみ） |
| --- | --- | --- | --- | --- | --- |
| ① 値下がり DROPS | 紺 brand900 | 赤 price・左右いっぱい | 角丸28・縁なし | price | drops（1位の下がった額）・galaxybudget（予算の札） |
| ② 予算別 BUDGET | 明るい ground | 藍 brand600・角丸の箱 | 灰の縁＋影 | price（札は brand600） | budget・pixelbudget・macbudget・bigbudget（予算の札）・ipadbudget（予算の丸い札・淡い金）・overnew（新品と中古の割合の2本の棒）・minie（「無印 vs mini・e」。右の札は price） |
| ③ 比べる VERSUS | 紺 brand900 | 藍の札・左寄せ・左に緑の線 | 左に緑の線 | safe | newused・provs・promax・plusvs・plusmax・gen・storage（「A vs B」＋最大の差額）・fold（開いた折りたたみの形）・foldbudget（予算の札）・ios27line（スマホの形に「iOS 27 対応」） |
| ④ 状態の差 CONDITION | 生成り inspect50 | 墨 ink・角丸の箱 | 琥珀の線の縁＋影 | price | rank（A・B・C の札）・battery（縦の電池の形）・batteryswap（「中古＋電池交換＝1つ上」の札）・unused（「ランクA vs 未使用品」） |
| ⑤ Pro の予算別 PRO | 墨 ink | 淡い金 inspectLine・丸い端（墨の文字） | 金の縁 | price（札は inspect700） | probudget（予算の札）・oldpro（「前のPro vs 無印」＋差 最大） |
| ⑥ 広告の回 AD（5つの例外・10/26〜） | 明るい ground | 塗らない（墨の文字）・ピンク #D9005B の下線 | 灰の縁＋影 | ピンク #D9005B（札も） | rakutenmobile（料金の3段の階段＋2年で差）。左上に「PR」 |

関連動画につながるテーマ（`types.ts` の RELATED_LONG_THEMES）は、締めの「▼ くわしい解説は 下の関連動画で」の札が出るまで締めの動きを延ばす（`scenes.tsx` の TIMELINE。10/23 まで札が動画に出ていなかった）。

締めの横動画のサムネ（10/26〜）: 関連動画につながるテーマは、締めで声の「くわしい解説は、下の関連動画からどうぞ」に合わせて、札「くわしい解説はこちら」・横動画のサムネ（幅780px・16:9）・「▼ 下の関連動画から ▼」を出す。上の文字は小さくして詰める（y270〜1470）。

- テーマ → 横動画（ID・題・`longform/<フォルダ>`）は `shorts/relatedLong.ts` の RELATED_LONG だけに書く。YouTube Studio の「関連動画」もこの表と同じにする。
  - provs・promax・probudget・plusvs・minie・plusmax → Proと無印（Bmp5EgeiqW0）／budget・drops・newused・overnew → いま買うならどれ（R1Aki2b5mds）／battery・batteryswap・storage・rank・unused → 買ってはいけない（amx5UxG6wpI）／gen・ios27line・oldpro → 何世代まで（T7ltgSB-4XM）／bigbudget → 大きい画面（2026-10-28-big-screen・ID は公開後）／rakutenmobile → 楽天モバイル（2026-10-31-rakuten-mobile・ID は公開後。それまで RELATED_LONG_THEMES に入れない）／ipadbudget → iPad どれ（SHyQRQ8wAic。声の誘導がないので札は出ない）
- サムネは `longform/<フォルダ>/thumbnail.png`（Git に入らない）を幅720px の JPEG にして埋め込む。ファイルがなければ文字の札だけ。
- 出る時刻は声の「くわしい解説は…」の始まりの目安（読みのモーラ数の割合・`relatedLineStart`）。声がなければ 2.2k 秒。
- 確かめ方: `npx tsx shorts/stills.tsx --outro plusmax bigbudget`（`shorts/out/looks/<テーマ>-outro.png`・一覧 `shorts/out/looks-contact-outro.png`）。

## セーフエリア

YouTube の画面表示に隠れる上 220px・下 420px・右 140px には文字を置かない（`scenes.tsx` の `SAFE`）。

## 運用の決まり

- 長さと配置は統一し、見た目はテーマごとに変える（`looks.ts`）。**テーマは毎週ローテーション**（値下がり → 予算 → 2機種比較 → 豆知識）。
- **毎回、検品担当のひと言を人が書く**。テンプレートだけの繰り返し動画は収益化の対象外になりうる（ideas/youtube-shorts.md）。
