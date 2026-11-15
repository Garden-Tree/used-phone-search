# 2026-11-15 Mac デスクトップ（Mac mini・iMac・Mac Studio）を足す（ブランチ add-mac-desktop）

背景は ideas/2026-11-15.md（夕方: 次に足す製品の調査）。本番デプロイ・サーバーの fetch.php の更新はしていない。

## 関門: Apple シリコンの在庫は何件か（11/15・楽天の公開の店内検索・5,000円以上・読むだけ）

| 店 | Mac mini | iMac | Mac Studio | 計 |
| --- | --- | --- | --- | --- |
| じゃんぱら（394812） | AS 128・Intel 18 | AS 11・Intel 16 | AS 1 | AS 140・Intel 34 |
| ソフマップ（281084） | AS 91・Intel 5 | AS 6・Intel 27 | AS 3 | AS 100・Intel 32 |
| イオシス（220897） | AS 21・Intel 3 | 0（AirPods Max などの関連だけ） | 0（MacBook の関連だけ） | AS 21・Intel 3 |
| 計 | AS 240 | AS 17 | AS 4 | **AS 約260・Intel 約70** |

- 数え方: 商品名に Mac mini／iMac／Mac Studio があり、M1〜M6 のチップ名があるものを AS。Core・Intel・Xeon・Fusion・年式だけ（2017・2018/2020 など）を Intel。キーボード（MX KEYS MINI for Mac）・ドッキングステーション・カメラのレンズ（MACRO）は除く
- チップ別: Mac mini M4 151・M4 Pro 26・M1 25・M2 19・M2 Pro 14・M6 3、iMac M1 10・M4 5、Mac Studio M4 Max 3・M1 Max 1
- 100件を超えたので作った。ほとんど Mac mini（M4 が6割）。iMac・Mac Studio は少ない

## 作り
- MacBook と同じ `/mac/<slug>`・同じ種類 `mac`（メモリ／SSD の表・ランクB以上の結論・macOS 27 の行）。機種名は `Mac mini M4`・`iMac M3`・`Mac Studio M2 Ultra`
- `lib/macCatalog.ts` に `MAC_DESKTOP_CATALOG`・`MAC_DESKTOP_INFO`・`canonicalMacDesktopModel`・`parseMacDesktopSpec`（メモリの上限を 512GB に）。`MAC_MODELS`（MacBook）は変えない
- `/mac` の一覧は、MacBook の欄・件数・タイトル・説明文は変えず、下に「Mac デスクトップ」の欄（在庫がある機種だけ・在庫がなければ欄ごと出さない）
- 機種ページ: 基本スペックの欄（発売年・チップ・iMac は 24インチ・識別名・出典）とパンくずの名前（「中古Mac（MacBook・デスクトップ）」）だけ MacBook と違う
- トップのタイル「MacBook」→「Mac」（件数にデスクトップを含める）。検索の種類のタブ「MacBook」→「Mac」（MacBook とデスクトップを両方出す）
- 同じ予算の他機種は MacBook どうし・デスクトップどうし（`lib/sameBudget.ts`）
- 在庫ゼロの機種ページは既存の仕組みで noindex・サイトマップから外れる（`ALL_DEVICE_PAGE_MODELS` の末尾に足した）
- 店: `MAC_DESKTOP_SHOPS`（楽天の3店。PC WRAP・Qualit は入れない）・`activeMacDesktopShops`

