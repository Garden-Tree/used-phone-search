import { inventoryFile, inventoryFileKeys, inventoryIndex } from "@/lib/searchData";

/**
 * 検索ページがブラウザで読む在庫データ（静的書き出し版）。ビルドのたびに
 * /data/inventory/index.json と、機種ごとの /data/inventory/<機種>.json を書き出す（lib/searchData.ts）
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ file: "index.json" }, ...inventoryFileKeys().map((key) => ({ file: `${key}.json` }))];
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const key = file.replace(/\.json$/, "");
  return Response.json(key === "index" ? await inventoryIndex() : await inventoryFile(key));
}
