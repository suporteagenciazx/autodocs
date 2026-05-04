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

if (empty($cfg['registration_open'])) {
    autodocs_json_response(403, ['error' => 'O registo público está desativado. Contacte um administrador.']);
    exit;
}

$body = autodocs_read_json_body();
$email = isset($body['email']) ? trim((string) $body['email']) : '';
$password = isset($body['password']) ? (string) $body['password'] : '';

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    autodocs_json_response(400, ['error' => 'Email inválido.']);
    exit;
}
if (strlen($password) < 8) {
    autodocs_json_response(400, ['error' => 'A palavra-passe deve ter pelo menos 8 caracteres.']);
    exit;
}

try {
    $pdo = autodocs_pdo();
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $st = $pdo->prepare('INSERT INTO users (email, password_hash, role, active) VALUES (?, ?, \'user\', 1)');
    $st->execute([$email, $hash]);
    $id = (int) $pdo->lastInsertId();
    autodocs_regenerate_session();
    $_SESSION['uid'] = $id;
    $user = ['id' => $id, 'email' => $email, 'role' => 'user'];
    autodocs_json_response(201, [
        'user' => $user,
        'allowedDocIds' => autodocs_allowed_doc_ids($pdo, $user + ['active' => 1]),
    ]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate')) {
        autodocs_json_response(409, ['error' => 'Este email já está registado.']);
        exit;
    }
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
}
