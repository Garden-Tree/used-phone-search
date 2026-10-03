/**
 * 静的書き出し（next build）の途中で DB などの読み込みに失敗したら、書き出し全体を失敗させる。
 * ISR のころは「その回だけ空で出して、次の作り直しで直る」ために握りつぶしていたが、
 * 静的書き出しでは空のページが6時間そのまま配置されてしまう。失敗させれば Actions は配置せず、前回の分が残る
 */
export function rethrowDuringBuild(error: unknown): void {
  if (process.env.NEXT_PHASE === "phase-production-build") throw error;
}
