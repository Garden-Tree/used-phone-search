# Used Phone Search (中古スマホ横断検索)

日本全国の大手中古スマホショップの在庫を一括で比較・検索できるWebアプリケーションです。

## 技術スタック (Technology Stack)

詳細な開発者向けドキュメントは [docs/tech_stack.md](./docs/tech_stack.md) を参照してください。

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **Features**: 無限スクロール、ショップ別フィルタリング、価格順ソート

### Database & ORM
- **Database**: PostgreSQL (Docker Compose)
- **ORM**: Prisma

### Data Collection (Scrapers)
- **Language**: Python 3
- **Targets**: イオシス (Iosis), ゲオモバイル (Geo Mobile), にこスマ (Nicosuma)

---

## 開発環境の構築 (Setup)

### 1. データベースの起動
```bash
docker-compose up -d
```

### 2. Frontend (Next.js) の起動
```bash
npm install
npm run dev
```

### 3. スクレイパーの実行
```bash
cd scraper
# 仮想環境の構築 (初回のみ)
python -m venv venv
./venv/Scripts/activate # Windowsの場合
pip install -r requirements.txt # (requirements.txtがある場合)

# 各スクレイパーの実行
python iosis_scraper.py
python geo_scraper.py
python nicosuma_scraper.py
```

---

## プロジェクト構造 (Project Structure)
- `app/`: Next.js アプリケーションコード (App Router)
- `app/api/`: データ取得用APIエンドポイント
- `scraper/`: Python スクレイパー関連
- `prisma/`: データベーススキーマ定義
- `docs/`: 開発ドキュメント
