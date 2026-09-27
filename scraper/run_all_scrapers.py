"""
全ショップのスクレイパーを並列で実行するマスタースクリプト
"""
import subprocess
import threading
import time
import os
import sys

# Windowsターミナルでの文字化け対策
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 失敗したスクリプト名（スレッドから追記する）
FAILED = []

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
        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                print(f"[{shop_label}] {line.strip()}", flush=True)
            
        process.wait()
        elapsed = time.time() - start_time
        
        if process.returncode == 0:
            print(f"[+] {script_name} finished successfully in {elapsed:.1f}s")
        else:
            print(f"[!] {script_name} failed with exit code {process.returncode}")
            FAILED.append(script_name)

    except Exception as e:
        print(f"[!] Error running {script_name}: {e}")
        FAILED.append(script_name)

def main():
    # 各ショップの取得数（ページ数など）。環境変数で上書きでき、0 ならそのショップは実行しない。
    # ゲオは公式ECが自動アクセスを拒否しているため、楽天API（rakuten-sync/）で取得している
    limits = {
        "nicosuma_scraper.py": int(os.environ.get("NICOSUMA_LIMIT", 100)),
        "iosis_scraper.py": int(os.environ.get("IOSIS_LIMIT", 100)),
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

    # 1つでも失敗したら非0で終了し、GitHub Actions を失敗扱いにして通知を飛ばす
    if FAILED:
        print(f"[!] Failed scrapers: {', '.join(FAILED)}")
        sys.exit(1)

if __name__ == "__main__":
    # scraper ディレクトリに移動してから実行することを想定
    main()
