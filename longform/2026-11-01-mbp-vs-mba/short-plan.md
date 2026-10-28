# ショート 台本案: 中古だと、MacBook Pro と Air が同じ値段？

- 横動画（`longform/2026-11-01-mbp-vs-mba/script.md`）と同じ数字（`data-query.log`・2026/10/29・medianPrice・ジャンク除外・在庫5件以上）。新品の値段は Apple 公式（税込・10/29 に購入ページで確認・出典は script.md の冒頭）
- 軸は「**同じくらいの値段で、Pro と Air のどっちを買う？**」。比べるのは**同じメモリ・同じ SSD どうしだけ**
- 行（差の大きい順に 3位→1位。差＝|Pro − Air|）
  - 3位: 新品どうし Air 13インチ M5（16GB・1TB）242,800円 vs Pro 14インチ M6（16GB・1TB）339,800円 → **差 97,000円**（Pro が高い）
  - 2位: 中古 Air 13インチ M2 vs Pro 14インチ M1 Pro（16GB・1TB）159,980円（22件）／167,630円（23件）→ **差 7,650円**（Pro が高い）
  - 1位（伏せる）: 中古 Air 13インチ M2 vs Pro 14インチ M1 Pro（16GB・512GB）154,980円（31件）／153,131円（65件）→ **差 1,849円（Pro のほうが安い）**
  - 並びは「差が縮んでいく」順（9.7万 → 7,650 → 1,849円）。2位と1位が同じ機種の組（SSD 違い）なのが気になるなら、ranking をやめ、hook「新品は9.7万円差」→ reveal「中古なら1,849円差」の2段にする（13インチ Pro M1 は Touch Bar の旧筐体で端子も Air と同じなので、比べる相手に使わない。10/29 ユーザーと決定）
- reveal の仕様の3行（Apple サポートの技術仕様。script.md の冒頭）: 画面 500ニト／XDR・120Hz、端子 2つ／3つ＋HDMI＋SD、重さ 1.24kg／1.6kg
- 言わないこと: 横動画の script.md と同じ（性能の倍率・ベンチマーク・Pro のファン・13インチ Pro（Touch Bar の旧筐体。比べる相手にしない）・相場の予想）。**差 1,849円は小さいので、作る日に取り直して逆転していたら「Pro のほうが安い」を言わない**
- 長さの見積もり: 約38〜42秒

## 使える既存のテーマ（新しいコードは書かない）
- **oldpro**（`shorts/themes/oldpro.ts`「1世代前のProと最新の無印、どっちが安い？」・型 OldProRow）: 「Pro と、もう一方、同じ容量でどっちが安いか（向きつきの差）」の形が今回にいちばん近い。hook → ranking（3位・2位・伏せた1位）→ reveal（2本の棒・差額と率）→ comment → outro。ただし組（PAIRS）が iPhone で、容量（storage）だけで比べる。**Mac はメモリでも値段が変わるので、組に memoryGB の条件を足す手直しが要る**
- **macgen**（`shorts/themes/macgen.ts`「MacBook Air、1世代前にするといくら安い？」）: 見た目 ⑤ PRO・つかみの「開いたノート＋最大の差額」（look.hook "device"）と、Mac の読み（M1〜M5 エムワン〜エムファイブ）がそのまま使える。組の決め方は合わない
- **provs**（Pro と無印、同じ容量だといくら違う？）: 2本の棒の reveal と「Proにすると約○万円」の声の型。iPhone 用
- **mbpnew**（`shorts/themes/mbpnew.ts`）: 「新品（公式の定数）と中古の行」を混ぜる形。3位の「新品どうし」を入れるなら、この行の作り方を写す
- いちばん手が少ないのは、**oldpro を写した Mac 版**（PAIRS を [Air, Pro] の組に、容量の条件を storage＋memoryGB に、ひと言を仕様の差に）。作るかはユーザーと決める

## 場面と数字（2段の見せ方の案）

