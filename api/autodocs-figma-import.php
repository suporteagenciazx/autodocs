<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/autodocs-figma-lib.php';

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
$action = isset($body['action']) ? trim((string) $body['action']) : 'import';
$url = isset($body['figmaUrl']) ? trim((string) $body['figmaUrl']) : '';
$title = isset($body['title']) ? trim((string) $body['title']) : '';
$tagId = isset($body['tagId']) ? trim((string) $body['tagId']) : '';
$pageIds = null;
if (isset($body['pageIds']) && is_array($body['pageIds'])) {
    $pageIds = [];
    foreach ($body['pageIds'] as $pid) {
        if (is_string($pid) && $pid !== '') {
            $pageIds[] = $pid;
        }
    }
}

if ($url === '') {
    autodocs_json_response(400, ['error' => 'Informe o link do Figma com o node-id da página ou frame.']);
}

try {
    if ($action === 'preview') {
        $preview = autodocs_figma_preview($url);
        autodocs_json_response(200, [
            'ok' => true,
            'action' => 'preview',
            'title' => $preview['title'],
            'fileKey' => $preview['fileKey'],
            'nodeId' => $preview['nodeId'],
            'pages' => $preview['pages'],
        ]);
    }

    $result = autodocs_figma_import_to_document(
        $url,
        $title !== '' ? $title : null,
        $tagId !== '' ? $tagId : null,
        $pageIds
    );
    autodocs_json_response(200, [
        'ok' => true,
        'action' => 'import',
        'slug' => $result['slug'],
        'href' => $result['href'],
        'title' => $result['title'],
        'fieldsCount' => $result['fieldsCount'],
        'pagesCount' => $result['pagesCount'],
        'model' => $result['model'],
    ]);
} catch (AutodocsFigmaRateLimitException $e) {
    autodocs_json_response(429, $e->toClientPayload());
} catch (InvalidArgumentException $e) {
    autodocs_json_response(400, ['error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    autodocs_json_response(422, ['error' => $e->getMessage()]);
} catch (Throwable $e) {
    autodocs_json_response(500, ['error' => 'Falha ao importar do Figma.']);
}
