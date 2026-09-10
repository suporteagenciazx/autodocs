<?php

declare(strict_types=1);

/**
 * Heartbeat de atividade do utilizador (idle lock).
 * Só atualiza last_active_at se a sessão ainda estiver desbloqueada
 * e o idle ainda não tiver expirado.
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

if (autodocs_idle_lock_enabled()) {
    if (autodocs_idle_enforce() || !autodocs_session_pin_ok()) {
        autodocs_json_response(200, [
            'ok' => false,
            'locked' => true,
            'lastActiveAt' => autodocs_session_last_active_at(),
            'idleMinutes' => autodocs_idle_minutes(),
        ]);
    }
    autodocs_session_touch_activity();
}

autodocs_json_response(200, [
    'ok' => true,
    'locked' => false,
    'lastActiveAt' => autodocs_session_last_active_at(),
    'idleMinutes' => autodocs_idle_minutes(),
]);
