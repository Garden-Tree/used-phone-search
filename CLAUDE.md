@AGENTS.md
@STATE.md

# ドキュメントの更新規則

- `STATE.md` は「いまの決定と確認予定」を持つ唯一の場所であり、毎セッション読み込まれる。
- **機能の追加・運用の変更・確認台帳の項目の追加や判定をしたターンで、同じターン内に `STATE.md` を更新する。**
- 経緯・分析・根拠データは `ideas/YYYY-MM-DD.md` に書く。STATE.md には結論だけを置く。
- 手順（インフラ・秘密情報の置き場所・障害対応）は `docs/operations.md`、計測は `docs/measurement.md`。
- **STATE.md が 5KB を超えたら、判定済み・完了した項目を ideas/ へ退避する。**
- 関連リポジトリ: ブログ本体の運用は `../blog-surporter`（同じ gadelog.com ドメイン・GA・サーバーを共有）。
