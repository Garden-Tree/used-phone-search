# やめたこと

再提案しないための一覧。1行＝何を・いつやめた・今・記録。試す前に見送ったものは `docs/changes.md`。消したファイルは `git log --all -- <パス>`。

## インフラ
- Vercel ホスティング: 10/6 に Cloudflare Pages へ（Hobby は商用不可・Neon の計算時間）。プロジェクトは 11/23 削除。ideas/2026-10-06.md
- シンレンタルサーバーへの静的配置: 10/4 見送り（SSH の国外制限）。ideas/2026-10-04.md
- API ルート（/api/*）: 10/6 廃止。監視は /health.json、楽天は json.gz を Actions が取得（docs/operations.md）
- 旧ドキュメント `docs/cloudflare-pages.md`・`tech_stack.md`・`youtube-shorts.md`: 11/23 削除。スキル youtube-shorts・`docs/shorts-design.md` は 11/28 削除

## 店・アフィリエイト
- ゲオ公式ECのスクレイピング: 9/27（Akamai）。楽天経由のみ。ideas/2026-09-27.md
- イオシス公式の取得: 11/3（403）。楽天市場店で
- もしも（Yahoo）: 10/26（メディア否認）。ValueCommerce へ。ideas/2026-10-26.md

## SNS
- TikTok: 10/28 停止（5本とも視聴0〜1）。スキルは 11/28 削除。ideas/2026-10-28.md
- X 有料プラン: 11/16 解約（配信の絞りを防げず）。ideas/2026-11-16.md
- X の新しい人への返信: 11/14・1機種の値動き速報: 11/16。docs/changes.md

## YouTube ショート
- オリジナルのショート: 11/23 新規作成をやめた（1本約1,000回で頭打ち・サイトに戻らない）。ideas/2026-11-23-shorts.md
- ショートのテーマ（ランク・値下がり・予算 等）: 11/23。仕様（`shorts/README-retired.md`）は 11/28 削除
- 0秒目の AI クリップ（Flow）: 11/22（実写と差なし）。既存の `ai-*.mp4` は使ってよい。ideas/2026-11-22-b.md
- ショートのサムネ A/B: 11/11（インプレッション不足）。横動画では 11/27 再開
