<?php
// config.php にコピーして値を入れる（config.php は Git に含めない）
return [
    'rakuten_app_id'       => 'b2a8f42f-402f-4ea2-8a97-819164c66963',
    'rakuten_access_key'   => '（楽天ウェブサービスの Access Key）',
    'ingest_url'           => 'https://used.gadelog.com/api/ingest/rakuten',
    'ingest_secret'        => '（Vercel の RAKUTEN_INGEST_SECRET と同じ値）',
    // Cloudflare Pages 版（docs/cloudflare-pages.md）に切り替えたら、送信をやめてここに保存する。
    // 公開フォルダの中の推測されにくいフォルダにする（その URL を GitHub の Secrets「RAKUTEN_DATA_URL」に登録）
    // 'output_dir'        => '/home/wp760415/gadelog.com/public_html/（推測されにくい名前）',
    // 書き出し後に GitHub Actions をすぐ起動する（任意）。Fine-grained トークン・このリポジトリだけ・Actions: Read and write
    // 'github_dispatch_token' => '（github_pat_...）',
];
