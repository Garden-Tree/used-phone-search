---
name: metrics-report
description: used.gadelog.com の数字（GA4 の PV・訪問・入口・店クリック、YouTube の再生・登録・インプレッション、GSC・Bing、収益）を取ってきて、どこが伸びてどこが止まったかを分析し、伸ばす打ち手を出す。ユーザーが「最新のPV」「再生数取ってきて」「数字を見て」「伸ばすにはどうしたら」「分析して」などと言ったときに使う。
---

# 数字の取得と分析

報告は日本語・表で短く。ブラウザは Chrome の専用プロファイル「used」（list_connected_browsers の Browser 1 を select_browser）。分析は `ideas/YYYY-MM-DD.md` に書き、前回と比べる。計測の定義は `docs/measurement.md`。

## 取り方

| 数字 | 取り方 |
| --- | --- |
| GA4（日本だけ） | `../blog-surporter/scripts` に一時スクリプト（`ga-pv-jp.mjs` を写す）→ `GA4_PROPERTY_ID=556047315 node --env-file-if-exists=.env.local scripts/tmp-<名前>.mjs`。店クリックは `shop_click`・店名 `customEvent:shop_name`。**終わったら消す** |
| 急増の塊 | `date`・`landingPage`・`deviceCategory`・`city`・`pageReferrer` で割る |
| YouTube 1本ごと | `npx tsx scripts/yt-metrics.ts --days 14`（2〜3日遅れ）。今の再生は Data API の `videos?part=statistics` |
| インプレッション・CTR・視聴を継続・収益化 | Studio のアナリティクス（サブエージェント） |
| GSC・Bing | サブエージェントで画面を読む |
| 収益 | A8・楽天・VC・Amazon の画面（ログインが切れていたらユーザーに頼む。パスワードは入れない） |

## 分析の型

1. 週ごとの訪問・PV・店クリック（増減%）
2. 入口（ChatGPT・direct・Bing・Google・X・YouTube）の推移
3. 着地ページ・店クリックの上位（成果0件の店）
4. YouTube の1本あたりの再生・登録・収益化までの距離
5. 打ち手を3〜4つ、根拠の数字を添えて。本番を変えるものはユーザーの OK を取ってから
6. 提案の前に docs/changes.md・git log・本番で済んでいないか確かめる。決めたことは STATE.md と docs/changes.md に同じターンで
