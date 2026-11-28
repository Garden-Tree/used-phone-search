import json
# 12/1 月1（図解版・11/28）。数字は script.md（data-query.log 11/28）。11/30 に取り直したら、ここの数字と台詞を直して python で作り直す
D = "longform/assets/"
ch = []
ch.append({"title": "中古なのに、新品より高いiPhone", "scene": {"type": "bars", "heading": "iPhone 17e 256GB、新品と中古", "unit": "円",
  "rows": [{"label": "Appleの新品", "median": 124800, "sub": "apple.com", "cue": "Appleの新品より高い", "say": "新品"},
           {"label": "中古の真ん中", "median": 126819, "sub": "489件", "cue": "17eの中古は", "say": "中古", "pick": True, "pickLabel": "中古が高い"}]}})
ch.append({"title": "11月から動いた値段", "scene": {"type": "bars", "heading": "この1か月で下がった額", "unit": "円",
  "rows": [{"label": "17 Pro Max", "median": 9800, "sub": "256GB", "cue": "下がった額がいちばん", "say": "17 Pro Max"},
           {"label": "16e", "median": 9200, "sub": "128GB・−8.6%", "cue": "16eも、ほとんど", "say": "16e"},
           {"label": "14 Pro", "median": 5500, "sub": "128GB", "cue": "ぜんぶ下がった"},
           {"label": "16", "median": 4520, "sub": "128GB", "cue": "ぜんぶ下がった"}],
  "note": "10/29→11/28・相場の容量どうし。店は16→18に増えた"}})
C12 = "iPhone 12 Green — 茅野ふたば / CC BY-SA 4.0 / Wikimedia Commons"
CROP12 = {"x": 0.24, "y": 0.165, "w": 0.52, "h": 0.335}
ch.append({"title": "4万円：iPhone 12", "scene": {"type": "photo", "heading": "4万円なら iPhone 12", "src": D+"commons/iphone12-green-back-chinofutaba.jpg", "credit": C12, "crop": CROP12,
  "points": [{"text": "有機EL・5G・MagSafe", "sub": "相場 36,080円（64GB）", "cue": "画面は有機ELで"},
             {"text": "162g", "sub": "5台でいちばん軽い", "cue": "162グラム"},
             {"text": "電池85%以上は5台に1台", "sub": "書いてある在庫 18%", "cue": "85%以上と書いてある"},
             {"text": "128GBでも +5,500円", "sub": "41,580円", "cue": "128GBとの差"}],
  "images": [{"src": D+"commons/magsafe-charger-hand-trendingreviews.png", "credit": "MagSafe (iPhone) — Trending Reviews / CC BY 3.0 / Wikimedia Commons", "cue": "背中に磁石で"},
             {"src": D+"irasutoya/battery-low.png", "credit": "", "cue": "85%以上と書いてある"},
             {"src": D+"commons/iphone12-green-back-chinofutaba.jpg", "credit": C12, "crop": CROP12, "cue": "64GBで足りる"}]}})
ch.append({"title": "7万円：13 Proと14", "scene": {"type": "versus", "heading": "7万円なら、13 Pro？14？",
  "left": {"title": "中古の14", "value": "64,300円", "sub": "電池85%以上が4割", "cue": "14がほとんど同じ"},
  "right": {"title": "中古の13 Pro", "value": "65,780円", "sub": "120Hz・3倍の望遠", "cue": "決まりで選ぶと、13 Pro"},
  "win": {"side": "left", "label": "電池は14が選びやすい", "cue": "14が4割以上"}}})
ch.append({"title": "10万円：16eと15", "scene": {"type": "versus", "heading": "10万円なら、16e？15？",
  "left": {"title": "中古の15", "value": "91,700円", "sub": "MagSafe・超広角あり", "cue": "15は、16eより"},
  "right": {"title": "中古の16e", "value": "97,980円", "sub": "A18・ビデオ再生 26時間", "cue": "決まりで選ぶと16e",
            "crosses": [{"text": "MagSafe", "cue": "1つ目は、MagSafe"}, {"text": "超広角", "cue": "2つ目は、超広角"}]},
  "win": {"side": "right", "label": "電池は6時間長い", "cue": "6時間長いの"}}})
