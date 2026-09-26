<?php
/**
 * used.gadelog.com のデータ更新が止まっていないかを確認する（シンレンタルサーバーの cron から毎日実行）。
 *
 * 問題がないときは何も出力しない。問題があるときだけ標準出力に書くので、
 * サーバーパネルの「Cron結果の通知アドレス」宛てにメールが届く。
 * GitHub Actions が止まっても気づけるよう、GitHub の外から監視する。
 */

declare(strict_types=1);

const HEALTH_URL = 'https://used.gadelog.com/api/health';

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

if ($status === 200 && is_array($data) && ($data['ok'] ?? false) === true) {
    exit(0); // 正常: 出力しない（メールも送られない）
}

echo "【中古スマホ一括検索】データ更新に問題があります\n\n";
echo "確認先: " . HEALTH_URL . "\n";
echo "HTTP ステータス: {$status}" . ($error !== '' ? "（{$error}）" : '') . "\n\n";

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
