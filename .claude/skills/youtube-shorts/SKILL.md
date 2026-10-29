---
name: youtube-shorts
description: used.gadelog.com の YouTube ショート（@used_gadelog「中古スマホ一括検索」）を作って投稿する。台本の作成（DB の相場）→ VOICEVOX 春日部つむぎのナレーション → BGM・音圧 → 書き出し → ユーザー確認 → YouTube Studio で投稿（説明欄に utm 付きリンクとクレジット）まで。ユーザーが「ショート作って」「動画作って」「YouTube にあげて」「今週のショート」などと言ったときに使う。
---

# YouTube ショートの作り方（@used_gadelog）

週1本。テーマを回す: **drops**（今週いちばん値下がりした中古iPhone のランキング）・**budget**（予算ぴったりで買える中古iPhone。10/21〜）・**newused**（新品より中古でいくら安い？ 10/21〜）・**provs**（Proと無印、同じ容量でいくら違う？ 10/22〜）・**fold**（折りたたみスマホ、1世代前にするといくら安い？ 10/22〜）・**pixelbudget**（予算ぴったりで買える中古Pixel 10/22〜）・**ipadbudget**（予算ぴったりで買える中古iPad 10/23〜）・**rank**（状態ランクでいくら違う？中古iPhone 10/22〜）・**battery**（電池90%台だといくら高い？中古iPhone 10/23〜）・**gen**（iPhone、1世代前にするといくら安い？ 10/23〜・ずんだもん）・**storage**（容量を1つ上げるといくら高い？中古iPhone 10/23〜・つむぎ）・**promax**（Pro MaxとPro、同じ容量でいくら違う？ 10/23〜・青山龍星）・**macbudget**（予算ぴったりで買える中古MacBook 10/23〜・つむぎ）・**probudget**（予算ぴったりで買える中古iPhone Pro 10/24〜・つむぎ）・**foldbudget**（予算ぴったりで買える中古折りたたみスマホ 10/24〜・青山龍星）・**ios27line**（iOS 27 に対応する、いちばん安い中古iPhoneは？ 10/25〜・ずんだもん）・**batteryswap**（電池交換を足すと、1つ上の世代と同じ値段？ 10/25〜・ずんだもん）・**overnew**（中古なのに新品より高い？新品との差がいちばん小さい中古iPhone 10/25〜・ずんだもん）・**plusvs**（Plusと無印、同じ容量でいくら違う？ 10/25〜・青山龍星）・**minie**（無印より安い“弟分”（mini・e）、いくら安い？ 10/26〜・青山龍星）・**unused**（未使用品（ランクS）は、中古（ランクA）よりいくら高い？ 10/26〜・青山龍星）・**plusmax**（大画面はPlusとPro Max、同じ容量でいくら違う？ 10/26〜・春日部つむぎ）・**oldpro**（1世代前のProと最新の無印、どっちが安い？ 10/26〜・ずんだもん）・**bigbudget**（予算ぴったりで買える 大きい画面の中古iPhone 10/26〜・つむぎ）・**rakutenmobile**（楽天モバイルは使った量で3段階｜中古iPhone 14と2年でいくら？ **広告の回・PR** 10/26〜・つむぎ）・**mbpvsair**（MacBook AirとPro、中古ならどっちが安い？ 10/29〜・青山龍星）・**watchbudget**（予算ぴったりで買える中古Apple Watch 10/29〜・つむぎ）・**stockmac**（中古でいちばん多いMacBook・在庫数ランキング 10/29〜・青山龍星）・**kaitorishop**（同じiPhoneでも、売る店でいくら違う？買取価格の3店の差 10/29〜・青山龍星）。
チャンネルの説明「値下がりランキングや予算別のおすすめ」に合わせる。
仕組みの説明は `shorts/README.md` と `docs/youtube-shorts.md`。記録は `ideas/YYYY-MM-DD.md`。報告は日本語。
このスキルの「決まっていること」は、10/21 にユーザーと何度も作り直して決めたもの。**勝手に元に戻さない**。

## 1回分の手順

1. **準備**
   - VOICEVOX アプリが起動しているか確かめる: `curl -s http://127.0.0.1:50021/version`。起動していなければ、ユーザーに起動を頼む。声なしで作らない。
   - BGM `shorts/assets/bgm.mp3` があるか確かめる。git には入らないので、別の PC では置き直す。
