import type { Metadata } from "next";
import WearIndexView, { wearMetadata } from "@/app/components/WearIndexView";

// 中古Galaxy Watch の機種一覧（2026-11-13〜）。在庫はビルド（1日4回）のたびに更新。中身は app/components/WearIndexView.tsx
export const dynamic = "force-static"; // 静的書き出し: ビルド時に1回だけ作る（作り直しは1日4回のビルド）

export function generateMetadata(): Promise<Metadata> {
  return wearMetadata("galaxy-watch");
}

export default function GalaxyWatchIndexPage() {
  return <WearIndexView kind="galaxy-watch" />;
}
