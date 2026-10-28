/**
 * iPhone の発表時の値段（日本・税込・いちばん安い容量）。Apple Newsroom（日本）の発表のプレスリリースで確かめた値だけ（10/28 に生の HTML で確認）。
 * 発売後の値上げ・値下げは入れない（発表時の値段で比べる）。/iphone/resale-value（lib/resaleValue.ts）で使う。date は発表日（リリースの公開日）。
 * 入れていない機種:
 *   - iPhone 11 系・SE（第2世代）・12 系: リリースが税別の値段だけ（税込に換算しない）
 *   - iPhone 16 Pro Max: リリースに 189,800円がどの容量の値段か書かれていない
 */
export const LAUNCH_PRICES_CHECKED = "2026-10-28";

export type LaunchPrice = { date: string; storage: number; price: number; source: string };

const NR = "https://www.apple.com/jp/newsroom/";

export const LAUNCH_PRICES: Record<string, LaunchPrice> = {
  "iPhone 13": { date: "2021-09-14", storage: 128, price: 98800, source: `${NR}2021/09/apple-introduces-iphone-13-and-iphone-13-mini/` },
  "iPhone 13 mini": { date: "2021-09-14", storage: 128, price: 86800, source: `${NR}2021/09/apple-introduces-iphone-13-and-iphone-13-mini/` },
  "iPhone 13 Pro": { date: "2021-09-14", storage: 128, price: 122800, source: `${NR}2021/09/apple-unveils-iphone-13-pro-and-iphone-13-pro-max-more-pro-than-ever-before/` },
  "iPhone 13 Pro Max": { date: "2021-09-14", storage: 128, price: 134800, source: `${NR}2021/09/apple-unveils-iphone-13-pro-and-iphone-13-pro-max-more-pro-than-ever-before/` },
  "iPhone SE (第3世代)": { date: "2022-03-09", storage: 64, price: 57800, source: `${NR}2022/03/apple-announces-the-new-iphone-se-a-powerful-smartphone-in-an-iconic-design/` },
  "iPhone 14": { date: "2022-09-08", storage: 128, price: 119800, source: `${NR}2022/09/apple-introduces-iphone-14-and-iphone-14-plus/` },
  "iPhone 14 Plus": { date: "2022-09-08", storage: 128, price: 134800, source: `${NR}2022/09/apple-introduces-iphone-14-and-iphone-14-plus/` },
  "iPhone 14 Pro": { date: "2022-09-07", storage: 128, price: 149800, source: `${NR}2022/09/apple-debuts-iphone-14-pro-and-iphone-14-pro-max/` },
  "iPhone 14 Pro Max": { date: "2022-09-07", storage: 128, price: 164800, source: `${NR}2022/09/apple-debuts-iphone-14-pro-and-iphone-14-pro-max/` },
  "iPhone 15": { date: "2023-09-12", storage: 128, price: 124800, source: `${NR}2023/09/apple-debuts-iphone-15-and-iphone-15-plus/` },
  "iPhone 15 Plus": { date: "2023-09-12", storage: 128, price: 139800, source: `${NR}2023/09/apple-debuts-iphone-15-and-iphone-15-plus/` },
  "iPhone 15 Pro": { date: "2023-09-12", storage: 128, price: 159800, source: `${NR}2023/09/apple-unveils-iphone-15-pro-and-iphone-15-pro-max/` },
  "iPhone 15 Pro Max": { date: "2023-09-12", storage: 256, price: 189800, source: `${NR}2023/09/apple-unveils-iphone-15-pro-and-iphone-15-pro-max/` },
  "iPhone 16": { date: "2024-09-09", storage: 128, price: 124800, source: `${NR}2024/09/apple-introduces-iphone-16-and-iphone-16-plus/` },
  "iPhone 16 Plus": { date: "2024-09-09", storage: 128, price: 139800, source: `${NR}2024/09/apple-introduces-iphone-16-and-iphone-16-plus/` },
  "iPhone 16 Pro": { date: "2024-09-09", storage: 128, price: 159800, source: `${NR}2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/` },
  "iPhone 16e": { date: "2025-02-19", storage: 128, price: 99800, source: `${NR}2025/02/apple-debuts-iphone-16e-a-powerful-new-member-of-the-iphone-16-family/` },
  "iPhone 17": { date: "2025-09-09", storage: 256, price: 129800, source: `${NR}2025/09/apple-debuts-iphone-17/` },
  "iPhone 17 Pro": { date: "2025-09-09", storage: 256, price: 179800, source: `${NR}2025/09/apple-unveils-iphone-17-pro-and-iphone-17-pro-max/` },
  "iPhone 17 Pro Max": { date: "2025-09-09", storage: 256, price: 194800, source: `${NR}2025/09/apple-unveils-iphone-17-pro-and-iphone-17-pro-max/` },
  "iPhone Air": { date: "2025-09-10", storage: 256, price: 159800, source: `${NR}2025/09/introducing-iphone-air-a-powerful-new-iphone-with-a-breakthrough-design/` },
  "iPhone 17e": { date: "2026-03-02", storage: 256, price: 99800, source: `${NR}2026/03/apple-introduces-iphone-17e/` },
  "iPhone 18 Pro": { date: "2026-09-09", storage: 256, price: 219800, source: `${NR}2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/` },
  "iPhone 18 Pro Max": { date: "2026-09-09", storage: 256, price: 239800, source: `${NR}2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/` },
};
