"""
全ショップのスクレイパーを並列で実行するマスタースクリプト
"""
import subprocess
import threading
import time
import os
import sys

from common import hide_stale_inventory

# Windowsターミナルでの文字化け対策
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 失敗したスクリプト名（スレッドから追記する）
FAILED = []
# 失敗のうち、Python の例外（Traceback）で止まったもの＝コードの誤りの疑い。1店でもジョブを失敗にする
CODE_ERRORS = []

# スクリプト → DB の shopName（各スクレイパーの run_scraper の第1引数と同じ）
SHOP_NAMES = {
    "nicosuma_scraper.py": "にこスマ",
    "iosis_scraper.py": "イオシス",
    "mmoba_scraper.py": "エムモバ",
    "daiwan_scraper.py": "ダイワンテレコム",
}

def run_scraper(script_name, args=""):
    print(f"[*] Starting {script_name} with args: {args}...")
    start_time = time.time()
    
    # 仮想環境のPythonを使用
    python_exe = os.path.join("venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = "python" # フォールバック
        
    # 環境変数に PYTHONIOENCODING=utf-8 を設定して、サブプロセスの出力をUTF-8に強制する
    # PYTHONUNBUFFERED=1 を設定して、出力を即座にフラッシュさせる
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUNBUFFERED"] = "1"
    
    # コマンドの構築 (-u を追加して出力をリアルタイム化)
    cmd = [python_exe, "-u", script_name]
    if args:
        cmd.append(str(args))
        
    try:
        # サブプロセスとして実行
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            env=env
        )
        
        # リアルタイムで出力を表示（ショップ名でプレフィックスを付ける）
        shop_label = script_name.replace("_scraper.py", "").upper()
        saw_traceback = False
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                if line.startswith("Traceback (most recent call last)"):
                    saw_traceback = True
                print(f"[{shop_label}] {line.strip()}", flush=True)
            
        process.wait()
        elapsed = time.time() - start_time
        
        if process.returncode == 0:
            print(f"[+] {script_name} finished successfully in {elapsed:.1f}s")
        else:
            print(f"[!] {script_name} failed with exit code {process.returncode}")
            FAILED.append(script_name)
            if saw_traceback:
                CODE_ERRORS.append(script_name)

    except Exception as e:
        print(f"[!] Error running {script_name}: {e}")
        FAILED.append(script_name)
        CODE_ERRORS.append(script_name)

def main():
    # 各ショップの取得数（ページ数など）。環境変数で上書きでき、0 ならそのショップは実行しない。
    # ゲオは公式ECが自動アクセスを拒否しているため、楽天API（rakuten-sync/）で取得している
    limits = {
        "nicosuma_scraper.py": int(os.environ.get("NICOSUMA_LIMIT", 100)),
        "iosis_scraper.py": int(os.environ.get("IOSIS_LIMIT", 200)),
        "mmoba_scraper.py": int(os.environ.get("MMOBA_LIMIT", 100)),
        "daiwan_scraper.py": int(os.environ.get("DAIWAN_LIMIT", 100)),
    }
    config = {script: limit for script, limit in limits.items() if limit > 0}

    scrapers = list(config.keys())
    
    print(f"=== Starting parallel execution of {len(scrapers)} scrapers ===")
    start_all = time.time()
    
    threads = []
    for script in scrapers:
        args = config.get(script)
        t = threading.Thread(target=run_scraper, args=(script, str(args)))
        t.start()
        threads.append(t)
        # 各ショップの開始タイミングを僅かにずらす（ログの初期表示の重なり防止）
        time.sleep(0.1)
        
    for t in threads:
        t.join()
        
    total_elapsed = time.time() - start_all
    print(f"\n=== All scrapers completed in {total_elapsed:.1f}s ===")

    # 取得が止まった店（公式サイトの休止・障害）の古い在庫を隠す。取得が戻れば洗い替えで自動的に表示に戻る
    try:
        hide_stale_inventory(list(SHOP_NAMES.values()))
    except Exception as e:
        print(f"::warning::古い在庫を隠す処理に失敗: {e}")

    # 失敗の扱い（docs/operations.md「失敗と警告の分け方」）:
    # - 1店だけの失敗（403・429・タイムアウト・0件・DB の一時的な切断など。前回の在庫はそのまま残る）は警告だけにする。
    #   続けば、在庫の古さで「データ更新の監視」（scripts/check-health.ts）がジョブを失敗にする
    # - 2店以上が同時に失敗した、または Python の例外（Traceback）で止まった（コードの誤りの疑い）ときは、この場でジョブを失敗にする
    if FAILED:
        print(f"[!] Failed scrapers: {', '.join(FAILED)}")
        if len(FAILED) >= 2 or CODE_ERRORS:
            if CODE_ERRORS:
                print(f"[!] Traceback で止まった: {', '.join(CODE_ERRORS)}")
            sys.exit(1)
        print(f"::warning::スクレイパー {FAILED[0]} が失敗（1店だけなので警告。前回の在庫のまま。続けば監視が失敗にする）")

if __name__ == "__main__":
    # scraper ディレクトリに移動してから実行することを想定
    main()