C15P = "Back view of iPhone 15 Pro Natural titanium — メイド理世 / CC BY-SA 4.0 / Wikimedia Commons"
CROP15P = {"x": 0.29, "y": 0.155, "w": 0.36, "h": 0.3}
ch.append({"title": "13万円：iPhone 15 Pro", "scene": {"type": "photo", "heading": "13万円なら iPhone 15 Pro", "src": D+"commons/iphone15pro-back-naturaltitanium-meidoriyo.jpg", "credit": C15P, "crop": CROP15P,
  "points": [{"text": "A17 Pro・Apple Intelligence", "sub": "相場 129,180円（256GB）", "cue": "16eと同じで"},
             {"text": "120Hz・3倍の望遠", "sub": "超広角・MagSafeもある", "cue": "そのうえ、120Hz"},
             {"text": "アクションボタン", "sub": "カメラやライトをすぐ出せる", "cue": "横のアクションボタン"},
             {"text": "電池85%以上は4台に1台", "sub": "書いてある在庫 25%", "cue": "85%以上と書いてある"}],
  "images": [{"src": D+"commons/iphone15pro-front-dynamicisland-sploopydoppy.jpg", "credit": "iPhone Dynamic Island — SploopyDoppy / CC0 / Wikimedia Commons（iPhone 15 Pro）", "cue": "横のアクションボタン"},
             {"src": D+"commons/iphone15pro-back-naturaltitanium-meidoriyo.jpg", "credit": C15P, "crop": CROP15P, "cue": "85%以上と書いてある"}]}})
ch.append({"title": "13万円のもう1台：16の256GB", "scene": {"type": "versus", "heading": "13万円なら、15 Pro？16？",
  "left": {"title": "中古の15 Pro", "value": "129,180円", "sub": "120Hz・3倍の望遠", "cue": "15 Proで、電池"},
  "right": {"title": "中古の16 256GB", "value": "133,180円", "sub": "電池85%以上が7割", "cue": "16の256GBもある",
            "crosses": [{"text": "120Hz", "cue": "16の画面は120Hz"}, {"text": "3倍の望遠", "cue": "3倍の望遠もない"}]},
  "win": {"side": "right", "label": "電池は16が選びやすい", "cue": "7割近いの"}}})
C17PM = "Cosmic Orange iPhone 17 Pro Max — Ahmad Ali Karim / CC0 / Wikimedia Commons"
ch.append({"title": "20万円：iPhone 17 Pro Max", "scene": {"type": "photo", "heading": "20万円なら iPhone 17 Pro Max", "src": D+"commons/iphone17promax-orange-ahmadalikarim.jpg", "credit": C17PM, "crop": {"x": 0.1, "y": 0.04, "w": 0.82, "h": 0.9},
  "points": [{"text": "6.9インチ・4倍と8倍", "sub": "相場 198,980円（256GB）", "cue": "画面は6.9インチ"},
             {"text": "電池85%以上は8割以上", "sub": "書いてある在庫 85%", "cue": "85%以上と書いてある"},
             {"text": "233g", "sub": "12より約70g重い", "cue": "重さが233"},
             {"text": "SIMカードは使えない", "sub": "eSIMだけ", "cue": "SIMカードは使えなくて"}],
  "images": [{"src": D+"commons/iphone17promax-orange-ahmadalikarim.jpg", "credit": C17PM, "crop": {"x": 0.17, "y": 0.07, "w": 0.66, "h": 0.26}, "cue": "カメラは4倍と8倍"},
             {"src": D+"commons/iphone17promax-silver-ahmadalikarim.jpg", "credit": "Silver iPhone 17 Pro Max — Ahmad Ali Karim / CC0 / Wikimedia Commons", "crop": {"x": 0.1, "y": 0.04, "w": 0.82, "h": 0.9}, "cue": "85%以上と書いてある"},
             {"src": D+"commons/sim-card-multisize-izzzyy.jpg", "credit": "Multi-size T-Mobile SIM card — Izzzyy / CC0 / Wikimedia Commons", "cue": "SIMカードは使えなくて"}]}})