2. **台本**: `npx tsx shorts/make-short.tsx <drops|budget|pixelbudget|ipadbudget|macbudget|probudget|foldbudget|galaxybudget|bigbudget|newused|provs|promax|plusvs|plusmax|oldpro|minie|fold|rank|unused|battery|gen|storage|ios27line|batteryswap|overnew|rakutenmobile|mbpvsair|watchbudget|stockmac|kaitorishop> plan`
   - `shorts/out/<日付>-<テーマ>/script.json` ができる（すでにあれば止まる。上書きは `--force`）。
   - drops: 1〜3位。budget: 予算（3万・5万・7万・10万円）ごとの機種と相場、注目（5万円の行）の最安・在庫数。newused: 新品と中古の相場の差の1〜3位（候補の全機種も出る）。provs: 無印と Pro の相場の差の1〜3位（候補の全組と、1位の無印の容量を上げたときの差も出る）。fold: 折りたたみの新しい方と1世代前の相場の差の1〜3位（候補の全組も出る）。
   - 検品担当のひと言（`comment.lines`）、ナレーション、説明文を確かめる。
   - **前の回と同じ中身にしない**（10/25）: ランキング型（provs・plusvs・plusmax・oldpro・minie・unused・battery・rank・gen・storage・newused・fold・ios27line・batteryswap・overnew）は数日では1位が変わらない。plan の1位とタイトルを前の回（shorts/out の同じテーマ）と比べ、ほぼ同じなら作らない。予算別（budget・ipadbudget・pixelbudget・foldbudget・watchbudget）は `--budgets 40000,60000,90000,130000 --pick 40000` で予算を変えて作れる。**予算と相場は1万円以内**（帯 (max(前の予算, 予算−1万円), 予算]。外れたら plan がエラー）。過去の回の行（shorts/out の script.json）と同じ機種が並ばない予算を選ぶ
   - **声を変えて試す**（10/25〜の実験）: script.json の `voice.speaker` を書き換える（例 "ずんだもん/ノーマル"）。1本で変えるのは1つだけ。結果は公開48時間後の再生数と「視聴を選んだ割合」で ideas に記録
   - ひと言は下書き。古めの機種ならバッテリーと状態ランク、のように中身に合わせて直す。
3. **読みを確かめる**: `npx tsx shorts/make-short.tsx --voice-dump script`（最後に書いた台本・その台本の話者で）
   - アクセント句の直す前と後が出る。機種名・数字が細切れになっていないかを見る。
   - 直らない場面は、script.json の `narrationKana` に読みを書く。
4. **書き出し**: `npx tsx shorts/make-short.tsx <drops|budget|pixelbudget|ipadbudget|macbudget|probudget|foldbudget|galaxybudget|bigbudget|newused|provs|promax|plusvs|plusmax|oldpro|minie|fold|rank|unused|battery|gen|storage|ios27line|batteryswap|overnew|rakutenmobile|mbpvsair|watchbudget|stockmac|kaitorishop> render`
   - drops は A・B・C の3本、ほかは A の1本と、`youtube.txt` ができる。
   - **`--no-bgm`**: BGM なし（声と効果音だけ・音量の決め方は同じ）の `short-A-nobgm.mp4` と `youtube-nobgm.txt`（BGM のクレジットなし）。ユーザーが YouTube のスマホアプリで投稿し、「音源を追加」で流行りの曲を付けるとき用。BGM 入りの版とは別のファイル。重い処理なので、render は1本ずつ（同時に走らせない。この PC は負荷で落ちる）。
   - 長さ（60秒以内。今は30〜35秒）、音量（-11 LUFS 前後）、タイムライン（場面・行・声の秒）を確かめる。
   - 静止画で、ランキング・1位の発表・グラフ・ひと言を見る: `ffmpeg -ss <秒> -i short-A.mp4 -frames:v 1 x.png` を Read で開く。
5. **ユーザーに見せる**: A を SendUserFile で送り、OK をもらう。**投稿はユーザーの OK のあと**。
6. **投稿**（「YouTube 投稿」を参照）→ 記録とコミット。

## 決まっていること（作り直しで決めたもの）

### 構成（型 A が標準）
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
- fold: **hook → ranking（3位・2位・伏せた1位）→ reveal（1位の新しい方と1世代前の相場の2本の棒・差額と率）→ comment → outro**（型 A だけ・約36秒。10/22〜）。
  - 組: 連続する2世代（新しい方→1世代前）。Galaxy Z Fold8→7・7→6・6→5、Galaxy Z Flip8→7・7→6・6→5、Pixel 11 Pro Fold→10 Pro Fold・10→9 Pro Fold（`shorts/themes/fold.ts` の PAIRS。機種名は lib/galaxyCatalog.ts・lib/pixelCatalog.ts の表記）。容量は両方に在庫5件以上ある容量のうちいちばん小さい容量（10/22 はすべて 256GB）。相場（中央値）どうしの差（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。差が0以下の組は出さない。
  - 行の機種名は「Galaxy Z Fold8／Fold7」「Pixel 11 Pro Fold／10 Pro Fold」（長い名前は幅に合わせて縮む）。下段は 容量・−差額・−率。見出しの帯は「折りたたみスマホ／1世代前でいくら安い？」。下の注記は「中古は同じ容量の中央値」。
  - 説明欄のリンクは1位の**1世代前（安い方）**の機種ページ。utm の campaign の末尾は `_fold`。ハッシュタグ #折りたたみスマホ #Galaxy #Pixel。ひと言の下書きは「折りたたみの中古は／画面の折り目を／確認しましょう」。
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
- battery: rank と同じ構成（hook → ranking → reveal（1位の電池80%台と90%台の2本の棒と件数・差額と率・Apple 公式の電池交換の料金）→ comment → outro・約39秒。10/23〜）。
  - 対象: iPhone 12〜16 の無印と Pro（`shorts/themes/battery.ts`）。容量は在庫がいちばん多い容量。電池は 90%台＝90〜99・80%台＝81〜89（100 は未使用品が多く、80 は「80%以上」とだけ書く店の値なので除く）。各帯の在庫5件以上。差（90%台 − 80%台）の大きい順、率は 80%台に対して。
  - 1位の差が Apple 公式の電池交換（`lib/appleRepairPrices.ts`）より安ければ、タイトル「…との差は○円！電池交換より安い」・ひと言「差額が電池交換より／安いなら／90%台が得です」。reveal の声は差額を額のまま読み（1万円未満）、交換の料金を続けて読む。
  - 見た目は 墨（ink）の地・緑の下線の見出し・下に緑の厚い線のカード・つかみは縦の電池の形2つ。声は 青山龍星。utm の末尾は `_battery`。
