/** 中古の15・16e 128GB の電池の分布（ジャンク除く）。読むだけ。groupBy 1回ずつ */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { modelWhere } from "@/lib/modelInventory";
(async () => {
  for (const m of ["iPhone 15", "iPhone 16e"]) {
    const where = { AND: [await modelWhere(m), { storage: 128 }, { conditionRank: { notIn: ["J", "j", "ジャンク"] } }] };
    const g = await prisma.deviceInventory.groupBy({ by: ["batteryHealth"], where, _count: { _all: true } });
    const b = { "90以上": 0, "85-89": 0, "80-84": 0, "80未満": 0, 不明: 0 } as Record<string, number>;
    for (const r of g) { const h = r.batteryHealth, n = r._count._all; if (h == null) b["不明"] += n; else if (h >= 90) b["90以上"] += n; else if (h >= 85) b["85-89"] += n; else if (h >= 80) b["80-84"] += n; else b["80未満"] += n; }
    console.log(m, JSON.stringify(b));
  }
  await prisma.$disconnect();
})();
