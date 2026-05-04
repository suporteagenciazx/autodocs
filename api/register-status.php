<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    autodocs_json_response(405, ['error' => 'Método não permitido']);
    exit;
}

try {
    $cfg = autodocs_load_config();
    autodocs_json_response(200, ['registrationOpen' => !empty($cfg['registration_open'])]);
} catch (Throwable $e) {
    autodocs_json_response(503, ['registrationOpen' => false, 'error' => $e->getMessage()]);
}
