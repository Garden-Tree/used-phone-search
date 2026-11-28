# YouTube ショート（shorts/）

サイトの相場と同じ数字から、縦 1080x1920・約40秒のショート動画（mp4）を作る。方針と根拠は `ideas/youtube-shorts.md`。

- このファイルは**コードの仕組み**（コマンド・テーマごとの選び方・声・見た目・締め）。**作って投稿する手順**（頻度・ネタ・確認・Studio・固定コメント・記録）は `.claude/skills/youtube-shorts/SKILL.md`
- **11/23〜 新しく作らない**（いまのショートは横動画の切り抜き＝`longform/clip-short.tsx`）。下は再開するときの決まり
- **11/23〜 は週2本・7:00・在庫数（stock 系）／電池（battery・batteryswap）／1世代前（gen・fold・watchgen・macgen・ipadgen・pixelgen）だけ**（`STATE.md`）。ここには続けるテーマだけを書く
- やめたテーマ（値下がり・予算別・状態ランク・2機種の差・新品／新型との比較・買取・広告の回・トーク型）の仕組みは `shorts/README-retired.md`（コードは残っていて動く）

## コマンド

```
npx tsx shorts/make-short.tsx stock plan --dir shorts/out/2026-10-29-stock             # 中古でいちばん出回っている iPhone は？在庫数ランキング（型 A だけ・10/27〜・つむぎ。Android 版は stockandroid・ずんだもん）
npx tsx shorts/make-short.tsx stockmacdesk plan         # 中古でいちばん多いデスクトップMac（Mac mini・iMac・Mac Studio）・在庫数ランキング（11/17〜・青山龍星・AI の0秒目なし＝--live は実写だけ）
npx tsx shorts/make-short.tsx stockmac plan             # 中古でいちばん多いMacBook・在庫数ランキング（型 A だけ・10/29〜・青山龍星）
npx tsx shorts/make-short.tsx stockipad plan            # 中古でいちばん多いiPad・在庫数ランキング（型 A だけ・11/2〜・ずんだもん）
npx tsx shorts/make-short.tsx stockwatch plan           # 中古でいちばん多いApple Watch・在庫数ランキング（型 A だけ・11/2〜・ずんだもん）
npx tsx shorts/make-short.tsx stockup plan              # 先週から在庫がいちばん増えた中古iPhone（型 A だけ・11/16〜・つむぎ。--down か stockdown で減った順）
npx tsx shorts/make-short.tsx battery plan              # 電池90%台だといくら高い？中古iPhone（型 A だけ・10/23〜・青山龍星。--small で差の小さい順）
npx tsx shorts/make-short.tsx batteryswap plan      # 電池交換を足すと、1つ上の世代と同じ値段？（shorts/out/<日付>-batteryswap/。型 A だけ・10/25〜）
npx tsx shorts/make-short.tsx gen plan                  # iPhone、1世代前にするといくら安い？（型 A だけ・10/23〜・ずんだもん）
npx tsx shorts/make-short.tsx fold plan             # 折りたたみの1世代前の差のテーマ（shorts/out/<日付>-fold/。型 A だけ）
npx tsx shorts/make-short.tsx fold render
npx tsx shorts/make-short.tsx watchgen plan --dir shorts/out/2026-10-28-watchgen   # Apple Watch、1世代前にするといくら安い？（型 A だけ・10/27〜・つむぎ）。--dir で公開日のフォルダに置ける
npx tsx shorts/make-short.tsx macgen plan --dir shorts/out/2026-10-29-macgen       # MacBook Air、1世代前にするといくら安い？（型 A だけ・10/27〜・ずんだもん）
npx tsx shorts/make-short.tsx ipadgen plan --dir shorts/out/2026-10-29-ipadgen     # iPad、1世代前にするといくら安い？（型 A だけ・10/27〜・つむぎ）
npx tsx shorts/make-short.tsx pixelgen plan --dir shorts/out/2026-10-30-pixelgen   # Google Pixel、1世代前にするといくら安い？（型 A だけ・10/27〜・ずんだもん）
npx tsx shorts/make-short.tsx gen plan --live ai        # 0秒目を AI のクリップに（テーマに合う1本・shorts/liveClips.ts の AI_CLIP_OF）。--live だけなら実写（pexels・pixabay）
npx tsx shorts/make-short.tsx fold render --no-bgm  # BGM なし（声と効果音だけ）の short-A-nobgm.mp4 と youtube-nobgm.txt（BGM のクレジットなし）
npx tsx shorts/make-short.tsx fold render --tiktok  # TikTok 用の short-A-tiktok.mp4（BGM なし・締めは「used.gadelog.com で検索」）
npx tsx shorts/make-short.tsx gen render --dir shorts/out/2026-10-23-gen --keep-frames
npx tsx shorts/make-short.tsx gen render --no-voice  # VOICEVOX の声を入れない
npx tsx shorts/make-short.tsx --voice-test "今週いちばん値下がりした中古iPhoneは？"   # 声だけ試す（shorts/out/voice-test.wav）。--speaker 3 / --speaker ずんだもん/ノーマル・--speed 1.25
npx tsx shorts/stills.tsx [stock battery …]            # 動画を作らず、各テーマの最新の台本から つかみ・ランキング・1位の発表 の静止画（shorts/out/looks/）と一覧 shorts/out/looks-contact.png を作る
npx tsx shorts/stills.tsx --outro [gen …]              # 締めの最後のコマだけ（関連動画の札・横動画のサムネ）。shorts/out/looks/<テーマ>-outro.png と looks-contact-outro.png
npx tsx shorts/safe-check.tsx [stockxperia …|--dir <フォルダ>]  # 安全な帯（y280〜1440・scenes.tsx の SAFE）の外に文字・数字・棒が出ていないかを全場面で確かめる（✗ を数える・帯の線を引いた画像は shorts/out/safe/）
npx tsx shorts/make-short.tsx --voice-dump script     # 最後に書いた台本の全ナレーションの読み（エンジンの読み → 直した読み）を出す。"テキスト" でも可。--speaker で話者を変えて試せる
```

