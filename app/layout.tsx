import type { Metadata } from "next";
import { IBM_Plex_Sans_JP } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";
import ShopClickTracker from "./components/ShopClickTracker";
import { SHOPS } from "@/lib/shops";

// 日本語の字形は Google Fonts の unicode-range 分割で配信される（latin だけ先読み）
const plex = IBM_Plex_Sans_JP({
  variable: "--font-plex",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | 中古iPhone・iPad・Pixel・Galaxyの最安値を大手${SHOPS.length}ショップから比較`,
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
