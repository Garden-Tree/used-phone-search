import Link from "next/link";
import type { ReactNode } from "react";

// 運営者（中古スマホ店の検品担当）のブログ記事の要点を、機種別ページに短く載せる。
// 内容を変えるときは元記事（GUIDE_URL）と食い違わないようにする
const GUIDE_URL = "https://gadelog.com/used-iphone-inspection-guide/";

type Props = {
  model: string;
  /** この機種の在庫に 64GB があるか */
  has64GB: boolean;
};

export function inspectionTips({ model, has64GB }: Props) {
  const searchWithBattery = `/search?${new URLSearchParams({ model, minBattery: "85" }).toString()}`;
  const tips: { title: string; body: ReactNode }[] = [
    {
      title: "いちばん大事なのはバッテリー最大容量",
      body: (
        <>
          多くの店で最大容量は値段に反映されていないので、同じ値段なら最大容量が高い個体を選ぶだけで得をします。
          <Link href={searchWithBattery} className="text-brand-600 font-bold hover:underline ml-1">
            {model}をバッテリー85%以上で絞り込む &rarr;
          </Link>
        </>
      ),
    },
    {
      title: "状態ランクは「外装の傷」の話",
      body: "ランクAでもバッテリーが弱い個体、ランクBでも元気な個体があります。傷はケースで隠れるので、ランクは値段を下げる理由と考えるのがおすすめです。",
    },
    {
      title: "ネットワーク利用制限「△」は基本気にしなくていい",
      body: "大手の中古店はたいてい赤ロム保証を付けていて、「×」になっても返金に応じます。フリマにはこの保証がありません。",
    },
  ];

  if (model === "iPhone 11") {
    tips.splice(1, 0, {
      title: "iPhone 11 は画面の残像（焼き付き）に注意",
      body: "検品していて残像がひどい個体が多い機種です。白い画面を表示して、キーボードやステータスバーの形が薄く残っていないかを確認し、返品に応じる店で買うのが安全です。",
    });
  }
  if (has64GB) {
    tips.push({
      title: "容量は128GB以上を",
      body: "OSと標準アプリだけで相当使うため、64GBは写真を撮る人だとすぐ足りなくなります。64GBが安いのはそのためです。",
    });
  }

  return tips;
}

export default function InspectionTips({ model, has64GB }: Props) {
  const tips = inspectionTips({ model, has64GB });
  return (
    <section id="points" className="scroll-mt-16 rounded-xl border border-inspect-line bg-inspect-50 p-3.5 md:p-4">
      <h2 className="text-[15px] font-bold">検品担当が見るポイント</h2>
      <p className="text-xs text-inspect-800 mb-3">運営者は中古スマホ店で検品を担当しています</p>
      <ol className="space-y-3">
        {tips.map((t, i) => (
          <li key={t.title} className="flex gap-2.5">
            <span className="shrink-0 w-[22px] h-[22px] rounded-full bg-inspect-700 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-bold">{t.title}</p>
              <p className="text-[13px] text-gray-700 leading-[1.7]">{t.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <a href={GUIDE_URL} target="_blank" rel="noopener" className="inline-block mt-3 text-[13px] font-bold text-brand-600 hover:underline">
        詳しくは「検品担当が教える、買ってはいけない個体と狙い目」 &rarr;
      </a>
    </section>
  );
}