| 場面 | 画面の文字 | 数字（出典） |
| --- | --- | --- |
| hook | 帯「MacBook Pro と Air／中古だと いくら違う？」・つかみ（開いたノート2台）「新品は 97,000円差」 | 新品 Air 13インチ 242,800円・Pro 14インチ M6 339,800円（16GB・1TB・Apple 公式） |
| ranking 3位 | 新品 Air 13インチ M5 vs Pro 14インチ M6（16GB・1TB）差 97,000円 | Apple 公式 |
| ranking 2位 | 中古 Air M2 vs Pro M1 Pro（16GB・1TB）差 7,650円 | DB（22件・23件） |
| ranking 1位（伏せる） | 中古 Air M2 vs Pro M1 Pro（16GB・512GB） | DB（31件・65件） |
| reveal | 2本の棒: Air M2 154,980円／Pro M1 Pro 153,131円・「Pro が 1,849円 安い」。仕様の3行: 画面 500ニト／XDR・120Hz・端子 2つ／3つ＋HDMI＋SD・重さ 1.24kg／1.6kg | DB・Apple サポートの技術仕様 |
| comment | 検品担当「軽さならAir／画面と端子ならPro／M1 Proは傷を写真で確認」 | M1 Pro はランクB 66／102件 |
| outro | 「全機種の相場は／プロフィールのリンクから」・問い「あなたは Pro 派？Air 派？」 | 下の注記「新品は Apple 公式（税込）・中古は同じメモリ・SSD の中央値・2026/10/29」 |

## ナレーション（下書き）
- hook: 「MacBook ProとAir、新品だと9万7,000円違います。中古だと、いくら違う？」
- ranking: 「3位は新品どうし。同じ16GBと1TBで、9万7,000円の差。2位は中古のM2のAirとM1 Pro、1TB。差は7,650円です。」
- reveal: 「1位は、同じM2のAirとM1 Pro、512GB。Airが15万4,980円、Proが15万3,131円。Proのほうが、1,849円安いんです。Proは明るい画面とHDMI、Airは400グラム近く軽い。」
- comment: ひと言の本文だけ（「軽さならAir。画面と端子ならPro。」）
- outro: 「全機種の相場は、プロフィールのリンクから見られます。あなたは、Pro派？Air派？くわしい比べ方は、下の関連動画からどうぞ。」

読みの注意（`--voice-dump` で確かめる）: 「M1 Pro」（エムワンプロ）・「M2」（エムツー）・「XDR」（エックスディーアール）・「HDMI」（エイチディーエムアイ）・「1,849円」。数字の書き方は mbpnew・macgen に合わせる
- 「400グラム近く」は 1.6kg − 1.24kg = 360g。言い切るなら「360グラム」

## タイトル（案）
1. 中古ならMacBook ProとAirが同じ値段？M1 ProとM2 Airの差は1,849円
2. MacBook Pro vs Air、新品は9.7万円差。中古だとたった1,849円

## 説明欄（下書き）
```
MacBook Pro と MacBook Air を、同じメモリ・同じ SSD どうしで比べました。新品（Apple 公式）だと Air 13インチ M5 と Pro 14インチ M6（16GB・1TB）で 97,000円差。中古だと M2 の Air と 14インチの M1 Pro（16GB・512GB）がほぼ同じ値段です。

中古 Air 13インチ M2（16GB・512GB・31件） 相場154,980円／中古 Pro 14インチ M1 Pro（16GB・512GB・65件） 相場153,131円 → Pro が 1,849円安い
中古 Air M2（16GB・1TB・22件） 159,980円／Pro M1 Pro（16GB・1TB・23件） 167,630円 → 差 7,650円
新品 Air 13インチ M5（16GB・1TB） 242,800円／新品 Pro 14インチ M6（16GB・1TB） 339,800円 → 差 97,000円

違い（Apple の技術仕様）: M1 Pro は XDR の画面・最大120Hz・HDMI・SD カード・Thunderbolt 3つ・1.6kg。M2 Air は 500ニト・Thunderbolt 2つ・1.24kg。

比べ方: 新品は Apple 公式の値段（税込・2026/10/29確認）。中古は同じ構成（機種・メモリ・SSD）の中央値（在庫5件以上・ジャンクを除く）。データ: 大手中古ショップの在庫（2026/10/29時点）。

MacBook Pro 14インチ M1 Proの店ごとの在庫と最安値: https://used.gadelog.com/mac/macbook-pro-14-m1-pro?utm_source=youtube&utm_medium=social&utm_campaign=shorts_<日付>_<テーマ>
MacBook Air 13インチ M2: https://used.gadelog.com/mac/macbook-air-13-m2?utm_source=youtube&utm_medium=social&utm_campaign=shorts_<日付>_<テーマ>
中古MacBookの全機種の相場: https://used.gadelog.com/mac?utm_source=youtube&utm_medium=social&utm_campaign=shorts_<日付>_<テーマ>

#MacBookPro #MacBookAir #中古MacBook
```
- クレジットは使う声で。BGM のクレジットは render が入れる
- 関連動画は横動画（この回）を公開してから Studio で設定（mbpnew と同じ）