- gen: fold と同じ場面・同じ行の型（FoldRow。`shorts/themes/gen.ts`）。組は iPhone 12〜17 の無印・Pro の連続する2世代。容量は両方に在庫5件以上のいちばん小さい容量。差の大きい順。つかみは「最新 vs 1世代前」。1世代前が 15 以降ならひと言は「USB-Cなので充電はそのまま」（声は narration.comment に「ユーエスビーシー」と書く。「USB-C」は「ユウエスビイ、シイ」と切れる）。utm の末尾 `_gen`
- storage: iPhone 13〜17 の無印・Pro で、在庫5件以上のいちばん小さい容量と次の容量の相場の差を、**差の小さい順**に（`shorts/themes/storage.ts`）。つかみは「128GB vs 256GB」と「最小 +○円」。reveal の声は「…にしても、○円しか変わりません」。utm の末尾 `_storage`
- ios27line: 場面は newused と同じ並び（`shorts/themes/ios27line.ts`・約38秒）。対象は iOS 27 対応の iPhone（`lib/catalog.ts` の IPHONE_CATALOG・Apple 公式 apple.com/jp/ios/）、相場（在庫がいちばん多い容量の中央値・在庫5件以上）の**安い順**。1位に同じ容量の **iOS 27 非対応（LEGACY_SERIES）で発売がいちばん新しい機種**との差を添える（10/25 は SE 第2世代 20,680円 vs XR 19,580円）。つかみはスマホの形に「iOS 27」「対応」の札＋最安の相場。見た目は VERSUS。reveal の声は容量を読まない。読み iOS→アイオーエス・XR→テンアール。utm の末尾 `_ios27line`
- batteryswap: 場面は newused と同じ並び（`shorts/themes/batteryswap.ts`・約39秒）。組は古い方→1つ上の世代（無印・mini・Plus・Pro・Pro Max・e・SE。古い方に Apple 公式の電池交換の料金があるものだけ）、容量は gen と同じ。合計＝古い方の相場＋電池交換、差＝1つ上の相場−合計の**絶対値の小さい順**。つかみは「中古 ＋ 電池交換 ＝ 1つ上」の札3つ。reveal は積み上げの棒（相場＋電池交換）と1つ上の棒。見た目は CONDITION。「1つ上」は READING_FIXES で「ひとつうえ」（ずんだもんが「ヒトツジョウ」と読んだ）。utm の末尾 `_batteryswap`
- overnew: newused の裏返し（`shorts/themes/overnew.ts`・約38秒）。対象と容量は newused と同じで、**中古の相場÷新品の高い順**（中古が新品以上の機種も入れる）。つかみは新品 100% と中古の割合の2本の棒。1位が新品以上なら「新品より +○円」。見た目は BUDGET。公式価格のある機種は6つなので、作る前に newused の回と並びが重ならないか確かめる。utm の末尾 `_overnew`
- 3テーマとも声は ずんだもん（ノーマル・です・ます）。公開順 ios27line ③ → batteryswap ④ → overnew ② で、直前の galaxybudget ①と続けて同じ見た目にならないように選んだ。関連動画の締めあり
- rakutenmobile（**広告の回・楽天アフィリエイト**。`shorts/themes/rakutenmobile.ts`・10/26〜）: 横動画11本目の案2。hook（題・料金の階段・2年で差）→ ranking（料金の3段を声に合わせて上から）→ reveal（中古 iPhone 14 128GB の相場＋月額×24 の3本と上と下の段の差）→ comment → outro。料金は Rakuten最強プラン（税込・割引なし）の公式の値だけ（TIERS・`lib/simPlans.ts` の SIM_PRICES_CHECKED。作る日に公式で開き直す）
  - **PR**: 声では読まない（ユーザー 10/26）・左上に小さく「PR」（全場面）・説明欄の1行目「【PR】この動画は楽天アフィリエイトの広告を含みます。」・タイトルの頭に【PR】
  - **楽天モバイルのリンクはショートの説明欄・固定コメント・返信に貼らない**（横動画の説明欄だけ）。ポイント・キャンペーン・特典・「最安」「実質0円」「必ず安い」「無料」「お得」・ほかの会社の料金・すぐの解約や乗り換えは、声・画面・説明欄・コメントのどこにも出さない
  - 見た目は ⑥ AD（5つの例外。明るい地・ピンク #D9005B の下線と札）。声は 春日部つむぎ。utm の末尾 `_rakutenmobile`。関連動画の締めは横動画11本目の ID が分かってから（`relatedLong.ts` の RAKUTEN_MOBILE に ID → `types.ts` の RELATED_LONG_THEMES に足す）
