/**
 * YouTube の横動画（@used_gadelog）。サイトの同じテーマのページに埋め込む（10/25〜）。
 * 題は YouTube の公開時の題と同じに。asOf は動画の数字の時点（longform/<フォルダ>/data.json の date）。
 */
export type Video = { id: string; title: string; minutes: number; asOf: string; /** 機種ページに出すときの見出し */ heading?: string };

export const VIDEOS = {
  iphoneDore: { id: "R1Aki2b5mds", title: "【中古iPhone】いま買うならどれ？17店・約7万件の相場で予算別に本気で選んだ", minutes: 10, asOf: "2026-10-21" },
  priceFactors: { id: "S8Oa_pOJ8NY", title: "【中古iPhone】どこにお金をかけるべき？ 世代・Pro・ランク・容量・電池を約7万件の相場で比べた", minutes: 9, asOf: "2026-10-23" },
  ipadDore: { id: "SHyQRQ8wAic", title: "【中古iPad】いま買うならどれ？ 16店の相場で「使い方別」に選んだ（無印・Air・mini・Pro）", minutes: 8, asOf: "2026-10-23" },
  whereToBuy: { id: "P78xAKBa274", title: "中古iPhone、店選びの正解は？16店の保証・電池表記・赤ロムを比較", minutes: 8, asOf: "2026-10-24" },
  proOrStandard: { id: "Bmp5EgeiqW0", title: "中古iPhone、Proの差額で何が増える？120Hz・望遠カメラ・容量を相場で比較", minutes: 10, asOf: "2026-10-24", heading: "Proと無印の違いを動画で見る" },
  // 10/28 公開（新型 MacBook Pro M6 の発表の翌日）
  mbpM6: { id: "iAzTGx6wsTs", title: "新型MacBook Pro M6 買う？中古のM5・M4にする？差は5.3万〜7.9万円｜新旧の違いと中古の相場で比べた", minutes: 8, asOf: "2026-10-28", heading: "新型 M6 と中古の差を動画で見る" },
  // 10/29 公開（タッチ対応の PROLED 発表の翌日・4択は 24GB・1TB でそろえた）
  mbpProled: { id: "goOpevlUKTw", title: "MacBook Pro、どれ買う？新型PROLED・新型M6・今のモデル・中古の4択を値段と違いで比べた", minutes: 8, asOf: "2026-10-29", heading: "新型2つ・今のモデル・中古の4択を動画で見る" },
  // 10/30 公開（新品の Air M5 と Pro M6 の違い・中古は Air M2 と M1 Pro）
  mbpVsAir: { id: "7NQettpZxHk", title: "MacBook ProとAir、何が違う？新品で11.5万円差｜Proにしかない6つと、Airで十分な人", minutes: 8, asOf: "2026-10-29", heading: "ProとAirの違いを動画で見る" },
  // 10/31 12:00 公開（容量の回。/iphone/price-factors の「128GBで足りる？」の後に）
  storage128: { id: "6xT8CuQi0J4", title: "中古iPhone、128GBで足りる？256GBとの差は6,200円から｜買取価格まで10機種の相場で比べた", minutes: 9, asOf: "2026-10-31", heading: "128GBで足りるかを動画で見る" },
  // 10/27 公開（電池の回。/iphone/battery に）
  battery: { id: "GcXIO15l6fU", title: "中古iPhoneのバッテリー、何%なら買っていい？85%以上が正解の理由を3.7万件の相場で", minutes: 11, asOf: "2026-10-26", heading: "中古の電池は何%なら買っていいかを動画で見る" },
  // 11/1 18:00 公開（M1 Air は 2026年でもまだ使えるか。/mac/macbook-air-m1 に）
  m1Air: { id: "lmlZcklod7E", title: "M1 MacBook Air、2026年でもまだ使える？中古8.4万円｜macOS 27対応と、買う前に知りたい弱点", minutes: 9, asOf: "2026-10-31", heading: "M1 Airがまだ使えるかを動画で見る" },
  // 月次の BEST5（11月）。iPhone の予算別ページに出す。11/2 18:00 公開
  monthly202611: { id: "FJ18j4Nw22I", title: "中古iPhoneおすすめBEST5【2026年11月】4万・5万・7万・10万・15万円の正解を3.7万件の相場で", minutes: 10, asOf: "2026-11-01", heading: "予算別のBEST5を動画で見る" },
  howOld: { id: "T7ltgSB-4XM", title: "中古iPhoneは何世代まで買っていい？iOS 27・修理の期間・相場で最低ラインを決めた", minutes: 9, asOf: "2026-10-25", heading: "何世代前まで買っていいかを動画で見る" },
  // 11/3 16時台に公開（予約の 11/5 18:00 を前倒し）。買取ページ（/iphone/<slug>/kaitori）とショート kaitoriswap と同じ考え方
  sellSwap: { id: "MSsibdtHR1E", title: "iPhoneを売って買い替えると実質いくら？13→14は+28,980円｜買取3店と中古相場で計算", minutes: 9, asOf: "2026-11-03", heading: "売って買い替えるといくら足すかを動画で見る" },
  // 11/7 12:00 公開（iPad 何世代まで。/ipad/how-long に）
  ipadHowOld: { id: "X-QOob6x4N0", title: "中古iPadは何世代まで買っていい？無印は第9世代から｜相場4.3万円", minutes: 10, asOf: "2026-11-06", heading: "何世代前まで買っていいかを動画で見る" },
  // 11/6 11時台に公開（今は買うな。17e・18 Pro・18 Pro Max の機種ページに）
  jirai: { id: "4jeD0o26_U4", title: "今は買うな｜中古iPhone 地雷6台・正解3台【2026年11月】", minutes: 10, asOf: "2026-11-06", heading: "今は買わないほうがいい機種を動画で見る" },
  // 11/8 12:00 公開（Pixel を1年あたりで比べる。/pixel/how-long と Pixel 6〜10 系の機種ページに）
  pixelPerYear: { id: "Zs1ZtFqdnuQ", title: "安いPixelほど損？中古6a・7a・8a、1年あたりで4倍の差【2026年11月】", minutes: 9, asOf: "2026-11-07", heading: "Pixel を「1年あたり」で比べた動画を見る" },
  // 11/12 0時台に公開（Apple Watch いま買うならどれ。健康機能・便利機能の章つき。/watch に）
  watchDore: { id: "WcYKNKIuH4c", title: "中古Apple Watch、いま買うならどれ？Series 9が3.8万円で正解｜SE・Series・Ultraを8,654件の相場で比較【2026年11月】", minutes: 10, asOf: "2026-11-11", heading: "いま買うならどの Apple Watch かを動画で見る" },
  // 11/13 夕方に公開（13 は今買いか。14・15 との差と、買う前に見る3つ。/iphone/iphone-13 に）
  iphone13Now: { id: "RZDic1sW4p0", title: "中古iPhone 13は今買い？相場5万800円｜14・15との差と、買う前に見る3つ【2026年11月】", minutes: 9, asOf: "2026-11-13", heading: "iPhone 13 がいま買いかを動画で見る" },
  // 11/15 12:00 公開（16 は今買いか。新品との差・未使用品・ランクBの256GB。/iphone/iphone-16 に）
  iphone16Now: { id: "YSnBsKwo_2c", title: "中古iPhone 16は今買い？新品との差は1万9,000円｜未使用品は新品より高い【2026年11月】", minutes: 9, asOf: "2026-11-13", heading: "iPhone 16 がいま買いかを動画で見る" },
  // 11/20 公開（予約の 11/21 12:00 を前倒し。12 は今買いか。128GB・電池85%以上・画面修理は本体より高い。/iphone/iphone-12 に）
  iphone12Now: { id: "-xnkA3ao01I", title: "中古iPhone 12は今買い？相場3万6,080円｜画面修理は本体より高い4万5,800円【2026年11月】", minutes: 9, asOf: "2026-11-19", heading: "iPhone 12 がいま買いかを動画で見る" },
  // 11/24 12:00 公開（15 は今買いか。14 との差は USB-C と A16・保証1年の店。/iphone/iphone-15 に）
  iphone15Now: { id: "4P5c1LG_57s", title: "中古iPhone 15は今買い？相場9万980円｜14との差2.6万円はUSB-Cの差【2026年11月】", minutes: 9, asOf: "2026-11-22", heading: "iPhone 15 がいま買いかを動画で見る" },
  // 11/23 公開（SE 3 まだ使う？電池交換か、14 Pro・15・17e に替えるか。/iphone/iphone-se-3rd-gen に）
  se3Keep: { id: "oKXwnypRDVs", title: "iPhone SE（第3世代）、まだ使う？電池交換は1万2,000円｜替えるなら14 Pro・15・17eで何が増える？【2026年11月】", minutes: 8, asOf: "2026-11-23", heading: "SE 3 をまだ使うか・替えるかを動画で見る" },
  // 11/25 12:00 公開（17e を新品で買うか、同じ値段の中古の 15 Pro・16 か。/iphone/iphone-17e・iphone-15-pro に）
  e17VsUsed: { id: "ARXtjpbIF2E", title: "17eを新品で買う？同じ12.5万円で中古の15 Pro・16？｜増える機能と、新品にしかないもの【2026年11月】", minutes: 8, asOf: "2026-11-23", heading: "新品の17eと中古の15 Pro・16の比較を動画で見る" },
  // 11/26 14時台公開（12・11 まだ使う？12 は電池交換・11 は売って13。/iphone/iphone-11 に。12 のページは今買いの回のまま）
  keep1211: { id: "70oYNTqwgRU", title: "iPhone 12・11、まだ使う？電池交換は同じ1万5,600円、答えは逆｜替えるなら13・15・17e【2026年11月】", minutes: 8, asOf: "2026-11-26", heading: "iPhone 11 をまだ使うか・替えるかを動画で見る" },
  // 11/27 0時台公開（Amazon ブラックフライデーの新品 Air と中古。1TB はセールの新品が中古より安い。/iphone/iphone-air に）
  bfAir: { id: "HCX_rp7YzvQ", title: "ブラックフライデー、Amazonの新品iPhone Airと中古どっちが安い？1TBは新品が安い【2026年11月】", minutes: 8, asOf: "2026-11-27", heading: "セールの新品 Air と中古の比較を動画で見る" },
} satisfies Record<string, Video>;

