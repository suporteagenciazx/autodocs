<?php

declare(strict_types=1);

/**
 * Serve ficheiros sob documentos/ ou consulta/ após validar sessão e permissão por documentação.
 * Chamado via mod_rewrite (.htaccess) com ?rel=caminho/relativo/à/raiz/do/site
 */

require __DIR__ . '/bootstrap.php';

function autodocs_gate_mime(string $path): string
{
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $map = [
        'html' => 'text/html; charset=utf-8',
        'htm' => 'text/html; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'js' => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'map' => 'application/json',
        'txt' => 'text/plain; charset=utf-8',
    ];
    return $map[$ext] ?? 'application/octet-stream';
}

function autodocs_gate_redirect_login(): void
{
    $script = isset($_SERVER['SCRIPT_NAME']) ? str_replace('\\', '/', (string) $_SERVER['SCRIPT_NAME']) : '';
    // .../api/static-gate.php -> base do site = dirname(api)
    $apiDir = dirname($script);
    $base = rtrim(dirname($apiDir), '/') . '/';
    if ($base === '//') {
        $base = '/';
    }
    $login = $base . 'login/';
    $return = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '';
    $q = $return !== '' ? ('?returnUrl=' . rawurlencode($return)) : '';
    header('Location: ' . $login . $q, true, 302);
    exit;
}

$rel = isset($_GET['rel']) ? (string) $_GET['rel'] : '';
$rel = str_replace('\\', '/', $rel);
$rel = trim($rel, '/');
if ($rel === '' || str_contains($rel, '..')) {
    http_response_code(400);
    echo 'Pedido inválido.';
    exit;
}

try {
    autodocs_load_config();
    $pdo = autodocs_pdo();
} catch (Throwable $e) {
    http_response_code(503);
    echo 'Serviço indisponível (configuração da base de dados).';
    exit;
}

autodocs_start_session();
$uid = autodocs_session_user_id();
if ($uid === null) {
    autodocs_gate_redirect_login();
}

$user = autodocs_user_by_id($pdo, $uid);
if (!$user || !(int) $user['active']) {
    autodocs_gate_redirect_login();
}

$docId = autodocs_path_to_catalog_doc_id($rel);
if ($docId === null) {
    http_response_code(403);
    echo 'Acesso negado a este caminho.';
    exit;
}

$allowed = autodocs_allowed_doc_ids($pdo, $user);
if (!in_array($docId, $allowed, true)) {
    http_response_code(403);
    echo 'Não tem permissão para esta documentação.';
    exit;
}

$full = AUTODOCS_ROOT . '/' . $rel;
$real = realpath($full);
$rootReal = realpath(AUTODOCS_ROOT);
if ($real === false || $rootReal === false || !autodocs_path_is_inside($real, $rootReal)) {
    http_response_code(404);
    echo 'Ficheiro não encontrado.';
    exit;
}

if (is_dir($real)) {
    $idx = $real . DIRECTORY_SEPARATOR . 'index.html';
    if (is_file($idx)) {
        $real = $idx;
    } else {
        http_response_code(403);
        echo 'Listagem de diretório não permitida.';
        exit;
    }
}

if (!is_file($real)) {
    http_response_code(404);
    echo 'Ficheiro não encontrado.';
    exit;
}

autodocs_send_security_headers();
header('Content-Type: ' . autodocs_gate_mime($real));

/**
 * Texto (html/css/js) revalida sempre; binários podem ficar em cache.
 * Sem revalidação, alterações a estilos/scripts só apareciam no navegador
 * depois de limpar a cache manualmente.
 */
$ext = strtolower(pathinfo($real, PATHINFO_EXTENSION));
$revalidate = in_array($ext, ['html', 'htm', 'css', 'js', 'mjs', 'json', 'svg', 'txt', 'map'], true);

$mtime = @filemtime($real);
$size = @filesize($real);
$etag = ($mtime !== false && $size !== false)
    ? '"' . dechex($mtime) . '-' . dechex($size) . '"'
    : null;

if ($etag !== null) {
    header('ETag: ' . $etag);
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', (int) $mtime) . ' GMT');
}

header($revalidate
    ? 'Cache-Control: private, no-cache, must-revalidate'
    : 'Cache-Control: private, max-age=2592000');

$ifNoneMatch = isset($_SERVER['HTTP_IF_NONE_MATCH']) ? trim((string) $_SERVER['HTTP_IF_NONE_MATCH']) : '';
$ifModifiedSince = isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) ? strtotime((string) $_SERVER['HTTP_IF_MODIFIED_SINCE']) : false;

$etagMatches = $etag !== null && $ifNoneMatch !== '' && str_contains($ifNoneMatch, $etag);
$notModifiedSince = $mtime !== false && $ifModifiedSince !== false && $ifModifiedSince >= $mtime;

if ($etagMatches || (!$etagMatches && $ifNoneMatch === '' && $notModifiedSince)) {
    http_response_code(304);
    exit;
}

readfile($real);
