---
name: metrics-report
description: used.gadelog.com の数字（GA4 の PV・訪問・入口・店クリック、YouTube の再生・登録・インプレッション、GSC・Bing、収益）を取ってきて、どこが伸びてどこが止まったかを分析し、伸ばす打ち手を出す。ユーザーが「最新のPV」「再生数取ってきて」「数字を見て」「伸ばすにはどうしたら」「分析して」などと言ったときに使う。
---

# 数字の取得と分析（11/23 まとめ）

報告は日本語・表を使って短く。分析の本文は `ideas/YYYY-MM-DD.md` に書いてコミット。前回の分析（ideas の最新の growth-analysis・shorts など）と比べる。

## 取り方

| 数字 | 取り方 |
| --- | --- |
| GA4（日本だけ） | `../blog-surporter/scripts` に一時スクリプトを置き、`GA4_PROPERTY_ID=556047315 node --env-file-if-exists=.env.local scripts/tmp-<名前>.mjs`。形は `ga-pv-jp.mjs` を写す（`country=Japan` で絞る・店クリックは `eventName=shop_click`・店名は `customEvent:shop_name`）。**使い終わったら消す** |
| 日別・週別・入口 | dimensions `date`・`sessionSource`・`landingPage`。11/1〜昨日を週ごとに |
| おかしな塊 | 急増は `date`・`landingPage`・`deviceCategory`・`city`・`pageReferrer` で割る（1人の大量 PV・AI のブラウザの当て推量 URL など） |
| YouTube 1本ごと | `npx tsx scripts/yt-metrics.ts --days 14`（Analytics は2〜3日遅れ） |
| YouTube 今の再生数 | Data API の `videos?part=statistics`（yt-metrics と同じ認証。一時スクリプト） |
| インプレッション・CTR・視聴を継続・収益化の進み | API にない → サブエージェントで Studio のアナリティクス → コンテンツ（動画／ショート・過去28日）・詳細モード（内訳＝コンテンツタイプ）・収益化のページ |
| GSC・Bing | サブエージェントで画面を読む（GSC の検索パフォーマンス・ページのインデックス、Bing の Site Explorer・URL 送信の残り枠） |
| 収益 | A8・楽天・VC・Amazon の画面（サブエージェント。ログインが切れていたらユーザーに頼む。パスワードは入れない） |

## 分析の型

1. **大きさ**: 週ごとの訪問・PV・店クリック（増減の%）
2. **入口**: ChatGPT・direct・Bing・Google・X・YouTube の週ごとの推移。止まった入口と伸びた入口
3. **着地とクリック**: 着地ページの上位・店クリックの上位（報酬のない店・成果0件の店を見る）
4. **YouTube**: 横動画とショートの1本あたりの再生・再生時間・登録、収益化の条件までの距離
5. **打ち手を効く順に3〜4つ**: 入口の天井（Bing の知る URL）・収益の穴（成果0件）・壊れた入口（404）・時間の使い方。根拠の数字を1つずつ添える
6. 本番を変える打ち手は、ユーザーの OK を取ってから

## 気をつけること

- GA は日本だけで数える（海外のボットの塊を除く）
- 「直す前に確かめる」: docs/changes.md・git log・本番で、もうやったことでないか
- 決めたことは STATE.md（確認台帳）と docs/changes.md に同じターンで