- watchgen・macgen（10/27〜・予算別を減らして iPhone 以外を出す回。`shorts/themes/watchgen.ts`・`macgen.ts`）: fold・gen と同じ場面・同じ行（FoldRow）。「Apple Watch／MacBook Air、1世代前にするといくら安い？」。差（新しい方 − 1世代前）の大きい順・率は新しい方に対して・差0以下は出さない
  - watchgen: 組は Ultra 4→3→2→初代・Series 12→…→6・SE 3→第2→第1世代（`lib/watchCatalog.ts` の表記）。DB の storage はケースの mm。**ケースは機種ごとに在庫がいちばん多いサイズ**（Series は世代で 45→46mm と変わる。Ultra はどれも 49mm）、そのサイズの在庫が両方5件以上の組だけ。サイズが違う組は行に「46／45mm」。注記「ケースは在庫がいちばん多いサイズ・中央値」・説明欄の選び方にも書く。リンクは1位の1世代前の機種ページと /watch。utm `_watchgen`・#AppleWatch #中古。声 つむぎ
  - macgen: 組は Air 13インチ M5→M4→M3→M2→M1・15インチ M5→M4→M3→M2（`lib/macCatalog.ts`）。SSD は両方に在庫5件以上の最小の容量。ひと言は1位の1世代前・その容量の**メモリの内訳（memoryGB の groupBy）**から（分かる在庫5件未満なら一般の注意）。リンクは /mac。utm `_macgen`・#MacBook #MacBookAir #中古。声 ずんだもん
  - 見た目は ⑤ PRO、つかみは機器の形（look.hook "device"。時計の文字盤とバンド／開いたノート＋最大の差額）。関連動画の締めはなし（iPhone ではない）
  - 読み: Series シリーズ（voiceTuning の BRANDS で頭を切る）・Ultra 2〜4 ウルトラツー〜フォー・M1〜M5 エムワン〜エムファイブ・mm ミリ・Watch ウォッチ（`voice.ts` の speakable）
- stock・stockandroid（10/27〜・`shorts/themes/stock.ts`）: 中古でいちばん出回っている iPhone／Android の在庫数ランキング。件数は販売中・ジャンク除く・表記ゆれを機種にまとめる（groupBy 1回）。上位3機種の相場（中央値・容量つき）と全体に占める割合。声 stock つむぎ・stockandroid ずんだもん。見た目 ④ CONDITION＋つかみ bars。1位と2位が近ければ公開前日に取り直す
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
- stockmac（10/29〜・`shorts/themes/stock.ts` の kind "mac"）: stock の MacBook 版。機種は `lib/macCatalog.ts` の MAC_MODELS、モデル名の頭 "MacBook" で groupBy 1回。店の数は activeMacShops（横動画と同じ5店）。帯「中古でいちばん多いMacBook／在庫数ランキング」。ひと言「在庫が多い機種ほど／メモリとSSDの／構成を選べます」。声 青山龍星・見た目 ④ CONDITION＋bars。リンクは1位の機種ページと /mac。utm `_stockmac`・#MacBook #中古MacBook。関連動画の締めなし
- kaitorishop（10/29〜・`shorts/themes/kaitorishop.ts`）: 「同じiPhoneでも、売る店でいくら違う？」。買取の3店（ネットオフ 美品・にこスマ 良品・モバステ 中古の上限＝きれいな状態。`lib/buybackPrices.ts`）の、同じ機種・同じ容量の**最高値−最安値の大きい順**。容量は**3店すべてに価格があるいちばん小さい容量**。DB は表 BuybackPrice の groupBy 1回だけ
  - つかみは**答えから**（「同じiPhone 15 Pro Max／256GBでも、売る店で／買取価格が違う」＋高い店と安い店の札＋「差 25,000円」。声も差額まで言う）。1位は3店の棒（店の名前の札）と差・率・「各店の公式・○/○更新」
  - 帯「同じiPhoneでも／売る店でいくら違う？」・注記「買取価格は各店の公式・○/○更新・きれいな状態」。説明欄の選び方にも同じ文。見た目 ③ VERSUS＋split。声 青山龍星。リンク /iphone/kaitori・utm `_kaitorishop`・#中古iPhone #iPhone #買取。ひと言「売る前に／3店の買取を／比べましょう」・締め「あなたは、どこで売りますか？」
  - 買取価格は週1回の更新なので、**更新日が変わってから**作り直す。関連動画の締めは買取の横動画が公開されてから
