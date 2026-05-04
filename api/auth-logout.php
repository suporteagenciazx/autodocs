<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    autodocs_json_response(405, ['error' => 'Método não permitido']);
    exit;
}

try {
    autodocs_load_config();
} catch (Throwable $e) {
    autodocs_json_response(503, ['error' => $e->getMessage()]);
    exit;
}

autodocs_destroy_session();
autodocs_json_response(200, ['ok' => true]);
