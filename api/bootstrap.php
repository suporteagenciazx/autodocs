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
        'magnus-laudo',
        'valuation-aguia',
        'orcamento-aguia',
        'orcamento-magnus',
        'lae-dvego',
        'lae-dvego-magnus',
        'nfe-magnus',
        'nfe-aguia',
        'recibo-magnus',
        'recibo-aguia',
        'tela-aprovacao',
        'tela-auditoria-fiscal',
        'varredura-expansao',
        'cce-bacen',
        'eve-aguia',
        'eve-magnus',
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
    $redis = [
        'host' => 'redis',
        'port' => 6379,
        'prefix' => 'autodocs:',
    ];
    if (isset($j['redis']) && is_array($j['redis'])) {
        if (isset($j['redis']['host']) && is_string($j['redis']['host']) && $j['redis']['host'] !== '') {
            $redis['host'] = $j['redis']['host'];
        }
        if (isset($j['redis']['port'])) {
            $redis['port'] = (int) $j['redis']['port'];
        }
        if (isset($j['redis']['prefix']) && is_string($j['redis']['prefix'])) {
            $redis['prefix'] = $j['redis']['prefix'];
        }
    }
    // Override opcional via env (Docker entrypoint / compose)
    $envHost = getenv('AUTODOCS_DB_HOST');
    if (is_string($envHost) && $envHost !== '') {
        $db['host'] = $envHost;
    }
    $envPort = getenv('AUTODOCS_DB_PORT');
    if (is_string($envPort) && $envPort !== '') {
        $port = (int) $envPort;
    }
    $envName = getenv('AUTODOCS_DB_NAME');
    if (is_string($envName) && $envName !== '') {
        $db['name'] = $envName;
    }
    $envUser = getenv('AUTODOCS_DB_USER');
    if (is_string($envUser) && $envUser !== '') {
        $db['user'] = $envUser;
    }
    $envPass = getenv('AUTODOCS_DB_PASSWORD');
    if (is_string($envPass) && $envPass !== '') {
        $db['password'] = $envPass;
    }
    $envRedisHost = getenv('AUTODOCS_REDIS_HOST');
    if (is_string($envRedisHost) && $envRedisHost !== '') {
        $redis['host'] = $envRedisHost;
    }
    $envRedisPort = getenv('AUTODOCS_REDIS_PORT');
    if (is_string($envRedisPort) && $envRedisPort !== '') {
        $redis['port'] = (int) $envRedisPort;
    }
    $envRedisPrefix = getenv('AUTODOCS_REDIS_PREFIX');
    if (is_string($envRedisPrefix) && $envRedisPrefix !== '') {
        $redis['prefix'] = $envRedisPrefix;
    }
    return [
        'db' => [
            'host' => $db['host'],
            'port' => $port,
            'name' => $db['name'],
            'user' => $db['user'],
            'password' => $db['password'],
        ],
        'redis' => $redis,
        'session_cookie_secure' => !empty($j['session_cookie_secure']),
        'registration_open' => !empty($j['registration_open']),
    ];
}

require_once __DIR__ . '/redis-cache.php';

function autodocs_send_security_headers(): void
{
    static $sent = false;
    if ($sent) {
        return;
    }
    $sent = true;
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
}

function autodocs_json_response(int $code, array $body): void
{
    http_response_code($code);
    autodocs_send_security_headers();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Throttle de login (ficheiro em api/private/, não servido via HTTP).
 * @return null|string mensagem de erro se bloqueado
 */
function autodocs_login_throttle_check(string $ip, string $email): ?string
{
    $path = __DIR__ . '/private/login-throttle.json';
    $now = time();
    $window = 900; // 15 min
    $maxFails = 8;
    $data = ['entries' => []];
    if (is_readable($path)) {
        $raw = file_get_contents($path);
        $j = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($j) && isset($j['entries']) && is_array($j['entries'])) {
            $data = $j;
        }
    }
    $key = hash('sha256', strtolower($ip) . '|' . strtolower(trim($email)));
    $entries = [];
    foreach ($data['entries'] as $k => $row) {
        if (!is_array($row) || !isset($row['fails'], $row['until'])) {
            continue;
        }
        if ((int) $row['until'] < $now) {
            continue;
        }
        $entries[$k] = [
            'fails' => (int) $row['fails'],
            'until' => (int) $row['until'],
        ];
    }
    $data['entries'] = $entries;
    if (isset($entries[$key]) && $entries[$key]['fails'] >= $maxFails) {
        $mins = max(1, (int) ceil(($entries[$key]['until'] - $now) / 60));
        @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
        return 'Demasiadas tentativas. Aguarde cerca de ' . $mins . ' minuto(s) e tente novamente.';
    }
    @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
    return null;
}

