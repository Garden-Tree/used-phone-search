<?php
/**
 * 楽天市場 商品検索API から楽天市場店（ゲオモバイル・じゃんぱら・ソフマップ）の iPhone・iPad・Google Pixel・Galaxy（と、一部の店だけ MacBook・Xperia・AQUOS・Apple Watch）在庫を取得し、
 * used.gadelog.com の受け口（/api/ingest/rakuten?shop=<shopCode>）へショップごとに送信する。
 * Cloudflare Pages 版（cloudflare-pages ブランチ）では、config.php に output_dir を書くと、送信せずに
 * <output_dir>/<shopCode>.json.gz に保存する。output_dir は公開フォルダの中の推測されにくいフォルダにし、
 * GitHub Actions が HTTPS で取りに来て scripts/ingest-rakuten.ts で取り込む（docs/cloudflare-pages.md）。
 *
 * シンレンタルサーバー（固定IP: 楽天アプリの許可IPに登録済み）の cron から実行する。
 *   php fetch.php                 … 全ショップを全件取得して送信
 *   php fetch.php janpara         … 指定したショップだけ
 *   php fetch.php --dry [shop]    … 送信せず、先頭3ページ分を sample.json に保存（確認用）
 *   php fetch.php --dry --kw=ノートパソコン --ng="MacBook Chromebook" janpara
 *                                 … dry の検索語と除外語を変える（中古パソコンを足す前の確認用。2026-10-27〜）
 *   php fetch.php --dry --pc janpara … 中古パソコンの検索語・除外語（PC_SHOP_KEYWORDS・PC_NG_KEYWORD）で dry。
 *                                 サーバーパネルの cron は日本語や引用符を受け付けないので、cron から試すときはこちら
 *
 * 秘密の値は同じディレクトリの config.php に置く（config.example.php を参照）。
 * 商品名の正規化は受け口（TypeScript）側で行い、ここでは取得と最小限の抽出だけを行う。
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$args = array_slice($argv ?? [], 1);
$dryRun = in_array('--dry', $args, true);
$onlyShops = array_values(array_filter($args, fn($a) => !str_starts_with($a, '--')));
// --dry の検索語・除外語（NGKeyword）。指定がなければ KEYWORDS[0] で除外なし
$dryKeyword = null;
$dryNg = '';
foreach ($args as $a) {
    if (str_starts_with($a, '--kw=')) $dryKeyword = substr($a, 5);
    if (str_starts_with($a, '--ng=')) $dryNg = substr($a, 5);
    if ($a === '--pc') $dryKeyword = '--pc'; // syncShop で PC_KEYWORD・PC_NG_KEYWORD に置き換える（定数はこの下で定義されるため）
}

const ENDPOINT = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
// 取り込むショップ（楽天の shopCode）。受け口 lib/rakutenShops.ts の RAKUTEN_SHOPS と揃える
// kamaya-awards・garakei はニューズドテック1号店・2号店、emedama はカメラのキタムラ、ekosuta はエムティーエム、pc-good はイオシス（2026-10-08〜）
const SHOP_CODES = ['geo-mobile', 'janpara', 'akiba-u-shop', 'kamaya-awards', 'garakei', 'emedama', 'ekosuta', 'pc-good'];
// 1ショップ分として、この検索語の結果をまとめて送る（受け口はショップ単位で洗い替えるため）
// Pixel・Galaxy は 2026-09-30〜（アクセサリも当たるが、受け口の lib/rakutenPixel.ts・rakutenGalaxy.ts が本体以外を落とす）
const KEYWORDS = ['iPhone', 'iPad', 'Pixel', 'Galaxy'];
// MacBook は 2026-10-15〜、Apple シリコンの在庫がある3店だけ（読み取りは lib/rakutenMac.ts）。
// ほかの店で「MacBook」を引くとモニタ・ケーブルが数万件当たり、要求数の上限（MAX_REQUESTS）を超えて店ごと失敗するため
const MAC_SHOP_CODES = ['janpara', 'akiba-u-shop', 'pc-good'];
// Xperia・AQUOS は 2026-10-15〜、ゲオ・じゃんぱら・ソフマップ・イオシスの4店だけ（読み取りは lib/rakutenAndroid.ts）。
// ニューズドテック・キタムラ・エムティーエムは件数が少ないので引かない。
// 要求数の概算（MAX_REQUESTS=1500 に収まるか）: ゲオは Xperia 約1,200件・AQUOS 約1,250件の追加で、1ページ30件 → 約 41＋42 ＝ 約 85 要求
// （3,000 件未満なので価格帯の分割はない）。じゃんぱら・ソフマップ・イオシスは各 数百件ずつで 約 20〜40 要求。
// 既存の取得（全店で約350要求・イオシスは MacBook 約200要求を含む）に足しても、1店あたり 1500 に収まる見込み。
// 取得時間は ゲオで約 +95 秒（1.1 秒間隔）。実際の要求数は fetch.log の「fetched … with N requests」で確かめる
const ANDROID_KEYWORDS = ['Xperia', 'AQUOS'];
const ANDROID_SHOP_CODES = ['geo-mobile', 'janpara', 'akiba-u-shop', 'pc-good'];
// Apple Watch は 2026-10-15〜、ゲオ・じゃんぱら・ソフマップ・イオシス・ニューズドテック（1号店・2号店）の6店だけ（読み取りは lib/rakutenWatch.ts）。
// キタムラ・エムティーエムは引かない。バンド・充電器・保護フィルムも当たるが、受け口が世代・サイズ・通信方式のそろった本体だけを残す。
// 要求数の概算（MAX_REQUESTS=1500 は1ショップあたり）: ゲオは「Apple Watch」で約 6,000 件（バンド込み）。3,000 件を超えるので価格帯を半分ずつに割る
// （割るたびに1ページ目を1回余計に引く: 約 5〜10 要求）。1ページ30件 → 約 6,000 ÷ 30 ＝ 約 200 要求＋分割の約 10 ＝ 約 210 要求。
// ゲオの合計の見込み: 既存の約 350（iPhone・iPad・Pixel・Galaxy）＋ Xperia・AQUOS 約 85 ＋ Apple Watch 約 210 ＝ 約 650 要求（上限 1500 の半分以下）。
// ほかの店は Apple Watch が数十〜数百件ずつ（約 5〜30 要求）。イオシスは MacBook 約 200 要求を含めても 約 350＋200＋40＋30 ＝ 約 620 で収まる。
// 取得時間はゲオで約 +4 分（1.1 秒間隔×約 210）。1500 で足りる見込みなので上限は上げない。実際の要求数は fetch.log の「fetched … with N requests」で確かめる
const WATCH_KEYWORDS = ['Apple Watch'];
const WATCH_SHOP_CODES = ['geo-mobile', 'janpara', 'akiba-u-shop', 'pc-good', 'kamaya-awards', 'garakei'];
// 中古ノートパソコン（Windows）は 2026-10-27〜、ソフマップ・じゃんぱら・イオシスの3店だけ（読み取りは lib/rakutenPc.ts。表は PcInventory）。
// スマホのファイルとは別の <shopCode>-pc.json.gz に置く（スマホの取得・洗い替えに影響させない。PC の取得が失敗しても、スマホのファイルは置いたあと）。
// MacBook・Chromebook・iPad は NGKeyword で外す。PC 専門店の楽天店は SKU 選択式で取り込めないので引かない（ideas/2026-10-27.md）。
// 要求数の概算（10/27 の楽天の検索ページの件数）: ソフマップ 約4,200件（3,000件を超えるので価格帯を割る）＝約150要求、じゃんぱら 約1,800件＝約60、イオシス 約300件＝約10。
// 1店あたりの MAX_REQUESTS=1500 に、今の約350〜650要求と合わせても収まる。取得時間はソフマップで約 +3 分
// 検索語は店ごと: じゃんぱらは商品名に「ノートパソコン」がほとんどなく（10/27 の試しで4件）、ノートには画面の「12LCD(1920x1200)」が必ず入るので「LCD」
// （モニター・Chromebook も当たるが、受け口の lib/rakutenPc.ts が CPU・メモリ・SSD の読めないものを落とす）
const PC_SHOP_KEYWORDS = ['akiba-u-shop' => 'ノートパソコン', 'janpara' => 'LCD', 'pc-good' => 'ノートパソコン'];
const PC_SHOP_CODES = ['akiba-u-shop', 'janpara', 'pc-good'];
const PC_NG_KEYWORD = 'MacBook Chromebook iPad';
const HITS = 30;              // 1ページの最大件数
const MAX_PAGES = 100;        // API の上限（1検索あたり最大 3,000 件）
const INTERVAL_US = 1100000;  // 登録した QPS=1 を守るため 1.1 秒間隔
const MAX_REQUESTS = 1500;    // 暴走防止（1ショップあたり）。MacBook を足した 2026-10-15 に 1000 → 1500（イオシスの MacBook は約6,000件＝約200回）

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

function fetchPage(array $config, string $shopCode, string $keyword, int $page, int $minPrice, int $maxPrice, string $ngKeyword = ''): array
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
    ] + ($ngKeyword !== '' ? ['NGKeyword' => $ngKeyword] : []));
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
    $catchcopy = (string)($item['catchcopy'] ?? '');
    // ランク: ゲオは「【程度】A」、ソフマップは「〔商品ランクA〕」、ニューズドテックはキャッチコピーの「【Bランク】」、
    // イオシスは「この商品は<span class="b_rank">中古Bランク</span>です」
    if (!preg_match('/【程度】\s*([^\s【]+)/u', $caption, $rank)
        && !preg_match('/〔商品ランク\s*([A-Z])〕/u', $caption, $rank)
        && !preg_match('/この商品は(?:<[^>]*>|\s)*(?:中古)?([SABC])ランク/u', $caption, $rank)) {
        preg_match('/【([SABC])ランク】/u', $catchcopy, $rank);
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
    // パソコンのスペック: ソフマップは商品説明に「〔CPU〕Core i5 10310U (1.7GHz)〔メモリ容量〕16GB〔ストレージ種類_1〕SSD〔ストレージ容量_1〕256GB〔モニターサイズ〕12.1インチワイド」
    // （商品名にスペックがない）。〔CPU〕があるときだけ、この5項目を「CPU:…|メモリ:…」の形で送る（中古パソコン。2026-10-27〜）
    $spec = null;
    if (preg_match('/〔CPU〕\s*([^〔]+)/u', $caption, $cpu)) {
        $parts = ['CPU:' . trim(strip_tags($cpu[1]))];
        foreach (['メモリ容量' => 'メモリ', 'ストレージ種類_1' => '種類', 'ストレージ容量_1' => '容量', 'モニターサイズ' => '画面', 'OS' => 'OS'] as $key => $label) {
            if (preg_match('/〔' . $key . '〕\s*([^〔]+)/u', $caption, $m)) $parts[] = $label . ':' . trim(strip_tags($m[1]));
        }
        $spec = cutUtf8(implode('|', $parts), 300);
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
        'spec'  => $spec,
    ];
}

/**
 * 価格帯 [min, max] の在庫を集める。3,000 件を超える帯は半分に割って再帰的に取得する
 */
