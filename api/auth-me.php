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
    $locked = false;
    if (autodocs_idle_lock_enabled()) {
        $locked = autodocs_idle_enforce() || !autodocs_session_pin_ok();
    }
    autodocs_json_response(200, [
        'user' => [
            'id' => (int) $user['id'],
            'email' => (string) $user['email'],
            'role' => (string) $user['role'],
        ],
        'allowedDocIds' => $allowed,
        'userTagIds' => autodocs_user_assigned_tag_ids($user),
        'pinOk' => autodocs_session_pin_ok(),
        'locked' => $locked,
        'idleMinutes' => autodocs_idle_minutes(),
        'lastActiveAt' => autodocs_session_last_active_at(),
        'csrfToken' => autodocs_csrf_token(),
    ]);
} catch (Throwable $e) {
    autodocs_json_auth_error($e);
    if ($e instanceof RuntimeException && str_contains($e->getMessage(), 'config')) {
        autodocs_json_response(503, ['error' => $e->getMessage()]);
        exit;
    }
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
}
