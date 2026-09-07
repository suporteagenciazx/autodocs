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
    $cfg = autodocs_load_config();
} catch (Throwable $e) {
    autodocs_json_response(503, ['error' => 'Serviço indisponível.']);
    exit;
}

$body = autodocs_read_json_body();
$email = isset($body['email']) ? trim((string) $body['email']) : '';
$pin = autodocs_pin_normalize(isset($body['pin']) ? (string) $body['pin'] : '');

if ($email === '' || !autodocs_pin_valid($pin)) {
    autodocs_json_response(400, ['error' => 'Email e PIN de 6 dígitos são obrigatórios.']);
    exit;
}

$ip = autodocs_client_ip();
$blocked = autodocs_login_throttle_check($ip, $email);
if ($blocked !== null) {
    autodocs_json_response(429, ['error' => $blocked]);
    exit;
}

try {
    $pdo = autodocs_pdo();
    $st = $pdo->prepare('SELECT id, email, pin_hash, role, active FROM users WHERE email = ? LIMIT 1');
    $st->execute([$email]);
    $row = $st->fetch();
    if (
        !$row
        || !(int) $row['active']
        || empty($row['pin_hash'])
        || !autodocs_pin_verify($pin, (string) $row['pin_hash'])
    ) {
        autodocs_login_throttle_fail($ip, $email);
        autodocs_json_response(401, ['error' => 'Credenciais inválidas.']);
        exit;
    }
    autodocs_login_throttle_clear($ip, $email);
    autodocs_regenerate_session();
    $_SESSION['uid'] = (int) $row['id'];
    autodocs_session_set_pin_ok(true);

    $user = [
        'id' => (int) $row['id'],
        'email' => (string) $row['email'],
        'role' => (string) $row['role'],
    ];
    $allowed = autodocs_allowed_doc_ids($pdo, $user + ['active' => 1]);

    autodocs_json_response(200, [
        'user' => $user,
        'allowedDocIds' => $allowed,
        'userTagIds' => autodocs_user_assigned_tag_ids($user + ['active' => 1]),
        'csrfToken' => autodocs_csrf_token(),
        'pinOk' => true,
        'locked' => false,
    ]);
} catch (Throwable $e) {
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
    exit;
}
