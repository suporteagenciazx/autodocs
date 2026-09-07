<?php

declare(strict_types=1);

const AUTODOCS_SECURITY_FILE = __DIR__ . '/private/security.json';

require_once __DIR__ . '/bootstrap.php';

/**
 * @return array{idleLockEnabled: bool, idleMinutes: int}
 */
function autodocs_security_defaults(): array
{
    return [
        'idleLockEnabled' => true,
        'idleMinutes' => 15,
    ];
}

/**
 * @return array{idleLockEnabled: bool, idleMinutes: int}
 */
function autodocs_security_load_merged(): array
{
    $defaults = autodocs_security_defaults();
    if (!is_readable(AUTODOCS_SECURITY_FILE)) {
        return $defaults;
    }
    $raw = file_get_contents(AUTODOCS_SECURITY_FILE);
    if ($raw === false) {
        return $defaults;
    }
    $j = json_decode($raw, true);
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

function autodocs_security_save(array $data): void
{
    $dir = dirname(AUTODOCS_SECURITY_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
    }
    $payload = [
        'idleLockEnabled' => !empty($data['idleLockEnabled']),
        'idleMinutes' => max(1, min(240, (int) ($data['idleMinutes'] ?? 1))),
    ];
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Falha ao serializar security.json.');
    }
    if (file_put_contents(AUTODOCS_SECURITY_FILE, $json . "\n", LOCK_EX) === false) {
        throw new RuntimeException('Não foi possível gravar security.json.');
    }
}

autodocs_send_security_headers();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // Qualquer sessão autenticada pode ler (idle lock no shell)
    try {
        autodocs_load_config();
        $pdo = autodocs_pdo();
        autodocs_require_login($pdo);
    } catch (Throwable $e) {
        // Permite defaults sem sessão em login público? Não — idle só com login.
        // Em login page não precisa. Se não autenticado, devolve defaults sem segredo.
        if ($e->getMessage() === 'UNAUTHORIZED') {
            autodocs_json_response(200, autodocs_security_defaults());
            exit;
        }
    }
    autodocs_json_response(200, autodocs_security_load_merged());
    exit;
}

if ($method === 'POST') {
    try {
        autodocs_load_config();
        $pdo = autodocs_pdo();
        autodocs_require_admin($pdo);
        autodocs_require_csrf();
    } catch (Throwable $e) {
        autodocs_json_auth_error($e);
        autodocs_json_response(500, ['error' => 'Erro no servidor.']);
        exit;
    }
    $body = autodocs_read_json_body();
    $next = autodocs_security_load_merged();
    if (array_key_exists('idleLockEnabled', $body)) {
        $next['idleLockEnabled'] = (bool) $body['idleLockEnabled'];
    }
    if (isset($body['idleMinutes'])) {
        $m = (int) $body['idleMinutes'];
        if ($m < 1 || $m > 240) {
            autodocs_json_response(400, ['error' => 'idleMinutes deve ser entre 1 e 240.']);
            exit;
        }
        $next['idleMinutes'] = $m;
    }
    try {
        autodocs_security_save($next);
    } catch (Throwable $e) {
        autodocs_json_response(500, ['error' => $e->getMessage()]);
        exit;
    }
    autodocs_json_response(200, $next);
    exit;
}

autodocs_json_response(405, ['error' => 'Método não permitido']);
