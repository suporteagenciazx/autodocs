<?php

declare(strict_types=1);

/**
 * Cria o primeiro utilizador administrador quando a tabela users está vazia.
 * POST JSON: { "email": "...", "password": "..." }
 */

require __DIR__ . '/bootstrap.php';

header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    autodocs_json_response(405, ['error' => 'Use POST com JSON: email e password.']);
    exit;
}

try {
    autodocs_load_config();
    $pdo = autodocs_pdo();
} catch (Throwable $e) {
    autodocs_json_response(503, ['error' => $e->getMessage()]);
    exit;
}

try {
    $n = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($n > 0) {
        autodocs_json_response(403, ['error' => 'A instalação inicial já foi concluída (existem utilizadores).']);
        exit;
    }
} catch (Throwable $e) {
    autodocs_json_response(500, ['error' => 'Erro ao verificar utilizadores. Importou sql/schema.sql?']);
    exit;
}

$body = autodocs_read_json_body();
$email = isset($body['email']) ? trim((string) $body['email']) : '';
$password = isset($body['password']) ? (string) $body['password'] : '';

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    autodocs_json_response(400, ['error' => 'Email inválido.']);
    exit;
}
if (strlen($password) < 10) {
    autodocs_json_response(400, ['error' => 'Use uma palavra-passe com pelo menos 10 caracteres.']);
    exit;
}

try {
    $pdo->beginTransaction();
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $st = $pdo->prepare('INSERT INTO users (email, password_hash, role, active) VALUES (?, ?, \'admin\', 1)');
    $st->execute([$email, $hash]);
    $uid = (int) $pdo->lastInsertId();
    $st2 = $pdo->prepare('INSERT INTO user_doc_access (user_id, batch_id) VALUES (?, 1)');
    $st2->execute([$uid]);
    $pdo->commit();

    autodocs_regenerate_session();
    $_SESSION['uid'] = $uid;
    $user = ['id' => $uid, 'email' => $email, 'role' => 'admin'];
    autodocs_json_response(201, [
        'ok' => true,
        'message' => 'Administrador criado. Já tem sessão iniciada.',
        'user' => $user,
        'allowedDocIds' => autodocs_allowed_doc_ids($pdo, $user + ['active' => 1]),
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    autodocs_json_response(500, ['error' => 'Falha ao criar administrador.']);
}
