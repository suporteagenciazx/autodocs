<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/user-tag-links-lib.php';

header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    autodocs_json_response(405, ['error' => 'Método não permitido']);
    exit;
}

try {
    autodocs_load_config();
    $pdo = autodocs_pdo();
    autodocs_require_admin($pdo);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if ($msg === 'UNAUTHORIZED') {
        autodocs_json_response(401, ['error' => 'Não autenticado.']);
        exit;
    }
    if ($msg === 'FORBIDDEN') {
        autodocs_json_response(403, ['error' => 'Apenas administradores.']);
        exit;
    }
    if ($e instanceof RuntimeException && str_contains($msg, 'config')) {
        autodocs_json_response(503, ['error' => $msg]);
        exit;
    }
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
    exit;
}

/**
 * @param array<string, string> $docLinks
 * @return array<string, list<string>>
 */
function autodocs_docs_grouped_by_tag(array $docLinks): array
{
    $grouped = [];
    foreach (autodocs_catalog_doc_ids() as $docId) {
        $tagId = isset($docLinks[$docId]) ? (string) $docLinks[$docId] : '';
        if ($tagId === '') {
            continue;
        }
        if (!isset($grouped[$tagId])) {
            $grouped[$tagId] = [];
        }
        $grouped[$tagId][] = $docId;
    }
    return $grouped;
}

$body = autodocs_read_json_body();
$action = isset($body['action']) ? (string) $body['action'] : '';

switch ($action) {
    case 'get':
        $userId = isset($body['userId']) ? (int) $body['userId'] : 0;
        if ($userId <= 0) {
            autodocs_json_response(400, ['error' => 'userId inválido.']);
            exit;
        }
        $user = autodocs_user_by_id($pdo, $userId);
        if (!$user) {
            autodocs_json_response(404, ['error' => 'Utilizador não encontrado.']);
            exit;
        }
        require_once __DIR__ . '/autodocs-tags-lib.php';
        $tagsPayload = autodocs_tags_load_merged();
        $docLinks = $tagsPayload['docLinks'];
        autodocs_json_response(200, [
            'userId' => $userId,
            'email' => (string) $user['email'],
            'tagIds' => autodocs_user_tag_ids_for($userId),
            'tags' => $tagsPayload['tags'],
            'docLinks' => $docLinks,
            'docsByTag' => autodocs_docs_grouped_by_tag($docLinks),
            'usoGeralTagId' => AUTODOCS_USO_GERAL_TAG_ID,
            'catalogIds' => autodocs_catalog_doc_ids(),
        ]);
        break;

    case 'linkTag':
        $userId = isset($body['userId']) ? (int) $body['userId'] : 0;
        $tagId = isset($body['tagId']) ? trim((string) $body['tagId']) : '';
        if ($userId <= 0 || $tagId === '') {
            autodocs_json_response(400, ['error' => 'Parâmetros inválidos.']);
            exit;
        }
        if (!autodocs_user_by_id($pdo, $userId)) {
            autodocs_json_response(404, ['error' => 'Utilizador não encontrado.']);
            exit;
        }
        require_once __DIR__ . '/autodocs-tags-lib.php';
        if (!isset(autodocs_tags_valid_ids_map()[$tagId])) {
            autodocs_json_response(400, ['error' => 'Tag inválida.']);
            exit;
        }
        if (!autodocs_user_tag_links_link($userId, $tagId)) {
            autodocs_json_response(500, ['error' => 'Não foi possível gravar vínculo.']);
            exit;
        }
        autodocs_user_tag_links_clear_legacy_batches($pdo, $userId);
        autodocs_json_response(200, [
            'ok' => true,
            'tagIds' => autodocs_user_tag_ids_for($userId),
        ]);
        break;

    case 'unlinkTag':
        $userId = isset($body['userId']) ? (int) $body['userId'] : 0;
        $tagId = isset($body['tagId']) ? trim((string) $body['tagId']) : '';
        if ($userId <= 0 || $tagId === '') {
            autodocs_json_response(400, ['error' => 'Parâmetros inválidos.']);
            exit;
        }
        if (!autodocs_user_tag_links_unlink($userId, $tagId)) {
            autodocs_json_response(500, ['error' => 'Não foi possível gravar.']);
            exit;
        }
        autodocs_json_response(200, [
            'ok' => true,
            'tagIds' => autodocs_user_tag_ids_for($userId),
        ]);
        break;

    default:
        autodocs_json_response(400, ['error' => 'action inválida. Use get, linkTag ou unlinkTag.']);
}
