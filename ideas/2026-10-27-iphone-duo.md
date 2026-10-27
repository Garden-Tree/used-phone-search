# iPhone Duo の下調べ（2026-10-27）

中古在庫が出たらすぐ機種ページを出せるように、公式の値と足す場所をまとめた。**コードはまだ変えていない**。

## 在庫（10/27 確認）

- DB `DeviceInventory` を groupBy（modelName に「Duo」を含む・大小区別なし、店・売り切れ別）→ **0件**。color・URL に「duo」を含む行も0件
- 取り込みの入口はすでに通してある（10/21）: `lib/iphoneModelName.ts` の MODEL_RE に `Duo`、SIM ロックなし扱いは `lib/rakutenGeo.ts`・`lib/rakutenIosys.ts`・`scraper/common.py`
- **まだ通らない入口**（Air も同じ）:
  - `scraper/daiwan_scraper.py:100`・`scraper/mmoba_scraper.py:91` の機種名の正規表現が `\d+e?|X[SR]?|SE|8|7` だけで、「iPhone Duo」「iPhone Air」を拾わない
  - `scraper/nicosuma_scraper.py` の IPHONE_COLLECTIONS に Duo（と 18 Pro 系）のコレクションが無い（にこスマ側の URL は未確認）

## 公式の値（10/27 確認）

出典:
- A: 技術仕様 https://www.apple.com/jp/iphone-duo/specs/
- B: 購入ページ https://www.apple.com/jp/shop/buy-iphone/iphone-duo
- C: ニュースリリース https://www.apple.com/jp/newsroom/2026/09/apple-unveils-iphone-duo/ （日付「2026 年 9 月 9 日」）
- D: iPhone のモデルを識別する https://support.apple.com/ja-jp/108044
- E: サポートの技術仕様 https://support.apple.com/ja-jp/148588
- F: 修理料金（保証対象外）`https://support.apple.com/ols/api/pricing/products/services/pricing-estimate?locale=ja-jp&pricing_type=OOW&parent_tag_id=TAG_1754518739895` の「iPhone Duo」

| 項目 | 値 | 出典 |
| --- | --- | --- |
| 正式名 | iPhone Duo | A・D |
| 予約・発売 | 「10月16日（金）午後9時（日本時間）から…予約注文を開始し」「10月23日（金）から販売を開始します」 | C |
| 発売年 | 「発売年：2026」 | D |
| チップ | A20 Pro | A・C・E |
| 画面 | 外側「5.4インチ（対角）オールスクリーンOLEDディスプレイ」・内側「7.6インチ（対角）オールスクリーンOLEDフォールディングディスプレイ」（どちらも Super Retina XDR） | A・E |
| 端子 | USB-C | E |
| 生体認証 | Touch ID「サイドボタンに内蔵された指紋認証センサー」（Face ID の記載なし） | E |
| SIM | 「デュアルeSIM」「物理的なSIMカードには非対応」。購入ページ「物理的なSIMには対応していません」 | A・B・E |
| 容量 | 256GB・512GB・1TB・2TB | A・B |
| 新品価格（税込・SIMフリー） | 256GB 364,800円・512GB 399,800円・1TB 469,800円・2TB 574,800円 | B |
| 重さ | 254g（開いても閉じても） | A・E |
| 大きさ | 開いた状態 164.6×117.8×5.2mm・閉じた状態 84.1×117.8×11.3mm | A |
| 色 | ナイトスカイ・スターホワイト | A・B・C |
| 耐水 | IP68（最大水深6メートルで最大30分間） | E |
| iOS | 技術仕様は iOS 27、リリースは「iOS 27.1で利用できるようになります」 | A・C |
| モデル番号（日本） | A3719 | D |
| Apple Pencil | 「年内にApple Pencil（USB-C）に対応予定」（発売時点は非対応） | C |
| AppleCare+ | 選べる（リリース）。購入ページは「製品購入後30日以内」の加入条件だけで、料金は出ていない → 載せない | B・C |
| 修理料金（保証対象外・税込） | バッテリー修理 40,800円・アウターディスプレイの損傷 64,800円・インナーディスプレイの損傷 182,800円・背面ガラスの損傷 34,800円・背面カメラの損傷 40,800円・アウターディスプレイと背面ガラス 87,800円・カバーレイヤーの損傷 8,800円・その他の損傷 273,800円 | F |

公式で確かめられなかったもの（載せない）: 発売「月」はサポートの D・E に無い（`iphoneSpecs` の方針どおり年まで）、AppleCare+ の料金。

## 在庫が出たときの変更（案）

1. `lib/catalog.ts`
   - 11行目のコメントから Duo を外す
   - IPHONE_CATALOG の先頭（18 Series の前か後）に `{ series: "iPhone Duo", models: ["iPhone Duo"], gradient: …, badges: ["折りたたみ（7.6インチ）", "A20 Pro", "Touch ID"] }`
   - slug は `modelToSlug("iPhone Duo")` → `iphone-duo`（変更不要）。ALL_PAGE_MODELS・sitemap・価格推移の記録には自動で入る
2. `lib/iphoneSpecs.ts`: `s()` は displayInner を取らないので
   `"iPhone Duo": { ...s("2026年", "A20 Pro", 5.4, "有機EL", "USB-C", "Touch ID（サイドボタン）", "148588"), displayInner: 7.6 },`
   （表示は94行目の「外側5.4インチ・内側7.6インチ 有機EL」になる。auth の型は string も通る）
3. `lib/applePrices.ts`: `"iPhone Duo": { url: \`${BASE}/iphone-duo\`, prices: { 256: 364800, 512: 399800, 1024: 469800, 2048: 574800 } },` と APPLE_PRICES_CHECKED の日付
4. `lib/appleRepairPrices.ts`: 型が [電池, 画面] の2つだけ。Duo は画面が外側 64,800／内側 182,800 の2つあるので、どちらか（外側）だけ入れると誤解を招く → **案: 電池だけ出すか、Duo は入れない**（「直す？買い替える？」は次の世代が無いので比べる相手もない）。入れるならカードの文言を外側・内側に分ける
5. `lib/compare.ts`: 比較ページを作るなら `["iPhone 18 Pro", "iPhone Duo"]` か `["iPhone Air", "iPhone Duo"]`（検索が出てから。最初は無しでよい）
6. `lib/nextGeneration.ts`: 足さない（次の世代なし）
7. 取り込み: 上の daiwan・mmoba の正規表現に `Air|Duo` を足す（Air も今は落ちている可能性）。にこスマはコレクション名を確かめてから
8. ビルド前に `npm run test:normalize`、DB で `modelName = "iPhone Duo"` の groupBy（店・容量・色）を見て、色名が「ナイトスカイ／スターホワイト」になっているか確かめる
9. STATE.md の確認台帳「随時 iPhone Duo」を消し、決定事項の掲載機種に反映

## 判断

- 在庫0件なので今はカタログに足さない（在庫0の機種ページは作らない方針どおり）
- 中古の最初の在庫は新品 364,800円より高い「プレミア価格」になりやすい。そのときは 18 Pro 系と同じく「新品との差」の表示が効く（applePrices に入れておけば自動）
