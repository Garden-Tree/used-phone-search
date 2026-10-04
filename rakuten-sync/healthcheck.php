<?php
/**
 * used.gadelog.com のデータ更新が止まっていないかを確認する（シンレンタルサーバーの cron から毎日実行）。
 *
 * 問題がないときは何も出力しない。問題があるときだけ標準出力に書くので、
 * サーバーパネルの「Cron結果の通知アドレス」宛てにメールが届く。
 * GitHub Actions が止まっても気づけるよう、GitHub の外から監視する。
 */

declare(strict_types=1);

// 静的書き出し版（docs/cloudflare-pages.md）はビルドのたびに書き出す /health.json を読む。
// ビルド自体が止まっても気づけるよう、checkedAt が古すぎるときも問題とする
const HEALTH_URL = 'https://used.gadelog.com/health.json';
const MAX_BUILD_AGE_HOURS = 14; // ビルドは6時間ごと（GitHub の遅れで数時間ずれる）

$ch = curl_init(HEALTH_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 60,
]);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

$data = is_string($body) ? json_decode($body, true) : null;

// ページそのものが配信できているか（配置の不具合・DNS・SSL の問題で HTML だけ届かないことがある）
$pageProblems = [];
foreach (['https://used.gadelog.com/', 'https://used.gadelog.com/iphone/iphone-13'] as $pageUrl) {
    $ch = curl_init($pageUrl);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60]);
    $html = curl_exec($ch);
    $pageStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($pageStatus !== 200 || !is_string($html) || stripos($html, '<html') === false) {
        $pageProblems[] = "ページが表示できない: {$pageUrl}（HTTP {$pageStatus}）";
    }
}

$buildAgeHours = is_array($data) && isset($data['checkedAt'])
    ? (time() - strtotime((string)$data['checkedAt'])) / 3600
    : null;
$buildStale = $buildAgeHours === null || $buildAgeHours > MAX_BUILD_AGE_HOURS;

if ($status === 200 && is_array($data) && ($data['ok'] ?? false) === true && !$buildStale && $pageProblems === []) {
    exit(0); // 正常: 出力しない（メールも送られない）
}

echo "【中古スマホ一括検索】データ更新に問題があります\n\n";
echo "確認先: " . HEALTH_URL . "\n";
echo "HTTP ステータス: {$status}" . ($error !== '' ? "（{$error}）" : '') . "\n\n";

foreach ($pageProblems as $problem) {
    echo "- {$problem}\n";
}
if ($buildStale) {
    echo "- サイトの書き出しが止まっています（最終: " . ($data['checkedAt'] ?? '不明') . "）\n";
}
if (is_array($data)) {
    foreach ($data['problems'] ?? [] as $problem) {
        echo "- {$problem}\n";
    }
    echo "\nショップ別の状況:\n";
    foreach ($data['shops'] ?? [] as $shop) {
        echo sprintf("  %s: %d件 / 最終更新 %s（%s時間前）\n",
            $shop['shop'], $shop['count'], $shop['lastUpdated'] ?? '-', $shop['ageHours'] ?? '?');
    }
    echo "\n価格推移の最終記録日: " . ($data['lastPriceSnapshot'] ?? '-') . "\n";
} else {
    echo "応答を読み取れませんでした: " . substr((string)$body, 0, 500) . "\n";
}

echo "\n確認ポイント:\n";
echo "- GitHub Actions「Phone Inventory Scraper」が有効か・失敗していないか\n";
echo "- ゲオ（楽天）の場合はサーバーの rakuten-sync/fetch.log\n";
exit(1);
