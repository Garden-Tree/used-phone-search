#!/bin/bash
# Vercel の Ignored Build Step（vercel.json の ignoreCommand から呼ぶ）。終了コード 0 = ビルドしない
# 静的書き出し版（docs/static-export.md）はシンレンタルサーバーで配信するので、Vercel では一切ビルドしない。
# main にマージしても、DNS を切り替えるまでは Vercel に残っている最後のデプロイ（ISR・API つきの旧版）がそのまま動き続ける
exit 0
