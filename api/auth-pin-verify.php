<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/autodocs-pin-lib.php';

autodocs_send_security_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    autodocs_json_response(405, ['error' => 'Método não permitido']);
    exit;
}

try {
    autodocs_load_config();
    $pdo = autodocs_pdo();
    $user = autodocs_require_login($pdo);
    autodocs_require_csrf();
} catch (Throwable $e) {
    autodocs_json_auth_error($e);
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
    exit;
}

$body = autodocs_read_json_body();
$pin = autodocs_pin_normalize(isset($body['pin']) ? (string) $body['pin'] : '');

if (!autodocs_pin_valid($pin)) {
    autodocs_json_response(400, ['error' => 'PIN de 6 dígitos obrigatório.']);
    exit;
}

$ip = autodocs_client_ip();
$email = (string) $user['email'];
$blocked = autodocs_login_throttle_check($ip, 'unlock:' . $email);
if ($blocked !== null) {
    autodocs_json_response(429, ['error' => $blocked]);
    exit;
}

try {
    $st = $pdo->prepare('SELECT pin_hash FROM users WHERE id = ? LIMIT 1');
    $st->execute([(int) $user['id']]);
    $row = $st->fetch();
    $hash = $row ? (string) ($row['pin_hash'] ?? '') : '';
    if ($hash === '' || !autodocs_pin_verify($pin, $hash)) {
        autodocs_login_throttle_fail($ip, 'unlock:' . $email);
        autodocs_json_response(401, ['error' => 'PIN inválido.']);
        exit;
    }
    autodocs_login_throttle_clear($ip, 'unlock:' . $email);
    autodocs_session_set_pin_ok(true);
    autodocs_json_response(200, ['ok' => true, 'csrfToken' => autodocs_csrf_token()]);
} catch (Throwable $e) {
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
    exit;
}
