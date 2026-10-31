import { INSURANCE_PROGRAMS } from "@/lib/buyback";

const PR_BADGE = <span className="text-[10px] font-normal text-ink-mute border border-line rounded px-1 py-px leading-none">PR</span>;

/**
 * スマホの保険の A8 リンク（10/31〜）。iPhone の「直す？買い替える？」と /iphone/where-to-buy の保証の節の後に出す。
 * 保険業法・A8 の禁止事項により、載せるのは A8 の素材（文言そのまま）と会社名だけ。補償の中身・おすすめ・他の補償との比較は書かない（ideas/2026-10-30.md）。
 * withPixel: 1x1 の計測画像をここで出す（機種ページはページ側でまとめて出すので false）
 */
export default function InsuranceLinks({ model, withPixel = false }: { model?: string; withPixel?: boolean }) {
  return (
    <>
      <span className="flex items-center gap-1.5 text-[10px] text-ink-mute">スマホの保険 {PR_BADGE}</span>
      {INSURANCE_PROGRAMS.map((p) => (
        <div key={p.name} className="flex flex-col">
          <a
            href={p.href}
            target="_blank"
            rel="sponsored nofollow noopener"
            data-shop-click=""
            data-shop={`${p.name}（保険）`}
            data-model={model ?? ""}
            data-link-type="a8"
            className="block py-1 hover:bg-ground rounded"
          >
            <span className="text-[13px] font-bold text-ink">{p.text} <span className="text-ink-mute" aria-hidden="true">›</span></span>
          </a>
          <span className="text-[10px] text-ink-mute leading-snug">{p.company}</span>
          {withPixel && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imgSrc} width={1} height={1} alt="" />
          )}
        </div>
      ))}
    </>
  );
}