function collectRange(array $config, string $shopCode, string $keyword, int $min, int $max, array &$items, string $ngKeyword = ''): void
{
    $first = fetchPage($config, $shopCode, $keyword, 1, $min, $max, $ngKeyword);
    $count = (int)($first['count'] ?? 0);

    if ($count > HITS * MAX_PAGES && $max - $min > 1) {
        $mid = intdiv($min + $max, 2);
        collectRange($config, $shopCode, $keyword, $min, $mid, $items, $ngKeyword);
        collectRange($config, $shopCode, $keyword, $mid + 1, $max, $items, $ngKeyword);
        return;
    }

    $pageCount = min((int)($first['pageCount'] ?? 1), MAX_PAGES);
    for ($page = 1; $page <= $pageCount; $page++) {
        $res = $page === 1 ? $first : fetchPage($config, $shopCode, $keyword, $page, $min, $max, $ngKeyword);
        foreach ($res['Items'] ?? $res['items'] ?? [] as $item) {
            $item = $item['Item'] ?? $item;
            $compact = compactItem($item);
            if ($compact['code'] !== '') $items[$compact['code']] = $compact;
        }
    }
    logLine("{$shopCode} {$keyword} range {$min}-{$max}: count={$count}, pages={$pageCount}");
}

/**
 * 中古ノートパソコンを取って <output_dir>/<shopCode>-pc.json.gz に置く（2026-10-27〜）。
 * スマホのファイルを置いたあとに呼ぶ。失敗してもログに残すだけ（スマホの取り込みは止めない。PC は前回のファイルが残る）
 */
