/**
 * 公式サイトと、同じ会社のモール店（楽天・Yahoo!ショッピング）の同じ商品を突き合わせる（GitHub Actions で、取り込みと iPad の機種名そろえの後に毎回実行）。
 *   npx tsx scripts/link-duplicate-shops.ts
 *
 * 対象は下の PAIRS: イオシス公式 × イオシス楽天市場店、エムモバ × エムコム（Yahoo!ショッピング店）（同じ株式会社エムコム）。
 * どちらも公式が主役で、モール店の同じ商品はカードの下に「楽天市場でも販売」「Yahoo!ショッピングでも販売」として添える。
 * - 公式の行に、同じ商品のモール店の価格・URL を添える（altPrice・altUrl。DeviceCard.tsx が URL のホストで楽天かYahooかを見分ける）
 * - モール店の行は、公式に同じ商品があって公式のほうが安い（か同じ）なら隠す（isSoldOut。次の取り込みで入れ替わる）。
 *   公式で取れなかった商品・モール店のほうが安い商品だけがモール店のカードとして残る
 * 行を消さずに隠すのは、モール店の取り込みが失敗・見送りの回でも、公式の行にモール店の価格を添えられるようにするため
 *
 * イオシス: 商品番号を先にし、番号で見つからないものだけ属性の鍵で探す。
 * - 商品番号: 公式 URL の末尾（.../items/.../1001）と楽天 URL の /pc-good/1001/ は同じ番号体系（3,171 件中 2,562 件で一致を確認済み）
 * - 属性の鍵: 機種・容量・色・キャリア・ランク・バッテリー80%未満か・利用制限・SIMロック解除済みか。ランク「不明」は鍵では突き合わせない（番号のみ）
 * エムモバ: 番号体系が違うので鍵だけ。エムコムの Yahoo 商品名には色がないので、鍵は 機種・容量・ランク・価格
 *   （価格まで一致するものだけを同じ商品とみなす。2026-10-10 に エムモバ 64 件中 48 件で一致を確認。ランクはどちらも S/A/B/C/D/J で同じ語彙）
 * ペアごとに別のトランザクションで行い、失敗したらそのペアのモール店の行だけ隠して次へ進む（最後に1つでも失敗していれば exit 1）
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { RAKUTEN_IOSYS_SHOP } from "@/lib/rakutenIosys";
import { YAHOO_MCOM } from "@/lib/yahooMcom";

type Pair = {
  /** 公式の shopName */
  official: string;
  /** モール店の shopName */
  alt: string;
  /** 商品番号（URL の末尾）でも突き合わせるか（イオシスのみ） */
  numberMatch: boolean;
  /** 属性の鍵の SQL（t はテーブルの別名）。ランク「不明」は NULL（結合しない） */
  key: (t: string) => string;
};

const PAIRS: Pair[] = [
  {
    official: "イオシス",
    alt: RAKUTEN_IOSYS_SHOP,
    numberMatch: true,
    // 機種名は公式が「iPhone14」、楽天側が「iPhone 14」なので空白を除いて小文字で比べる
    key: (t) => `(CASE WHEN ${t}."conditionRank" = '不明' THEN NULL ELSE concat_ws('|',
      lower(regexp_replace(${t}."modelName", '\\s', '', 'g')), ${t}."storage", ${t}."color",
      coalesce(${t}."carrier", ''), ${t}."conditionRank", coalesce(${t}."batteryHealth", 80) < 80,
      coalesce(${t}."networkStatus", ''), ${t}."simUnlocked") END)`,
  },
  {
    official: "エムモバ",
    alt: YAHOO_MCOM,
    numberMatch: false,
    // エムコムの Yahoo の商品名に色はないので鍵に入れない。価格の一致を強い手がかりにする
    key: (t) => `(CASE WHEN ${t}."conditionRank" = '不明' THEN NULL ELSE concat_ws('|',
      lower(regexp_replace(${t}."modelName", '\\s', '', 'g')), ${t}."storage", ${t}."conditionRank", ${t}.price) END)`,
  },
];

// 商品番号。公式は URL の末尾、楽天は /pc-good/ の直後
const itemNo = (t: string, shop: "official" | "rakuten") =>
  shop === "official" ? `substring(${t}.url from '/(\\d+)/?$')` : `substring(${t}.url from '/pc-good/(\\d+)')`;

