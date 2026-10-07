"use client";

import { useEffect } from "react";

type Gtag = (command: "event", name: string, params: Record<string, string | number>) => void;

/**
 * 商品カード（DeviceCard の data-shop-click が付いたリンク）が押されたら、GA4 に shop_click イベントを送る。
 * カードはサーバーでもブラウザでも描かれるので、カードごとではなく document でまとめて拾う。
 * 店・機種・容量・ランク・価格・リンクの種類（rakuten / a8 / direct）を一緒に送り、
 * 「どの店・機種・ページのクリックが多いか」「収益になるリンクか」を GA4 で分けられるようにする（2026-10-07）
 */
export default function ShopClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[data-shop-click]");
      if (!link) return;
      const gtag = (window as unknown as { gtag?: Gtag }).gtag;
      if (!gtag) return;
      const d = link.dataset;
      gtag("event", "shop_click", {
        shop_name: d.shop ?? "",
        model_name: d.model ?? "",
        storage: Number(d.storage) || 0,
        condition_rank: d.rank ?? "",
        price: Number(d.price) || 0,
        link_type: d.linkType ?? "",
      });
    };
    // 中クリック（新しいタブ）も拾う
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);
  return null;
}
