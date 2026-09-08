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
    autodocs_require_csrf();
} catch (Throwable $e) {
    autodocs_json_auth_error($e);
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Erro no servidor.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$body = autodocs_read_json_body();
$existing = null;
if (is_readable(AUTODOCS_TAGS_FILE)) {
    $rawExisting = file_get_contents(AUTODOCS_TAGS_FILE);
    if ($rawExisting !== false && $rawExisting !== '') {
        $decoded = json_decode($rawExisting, true);
        if (is_array($decoded)) {
            $existing = $decoded;
        }
    }
}
$save = autodocs_tags_sanitize_payload($body, $existing);

$json = json_encode($save, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
if (@file_put_contents(AUTODOCS_TAGS_FILE, $json, LOCK_EX) === false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Não foi possível gravar api/private/tags.json (permissões?).'], JSON_UNESCAPED_UNICODE);
    exit;
}

autodocs_tags_cache_invalidate();

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok' => true,
    'tags' => $save['tags'],
    'docLinks' => $save['docLinks'],
    'catalogOverrides' => $save['catalogOverrides'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
