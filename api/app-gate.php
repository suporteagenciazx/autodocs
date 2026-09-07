<?php

declare(strict_types=1);

/**
 * Serve páginas HTML do hub (não documentos/) após validar sessão e, se admin-only, role.
 * Chamado via rewrite na raiz: ?rel=usuarios/index.html | documentacoes/ | …
 */

require __DIR__ . '/bootstrap.php';

function autodocs_app_gate_mime(string $path): string
{
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $map = [
        'html' => 'text/html; charset=utf-8',
        'htm' => 'text/html; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'js' => 'application/javascript; charset=utf-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'ico' => 'image/x-icon',
        'woff2' => 'font/woff2',
        'woff' => 'font/woff',
    ];
    return $map[$ext] ?? 'application/octet-stream';
}

function autodocs_app_gate_redirect_login(): void
{
    $script = isset($_SERVER['SCRIPT_NAME']) ? str_replace('\\', '/', (string) $_SERVER['SCRIPT_NAME']) : '';
    $apiDir = dirname($script);
    $base = rtrim(dirname($apiDir), '/') . '/';
    if ($base === '//') {
        $base = '/';
    }
    $return = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '';
    $q = $return !== '' ? ('?returnUrl=' . rawurlencode($return)) : '';
    header('Location: ' . $base . 'login/' . $q, true, 302);
    exit;
}

/** @return list<string> */
function autodocs_app_admin_prefixes(): array
{
    return ['usuarios', 'tags', 'configuracoes', 'seguranca', 'designer', 'integracoes'];
}

/** @return list<string> */
function autodocs_app_auth_prefixes(): array
{
    return [
        'documentacoes',
        'perfil',
        'integracoes',
        'suporte',
        'ajuda',
        'usuarios',
        'tags',
        'configuracoes',
        'seguranca',
        'designer',
    ];
}

$rel = isset($_GET['rel']) ? (string) $_GET['rel'] : '';
$rel = str_replace('\\', '/', $rel);
$rel = trim($rel, '/');
if ($rel === '' || str_contains($rel, '..')) {
    http_response_code(400);
    echo 'Pedido inválido.';
    exit;
}

// index.html na raiz
if ($rel === 'index.html' || $rel === 'index.htm') {
    $first = 'index';
} else {
    $first = explode('/', $rel, 2)[0];
}

$needsAuth = $rel === 'index.html' || $rel === 'index.htm' || in_array($first, autodocs_app_auth_prefixes(), true);
$needsAdmin = in_array($first, autodocs_app_admin_prefixes(), true);

if (!$needsAuth) {
    http_response_code(403);
    echo 'Caminho não permitido neste gate.';
    exit;
}

try {
    autodocs_load_config();
    $pdo = autodocs_pdo();
} catch (Throwable $e) {
    http_response_code(503);
    echo 'Serviço indisponível.';
    exit;
}

autodocs_start_session();
$uid = autodocs_session_user_id();
if ($uid === null) {
    autodocs_app_gate_redirect_login();
}

$user = autodocs_user_by_id($pdo, $uid);
if (!$user || !(int) $user['active']) {
    autodocs_app_gate_redirect_login();
}

if ($needsAdmin && ($user['role'] ?? '') !== 'admin') {
    $script = isset($_SERVER['SCRIPT_NAME']) ? str_replace('\\', '/', (string) $_SERVER['SCRIPT_NAME']) : '';
    $base = rtrim(dirname(dirname($script)), '/') . '/';
    if ($base === '//') {
        $base = '/';
    }
    header('Location: ' . $base . 'documentacoes/', true, 302);
    exit;
}

if (autodocs_idle_lock_enabled() && !autodocs_session_pin_ok()) {
    // Permite carregar o HTML do shell para o overlay de PIN; assets já públicos.
    // Documentos continuam bloqueados no static-gate.
}

$full = AUTODOCS_ROOT . '/' . $rel;
$real = realpath($full);
$rootReal = realpath(AUTODOCS_ROOT);
if ($real === false || $rootReal === false || !autodocs_path_is_inside($real, $rootReal)) {
    http_response_code(404);
    echo 'Página não encontrada.';
    exit;
}

// /usuarios/ → diretório: servir index.html (igual ao static-gate)
if (is_dir($real)) {
    $idx = $real . DIRECTORY_SEPARATOR . 'index.html';
    if (is_file($idx)) {
        $real = $idx;
    } else {
        http_response_code(404);
        echo 'Página não encontrada.';
        exit;
    }
}

if (!is_file($real)) {
    http_response_code(404);
    echo 'Página não encontrada.';
    exit;
}

autodocs_send_security_headers();
header('Content-Type: ' . autodocs_app_gate_mime($real));
header('Cache-Control: private, no-cache, must-revalidate');
readfile($real);
