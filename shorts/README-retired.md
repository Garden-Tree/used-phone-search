# やめたショートのテーマ（記録）

> **11/23 にやめたテーマ**: drops（値下がり）・budget 系（budget・pixelbudget・ipadbudget・macbudget・probudget・foldbudget・galaxybudget・bigbudget・watchbudget）・rank・rankipad・rankpixel・unused（状態ランク）・provs・promax・plusvs・plusmax・minie・oldpro・ultravs・mbpvsair（2機種の差）・newused・overnew・ios27line・storage・ipadmini・mbpnew・mbpproled・launch（新品・新型との比較）・kaitorishop・kaitoriswap（買取・売る）・rakutenmobile（広告の回）・reversal（トーク型）。
> **理由**: 11/19 までの公開で、これらの種類は再生の中央値 150〜540回・見続けた% 11〜23%。続ける在庫数・電池・1世代前は 約1,000回・24〜35%（`ideas/2026-11-23-shorts.md`）。11/23〜 は週2本・7:00・在庫数／電池／1世代前だけ（`STATE.md`・スキル youtube-shorts の「11/23〜 の決まり」）。
> コード（`shorts/themes/`・`make-short.tsx` の THEMES）は消していないので、plan・render はいまも動く。**ユーザーの指示なしに作り直さない**。
> 続けるテーマの仕組みは `shorts/README.md`、作り方は `.claude/skills/youtube-shorts/SKILL.md`。
> 以下は 11/23 の整理で両ファイルから移した原文（書き換えていない）。

