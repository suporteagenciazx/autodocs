<?php

declare(strict_types=1);

const AUTODOCS_ROOT = __DIR__ . '/..';

/**
 * IDs do catálogo (alinhados a scripts/autodocs-docs-catalog.js).
 *
 * @return list<string>
 */
function autodocs_catalog_doc_ids(): array
{
    return [
        'aprovacao',
        'contrato',
        'comprovante',
        'termo',
        'declaracao',
        'ordem',
        'garantia',
    ];
}

function autodocs_load_config(): array
{
    $path = __DIR__ . '/private/config.local.json';
    if (!is_readable($path)) {
        throw new RuntimeException('Ficheiro de configuração em falta: api/private/config.local.json (copie a partir de config.local.example.json).');
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        throw new RuntimeException('Não foi possível ler api/private/config.local.json.');
    }
    $j = json_decode($raw, true);
    if (!is_array($j) || !isset($j['db']) || !is_array($j['db'])) {
        throw new RuntimeException('api/private/config.local.json inválido: falta chave "db".');
    }
    $db = $j['db'];
    foreach (['host', 'name', 'user', 'password'] as $k) {
        if (!isset($db[$k]) || !is_string($db[$k])) {
            throw new RuntimeException('api/private/config.local.json: db.' . $k . ' em falta ou inválido.');
        }
    }
    $port = isset($db['port']) ? (int) $db['port'] : 3306;
    return [
        'db' => [
            'host' => $db['host'],
            'port' => $port,
            'name' => $db['name'],
            'user' => $db['user'],
            'password' => $db['password'],
        ],
        'session_cookie_secure' => !empty($j['session_cookie_secure']),
        'registration_open' => !empty($j['registration_open']),
    ];
}

function autodocs_json_response(int $code, array $body): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function autodocs_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}

function autodocs_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $c = autodocs_load_config()['db'];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $c['host'],
        $c['port'],
        $c['name']
    );
    $pdo = new PDO($dsn, $c['user'], $c['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function autodocs_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $cfg = autodocs_load_config();
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $cfg['session_cookie_secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name('AUTODOCSSESSID');
    session_start();
}

function autodocs_regenerate_session(): void
{
    autodocs_start_session();
    session_regenerate_id(true);
}

function autodocs_destroy_session(): void
{
    autodocs_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function autodocs_session_user_id(): ?int
{
    autodocs_start_session();
    if (!isset($_SESSION['uid'])) {
        return null;
    }
    $v = $_SESSION['uid'];
    if (is_int($v)) {
        return $v;
    }
    if (is_string($v) && ctype_digit($v)) {
        return (int) $v;
    }
    return null;
}

function autodocs_user_by_id(PDO $pdo, int $id): ?array
{
    $st = $pdo->prepare('SELECT id, email, role, active FROM users WHERE id = ? LIMIT 1');
    $st->execute([$id]);
    $row = $st->fetch();
    return $row ?: null;
}

/**
 * Lista de catalog_doc_id permitidos (admin = todos).
 *
 * @return list<string>
 */
function autodocs_allowed_doc_ids(PDO $pdo, array $user): array
{
    if (($user['role'] ?? '') === 'admin') {
        return autodocs_catalog_doc_ids();
    }
    if (empty($user['active'])) {
        return [];
    }
    $lib = __DIR__ . '/user-tag-links-lib.php';
    if (!is_readable($lib)) {
        return [];
    }
    require_once $lib;
    require_once __DIR__ . '/autodocs-tags-lib.php';
    $userTagIds = autodocs_user_tag_ids_for((int) $user['id']);
    if ($userTagIds === []) {
        return [];
    }
    $tagsPayload = autodocs_tags_load_merged();
    return autodocs_allowed_docs_from_user_tags($userTagIds, $tagsPayload['docLinks']);
}

/**
 * Tags atribuídas ao utilizador (grupos de documentação).
 *
 * @return list<string>
 */
function autodocs_user_assigned_tag_ids(array $user): array
{
    if (($user['role'] ?? '') === 'admin') {
        return [];
    }
    $lib = __DIR__ . '/user-tag-links-lib.php';
    if (!is_readable($lib)) {
        return [];
    }
    require_once $lib;
    return autodocs_user_tag_ids_for((int) $user['id']);
}

function autodocs_require_login(PDO $pdo): array
{
    $uid = autodocs_session_user_id();
    if ($uid === null) {
        throw new RuntimeException('UNAUTHORIZED');
    }
    $user = autodocs_user_by_id($pdo, $uid);
    if (!$user || !(int) $user['active']) {
        throw new RuntimeException('UNAUTHORIZED');
    }
    return $user;
}

function autodocs_require_admin(PDO $pdo): array
{
    $user = autodocs_require_login($pdo);
    if (($user['role'] ?? '') !== 'admin') {
        throw new RuntimeException('FORBIDDEN');
    }
    return $user;
}

/**
 * @param list<int|string> $batchIds
 */
function autodocs_admin_set_user_batches(PDO $pdo, int $userId, array $batchIds): void
{
    $pdo->prepare('DELETE FROM user_doc_access WHERE user_id = ?')->execute([$userId]);
    $st = $pdo->prepare('SELECT id FROM doc_batches WHERE id = ? LIMIT 1');
    $ins = $pdo->prepare('INSERT INTO user_doc_access (user_id, batch_id) VALUES (?, ?)');
    foreach ($batchIds as $bid) {
        $id = (int) $bid;
        if ($id <= 0) {
            continue;
        }
        $st->execute([$id]);
        if ($st->fetch()) {
            $ins->execute([$userId, $id]);
        }
    }
}

function autodocs_path_to_catalog_doc_id(string $rel): ?string
{
    $rel = str_replace('\\', '/', $rel);
    $rel = trim($rel, '/');
    if ($rel === '') {
        return null;
    }
    if (str_starts_with($rel, 'consulta/') || $rel === 'consulta') {
        return 'consulta';
    }
    if (str_starts_with($rel, 'documentos/')) {
        $rest = substr($rel, strlen('documentos/'));
        $first = explode('/', $rest, 2)[0];
        if ($first !== '' && in_array($first, autodocs_catalog_doc_ids(), true)) {
            return $first;
        }
    }
    return null;
}