`plan` は `shorts/out/<日付>-<テーマ>/script.json` を作る（あれば止まる。上書きは `--force`）。`render` は最新の台本から `short-A.mp4` と `youtube.txt` を作る。

## 続けるテーマ（`shorts/themes/`）

### 在庫数（stock 系）

- `stock`・`stockandroid`: 中古でいちばん出回っている iPhone／Android は？在庫数ランキング（型 A だけ。10/27〜。`themes/stock.ts` の `buildStockScript(date, kind)`、型 `StockScript`）
  - kind は iphone・android・mac・ipad・watch・pixel・pro・galaxy・mini・xperia・aquos・ipadpro・ipadair・fold・macdesk（テーマ名は stock／stockandroid／stockmac／stockipad／stockwatch／stockpixel／stockpro／stockgalaxy／stockmini／stockxperia／stockaquos／stockipadpro／stockipadair／stockfold／stockmacdesk）
  - 件数＝販売中・ジャンク品を除く在庫を、モデル名ごとに1回の groupBy で数え、`resolveModelNames` で機種にまとめる（表記ゆれを合算。機種ページのないモデル名は除く）。上位3機種だけ相場（在庫がいちばん多い容量の中央値・機種ページと同じ）を取る。割合は対象の合計に対して。最安は出さない
  - stockandroid は Pixel・Galaxy・Xperia・AQUOS をまとめる。ひと言は「機種ごとにアップデートの期限を確認」（1位が Pixel ならアップデート保証の終わり）
  - 声: stock つむぎ・stockandroid ずんだもん。見た目は ④ CONDITION＋つかみ `bars`。stock は締めに関連動画（いま買うならどれ）
  - 1位と2位が近いときは公開の前日に plan を `--force` で取り直す（取り直すと utm が作成日に戻るので直す）
  - stockxperia・stockaquos・stockipadpro（11/5〜）・stockipadair（11/8〜）は Xperia 版で同じ作り。161,980円のような額は声が「16万せん980」になるので narration は「約16.2万円」に（画面はそのまま）
  - 在庫の少ない機種群（iPad mini・AQUOS・iPad Pro・iPhone Pro）は伸びなかった（`STATE.md`）
