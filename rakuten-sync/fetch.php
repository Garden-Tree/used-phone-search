<?php
/**
 * 楽天市場 商品検索API から楽天市場店（ゲオモバイル・じゃんぱら・ソフマップ）の iPhone・iPad・Google Pixel・Galaxy 在庫を取得し、
 * used.gadelog.com の受け口（/api/ingest/rakuten?shop=<shopCode>）へショップごとに送信する。
 * 静的書き出し版（static-export ブランチ）では、config.php に output_dir を書くと、送信せずに
 * <output_dir>/<shopCode>.json.gz に保存する（GitHub Actions が SSH で取りに来て scripts/ingest-rakuten.ts で取り込む）。
 *
 * シンレンタルサーバー（固定IP: 楽天アプリの許可IPに登録済み）の cron から実行する。
 *   php fetch.php                 … 全ショップを全件取得して送信
 *   php fetch.php janpara         … 指定したショップだけ
 *   php fetch.php --dry [shop]    … 送信せず、先頭3ページ分を sample.json に保存（確認用）
 *
 * 秘密の値は同じディレクトリの config.php に置く（config.example.php を参照）。
 * 商品名の正規化は受け口（TypeScript）側で行い、ここでは取得と最小限の抽出だけを行う。
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$args = array_slice($argv ?? [], 1);
$dryRun = in_array('--dry', $args, true);
$onlyShops = array_values(array_filter($args, fn($a) => $a !== '--dry'));

const ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
// 取り込むショップ（楽天の shopCode）。受け口 lib/rakutenShops.ts の RAKUTEN_SHOPS と揃える
const SHOP_CODES = ['geo-mobile', 'janpara', 'akiba-u-shop'];
// 1ショップ分として、この検索語の結果をまとめて送る（受け口はショップ単位で洗い替えるため）
// Pixel・Galaxy は 2026-09-30〜（アクセサリも当たるが、受け口の lib/rakutenPixel.ts・rakutenGalaxy.ts が本体以外を落とす）
const KEYWORDS = ['iPhone', 'iPad', 'Pixel', 'Galaxy'];
const HITS = 30;              // 1ページの最大件数
const MAX_PAGES = 100;        // API の上限（1検索あたり最大 3,000 件）
const INTERVAL_US = 1100000;  // 登録した QPS=1 を守るため 1.1 秒間隔
const MAX_REQUESTS = 1000;    // 暴走防止（1ショップあたり）

$requestCount = 0;

/** ログ用に先頭だけ切り出す（UTF-8 の文字の途中で切らない） */
function cutUtf8(string $s, int $bytes): string
{
    return function_exists('mb_strcut') ? mb_strcut($s, 0, $bytes, 'UTF-8') : substr($s, 0, $bytes);
}

function logLine(string $message): void
{
    file_put_contents(__DIR__ . '/fetch.log', date('Y-m-d H:i:s') . ' ' . $message . PHP_EOL, FILE_APPEND);
}

function fetchPage(array $config, string $shopCode, string $keyword, int $page, int $minPrice, int $maxPrice): array
{
    global $requestCount;
    if (++$requestCount > MAX_REQUESTS) {
        throw new RuntimeException('too many requests (MAX_REQUESTS)');
    }
    if ($requestCount > 1) usleep(INTERVAL_US);

    // affiliateId は付けない（付けると itemUrl がアフィリエイトURLに置き換わり、送信データが大きくなる）。
    // アフィリエイトリンクは表示時にサイト側で組み立てる
    $query = http_build_query([
        'applicationId' => $config['rakuten_app_id'],
        'shopCode'      => $shopCode,
        'keyword'       => $keyword,
        'hits'          => HITS,
        'page'          => $page,
        'availability'  => 1,
        'formatVersion' => 2,
        'sort'          => '+itemPrice',
        'minPrice'      => $minPrice,
        'maxPrice'      => $maxPrice,
    ]);
    // 一時的なエラー（429・5xx・JSON でない応答）は少し待って2回までやり直す
    for ($attempt = 1; ; $attempt++) {
        $ch = curl_init(ENDPOINT . '?' . $query);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => ['accessKey: ' . $config['rakuten_access_key']],
        ]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = ($status === 200 && is_string($body)) ? json_decode($body, true) : null;
        if (is_array($data)) return $data;

        $detail = "HTTP {$status} page={$page} price={$minPrice}-{$maxPrice} " . cutUtf8((string)$body, 300);
        if ($attempt >= 3 || ($status >= 400 && $status < 500 && $status !== 429)) {
            throw new RuntimeException("Rakuten API error: {$detail}");
        }
        logLine("{$shopCode} retry {$attempt}: {$detail}");
        usleep(3000000 * $attempt);
    }
}