- ipadgen・pixelgen（10/27〜・watchgen・macgen と同じ型の iPad・Pixel 版。`shorts/themes/ipadgen.ts`・`pixelgen.ts`）: 容量は macgen と同じ（両方に在庫5件以上の最小の容量）
  - ipadgen: 組は 無印 A16→第10→第9→第8・Air 11 M4→M3→M2→Air 第5→第4・Air 13 M4→M3→M2・Pro 11 M5→M4→第4→…→第1・Pro 13 M5→M4→12.9 第6→…→第3・mini A17 Pro→第6→第5（A20 Pro は在庫なしで入れない）。ひと言は1位の組の Apple Pencil の対応（`lib/ipadPencil.ts`）。リンク /ipad・utm `_ipadgen`・声 つむぎ・見た目 ② BUDGET＋タブレットの形
  - pixelgen: 組は 無印 11→…→6・Pro 11 Pro→10 Pro→9 Pro・8 Pro→7 Pro→6 Pro・Pro XL 11→10→9 Pro XL→8 Pro・a 10a→…→6a（折りたたみは fold）。1世代前のアップデート保証が終わった組は出さない。ひと言は1位の1世代前のアップデート保証の終わり（`lib/pixelCatalog.ts`）。リンク /pixel・utm `_pixelgen`・声 ずんだもん・見た目 ① DROPS＋カメラの帯のスマホの形
- **ランキングは3位・2位・1位（伏せ字）の3行だけ。** 4位・5位は出さない。空いた分、行と文字を大きくする（行の高さ 260px、機種名は最大80px で、幅に合わせて縮める）。
- **ランキングの行は、声に合わせて出す。** 声は文ごとに合成し、各行は「○位は」の0.15秒前に出す。決まった間隔では出さない。
- **上部の見出しの帯は大きく**（上の行は最大52px、題は2行で最大104px）。
  - 帯の上端は y250 以上に置く。YouTube の上部のボタンに隠れないように。
- **場面の間に空白を作らない。**
  - 声のある場面の長さは「声の終わり＋0.5秒」。
  - 文字やグラフは、場面の頭から出す（出る動きは0.25秒）。
- **推移グラフ（trend）はシンプルに。** 線・最初と最後の値・大きく下がった日の印だけにする。場面は約3秒。

- **声の実験（10/26）**: plusmax（つむぎ）と oldpro（ずんだもん）は、伸びた比べる型（plusvs・provs・promax）を 青山龍星 以外の声で出し、青山龍星 が本当に強いかを見る。

### ナレーション（VOICEVOX）
- **標準の声は 春日部つむぎ（ノーマル）**。drops と budget はこの声（10/21 ユーザーの指示。1本目の drops だけ ずんだもん）。
  - **rank・gen・ios27line・batteryswap・overnew・oldpro・macgen・pixelgen は ずんだもん（ノーマル）**（mbpvsair・stockmac・kaitorishop は 青山龍星、watchbudget は つむぎ。10/29）（10/22・10/25。口調は です・ます のまま。クレジット「VOICEVOX:ずんだもん」。規約は docs/youtube-shorts.md）。pixelbudget は 春日部つむぎ。
  - **newused・provs・promax・plusvs・minie・unused・fold・foldbudget・ipadbudget は 青山龍星（ノーマル）**（macbudget・probudget・plusmax・watchgen・ipadgen は 春日部つむぎ）（10/21・10/22 ユーザーの指示。クレジット「VOICEVOX:青山龍星」。法人が関わる利用は事前に ななはぴ へ確認。docs/youtube-shorts.md）。
  - 名前で指定する（`voice.ts` の `DEFAULT_SPEAKER`・`make-short.tsx` の `THEME_SPEAKER`）。ID はエンジンの GET /speakers から引く（この PC では 8）。
  - 説明欄のクレジットは「VOICEVOX:春日部つむぎ」（公式の規約で商用可・クレジット必須。10/21 確認。docs/youtube-shorts.md）。
  - 説明欄のクレジット「VOICEVOX:<キャラクター名>」は render が自動で入れる。
  - 話者を変えたら `--voice-dump` で読みを、render のタイムラインで長さを見直す（話者で間合いが違う）。キャラクターごとの規約を読んでから使う（docs/youtube-shorts.md）。
