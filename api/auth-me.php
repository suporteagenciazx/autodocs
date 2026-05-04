<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    autodocs_json_response(405, ['error' => 'Método não permitido']);
    exit;
}

try {
    autodocs_load_config();
    $pdo = autodocs_pdo();
    $user = autodocs_require_login($pdo);
    $allowed = autodocs_allowed_doc_ids($pdo, $user);
    autodocs_json_response(200, [
        'user' => [
            'id' => (int) $user['id'],
            'email' => (string) $user['email'],
            'role' => (string) $user['role'],
        ],
        'allowedDocIds' => $allowed,
    ]);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if ($msg === 'UNAUTHORIZED') {
        autodocs_json_response(401, ['error' => 'Não autenticado.']);
        exit;
    }
    if ($msg === 'FORBIDDEN') {
        autodocs_json_response(403, ['error' => 'Sem permissão.']);
        exit;
    }
    if ($e instanceof RuntimeException && str_contains($msg, 'config')) {
        autodocs_json_response(503, ['error' => $msg]);
        exit;
    }
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
}