ch.append({"title": "電池の長さで5台を比べると", "scene": {"type": "gauges", "heading": "Appleの仕様のビデオ再生の時間", "unit": "時間", "max": 42,
  "items": [{"label": "12", "value": 17, "cue": "12は17時間"}, {"label": "13 Pro", "value": 22, "cue": "13 Proと15 Pro"},
            {"label": "15 Pro", "value": 23, "cue": "13 Proと15 Pro"}, {"label": "16e", "value": 26, "cue": "16eは26時間"},
            {"label": "17 Pro Max", "value": 39, "cue": "17 Pro Maxは39時間", "pick": True}]}})
ch.append({"title": "いま中古で買わない3台", "scene": {"type": "pairs", "heading": "256GB、Appleの新品と中古の真ん中", "unit": "円",
  "legend": ["Appleの新品", "中古の真ん中"], "colors": ["inkMute", "brand600"],
  "rows": [{"label": "17e", "a": 124800, "b": 126819, "diffLabel": "+2,019円", "cue": "17e、18 Pro"},
           {"label": "18 Pro", "a": 219800, "b": 224480, "diffLabel": "+4,680円", "cue": "17e、18 Pro"},
           {"label": "18 Pro Max", "a": 239800, "b": 247780, "diffLabel": "+7,980円", "cue": "18 Pro Maxは"}],
  "note": "新品は apple.com・中古は 2026/11/28 の中央値"}})
ch.append({"title": "予算ごとの5台", "scene": {"type": "lineup", "heading": "12月の中古iPhone、予算ごとの5台", "style": "steps",
  "items": [{"title": "4万円", "value": "iPhone 12", "sub": "軽くて安い", "cue": "4万円は12"},
            {"title": "7万円", "value": "13 Pro", "sub": "14もほぼ同じ値段", "cue": "7万円は13 Pro"},
            {"title": "10万円", "value": "16e", "sub": "15なら MagSafe", "cue": "10万円は16e", "pick": True},
            {"title": "13万円", "value": "15 Pro", "sub": "望遠とAI", "cue": "13万円は15 Pro"},
            {"title": "20万円", "value": "17 Pro Max", "sub": "大画面と電池", "cue": "20万円は17 Pro Max"}],
  "stamp": {"text": "ずんだもんは 15", "cue": "15にするのだ", "x": 0.33, "y": 0.76, "size": 240, "style": "ribbon"}}})
ch.append({"title": "買う前に見る3つ", "scene": {"type": "checklist", "heading": "買う前に見る3つ",
  "items": [{"text": "電池の数字", "sub": "85%以上か", "cue": "最初に電池の数字"},
            {"text": "ネットワーク利用制限が ○", "sub": "△・× は避ける", "cue": "ネットワーク利用制限"},
            {"text": "お店の保証の長さ", "sub": "同じ値段なら長いほう", "cue": "お店の保証の長さ"}]}})
ch.append({"title": "次におすすめの動画", "scene": {"type": "endScreen", "heading": "次はこちらの動画がおすすめ",
  "videos": [{"id": "ARXtjpbIF2E", "title": "17eを新品で買う？同じ12.5万円で中古の15 Pro・16？"},
             {"id": "wfkUgsa8R_o", "title": "iPhone 14、まだ使う？電池交換は1万7,200円｜替えるなら15・16e・17"}]}})
data = {"date": "2026-11-28", "shops": 18, "source": "script.md（data-query.log・2026/11/28 16時ごろ・18店）。11/30 に取り直す",
  "thumbnail": {"lines": ["12月の中古iPhone", "買う5台"], "badge": [{"text": "16e"}, {"text": "−9,200円", "red": True}], "footer": "いま買わない3台も【2026年12月】"},
  "chapters": ch}
json.dump(data, open("longform/2026-12-01-monthly/data.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(len(ch))