- **速さ 1.25倍**（`voice.speedScale`）。**読点・句点の間は半分（pauseLengthScale 0.5・`voice.ts` の DEFAULT_PAUSE）**。エンジンの既定だと「、」ごとに約0.4秒あいて間延びした（10/24 ユーザー「ポーズが長い、半分くらいで」）。場面の切り替わりの間（声のあと0.5秒）は今のまま。口調は「です・ます」。「のだ」口調は使わない。
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
- 数字はすべて台本のデータから。作り話や推測の数字は入れない。
- **調声**: `shorts/voiceTuning.ts`（句の切れ目の直し）と `shorts/voice-dict.json`（ユーザー辞書16語。render の前に自動で登録）。
  - 数字は1つの句につなぐ。機種名は「ブランド／番号／型名」で分ける。「した」「します」は前の句につなぐ。
  - 「−8,000円」は「マイナス8,000円」と読ませる（「円安」と聞き違えないように）。問いかけは「？」で終える。
  - **長音を延ばす**: エンジンは「ジュウ」「パア」「ソオ」の伸ばす音を母音だけのモーラで持ち、その長さが 0.03〜0.07 秒しかない（つむぎで「じゅよん」「ぱせんと」と聞こえた）。合成の直前に、前の母音を伸ばすモーラ（ア段+ア・イ段+イ・ウ段+ウ・オ段+オ／ウ）の母音を 0.12 秒以上にする（`lengthenLongVowels`）。読みの「ー」はエンジンが受け付けない（400）。`--voice-dump` の「長音」「モーラ」の行で確かめる。
  - 「iPhone SE (第3世代)」は括弧を外して読ませる（括弧で間が空くため）。「○」は「マル」。
  - 型名・「相場」の後ろにくっついた数字は切り離す（`voiceTuning.ts` の 2b・TUNING_VERSION 6・10/23）: 「エ'アアジュウ/サンイ'ンチ」→「エ'アア/ジュウサンイ'ンチ」、「ソオバジュウ'/ヨンマ'ン」→「ソオバ'/ジュウヨンマ'ン」（10万円台の相場で出る）
- **締めの関連動画の札**（「▼ くわしい解説は 下の関連動画で」）は締めの 2.2k 秒に出る。10/23 に、締めの動き（anim）が 1.2k+0.4 秒で止まって札が動画に出ない不具合を直した（`scenes.tsx` の TIMELINE が関連テーマの締めの anim を延ばす）。静止画は締めの最後のコマで札を確かめる
- **締めに横動画のサムネを出す**（10/26〜。YouTube 公式ブログ 2026/7/14 の関連動画の流入ガイド「最後の5秒で声と画面の両方で誘導し、横動画のサムネを見せる」）
  - テーマ → 横動画の対応は **`shorts/relatedLong.ts` の RELATED_LONG だけ**に書く（ID・題・longform のフォルダ）。出すのは RELATED_LONG_THEMES（声で誘導するテーマ）だけ。ipadbudget は表にあるが、声の誘導がないので札は出ない
  - 画面: 小さくした上の文字（「全機種の相場は…」・URL・注記・問い）の下に、札「くわしい解説はこちら」→ 横動画のサムネ（`longform/<フォルダ>/thumbnail.png`＝A 案・幅780px・16:9・地が紺なら白、明るい地なら灰の縁）→「▼ 下の関連動画から ▼」。置く範囲は y270〜1470（上 250・下 440 を避ける）
  - 出る時刻: 声の「くわしい解説は…」の始まり（エンジンの読みのモーラ数から目安を出す。`relatedLineStart`。キャッシュの声で実際の無音の区切りと ±0.15 秒）。声がない・読みがないときは 2.2k 秒。render のタイムラインに「締めの関連動画の札」の行が出る
  - サムネは幅 720px の JPEG にして data URL で埋め込む（ffmpeg）。**サムネのファイルは Git に入らない**ので、ない PC では前の文字の札だけになる（止まらない）
  - 確かめ方: `npx tsx shorts/stills.tsx --outro <テーマ…>`（締めの最後のコマ。`shorts/out/looks/<テーマ>-outro.png`・一覧 `looks-contact-outro.png`）
  - 新しい横動画を作ったら RELATED_LONG を直す（ID は公開してから。bigbudget の 2026-10-28-big-screen はまだ ID なし）

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
- 各場面で読む文（fold）:
  - hook: 「折りたたみスマホ、1世代前にすると、いくら安い？」
  - ranking: 「3位は<新>から<旧>、<容量>。差は<額>です。」を 3位・2位（旧は Galaxy Z・Pixel を外す。例「3位はGalaxy Z Fold8からFold7、256GB。差は66,000円です。」）
  - reveal: 「1位は<新>から<旧>。1世代前にすると、約<X.X>万円、およそ<Y>%安くなります。」
  - comment: ひと言の本文だけ。outro: 「全機種の相場は、プロフィールのリンクから見られます。あなたなら、最新と1世代前、どっちにしますか？」
  - 読み: Galaxy ギャラクシー・Z ゼット・Fold フォールド・Flip フリップ・Pixel ピクセル・8a ハチエー・XL エックスエル（`voice.ts` の speakable）。ギャラクシー・ピクセルは機種名の頭として切る（`voiceTuning.ts` の BRANDS。切らないと「ピクセルジュウ/イチ…」で11が「10・1」に聞こえる）

