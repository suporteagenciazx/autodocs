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
        'aprovacao-daycoval',
        'contrato-daycoval',
        'comprovante-daycoval',
        'termo-daycoval',
        'declaracao-daycoval',
        'ordem-daycoval',
        'garantia-daycoval',
        'tela-aprovacao-daycoval',
        'magnus-laudo',
        'trust-laudo',
        'cortez-laudo',
        'villela-laudo',
        'valuation-aguia',
        'orcamento-aguia',
        'orcamento-magnus',
        'orcamento-trust',
        'orcamento-cortez',
        'orcamento-villela',
        'lae-dvego',
        'lae-dvego-magnus',
        'lae-dvego-trust',
        'lae-dvego-cortez',
        'lae-dvego-villela',
        'nfe-magnus',
        'nfe-trust',
        'nfe-cortez',
        'nfe-villela',
        'nfe-aguia',
        'recibo-magnus',
        'recibo-trust',
        'recibo-cortez',
        'recibo-villela',
        'recibo-aguia',
        'tela-aprovacao',
        'tela-auditoria-fiscal',
        'score-business',
        'termo-conformidade-financeira',
        'varredura-expansao',
        'cce-bacen',
        'cdl-bacen',
        'cce-aguia',
        'cce-magnus',
        'cce-trust',
        'cce-cortez',
        'cce-villela',
        'eve-aguia',
        'eve-magnus',
        'eve-trust',
        'eve-cortez',
        'eve-villela',
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
    $secure = !empty($j['session_cookie_secure']);
    $envSecure = getenv('AUTODOCS_SESSION_COOKIE_SECURE');
    if (is_string($envSecure) && $envSecure !== '') {
        $secure = in_array(strtolower($envSecure), ['1', 'true', 'yes'], true);
    }
    $regOpen = !empty($j['registration_open']);
    $envReg = getenv('AUTODOCS_REGISTRATION_OPEN');
    if (is_string($envReg) && $envReg !== '') {
        $regOpen = in_array(strtolower($envReg), ['1', 'true', 'yes'], true);
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
        'session_cookie_secure' => $secure,
        'registration_open' => $regOpen,
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
    // Report-Only: observa violações sem bloquear (ajuste fino pós go-live).
    header(
        "Content-Security-Policy-Report-Only: default-src 'self'; " .
        "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " .
        "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.opencnpj.org; " .
        "frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
    );
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

function autodocs_session_pin_ok(): bool
{
    autodocs_start_session();
    return !empty($_SESSION['pin_ok']);
}

function autodocs_session_set_pin_ok(bool $ok): void
{
    autodocs_start_session();
    if ($ok) {
        $_SESSION['pin_ok'] = 1;
    } else {
        unset($_SESSION['pin_ok']);
    }
}

/**
 * @return array{idleLockEnabled: bool, idleMinutes: int}
 */
function autodocs_security_settings(): array
{
    $defaults = [
        'idleLockEnabled' => true,
        'idleMinutes' => 15,
    ];
    $path = __DIR__ . '/private/security.json';
    if (!is_readable($path)) {
        return $defaults;
    }
    $raw = file_get_contents($path);
    $j = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($j)) {
        return $defaults;
    }
    $out = $defaults;
    if (array_key_exists('idleLockEnabled', $j)) {
        $out['idleLockEnabled'] = (bool) $j['idleLockEnabled'];
    }
    if (isset($j['idleMinutes'])) {
        $m = (int) $j['idleMinutes'];
        if ($m >= 1 && $m <= 240) {
            $out['idleMinutes'] = $m;
        }
    }
    return $out;
}

/**
 * Idle lock ativo + sessão sem pin_ok ⇒ LOCKED (API / gate).
 */
function autodocs_idle_lock_enabled(): bool
{
    return (bool) autodocs_security_settings()['idleLockEnabled'];
}

function autodocs_idle_minutes(): int
{
    return (int) autodocs_security_settings()['idleMinutes'];
}

function autodocs_session_last_active_at(): int
{
    autodocs_start_session();
    $n = isset($_SESSION['last_active_at']) ? (int) $_SESSION['last_active_at'] : 0;
    return $n > 0 ? $n : 0;
}

/** Marca atividade do utilizador (heartbeat / login / unlock). */
function autodocs_session_touch_activity(?int $ts = null): void
{
    autodocs_start_session();
    $_SESSION['last_active_at'] = $ts ?? time();
}

/**
 * Se o idle expirou, limpa pin_ok.
 *
 * @return bool true se a sessão está (ou ficou) bloqueada por idle
 */
function autodocs_idle_enforce(): bool
{
    if (!autodocs_idle_lock_enabled()) {
        return false;
    }
    autodocs_start_session();
    if (empty($_SESSION['uid'])) {
        return false;
    }
    if (!autodocs_session_pin_ok()) {
        return true;
    }
    $last = autodocs_session_last_active_at();
    if ($last <= 0) {
        // Sessão antiga sem timestamp: inicia contagem sem bloquear já.
        autodocs_session_touch_activity();
        return false;
    }
    $limit = autodocs_idle_minutes() * 60;
    if ((time() - $last) >= $limit) {
        autodocs_session_set_pin_ok(false);
        return true;
    }
    return false;
}

function autodocs_require_unlocked(PDO $pdo): array
{
    $user = autodocs_require_login($pdo);
    if (autodocs_idle_lock_enabled()) {
        autodocs_idle_enforce();
        if (!autodocs_session_pin_ok()) {
            throw new RuntimeException('LOCKED');
        }
    }
    return $user;
}

function autodocs_require_admin(PDO $pdo): array
{
    $user = autodocs_require_unlocked($pdo);
    if (($user['role'] ?? '') !== 'admin') {
        throw new RuntimeException('FORBIDDEN');
    }
    return $user;
}

function autodocs_csrf_token(): string
{
    autodocs_start_session();
    if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function autodocs_require_csrf(): void
{
    autodocs_start_session();
    $hdr = isset($_SERVER['HTTP_X_AUTODOCS_CSRF']) ? (string) $_SERVER['HTTP_X_AUTODOCS_CSRF'] : '';
    $tok = isset($_SESSION['csrf']) && is_string($_SESSION['csrf']) ? $_SESSION['csrf'] : '';
    if ($tok === '' || $hdr === '' || !hash_equals($tok, $hdr)) {
        throw new RuntimeException('CSRF');
    }
}

function autodocs_json_auth_error(Throwable $e): void
{
    $msg = $e->getMessage();
    if ($msg === 'UNAUTHORIZED') {
        autodocs_json_response(401, ['error' => 'Não autenticado.']);
    }
    if ($msg === 'FORBIDDEN') {
        autodocs_json_response(403, ['error' => 'Sem permissão.']);
    }
    if ($msg === 'LOCKED') {
        autodocs_json_response(423, ['error' => 'Sessão bloqueada. Introduza o PIN.', 'locked' => true]);
    }
    if ($msg === 'CSRF') {
        autodocs_json_response(403, ['error' => 'Token CSRF inválido ou em falta.']);
    }
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