- `stockmac`（10/29〜・`themes/stock.ts` の kind "mac"）: stock の MacBook 版。機種は `lib/macCatalog.ts` の MAC_MODELS、モデル名の頭 "MacBook" で groupBy 1回。店の数は activeMacShops（横動画と同じ5店）。帯「中古でいちばん多いMacBook／在庫数ランキング」。ひと言「在庫が多い機種ほど／メモリとSSDの／構成を選べます」。声 青山龍星・見た目 ④ CONDITION＋bars。リンクは1位の機種ページと /mac。utm `_stockmac`・#MacBook #中古MacBook。関連動画の締めなし
- `stockipad`・`stockwatch`（11/2〜・`themes/stock.ts` の kind "ipad"・"watch"）: stock の iPad・Apple Watch 版。機種は `lib/ipadCatalog.ts`・`lib/watchCatalog.ts`、モデル名の頭 "iPad"／"Apple Watch" で groupBy 1回。Watch の相場は在庫がいちばん多いケースのサイズ（mm）の中央値（注記・説明欄も「ケースのサイズ」）。店の数は IPAD_SHOPS／activeWatchShops。声 ずんだもん（stockandroid 42.1%）・見た目 ④ CONDITION＋bars。行の声は Watch は「Series 10」だけ、iPad の「(A16)」は読点に。「SE 3」はエスイースリー。リンクは1位の機種ページと /ipad・/watch。utm `_stockipad`・`_stockwatch`。関連動画の締めなし
- `stockmacdesk`（11/17〜・`themes/stock.ts` の kind "macdesk"）: stockmac のデスクトップ版。機種は MAC_DESKTOP_MODELS（Mac mini・iMac・Mac Studio）、groupBy 1回（MAC_DESKTOP_PREFIXES）。店の数は activeMacDesktopShops。帯「中古でいちばん多い／デスクトップMac」。ひと言は stockmac と同じ。見た目 ④ CONDITION＋bars。声 青山龍星。AI の0秒目（ai-stock.mp4）はスマホの絵なので対応させない（`--live` は実写だけ）。リンクは1位の機種ページと /mac。utm `_stockmacdesk`・#Macmini #中古Mac。関連動画なし。読み: Mac mini＝マックミニ・iMac＝アイマック・Mac Studio＝マックスタジオ（voice.ts の speakable）
- `stockup`・`stockdown`（11/16〜・`themes/stockup.ts`）: 「先週から在庫がいちばん増えた（減った）中古iPhoneは？」。場面は stock と同じ（StockScript に prev・diff・pct・fromDate・toDate）
  - 件数は価格推移の記録 PriceSnapshot の storage=0（全容量・販売中・Amazon を除く・ジャンク込み）。今週＝iPhone の記録の最新日、先週＝その7日前にいちばん近い日（前後3日）。機種ページのある iPhone で今週30件以上（`STOCKUP_MIN_COUNT`）・先週の記録がある機種だけ。増えた件数の多い順（同じなら率）・率は先週に対して。`stockup plan --down` か `stockdown plan` で減った順
  - DB は aggregate・日付の groupBy・2日分の storage=0 の行・上位3機種の primaryMedian だけ
  - 帯「先週から在庫が／いちばん増えた中古iPhone」、つかみ（実写）「先週から／いちばん増えたiPhoneは」（「中古」を入れると2行目が幅で縮むので外した）＋？？？の棒と「+◯件」、行は「+◯件（+◯%）／先週◯件 → 今週◯件」。ひと言の下書き「在庫が増えた機種は／電池や保証を／比べて選びやすい」（理由は言い切らない）。タイトル「先週から在庫がいちばん増えた中古iPhoneは<機種>！+<n>件ランキング」
  - 声 つむぎ・④ CONDITION＋bars・`--live ai` は ai-stock.mp4。utm `_stockup`・#中古iPhone #iPhone。関連動画の締めなし。「1,753件」の「3件」をサンゲンと読むので READING_FIXES で「3ケン」に

### 電池（battery・batteryswap）

- `battery`: 電池90%台だといくら高い？中古iPhone（型 A だけ・約39秒。10/23〜）。rank と同じ構成（hook → ranking → reveal（1位の電池80%台と90%台の2本の棒と件数・差額と率・Apple 公式の電池交換の料金）→ comment → outro）
  - 対象: iPhone 12〜16 の無印と Pro（`themes/battery.ts`）。容量は在庫がいちばん多い容量。電池は 90%台＝90〜99・80%台＝81〜89（100 は未使用品が多く、80 は「80%以上」とだけ書く店の値なので除く）。各帯の在庫5件以上。差（90%台 − 80%台）の大きい順、率は 80%台に対して
  - `plan --small`（10/29〜）: 差の**小さい順**（差0も入れる。80%台の方が高い機種は出さない）。「90%台も80%台も同じ値段」を出す回
  - 1位の差が Apple 公式の電池交換（`lib/appleRepairPrices.ts`）より安ければ、タイトル「…との差は○円！電池交換より安い」・ひと言「差額が電池交換より／安いなら／90%台が得です」。reveal の声は差額を額のまま読み（1万円未満）、交換の料金を続けて読む
  - 見た目は 墨（ink）の地・緑の下線の見出し・下に緑の厚い線のカード・つかみは縦の電池の形2つ。声は 青山龍星。utm の末尾は `_battery`
- `batteryswap`: 電池交換を足すと、1つ上の世代と同じ値段？（型 A だけ・約39秒。10/25〜・ずんだもん）
  - 組は古い方 → 1つ上の世代（`themes/batteryswap.ts` の PAIRS。無印 11→12〜16→17・12 mini→13 mini・Plus・Pro・Pro Max（〜18）・16e→17e・SE 第2→第3世代）。古い方に Apple 公式の電池交換の料金（`lib/appleRepairPrices.ts`）がある組だけ
  - 容量は gen と同じ（両方に在庫5件以上のいちばん小さい容量）。合計＝古い方の相場＋電池交換、差＝1つ上の相場−合計。**差の絶対値の小さい順**（「ほぼ同じ値段」が1位）。差が負なら1つ上の世代の方が安い
  - 場面 hook（「中古 ＋ 電池交換 ＝ 1つ上」の札3つ＋最小の差）→ ranking（行は「iPhone 13／14」、下段は容量・差・「1つ上が高い／安い」）→ reveal（古い方の相場と電池交換の積み上げの棒・1つ上の棒・差）→ comment → outro
  - ナレーション: ranking「3位は<古い方>と<1つ上の番号>、<容量>。差は<額>です。」・reveal「1位は<古い方>。電池交換を足すと、<合計>。<1つ上>の方が、<額>安いです。」（1つ上が高いなら「<1つ上>との差は、<額>だけです。」）。読み: 「1つ上」は「ヒトツジョウ」と読まれるので READING_FIXES で「ひとつうえ」
  - ひと言の下書きは、1つ上の方が安いなら「電池交換するより／1つ上の世代が／安く買えます」、ほかは「差がこれだけなら／1つ上の世代も／検討しましょう」。見出しの帯「電池交換を足すと／1つ上の世代と同じ値段？」・注記「電池交換はApple公式」。説明欄のリンクは両方の機種ページ。utm の末尾 `_batteryswap`・#中古iPhone #iPhone #電池交換。見た目 ④ CONDITION。関連動画の締めあり

