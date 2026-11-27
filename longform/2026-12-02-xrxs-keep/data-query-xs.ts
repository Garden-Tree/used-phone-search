/** XS・XS Max の買取（全店・全グレード）。読むだけ */
import "dotenv/config";
import prisma from "@/lib/prisma";
(async () => {
  for (const m of ["iPhone XS", "iPhone XS Max"]) {
    const bb = await prisma.buybackPrice.findMany({ where: { model: m }, select: { shopName: true, storage: true, gradeLabel: true, price: true, updatedAt: true }, orderBy: [{ storage: "asc" }, { price: "desc" }] });
    console.log(`== ${m}`); for (const b of bb) console.log(`${b.storage}GB ${b.shopName} ${b.gradeLabel} ${b.price}円 ${b.updatedAt.toISOString().slice(0, 10)}`);
  }
  await prisma.$disconnect();
})();
