import type { Metadata } from "next";
import { IBM_Plex_Sans_JP } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { siteDescription, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";
import ShopClickTracker from "./components/ShopClickTracker";
import { activeShops } from "@/lib/activeShops";

// 日本語の字形は Google Fonts の unicode-range 分割で配信される（latin だけ先読み）
const plex = IBM_Plex_Sans_JP({
  variable: "--font-plex",
  // 500 は 10/28 に外した（日本語は文字の範囲ごとに約120ファイル×太さの数になり、Google のクロールの半分がフォントだった。500 の使用は5か所・600 はもともと 700 で表示）
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// 店の数・店名は、いま在庫がある店だけ（lib/activeShops.ts）
export async function generateMetadata(): Promise<Metadata> {
  const shops = await activeShops();
  const SITE_DESCRIPTION = siteDescription(shops);
  return {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | 中古iPhone・iPad・Pixel・Galaxyの最安値を大手${shops.length}ショップから比較`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  // Google Search Console の所有権確認（削除すると確認が外れるので残しておく）
  verification: {
    google: "BeG61Ok_7yDSfqMR2XTBn7vOEhx6qatCyHSgJAr3CyA",
  },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${plex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      {GA_ID && <ShopClickTracker />}
    </html>
  );
}