### 1世代前（gen・fold・watchgen・macgen・ipadgen・pixelgen）

- `gen`: iPhone、1世代前にするといくら安い？（10/23〜・ずんだもん）。fold と同じ場面・同じ行の型（FoldRow。`themes/gen.ts`）。組は iPhone 12〜17 の無印・Pro の連続する2世代。容量は両方に在庫5件以上のいちばん小さい容量。差の大きい順。つかみは「最新 vs 1世代前」（③ VERSUS）。1世代前が 15 以降ならひと言は「USB-Cなので充電はそのまま」（声は narration.comment に「ユーエスビーシー」と書く。「USB-C」は「ユウエスビイ、シイ」と切れる）。utm の末尾 `_gen`
- `fold`: 折りたたみスマホ、1世代前にするといくら安い？（型 A だけ・約36秒。10/22〜・青山龍星）
  - 連続する2世代の組（`themes/fold.ts` の PAIRS: Galaxy Z Fold8→7・7→6・6→5、Galaxy Z Flip8→7・7→6・6→5、Pixel 11 Pro Fold→10 Pro Fold・10→9 Pro Fold。機種名は lib/galaxyCatalog.ts・lib/pixelCatalog.ts の表記）で、両方に在庫5件以上ある容量のうちいちばん小さい容量の相場（中央値）どうしを比べ、差額（新しい方 − 1世代前）の大きい順。率は新しい方の相場に対して。差が0以下の組は出さない。3組未満なら止まる
  - 場面 hook → ranking（3位・2位・伏せた1位。行は「Galaxy Z Fold8／Fold7」「Pixel 11 Pro Fold／10 Pro Fold」（長い名前は幅に合わせて縮む）・容量・−差額・−率）→ reveal（新しい方と1世代前の2本の棒・差額と率）→ comment → outro（「最新と1世代前、どっちにする？」）
  - 見出しの帯は「折りたたみスマホ／1世代前でいくら安い？」。下の注記は「中古は同じ容量の中央値」。見た目 ③ VERSUS（つかみは開いた折りたたみの形）
  - ナレーション: ranking「3位は<新>から<旧（Galaxy Z・Pixel を外す）>、<容量>。差は<額>です。」・reveal「1位は<新>から<旧>。1世代前にすると、約<X.X>万円、およそ<Y>%安くなります。」
  - 読み: Galaxy→ギャラクシー・Z→ゼット・Fold→フォールド・Flip→フリップ・Pixel→ピクセル（`voice.ts` の speakable）。ギャラクシー・ピクセルは機種名の頭として切る（`voiceTuning.ts` の BRANDS。切らないと「ピクセルジュウ/イチプロ…」で11が「10・1」に聞こえた）
  - 説明欄のリンクは1位の1世代前（安い方）の機種ページ。utm の campaign の末尾は `_fold`。ハッシュタグ #折りたたみスマホ #Galaxy #Pixel。ひと言の下書きは「折りたたみの中古は／画面の折り目を／確認しましょう」