- 各場面で読む文（pixelbudget）: budget と同じで、hook「予算ぴったりで買える中古Pixelは…？」・reveal「注目は5万円の<機種>。相場<額>、アップデートは<年>年<月>月までです。」・outro「…あなたの予算なら、どのPixelにしますか？」
- 各場面で読む文（ipadbudget）: budget と同じで、hook「予算ぴったりで買える中古iPadは…？」・ranking「5万円なら、iPad (第9世代)、相場43,670円です。」（括弧のチップ名は読点に「iPad Pro 11インチ、M4」）・reveal「注目は5万円の<機種>。相場<額>、在庫は<台数>台です。」・outro「…あなたの予算なら、どのiPadにしますか？」
- 各場面で読む文（rank）:
  - hook: 「状態ランクで、中古iPhoneはいくら違う？」
  - ranking: 「3位は<機種>、<容量>。ランクAより、ランクCが<額>安いです。」を 3位・2位
  - reveal: 「1位は<機種>。ランクCにすると、約<X.X>万円、およそ<Y>%安くなります。」（容量は画面だけ。読むと40秒を超えた）
  - outro: 「全機種の相場は、プロフィールのリンクから見られます。あなたなら、ランクAとランクC、どちらにしますか？」
  - 「ランクAとC」は1字ずつ切れる（ラ'ンク/エ'イ/ト'/シ'イ）。「ランクA」「ランクC」と書くと `voiceTuning.ts` の 6 で「ランクエ'イト」のように1つの句になる

### 音
- **BGM**: YouTube オーディオライブラリの「帰属表示が不要」な曲（今は「Okay For Now - Televisions」）。歌の入った曲は使わない。
  - **音量は 4% で一定。** 声の切れ目で上げ下げしない（一瞬大きくなるのを嫌った）。最後の3秒だけ小さくしていく。
- **音圧は大きく、特に声。**
  - 声: コンプレッサー（threshold 0.1・ratio 3・makeup 2）をかけて1.3倍。
  - 全体: loudnorm の2パスで -11 LUFS（LRA 7・TP -1）。効果音は声の間 25%。
  - YouTube は再生時に -14 前後へ下げるので、効くのは「声と BGM の差」。

### テーマごとに見た目を変える（10/22〜・`shorts/looks.ts`）
- 2026/10 の方針（テンプレートの一括加工は独自とみなさない）と、1コマ目が毎回同じだとスワイプされやすいことから、**中身の型ごとに地・帯・カード・強調色を変え（5つ）、テーマごとにつかみを変える**。テーマを選べば自動で決まる（手で選ばない）。
- **つかみ（hook）は t=0 で絵がそろっている**（出る動きなし）。数字は台本の1位の値（「最大」）。画像・ロゴ・製品写真は使わず、文字と図形だけ。
- 変えないもの: 帯の位置（y250〜570）・文字の大きさ・行と声の同期・場面の長さ・声・音・順位の札の色（1位 price・2位 inkMute・3位 inspect700）・ランク A・B・C の色・検品担当の札（inspect700）。
- 確かめ方: `npx tsx shorts/stills.tsx [テーマ…]` で各テーマの最新の台本から つかみ・ランキング・1位の発表 の3枚だけ作り、`shorts/out/looks-contact.png` に並べる（mp4 は作らない）。

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

### 色
- **サイトの色にそろえる。** すべて `lib/brandColors.ts` から取る（`app/globals.css` と同じ値）。
- 紺の背景には `ON_DARK`（同じ色の系統で明るくした版）を使う。文字はコントラスト比4.5以上。
  - brand800 の地では ON_DARK.price（4.27）を文字に使わない（safe 7.54・inspect 5.30 は可）。明るい地（ground・brand50・inspect50）の文字は ink・inkSub・price・safe（4.9 以上）。比は `shorts/looks.ts` の頭に書いた。
- 順位の札は、1位が price（赤）、2位が ink-mute（灰）、3位が inspect-700（琥珀）。

## YouTube 投稿（ユーザーの Chrome・YouTube Studio）

- **説明欄**（`youtube.txt`。`shorts/themes/<テーマ>.ts` が作る）に入れるもの:
  - drops: ランキングは**3位まで**（動画と合わせる）。budget: 4つの予算の機種と相場・選び方のルール。
  - 機種ページ（drops は1位・budget は注目）とトップのリンクに **utm を付ける**: `?utm_source=youtube&utm_medium=social&utm_campaign=shorts_YYYYMMDD`（budget は末尾に `_budget`。budget は予算別ページ /budget/under-50000 のリンクも）
  - 「VOICEVOX:<キャラクター名>」と「BGM: <曲名> - <アーティスト>（YouTube オーディオライブラリ）」。どちらも render が自動で入れる（BGM は `shorts/assets/bgm.json` の title・artist・source。曲を替えたら直す）
  - ハッシュタグ #中古iPhone #iPhone
  - ショートの説明欄のリンクは押せない（2023年8月〜）。押せる入口はチャンネルのページのリンク（`utm_medium=channel`）と、締めのナレーション。