// 番号・鍵は両方とも先に1回ずつ計算してから結合する（行ごとに相手を全部なめると 3千×3千件で10秒を超える。10/8 の初回）
async function link(p: Pair) {
  const { official: OFFICIAL, alt: ALT, key } = p;
  const results = await prisma.$transaction(async (tx) => {
    const out: Record<string, number> = {};
    out.reset = await tx.$executeRawUnsafe(
      `UPDATE "DeviceInventory" SET "altPrice" = NULL, "altUrl" = NULL WHERE "shopName" = $1 AND "altPrice" IS NOT NULL`,
      OFFICIAL,
    );
    if (p.numberMatch) {
      // 同じ商品番号のモール店の行を添える（同じ番号が複数あれば安いほう）
      out.linkedByNumber = await tx.$executeRawUnsafe(
        `WITH m AS (
           SELECT DISTINCT ON (n) n, price, url
           FROM (SELECT ${itemNo("r", "rakuten")} AS n, r.price, r.url FROM "DeviceInventory" r WHERE r."shopName" = $2) x
           WHERE n IS NOT NULL
           ORDER BY n, price
         ), o AS (
           SELECT d.id, ${itemNo("d", "official")} AS n FROM "DeviceInventory" d WHERE d."shopName" = $1 AND d."isSoldOut" = false
         )
         UPDATE "DeviceInventory" t SET "altPrice" = m.price, "altUrl" = m.url
         FROM o JOIN m ON m.n = o.n
         WHERE t.id = o.id`,
        OFFICIAL, ALT,
      );
    }
    // 番号で見つからなかった公式の行には、同じ属性のモール店の行のうち安いほうを添える
    out.linkedByKey = await tx.$executeRawUnsafe(
      `WITH m AS (
         SELECT DISTINCT ON (k) k, price, url
         FROM (SELECT ${key("r")} AS k, r.price, r.url FROM "DeviceInventory" r WHERE r."shopName" = $2) x
         WHERE k IS NOT NULL
         ORDER BY k, price
       ), o AS (
         SELECT d.id, ${key("d")} AS k FROM "DeviceInventory" d
         WHERE d."shopName" = $1 AND d."isSoldOut" = false AND d."altPrice" IS NULL
       )
       UPDATE "DeviceInventory" t SET "altPrice" = m.price, "altUrl" = m.url
       FROM o JOIN m ON m.k = o.k
       WHERE t.id = o.id`,
      OFFICIAL, ALT,
    );
    // 公式に同じ商品（同じ番号、または同じ属性）があり、公式のいちばん安い値段がモール店以下なら隠す
    const nCols = p.numberMatch ? `${itemNo("d", "official")}` : `NULL::text`;
    const rn = p.numberMatch ? `${itemNo("d", "rakuten")}` : `NULL::text`;
    out.altRows = await tx.$executeRawUnsafe(
      `WITH o AS (
         SELECT ${nCols} AS n, ${key("d")} AS k, d.price FROM "DeviceInventory" d
         WHERE d."shopName" = $1 AND d."isSoldOut" = false
       ), on_ AS (
         SELECT n, min(price) AS price FROM o WHERE n IS NOT NULL GROUP BY n
       ), ok AS (
         SELECT k, min(price) AS price FROM o WHERE k IS NOT NULL GROUP BY k
       ), r AS (
         SELECT d.id, ${rn} AS n, ${key("d")} AS k, d.price FROM "DeviceInventory" d WHERE d."shopName" = $2
       )
       UPDATE "DeviceInventory" t SET "isSoldOut" = (coalesce(on_.price <= r.price, false) OR coalesce(ok.price <= r.price, false))
       FROM r LEFT JOIN on_ ON on_.n = r.n LEFT JOIN ok ON ok.k = r.k
       WHERE t.id = r.id`,
      OFFICIAL, ALT,
    );
    return out;
  }, { timeout: 60_000 });
  const altVisible = await prisma.deviceInventory.count({ where: { shopName: ALT, isSoldOut: false } });
  console.log(JSON.stringify({ official: OFFICIAL, alt: ALT, ...results, altVisible }));
}

async function main() {
  let failed = 0;
  for (const p of PAIRS) {
    try {
      await link(p);
    } catch (e) {
      failed++;
      console.error(`${p.official} × ${p.alt}:`, e);
      // 突き合わせに失敗したらそのモール店の行を全部隠す。隠さないと公式と重複した商品が全件並んでしまうため（次の実行で計算し直す）
      try {
        await prisma.$executeRawUnsafe(`UPDATE "DeviceInventory" SET "isSoldOut" = true WHERE "shopName" = $1`, p.alt);
      } catch (e2) {
        console.error(e2);
      }
    }
  }
  await prisma.$disconnect();
  if (failed) process.exit(1);
}

main();