## 機種（19。Apple 公式で 11/15 に確かめた）
- Mac mini: M6（2026）・M5 Pro（2026）・M4 Pro／M4（2024）・M2 Pro／M2（2023）・M1（2020）
- iMac（24インチ）: M6（2026）・M4（2024）・M3（2023）・M1（2021）
- Mac Studio: M5 Ultra／M5 Max（2026）・M3 Ultra／M4 Max（2025）・M2 Ultra／M2 Max（2023）・M1 Ultra／M1 Max（2022）
- 対象は macOS 27 の対応機種（https://www.apple.com/jp/os/macos/ 「Appleシリコン搭載iMac（2021以降）」「Appleシリコン搭載Mac mini（2020以降）」「Mac Studio（2022以降）」）
- 部品番号・発売年: Mac mini の識別 https://support.apple.com/ja-jp/102852 ・iMac の識別 https://support.apple.com/ja-jp/108054 ・Mac Studio の識別 https://support.apple.com/ja-jp/102231
- チップの確認: Mac mini (2024) 技術仕様 https://support.apple.com/ja-jp/121555 （M4／M4 Pro）・iMac (24インチ, 2024) https://support.apple.com/ja-jp/121556 （M4）・iMac (24インチ, M6) https://support.apple.com/ja-jp/148298 ・Mac mini（M6またはM5 Pro） https://support.apple.com/ja-jp/128108 ・Mac Studio（M5 MaxまたはM5 Ultra） https://support.apple.com/ja-jp/128107 ・iMac 2023 は製品ページの名前「iMac (24インチ, M3, 2023)」

## テスト
- `npm run test:mac-desktop`（scripts/test-mac-desktop.ts）: 実物の商品名 61件（3店）＋想定 6件・19機種 → **読み違い 0**。Intel（Core・Xeon・Fusion・年式だけ）・iMac Pro・キーボード・ドッキングステーションは行にならない。CTO（部品番号なし）・整備品（F〜）・米国版（LL/A）・M4／M4 Pro の表の分け方・ゲオは取らない・iPhone の振り分けが変わらない、も確かめた
- 既存のテスト（normalizers・mac・xperia-aquos・oppo-xiaomi・watch・galaxy-pixel-watch・rakuten-pc）すべて OK。`npx tsc --noEmit`・eslint OK。`next build` はしていない（本番の DB を読むため）

## 楽天の要求数（fetch.php の MAC_SHOP_CODES に Mac mini・iMac・Mac Studio を足した。サーバーには上げていない）
- 1ページ30件: じゃんぱら 6＋1＋1、ソフマップ 4＋2＋1、イオシス 2＋1＋1 → **1回 約19要求（3店の合計）**。1日4回で 約76。ゲオの要求数（約1,026/1,500）には影響なし
- API は 1円以上で引くので件数は店内検索より少し増えうる。実数は反映後の fetch.log「fetched … with N requests」で見る

## 残っていること・不確か
- **本番に出すには**: ①このブランチを main へ ②サーバーの rakuten-sync/fetch.php を差し替え（cron はそのまま）。①だけだと在庫が入らず、デスクトップのページは全部 noindex・`/mac` の欄も出ない（害はない）
- 公式の表の「MWUPxx/A」（iMac 2024 2ポート）は 3 が抜けているので表に入れず、商品名の文字で決める。Mac Studio M1 Max の部品番号は公式どおり MJMV2
- Mac mini (2024) の MDAP4・MDAQ4・MDAY4 は M4 か M4 Pro か表から分からない → 商品名にチップがなければ行にしない
- iMac の色・ポート数（2ポート／4ポート）は分けていない（同じ機種ページ）
- /health の監視にデスクトップは入れていない（データが入るまで 0件で失敗になるため）。入ったあとで足すか決める

## 出す前の直し（11/15 夜・ユーザー了承で本番へ）
- 色が「-」・空の商品はカードの色の部分を出さない（`specLine`。「Mac mini M1 256GB・-」→「Mac mini M1 256GB」）。色がある機種は今までどおり
- デスクトップの機種ページは「バッテリー最大容量別の最安値」を出さない（MacBook は今までどおり）
- `/mac` の title・h1 を「中古Mac…（MacBook・Mac mini・iMac）」に。title の「◯円から（機種）・N機種」はデスクトップも含めて数える。MacBook の出典は MacBook の欄のすぐ下へ
- `/mac/<slug>` の OG 画像の alt を「中古Macの最安値・価格比較」に（alt は静的なので MacBook も同じ）
- 検索のメモリの絞り込みに 96・128・192・256・512GB（Mac Studio）
