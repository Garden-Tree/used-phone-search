# 動画の台帳 shorts/published.md を作り直す（ネタ被りを防ぐため）
# 使い方: python shorts/ledger.py   （ショート・横動画を作ったら回す）
# ショート: shorts/out/<日付>-<テーマ>/script.json のタイトル。動画IDは ideas/*.md の行から推定
#   （同じ行にフォルダ名、またはテーマ名があり、ideas の日付がフォルダの日付の -1〜+3 日のもの）
# 横動画: longform/<日付>-<名前>/youtube.txt の1行目と、lib/videos.ts の公開済みの ID（asOf と題名で突き合わせ）
import json, re, glob, os
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shorts", "out")
LONG = os.path.join(ROOT, "longform")
D = lambda s: date.fromisoformat(s[:10])

shorts = []
for d in sorted(os.listdir(OUT)):
    sp = os.path.join(OUT, d, "script.json")
    if not re.match(r"^\d{4}-\d{2}-\d{2}-", d) or not os.path.exists(sp):
        continue
    s = json.load(open(sp, encoding="utf-8"))
    shorts.append({"dir": d, "date": d[:10], "theme": s.get("theme") or re.sub(r"^\d{4}-\d{2}-\d{2}-", "", d),
                   "title": ((s.get("youtube") or {}).get("title") or "").replace("|", "／"),
                   "live": "実写" if s.get("liveClip") else "", "ids": []})
themes = sorted({x["theme"] for x in shorts}, key=len, reverse=True)

for p in sorted(glob.glob(os.path.join(ROOT, "ideas", "2026-*.md"))):
    m = re.search(r"(\d{4}-\d{2}-\d{2})", os.path.basename(p))
    if not m:
        continue
    fd = D(m.group(1))
    for line in open(p, encoding="utf-8"):
        for mm in re.finditer(r"shorts/([A-Za-z0-9_-]{11})", line):
            vid = mm.group(1)
            before = line[max(0, mm.start() - 120):mm.start()]
            hit = [x for x in shorts if x["dir"] in line]
            if not hit:
                th = next((t for t in themes if re.search(r"(?<![a-z])" + t + r"(?![a-z])", before)), None)
                if th:
                    c = [x for x in shorts if x["theme"] == th and -3 <= (D(x["date"]) - fd).days <= 1]
                    c.sort(key=lambda x: abs((D(x["date"]) - fd).days))
                    hit = c[:1]
            for x in hit:
                if vid not in x["ids"] and vid != "relatedLong":
                    x["ids"].append(vid)

vids = open(os.path.join(ROOT, "lib", "videos.ts"), encoding="utf-8").read()
longs = []
for d in sorted(os.listdir(LONG)):
    yp = os.path.join(LONG, d, "youtube.txt")
    if not re.match(r"^\d{4}-\d{2}-\d{2}-", d) or not os.path.exists(yp):
        continue
    title = open(yp, encoding="utf-8").readline().strip()
    vid = "-"
    for m in re.finditer(r'id: "([^"]+)", title: "([^"]+)"', vids):
        if m.group(2)[:12] == title[:12]:
            vid = m.group(1)
    longs.append((d[:10], d[11:], title.replace("|", "／"), vid))

L = [
    "# 動画の台帳（自動生成: `python shorts/ledger.py`。手で書き換えない）",
    "",
    "新しく作る前に、テーマ・1位の機種・切り口が**直近2週間**の回と重ならないかをここで見る。",
    "動画IDは ideas/*.md と lib/videos.ts からの推定（「-」は未記録か下書きだけの回）。",
    "",
    "## 横動画",
    "",
    "| 日付 | フォルダ | タイトル | 動画ID |",
    "| --- | --- | --- | --- |",
] + [f"| {a} | {b} | {c} | {e} |" for a, b, c, e in reversed(longs)] + [
    "",
    "## ショート",
    "",
    "| 日付 | テーマ | タイトル | 動画ID | 0秒目 |",
    "| --- | --- | --- | --- | --- |",
] + [f"| {x['date']} | {x['theme']} | {x['title'] or '（台本のみ）'} | {' '.join(x['ids']) or '-'} | {x['live']} |" for x in reversed(shorts)]
open(os.path.join(ROOT, "shorts", "published.md"), "w", encoding="utf-8", newline="\n").write("\n".join(L) + "\n")
print(len(longs), "long /", len(shorts), "shorts /", sum(1 for x in shorts if x["ids"]), "with id")