- **手順**
  1. 「作成」→「動画をアップロード」→ ファイル入力に `file_upload` で short-A.mp4 を入れる。
  2. タイトルの欄を座標でクリック → ctrl+a → type。説明の欄の位置は JS で取り直す（タグの候補が出ると位置がずれる）。
  3. 入力後、**Escape を押さない。** 押すとアップロードの画面ごと閉じる。閉じたときは、「コンテンツ」の行の「ドラフトを編集」で戻れる（タイトルと説明は保存されている）。
  4. 設定: 「いいえ、子ども向けではありません」・詳細設定を表示 →「有料プロモーションなし」・改変/合成コンテンツ「いいえ」（キャラクター音声で、実在の人をリアルに見せていないため）。
  5. 次へ ×3 → チェックで問題がないことを確かめる →「公開」→ 公開ボタン。
  6. 共有画面の URL（youtube.com/shorts/<ID>）を控える。
  - **関連動画**（Studio の詳細の「関連動画」）は、`shorts/relatedLong.ts` の RELATED_LONG でそのテーマに書いた横動画（ID）にする。締めの画面に出るサムネと同じ動画でないといけない（画面と行き先が食い違う）。表と違う動画にしたいときは、先に表を直してから書き出す
  7. **公開されたら問いかけの固定コメント**（10/25〜）: `youtube.com/shorts/<ID>` で開き（watch?v= はショートの画面に切り替わる・10/29）、右の「コメント」ボタン → 下の「コメントする…」をクリック（activeElement が contenteditable-root か確かめる）→ type →「コメント」→ ⋮ →「固定」→ 確認の「固定」。締めの声と同じ向きの問い（例「あなたの予算なら、どの○○にしますか？」）を1行書いて ⋮ →「固定」。リンクは入れない（押せない）。文字は computer の type で入れる。コメントが来たら相場を引いて返す
  - 公開済みの動画の説明欄は、Studio の動画の詳細で直せる（`#save`）。
- **同じテーマ・同じデータのショートを同じ日に2本出さない。** 2本目を作るときはテーマを変える（drops の次は budget など）。
- **同じ動画を同じ日に2本上げない。** 10/21 に BGM 入りの版を上げ直したら、初動が 1回 対 84回 だった（ほぼ同じ内容は勧められにくい）。直したい点は公開前に直す。公開後なら次の週に回す。
- 動画の削除はしない（ユーザーがする）。非公開・公開の切り替えは、ユーザーの指示があればする。
- チャンネル名は「中古スマホ一括検索」（サイト名と同じ）。名前の変更は14日で2回まで。

## このチャンネルで分かっていること（10/26・ideas/2026-10-25.md の視聴維持の分析）
- 再生数を分けるのは Studio の動画の概要の「**視聴を継続**」（スワイプされずに見られた割合）。15%以上で 900〜1,230 回、12〜14% で 300〜700 回、12%未満で 100〜200 回。平均視聴率は再生数と関係が見えない → **出だしの1秒（つかみの絵と最初の声）を最優先で作る**。新しい型の判定は公開48時間の「視聴を継続」で
- 強い: 2つを比べて差額を言う型（電池 32.2%・Pro Max と Pro 26.5%）。声は青山龍星が高め（中央値 約17.5%）

## 公式に分かっていること（10/22 調査・ideas/2026-10-22.md）
- ショートはまず少数（シードオーディエンス）に見せ、反応しだいで広がる。本数のしきい値はなく量より質。速報もの以外は投稿時刻より中身と時事性（Todd Sherman・二次報道）
- 見る指標: Studio の「視聴を選んだ割合（vs スワイプ）」と「エンゲージビュー」（再生回数は 2025/3/31〜 多めに出る）。同じ形式どうしで比べる
- 2026/10/1〜 独自のコンテンツを優先。読み上げだけのナレーション・自動の音声・テンプレートの一括加工は独自とみなされない → **毎回テーマ・切り口・数字の解釈を変える**（自前データの分析であることを画面とナレーションで示す）
- 「1日2本まで・6時間あける・夜遅くを避ける」は公式の根拠がない、このチャンネルの目安（10/21 の3本目が伸びなかった1例から）
- ハッシュタグは説明欄に少数（最大3つがタイトル上に出る）

## 記録とコミット
- `ideas/YYYY-MM-DD.md` に記録する: 動画の URL・型・長さ・音量・1〜3位・直したこと。
- STATE.md の「次にやる」の YouTube の行を更新する（5KB 以内）。
- コードを変えたときは、`shorts/README.md` と `docs/youtube-shorts.md` も直す。
- 数日後、YouTube Studio の再生数と、GA の参照元 `youtube`（utm_source=youtube）を見る。