- `watchgen`・`macgen`: Apple Watch／MacBook Air、1世代前にするといくら安い？（型 A だけ。10/27〜。予算別を減らして iPhone 以外の機種を出す回）
  - 場面・行は fold・gen と同じ（FoldRow・`FoldRanking`・`FoldReveal`）。台本の型は `WatchGenScript`・`MacGenScript`（`types.ts`）。差（新しい方 − 1世代前）の大きい順・率は新しい方に対して・差0以下は出さない・3組に満たなければ止める
  - watchgen（`themes/watchgen.ts`）: 組は Ultra 4→3→2→初代、Series 12→…→6、SE 3→第2世代→第1世代（`lib/watchCatalog.ts` の表記）。DB の storage はケースの mm。**ケースは機種ごとに在庫がいちばん多いサイズ**（Series は 10 から 42・46mm、9 までは 41・45mm で同じ大きさで比べられない。Ultra はどれも 49mm）。そのサイズの在庫が両方5件以上の組だけ。違うサイズの組は行に「46／45mm」（FoldRow の olderStorage）。注記「ケースは在庫がいちばん多いサイズ・中央値」・説明欄の選び方にも書く。説明欄のリンクは1位の1世代前の機種ページと /watch。utm `_watchgen`・#AppleWatch #中古。ひと言の下書き「中古のWatchは／電池の最大容量と／バンドの付属を確認」。声 つむぎ
  - macgen（`themes/macgen.ts`）: 組は Air 13インチ M5→M4→M3→M2→M1、15インチ M5→M4→M3→M2（`lib/macCatalog.ts`）。SSD は両方に在庫5件以上の最小の容量。ひと言は1位の1世代前・その容量の**メモリの内訳（DB の memoryGB の groupBy）**から（「M3の256GBは／メモリ8GBが59%／後から増やせません」）。分かる在庫が5件未満なら一般の注意。注記「中古は同じSSD容量の中央値」。リンクは /mac。utm `_macgen`・#MacBook #MacBookAir #中古。声 ずんだもん
  - 見た目は ⑤ PRO。つかみは**機器の形**（look.hook "device"・`DeviceHook`。時計の文字盤とバンド／開いたノート）に「最新」「1世代前」＋最大の差額。`hookLines` も効く。関連動画の締めはなし（iPhone ではない）
  - 読み: Series シリーズ（`voiceTuning.ts` の BRANDS で頭を切る。切らないと「シリーズジュウ/ニ」で12が「10・2」）・Ultra 2〜4 ウルトラツー〜フォー・M1〜M5 エムワン〜エムファイブ・mm ミリ・Watch ウォッチ・「（第2世代）」の全角括弧（`voice.ts` の speakable）
- `ipadgen`・`pixelgen`: iPad／Google Pixel、1世代前にするといくら安い？（型 A だけ。10/27〜。watchgen・macgen と同じ型の iPad・Pixel 版。`themes/ipadgen.ts`・`pixelgen.ts`、型 `IpadGenScript`・`PixelGenScript`）
  - 容量は macgen と同じ（両方に在庫5件以上の最小の容量）。差の大きい順・率は新しい方に対して・差0以下は出さない・3組に満たなければ止める
  - ipadgen: 組は 無印 A16→第10→第9→第8世代、Air 11インチ M4→M3→M2→Air（第5世代）→第4世代、Air 13インチ M4→M3→M2、Pro 11インチ M5→M4→第4→第3→第2→第1世代、Pro 13インチ M5→M4→Pro 12.9インチ（第6世代）→第5→第4→第3世代、mini A17 Pro→第6→第5世代（`lib/ipadCatalog.ts` の表記。mini (A20 Pro) は中古の在庫がまだないので入れない）。ひと言は1位の組の **Apple Pencil の対応**（`lib/ipadPencil.ts`・Apple 公式）: 1世代前で使えなくなる Pencil があれば「12.9インチ第6世代は／Pencil Proが／使えません」、なければ「同じものが使えます」。注記「中古は同じ容量の中央値・PencilはApple公式」。店の数は IPAD_SHOPS。リンクは /ipad。utm `_ipadgen`・#iPad #中古iPad #中古。声 つむぎ。見た目は ② BUDGET＋縦のタブレットの形
  - pixelgen: 組は 無印 11→10→9→8→7→6、Pro 11 Pro→10 Pro→9 Pro・8 Pro→7 Pro→6 Pro、Pro XL 11 Pro XL→10 Pro XL→9 Pro XL→8 Pro（8 Pro の後継は同じ大きさの 9 Pro XL）、a 10a→9a→8a→7a→6a（`lib/pixelCatalog.ts`。折りたたみは fold の回）。**1世代前のアップデート保証が終わった組は出さない**（10/27 は 7→6・7 Pro→6 Pro が対象外）。ひと言は1位の1世代前の**アップデート保証の終わり**（「Pixel 10 Pro XLも／アップデート保証は／2032年8月まで」）。注記「中古は同じ容量の中央値・アップデートはGoogle公式」。店の数は PIXEL_SHOPS。リンクは /pixel。utm `_pixelgen`・#Pixel #GooglePixel #中古。声 ずんだもん。見た目は ① DROPS＋カメラの帯のあるスマホの背面
  - 読み: 「無印iPadのA16から第10世代」「Pro 13インチのM4から12.9インチの第6世代」「Pixel 9 Pro XLから8 Pro」（`voice.ts` の devicePair）。Google はグウグル・XL はエックスエルで読める（10/27 の voice-dump）

### どのテーマにも効くオプション

`--no-bgm`（どのテーマでも）: BGM を入れずに書き出す（声と効果音だけ。声のコンプレッサー・効果音の下げ方・-11 LUFS の2パスは同じ）。出力は `short-<型>-nobgm.mp4` と `youtube-nobgm.txt`（BGM のクレジットなし）で、BGM 入りの版は上書きしない。YouTube のスマホアプリで投稿し、「音源を追加」で流行りの曲を付けるとき用（曲の音量はアプリで下げる）。

