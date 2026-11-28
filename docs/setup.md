# セットアップ

前提: Node.js 20+（Actions は 24）・Python 3.9+・Docker・Git

```bash
# .env（ローカルの Docker DB。※既存の .env は本番 DB を指している）
DATABASE_URL="postgresql://user:password@localhost:5432/used_phone_db?schema=public"

docker compose up -d
npx prisma db push
npm install
npm run dev            # http://localhost:3000

cd scraper
python -m venv venv
.\venv\Scripts\activate          # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python run_all_scrapers.py       # 個別は python nicosuma_scraper.py など
```

- 本番ではワークフローが `NEXT_PUBLIC_SITE_URL`（未設定は localhost:3000）・`NEXT_PUBLIC_GA_ID`（未設定は GA なし）を渡す
- 楽天の在庫は手元から取れない（許可 IP 制）。仕組みは `docs/operations.md`

## つまずき

- DB につながらない: `docker ps` と `.env` の `DATABASE_URL`
- 価格推移のグラフが出ない: `PriceSnapshot` に2日分以上必要（`npm run snapshot:prices`）
- 定期実行が止まった: 60日コミットがないと無効になる。Actions タブで有効化
- 「洗い替えを中止しました」: 件数が50%未満（`ensure_safe_to_replace`）。意図的なら `FORCE_REPLACE=1`
- `npx eslint .` が大量のエラー: venv の中身。`npx eslint app lib scripts` を使う