## README.md から（コマンド）

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
npx tsx shorts/make-short.tsx mbpvsair plan             # MacBook AirとPro、中古ならどっちが安い？（型 A だけ・10/29〜・青山龍星）
npx tsx shorts/make-short.tsx watchbudget plan          # 予算ぴったりで買える中古Apple Watch（型 A だけ・10/29〜・つむぎ。--budgets・--pick も効く）
npx tsx shorts/make-short.tsx ultravs plan              # Apple Watch Ultra と Series、中古ならいくら違う？（型 A だけ・11/2〜・青山龍星）
npx tsx shorts/make-short.tsx kaitorishop plan          # 同じiPhoneでも、売る店でいくら違う？買取価格の3店の差（型 A だけ・10/29〜・青山龍星）
```

掛け合いの形式（11/6〜の試作）: `npx tsx shorts/reversal.tsx plan [reversal|jirai|qa]` → `render --dir shorts/out/<フォルダ>`。ずんだもんとつむぎ・20〜30秒・クリームの地。make-short.tsx とは別のスクリプト

## README.md から（テーマの説明）

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
- `overnew`: 中古なのに新品より高い？新品との差がいちばん小さい中古iPhone（型 A だけ・約38秒。10/25〜・ずんだもん）
  - newused の裏返し。対象・容量の決め方は newused と同じ（Apple 公式の新品価格がある iPhone・公式価格のある容量で在庫がいちばん多い容量・在庫5件以上）。**中古の相場÷新品の高い順**。中古が新品以上の機種も入れる（1位なら「新品より +○円」）
  - 場面 hook（新品 100% と中古の割合の2本の棒＋「新品より +○円」か「新品の○%」）→ ranking（下段は容量・新品の○%・差）→ reveal（新品と中古の相場の2本の棒・高い方を幅いっぱい）→ comment → outro
  - ナレーション: ranking「3位は<機種>、<容量>。新品のおよそ<率>%です。」（中古が新品以上なら「新品より<額>高いです。」）・reveal「1位は<機種>、<容量>。中古の相場が、新品より<額>高くなっています。」
  - 公式価格のある機種は6つ（`lib/applePrices.ts`）なので、並びは newused と裏返しになりやすい。10/25 は 18 Pro・18 Pro Max・17e で、newused（Air・16・17）とは重ならなかった。18 Pro Max は在庫5件ちょうど
  - ひと言の下書きは、中古が新品以上なら「発売直後の中古は／新品の値段と／比べてから買いましょう」、ほかは「差が小さいなら／保証のある新品も／考えましょう」。utm の末尾 `_overnew`。関連動画の締めあり

## README.md から（予算を変える・出だしの実験）

- ランキング型（provs・plusvs・plusmax・oldpro・minie・unused・battery・rank・gen・storage・newused・fold・ios27line・batteryswap・overnew）は数日では1位が変わらない（10/25 に作り直すと 10/22〜23 とほぼ同じだった）。plan の1位とタイトルを前の回と比べ、ほぼ同じなら作らない
- **予算と相場は1万円以内**（10/25 ユーザーの指示）: 各行は帯 (max(前の予算, 予算−1万円), 予算] の機種だけ。帯に機種がなければ plan がエラーになるので予算を変える（`themes/budget.ts` の BUDGET_GAP）
- 予算別（budget・ipadbudget・pixelbudget・foldbudget）は `--budgets 40000,60000,80000,120000 --pick 40000` で予算の並びと注目を変えられる（`themes/budget.ts` の BudgetOpts）。注目の予算は予算別ページ（`lib/budgets.ts`）がある額にする（説明欄のリンク先）
- 出だしの実験（答えから始める）は script.json に `hookStyle: "answer"`・`hookLines`（つかみの大きな文字・問いの代わり）・`narration.hook`（答えの文）をそろえて書く。`hookLines` は SplitHook（provs・promax・plusvs・plusmax・minie・oldpro・unused・gen・storage・newused・ipadmini）と BudgetHook（budget・pixelbudget・macbudget・probudget・foldbudget・galaxybudget・bigbudget）・DeviceHook（watchgen・macgen・ipadgen・pixelgen）のテーマで効く（10/27〜）

## README.md から（見た目の節にあったテーマ）

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

見た目の表（11/23 までの全テーマ）:

| 見た目 | 地 | 見出しの帯 | カード | 強調 | 使うテーマ（つかみ） |
| --- | --- | --- | --- | --- | --- |
| ① 値下がり DROPS | 紺 brand900 | 赤 price・左右いっぱい | 角丸28・縁なし | price | drops（1位の下がった額）・galaxybudget（予算の札）・pixelgen（カメラの帯のあるスマホの形＋最大の差額） |
| ② 予算別 BUDGET | 明るい ground | 藍 brand600・角丸の箱 | 灰の縁＋影 | price（札は brand600） | budget・pixelbudget・macbudget・bigbudget（予算の札）・ipadbudget（予算の丸い札・淡い金）・overnew（新品と中古の割合の2本の棒）・minie（「無印 vs mini・e」。右の札は price）・ipadgen（縦のタブレットの形＋最大の差額） |
| ③ 比べる VERSUS | 紺 brand900 | 藍の札・左寄せ・左に緑の線 | 左に緑の線 | safe | newused・provs・promax・plusvs・plusmax・gen・storage（「A vs B」＋最大の差額）・fold（開いた折りたたみの形）・foldbudget（予算の札）・ios27line（スマホの形に「iOS 27 対応」）・kaitorishop（「高い店 vs 安い店」の札＋差額） |
| ④ 状態の差 CONDITION | 生成り inspect50 | 墨 ink・角丸の箱 | 琥珀の線の縁＋影 | price | rank（A・B・C の札）・battery（縦の電池の形）・batteryswap（「中古＋電池交換＝1つ上」の札）・unused（「ランクA vs 未使用品」）・stock／stockandroid（横の棒3本・1位だけ「？？？」＋「最多 ○件」） |
| ⑤ Pro の予算別 PRO | 墨 ink | 淡い金 inspectLine・丸い端（墨の文字） | 金の縁 | price（札は inspect700） | probudget（予算の札）・oldpro（「前のPro vs 無印」＋差 最大）・watchgen・macgen（時計・ノートの形＋最大の差額） |
| ⑥ 広告の回 AD（5つの例外・10/26〜） | 明るい ground | 塗らない（墨の文字）・ピンク #D9005B の下線 | 灰の縁＋影 | ピンク #D9005B（札も） | rakutenmobile（料金の3段の階段＋2年で差）。左上に「PR」 |

関連動画の対応（11/23 まで）:

  - provs・promax・probudget・plusvs・minie・plusmax → Proと無印（Bmp5EgeiqW0）／budget・drops・newused・overnew → いま買うならどれ（R1Aki2b5mds）／battery・batteryswap・storage・rank・unused → 買ってはいけない（amx5UxG6wpI）／gen・ios27line・oldpro → 何世代まで（T7ltgSB-4XM）／bigbudget → 大きい画面（2026-10-28-big-screen・ID は公開後）／rakutenmobile → 楽天モバイル（2026-10-31-rakuten-mobile・ID は公開後。それまで RELATED_LONG_THEMES に入れない）／ipadbudget → iPad どれ（SHyQRQ8wAic。声の誘導がないので札は出ない）

## kaitorishop（10/29〜・同じiPhoneでも、売る店でいくら違う？）

- `kaitorishop`（`themes/kaitorishop.ts`・型 KaitoriShopScript・行 KaitoriShopRow）: 買取の3店（`lib/buybackPrices.ts` の BUYBACK_SHOPS: ネットオフ 美品・にこスマ 良品・モバステ 中古の上限＝「きれいな状態」）。DB は表 BuybackPrice を機種×容量×店の groupBy 1回だけ（在庫の表は読まない）
- 選び方: 表にある iPhone すべて。容量は**3店すべてに価格がある容量のうちいちばん小さい容量**（1機種1行）。差＝最高値−最安値の大きい順・率は最高値に対して。同じ区分が2行あれば高い方を使い「★注意」を出す。画面・説明欄に買取価格の更新日（`updated`・出した3行の最新・週1回）
- 場面は newused と同じ並び（hook → 3位・2位・伏せた1位 → 1位の3店の棒（高い順・店の名前の札）と「差 ○円」・率・「各店の公式・○/○更新」→ comment → outro）。行の下段は 容量・差・「○○が高い」
- つかみは**答えから**（hookLines「同じ<機種>／<容量>でも、売る店で／買取価格が違う」＋高い店と安い店の札（店名と価格）＋「差 ○円」。声も差額まで言う）。hookStyle "answer" は付けない（札が「1位」になる）
- 帯「同じiPhoneでも／売る店でいくら違う？」・上の行「毎週更新・買取価格は3店の公式」・注記「買取価格は各店の公式・○/○更新・きれいな状態／3店がそろういちばん小さい容量」。見た目 ③ VERSUS＋split（次の2本が ④ なので避けた）。声 青山龍星
- 説明欄のリンクは /iphone/kaitori と トップ。utm の末尾 `_kaitorishop`・#中古iPhone #iPhone #買取。ひと言の下書き「売る前に／3店の買取を／比べましょう」・締めの問い「あなたは、どこで売りますか？」。関連動画の締めは買取の横動画が公開されてから（RELATED_LONG_THEMES に入れていない）

## ultravs（README.md の「stockipad・stockwatch・ultravs（11/2〜）」から）

- `ultravs`（`themes/ultravs.ts`・ProVsScript で base＝Series・pro＝Ultra）: 同じ年に発表された Ultra と Series の組（出典は Apple Newsroom・ファイルの頭）。ケースは watchgen の `side`（在庫がいちばん多いサイズ・5件以上）。差0以下は「★注意」で外す。声 青山龍星・③ VERSUS＋split

## mbpvsair・watchbudget（README.md の「mbpvsair・watchbudget・stockmac（10/29〜）」から）

- `mbpvsair`（`themes/mbpvsair.ts`・台本案 `longform/2026-11-01-mbp-vs-mba/short-plan.md`）: 場面・行は oldpro と同じ（OldProRow に label・olderShort・newerShort・isNew を足した。型 MbpVsAirScript）。行は 新品 Air 13インチ M5 vs Pro 14インチ M6（16GB・1TB。`lib/macbookAirM5.ts`・`lib/macbookProM6.ts`・Apple 公式）・中古 Air 13インチ M2 vs Pro 14インチ M1 Pro（16GB・512GB／1TB。構成の中央値・ジャンク除く・在庫5件以上）。差の大きさの小さい順（1位＝いちばん同じ値段に近い組）。安い方は毎回の数字から（逆転していたら「Proが安い」と言わない）。13インチ Pro は比べない（Touch Bar の旧筐体）。見た目 ⑤ PRO＋split（「新品の差」）。声 青山龍星。関連動画の締めは横動画の ID が分かってから
- `watchbudget`（`themes/watchbudget.ts`）: budget と同じ（`pickBudgetModels`・BudgetScript）。ケースは watchgen と同じ（機種ごとに在庫がいちばん多いサイズ・`watchgen.ts` の side を共有）。予算 2万・4万・5万・8万円・注目4万円（`WATCH_SHORT_BUDGETS`・`WATCH_PICK_BUDGET`）。切り口は watchOS 27 対応（Apple 公式）。発売年は持たない（released は空。行・注目の補足は出さない）。行の声は「Series 7」から（「Apple Watch」を付けると1つの句になる）。見た目 ② BUDGET＋chips。声 つむぎ

## mbpnew（10/28〜・新型 MacBook Pro 14インチ M6 の回）

- 「新型MacBook Pro M6、中古のM5・M4ならいくら安い？」。場面・画面は ipadmini と同じ（台本の型 IpadMiniScript・`isNewVsOld`）。画面の文字（見出しの帯・つかみ・注記・1位の補足・棒の札・表の見出し）は `scenes.copy`（NewVsOldCopy）で変える。ipadmini は copy を持たない（今までの文字のまま）
- 新型の値は `lib/macbookProM6.ts`（Apple 公式・10/28 確認・16GB／1TB 339,800円・仕様の違いは M4 の技術仕様と比べた CPU・GPU・Wi-Fi・電池・重さ）
- 中古は 14インチの M4（16GB）・M5（16GB）・M5（24GB）を、新型と同じ SSD 1TB で。相場は構成ごとの中央値（在庫5件以上）。差の大きい順で items[0] を伏せる
- 声 青山龍星・見た目 ① DROPS＋つかみ split。読み: M6 エムシックス・Wi-Fi 7 ワイファイセブン・「約8.0万円」は小数の 0 を外す（「ハッテンゼロ」と読まれた）
- 関連動画の締めはなし（Mac の横動画はまだ）

## mbpproled（10/29〜・PROLED XDR ディスプレイ搭載 MacBook Pro の4択）

- 「MacBook Pro 4択、新型（有機EL）よりいくら安い？」。台本案は `longform/2026-10-31-mbp-proled/short-plan.md`。場面・画面は mbpnew と同じ（IpadMiniScript・`isNewVsOld`）
- 基準は新型 PROLED 14インチ M5 Pro（24GB・1TB 499,800円）。値は `lib/macbookProProled.ts`（Apple 公式・10/29 確認）。行は 今のミニLED M5 Pro（新品 429,800円）・中古 M5 Pro 24GB・1TB（DB の中央値・ジャンク除外・在庫5件以上）・新型 M6（新品 339,800円・`lib/macbookProM6.ts`）。差の大きい順で items[0] を伏せる
- 新品の行は `isNew`（count 0・ランキングの値段は「新品○円」）。`copy` に足した欄: `hookRight`（つかみの右の札）・`teaserLabel`・`oldBar`（2本目の棒の札）・`compareNewHead`（表の基準の列）・`rankBadges`（札を「3位・2位」に。声の「3位は」で行を出す・render.ts の rowOf）。どれも省略可で、ipadmini・mbpnew は今までどおり
- 声 青山龍星・見た目 ③ VERSUS＋つかみ split。関連動画は PROLED の横動画が公開前なので、公開済みの新型 M6 の回（relatedLong.ts の MBP_M6）。公開したら差し替える

---

## SKILL.md から（前置きのテーマ一覧・11/22 まで）

**頻度と作るネタは下の「11/23〜 の決まり」がいちばん優先**（週2本・7:00・在庫数／電池／1世代前だけ。11/22 までの1日2本・1日1本の試しは終了）。公開予約は最長2日後まで。以下のテーマ一覧は 11/22 までに作ったもの（11/23〜 作らないものを含む）: **drops**（今週いちばん値下がりした中古iPhone のランキング）・**budget**（予算ぴったりで買える中古iPhone。10/21〜）・**newused**（新品より中古でいくら安い？ 10/21〜）・**provs**（Proと無印、同じ容量でいくら違う？ 10/22〜）・**fold**（折りたたみスマホ、1世代前にするといくら安い？ 10/22〜）・**pixelbudget**（予算ぴったりで買える中古Pixel 10/22〜）・**ipadbudget**（予算ぴったりで買える中古iPad 10/23〜）・**rank**（状態ランクでいくら違う？中古iPhone 10/22〜）・**battery**（電池90%台だといくら高い？中古iPhone 10/23〜）・**gen**（iPhone、1世代前にするといくら安い？ 10/23〜・ずんだもん）・**storage**（容量を1つ上げるといくら高い？中古iPhone 10/23〜・つむぎ）・**promax**（Pro MaxとPro、同じ容量でいくら違う？ 10/23〜・青山龍星）・**macbudget**（予算ぴったりで買える中古MacBook 10/23〜・つむぎ）・**probudget**（予算ぴったりで買える中古iPhone Pro 10/24〜・つむぎ）・**foldbudget**（予算ぴったりで買える中古折りたたみスマホ 10/24〜・青山龍星）・**ios27line**（iOS 27 に対応する、いちばん安い中古iPhoneは？ 10/25〜・ずんだもん）・**batteryswap**（電池交換を足すと、1つ上の世代と同じ値段？ 10/25〜・ずんだもん）・**overnew**（中古なのに新品より高い？新品との差がいちばん小さい中古iPhone 10/25〜・ずんだもん）・**plusvs**（Plusと無印、同じ容量でいくら違う？ 10/25〜・青山龍星）・**minie**（無印より安い“弟分”（mini・e）、いくら安い？ 10/26〜・青山龍星）・**unused**（未使用品（ランクS）は、中古（ランクA）よりいくら高い？ 10/26〜・青山龍星）・**plusmax**（大画面はPlusとPro Max、同じ容量でいくら違う？ 10/26〜・春日部つむぎ）・**oldpro**（1世代前のProと最新の無印、どっちが安い？ 10/26〜・ずんだもん）・**bigbudget**（予算ぴったりで買える 大きい画面の中古iPhone 10/26〜・つむぎ）・**rakutenmobile**（楽天モバイルは使った量で3段階｜中古iPhone 14と2年でいくら？ **広告の回・PR** 10/26〜・つむぎ）・**mbpvsair**（MacBook AirとPro、中古ならどっちが安い？ 10/29〜・青山龍星）・**watchbudget**（予算ぴったりで買える中古Apple Watch 10/29〜・つむぎ）・**stockmac**（中古でいちばん多いMacBook・在庫数ランキング 10/29〜・青山龍星）・**kaitorishop**（同じiPhoneでも、売る店でいくら違う？買取価格の3店の差 10/29〜・青山龍星）・**stockipad**／**stockwatch**（中古でいちばん多いiPad／Apple Watch・在庫数ランキング 11/2〜・ずんだもん）・**ultravs**（Apple Watch Ultra と Series、中古ならいくら違う？ 11/2〜・青山龍星）。

## SKILL.md から（手順の全テーマのコマンドと補足）

2. **台本**: `npx tsx shorts/make-short.tsx <drops|budget|pixelbudget|ipadbudget|macbudget|probudget|foldbudget|galaxybudget|bigbudget|newused|provs|promax|plusvs|plusmax|oldpro|minie|fold|rank|unused|battery|gen|storage|ios27line|batteryswap|overnew|rakutenmobile|mbpvsair|watchbudget|stockmac|stockmacdesk|kaitorishop|stockipad|stockwatch|ultravs|rankipad|rankpixel> plan`
   - drops: 1〜3位。budget: 予算（3万・5万・7万・10万円）ごとの機種と相場、注目（5万円の行）の最安・在庫数。newused: 新品と中古の相場の差の1〜3位（候補の全機種も出る）。provs: 無印と Pro の相場の差の1〜3位（候補の全組と、1位の無印の容量を上げたときの差も出る）。fold: 折りたたみの新しい方と1世代前の相場の差の1〜3位（候補の全組も出る）。
   - **前の回と同じ中身にしない**（10/25）: ランキング型（provs・plusvs・plusmax・oldpro・minie・unused・battery・rank・gen・storage・newused・fold・ios27line・batteryswap・overnew）は数日では1位が変わらない。plan の1位とタイトルを前の回（shorts/out の同じテーマ）と比べ、ほぼ同じなら作らない。予算別（budget・ipadbudget・pixelbudget・foldbudget・watchbudget）は `--budgets 40000,60000,90000,130000 --pick 40000` で予算を変えて作れる。**予算と相場は1万円以内**（帯 (max(前の予算, 予算−1万円), 予算]。外れたら plan がエラー）。過去の回の行（shorts/out の script.json）と同じ機種が並ばない予算を選ぶ
   - **声を変えて試す**（10/25〜の実験）: script.json の `voice.speaker` を書き換える（例 "ずんだもん/ノーマル"）。1本で変えるのは1つだけ。結果は公開48時間後の再生数と「視聴を選んだ割合」で ideas に記録
4. **書き出し**: `npx tsx shorts/make-short.tsx <drops|budget|pixelbudget|ipadbudget|macbudget|probudget|foldbudget|galaxybudget|bigbudget|newused|provs|promax|plusvs|plusmax|oldpro|minie|fold|rank|unused|battery|gen|storage|ios27line|batteryswap|overnew|rakutenmobile|mbpvsair|watchbudget|stockmac|stockmacdesk|kaitorishop|stockipad|stockwatch|ultravs|rankipad|rankpixel> render`
   - drops は A・B・C の3本、ほかは A の1本と、`youtube.txt` ができる。

## SKILL.md から（構成・テーマごとの決まり）

- drops: **hook → ranking → reveal → trend → comment → outro**。B と C は予備。
- budget: **hook → ranking（予算の4行）→ reveal（注目）→ comment → outro**（型 A だけ・約39秒）。
  - 行の機種: 相場（在庫がいちばん多い容量の中央値）が帯 (前の予算, 予算]（0〜3万・3万超〜5万・5万超〜7万・7万超〜10万）に入る iPhone（**iPhone 12 シリーズ以降と SE (第3世代)**。11 系・SE (第2世代) は古すぎるので出さない・在庫5件以上）のうち、**相場がいちばん高い機種**。同じなら発売の新しい方。帯が空なら「予算以下で発売年がいちばん新しい機種」。
    - 「発売年がいちばん新しい」だけで選ぶと、5万円の枠に相場3.3万円の SE 第3世代が入って分かりにくかった（10/21）。
  - 注目は5万円の行に固定（主観で選ばない）。**出すのは相場（容量つき）と在庫数だけ。最安は出さない**（3万円の行より安く見えた）。
  - 4行は上から、「○万円なら」の声の0.15秒前に1行ずつ出す。見出しの帯は「予算ぴったりで買える／中古iPhone」。
- newused: **hook → ranking（3位・2位・伏せた1位）→ reveal（1位の新品と中古の相場の2本の棒・差額と率）→ comment → outro**（型 A だけ・約39秒）。
  - 対象: Apple 公式の新品価格がある iPhone（`lib/applePrices.ts`）。容量は公式価格のある容量のうち中古の在庫がいちばん多い容量（在庫5件以上）。中古は**相場（中央値）**で比べ、最安は使わない。差額（新品−相場）の大きい順。相場が新品以上の機種は出さない。
  - 見出しの帯は「新品より／いくら安い？中古iPhone」。下の注記は「新品はApple公式・中古は同じ容量の中央値」。utm の campaign の末尾は `_newused`。
- provs: **hook → ranking（3位・2位・伏せた1位）→ reveal（1位の無印と Pro の相場の2本の棒・差額と率・あれば無印を1つ上の容量にしたときの差）→ comment → outro**（型 A だけ・約31秒。10/22〜）。
  - 組: iPhone 13〜17 の無印と Pro（`shorts/themes/provs.ts` の PAIRS）。容量は両方に在庫5件以上ある容量のうちいちばん小さい容量（13〜16 は 128GB、17 は 256GB）。相場（中央値）どうしの差（Pro − 無印）の大きい順。率は無印の相場に対して。
  - 行の機種名は「iPhone 16／16 Pro」。下段は 容量・+差額・+率。見出しの帯は「Proと無印／同じ容量でいくら違う？」。下の注記は「中古は同じ容量の中央値」。utm の campaign の末尾は `_provs`。
  - 容量を上げたときの差（`scenes.upgrade`）は同じ中央値の決め方で、在庫5件以上のときだけ。ひと言「Proの差額で／容量を上げるのも／アリです」は、その差が Pro との差より小さいときだけ（なければ「差額と使う機能で／選びましょう」）。
- pixelbudget: budget と同じ構成・同じ選び方（`pickBudgetModels` を共有・約38秒。10/22〜）。
  - 対象: `lib/pixelCatalog.ts` の Pixel のうち、Google のアップデート保証が作成月の時点で終わっていない機種（10/22 は Pixel 6・6 Pro を除外）。同じ相場なら販売開始の新しい方。
  - 切り口: 各行と注目に**アップデート保証の終わり**（「アップデート 2031年5月まで」）を出す。注目の声は在庫数でなく保証の終わりを読む。見出しの帯は「予算ぴったりで買える／中古Pixel」。下の注記に「アップデートはGoogle公式」。
  - 説明欄のリンクは注目の機種ページ・/pixel/budget/under-50000・/pixel。utm の末尾は `_pixelbudget`。ハッシュタグ #Pixel #中古スマホ。ひと言の下書き「Pixelは機種ごとに／アップデート期限を／確認しましょう」。
- ipadbudget: budget と同じ構成・同じ選び方（`pickBudgetModels` を共有。10/23〜）。
  - 対象: `lib/ipadCatalog.ts` の iPad のうち **iPadOS 27 対応**（`lib/ipadSpecs.ts` の IPADOS27_MODELS・Apple 公式）。同じ相場なら発売年の新しい方。
  - **予算は 5万・7万・10万・15万円**（相場3万円以下の iPad は 10/23 時点ですべて iPadOS 27 非対応で、3万円の行が作れない）。注目は5万円の行。
  - 切り口: 各行と注目に**使える Apple Pencil**（`lib/ipadPencil.ts`。「Pencil USB-C／第1世代」）。注目の声は在庫数を読む。見出しの帯は「予算ぴったりで買える／中古iPad」。下の注記に「PencilはApple公式」。
  - 説明欄のリンクは注目の機種ページ・/ipad/budget/under-50000・/ipad。utm の末尾は `_ipadbudget`。ハッシュタグ #iPad #中古iPad。ひと言の下書き「iPadは機種ごとに／使えるPencilが／違います」。声は 青山龍星。
- promax: provs と同じ場面・同じ行（台本の型は ProVsScript で theme "promax"・base＝Pro・pro＝Pro Max。`shorts/themes/promax.ts`。10/23〜・約35秒）。
  - 組: iPhone 13〜18 の Pro と Pro Max（18 は在庫5件以上の容量があれば入る。10/23 は 18 Pro Max 256GB が8件で入った）。容量は両方に在庫5件以上の最小の容量。差（Pro Max − Pro）の大きい順、率は Pro に対して。1位の Pro を1つ上の容量にしたときの差も出す。
  - 見出しの帯「Pro MaxとPro／同じ容量でいくら違う？」・つかみ「Pro vs Pro Max」・棒の札「Pro／Pro Max」・注記「Proを512GBにするなら +○円」。見た目は provs と同じ VERSUS。声は 青山龍星。締めに関連動画の誘導が入る（RELATED_LONG_THEMES）。
  - ナレーション: hook「Pro MaxとPro、同じ容量だと、いくら違う？」・ranking「3位はiPhone 13 Proと13 Pro Max、128GB。差は16,300円です。」・reveal「1位は<Pro>と<番号 Pro Max>。Pro Maxにすると、約○.○万円、およそ○%高くなります。」・outro「…あなたは、Pro Max派？Pro派？」。ひと言の下書きは容量を上げる差が小さいとき「大画面か容量か／同じ差額なら／使い方で選びましょう」、ほかは「画面の大きさと重さで／選びましょう」。utm の末尾 `_promax`
- plusvs: provs と同じ場面・同じ行（台本の型は ProVsScript で theme "plusvs"・base＝無印・pro＝Plus。`shorts/themes/plusvs.ts`。10/25〜・約36秒）。
  - 組: iPhone 14／14 Plus・15／15 Plus・16／16 Plus（17 に Plus はない）。容量は両方に在庫5件以上の最小の容量（10/25 はすべて 128GB）。差（Plus − 無印）の大きい順、率は無印に対して。**Plus の方が安い（差0以下）組はランキングから外し、plan のログに「★注意」で出す**（黙って落とさない。人が確かめる）。組が3つしかないので、1組でも外れたら止まる。
  - 見出しの帯「Plusと無印／同じ容量でいくら違う？」・つかみ「無印 vs Plus」・棒の札「無印／Plus」。見た目は provs と同じ VERSUS。声は 青山龍星。締めに関連動画の誘導が入る（RELATED_LONG_THEMES）。
  - 説明欄のリンクは1位の Plus の機種ページと /iphone。utm の末尾 `_plusvs`。ひと言の下書き「Plusは電池が大きいけど／中古は電池の%を／確認しましょう」（「けど」で読点が入る。「大きい分」だと「ブンチュウコ」と続けて読まれた）。
- plusmax: plusvs を写したもの（ProVsScript・base＝Plus・pro＝Pro Max。`shorts/themes/plusmax.ts`。10/26〜・約37秒）。**声の実験**: 強い「2つを比べて差を言う」型を 青山龍星 以外（つむぎ）で出す。
  - 組: 14 Plus／14 Pro Max・15 Plus／15 Pro Max・16 Plus／16 Pro Max。容量は両方に在庫**20件以上**の最小の容量。差（Pro Max − Plus）の大きい順、率は Plus に対して。差0以下は外して「★注意」。
  - 帯「大画面はPlusとPro Max／同じ容量でいくら違う？」・つかみ「Plus vs Pro Max」・棒の札「Plus／Pro Max」。③ VERSUS。説明欄は1位の Pro Max の機種ページと /iphone、utm `_plusmax`。ひと言「大画面は落とすと高いので／画面の傷と保証を／先に確認しましょう」。
- oldpro: 行は OldProRow（older＝1世代前の Pro・newer＝次の世代の無印。`shorts/themes/oldpro.ts`。10/26〜・約40秒）。**声の実験**（ずんだもん・です・ます）。
  - 組: 13 Pro／14・14 Pro／15・15 Pro／16・16 Pro／17。容量は両方に在庫20件以上の最小の容量。差は向きつき（無印 − Pro）で、**差の大きさの大きい順。Pro の方が高い組も落とさず「○○が安い」を行ごとに出す**。率は高い方に対して。差0だけ外す。
  - 帯「1世代前のProと最新の無印／どっちが安い？中古iPhone」・つかみ「前のPro vs 無印」＋「差 最大」・行は「差 ○円／○○が安い」・1位は2本の棒（高い方が幅いっぱい）。⑤ PRO。説明欄は1位の安い方の機種ページと /iphone、utm `_oldpro`。ひと言は1位の組のチップ・端子が lib/iphoneSpecs.ts で同じか違うかだけ（同じでも違いもなければ「Proか無印かより／電池の%と保証を／確認しましょう」）。
- minie: 行と1位の場面は gen・fold と同じ（台本の型は MinieScript・行は FoldRow で newer＝無印・older＝弟分。`shorts/themes/minie.ts`。10/26〜・約34秒）。
  - 組: iPhone 12／12 mini・13／13 mini・16／16e・17／17e。容量は両方に在庫5件以上の最小の容量。差（無印 − 弟分）の大きい順、率は無印に対して。**弟分の方が高い（差0以下）組は外して plan のログに「★注意」**。3組未満なら止まる。
  - 見出しの帯「無印より安い“弟分”／いくら安い？中古iPhone」・つかみ「無印 vs mini・e」（右の札は赤）・機種名は弟分が先（「iPhone 17e／17」）。見た目は ② BUDGET。声は 青山龍星。締めに関連動画の誘導。
  - 説明欄のリンクは1位の弟分の機種ページと /iphone。utm の末尾 `_minie`。ひと言の下書きは1位の弟分の在庫が無印より少なければ「弟分は在庫が少ないので／容量と電池の%を／見比べましょう」、ほかは「安い弟分でも／…」。締めの「小さい・安い弟分派？」は3組がすべて mini のときだけ（16e・17e は無印と同じ 6.1 インチ）。ほかは「安い弟分派？」。
- unused: rank を写したもの（台本の型は UnusedScript。`shorts/themes/unused.ts`。10/26〜・約34秒）。
  - 機種: iPhone 13〜17 の無印と Pro。容量はその機種で在庫がいちばん多い容量。ランクS（未使用品）と A の在庫がどちらも20件以上の機種で、差（S − A）の大きい順、率は A に対して。**S の方が安い（差0以下）機種は外して「★注意」**。3機種未満なら止まる。10/26 は S が20件以上あるのが 16・17・17 Pro の3機種だけ（5件のときは 13 が6件・2店の値付けで1位になったので20件に上げた）。
  - 見出しの帯「未使用品（ランクS）は／中古よりいくら高い？」・つかみ「ランクA vs 未使用品」・1位は2本の棒（ランクA・未使用品）と「ランクは各店の表記」。注記「ランクは各店の表記（S＝未使用品）・同じ容量の中央値」。見た目は ④ CONDITION。声は 青山龍星。締めに関連動画の誘導。
  - 説明欄のリンクは1位の機種ページと /iphone。utm の末尾 `_unused`。ひと言の下書き「未使用でも／電池と保証期間は／店ごとに確認を」。
- macbudget: budget と同じ構成・同じ選び方（`pickBudgetModels` を共有。`shorts/themes/macbudget.ts`。10/23〜・約45秒）。
  - 対象: `lib/macCatalog.ts` の MacBook（MAC_MODELS・在庫5件以上）。**予算は 10万・15万・20万・30万円**（10/23 は在庫5件以上の最安が MacBook Air M1 の相場 81,980円で、5万・7万円の帯が空。帯ごとの候補は 2・4・8・7機種）。**注目は15万円の行**（4つの予算の2番目）。plan が帯ごとの候補の数を出すので、空の帯ができたら段を見直す。
  - 切り口: 各行に**チップと発売年**（「M3チップ・2024年発売」。`MAC_INFO`）。つかみの札は「M1チップ」など。注目の声は在庫数を読む。見出しの帯は「予算ぴったりで買える／中古MacBook」。声は 春日部つむぎ。関連動画の締めは付けない（iPhone ではない）。
  - 説明欄のリンクは注目の機種ページ・/mac（Mac の予算別ページはない）。utm の末尾は `_macbudget`。ハッシュタグ #MacBook #中古MacBook。ひと言の下書き「メモリは後から／増やせないので／容量を確認しましょう」
- probudget: budget と同じ構成・同じ選び方（`pickBudgetModels` を共有。`shorts/themes/probudget.ts`。10/24〜・約46秒）。
  - 対象: iPhone 13 Pro 以降の Pro・Pro Max（在庫5件以上）。**予算は 7万・10万・15万・20万円**（10/24 は Pro の最安が 13 Pro の相場 65,980円で5万円の帯が空。帯ごとの候補は 1・2・3・3機種）。**注目は10万円の行**（4つの予算の2番目）。plan が帯ごとの機種と相場を出すので、空の帯ができたら段を見直す。
  - 切り口: 各行と注目に**画面の大きさと端子**（「6.1インチ・Lightning」。`lib/iphoneSpecs.ts`・Apple 公式）と発売年。見出しの帯は「予算ぴったりで買える／中古iPhone Pro」。下の注記に「画面と端子はApple公式」。声は 春日部つむぎ。関連動画の締めあり。
  - 見た目は5つ目の型 PRO（墨の地・淡い金の丸い端の帯・金の縁のカード・琥珀の札）。**見た目の型はこれで5つ（上限）**。
  - 説明欄のリンクは注目の機種ページ・/iphone/where-to-buy・トップ。utm の末尾は `_probudget`。ハッシュタグ #中古iPhone #iPhonePro。ひと言の下書きは注目が Lightning なら「14 Proまでは／Lightning端子／15 ProからUSB-Cです」（声は「ユーエスビーシー」）。
  - 読み: つかみの「中古iPhone Proは」は narrationKana で「チュ'ウコ/アイフォ'ン/プ'ロワ？」に切る（切らないと1つの句）。
- foldbudget: budget と同じ構成・同じ選び方（`pickBudgetModels` を共有。`shorts/themes/foldbudget.ts`。10/24〜）。再生の多かった予算別（1,079回）と折りたたみ（1,074回）を合わせた回。
  - 対象: `lib/galaxyCatalog.ts` の Galaxy Z Fold・Z Flip と `lib/pixelCatalog.ts` の Fold（Pixel Fold・9〜11 Pro Fold）、在庫5件以上。Pixel はアップデート保証が終わった機種を除く。同じ相場なら発売の新しい方。
  - **予算は 5万・10万・15万・20万円**（10/24 は在庫5件以上の折りたたみの相場が 3.8万〜27.5万円。帯ごとの候補は 2・4・3・3機種）。**注目は10万円の行**（4つの予算の2番目）。plan が帯ごとの機種・相場・件数を出すので、空の帯ができたら段を見直す。
  - 切り口: 各行と注目に**型と開いたときの画面**（「Fold型・開いて7.6インチ」。型は機種名の Fold／Flip、画面は `lib/galaxySpecs.ts`・`lib/pixelSpecs.ts` の displayInner＝ドコモ・Google の公式の仕様）と発売年月。見出しの帯は「予算ぴったりで買える／中古折りたたみスマホ」。下の注記に「画面は公式の仕様」。声は fold と同じ 青山龍星。関連動画の締めは付けない（iPhone ではない）。
  - 見た目は fold と同じ VERSUS（**見た目の型は5つが上限なので新しく作らない**）。つかみは予算の札（chips。fold の「開いた折りたたみの形」は FoldScript の値を使うので使えない）。
  - 説明欄のリンクは注目の機種ページ・/galaxy・/pixel。utm の末尾は `_foldbudget`。ハッシュタグ #折りたたみスマホ #Galaxy。ひと言の下書き「折りたたみの中古は／折り目とヒンジを／確認しましょう」。
- galaxybudget: budget と同じ構成・同じ選び方（`shorts/themes/galaxybudget.ts`。10/25〜）。対象は折りたたみ（Z Fold・Z Flip）を除く Galaxy S・A シリーズ、在庫5件以上。**予算は 3万・4万・7万・9万円**（相場に近い額・10/24 ユーザーの指示）、注目は4万円の行。切り口は各行に**画面の大きさと発売年月**（`lib/galaxySpecs.ts`）。見出しの帯「予算ぴったりで買える／中古Galaxy」・注記「画面は公式の仕様」。見た目は DROPS（紺・赤い帯）＋予算の札。声は 青山龍星。utm の末尾 `_galaxybudget`・#Galaxy #中古スマホ。ひと言の下書き「キャリア版は／使う回線に対応か／確認しましょう」。関連動画の締めはなし。
- bigbudget: budget と同じ構成・同じ選び方（`shorts/themes/bigbudget.ts`。10/26〜）。対象は画面6.5インチ以上の iPhone（`lib/iphoneSpecs.ts` の display。11 Pro Max・Pro Max・Plus・Air。XS Max は iOS 27 非対応なので除く）、在庫5件以上。**予算は 5万・8万・11万・15万円**、注目は8万円の行。切り口は各行に**画面の大きさと発売年**（Apple 公式）。見出しの帯「予算ぴったりで買える／大きい画面の中古iPhone」・注記「画面はApple公式」。見た目は ② BUDGET＋予算の札。声は 春日部つむぎ。utm の末尾 `_bigbudget`・#中古iPhone #iPhone。ひと言の下書き「大きい画面は／画面の修理代が／高めです」（Apple の画面修理は Plus・Air 57,800円・Pro Max 64,800円で無印より高い。数字はひと言に出さない）。関連動画の締めあり。
- rank: **hook → ranking（3位・2位・伏せた1位）→ reveal（1位のランク A・B・C の3本の棒と件数・A→C の差額と率）→ comment → outro**（型 A だけ・約39秒。10/22〜）。
  - 対象: iPhone 13〜16 の無印と Pro（`shorts/themes/rank.ts` の MODELS）。容量は在庫がいちばん多い容量。ランクは各店の表記（大文字にそろえる）で A・B・C だけ（S＝未使用品・D・ジャンク・不明は除く）。各ランク在庫5件以上。差（A − C）の大きい順、率は A に対して。差0以下は出さない。
  - ランクの基準は店ごとに違い、ランクごとに店の顔ぶれも違う（10/22 は 13 Pro で B の相場が A より高かった）。画面の注記「ランクは各店の表記・同じ容量の中央値」と説明欄で断る。
  - 見出しの帯は「状態ランクで／いくら違う？中古iPhone」。ひと言の下書き「ランクの差は主に／外装の傷なので／電池は別に見ましょう」（サイトの「状態ランクは外装の傷の話」と同じ）。utm の末尾は `_rank`。
  - 実写の0秒目（11/17〜）は「ランクAとCで／？？？円違う」＋1位のランクA・C の相場の2本の棒（札「ランクA」「ランクC」・金額は伏せる）。rankipad・rankpixel も同じ。
- rankipad・rankpixel（11/17〜・rank の iPad・Pixel 版。rank は毎月1位が同じになるため）: `buildRankScript(date, "ipad" | "pixel")`。選び方・場面は rank と同じで機種の群だけ替える。
  - rankipad: iPadOS 27 対応の iPad（ipadbudget と同じ絞り方）・店は IPAD_SHOPS・声 春日部つむぎ・AI の0秒目なし（スマホの絵と食い違う）。utm `_rankipad`・説明欄は1位の機種ページと /ipad。
  - rankpixel: アップデート保証が残っている Pixel（pixelbudget と同じ）・店は PIXEL_SHOPS・声 青山龍星・AI の0秒目は ai-rank.mp4。utm `_rankpixel`・説明欄は1位の機種ページと /pixel。
  - 11/17 の集計で条件（A・B・C 各5件以上）を満たすのは iPad 8機種・Pixel 12機種。新しい機種は C が少なく入らない（ランクC は にこスマ・じゃんぱら・ソフマップ・イオシスが中心で、ゲオは C を付けない）。差額の順なので Pixel は高い折りたたみが上に来やすい。
- storage: iPhone 13〜17 の無印・Pro で、在庫5件以上のいちばん小さい容量と次の容量の相場の差を、**差の小さい順**に（`shorts/themes/storage.ts`）。つかみは「128GB vs 256GB」と「最小 +○円」。reveal の声は「…にしても、○円しか変わりません」。utm の末尾 `_storage`
- ios27line: 場面は newused と同じ並び（`shorts/themes/ios27line.ts`・約38秒）。対象は iOS 27 対応の iPhone（`lib/catalog.ts` の IPHONE_CATALOG・Apple 公式 apple.com/jp/ios/）、相場（在庫がいちばん多い容量の中央値・在庫5件以上）の**安い順**。1位に同じ容量の **iOS 27 非対応（LEGACY_SERIES）で発売がいちばん新しい機種**との差を添える（10/25 は SE 第2世代 20,680円 vs XR 19,580円）。つかみはスマホの形に「iOS 27」「対応」の札＋最安の相場。見た目は VERSUS。reveal の声は容量を読まない。読み iOS→アイオーエス・XR→テンアール。utm の末尾 `_ios27line`
- overnew: newused の裏返し（`shorts/themes/overnew.ts`・約38秒）。対象と容量は newused と同じで、**中古の相場÷新品の高い順**（中古が新品以上の機種も入れる）。つかみは新品 100% と中古の割合の2本の棒。1位が新品以上なら「新品より +○円」。見た目は BUDGET。公式価格のある機種は6つなので、作る前に newused の回と並びが重ならないか確かめる。utm の末尾 `_overnew`
- 3テーマとも声は ずんだもん（ノーマル・です・ます）。公開順 ios27line ③ → batteryswap ④ → overnew ② で、直前の galaxybudget ①と続けて同じ見た目にならないように選んだ。関連動画の締めあり
- rakutenmobile（**広告の回・楽天アフィリエイト**。`shorts/themes/rakutenmobile.ts`・10/26〜）: 横動画11本目の案2。hook（題・料金の階段・2年で差）→ ranking（料金の3段を声に合わせて上から）→ reveal（中古 iPhone 14 128GB の相場＋月額×24 の3本と上と下の段の差）→ comment → outro。料金は Rakuten最強プラン（税込・割引なし）の公式の値だけ（TIERS・`lib/simPlans.ts` の SIM_PRICES_CHECKED。作る日に公式で開き直す）
  - **PR**: 声では読まない（ユーザー 10/26）・左上に小さく「PR」（全場面）・説明欄の1行目「【PR】この動画は楽天アフィリエイトの広告を含みます。」・タイトルの頭に【PR】
  - **楽天モバイルのリンクはショートの説明欄・固定コメント・返信に貼らない**（横動画の説明欄だけ）。ポイント・キャンペーン・特典・「最安」「実質0円」「必ず安い」「無料」「お得」・ほかの会社の料金・すぐの解約や乗り換えは、声・画面・説明欄・コメントのどこにも出さない
  - 見た目は ⑥ AD（5つの例外。明るい地・ピンク #D9005B の下線と札）。声は 春日部つむぎ。utm の末尾 `_rakutenmobile`。関連動画の締めは横動画11本目の ID が分かってから（`relatedLong.ts` の RAKUTEN_MOBILE に ID → `types.ts` の RELATED_LONG_THEMES に足す）
- mbpvsair（10/29〜・`shorts/themes/mbpvsair.ts`。台本案 `longform/2026-11-01-mbp-vs-mba/short-plan.md`）: 「MacBook ProとAir、中古ならどっちが安い？」。場面・行は oldpro と同じ（OldProRow で older＝Pro・newer＝Air・diff＝Air − Pro の向きつき。型 MbpVsAirScript）
  - 行は同じメモリ・SSD どうしだけ: 新品 Air 13インチ M5 vs Pro 14インチ M6（16GB・1TB。`lib/macbookAirM5.ts`・`lib/macbookProM6.ts`・Apple 公式）と、中古 Air 13インチ M2 vs Pro 14インチ M1 Pro（16GB・512GB／1TB・構成の中央値・ジャンク除く・在庫5件以上）。**13インチ Pro（Touch Bar の旧筐体）は比べる相手にしない**（10/29 ユーザーと決定）
  - 並びは差の大きさの**小さい順**（1位＝いちばん同じ値段に近い組）。安い方は毎回の数字から（逆転していたら「Proのほうが安い」と言わない。タイトルも切り替わる）
  - つかみ「MacBook ProとAir、中古ならどっちが安い？」＋「新品の差 97,000円」＋「Pro vs Air」の札。帯「MacBook ProとAir／中古ならどっちが安い？」・注記「新品はApple公式（同じ16GB・1TB）／中古は同じメモリ・SSDの中央値」。見た目 ⑤ PRO
  - ナレーション: ranking「3位は新品、M5のAirとM6のPro、16GBと1TB。Airが97,000円安いです。」（「Air M2と」は「エアアエムツウト」と1つの句になるのでチップを先に）・reveal「1位は中古、M2のAirとM1 Pro、16GBと512GB。Airが○円、Proが○円。Proの方が、○円安いです。」・outro「…あなたは、Pro派？Air派？」
  - ひと言「軽さならAir／画面と端子ならPro／傷は写真で確認を」（声は narration.comment に句点を入れる。入れないと「エアアガメント」と続く）。説明欄に Apple の技術仕様（画面・端子・重さ）。リンクは M1 Pro・M2 Air の機種ページと /mac。utm `_mbpvsair`・#MacBookPro #MacBookAir #中古MacBook。関連動画の締めは横動画（2026-11-01-mbp-vs-mba）の ID が分かってから
- watchbudget（10/29〜・`shorts/themes/watchbudget.ts`）: budget と同じ構成・`pickBudgetModels` を共有（BudgetScript）。対象は `lib/watchCatalog.ts` の全機種。**ケースは watchgen と同じ決め方**（機種ごとに在庫がいちばん多いサイズ・`watchgen.ts` の side）、相場＝そのサイズの中央値・在庫5件以上
  - **予算は 2万・4万・5万・8万円**、注目は4万円（10/29 は Series 9＝watchOS 27 対応でいちばん安い Series）。plan が帯ごとの候補を出す。`--budgets`・`--pick` も効く
  - 切り口: 各行と注目に **watchOS 27 対応／非対応**（Apple 公式 apple.com/jp/watchos/）。**発売年は出さない**（watchCatalog.ts に公式で確かめた発売年がない）。注目の補足はケースのサイズだけ
  - 帯「予算ぴったりで買える／中古Apple Watch」・注記「ケースは在庫がいちばん多いサイズの中央値／watchOS 27対応はApple公式」。行の声は「Apple Watch」を外して「2万円なら、Series 7、…」。見た目 ② BUDGET＋予算の札。声 つむぎ。リンクは注目の機種ページと /watch。utm `_watchbudget`・#AppleWatch #中古。関連動画の締めなし
- ultravs（11/2〜・`shorts/themes/ultravs.ts`）: ProVsScript（base＝Series・pro＝Ultra）。組は同じ年に発表された Ultra／Series 8・Ultra 2／9・Ultra 3／11・Ultra 4／12（watchCatalog.ts に発売年がないので Apple Newsroom の発表で確かめ、出典はファイルの頭）。ケースは watchgen と同じ決め方・在庫5件以上、行は「Ultra 2／Series 9」「49／45mm」。差（Ultra − Series）の大きい順・率は Series に対して・差0以下は「★注意」で外す。帯「Apple Watch UltraとSeries／中古ならいくら違う？」・③ VERSUS＋split（Series vs Ultra）。声 青山龍星。リンクは1位の Series と /watch・utm `_ultravs`・#AppleWatch #中古。ひと言「UltraもSeriesも／ケースのサイズと／電池の%を確認しましょう」
- kaitorishop（10/29〜・`shorts/themes/kaitorishop.ts`）: 「同じiPhoneでも、売る店でいくら違う？」。買取の3店（ネットオフ 美品・にこスマ 良品・モバステ 中古の上限＝きれいな状態。`lib/buybackPrices.ts`）の、同じ機種・同じ容量の**最高値−最安値の大きい順**。容量は**3店すべてに価格があるいちばん小さい容量**。DB は表 BuybackPrice の groupBy 1回だけ
  - つかみは**答えから**（「同じiPhone 15 Pro Max／256GBでも、売る店で／買取価格が違う」＋高い店と安い店の札＋「差 25,000円」。声も差額まで言う）。1位は3店の棒（店の名前の札）と差・率・「各店の公式・○/○更新」
  - 帯「同じiPhoneでも／売る店でいくら違う？」・注記「買取価格は各店の公式・○/○更新・きれいな状態」。説明欄の選び方にも同じ文。見た目 ③ VERSUS＋split。声 青山龍星。リンク /iphone/kaitori・utm `_kaitorishop`・#中古iPhone #iPhone #買取。ひと言「売る前に／3店の買取を／比べましょう」・締め「あなたは、どこで売りますか？」
  - 買取価格は週1回の更新なので、**更新日が変わってから**作り直す。関連動画の締めは買取の横動画が公開されてから

- **声の実験（10/26）**: plusmax（つむぎ）と oldpro（ずんだもん）は、伸びた比べる型（plusvs・provs・promax）を 青山龍星 以外の声で出し、青山龍星 が本当に強いかを見る。

## SKILL.md から（ナレーション）

- **標準の声は 春日部つむぎ（ノーマル）**。drops と budget はこの声（10/21 ユーザーの指示。1本目の drops だけ ずんだもん）。
  - **rank・gen・ios27line・batteryswap・overnew・oldpro・macgen・pixelgen は ずんだもん（ノーマル）**（mbpvsair・stockmac・kaitorishop は 青山龍星、watchbudget は つむぎ。10/29）（10/22・10/25。口調は です・ます のまま。クレジット「VOICEVOX:ずんだもん」。規約は docs/voicevox-terms.md）。pixelbudget は 春日部つむぎ。
  - **newused・provs・promax・plusvs・minie・unused・fold・foldbudget・ipadbudget は 青山龍星（ノーマル）**（macbudget・probudget・plusmax・watchgen・ipadgen は 春日部つむぎ）（10/21・10/22 ユーザーの指示。クレジット「VOICEVOX:青山龍星」。法人が関わる利用は事前に ななはぴ へ確認。docs/voicevox-terms.md）。
  - 名前で指定する（`voice.ts` の `DEFAULT_SPEAKER`・`make-short.tsx` の `THEME_SPEAKER`）。ID はエンジンの GET /speakers から引く（この PC では 8）。
  - 説明欄のクレジットは「VOICEVOX:春日部つむぎ」（公式の規約で商用可・クレジット必須。10/21 確認。docs/voicevox-terms.md）。
  - 説明欄のクレジット「VOICEVOX:<キャラクター名>」は render が自動で入れる。
  - 話者を変えたら `--voice-dump` で読みを、render のタイムラインで長さを見直す（話者で間合いが違う）。キャラクターごとの規約を読んでから使う（docs/voicevox-terms.md）。
- 各場面で読む文（drops）:
  - hook: 「今週いちばん値下がりした中古iPhoneは…？」
  - ranking: 「3位は○○、マイナス○円。2位は○○、マイナス○円。」
  - reveal: 「1位は○○、256GB。1週間で○円、○%の値下がりです。」
    - **「相場は○円から○円になりました」は読まない。**
  - trend: 1文だけ（例「10月17日に大きく下がりました。」）
  - comment: **ひと言の本文だけ。** 「検品担当のひと言」は画面に出ているので読まない。
  - outro: 「全機種の相場は、プロフィールのリンクから見られます。来週の1位は、どの機種でしょう？」
- 各場面で読む文（budget）:
  - hook: 「予算ぴったりで買える中古iPhoneは…？」
  - ranking: 予算ごとに1文「3万円なら、iPhone 12 mini、相場29,800円です。」
  - reveal: 「注目は5万円の<機種>。相場<額>、在庫は<台数>台です。」
  - comment: ひと言の本文だけ。outro: 「全機種の相場は、プロフィールのリンクから見られます。あなたの予算なら、どの機種にしますか？」

- 各場面で読む文（newused）:
  - hook: 「新品より、中古でいくら安くなる？」
  - ranking: 「3位は<機種>、<容量>。新品より<額>安いです。」を 3位・2位
  - reveal: 「1位は<機種>、<容量>。新品の<額>に対して、中古の相場は<額>。<額>、<率>%安くなります。」（「新品の」の「の」を消さない。数字に付いて「シンピンジュウ」と読まれる）
  - comment: ひと言の本文だけ。outro: 「全機種の相場は、プロフィールのリンクから見られます。あなたなら、新品と中古、どちらにしますか？」
- 各場面で読む文（provs）:
  - hook: 「Proと無印、同じ容量だと、いくら違う？」
  - ranking: 「3位は<無印>と<番号 Pro>、<容量>。差は<額>です。」を 3位・2位（例「3位はiPhone 15と15 Pro、128GB。差は24,680円です。」）
  - reveal: 「1位は<無印>と<番号 Pro>。Proにすると、約<X.X>万円、およそ<Y>%高くなります。」（細かい額は画面に。タイトルの「約○.○万円」も同じ四捨五入）
  - comment: ひと言の本文だけ。outro: 「全機種の相場は、プロフィールのリンクから見られます。あなたは、Pro派？無印派？」
- 各場面で読む文（plusvs）: provs と同じ形で、hook「Plusと無印、同じ容量だと、いくら違う？」・ranking「3位はiPhone 14と14 Plus、128GB。差は9,959円です。」・reveal「1位は<無印>と<番号 Plus>。Plusにすると、約<X.X>万円、およそ<Y>%高くなります。」・outro「…あなたは、大きい画面のPlus派？無印派？」（Plus はプラス。`voice.ts` の speakable）
- 各場面で読む文（plusmax）: hook「PlusとPro Max、同じ容量だと、いくら違う？」・ranking「3位はiPhone 15 Plusと15 Pro Max、256GB。差は31,939円です。」・reveal「1位は<Plus>と<番号 Pro Max>。Pro Maxにすると、約<X.X>万円、およそ<Y>%高くなります。」・outro「…あなたは、Plus派？Pro Max派？」（プラス・プロマックス、派は「ハ」で読めた）
- 各場面で読む文（oldpro）: hook「1世代前のProと、最新の無印、どっちが安い？」・ranking「3位はiPhone 14 Proと15、128GB。14 Proが2,320円安いです。」・reveal「1位は<Pro>と<番号>。<安い方>が、約<X.X>万円、およそ<Y>%安くなります。」・outro「…あなたなら、1世代前のPro？最新の無印？」（「14 Proの方が」は「プロ/ノ/ホオガ」と切れたので「Proが」にした）
- 各場面で読む文（minie）: hook「miniとe、無印より、いくら安い？」・ranking「3位はiPhone 13 miniと13、128GB。差は4,820円です。」・reveal「1位は<弟分>と<番号>。弟分にすると、約<X.X>万円、およそ<Y>%安くなります。」・outro「…あなたは、安い弟分派？無印派？」（mini はミニ、16e はジュウロクイー。speakable で読める）
- 各場面で読む文（unused）: hook「未使用品、中古より、いくら高い？」・ranking「3位はiPhone 17 Pro、256GB。ランクAより、未使用品が10,200円高いです。」・reveal「1位は<機種>。未使用品にすると、約<X.X>万円、およそ<Y>%高くなります。」・outro「…あなたは、未使用品派？中古のランクA派？」
- 各場面で読む文（pixelbudget）: budget と同じで、hook「予算ぴったりで買える中古Pixelは…？」・reveal「注目は5万円の<機種>。相場<額>、アップデートは<年>年<月>月までです。」・outro「…あなたの予算なら、どのPixelにしますか？」
- 各場面で読む文（ipadbudget）: budget と同じで、hook「予算ぴったりで買える中古iPadは…？」・ranking「5万円なら、iPad (第9世代)、相場43,670円です。」（括弧のチップ名は読点に「iPad Pro 11インチ、M4」）・reveal「注目は5万円の<機種>。相場<額>、在庫は<台数>台です。」・outro「…あなたの予算なら、どのiPadにしますか？」
- 各場面で読む文（rank）:
  - hook: 「状態ランクで、中古iPhoneはいくら違う？」
  - ranking: 「3位は<機種>、<容量>。ランクAより、ランクCが<額>安いです。」を 3位・2位
  - reveal: 「1位は<機種>。ランクCにすると、約<X.X>万円、およそ<Y>%安くなります。」（容量は画面だけ。読むと40秒を超えた）
  - outro: 「全機種の相場は、プロフィールのリンクから見られます。あなたなら、ランクAとランクC、どちらにしますか？」
  - 「ランクAとC」は1字ずつ切れる（ラ'ンク/エ'イ/ト'/シ'イ）。「ランクA」「ランクC」と書くと `voiceTuning.ts` の 6 で「ランクエ'イト」のように1つの句になる

## SKILL.md から（見た目の表・11/23 まで）

**見た目は5つ**（10/23 ユーザーの指示「多くても5種類」。`LOOKS`）。テーマごとに変えるのは**つかみ（1コマ目）だけ**。
**続けて公開するショートは、前の回と違う見た目（①〜⑤）にする**（10/24 15:00 の値下がり1か月 → 10/25 8:00 の galaxybudget が同じ①で続いた）。

| 見た目 | 地 | 見出しの帯 | カード | 強調 | 使うテーマ（つかみ） |
| --- | --- | --- | --- | --- | --- |
| ① 値下がり DROPS | 紺 brand900 | 赤 price・左右いっぱい | 角丸28・縁なし | price | drops（1位の下がった額）・galaxybudget（予算の札）・pixelgen（カメラの帯のあるスマホの形＋最大の差額） |
| ② 予算別 BUDGET | 明るい ground | 藍 brand600・角丸の箱 | 灰の縁＋影 | price（札は brand600） | budget・pixelbudget・macbudget・bigbudget・watchbudget（予算の札）・ipadbudget（予算の丸い札・淡い金）・overnew（新品と中古の割合の2本の棒）・minie（「無印 vs mini・e」。右の札は price）・ipadgen（縦のタブレットの形＋最大の差額） |
| ③ 比べる VERSUS | 紺 brand900 | 藍の札・左寄せ・左に緑の線 | 左に緑の線 | safe | newused・provs・promax・plusvs・plusmax・gen・storage（「A vs B」＋最大の差額）・fold（開いた折りたたみの形）・foldbudget（予算の札）・ios27line（スマホの形に「iOS 27 対応」）・kaitorishop（「高い店 vs 安い店」の札＋差額） |
| ④ 状態の差 CONDITION | 生成り inspect50 | 墨 ink・角丸の箱 | 琥珀の線の縁＋影 | price | rank（A・B・C の札）・battery（縦の電池の形）・batteryswap（「中古＋電池交換＝1つ上」の札）・unused（「ランクA vs 未使用品」）・stock／stockandroid／stockmac（横の棒3本・1位だけ「？？？」＋「最多 ○件」） |
| ⑤ Pro の予算別 PRO | 墨 ink | 淡い金 inspectLine・丸い端（墨の文字） | 金の縁 | price（札は inspect700） | probudget（予算の札）・oldpro（「前のPro vs 無印」＋差 最大）・watchgen・macgen（時計・ノートの形＋最大の差額）・mbpvsair（「Pro vs Air」＋新品の差） |
| ⑥ 広告の回 AD（5つの例外） | 明るい ground | 塗らない（墨の文字）・ピンク #D9005B の下線 | 灰の縁＋影 | ピンク #D9005B（札も） | rakutenmobile（料金の3段の階段＋2年で差）。左上に「PR」 |

## SKILL.md から（YouTube 投稿の説明欄・drops／budget の書き方）

- **説明欄**（`youtube.txt`。`shorts/themes/<テーマ>.ts` が作る）に入れるもの:
  - drops: ランキングは**3位まで**（動画と合わせる）。budget: 4つの予算の機種と相場・選び方のルール。
  - 機種ページ（drops は1位・budget は注目）とトップのリンクに **utm を付ける**: `?utm_source=youtube&utm_medium=social&utm_campaign=shorts_YYYYMMDD`（budget は末尾に `_budget`。budget は予算別ページ /budget/under-50000 のリンクも）
  - 「VOICEVOX:<キャラクター名>」と「BGM: <曲名> - <アーティスト>（YouTube オーディオライブラリ）」。どちらも render が自動で入れる（BGM は `shorts/assets/bgm.json` の title・artist・source。曲を替えたら直す）
  - ハッシュタグ #中古iPhone #iPhone

## README.md から（ナレーションの drops 用の1行）

  - B・C の冒頭（hookNum・hookChart）は hook の文を読む。英字の機種名・GB・% は読み上げのときだけカナに直す（`speakable`）

## SKILL.md から（分かっていること・11/23 の整理前の原文）

### このチャンネルで分かっていること（10/26・ideas/2026-10-25.md の視聴維持の分析）
- 再生数を分けるのは Studio の動画の概要の「**視聴を継続**」（スワイプされずに見られた割合）。15%以上で 900〜1,230 回、12〜14% で 300〜700 回、12%未満で 100〜200 回。平均視聴率は再生数と関係が見えない → **出だしの1秒（つかみの絵と最初の声）を最優先で作る**。新しい型の判定は公開48時間の「視聴を継続」で
- 強い: 2つを比べて差額を言う型（電池 32.2%・Pro Max と Pro 26.5%）。声は青山龍星が高め（中央値 約17.5%）

### 公式に分かっていること（10/22 調査・ideas/2026-10-22.md）
- ショートはまず少数（シードオーディエンス）に見せ、反応しだいで広がる。本数のしきい値はなく量より質。速報もの以外は投稿時刻より中身と時事性（Todd Sherman・二次報道）
- 見る指標: Studio の「視聴を選んだ割合（vs スワイプ）」と「エンゲージビュー」（再生回数は 2025/3/31〜 多めに出る）。同じ形式どうしで比べる
- 2026/10/1〜 独自のコンテンツを優先。読み上げだけのナレーション・自動の音声・テンプレートの一括加工は独自とみなされない → **毎回テーマ・切り口・数字の解釈を変える**（自前データの分析であることを画面とナレーションで示す）
- 「1日2本まで・6時間あける・夜遅くを避ける」は公式の根拠がない、このチャンネルの目安（10/21 の3本目が伸びなかった1例から）
- ハッシュタグは説明欄に少数（最大3つがタイトル上に出る）
