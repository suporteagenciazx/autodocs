<?php

declare(strict_types=1);

/**
 * Marca a sessão como bloqueada (idle lock) — limpa pin_ok.
 */

require __DIR__ . '/bootstrap.php';

autodocs_send_security_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    autodocs_json_response(405, ['error' => 'Método não permitido']);
}

try {
    autodocs_load_config();
    $pdo = autodocs_pdo();
    autodocs_require_login($pdo);
    autodocs_require_csrf();
} catch (Throwable $e) {
    autodocs_json_auth_error($e);
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
}

autodocs_session_set_pin_ok(false);
// Congela last_active_at no momento do bloqueio (não tocar).
autodocs_json_response(200, [
    'ok' => true,
    'locked' => true,
    'lastActiveAt' => autodocs_session_last_active_at(),
]);
