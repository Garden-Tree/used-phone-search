import Link from "next/link";
import AdDisclosure from "./AdDisclosure";
import { OFFICIAL_X_URL, OFFICIAL_YOUTUBE_URL } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="max-w-[1360px] mx-auto px-4 mt-12 pb-12 text-center border-t border-line pt-8">
      <AdDisclosure />
      <p className="text-xs text-ink-mute mb-3">
        <Link href="/about" className="text-brand-600 hover:text-brand-800 underline underline-offset-2">このサイトについて（運営者・プライバシーポリシー・お問い合わせ）</Link>
      </p>
      <p className="text-xs text-ink-mute mb-3">
        公式:{" "}
        <a href={OFFICIAL_X_URL} target="_blank" rel="noopener" aria-label="中古スマホ一括検索の公式X（@used_gadelog）" className="text-brand-600 hover:text-brand-800 underline underline-offset-2">X</a>
        {" ・ "}
        <a href={OFFICIAL_YOUTUBE_URL} target="_blank" rel="noopener" aria-label="中古スマホ一括検索の公式YouTubeチャンネル" className="text-brand-600 hover:text-brand-800 underline underline-offset-2">YouTube</a>
      </p>
      <p className="text-sm text-ink-mute">
        &copy; {new Date().getFullYear()} 中古スマホ一括検索 ・ by{" "}
        <a href="https://gadelog.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-800 underline underline-offset-2">ガデログ</a>
      </p>
    </footer>
  );
}
