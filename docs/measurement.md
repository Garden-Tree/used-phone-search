# 計測（GA4 / Search Console）と確認の進め方

確認の予定日と判断基準は `STATE.md` の「確認台帳」が正。このファイルは設定と見方。

## 設定

| 項目 | 値 | 備考 |
| --- | --- | --- |
| GA4 測定ID | **`G-YV3ZR0N6B1`**（2026-09-27〜） | Vercel `NEXT_PUBLIC_GA_ID`（Production のみ）。`@next/third-parties` で読み込み。変更したら再デプロイが必要 |
| GA4 プロパティ | **556047315「used.gadelog.com（中古スマホ一括検索）」**（アカウント 207926838 GardenTree・ストリーム 15850141203） | used 専用。タイムゾーン日本・通貨 円・拡張計測オン（離脱クリック含む） |
| Search Console | URL プレフィックス `https://used.gadelog.com/`（HTML タグで所有権確認・2026-09-27） | sitemap `https://used.gadelog.com/sitemap.xml` 送信済み（初回 41 URL → 9/27 再送信・現在 134） |
| 構造化データ | 機種別: Product（AggregateOffer）+ BreadcrumbList／比較: BreadcrumbList | リッチリザルトテストで確認可能 |
| OGP | 機種別・比較は専用画像（1時間ごとに再生成）、その他は共通画像 | X の投稿画面に URL を貼ると確認できる |

### GA4 プロパティの経緯（2026-09-27）

| プロパティ | 名前 | 測定ID | 状態 |
| --- | --- | --- | --- |
| 343220884 | gadelog.com | `G-B9JJ58M3KX` | **ブログ本体**（Site Kit の Google タグ `GT-NN6ZF72` 経由）。ブログの `.env.local` の `GA4_PROPERTY_ID` もこれ |
| 346953485 | gadelog.com - GA4 | `G-7955FRXN7V` | **一度もデータを受信していない空のプロパティ**（ブログの `docs/measurement-setup.md` の誤記は 9/27 訂正済み） |
| 556047315 | used.gadelog.com（中古スマホ一括検索） | `G-YV3ZR0N6B1` | **used 専用**（9/27 作成） |

- 公開直後（9/26〜27）は used もブログと同じ `G-B9JJ58M3KX` に送っていた。ブログの sync はホスト名で絞らないため、
  PV・流入元・アフィリエイトのクリック（linkClicks）が混ざる。used 専用プロパティに分離した
- 9/26〜27 の used のデータはブログのプロパティ（343220884）に残っている（ホスト名 used.gadelog.com で見られる）
- Google タグ設定では「ウェブサイトで検出された Google タグを使用」を選ばない（ブログのタグと統合され、ブログの PV まで入る）

## 見方

### GA4
- used 専用プロパティなので絞り込みは不要
- 見るもの：ページ別 PV（`/iphone/*`・`/ipad/*`・`/compare/*`・`/pick/*`・`/budget/*`・`/search`）、流入元（organic / X / gadelog.com からの参照）、
  アフィリエイトのクリック（外部リンクのクリック。GA4 の拡張計測「離脱クリック」で `hb.afl.rakuten.co.jp`・`px.a8.net`）

### Search Console
- **カバレッジ**：sitemap の「検出」と「インデックス登録済み」。新サイトは数日〜数週間かかる
- **検索パフォーマンス**：ページ別・クエリ別の表示回数／クリック／CTR／平均順位
- ブログで確立済みの教義（`../blog-surporter/STATE.md`）をそのまま使う
  - **順位ではなく CTR を目標にする。タイトルにクエリ語を入れる**
  - **判定は最低2週間。7日200表示未満は判定しない**
  - 一行で答えが済むクエリはクリックされない

## 確認のタイミング

| 時期 | 目的 |
| --- | --- |
| 公開翌日（9/28） | 自動処理が動いたか（Actions・楽天・監視）と GA プロパティの確認 |
| 1週間後（10/4） | インデックスが始まったか・GA4 に PV が入っているか |
| 2週間後（10/11） | どのページ・クエリで表示されているか → タイトル調整の対象を決める |
| 1か月後（10/26） | 価格推移が30日分たまる → グラフの見え方・値下がり投稿の検討 |
| 以降は毎月1日 | 出典（iOS 対応機種・新機種・楽天API・各社規約）の開き直し、月次の PV・収益の振り返り |

## 監視（計測ではなくデータ鮮度）

- `https://used.gadelog.com/api/health`：ショップごとの最終更新と価格推移の最終記録日。24時間以上止まると 503
  （static-export 版は `/health.json`。ビルドのたびに書き出し、`ok` と `checkedAt` を見る。`docs/static-export.md`）
- サーバーの cron が毎日10:00に確認し、問題時のみメール（詳細は `operations.md`）