/**
 * 機種ページに出す横動画。Proと無印の回は iPhone 13〜17 の無印・Pro・Pro Max を比べている。
 * 何世代までの回は X〜12・SE（第2・第3世代）の iOS 27 対応・修理の期間・相場が中心（10/25〜）
 */
export function videoForModel(model: string): Video | null {
  // 中古の相場が新品より高い機種（地雷の回）
  if (/^iPhone 18 Pro( Max)?$/.test(model)) return VIDEOS.jirai;
  // 機種そのものの回がある機種は、Proと無印の回より先に（1ページに1本）
  if (model === "iPhone 13") return VIDEOS.iphone13Now;
  if (model === "iPhone 16") return VIDEOS.iphone16Now;
  if (model === "iPhone 12") return VIDEOS.iphone12Now;
  if (model === "iPhone 15") return VIDEOS.iphone15Now;
  if (model === "iPhone SE (第3世代)") return VIDEOS.se3Keep;
  if (model === "iPhone 11") return VIDEOS.keep1211;
  if (model === "iPhone Air") return VIDEOS.bfAir;
  if (model === "iPhone 17e" || model === "iPhone 15 Pro") return VIDEOS.e17VsUsed;
  if (/^iPhone 1[3-7]( Pro( Max)?)?$/.test(model)) return VIDEOS.proOrStandard;
  // 4択の回の中心（中古の M5 Pro 24GB・1TB と、16インチ M5 Pro）
  if (/^MacBook Pro 1[46]インチ M5 Pro$/.test(model)) return VIDEOS.mbpProled;
  // 新型 M6 の回で比べた MacBook Pro 14インチ（M5・M5 Pro・M4・M3・M1 Pro）
  if (/^MacBook Pro 14インチ (M5( Pro)?|M4|M3|M1 Pro)$/.test(model)) return VIDEOS.mbpM6;
  // ProとAirの回で比べた Air（新品の M5・中古の M2）
  if (/^MacBook Air 13インチ (M2|M5)$/.test(model)) return VIDEOS.mbpVsAir;
  if (model === "MacBook Air M1") return VIDEOS.m1Air;
  if (/^iPhone (1[12]( mini| Pro( Max)?)?|X[SR]?( Max)?|SE \(第[23]世代\))$/.test(model)) return VIDEOS.howOld;
  // Pixel を1年あたりで比べた回（6・6 Pro・6a・7・7 Pro・7a・8・8 Pro・8a・9・9a・10・10a）
  if (/^Pixel ([6-9]( Pro)?|[6-9]a|10a?)$/.test(model)) return VIDEOS.pixelPerYear;
  return null;
}
