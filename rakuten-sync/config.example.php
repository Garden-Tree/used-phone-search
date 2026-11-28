<?php
// config.php にコピーして値を入れる（config.php は Git に含めない）
return [
    'rakuten_app_id'       => '（楽天ウェブサービスのアプリID）',
    'rakuten_access_key'   => '（楽天ウェブサービスの Access Key）',
    // ingest_url・ingest_secret は旧版（Vercel の /api/ingest/rakuten・10/6 廃止）。今は使わない
    // Cloudflare Pages 版（docs/operations.md）では、送信をやめてここに保存する。
    // 公開フォルダの中の推測されにくいフォルダにする（その URL を GitHub の Secrets「RAKUTEN_DATA_URL」に登録）
    // 'output_dir'        => '/home/<サーバーID>/gadelog.com/public_html/（推測されにくい名前）',
    // 書き出し後に GitHub Actions をすぐ起動する（任意）。Fine-grained トークン・このリポジトリだけ・Actions: Read and write
    // 'github_dispatch_token' => '（github_pat_...）',
];