`--tiktok`（TikTok 用・10/27〜）: `--no-bgm` と同じ音で、締めだけ変えた `short-<型>-tiktok.mp4`（と `youtube-nobgm.txt`）。TikTok はプロフィールのリンクがフォロワー1,000人からで、関連動画もないため（`voice.ts` の `forTikTok`）:
  - 画面: 「プロフィールのリンクから」の行を外し、「全機種の相場は／used.gadelog.com（大きいまま）／で検索」。関連動画のサムネ・「▼ 下の関連動画から ▼」の札は出さない。問いの行はそのまま
  - 声: 「プロフィールのリンクから見られます」→「used.gadelog.com で見られます」（読みは「ユーズド・ガデログ・ドットコム」。`speakable` と `voice-dict.json` のガデログ）。「くわしい解説は、下の関連動画からどうぞ。」は外す。テーマごとの問いの文はそのまま
  - `tiktok-caption.ts` は `short-A-tiktok.mp4` があるかを見る（なければ書き出しのコマンドを出す）。運用は `.claude/skills/tiktok-ops/SKILL.md`

`--live`（plan のとき・11/9〜）: 0秒目を実写のつかみに（`script.json` の liveClip。素材名がなければ日付で順に選ぶ・`liveClips.ts`）。`--live ai`（11/16〜）はテーマに合う AI のクリップ（`AI_CLIP_OF`。対応がないテーマは止まる）。AI の回は render が `upload-note.txt` を書く（投稿の扱いはスキル）。

テーマを足すときは、`types.ts` に台本の型、`themes/` に「データ → 台本」、`voice.ts` に既定のナレーション、`scenes.tsx` に場面、`make-short.tsx` の `THEMES`・`THEME_SPEAKER` を足す。
同じテーマ・同じデータのショートを同じ日に2本出さない（ほぼ同じ内容は勧められにくい）。

## 前の回と同じ中身にしない（10/25〜）

- ランキング型（battery・gen・fold・batteryswap など）は数日では1位が変わらない（10/25 に作り直すと 10/22〜23 とほぼ同じだった）。plan の1位とタイトルを前の回と比べ、ほぼ同じなら作らない
- 声の実験は script.json の `voice.speaker` を書き換えて render する
- 出だしの実験（答えから始める）は script.json に `hookStyle: "answer"`・`hookLines`（つかみの大きな文字・問いの代わり）・`narration.hook`（答えの文）をそろえて書く。続けるテーマでは SplitHook（gen）・DeviceHook（watchgen・macgen・ipadgen・pixelgen）で効く（10/27〜。ほかのテーマの一覧は README-retired.md）
- plan のフォルダは `<作った日>-<テーマ>` なので、同じテーマを何本も作るときは、plan のたびにフォルダを公開日の名前に移し（例 `2026-10-29-stock`）、説明欄の utm の日付も公開日に直す。render は `--dir` でフォルダを指定する（指定しないと名前がいちばん後のフォルダを使う）

## 毎週の流れ

1. `plan` で台本を作る（DB の既存の集計だけ読む）
2. `script.json` の `scenes.comment.lines`（検品担当のひと言）を**自分の判断で書き換える**（3行まで・1行16字以内）。タイトル・説明文も確認
3. 声: VOICEVOX アプリを起動しておけば、`render` がナレーション（テーマごとの話者）を自動で入れる（下の「ナレーション」）。自分で録った声を使う週は `<出力先>/voice.m4a`（mp3・wav も可）を置くと、コメント場面はそちらが優先
4. `render` で `short-A.mp4` と `youtube.txt`（タイトル・説明・ハッシュタグ）を作る。mp4 を再生して確認
5. YouTube に上げる（API の自動投稿はしない。手順はスキル youtube-shorts）。同じ動画を X にも投稿する（11/17〜12/1 は Claude は X に触らない）

## ナレーション（VOICEVOX・任意）

- VOICEVOX アプリ（https://voicevox.hiroshiba.jp/ ）を入れて起動すると、エンジンが http://127.0.0.1:50021 で動く。`render` はそこへ文を送って WAV を作る。別の場所なら環境変数 `VOICEVOX_URL`
- **起動していなければ「接続できません」と出して、声なしで今まで通り書き出す**（止まらない）
- 読む文は `script.json` の `narration`（場面ごと: hook・ranking・reveal・trend・comment・outro）。書かない場面は既定の文（`shorts/voice.ts` の `defaultNarration`）、空文字 `""` にするとその場面は声なし
  - 既定（台本の数字だけ。`defaultNarration`）: hook「今週いちばん値下がりした中古iPhoneは…？」・ranking「3位は<機種>、マイナス<額>。2位は…」（1位は伏せる。ランキングの場面は 3位・2位・伏せた1位の3行だけ。文ごとに合成し、各行は「○位は」の声の 0.15 秒前に出る。声なしは決まった間隔。render がタイムライン（場面・行・声の秒）を出す）・reveal「1位は<機種>、<容量>。1週間で<額>、<率>%の値下がりです。相場は<前>から、<後>になりました。」・trend（A だけ・4秒）「<日付>に大きく下がりました。」（前の日からいちばん下がった日。画面は線・最初と最後の値・その日の印だけ）・comment は `comment.lines` だけ（札の「検品担当のひと言」は読まない。「〜でも」の後に読点、「おすすめ」で終われば「です」）・outro「全機種の相場は、プロフィールのリンクから見られます。来週の1位は、どの機種でしょう？」（ここの例は drops の文。ほかのテーマは `voice.ts` にテーマごとの既定がある）
  - `plan` は comment 以外を書き出す（comment は lines を直せば声も変わる）。「円安」は為替と聞き違えるので「マイナス○円」と読む
  - 英字の機種名・GB・% は読み上げのときだけカナに直す（`speakable`）
