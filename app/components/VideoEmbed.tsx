import type { Video } from "@/lib/videos";

/** 同じテーマの横動画（YouTube）。youtube-nocookie・画面に近づくまで読み込まない（loading="lazy"） */
export default function VideoEmbed({ video, heading = "動画で見る", className = "" }: { video: Video; heading?: string; className?: string }) {
  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      <h2 className="text-lg md:text-xl font-bold">{heading}<span className="whitespace-nowrap">（約{video.minutes}分）</span></h2>
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-line bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}`}
          title={video.title}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
      <p className="text-xs text-ink-mute">動画の数字は {video.asOf.replace(/-/g, "/")} 時点。このページの数字は毎日更新しています。</p>
    </section>
  );
}