function autodocs_login_throttle_fail(string $ip, string $email): void
{
    $path = __DIR__ . '/private/login-throttle.json';
    $now = time();
    $window = 900;
    $data = ['entries' => []];
    if (is_readable($path)) {
        $raw = file_get_contents($path);
        $j = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($j) && isset($j['entries']) && is_array($j['entries'])) {
            $data = $j;
        }
    }
    $key = hash('sha256', strtolower($ip) . '|' . strtolower(trim($email)));
    $entries = [];
    foreach ($data['entries'] as $k => $row) {
        if (!is_array($row) || !isset($row['fails'], $row['until'])) {
            continue;
        }
        if ((int) $row['until'] < $now) {
            continue;
        }
        $entries[$k] = [
            'fails' => (int) $row['fails'],
            'until' => (int) $row['until'],
        ];
    }
    $cur = $entries[$key] ?? ['fails' => 0, 'until' => $now + $window];
    $cur['fails'] = (int) $cur['fails'] + 1;
    $cur['until'] = $now + $window;
    $entries[$key] = $cur;
    $data['entries'] = $entries;
    @file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
}

function autodocs_login_throttle_clear(string $ip, string $email): void
{
    $path = __DIR__ . '/private/login-throttle.json';
    if (!is_readable($path)) {
        return;
    }
    $raw = file_get_contents($path);
    $j = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($j) || !isset($j['entries']) || !is_array($j['entries'])) {
        return;
    }
    $key = hash('sha256', strtolower($ip) . '|' . strtolower(trim($email)));
    unset($j['entries'][$key]);
    @file_put_contents($path, json_encode($j, JSON_PRETTY_PRINT), LOCK_EX);
}

function autodocs_client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return is_string($ip) && $ip !== '' ? $ip : '0.0.0.0';
}

function autodocs_install_lock_path(): string
{
    return __DIR__ . '/private/install.lock';
}

function autodocs_install_is_locked(): bool
{
    return is_file(autodocs_install_lock_path());
}

function autodocs_install_write_lock(): void
{
    @file_put_contents(autodocs_install_lock_path(), date('c') . "\n", LOCK_EX);
}

/** true se $real está dentro de $rootReal (com fronteira de diretório). */
function autodocs_path_is_inside(string $real, string $rootReal): bool
{
    if ($real === $rootReal) {
        return true;
    }
    $prefix = $rootReal . DIRECTORY_SEPARATOR;
    return str_starts_with($real, $prefix);
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
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $p['path'] ?? '/',
            'domain' => $p['domain'] ?? '',
            'secure' => !empty($p['secure']),
            'httponly' => !empty($p['httponly']),
            'samesite' => $p['samesite'] ?? 'Lax',
        ]);
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
        // consulta/ é hub autenticado (não faz parte do catálogo de emissão).
        return array_values(array_unique(array_merge(
            autodocs_catalog_doc_ids(),
            ['consulta'],
            autodocs_imported_doc_ids()
        )));
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
    $docs = autodocs_allowed_docs_from_user_tags($userTagIds, $tagsPayload['docLinks']);
    // Qualquer utilizador com pelo menos uma documentação também acede a consulta/.
    if ($docs !== []) {
        $docs[] = 'consulta';
    }
    return array_values(array_unique($docs));
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
    if (preg_match('#^documentos/importados/([a-z0-9][a-z0-9-]*)#', $rel, $m)) {
        return 'importado:' . $m[1];
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

/**
 * Slugs de documentos importados (Designer / Figma) em documentos/importados/.
 *
 * @return list<string>
 */
function autodocs_imported_doc_slugs(): array
{
    $root = AUTODOCS_ROOT . '/documentos/importados';
    if (!is_dir($root)) {
        return [];
    }
    $slugs = [];
    foreach (scandir($root) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..' || $entry === '.gitkeep') {
            continue;
        }
        $dir = $root . '/' . $entry;
        if (is_dir($dir) && is_file($dir . '/index.html')) {
            $slugs[] = $entry;
        }
    }
    sort($slugs);
    return $slugs;
}

/**
 * IDs lógicos dos documentos importados (prefixo importado:).
 *
 * @return list<string>
 */
function autodocs_imported_doc_ids(): array
{
    $ids = [];
    foreach (autodocs_imported_doc_slugs() as $slug) {
        $ids[] = 'importado:' . $slug;
    }
    return $ids;
}