function syncPc(array $config, string $shopCode, string $dir): void
{
    global $requestCount;
    $before = $requestCount;
    $items = [];
    try {
        collectRange($config, $shopCode, PC_SHOP_KEYWORDS[$shopCode], 1, 999999, $items, PC_NG_KEYWORD);
        $items = array_values($items);
        $payload = gzencode(json_encode(['items' => $items], JSON_UNESCAPED_UNICODE), 9);
        $tmp = "{$dir}/.{$shopCode}-pc.json.gz." . getmypid() . '.tmp';
        $ok = file_put_contents($tmp, $payload) !== false && rename($tmp, "{$dir}/{$shopCode}-pc.json.gz");
        logLine("{$shopCode} pc: " . count($items) . ' items with ' . ($requestCount - $before) . ' requests, saved ' . ($ok ? 'ok' : 'FAILED'));
    } catch (Throwable $e) {
        logLine("{$shopCode} pc ERROR: " . $e->getMessage());
    }
}

/** 1ショップ分を取得して受け口へ送る。成功なら true */
function syncShop(array $config, string $shopCode, bool $dryRun): bool
{
    global $requestCount, $dryKeyword, $dryNg;
    // --pc は店ごとの PC の検索語（複数店を一度に試すので、グローバルは書き換えない）
    $kw = $dryKeyword === '--pc' ? (PC_SHOP_KEYWORDS[$shopCode] ?? 'ノートパソコン') : $dryKeyword;
    $ng = $dryKeyword === '--pc' ? PC_NG_KEYWORD : $dryNg;
    $requestCount = 0;
    $items = [];

    if ($dryRun) {
        for ($page = 1; $page <= 3; $page++) {
            $res = fetchPage($config, $shopCode, $kw ?? KEYWORDS[0], $page, 1, 999999, $ng);
            foreach ($res['Items'] ?? $res['items'] ?? [] as $item) {
                $items[] = compactItem($item['Item'] ?? $item);
                // 新しい店の読み取りを作るとき用に、API の生の応答（説明文など）も残す
                $raw[] = $item['Item'] ?? $item;
            }
        }
        file_put_contents(__DIR__ . "/sample-{$shopCode}.json", json_encode($items, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        file_put_contents(__DIR__ . "/sample-{$shopCode}-raw.json", json_encode($raw ?? [], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        logLine("{$shopCode} dry run" . ($kw !== null ? " kw={$kw} ng={$ng}" : '') . ": saved sample-{$shopCode}.json (" . count($items) . ' items, count=' . ($res['count'] ?? '?') . ')');
        return true;
    }

    $keywords = in_array($shopCode, MAC_SHOP_CODES, true) ? array_merge(KEYWORDS, ['MacBook']) : KEYWORDS;
    if (in_array($shopCode, ANDROID_SHOP_CODES, true)) $keywords = array_merge($keywords, ANDROID_KEYWORDS);
    if (in_array($shopCode, WATCH_SHOP_CODES, true)) $keywords = array_merge($keywords, WATCH_KEYWORDS);
    foreach ($keywords as $keyword) {
        collectRange($config, $shopCode, $keyword, 1, 999999, $items);
    }
    $items = array_values($items);
    logLine("{$shopCode} fetched " . count($items) . " items with {$requestCount} requests");

    // 1万件規模になるので gzip で圧縮して送る（Vercel の受信上限対策）
    $payload = gzencode(json_encode(['items' => $items], JSON_UNESCAPED_UNICODE), 9);

    // 静的書き出し版: ファイルに置くだけ（書きかけを読まれないよう、一時ファイルに書いてから名前を変える）
    if (!empty($config['output_dir'])) {
        $dir = rtrim($config['output_dir'], '/');
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        // 一覧を出さない・サーバーキャッシュ（5分）に古い分を返させない（must-revalidate などがあるとキャッシュされない）
        if (!is_file("{$dir}/.htaccess")) {
            file_put_contents("{$dir}/.htaccess", "Options -Indexes\nHeader set Cache-Control \"no-store\"\n");
        }
        // 手動実行と cron が重なっても書きかけを取り違えないよう、一時ファイル名にプロセス番号を付ける
        $tmp = "{$dir}/.{$shopCode}.json.gz." . getmypid() . '.tmp';
        $ok = file_put_contents($tmp, $payload) !== false && rename($tmp, "{$dir}/{$shopCode}.json.gz");
        logLine("{$shopCode} saved: " . ($ok ? "{$dir}/{$shopCode}.json.gz (" . strlen($payload) . ' bytes)' : 'FAILED'));
        if (in_array($shopCode, PC_SHOP_CODES, true)) syncPc($config, $shopCode, $dir);
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

// 知らないショップ名（打ち間違い・パスに使えない文字）は止める。
// --dry だけは SHOP_CODES にない店も試せる（新しい店を足す前に API の生の応答を見るため。2026-10-27〜。送信も洗い替えもしない）
foreach ($onlyShops as $shopCode) {
    if (!preg_match('/^[a-z0-9_-]+$/', $shopCode) || (!$dryRun && !in_array($shopCode, SHOP_CODES, true))) {
        fwrite(STDERR, "unknown shop: {$shopCode}\n");
        exit(2);
    }
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

// 書き出しが終わったら、GitHub Actions に取り込み〜サイトの書き出しをすぐ始めさせる。
// 定期実行（schedule）は数時間遅れることがあるので、楽天の取得の直後に起こす（定期実行は保険として残す）。
// トークンは Fine-grained で、このリポジトリの Actions: Read and write だけを付ける（config.php に置く）
if (!$dryRun && !$onlyShops && !empty($config['output_dir']) && !empty($config['github_dispatch_token'])) {
    $ch = curl_init('https://api.github.com/repos/Garden-Tree/used-phone-search/actions/workflows/scraper.yaml/dispatches');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['ref' => 'main']),
        CURLOPT_HTTPHEADER     => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $config['github_dispatch_token'],
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: used-phone-search-rakuten-sync',
        ],
        CURLOPT_TIMEOUT        => 30,
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    // 成功は 204。失敗しても定期実行で取り込まれるので、ログに残すだけ
    logLine('dispatch: HTTP ' . $status . ($status === 204 ? '' : ' ' . substr((string)$body, 0, 200)));
}

exit($failed === 0 ? 0 : 1);