- 話者は `script.json` の `voice`: `{ "speaker": "春日部つむぎ/ノーマル", "speedScale": 1.25 }`。plan がテーマごとに書く（テーマごとに つむぎ・ずんだもん・青山龍星。`make-short.tsx` の `THEME_SPEAKER`）。ほかに `intonationScale`（抑揚）・`pitchScale`（音高）・`pauseLengthScale`（読点の間）も書ける（抑揚・音高は書かなければエンジンの既定。読点の間は書かなければ 0.5＝エンジンの半分。10/24〜）。speaker は ID か名前（`"春日部つむぎ/ノーマル"`・`"ずんだもん/ノーマル"`・`3`）。既定は 春日部つむぎ（ノーマル・標準の VOICEVOX で ID 8）
- 声は場面の頭から流れる。場面が「声＋0.5秒」より短ければ場面を延ばす（60秒を超えたら注意を出す）。声の間は効果音・BGM を下げ、声があるときは全体を -11 LUFS にそろえる
- **調声**（`shorts/voiceTuning.ts`）: ① `shorts/voice-dict.json` をユーザー辞書に登録（同じ語があれば上書き。語を足すときはこの JSON に書く）② エンジンの読み（AquesTalk 風）を規則で直す: 数字の細切れ（ニヒャク/ゴジュウ/ロク）をつなぐ（万の後は切る）・「アイフォン/ジュウナナ/プロマックス」に切る・「値下がり/した」をつなぐ ③ それでも変な文は `script.json` の `narrationKana`（例 `{ "reveal": "イチイ'ワ、アイフォ'ン/ジュウナ'ナ/..." }`）で場面ごとに読みを指定。`--voice-dump script` の after をコピーして直すのが早い
  - 「iPhone SE (第3世代)」は括弧を外して読ませる（括弧で間が空くため）。「○」は「マル」
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
- **声を使ったら `youtube.txt` の説明文の最後に「VOICEVOX:<キャラクター名>」（話者のキャラクター名）が自動で入る**。消さない。キャラクターごとに利用規約が違う（docs/voicevox-terms.md）

## BGM

YouTube オーディオライブラリで曲を選んでダウンロードし、`shorts/assets/bgm.mp3` に置く（Git には入らない）。なければ無音の音声トラックが付く。
曲名は `shorts/assets/bgm.json`（`title`・`artist`・`source`。Git に入る）に書く。bgm.mp3 があれば、render が説明文に「BGM: 曲名 - アーティスト（入手元）」を入れる。曲を替えたら JSON も直す。音量は 4% で一定、最後の3秒で小さくする。

## テーマごとの見た目（`looks.ts`）

中身の型ごとに地・見出しの帯・カード・強調色を変え、テーマごとにつかみ（1コマ目）を変える（10/22〜・10/23 に5つへ。テンプレートの一括加工と見られないように・1コマ目でスワイプされないように）。色は `lib/brandColors.ts` だけ、文字のコントラストは 4.5 以上（比は looks.ts の頭）。場面の長さ・声・音・順位の札の色は全テーマ同じ。

**見た目は5つ**（10/23 ユーザーの指示「多くても5種類」。`LOOKS`）。テーマごとに変えるのは**つかみ（1コマ目）だけ**。

**続けて公開するショートは、前の回と違う見た目（①〜⑤）にする**（10/24 15:00 の値下がり1か月 → 10/25 8:00 の galaxybudget が同じ①で続いた）。

続けるテーマの分（11/23 までの全テーマの表は `README-retired.md`）:

| 見た目 | 地 | 見出しの帯 | カード | 強調 | 使うテーマ（つかみ） |
| --- | --- | --- | --- | --- | --- |
| ① 値下がり DROPS | 紺 brand900 | 赤 price・左右いっぱい | 角丸28・縁なし | price | pixelgen（カメラの帯のあるスマホの形＋最大の差額） |
| ② 予算別 BUDGET | 明るい ground | 藍 brand600・角丸の箱 | 灰の縁＋影 | price（札は brand600） | ipadgen（縦のタブレットの形＋最大の差額） |
| ③ 比べる VERSUS | 紺 brand900 | 藍の札・左寄せ・左に緑の線 | 左に緑の線 | safe | gen（「A vs B」＋最大の差額）・fold（開いた折りたたみの形） |
| ④ 状態の差 CONDITION | 生成り inspect50 | 墨 ink・角丸の箱 | 琥珀の線の縁＋影 | price | battery（縦の電池の形）・batteryswap（「中古＋電池交換＝1つ上」の札）・stock 系すべて（横の棒3本・1位だけ「？？？」＋「最多 ○件」） |
| ⑤ Pro の予算別 PRO | 墨 ink | 淡い金 inspectLine・丸い端（墨の文字） | 金の縁 | price（札は inspect700） | watchgen・macgen（時計・ノートの形＋最大の差額） |
## 締めの関連動画（札と横動画のサムネ）

