# 計測（GA4 / Search Console）

確認の予定と基準は `STATE.md` の確認台帳。ここは設定と見方。

## 設定

- GA4: プロパティ 556047315（used 専用）・測定ID `G-YV3ZR0N6B1`（ワークフローの `NEXT_PUBLIC_GA_ID`）。内部トラフィック（自宅 IP・値は `docs/private.local.md`）を除外。IP が変わったらタグ設定の内部トラフィックの定義を直す
- ブログのプロパティとは別。Google タグ設定で「ウェブサイトで検出された Google タグを使用」を選ばない（ブログと混ざる）
- Search Console: URL プレフィックス `https://used.gadelog.com/`（HTML タグで確認）・sitemap 送信済み
- 構造化データ: 機種別 Product（AggregateOffer）+ BreadcrumbList／比較 BreadcrumbList
- Clarity: 本番だけ・lazyOnload（ID は private.local.md）
- 監視: `/health.json`（書き出しごと）＋サーバー cron（`operations.md`）

## Search Console の見方

- **順位ではなく CTR を目標に。タイトルにクエリ語を入れる**
- **判定は最低2週間。7日200表示未満は判定しない**
- 一行で答えが済むクエリはクリックされない

## 店へのクリック `shop_click`

- `app/components/ShopClickTracker.tsx` がカードの `data-*` を送る: `shop_name`・`model_name`・`storage`・`condition_rank`・`price`・`link_type`（`rakuten`／`a8`／`vc`／`moshimo`／`amazon`／`direct`）・`placement`（枠: `good_pick`・`warranty_pick`・`first_*` など。リンク近くの `data-placement`）
- 買取は `shop_name` 末尾に「（買取）」、回線は「（回線）」
- **判定は28日分と「押したユーザー数」で**（数人の連打で週の回数が倍・半分に動く）
- **A8 のクリック数は人数に使わない**（クローラー分が多い）。成約率は GA の shop_click で割る
- 楽天のアフィリエイト ID はブログと共通なので楽天側ではサイトを分けられない

## AI からの集客（毎週月曜）

答えるページがない問いに節かページを足す。記録は `ideas/YYYY-MM-DD.md`。

| 見る場所 | 記録 |
| --- | --- |
| GSC「検索の生成 AI 機能のパフォーマンス」 | 合計表示・上位10ページ |
| GSC 検索結果（28日・500行） | 会話の形・比較・推移・店・予算の問い（下の JS） |
| Bing「AI Performance」 | 引用回数・grounding query・引用ページ |
| GA4 ランディング × チャネル「AI Assistant」 | 入口と shop_click |
| ChatGPT 一時チャット（`chatgpt.com/?temporary-chat=true`・ログインなし） | 下の問いで引用されるか・並ぶサイト・数字の出どころ |

問い: ①iPad 第9世代の中古相場とどこが安いか ②MacBook Air M4 中古の相場と最安値 ③iPhone 中古 相場 一覧 ④iPhone 16 中古 価格 ⑤iPad Air 第5世代 中古 ⑥2万円以下のおすすめ中古スマホ ⑦5万円以下の中古iPhone ⑧Galaxy S24 Ultra 中古相場 ⑨Galaxy S25 Ultra 中古相場 ⑩iPad Pro 11 M4 中古 ⑪iPad Air M4 と Pro M4 中古ならどっち ⑫Apple Watch 中古ならどれ ⑬iPhone 15 Pro 中古相場 ⑭iPhone 18 Pro Max 中古最安値

- 引用は実行ごとに揺れる。出なかった問いは新しい一時チャットでもう1回流し、2回とも出ないものだけ候補に

GSC で行数を 500 にしてコンソールで:
```js
const rows=[...document.querySelectorAll('table tbody tr')].map(r=>[...r.querySelectorAll('td')].map(t=>t.innerText.trim()));
const re=/いつ|値下がり|下が|比較|vs|どっち|どれ|おすすめ|寿命|バッテリー|電池|買うべき|違い|予算|万円|推移|相場|どこ|買取|いくら|新品|一覧|コスパ|\?|？/i;
rows.filter(r=>re.test(r[0])).map(r=>r[0]+'|'+r[2]+'|'+r[4]).join('\n') // 問い|表示|順位
```
判断: 同じ問いが2週続き、答えるページがない（または20位より下）なら作る。比較の組は `lib/compare.ts`、店は `/iphone/where-to-buy`、値下がりは `/iphone/resale-value#last-30-days`、値段の差は `/iphone/price-factors`。
