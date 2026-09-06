<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$port = (int) (getenv('AUTODOCS_PUBLIC_PORT') ?: getenv('APP_PORT') ?: 8088);
if ($port < 1 || $port > 65535) {
    $port = 8088;
}

$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$hostname = preg_replace('/:\d+$/', '', $host) ?: 'localhost';
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';

echo json_encode([
    'ok' => true,
    'port' => $port,
    'url' => $scheme . '://' . $hostname . ($port === 80 || $port === 443 ? '' : ':' . $port) . '/',
    'name' => 'AutoDocs',
], JSON_UNESCAPED_SLASHES);
