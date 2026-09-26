<?php
/**
 * 楽天市場 商品検索API から「ゲオモバイル楽天市場店」の iPhone 在庫を取得し、
 * used.gadelog.com の受け口（/api/ingest/rakuten）へ送信する。
 *
 * シンレンタルサーバー（固定IP: 楽天アプリの許可IPに登録済み）の cron から実行する。
 *   php fetch.php          … 全件取得して送信
 *   php fetch.php --dry    … 送信せず、先頭3ページ分を sample.json に保存（確認用）
 *
 * 秘密の値は同じディレクトリの config.php に置く（config.example.php を参照）。
 * 商品名の正規化は受け口（TypeScript）側で行い、ここでは取得と最小限の抽出だけを行う。
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$dryRun = in_array('--dry', $argv ?? [], true);

const ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
const SHOP_CODE = 'geo-mobile';
const HITS = 30;              // 1ページの最大件数
const MAX_PAGES = 100;        // API の上限（1検索あたり最大 3,000 件）
const INTERVAL_US = 1100000;  // 登録した QPS=1 を守るため 1.1 秒間隔
const MAX_REQUESTS = 1000;    // 暴走防止

$requestCount = 0;

function logLine(string $message): void
{
    file_put_contents(__DIR__ . '/fetch.log', date('Y-m-d H:i:s') . ' ' . $message . PHP_EOL, FILE_APPEND);
}

function fetchPage(array $config, int $page, int $minPrice, int $maxPrice): array
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
        'shopCode'      => SHOP_CODE,
        'keyword'       => 'iPhone',
        'hits'          => HITS,
        'page'          => $page,
        'availability'  => 1,
        'formatVersion' => 2,
        'sort'          => '+itemPrice',
        'minPrice'      => $minPrice,
        'maxPrice'      => $maxPrice,
    ]);
    $ch = curl_init(ENDPOINT . '?' . $query);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => ['accessKey: ' . $config['rakuten_access_key']],
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 200 || $body === false) {
        throw new RuntimeException("Rakuten API error: HTTP {$status} " . substr((string)$body, 0, 300));
    }
    return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
}

/** API から受け取った1商品を、送信用の小さな形にする */
function compactItem(array $item): array
{
    $caption = (string)($item['itemCaption'] ?? '');
    preg_match('/【程度】\s*([^\s【]+)/u', $caption, $rank);
    preg_match('/ネットワーク利用制限確認【([^】]*)】/u', $caption, $nw);
    return [
        'code'  => (string)($item['itemCode'] ?? ''),
        'name'  => (string)($item['itemName'] ?? ''),
        'price' => (int)($item['itemPrice'] ?? 0),
        'url'   => (string)($item['itemUrl'] ?? ''),
        'rank'  => $rank[1] ?? null,
        'nw'    => $nw[1] ?? null,
    ];
}

/**
 * 価格帯 [min, max] の在庫を集める。3,000 件を超える帯は半分に割って再帰的に取得する
 */
function collectRange(array $config, int $min, int $max, array &$items): void
{
    $first = fetchPage($config, 1, $min, $max);
    $count = (int)($first['count'] ?? 0);

    if ($count > HITS * MAX_PAGES && $max - $min > 1) {
        $mid = intdiv($min + $max, 2);
        collectRange($config, $min, $mid, $items);
        collectRange($config, $mid + 1, $max, $items);
        return;
    }

    $pageCount = min((int)($first['pageCount'] ?? 1), MAX_PAGES);
    for ($page = 1; $page <= $pageCount; $page++) {
        $res = $page === 1 ? $first : fetchPage($config, $page, $min, $max);
        foreach ($res['Items'] ?? $res['items'] ?? [] as $item) {
            $item = $item['Item'] ?? $item;
            $compact = compactItem($item);
            if ($compact['code'] !== '') $items[$compact['code']] = $compact;
        }
    }
    logLine("range {$min}-{$max}: count={$count}, pages={$pageCount}");
}

try {
    $items = [];

    if ($dryRun) {
        for ($page = 1; $page <= 3; $page++) {
            $res = fetchPage($config, $page, 1, 999999);
            foreach ($res['Items'] ?? $res['items'] ?? [] as $item) {
                $items[] = compactItem($item['Item'] ?? $item);
            }
        }
        file_put_contents(__DIR__ . '/sample.json', json_encode($items, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        logLine('dry run: saved sample.json (' . count($items) . ' items)');
        exit(0);
    }

    collectRange($config, 1, 999999, $items);
    $items = array_values($items);
    logLine('fetched ' . count($items) . " items with {$requestCount} requests");

    // 1万件規模になるので gzip で圧縮して送る（Vercel の受信上限対策）
    $payload = gzencode(json_encode(['items' => $items], JSON_UNESCAPED_UNICODE), 9);
    $ch = curl_init($config['ingest_url']);
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
    logLine("ingest: HTTP {$status} " . substr((string)$body, 0, 500));
    exit($status === 200 ? 0 : 1);
} catch (Throwable $e) {
    logLine('ERROR: ' . $e->getMessage());
    exit(1);
}
