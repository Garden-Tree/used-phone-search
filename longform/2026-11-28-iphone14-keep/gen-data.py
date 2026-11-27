import json
D = "longform/assets/"
ch = []
ch.append({"title": "家のiPhone 14、5年目の困りごと", "scene": {"type": "problems", "heading": "家のiPhone 14、替える？", "who": "iPhone 14（5年目）", "img": D+"irasutoya/old-smartphone.png",
  "items": [{"text": "電池が夕方までもたない", "cue": "最近、電池が"}, {"text": "家族の充電器はUSB-C", "cue": "家族はみんな"}, {"text": "写真で128GBがいっぱい", "cue": "写真で128GB"}]}})
ch.append({"title": "困りごとで分かれる", "scene": {"type": "flow", "heading": "電池交換か、買い替えか", "q": "何に困ってる？",
  "branches": [{"label": "電池だけ", "answer": "電池交換", "sub": "Apple 17,200円", "cue": "電池だけなら", "pick": True},
               {"label": "ケーブル", "answer": "3台から選ぶ", "sub": "この先で", "cue": "それなら、売って"}]}})
ch.append({"title": "14は5年目。iOS 27にも対応", "scene": {"type": "years", "heading": "発売から今日まで", "start": 2019, "end": 2028, "today": 2026.9, "todayLabel": "2026年11月",
  "rows": [{"label": "iPhone 11", "from": 2019.7, "cue": "11は、8年目"}, {"label": "iPhone 12", "from": 2020.8, "cue": "発売した年から"}, {"label": "iPhone 13", "from": 2021.7, "cue": "発売した年から"},
           {"label": "iPhone 14", "from": 2022.7, "cue": "発売した年から", "pick": True}, {"label": "iPhone 15", "from": 2023.7, "cue": "発売した年から"}], "sweep": "時計を進めると"}})
sell = 42000
def item(label, price, cue, pick=False):
    parts = [{"label": "本体", "value": price}, {"label": "14を売る", "value": sell, "minus": True}]
    return {"label": label, "parts": parts, "cue": cue}
ch.append({"title": "替えるといくら？14を売って足すお金", "scene": {"type": "costs", "heading": "14を美品で売って替えると、いくら？", "unit": "円",
  "items": [{"label": "電池交換", "parts": [{"label": "電池交換", "value": 17200}], "cue": "電池交換は、1万", "pick": True},
            item("中古の15", 91700, "中古の15は"), item("中古の16e", 106980, "中古の16eだと"), item("中古の17", 148980, "中古の17は")],
  "diff": {"from": 0, "to": 1, "label": "差 3万2,500円", "cue": "3万2,500円の差"},
  "legend": [{"label": "払う", "color": "#3E3BB8"}, {"label": "14を売って戻る", "color": "#1E8A6E", "minus": True}]}})
ch.append({"title": "電池交換で何が変わる？", "scene": {"type": "screen", "heading": "設定のバッテリーの画面はこんなイメージ", "title": "バッテリーの状態と充電",
  "rows": [{"label": "バッテリーの状態", "value": "サービス"}, {"label": "最大容量", "value": "79%"}, {"label": "充電の最適化", "value": "オン"}],
  "points": [{"row": 1, "text": "最大容量", "sub": "新品のときの何%残っているか", "cue": "最大容量っていう"},
             {"row": 1, "text": "交換すると新しい電池の値に", "sub": "データ・設定はそのまま", "cue": "電池を替えると、この"}]}})
ch.append({"title": "画面が割れていたら", "scene": {"type": "bars", "heading": "画面が割れた14、直す？買い直す？", "unit": "円",
  "rows": [{"label": "そのまま直す", "median": 45800, "sub": "Appleで修理", "cue": "Appleの画面修理は", "say": "画面修理"},
           {"label": "売って中古の14", "median": 53780, "sub": "割れたまま売って", "cue": "それで中古の14", "say": "中古の14"},
           {"label": "売って中古の15", "median": 79700, "sub": "割れたまま売って", "cue": "割れたまま売って中古の15", "say": "中古の15"}]}})
C15 = "iPhone 15 — Ka Kit Pang / Public domain / Wikimedia Commons"
ch.append({"title": "替えるなら① 中古の15", "scene": {"type": "photo", "heading": "中古の15で変わるのはUSB-Cとカメラ", "src": D+"commons/iphone15-pd.jpg", "credit": "Apple " + C15,
  "points": [{"text": "USB-C", "sub": "MacやiPadと同じケーブル", "cue": "いちばん大きいのは"},
             {"text": "48MP・2倍の光学ズームイン", "sub": "14は12MP", "cue": "カメラも変わるの"},
             {"text": "Dynamic Island", "sub": "タイマー・音楽", "cue": "上の黒い部分に"},
             {"text": "256GBでも +6,600円", "sub": "128GBとの差", "cue": "替えるときに、容量を"},
             {"text": "足すお金 +49,700円", "sub": "14を売って", "cue": "替える先の1つ目は"}],
  "images": [{"src": D+"commons/iphone15-usbc-port-kyu3.jpg", "credit": "USB-C port of iPhone 15 — Kyu3 / CC BY-SA 4.0 / Wikimedia Commons", "crop": {"x": 0.25, "y": 0.28, "w": 0.5, "h": 0.36}, "cue": "いちばん大きいのは"},
             {"src": D+"commons/lightning-usbc-cable-kyu3a.jpg", "credit": "Lightning USB type C cable — Kyu3a / CC BY-SA 4.0 / Wikimedia Commons", "cue": "MacやiPad、ゲーム機"},
             {"src": D+"commons/iphone15-back-blue-meidoriyo.jpg", "credit": "Back view of iPhone 15 Blue — メイド理世 / CC BY-SA 4.0 / Wikimedia Commons", "crop": {"x": 0.18, "y": 0.1, "w": 0.6, "h": 0.42}, "cue": "カメラも変わるの"},
             {"src": D+"irasutoya/photo-taking.png", "credit": "", "cue": "14で大きく撮るときは"},
             {"src": D+"commons/iphone15-pd.jpg", "credit": "Apple " + C15, "cue": "上の黒い部分に"}]}})
