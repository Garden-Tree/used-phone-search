"""
洗い替え（DELETE → INSERT）前の安全チェック

スクレイピングが途中で打ち切られた（WAF・タイムアウト等）場合に、
少数の取得結果で既存の在庫データを丸ごと上書きしてしまうのを防ぐ。
"""
import os

# 既存件数に対する新規件数の下限比率。環境変数 MIN_REPLACE_RATIO で上書き可能
DEFAULT_MIN_RATIO = 0.5
# 既存件数がこれ未満なら比較しない（初回実行・小規模ショップ向け）
MIN_EXISTING_TO_CHECK = 20


class ReplaceGuardError(Exception):
    pass


def ensure_safe_to_replace(cur, shop_name, new_count):
    """新規取得件数が既存件数より大幅に少ない場合は ReplaceGuardError を送出する。
    FORCE_REPLACE=1 を指定するとチェックを無効化できる。"""
    if os.environ.get("FORCE_REPLACE") == "1":
        return

    cur.execute('SELECT COUNT(*) FROM "DeviceInventory" WHERE "shopName" = %s', (shop_name,))
    existing_count = cur.fetchone()[0]
    if existing_count < MIN_EXISTING_TO_CHECK:
        return

    min_ratio = float(os.environ.get("MIN_REPLACE_RATIO", DEFAULT_MIN_RATIO))
    if new_count < existing_count * min_ratio:
        raise ReplaceGuardError(
            f"[{shop_name}] 取得件数 {new_count} 件が既存 {existing_count} 件の "
            f"{int(min_ratio * 100)}% 未満のため、洗い替えを中止しました（既存データは保持）。"
            f"強制的に置き換える場合は FORCE_REPLACE=1 を指定してください。"
        )