/** API から受け取った1商品を、送信用の小さな形にする */
function compactItem(array $item): array
{
    $caption = (string)($item['itemCaption'] ?? '');
    // ランク: ゲオは「【程度】A」、ソフマップは「〔商品ランクA〕」
    if (!preg_match('/【程度】\s*([^\s【]+)/u', $caption, $rank)) {
        preg_match('/〔商品ランク\s*([A-Z])〕/u', $caption, $rank);
    }
    // キャリア: ソフマップは「〔キャリア〕docomoロック解除SIMフリー」
    preg_match('/〔キャリア〕\s*([^〔\s]+)/u', $caption, $car);
    // ネットワーク利用制限: ゲオは「ネットワーク利用制限確認【○】」、じゃんぱらは備考の「利用制限：○」
    if (!preg_match('/ネットワーク利用制限確認【([^】]*)】/u', $caption, $nw)) {
        preg_match('/利用制限\s*[：:]\s*([○〇△×✕－\-])/u', $caption, $nw);
    }
    // バッテリー最大容量: 「最大容量：82％」「バッテリー最大容量 85%」など。
    // じゃんぱらは備考の「バッテリー容量：81%（03月時点）」（「最大容量」の語がない）
    if (!preg_match('/最大容量\s*[：:]?\s*(\d{2,3})\s*[%％]/u', $caption, $batt)) {
        preg_match('/バッテリー容量\s*[：:]?\s*(\d{2,3})\s*[%％]/u', $caption, $batt);
    }
    return [
        'code'  => (string)($item['itemCode'] ?? ''),
        'name'  => (string)($item['itemName'] ?? ''),
        'price' => (int)($item['itemPrice'] ?? 0),
        'url'   => (string)($item['itemUrl'] ?? ''),
        'rank'  => $rank[1] ?? null,
        'nw'    => $nw[1] ?? null,
        'batt'  => isset($batt[1]) ? (int)$batt[1] : null,
        'car'   => $car[1] ?? null,
    ];
}

/**
 * 価格帯 [min, max] の在庫を集める。3,000 件を超える帯は半分に割って再帰的に取得する
 */
function collectRange(array $config, string $shopCode, string $keyword, int $min, int $max, array &$items): void
{
    $first = fetchPage($config, $shopCode, $keyword, 1, $min, $max);
    $count = (int)($first['count'] ?? 0);

    if ($count > HITS * MAX_PAGES && $max - $min > 1) {
        $mid = intdiv($min + $max, 2);
        collectRange($config, $shopCode, $keyword, $min, $mid, $items);
        collectRange($config, $shopCode, $keyword, $mid + 1, $max, $items);
        return;
    }

    $pageCount = min((int)($first['pageCount'] ?? 1), MAX_PAGES);
    for ($page = 1; $page <= $pageCount; $page++) {
        $res = $page === 1 ? $first : fetchPage($config, $shopCode, $keyword, $page, $min, $max);
        foreach ($res['Items'] ?? $res['items'] ?? [] as $item) {
            $item = $item['Item'] ?? $item;
            $compact = compactItem($item);
            if ($compact['code'] !== '') $items[$compact['code']] = $compact;
        }
    }
    logLine("{$shopCode} {$keyword} range {$min}-{$max}: count={$count}, pages={$pageCount}");
}

/** 1ショップ分を取得して受け口へ送る。成功なら true */
function syncShop(array $config, string $shopCode, bool $dryRun): bool
{
    global $requestCount;
    $requestCount = 0;
    $items = [];

    if ($dryRun) {
        for ($page = 1; $page <= 3; $page++) {
            $res = fetchPage($config, $shopCode, KEYWORDS[0], $page, 1, 999999);
            foreach ($res['Items'] ?? $res['items'] ?? [] as $item) {
                $items[] = compactItem($item['Item'] ?? $item);
            }
        }
        file_put_contents(__DIR__ . "/sample-{$shopCode}.json", json_encode($items, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        logLine("{$shopCode} dry run: saved sample-{$shopCode}.json (" . count($items) . ' items)');
        return true;
    }

    foreach (KEYWORDS as $keyword) {
        collectRange($config, $shopCode, $keyword, 1, 999999, $items);
    }
    $items = array_values($items);
    logLine("{$shopCode} fetched " . count($items) . " items with {$requestCount} requests");

    // 1万件規模になるので gzip で圧縮して送る（Vercel の受信上限対策）
    $payload = gzencode(json_encode(['items' => $items], JSON_UNESCAPED_UNICODE), 9);

    // 静的書き出し版: ファイルに置くだけ（書きかけを読まれないよう、一時ファイルに書いてから名前を変える）
    if (!empty($config['output_dir'])) {
        $dir = rtrim($config['output_dir'], '/');
        if (!is_dir($dir)) mkdir($dir, 0700, true);
        $tmp = "{$dir}/.{$shopCode}.json.gz.tmp";
        $ok = file_put_contents($tmp, $payload) !== false && rename($tmp, "{$dir}/{$shopCode}.json.gz");
        logLine("{$shopCode} saved: " . ($ok ? "{$dir}/{$shopCode}.json.gz (" . strlen($payload) . ' bytes)' : 'FAILED'));
        return $ok;
    }
    $ch = curl_init($config['ingest_url'] . '?shop=' . urlencode($shopCode));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/gzip',
            'Authorization: Bearer ' . $config['ingest_secret'],
        ],
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    logLine("{$shopCode} ingest: HTTP {$status} " . cutUtf8((string)$body, 500));
    return $status === 200;
}

// 1ショップの失敗で他のショップを止めない
$failed = 0;
foreach ($onlyShops ?: SHOP_CODES as $shopCode) {
    try {
        if (!syncShop($config, $shopCode, $dryRun)) $failed++;
    } catch (Throwable $e) {
        logLine("{$shopCode} ERROR: " . $e->getMessage());
        $failed++;
    }
}
exit($failed === 0 ? 0 : 1);
