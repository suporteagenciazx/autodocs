<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/autodocs-tags-lib.php';

autodocs_send_security_headers();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $pdo = autodocs_pdo();
        autodocs_require_login($pdo);
    } catch (Throwable $e) {
        $msg = $e->getMessage();
        if ($msg === 'UNAUTHORIZED') {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'Não autenticado.'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Serviço indisponível.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $persisted = is_readable(AUTODOCS_TAGS_FILE);
    $payload = autodocs_tags_load_merged();
    $payload['persisted'] = $persisted;
    header('Cache-Control: private, no-store');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = autodocs_pdo();
    autodocs_require_admin($pdo);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if ($msg === 'UNAUTHORIZED') {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Não autenticado.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($msg === 'FORBIDDEN') {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Apenas administradores.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Erro no servidor.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$body = autodocs_read_json_body();
$save = autodocs_tags_sanitize_payload($body);

$json = json_encode($save, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
if (@file_put_contents(AUTODOCS_TAGS_FILE, $json, LOCK_EX) === false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Não foi possível gravar api/private/tags.json (permissões?).'], JSON_UNESCAPED_UNICODE);
    exit;
}

autodocs_tags_cache_invalidate();

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'tags' => $save['tags'], 'docLinks' => $save['docLinks']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
