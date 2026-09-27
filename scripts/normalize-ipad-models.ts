/**
 * スクレイパー（にこスマ・イオシス）が入れた iPad の機種名を、lib/ipadCatalog.ts の正式名にそろえる。
 * 機種名のそろえ方を TypeScript（canonicalIpadModel）の1か所だけに置くため、Python 側は店の表記のまま入れている。
 * GitHub Actions でスクレイピングの後・価格推移の記録の前に実行する
 *   npm run normalize:ipad
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { IPAD_MODELS, canonicalIpadModel } from "@/lib/ipadCatalog";

async function main() {
  const groups = await prisma.deviceInventory.groupBy({
    by: ["modelName"],
    where: { modelName: { startsWith: "iPad", notIn: IPAD_MODELS } },
    _count: { _all: true },
  });

  let renamed = 0;
  let removed = 0;
  for (const g of groups) {
    const canonical = canonicalIpadModel(g.modelName);
    if (canonical) {
      const r = await prisma.deviceInventory.updateMany({ where: { modelName: g.modelName }, data: { modelName: canonical } });
      renamed += r.count;
    } else {
      // カタログにない古い機種（iPad Air 2 など）や読み取れない名前はページに出せないので消す
      const r = await prisma.deviceInventory.deleteMany({ where: { modelName: g.modelName } });
      removed += r.count;
      console.log(`  読み取れない機種名のため削除: ${g.modelName}（${r.count}件）`);
    }
  }
  console.log(`iPad の機種名をそろえました: ${renamed} 件を正式名に、${removed} 件を削除（${groups.length} 種類）`);
}

main()
  .catch((error) => {
    console.error("iPad の機種名の正規化に失敗しました:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
