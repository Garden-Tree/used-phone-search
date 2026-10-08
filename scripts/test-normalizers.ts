/**
 * 商品名の読み取り・機種名の照合の回帰テスト。読み取りを変えたら実行する
 *   npm run test:normalize            … 期待値と比べる（差分があれば exit 1）
 *   npm run test:normalize -- --update … 期待値を今の結果で上書き（差分が意図どおりのときだけ）
 * 楽天API は手元から呼べないので、楽天の公開ページからコピーした商品名で確かめる。新しい表記を見つけたら CORPUS に足す
 */
import { writeFileSync, readFileSync } from "node:fs";
import { RAKUTEN_SHOPS } from "@/lib/rakutenShops";
import { IPAD_MODELS, canonicalIpadModel } from "@/lib/ipadCatalog";
import { IPAD_SPECS, IPADOS27_MODELS } from "@/lib/ipadSpecs";
import { matchesModel } from "@/lib/deviceSearch";
import { findShop } from "@/lib/shops";
import { PICKS } from "@/lib/picks";
import { PIXEL_INFO, PIXEL_MODELS, updateYearsLeft } from "@/lib/pixelCatalog";
import { PIXEL_SPECS } from "@/lib/pixelSpecs";
import { GALAXY_SPECS } from "@/lib/galaxySpecs";
import { GALAXY_MODELS, GALAXY_RELEASED, canonicalGalaxyModel } from "@/lib/galaxyCatalog";
import { ALL_DEVICE_PAGE_MODELS } from "@/lib/catalog";
const u = "https://item.rakuten.co.jp/x/1/";
// [shopCode, 商品名, rank, car, batt]（rank・car・batt は fetch.php が商品説明から抜き出す値）
const CORPUS: [string, string, string | null, string | null, number | null][] = [
 ["janpara","【中古】Apple au 【SIMロック解除済み】 iPhone 12 mini 128GB ブルー MGDP3J/A【京都】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Apple SoftBank 【SIMフリー】 iPhone 14 128GB (PRODUCT)RED MPV93J/A【仙台駅東口】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【未使用】Apple 国内版 【SIMフリー】 iPhone Air 256GB スカイブルー MG2A4J/A【福岡筑紫】保証期間3ヶ月",null,null,null],
 ["janpara","【中古】Apple docomo 【SIMロック解除済み】 iPhone SE（第2世代） 64GB ブラック MHGP3J/A（後期型番）【アリオ倉敷】保証期間1ヶ月【ランクA】",null,null,null],
 ["janpara","【中古】Apple 海外版 【SIMフリー】 iPhone 16 Pro Max 256GB デザートチタニウム【ECセンター】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Apple J:COM 【SIMフリー】 iPhone 12 64GB ブラック MGHN3J/A【吉祥寺】保証期間１ヶ月【ランクC】",null,null,null],
 ["janpara","【中古】Apple UQmobile 【SIMフリー】 iPhone 13 128GB ミッドナイト MLNC3J/A【x】保証期間1ヶ月【ランクA】",null,null,88],
 ["janpara","【中古】Apple 国内版 【SIMフリー】 iPad Air（第4世代/2020） 64GB スカイブルー MYH02J/A【ECセンター】保証期間1ヶ月【ランクC】",null,null,null],
 ["janpara","【中古】Apple 【Wi-Fi】 iPad（A16/2025） 128GB シルバー MD3Y4J/A【熊本】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Apple docomo 【SIMフリー】 iPad mini（第6世代/2021） 64GB スペースグレイ MK893J/A【戸塚】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Apple 【Wi-Fi】 11インチ iPad Pro（M5/2025） 256GB スペースブラック 標準ガラス MDWK4J/A【錦糸町北口】保証期間1ヶ月【ランクA】",null,null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPhone14 Pro 128GB ディープパープル MQ0F3J／A SIMフリー 【377-ud】","A","docomoロック解除SIMフリー",82],
 ["akiba-u-shop","【中古】SoftBank iPhone SE 第2世代 64GB ホワイト MX9T2J／A SoftBank 【262-ud】","B",null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPhone15 256GB ブルー MTMR3J／A SIMフリー","C","SIMフリー",90],
 ["akiba-u-shop","【中古】Apple(アップル) iPhone SE (第3世代) 64GB ミッドナイト MMYC3J／A au 【301-ud】","B",null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPad Pro 11インチ 第2世代 256GB スペースグレイ MXE42J／A SIMフリー 【269-ud】","A",null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPad mini(A17 Pro) 256GB スペースグレイ MXNA3J／A Wi-Fi 【258-ud】","B",null,null],
 ["akiba-u-shop","【中古】Apple(アップル) iPad mini 第6世代 64GB スペースグレイ MK893J／A auロック解除SIMフリー 【258-ud】","A","auロック解除SIMフリー",91],
 ["geo-mobile","【中古】【安心保証】 iPhone15 Pro[512GB] SIMロック解除 docomo ブルーチタニウム","A",null,null],
 ["geo-mobile","【中古】【安心保証】 iPhone13[128GB] au/UQmobile ミッドナイト","B",null,null],
 ["geo-mobile","【中古】【安心保証】 iPad 10.2インチ 第8世代[32GB] Wi-Fiモデル シルバー","B",null,null],
 ["geo-mobile","【中古】【安心保証】 iPad 11インチ A16[128GB] Wi-Fiモデル シルバー","A",null,null],
 ["geo-mobile","【中古】【安心保証】 Google Pixel 8a[128GB] docomo ポーセリン","B",null,null],
 ["geo-mobile","【中古】【安心保証】 Google Pixel 10[256GB] SIMフリー オブシディアン","A",null,null],
 ["geo-mobile","【中古】【安心保証】 Google Pixel 8[128GB] UQモバイル ローズ","C",null,null],
 ["geo-mobile","【中古】【安心保証】 Google Pixel 4a 5G[128GB] SoftBank クリアリーホワイト","B",null,null],
 ["janpara","【中古】Google au 【SIMフリー】 Pixel Fold ポーセリン 12GB 256GB G0B96【日本橋3】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】Google 国内版 【SIMフリー】 Pixel 10 Pro Fold ジェイド 16GB 256GB【ECセンター】保証期間1ヶ月【ランクB】",null,null,91],
 ["janpara","【未使用】Google 【SIMフリー】 Pixel 11 [Obsidian] 12GB 256GB【仙台イービーンズ】保証期間3ヶ月",null,null,null],
 ["janpara","【中古】Google 海外版 【SIMフリー】 Pixel 10 Pro 16GB 128GB【仙台駅東口】保証期間1ヶ月【ランクA】",null,null,null],
 ["janpara","【中古】Google SoftBank 【SIMロック解除済み】 Pixel 4 Oh So Orange 6GB 64GB G020N【川越クレアモール】保証期間1ヶ月【ランクC】",null,null,null],
 ["akiba-u-shop","【中古】GOOGLE(グーグル) Google Pixel 6a 128GB セージ GB17L au SIMフリー 【305-ud】","B",null,88],
 ["akiba-u-shop","【中古】GOOGLE(グーグル) Google Pixel 10a 128GB Berry PIXEL10A128 SIMフリー 【196-ud】","A","SIMフリー",100],
 ["akiba-u-shop","【中古】GOOGLE(グーグル) Google Pixel 5a (5G) 128GB モーストリーブラック Softbank SIMフリー 【276-ud】","B",null,null],
 ["geo-mobile","【中古】【安心保証】 Galaxy A55 5G SCG27[128GB] au オーサムライラック","B",null,null],
 ["geo-mobile","【中古】【安心保証】 Galaxy S24 Ultra SCG26[512GB] au チタニウムブラック","A",null,null],
 ["geo-mobile","【中古】【安心保証】 Galaxy A51 5G SC-54A[128GB] docomo プリズムブリックスブラック","B",null,null],
 ["janpara","【中古】SAMSUNG docomo 【SIMフリー】 Galaxy S24 Ultra チタニウムバイオレット 12GB 256GB SC-52E【秋葉5号】保証期間1ヶ月【ランクB】",null,null,null],
 ["janpara","【中古】SAMSUNG 国内版 【SIMフリー】 Galaxy Z Flip7 ブルーシャドウ 12GB 256GB SM-F766Q【DS秋葉】保証期間1ヶ月【ランクA】",null,null,87],
 ["janpara","【未使用】SAMSUNG docomo 【SIMフリー】 Galaxy A25 5G ブラック 4GB 64GB SC-53F【千葉】保証期間3ヶ月",null,null,null],
 ["janpara","【中古】SAMSUNG docomo 【SIMロックあり】 Galaxy S9 SC-02K Titanium Gray【仙台駅東口】保証期間1ヶ月【ランクB】",null,null,null],
 ["akiba-u-shop","【中古】SAMSUNG(サムスン) Galaxy S24 256GB アンバーイエロー SC-51E docomo SIMフリー 【269-ud】","B",null,92],
 ["akiba-u-shop","【中古】GALAXY(ギャラクシー) Galaxy S22 Ultra 256GB バーガンディ SCG14 au SIMフリー 【352-ud】","C",null,null],
 ["akiba-u-shop","【中古】SAMSUNG(サムスン) Galaxy Z Fold7 256GB ジェットブラック SM-F966QZKASJP SIMフリー 【258-ud】","A",null,null],
 ["akiba-u-shop","【中古】SAMSUNG(サムスン) GALAXY A21 64GB ブラック SC-42A docomoロック解除SIMフリー 【305-ud】","B",null,null],
 // ニューズドテック（2026-10-08〜。rank はキャッチコピーの「【Bランク】」から fetch.php が抜き出す）
 ["garakei","バッテリー新品交換済 【中古】 iPhone14 128GB ミッドナイト Aランク SIMフリー 本体 スマホ バッテリーが持つ 長持ち 多い 電池 最大容量 アイフォン アップル apple 【あす楽】 【保証あり】 【送料無料】 ip14mtm2258a",null,null,null],
 ["garakei","【中古】 iPhone13 128GB ブルー SIMフリー 本体 スマホ バッテリーが持つ 長持ち 多い 電池 最大容量 アイフォン アップル apple 【あす楽】 【保証あり】 【送料無料】 ip13mtm1754","B",null,null],
 ["kamaya-awards","【中古】 iPhoneSE3 64GB スターライト SIMフリー 本体 スマホ iPhoneSE第3世代 バッテリーが持つ 長持ち 多い 電池 最大容量 アイフォン アップル apple 【あす楽】 【保証あり】 【送料無料】 ipse3mtm1919","C",null,null],
 ["garakei","バッテリー100% 【中古】 iPhone15 Pro 128GB ナチュラルチタニウム SIMフリー 本体 スマホ アイフォン アップル apple 【あす楽】 【保証あり】 【送料無料】 ip15pmtm2439a","B",null,null],
 ["kamaya-awards","【中古】iPhone14 バッテリー100% 90%-99% 80%-89% 全色・容量・ランク 本体 SIMフリー 128GB 256GB 512GB バッテリー新品 長持ち 再生スマホ 電池最大容量 アイフォン14 apple 保証付 送料無料",null,null,null],
 ["garakei","【中古】 iPad 第10世代 64GB 良品 SIMフリー Wi-Fi+Cellular ブルー A2757 10.9インチ 2022/10/1 iPad10 本体 タブレット アイパッド アップル apple 【あす楽】【保証あり】【送料無料】 ipd10mtm2894",null,null,null],
 ["kamaya-awards","【中古】 iPad 第9世代 64GB Aランク Wi-Fi シルバー A2602 10.2インチ 2021年 iPad9 本体 タブレット アイパッド アップル apple 【あす楽】【保証あり】【送料無料】 ipd9mtm2753",null,null,null],
 ["kamaya-awards","【未開封】iPad Air8 Wi-Fi 128GB 11インチ M4 スターライト A3459 2026年 本体 ipadair 第1世代 Wi-Fiモデル タブレット アイパッド アップル apple 【あす楽】 【保証あり】 【送料無料】 ipda8mtm5161s",null,null,null],
 ["kamaya-awards","【中古】 Google Pixel9a 128GB Peony SIMフリー 本体 ソフトバンク スマホ 【あす楽】 【保証あり】 【送料無料】 gp9a1spk7mtm","B",null,null],
 ["garakei","【中古】 Google Pixel9 Pro XL 128GB Obsidian SIMフリー 本体 au スマホ 【あす楽】 【保証あり】 【送料無料】 gp9pxa1ob7mtm","B",null,null],
 ["garakei","【中古】 Google Pixel7 128GB オブシディアン SIMフリー 本体 スマホ 【あす楽】 【保証あり】 【送料無料】 gp7fbk7mtm","B",null,null],
 ["kamaya-awards","【中古】 Google Pixel7a Sea SIMフリー 本体 ソフトバンク スマホ 【あす楽】 【保証あり】 【送料無料】 gp7asbl7mtm","B",null,null],
 ["kamaya-awards","【中古】 SCG25 Galaxy S24 256GB アンバー イエロー Aランク SIMフリー 本体 au タブレット ギャラクシー 【あす楽】 【保証あり】 【送料無料】 scg25ye8mtm",null,null,null],
 ["kamaya-awards","【中古】 SC-53F Galaxy A25 5G ブラック Aランク SIMフリー 本体 ドコモ スマホ ギャラクシー 【あす楽】 【保証あり】 【送料無料】 sc53fbk8mtm",null,null,null],
 // カメラのキタムラ（2026-10-08〜）
 ["emedama","【中古：AA(新品同様)】Apple iPhone 14 128GB ミッドナイト SIMフリー アイフォン 中古 SIMフリー スマートフォン 本体 スマホ 防水 防塵 おサイフケータイ 高品質端末",null,null,null],
 ["emedama","【中古：AB(良品)】 Apple iPhone SE（第3世代） 128GB (PRODUCT)RED SIMフリー【ガラスフィルム付属】 スマホ スマートフォン SE3 本体 5G ファイブジー Touch ID デュアルSIM docomo au softbank",null,null,null],
 ["emedama","【中古：AA(新品同様)】Apple iPhone SE（第3世代）64GB ミッドナイト SIMフリー【ガラスフィルム付属】 スマホ スマートフォン SE3 本体 5G",null,null,null],
 ["emedama","【中古：A(美品)】 Apple iPhone XS 256GB ゴールド SIMフリー アイフォン 中古 スマートフォン 本体 スマホ SIMフリーモデル 高品質端末",null,null,null],
 ["emedama","【中古：AA(新品同様)】 Apple iPad mini（第5世代） Wi-Fi+Cellular 64GB シルバー SIMフリー【2WAYスタイラスペン付属】 アイパッドミニ 中古 タブレット 本体 SIMフリーモデル 高品質端末",null,null,null],
 ["emedama","【中古：A(美品)】Apple iPad （第8世代） Wi-Fi 32GB シルバー【2WAYスタイラスペン付属】 アイパッド 中古 タブレット 本体 高品質端末",null,null,null],
 ["emedama","【中古：AA(新品同様)】Apple iPad Air（第5世代） Wi-Fi 64GB ブルー 正規Apple整備済品/メーカー保証1年付 アイパッド 中古 タブレット 本体 高品質端末 《納期約1－2週間》",null,null,null],
 ["emedama","【中古：AA(新品同様)】Google Pixel 8a 128GB Bay（ブルー系） SIMフリー SIMフリー スマートフォン 本体 スマホ 防水 防塵 おサイフケータイ",null,null,null],
 ["emedama","【中古：A(美品)】Google Pixel 6 128GB Sorta Seafoam（グリーン系） SIMフリー グーグルピクセル 中古 スマートフォン 本体 スマホ SIMフリーモデル 高品質端末 《納期約1－2週間》",null,null,null],
 ["emedama","【中古：A(美品)】Samsung Galaxy S24 Ultra　SC-52E 512GB チタニウム ブラック SIMフリー 《納期約1－2週間》",null,null,null],
 ["emedama","テレホンリース 7520PXL7AHB 猫耳ケース mimi TPU×(PC×PMMA) BK（GooglePixel7a用）",null,null,null],
 ["emedama","エレコム PM-G224HVCKCR ハイブリッドケース 極み クリア〔Galaxy A53 5G用〕",null,null,null],
 ["emedama","アイパッド 中古 タブレット 本体 SIMフリーモデル 高品質端末 【中古：AA(新品同様)】 Apple iPad （第8世代） Wi-Fi+Cellular 32GB シルバー SIMフリー【2WAYスタイラスペン付属】 アイパッド 中古 タブレット 本体 SIMフリーモデル 高品質端末",null,null,null],
 ["emedama","【中古：A(美品)】Apple 11インチ iPad（A16） Wi-Fi 256GB シルバー 《納期約1－2週間》",null,null,null],
 ["garakei","バッテリー新品交換済 【中古】 iPhone16e 128GB ブラック Aランク SIMフリー 本体 スマホ バッテリーが持つ 長持ち 多い 電池 最大容量 アイフォン アップル apple 【あす楽】 【保証あり】 【送料無料】 ip16emtm2908a",null,null,null],
 ["garakei","バッテリー新品交換済 【中古】 iPhone17e 256GB ブラック Aランク SIMフリー 本体 スマホ バッテリーが持つ 長持ち 多い 電池 最大容量 アイフォン アップル apple 【あす楽】 【保証あり】 【送料無料】 ip17emtm3138a",null,null,null],
 ["garakei","【中古】 iPhoneSE2 128GB ブラック 本体 スマホ iPhoneSE第2世代 アイフォン アップル apple 【あす楽】 【保証あり】 【送料無料】 ipse2mtm704","B",null,null],
 // イオシス 楽天市場店（2026-10-08〜）
 ["pc-good","【中古】iPhone14 A2881 (MPUD3J/A) 128GB ミッドナイト 【au版SIMフリー】 Apple スマホ スマートフォン 当社3ヶ月間保証 送料無料 イオシス","B",null,null],
 ["pc-good","【中古】【バッテリー80%未満】【SIMロック解除済】【第2世代】 au iPhoneSE A2296 (MHGQ3J/A) 64GB ホワイト Apple スマホ スマートフォン 当社3ヶ月間保証 送料無料 イオシス","C",null,null],
 ["pc-good","【中古】iPhone13 mini A2626 (MLJC3J/A) 128GB ミッドナイト 【au版SIMフリー】 Apple スマホ スマートフォン 当社3ヶ月間保証 送料無料 イオシス","A",null,null],
 ["pc-good","【未使用】iPhone17e A3575 (MHRP4J/A) 256GB ホワイト 【SoftBank版SIMフリー】 Apple スマホ スマートフォン 当社6ヶ月保証 送料無料 利用制限▲/赤ロム永久保証 イオシス",null,null,null],
 ["pc-good","【ネットワーク利用制限▲】iPhone14 A2881 (MR3Q3J/A) 128GB イエロー【楽天版 SIMフリー】 Apple 当社3ヶ月間保証 中古 【 中古スマホとタブレット販売のイオシス 】","B",null,null],
 ["pc-good","【中古】iPhone Air A3516 (MG2A4J/A) 256GB スカイブルー 【国内版SIMフリー】 Apple スマホ スマートフォン 当社3ヶ月間保証 送料無料 イオシス","A",null,null],
 ["pc-good","【第9世代】 iPad2021 Wi-Fi+Cellular 64GB スペースグレイ MK473J/A A2604 【au版SIMフリー】 Apple 当社3ヶ月間保証 中古 イオシス","B",null,null],
 ["pc-good","【第11世代】 iPad(A16) 2025 Wi-Fi 128GB イエロー MD4D4J/A A3354 Apple 当社6ヶ月保証 未使用 イオシス",null,null,null],
 ["pc-good","【第7世代】 iPad Air(M3) 11インチ Wi-Fi 256GB スペースグレイ MCA14J/A A3266 Apple 当社3ヶ月間保証 中古 イオシス","A",null,null],
 ["pc-good","Google Pixel7a G82U8 スノー 【国内版SIMフリー】 Google 当社3ヶ月間保証 中古 イオシス","B",null,null],
 ["pc-good","【ネットワーク利用制限▲】Google Pixel11 Pro XL G4HCD 16GB/512GB オブシディアン 【SoftBank版SIMフリー】 Google 当社3ヶ月間保証 中古 イオシス","A",null,null],
 ["pc-good","Galaxy S25 SM-S931Z ネイビー 【SoftBank版SIMフリー】 SAMSUNG 当社3ヶ月間保証 中古 イオシス","B",null,null],
 ["pc-good","Galaxy S24 Ultra SM-S928Q 512GB チタニウムブラック 【国内版SIMフリー】 SAMSUNG 当社3ヶ月間保証 中古 イオシス","C",null,null],
 ["pc-good","SAMSUNG Galaxy Buds2 SM-R177NLVAXJP [Lavender] [未使用] 【当社1ヶ月間保証】 イオシス",null,null,null],
 ["pc-good","CYBER PARK Limited iPhone12 Pro 耐衝撃TPUソフトケース クリア [新品] 【当社1週間保証】 イオシス",null,null,null],
 // エムティーエム（2026-10-09〜。ランクは商品名の語から。商品説明の「バッテリー最大容量90％」は fetch.php が batt に入れる）
 ["ekosuta","【中古】超美品 SIMフリー iPhone 16 Pro 256GB ホワイトチタニウム スマホ APPLE 安心保証 即日発送 土日祝発送OK",null,null,90],
 ["ekosuta","【中古】良品中古 SIMフリー iPhone 16e 128GB ブラック スマホ APPLE 安心保証 即日発送 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】 美品 SIMフリー iPhone7 PLUS 128GB ジェットブラック 安心保証 即日発送 スマホ apple 本体 白ロム 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】 美品 SIMフリー iPhoneXS MAX 512GB スペースグレイ 本体 白ロム 中古 安心保証 即日発送 Apple あす楽 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】美品 SIMフリー iPhone SE 第2世代 64GB ブラック スマホ 白ロム 中古 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】 中古 SIMフリー iPhoneXS 64GB ゴールド 本体 中古 即日発送 Apple 土日祝発送OK",null,null,null],
 ["ekosuta","【新品未使用】 SIMフリー iPhone SE3 第3世代 64GB ミッドナイト スマホ 白ロム 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】良品中古 SoftBank iPhone 11 Pro Max 64GB ミッドナイトグリーン スマホ 白ロム 中古スマホ 本体 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】 中古 iPad Air Wi-Fi 16GB シルバー 即日発送 Tab Apple MD788J/A 本体 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】 美品 iPad 第8世代 Wi-Fi 32GB スペースグレイ 安心保証 即日発送 タブレット Apple 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】 美品 docomo iPad Air 3 Cellular セルラー 64GB ゴールド 安心保証 即日発送 Tab Apple 本体 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】 美品 SIMフリー iPad mini 5 Wi-Fi+Cellular セルラー 64GB シルバー タブレット 本体 白ロム 中古 安心保証 即日発送 Apple 土日祝発送OK",null,null,null],
 ["ekosuta","【新品未使用】 iPad Air 第8世代 M4 11インチ Wi-Fi 128GB A3459　MH304J/A スペースグレイ タブレット APPLE 安心保証 即日発送 土日祝発送OK",null,null,null],
 ["ekosuta","【新品未使用】 iPad Air 第8世代 M4 11インチ Wi-Fi 2568GB A3459　MH354J/A スペースグレイ タブレット APPLE 安心保証 即日発送 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】超美品 SIMフリー Google Pixel 9 Pro XL 256GB オブシディアン スマホ Google 安心保証 即日発送 土日祝発送OK",null,null,null],
 ["ekosuta","【中古】美品 SoftBank Google Pixel 3a 64GB ジャストブラック スマホ 中古土日祝発送 即日発送",null,null,null],
 ["ekosuta","【中古】美品 SoftBank Google Pixel8 128GB オブシディアン スマホ Google",null,null,null],
 ["ekosuta","【中古】超美品 SIMフリー Google Pixel 8a ポーセレン スマホ Google",null,null,null],
 ["ekosuta","【中古】安心保証 良品中古 SIMフリー Google Pixel 6 256GB GR1YH ソータシーフォーム スマホ 白ロム 本体 即日発送 あす楽",null,null,null],
 ["ekosuta","【中古】 中古 SC-53B Galaxy A52 5G オーサムブラック 本体 即日発送",null,null,null],
 ["ekosuta","【中古】美品 SC-52D Galaxy S23 Ultra 256GB グリーン DoCoMo スマホ SAMSUNG",null,null,null],
 ["ekosuta","【中古】超美品 SCG20 Galaxy S23 Ultra 256GB グリーン AU スマホ SAMSUNG",null,null,null],
 ["ekosuta","【中古】新品同様 SIMフリー Galaxy Z Flip7 256GB ブルーシャドウ スマホ SAMSUNG",null,null,null],
 ["ekosuta","【中古】超美品 SIMフリー Galaxy A55 5G ライラック スマホ SAMSUNG",null,null,null],
 ["ekosuta","【中古】美品 Galaxy Buds2 ホワイト Galaxy イヤホン",null,null,null],
 ["ekosuta","【新品未使用】 Google Pixel Buds Pro 2 ムーンストーン イヤホン Google",null,null,null],
 ["ekosuta","【中古】安心保証 超美品 SCR01 Galaxy 5G Mobile Wi-Fi ホワイト 本体 即日発送",null,null,null],
 ["ekosuta","【中古】iPhone14 バッテリー100% 全色 SIMフリー 128GB 256GB 512GB 本体 土日祝発送OK",null,null,null],
];
const FIXTURE = "scripts/fixtures/rakuten-normalize.expected.json";
let failures = 0;

// 1. 楽天3店の商品名の読み取り（期待値はファイル）
const out = CORPUS.map(([shop, name, rank, car, batt]) =>
  RAKUTEN_SHOPS[shop].normalize({ code: "x", name, price: 1000, url: u, rank, nw: "○", car, batt }),
);
if (process.argv.includes("--update")) {
  writeFileSync(FIXTURE, JSON.stringify(out, null, 1));
  console.log(`期待値を更新しました（${out.filter(Boolean).length}/${out.length} 件が読み取れる）`);
} else {
  const expected = JSON.parse(readFileSync(FIXTURE, "utf8"));
  out.forEach((o, i) => {
    if (JSON.stringify(o) !== JSON.stringify(expected[i])) {
      failures++;
      console.log(`DIFF ${CORPUS[i][1].slice(0, 50)}
  期待 ${JSON.stringify(expected[i])}
  結果 ${JSON.stringify(o)}`);
    }
  });
}

// 2. iPad の機種名の正規化（店ごとの表記 → 正式名）
const IPAD_CASES: [string, string | null][] = [
  ["iPad Air（第4世代/2020）", "iPad Air (第4世代)"], ["11インチ iPad Air（M4/2026)", "iPad Air 11インチ (M4)"],
  ["iPad 10.2インチ 第8世代", "iPad (第8世代)"], ["iPad 11インチ A16", "iPad (A16)"], ["iPad mini(A17 Pro)", "iPad mini (A17 Pro)"],
  ["iPad Pro 11-inch (M4)", "iPad Pro 11インチ (M4)"], ["iPad Air (第 5 世代)", "iPad Air (第5世代)"],
  ["iPad Air5 第5世代", "iPad Air (第5世代)"], ["iPad2022 第10世代", "iPad (第10世代)"],
  ["iPad Pro(M4) 11インチ 第5世代", "iPad Pro 11インチ (M4)"], ["iPad Air 3", "iPad Air (第3世代)"],
  ["iPad Air（M2/2024）", null], ["iPad Air 2", null],
];
for (const [raw, want] of IPAD_CASES) {
  const got = canonicalIpadModel(raw);
  if (got !== want) { failures++; console.log(`iPad: ${raw} → ${got}（期待 ${want}）`); }
}

// 3. 検索の機種照合
const MATCH_CASES: [string, string, boolean][] = [
  ["iPhone 13", "iPhone 13", true], ["iPhone 13", "iPhone 13 mini", false], ["iPhone 16", "iPhone 16e", false],
  ["iPhone 7", "iPhone 17", false], ["iPhone SE", "iPhone SE (第3世代)", true], ["iPhone 11", "iPad Pro 11インチ (第2世代)", false],
  ["iPad", "iPad Air (第5世代)", true], ["iPad Air", "iPad Pro 11インチ (M4)", false],
  ["iPad (第6世代)", "iPad mini (第6世代)", false], ["iPad Pro 11インチ (M4)", "iPad Pro 13インチ (M4)", false],
  ["Pixel 9", "Pixel 9", true], ["Pixel 9", "Pixel 9a", false], ["Pixel 9", "Pixel 9 Pro", false], ["Pixel 9 Pro", "Pixel 9 Pro XL", false],
  ["Pixel", "Pixel 8a", true], ["Pixel Fold", "Pixel 9 Pro Fold", false], ["Pixel Pro Fold", "Pixel 10 Pro Fold", true], ["iPhone 8", "Pixel 8", false], ["Pixel 8", "iPhone 8", false],
  ["Galaxy S24", "Galaxy S24", true], ["Galaxy S24", "Galaxy S24 Ultra", false], ["Galaxy S26", "Galaxy S26+", false],
  ["Galaxy Z Fold8", "Galaxy Z Fold8 Ultra", false], ["Galaxy Z Fold", "Galaxy Z Fold7", true], ["Galaxy S24", "Pixel 8", false],
];
for (const [q, name, want] of MATCH_CASES) {
  if (matchesModel(q, name) !== want) { failures++; console.log(`照合: "${q}" と "${name}" → ${!want}（期待 ${want}）`); }
}

// 4. 店の一覧（lib/shops.ts）に楽天の店名がそろっているか（ずれるとトップの件数・絞り込みが 0 件になる）
for (const { shopName } of Object.values(RAKUTEN_SHOPS)) {
  if (!findShop(shopName)) { failures++; console.log(`店の一覧: lib/shops.ts に「${shopName}」がない`); }
}

// 5. iPad のスペック（lib/ipadSpecs.ts）がカタログの機種名とそろっているか（名前がずれると機種ページのスペック欄が消える）
for (const model of IPAD_MODELS) {
  if (!IPAD_SPECS[model]) { failures++; console.log(`iPad スペック: lib/ipadSpecs.ts に「${model}」がない`); }
}
for (const model of IPADOS27_MODELS) {
  if (!IPAD_MODELS.includes(model)) { failures++; console.log(`iPadOS 27: 「${model}」がカタログにない`); }
}
for (const model of Object.keys(IPAD_SPECS)) {
  if (!IPAD_MODELS.includes(model)) { failures++; console.log(`iPad スペック: 「${model}」がカタログにない`); }
}

// 6. 目的別ページの機種名がカタログにあるか（ずれるとその機種のカードが「在庫なし」になる）。iPad はどれも iPadOS 27 対応に絞っている
for (const pick of PICKS) {
  for (const model of pick.models) {
    if (!ALL_DEVICE_PAGE_MODELS.includes(model)) { failures++; console.log(`目的別 ${pick.slug}: 「${model}」がカタログにない`); }
    if (pick.ipad && !IPADOS27_MODELS.has(model)) { failures++; console.log(`目的別 ${pick.slug}: 「${model}」は iPadOS 27 非対応`); }
    if (pick.pixel && !((updateYearsLeft(model, new Date().toISOString().slice(0, 7)) ?? 0) > 0)) {
      failures++; console.log(`目的別 ${pick.slug}: 「${model}」はアップデート保証が終わっている`);
    }
  }
}

// 7. Pixel の機種一覧が TypeScript（lib/pixelCatalog.ts）とスクレイパー（scraper/common.py の PIXEL_MODELS）でそろっているか。
//    ずれると、取り込んだのにページがない（または逆）機種が出る。発売年月・保証年数（PIXEL_INFO）もそろっているか
const pyBlock = readFileSync("scraper/common.py", "utf-8").match(/PIXEL_MODELS = \{([\s\S]*?)\}/)?.[1] ?? "";
const pyPixel = new Set([...pyBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
for (const model of PIXEL_MODELS) {
  if (!pyPixel.has(model)) { failures++; console.log(`Pixel: scraper/common.py の PIXEL_MODELS に「${model}」がない`); }
  if (!PIXEL_SPECS[model]) { failures++; console.log(`Pixel: lib/pixelSpecs.ts に「${model}」のスペックがない`); }
  if (!PIXEL_INFO[model]) { failures++; console.log(`Pixel: PIXEL_INFO に「${model}」がない`); }
}
for (const model of pyPixel) {
  if (!PIXEL_MODELS.includes(model)) { failures++; console.log(`Pixel: lib/pixelCatalog.ts に「${model}」がない（scraper/common.py にはある）`); }
}

// 8. Galaxy の機種一覧が TypeScript（lib/galaxyCatalog.ts）とスクレイパー（scraper/common.py の GALAXY_MODELS）でそろっているか。
//    TypeScript の読み取り（canonicalGalaxyModel）が各機種名をそのまま返すか（S26+ の「+」など）
const pyGalaxyBlock = readFileSync("scraper/common.py", "utf-8").match(/GALAXY_MODELS = \{([\s\S]*?)\}/)?.[1] ?? "";
const pyGalaxy = new Set([...pyGalaxyBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
for (const model of GALAXY_MODELS) {
  if (!pyGalaxy.has(model)) { failures++; console.log(`Galaxy: scraper/common.py の GALAXY_MODELS に「${model}」がない`); }
  if (canonicalGalaxyModel(model) !== model) { failures++; console.log(`Galaxy: canonicalGalaxyModel("${model}") → ${canonicalGalaxyModel(model)}`); }
  if (!GALAXY_RELEASED[model]) { failures++; console.log(`Galaxy: GALAXY_RELEASED に「${model}」がない`); }
  if (!GALAXY_SPECS[model]) { failures++; console.log(`Galaxy: lib/galaxySpecs.ts に「${model}」のスペックがない`); }
}
for (const model of pyGalaxy) {
  if (!GALAXY_MODELS.includes(model)) { failures++; console.log(`Galaxy: lib/galaxyCatalog.ts に「${model}」がない（scraper/common.py にはある）`); }
}

console.log(failures === 0 ? "OK: すべて期待どおり" : `NG: ${failures} 件`);
process.exitCode = failures === 0 ? 0 : 1;