ch.append({"title": "替えるなら② 中古の16e、15と比べると", "scene": {"type": "versus", "heading": "中古の15と16e、どっち？",
  "left": {"title": "中古の15", "value": "91,700円", "sub": "MagSafe・超広角あり", "cue": "中古の15は9万"},
  "right": {"title": "中古の16e", "value": "106,980円", "sub": "A18・ビデオ再生 26時間", "cue": "16eは10万", "crosses": [{"text": "MagSafe", "cue": "16eに、MagSafeは"}, {"text": "超広角", "cue": "2つ目は、超広角"}]},
  "win": {"side": "right", "label": "電池は6時間長い", "cue": "6時間長いの"}}})
ch.append({"title": "替えるなら③ 中古の17、電池の長さ", "scene": {"type": "gauges", "heading": "Appleの仕様のビデオ再生の時間", "unit": "時間", "max": 33,
  "items": [{"label": "iPhone 14", "value": 20, "cue": "14は20時間"}, {"label": "iPhone 15", "value": 20, "cue": "15も20時間"},
            {"label": "16e", "value": 26, "cue": "16eは26時間"}, {"label": "中古の17", "value": 30, "cue": "17は30時間", "pick": True}]}})
ch.append({"title": "中古の17は全部入り", "scene": {"type": "photo", "heading": "中古の17は、16eにないものも全部ある", "src": D+"commons/iphone17-back-lavender-azuresaturn.jpg", "credit": "iPhone 17 (Lavender) — AzureSaturn / CC0 / Wikimedia Commons", "crop": {"x": 0.08, "y": 0.1, "w": 0.84, "h": 0.62},
  "points": [{"text": "MagSafe・48MPの超広角", "sub": "16eにない2つ", "cue": "しかも17には"},
             {"text": "6.3インチ・120Hz", "sub": "ロック中も時計が見える", "cue": "画面は6.3インチ"},
             {"text": "256GBから", "sub": "128GBの2倍", "cue": "17は、いちばん小さくても"},
             {"text": "足すお金 +106,980円", "sub": "新品より10,820円安い", "cue": "中古の相場は、256GB"},
             {"text": "SIMカードは使えない", "sub": "eSIMだけ", "cue": "気をつけるのは、SIM"}],
  "images": [{"src": D+"commons/iphone17-black-ahmadalikarim.jpg", "credit": "Black iPhone 17 — Ahmad Ali Karim / CC0 / Wikimedia Commons", "crop": {"x": 0.1, "y": 0.1, "w": 0.8, "h": 0.6}, "cue": "画面は6.3インチ"},
             {"src": D+"commons/sim-card-multisize-izzzyy.jpg", "credit": "Multi-size T-Mobile SIM card — Izzzyy / CC0 / Wikimedia Commons", "cue": "気をつけるのは、SIM"}]}})
ch.append({"title": "替えるならこの3台", "scene": {"type": "lineup", "heading": "14から替えるなら",
  "items": [{"title": "USB-C：中古の15", "value": "+49,700円", "sub": "A16・MagSafe・超広角", "cue": "USB-Cとカメラなら", "pick": True},
            {"title": "電池・AI：中古の16e", "value": "+64,980円", "sub": "MagSafe・超広角なし", "cue": "電池の長さとApple"},
            {"title": "全部：中古の17", "value": "+106,980円", "sub": "256GB・eSIMだけ", "cue": "電池も機能も全部"}],
  "stamp": {"text": "迷ったら／15", "cue": "迷ったら15かな", "x": 0.245, "y": 0.15, "size": 190}}})
ch.append({"title": "答え：困りごと別", "scene": {"type": "flow", "heading": "iPhone 14、まだ使う？", "q": "何に困ってる？", "keepAll": True,
  "branches": [{"label": "電池だけ", "answer": "電池交換", "sub": "17,200円", "cue": "電池だけなら、電池交換"},
               {"label": "画面が割れた", "answer": "まず修理と比べる", "sub": "修理 45,800円", "cue": "画面が割れたら"},
               {"label": "ケーブル", "answer": "中古の15", "sub": "+49,700円", "cue": "ケーブルと写真も", "pick": True},
               {"label": "全部ほしい", "answer": "中古の17", "sub": "+106,980円", "cue": "電池も機能も全部"}]}})
ch.append({"title": "次におすすめの動画", "scene": {"type": "endScreen", "heading": "次はこちらの動画がおすすめ",
  "videos": [{"id": "vzlNKTznOTY", "title": "iPhone 13、まだ使う？電池交換は1万5,600円｜売って中古の15なら+5万9,100円"},
             {"id": "70oYNTqwgRU", "title": "iPhone 12・11、まだ使う？電池交換は同じ1万5,600円、答えは逆"}]}})
data = {"date": "2026-11-27", "shops": 18, "source": "script.md（data-query.log・集計 2026/11/27 12:38 JST・18店）。公開の前日に取り直す",
  "thumbnail": {"lines": ["iPhone 14", "まだ使う？"], "badge": [{"text": "電池交換"}, {"text": "1.7万円", "red": True}], "footer": "替えるなら15・16e・17【2026年11月】"},
  "chapters": ch}
json.dump(data, open("longform/2026-11-28-iphone14-keep/data.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(len(ch))
