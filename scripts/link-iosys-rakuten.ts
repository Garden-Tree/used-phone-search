/**
 * イオシスの公式サイトと楽天市場店（pc-good）の同じ商品を突き合わせる（GitHub Actions で、取り込みと iPad の機種名そろえの後に毎回実行）。
 *   npx tsx scripts/link-iosys-rakuten.ts
 *
 * 2つは在庫を共有していて、同じ商品（機種・容量・色・キャリア・ランク・バッテリー80%未満か）が両方に並ぶ。楽天のほうが数%高い。
 * - 公式の行に、同じ商品の楽天の価格・URL を添える（altPrice・altUrl。カードの下に「楽天市場でも販売」と出す）
 * - 楽天の行は、公式に同じ商品があって公式のほうが安い（か同じ）なら隠す（isSoldOut。次の取り込みで入れ替わる）。
 *   公式で取れなかった商品・楽天のほうが安い商品だけが「イオシス（楽天市場店）」のカードとして残る
 * 行を消さずに隠すのは、楽天の取り込みが失敗・見送りの回でも、公式の行に楽天の価格を添えられるようにするため
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { RAKUTEN_IOSYS_SHOP } from "@/lib/rakutenIosys";

const OFFICIAL = "イオシス";

// 突き合わせの鍵。機種名は公式が「iPhone14」、楽天側が「iPhone 14」なので空白を除いて小文字で比べる
const key = (t: string) => `concat_ws('|',
  lower(regexp_replace(${t}."modelName", '\\s', '', 'g')), ${t}."storage", ${t}."color",
  coalesce(${t}."carrier", ''), ${t}."conditionRank", coalesce(${t}."batteryHealth", 80) < 80)`;

async function main() {
  const [reset, linked, hidden] = await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `UPDATE "DeviceInventory" SET "altPrice" = NULL, "altUrl" = NULL WHERE "shopName" = $1 AND "altPrice" IS NOT NULL`,
      OFFICIAL,
    ),
    // 同じ商品が楽天に複数あれば安いほう
    prisma.$executeRawUnsafe(
      `UPDATE "DeviceInventory" o SET "altPrice" = m.price, "altUrl" = m.url
       FROM (
         SELECT DISTINCT ON (k) k, price, url
         FROM (SELECT ${key("r")} AS k, r.price, r.url FROM "DeviceInventory" r WHERE r."shopName" = $2) x
         ORDER BY k, price
       ) m
       WHERE o."shopName" = $1 AND o."isSoldOut" = false AND ${key("o")} = m.k`,
      OFFICIAL, RAKUTEN_IOSYS_SHOP,
    ),
    prisma.$executeRawUnsafe(
      `UPDATE "DeviceInventory" r SET "isSoldOut" = EXISTS (
         SELECT 1 FROM "DeviceInventory" o
         WHERE o."shopName" = $1 AND o."isSoldOut" = false AND o.price <= r.price AND ${key("o")} = ${key("r")}
       )
       WHERE r."shopName" = $2`,
      OFFICIAL, RAKUTEN_IOSYS_SHOP,
    ),
  ]);
  const visible = await prisma.deviceInventory.count({ where: { shopName: RAKUTEN_IOSYS_SHOP, isSoldOut: false } });
  console.log(JSON.stringify({ reset, officialLinked: linked, rakutenRows: hidden, rakutenVisible: visible }));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
