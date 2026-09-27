import Link from "next/link";
import AdDisclosure from "./AdDisclosure";

export default function SiteFooter() {
  return (
    <footer className="max-w-6xl mx-auto px-4 mt-12 pb-12 text-center border-t border-slate-100 pt-8">
      <AdDisclosure />
      <p className="text-xs text-slate-400 mb-3">
        <Link href="/about" className="hover:text-blue-600 underline underline-offset-2">このサイトについて（運営者・プライバシーポリシー・お問い合わせ）</Link>
      </p>
      <p className="text-sm text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} 中古スマホ一括検索
      </p>
      <p className="text-xs text-slate-300 mt-2">
        powered by <a href="https://gadelog.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors font-bold underline underline-offset-2">gadelog.com</a>
      </p>
    </footer>
  );
}
