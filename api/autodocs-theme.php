<?php

declare(strict_types=1);

const AUTODOCS_THEME_FILE = __DIR__ . '/private/theme.json';

// Bootstrap: cache Redis + auth no POST (GET público; cache ignora se Redis/config falhar)
if (is_readable(__DIR__ . '/bootstrap.php')) {
    require_once __DIR__ . '/bootstrap.php';
}

/**
 * @return array{logo: string, favicon: string, corDestaque: string, corAccent: string}
 */
function autodocs_theme_defaults(): array
{
    return [
        'logo' => 'sistema/logo-horizontal.svg',
        'favicon' => 'sistema/favicon.svg',
        'corDestaque' => '#eef1ee',
        'corAccent' => '#025aa4',
    ];
}

function autodocs_theme_normalize_path(?string $s): string
{
    if ($s === null || $s === '') {
        return '';
    }
    $t = str_replace('\\', '/', trim($s));
    if (str_starts_with($t, './')) {
        $t = substr($t, 2);
    }
    if ($t === '' || str_contains($t, '..')) {
        return '';
    }
    if (!preg_match('#^[a-zA-Z0-9_./-]+$#', $t)) {
        return '';
    }
    return $t;
}

function autodocs_theme_valid_hex(?string $v): bool
{
    if ($v === null || $v === '') {
        return false;
    }
    $t = trim($v);
    return (bool) preg_match('/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/', $t);
}

/**
 * @return array{logo: string, favicon: string, corDestaque: string, corAccent: string}
 */
function autodocs_theme_load_merged(): array
{
    $defaults = autodocs_theme_defaults();
    $cacheKey = 'cache:theme';

    if (function_exists('autodocs_cache_get')) {
        $cached = autodocs_cache_get($cacheKey);
        if (is_string($cached) && $cached !== '') {
            $j = json_decode($cached, true);
            if (is_array($j)) {
                $out = $defaults;
                foreach (['logo', 'favicon', 'corDestaque', 'corAccent'] as $k) {
                    if (!isset($j[$k]) || !is_string($j[$k])) {
                        continue;
                    }
                    if ($k === 'logo' || $k === 'favicon') {
                        $p = autodocs_theme_normalize_path($j[$k]);
                        if ($p !== '') {
                            $out[$k] = $p;
                        }
                    } elseif (autodocs_theme_valid_hex($j[$k])) {
                        $out[$k] = trim($j[$k]);
                    }
                }
                return $out;
            }
        }
    }

    if (!is_readable(AUTODOCS_THEME_FILE)) {
        return $defaults;
    }
    $raw = file_get_contents(AUTODOCS_THEME_FILE);
    if ($raw === false || $raw === '') {
        return $defaults;
    }
    $j = json_decode($raw, true);
    if (!is_array($j)) {
        return $defaults;
    }
    $out = $defaults;
    foreach (['logo', 'favicon', 'corDestaque', 'corAccent'] as $k) {
        if (!isset($j[$k]) || !is_string($j[$k])) {
            continue;
        }
        if ($k === 'logo' || $k === 'favicon') {
            $p = autodocs_theme_normalize_path($j[$k]);
            if ($p !== '') {
                $out[$k] = $p;
            }
        } elseif (autodocs_theme_valid_hex($j[$k])) {
            $out[$k] = trim($j[$k]);
        }
    }
    if (function_exists('autodocs_cache_set')) {
        autodocs_cache_set($cacheKey, json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 300);
    }
    return $out;
}

function autodocs_theme_cache_invalidate(): void
{
    if (function_exists('autodocs_cache_delete')) {
        autodocs_cache_delete('cache:theme');
    }
}

header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(autodocs_theme_load_merged(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/bootstrap.php';

try {
    $pdo = autodocs_pdo();
    autodocs_require_admin($pdo);
    autodocs_require_csrf();
} catch (Throwable $e) {
    autodocs_json_auth_error($e);
    if ($e instanceof RuntimeException && str_contains($e->getMessage(), 'config')) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Erro no servidor.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$body = autodocs_read_json_body();
$logo = autodocs_theme_normalize_path(isset($body['logo']) ? (string) $body['logo'] : '');
$fav = autodocs_theme_normalize_path(isset($body['favicon']) ? (string) $body['favicon'] : '');
$cd = isset($body['corDestaque']) ? trim((string) $body['corDestaque']) : '';
$ca = isset($body['corAccent']) ? trim((string) $body['corAccent']) : '';

if ($logo === '') {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Caminho do logo inválido.'], JSON_UNESCAPED_UNICODE);
    exit;
}
if ($fav === '') {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Caminho do favicon inválido.'], JSON_UNESCAPED_UNICODE);
    exit;
}
if (!autodocs_theme_valid_hex($cd)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Cor de destaque inválida (use hexadecimal, ex.: #eef1ee).'], JSON_UNESCAPED_UNICODE);
    exit;
}
if (!autodocs_theme_valid_hex($ca)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Cor de ênfase inválida (use hexadecimal, ex.: #025aa4).'], JSON_UNESCAPED_UNICODE);
    exit;
}

$save = [
    'logo' => $logo,
    'favicon' => $fav,
    'corDestaque' => $cd,
    'corAccent' => $ca,
];

$json = json_encode($save, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
if (@file_put_contents(AUTODOCS_THEME_FILE, $json, LOCK_EX) === false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Não foi possível gravar api/private/theme.json (permissões?).'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (function_exists('autodocs_theme_cache_invalidate')) {
    autodocs_theme_cache_invalidate();
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'theme' => $save], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