関連動画につながるテーマ（`types.ts` の RELATED_LONG_THEMES）は、締めの「▼ くわしい解説は 下の関連動画で」の札が出るまで締めの動きを延ばす（`scenes.tsx` の TIMELINE。10/23 まで札が動画に出ていなかった）。

締めの横動画のサムネ（10/26〜。YouTube 公式ブログ 2026/7/14 の関連動画の流入ガイド「最後の5秒で声と画面の両方で誘導し、横動画のサムネを見せる」）: 関連動画につながるテーマは、締めで声の「くわしい解説は、下の関連動画からどうぞ」に合わせて、札「くわしい解説はこちら」・横動画のサムネ（`longform/<フォルダ>/thumbnail.png`＝A 案・幅780px・16:9・地が紺なら白、明るい地なら灰の縁）・「▼ 下の関連動画から ▼」を出す。上の文字は小さくして詰める（安全な帯 y280〜1440 の中。組んだ高さ 1200 を縮めて入れる。11/14〜）。

- テーマ → 横動画（ID・題・`longform/<フォルダ>`）は `shorts/relatedLong.ts` の RELATED_LONG だけに書く。YouTube Studio の「関連動画」もこの表と同じにする。出すのは RELATED_LONG_THEMES（声で誘導するテーマ）だけ
  - 続けるテーマで締めの札が出るのは stock・battery・batteryswap・gen（11/23 の relatedLong.ts: stock → いま買うならどれ・battery／batteryswap → バッテリー何%（2026-10-29-battery）・gen → 何世代まで）。stockipad などは RELATED_LONG にあっても RELATED_LONG_THEMES にないので札は出ない（Studio の関連動画は表どおりに付ける）。対応は毎回 relatedLong.ts を見る
- サムネは `longform/<フォルダ>/thumbnail.png`（Git に入らない）を幅720px の JPEG にして data URL で埋め込む（ffmpeg）。ファイルがなければ文字の札だけ（止まらない）。
- 出る時刻は声の「くわしい解説は…」の始まりの目安（読みのモーラ数の割合・`relatedLineStart`。キャッシュの声で実際の無音の区切りと ±0.15 秒）。声がなければ 2.2k 秒。render のタイムラインに「締めの関連動画の札」の行が出る。
- 確かめ方: `npx tsx shorts/stills.tsx --outro gen battery`（`shorts/out/looks/<テーマ>-outro.png`・一覧 `shorts/out/looks-contact-outro.png`）。
- 新しい横動画を作ったら RELATED_LONG を直す（ID は公開してから）。

## セーフエリア

YouTube の画面表示に隠れる上 280px・下 480px・右 190px には文字を置かない（`scenes.tsx` の `SAFE`。11/14・11/16〜。それまでは上 220・下 420・右 140）。

- 値は `shorts/scenes.tsx` の `SAFE = { top: 280, bottom: 480, right: 190 }` の1か所（公式の数値はなく、出どころはその上のコメント）。帯 y280〜572・内容 y578〜1358（図だけの場面は幅 920 で組み、Frame が 87% に縮めて x70〜874 に入れる（縁・影の分を残す）。見出しの帯・注記・実写の文字は幅 820 の箱 `BOX` の中で中央そろえ＝中心 x480）・注記 y1364〜1440。実写のつかみは2行が y280 から、図が y1440 で終わる。
- 見出しの帯の2行は必ず同じ大きさ（長い方の行に合わせる）。実写の回で題が長く文字が小さくなる型は、`scenes.tsx` の LIVE_HEAD_TITLE に短い題を足して大きくする（上限 124px）
- `safe-check.tsx` は全場面を図だけ・実写の両方で作り、帯の外と右の 190px（x>890）に出た場面を「✗」で数え、帯の線を引いた画像と一覧を `shorts/out/safe/` に書く。

## 運用の決まり

- 長さと配置は統一し、見た目はテーマごとに変える（`looks.ts`）。~~テーマは毎週ローテーション（値下がり → 予算 → 2機種比較 → 豆知識）~~ → **11/23〜 は週2本・7:00・在庫数／電池／1世代前だけ**（スキル youtube-shorts の「11/23〜 の決まり」）。
- **毎回、検品担当のひと言を人が書く**。テンプレートだけの繰り返し動画は収益化の対象外になりうる（ideas/youtube-shorts.md）。
