import { checkHealth } from "@/lib/health";

/**
 * データ更新の監視結果（静的書き出し版。ビルドのたびに /health.json として書き出す）。
 * ビルド自体が止まったことにも気づけるよう、読む側（rakuten-sync/healthcheck.php）は checkedAt の古さも見る
 */
export const dynamic = "force-static";

export async function GET() {
  return Response.json(await checkHealth());
}
