<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

autodocs_send_security_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    autodocs_json_response(405, ['error' => 'Método não permitido.']);
}

try {
    $pdo = autodocs_pdo();
    autodocs_require_admin($pdo);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if ($msg === 'UNAUTHORIZED') {
        autodocs_json_response(401, ['error' => 'Não autenticado.']);
    }
    if ($msg === 'FORBIDDEN') {
        autodocs_json_response(403, ['error' => 'Apenas administradores.']);
    }
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
}

$body = autodocs_read_json_body();
$href = isset($body['href']) ? trim((string) $body['href']) : '';
$slug = isset($body['slug']) ? trim((string) $body['slug']) : '';

if ($slug === '' && $href !== '') {
    if (preg_match('#documentos/importados/([a-z0-9][a-z0-9-]*)/?#i', $href, $m)) {
        $slug = strtolower($m[1]);
    }
}

if ($slug === '' || !preg_match('/^[a-z0-9][a-z0-9-]{0,63}$/', $slug)) {
    autodocs_json_response(400, ['error' => 'Slug inválido. Só documentos importados podem ser eliminados.']);
}

$dir = AUTODOCS_ROOT . '/documentos/importados/' . $slug;
$rootImport = realpath(AUTODOCS_ROOT . '/documentos/importados');
$real = realpath($dir);

if ($rootImport === false || $real === false || !is_dir($real)) {
    autodocs_json_response(404, ['error' => 'Pasta do documento não encontrada.']);
}

if (!str_starts_with($real, $rootImport . DIRECTORY_SEPARATOR) && $real !== $rootImport) {
    autodocs_json_response(403, ['error' => 'Caminho não permitido.']);
}

/**
 * Remove diretório recursivamente.
 */
function autodocs_rrmdir(string $path): bool
{
    if (!is_dir($path)) {
        return false;
    }
    $items = scandir($path);
    if ($items === false) {
        return false;
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $full = $path . DIRECTORY_SEPARATOR . $item;
        if (is_dir($full)) {
            if (!autodocs_rrmdir($full)) {
                return false;
            }
        } elseif (!@unlink($full)) {
            return false;
        }
    }
    return @rmdir($path);
}

if (!autodocs_rrmdir($real)) {
    autodocs_json_response(500, ['error' => 'Não foi possível eliminar os ficheiros do documento.']);
}

autodocs_json_response(200, [
    'ok' => true,
    'slug' => $slug,
]);
