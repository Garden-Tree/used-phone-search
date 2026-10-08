/**
 * イオシスの公式サイトと楽天市場店（pc-good）の同じ商品を突き合わせる（GitHub Actions で、取り込みと iPad の機種名そろえの後に毎回実行）。
 *   npx tsx scripts/link-iosys-rakuten.ts
 *
 * 2つは在庫を共有していて、同じ商品（機種・容量・色・キャリア・ランク・バッテリー80%未満か）が両方に並ぶ。楽天のほうが数%高い。
 * 突き合わせは「商品番号」を先にし、番号で見つからないものだけ属性の鍵で探す。
 * - 商品番号: 公式 URL の末尾（.../items/.../1001）と楽天 URL の /pc-good/1001/ は同じ番号体系（3,171 件中 2,562 件で一致を確認済み）
 * - 属性の鍵: 機種・容量・色・キャリア・ランク・バッテリー80%未満か・利用制限・SIMロック解除済みか。ランク「不明」は鍵では突き合わせない（番号のみ）
 * - 公式の行に、同じ商品の楽天の価格・URL を添える（altPrice・altUrl。カードの下に「楽天市場でも販売」と出す）
 * - 楽天の行は、公式に同じ商品があって公式のほうが安い（か同じ）なら隠す（isSoldOut。次の取り込みで入れ替わる）。
 *   公式で取れなかった商品・楽天のほうが安い商品だけが「イオシス（楽天市場店）」のカードとして残る
 * 行を消さずに隠すのは、楽天の取り込みが失敗・見送りの回でも、公式の行に楽天の価格を添えられるようにするため
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { RAKUTEN_IOSYS_SHOP } from "@/lib/rakutenIosys";

const OFFICIAL = "イオシス";

// 商品番号。公式は URL の末尾、楽天は /pc-good/ の直後
const itemNo = (t: string, shop: "official" | "rakuten") =>
  shop === "official" ? `substring(${t}.url from '/(\\d+)/?$')` : `substring(${t}.url from '/pc-good/(\\d+)')`;

// 属性の鍵。機種名は公式が「iPhone14」、楽天側が「iPhone 14」なので空白を除いて小文字で比べる。ランク「不明」は NULL（結合しない）
const key = (t: string) => `(CASE WHEN ${t}."conditionRank" = '不明' THEN NULL ELSE concat_ws('|',
  lower(regexp_replace(${t}."modelName", '\\s', '', 'g')), ${t}."storage", ${t}."color",
  coalesce(${t}."carrier", ''), ${t}."conditionRank", coalesce(${t}."batteryHealth", 80) < 80,
  coalesce(${t}."networkStatus", ''), ${t}."simUnlocked") END)`;

// 番号・鍵は両方とも先に1回ずつ計算してから結合する（行ごとに相手を全部なめると 3千×3千件で10秒を超える。10/8 の初回）
async function main() {
  const [reset, linkedByNumber, linkedByKey, rakutenRows] = await prisma.$transaction(async (tx) => [
    await tx.$executeRawUnsafe(
      `UPDATE "DeviceInventory" SET "altPrice" = NULL, "altUrl" = NULL WHERE "shopName" = $1 AND "altPrice" IS NOT NULL`,
      OFFICIAL,
    ),
    // 同じ商品番号の楽天の行を添える（同じ番号が複数あれば安いほう）
    await tx.$executeRawUnsafe(
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
      OFFICIAL, RAKUTEN_IOSYS_SHOP,
    ),
    // 番号で見つからなかった公式の行には、同じ属性の楽天の行のうち安いほうを添える
    await tx.$executeRawUnsafe(
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
      OFFICIAL, RAKUTEN_IOSYS_SHOP,
    ),
    // 公式に同じ商品（同じ番号、または同じ属性）があり、公式のいちばん安い値段が楽天以下なら隠す
    await tx.$executeRawUnsafe(
      `WITH o AS (
         SELECT ${itemNo("d", "official")} AS n, ${key("d")} AS k, d.price FROM "DeviceInventory" d
         WHERE d."shopName" = $1 AND d."isSoldOut" = false
       ), on_ AS (
         SELECT n, min(price) AS price FROM o WHERE n IS NOT NULL GROUP BY n
       ), ok AS (
         SELECT k, min(price) AS price FROM o WHERE k IS NOT NULL GROUP BY k
       ), r AS (
         SELECT d.id, ${itemNo("d", "rakuten")} AS n, ${key("d")} AS k, d.price FROM "DeviceInventory" d WHERE d."shopName" = $2
       )
       UPDATE "DeviceInventory" t SET "isSoldOut" = (coalesce(on_.price <= r.price, false) OR coalesce(ok.price <= r.price, false))
       FROM r LEFT JOIN on_ ON on_.n = r.n LEFT JOIN ok ON ok.k = r.k
       WHERE t.id = r.id`,
      OFFICIAL, RAKUTEN_IOSYS_SHOP,
    ),
  ], { timeout: 60_000 });
  const rakutenVisible = await prisma.deviceInventory.count({ where: { shopName: RAKUTEN_IOSYS_SHOP, isSoldOut: false } });
  console.log(JSON.stringify({ reset, linkedByNumber, linkedByKey, rakutenRows, rakutenVisible }));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  // 突き合わせに失敗したら楽天の行を全部隠す。隠さないと公式と重複した商品が全件並んでしまうため（次の実行で計算し直す）
  try {
    await prisma.$executeRawUnsafe(`UPDATE "DeviceInventory" SET "isSoldOut" = true WHERE "shopName" = $1`, RAKUTEN_IOSYS_SHOP);
  } catch (e2) {
    console.error(e2);
  }
  await prisma.$disconnect();
  process.exit(1);
});
