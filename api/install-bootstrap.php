<?php

declare(strict_types=1);

/**
 * Cria o primeiro utilizador administrador quando a tabela users está vazia.
 * POST JSON: { "email": "..." }
 * Resposta inclui pin (só nesta resposta).
 */

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/autodocs-pin-lib.php';

header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    autodocs_json_response(405, ['error' => 'Use POST com JSON: email.']);
    exit;
}

try {
    autodocs_load_config();
    $pdo = autodocs_pdo();
} catch (Throwable $e) {
    autodocs_json_response(503, ['error' => $e->getMessage()]);
    exit;
}

if (autodocs_install_is_locked()) {
    autodocs_json_response(403, ['error' => 'A instalação inicial já foi concluída.']);
    exit;
}

try {
    $n = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($n > 0) {
        autodocs_install_write_lock();
        autodocs_json_response(403, ['error' => 'A instalação inicial já foi concluída (existem utilizadores).']);
        exit;
    }
} catch (Throwable $e) {
    autodocs_json_response(500, ['error' => 'Erro ao verificar utilizadores. Importou sql/schema.sql?']);
    exit;
}

$body = autodocs_read_json_body();
$email = isset($body['email']) ? trim((string) $body['email']) : '';

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    autodocs_json_response(400, ['error' => 'Email inválido.']);
    exit;
}

try {
    $pdo->beginTransaction();
    $plainPin = autodocs_pin_generate();
    $pinHash = autodocs_pin_hash($plainPin);
    // password_hash residual (login é só PIN); valor aleatório não reutilizável.
    $hash = password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT);
    $st = $pdo->prepare(
        'INSERT INTO users (email, password_hash, pin_hash, pin_updated_at, role, active)
         VALUES (?, ?, ?, NOW(), \'admin\', 1)'
    );
    $st->execute([$email, $hash, $pinHash]);
    $uid = (int) $pdo->lastInsertId();
    $st2 = $pdo->prepare('INSERT INTO user_doc_access (user_id, batch_id) VALUES (?, 1)');
    $st2->execute([$uid]);
    $pdo->commit();
    autodocs_install_write_lock();

    autodocs_regenerate_session();
    $_SESSION['uid'] = $uid;
    autodocs_session_set_pin_ok(true);
    $csrf = autodocs_csrf_token();
    $user = ['id' => $uid, 'email' => $email, 'role' => 'admin'];
    autodocs_json_response(201, [
        'ok' => true,
        'message' => 'Administrador criado. Guarde o PIN — só é mostrado uma vez.',
        'pin' => $plainPin,
        'csrfToken' => $csrf,
        'user' => $user,
        'allowedDocIds' => autodocs_allowed_doc_ids($pdo, $user + ['active' => 1]),
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    autodocs_json_response(500, ['error' => 'Falha ao criar administrador.']);
}
