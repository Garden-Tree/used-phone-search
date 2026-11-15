# 2026-11-15 motorola・arrows の追加（ブランチ add-motorola-arrows・未反映）

ユーザーの了承はブランチでの実装まで。本番への反映と、サーバーの `rakuten-sync/fetch.php` を上げるかは 11/20 に判断。

## 足したもの
- `lib/motorolaCatalog.ts`（37機種）・`lib/arrowsCatalog.ts`（11機種）。形は OPPO（b9a75ad）と同じ。型番 → 名前の順で機種を決める（`buildNameMatcher`）
  - motorola: razr 12（fold・60 ultra・60・60s・60d・50 ultra・50・50s・50d・40 ultra・40・40s）、edge 11（70 fusion・60 pro・60s pro・60・50 pro・50s pro・40 neo・40・30 pro・20 fusion・20）、moto g/e 14（g37j・g06・g66j 5G・g66y 5G・g05・g64 5G・g64y 5G・g53j 5G・g13・g32・g52j 5G・g31・g100・e32s）
  - 機種名は頭に "motorola " をそろえた（"motorola moto g66j 5G"）。一覧・店の数・検索を先頭の語で見分けるため（Xiaomi の "Xiaomi Redmi …" と同じ）
  - arrows: Alpha2・Alpha・We3・We2 Plus・We2・We・N・NX9・5G・Be4 Plus・Be4（2020年以降のスマホ。ケータイ・Tab は入れない）
- `lib/rakutenAndroid.ts`: 4店の読み取り。店ごとの違い
  - ゲオ: 容量が "[256G]"・"[128GB/8GB]"・"[128GB ]"、"SIMフリー" が機種名の前に来る商品がある
  - じゃんぱら: メーカーが "MOTOROLA"・"FCNT"・"Fujitsu"。容量が書かれていない商品（moto g06・razr 60）は、国内版で SIMフリー版の容量が公式で1つの機種だけその容量
  - 色: "PANTONE Laurel Oak(ローレルオーク)" は括弧の中、"PANTONE Black Oyster" は英語のまま
  - イオシス: 容量が名前にない。arrows は型番の容量表（FCNT・ドコモの仕様で ROM が1つの型番）、motorola はキャリア専売の機種と国内版の SIMフリー版だけ
- `/motorola`・`/arrows` の一覧と機種ページ・OG 画像。トップの2段目の後ろにタイル2つ、/search のタブの末尾に2つ。在庫が0件のあいだは一覧を noindex・サイトマップに入れない（/galaxy-watch と同じ）
- 監視: `lib/health.ts` に2種類。取り込みが始まるまで（全店の合計が0件のあいだ）は「○○ が0件」を出さない（PENDING_UNTIL_INGESTED）
- Amazon の検索・予算別ページには入れない。比較用スペック（compareSpecOf）は motorola 17機種・arrows 11機種
- `lib/androidCommon.ts` の buildNameMatcher: 語幹がブランドの語だけになる "arrows 5G" を語幹（"arrows"）で当てないようにした（OPPO・Xiaomi は該当なし。test:oppo-xiaomi は変わらず OK）

## 出典（11/15 に開いた）
- motorola: 公式「all smartphones」 https://www.motorola.com/jp/ja/smartphones の各機種ページ（機種・容量・チップ・画面）。キャリア版はソフトバンクの製品ページ（razr 60s・50s・40s、edge 60s pro・50s pro の発売日と容量）、ドコモの製品仕様（razr 60d M-51F・razr 50d M-51E）、Y!mobile のお知らせ（moto g66y 5G は 2025年7月）
- arrows: FCNT https://www.fcnt.com/product/arrows/ と仕様ページ `/spec/<型番>/`（Alpha2・Alpha・We3・We2 Plus・We2）、ドコモの製品仕様（N・We・Be4 Plus・NX9・5G・Be4）、au「FCNTの製品情報一覧」（We FCG01）、ソフトバンクのオンラインマニュアルと 2021/11/25 のプレスリリース（We A101FC・12月3日）

## 公式で確かめられず、入れていないもの
- motorola の SIMフリー版の発売日（製品ページに記載なし・プレスリリースの一覧が開けない）→ released は null。キャリア版 7機種だけ発売日あり
- motorola の型番（XT 番号・ソフトバンクの A×××MO・au の MOG01/02）→ ドコモの M-51F・M-51E だけ。機種は名前で決める
- moto g53y 5G（Y!mobile のページが 403 で開けない）→ カタログに入れていない（実際の商品名にはある: ゲオ・イオシス）
- 比較用スペックから外した motorola: razr fold・razr 60（公式の仕様の表が razr 60 ultra と同じ値で食い違う）・razr 60 ultra・razr 50・razr 40 ultra・edge 50 pro（日本のページの中身が India）・edge 40・moto g13・g100（画面の欄が他機種と同じ定型文）・edge 30 pro・edge 20・キャリア専売
- arrows の au（FCG01）・SoftBank（A101FC）の容量 → イオシスの容量表に入れていない
- OS アップデート・セキュリティ更新の方針はどちらも null

## テスト（npm run test:motorola-arrows）
- 楽天4店の実際の商品名（11/15 の店内検索。店舗名・ランクだけ違う重複は1件に）333件 → 292件を行にした。**誤読 0**（書式が読めない 0・カタログ外が行になった 0）
  - ゲオ 167中141・じゃんぱら 70中66・ソフマップ 53中53・イオシス 43中32。motorola 207中175・arrows 126中117
  - 行にしない 41件: カタログ外 25（moto g8・g50・g30・g10・g53y・g24・edge X30 など）・ケータイ／Tab 9・容量が決まらない 7（イオシスの g37j・razr fold・UQ 版 edge 60 など）
  - キャリアなし 2件（mineo・IIJmio）・色の記載なし 1件（ソフマップ "motorola edge 60 128GB PBAJ0003JP"）
- 手書きの表 60件・名前 79件、既存の test:oppo-xiaomi・test:android・test:normalize・test:watch・test:mac・test:galaxy-pixel-watch はすべて OK。`npx tsc --noEmit`・eslint もエラーなし
- `next build` は本番 DB を読むので回していない（反映前にプレビューで見る必要がある）

## 楽天 API の要求数の見込み（fetch.php の ANDROID_KEYWORDS に2語）
店内検索の件数（11/15）÷30件/ページ（切り上げ）。どれも 3,000件未満なので価格帯の分割なし。

| 店 | motorola | arrows | 要求 |
| --- | ---: | ---: | ---: |
| ゲオ | 739件 → 25 | 254件 → 9 | 34 |
| じゃんぱら | 212 → 8 | 286 → 10 | 18 |
| ソフマップ | 217 → 8 | 74 → 3 | 11 |
| イオシス | 38 → 2 | 19 → 1 | 3 |
| 計 | | | **約66/回** |

- ゲオは 約1,026 → 約1,060/1,500（上限まで約440）。1日4回で 約+264 要求
- API は商品説明も検索するので、店内検索より多く当たるかもしれない（"arrows" はアクセサリなど）。反映したら fetch.log の「fetched … with N requests」で確かめる

## 残っていること（11/20 の判断のとき）
1. 本番に出すか（トップのタイル・/search のタブが増える。それ以外の既存ページの HTML は変えていないはず。ビルドしての差分は未確認）
2. 出すなら `rakuten-sync/fetch.php` をサーバーへ（そのときから在庫が入る。入るまでは一覧が noindex）
3. motorola の SIMフリー版の発売日・moto g53y 5G は公式で確かめられたら足す
