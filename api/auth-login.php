<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    autodocs_json_response(405, ['error' => 'Método não permitido']);
    exit;
}

try {
    $cfg = autodocs_load_config();
} catch (Throwable $e) {
    autodocs_json_response(503, ['error' => $e->getMessage()]);
    exit;
}

$body = autodocs_read_json_body();
$email = isset($body['email']) ? trim((string) $body['email']) : '';
$password = isset($body['password']) ? (string) $body['password'] : '';

if ($email === '' || $password === '') {
    autodocs_json_response(400, ['error' => 'Email e palavra-passe são obrigatórios.']);
    exit;
}

try {
    $pdo = autodocs_pdo();
    $st = $pdo->prepare('SELECT id, email, password_hash, role, active FROM users WHERE email = ? LIMIT 1');
    $st->execute([$email]);
    $row = $st->fetch();
    if (!$row || !(int) $row['active'] || !password_verify($password, (string) $row['password_hash'])) {
        autodocs_json_response(401, ['error' => 'Credenciais inválidas.']);
        exit;
    }
    autodocs_regenerate_session();
    $_SESSION['uid'] = (int) $row['id'];

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
    ]);
} catch (Throwable $e) {
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
    exit;
}
