<?php

declare(strict_types=1);

const AUTODOCS_TAGS_FILE = __DIR__ . '/private/tags.json';

/**
 * @return list<string>
 */
function autodocs_tags_catalog_doc_ids(): array
{
    return [
        'consulta',
        'aprovacao',
        'contrato',
        'comprovante',
        'termo',
        'declaracao',
        'ordem',
        'garantia',
    ];
}

/**
 * @return array{tags: list<array{id: string, name: string, accentColor?: string, createdAt?: int}>, docLinks: array<string, string>}
 */
function autodocs_tags_defaults(): array
{
    $tagId = 'tag-sofisa';
    $links = [];
    foreach (autodocs_tags_catalog_doc_ids() as $docId) {
        $links[$docId] = $tagId;
    }

    return [
        'tags' => [
            [
                'id' => $tagId,
                'name' => 'Sofisa',
                'accentColor' => '#006157',
            ],
        ],
        'docLinks' => $links,
    ];
}

function autodocs_tags_valid_hex(?string $v): bool
{
    if ($v === null || $v === '') {
        return false;
    }
    $t = trim($v);
    return (bool) preg_match('/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/', $t);
}

function autodocs_tags_normalize_hex(?string $v): string
{
    if ($v === null || $v === '') {
        return '';
    }
    $t = trim($v);
    if (!autodocs_tags_valid_hex($t)) {
        return '';
    }
    if (preg_match('/^#[0-9A-Fa-f]{3}$/', $t)) {
        $r = $t[1];
        $g = $t[2];
        $b = $t[3];
        return '#' . $r . $r . $g . $g . $b . $b;
    }
    return $t;
}

/**
 * @param mixed $raw
 * @return array{tags: list<array{id: string, name: string, accentColor: string, createdAt?: int}>, docLinks: array<string, string>}
 */
function autodocs_tags_sanitize_payload($raw): array
{
    $defaults = autodocs_tags_defaults();
    if (!is_array($raw)) {
        return $defaults;
    }

    $allowedDocIds = autodocs_tags_catalog_doc_ids();
    $tagsOut = [];
    $seenTagIds = [];

    if (isset($raw['tags']) && is_array($raw['tags'])) {
        foreach ($raw['tags'] as $t) {
            if (!is_array($t)) {
                continue;
            }
            $id = isset($t['id']) ? trim((string) $t['id']) : '';
            $name = isset($t['name']) ? trim((string) $t['name']) : '';
            if ($id === '' || $name === '' || !preg_match('/^tag-[a-zA-Z0-9_-]+$/', $id)) {
                continue;
            }
            if (isset($seenTagIds[$id])) {
                continue;
            }
            $seenTagIds[$id] = true;
            $accent = autodocs_tags_normalize_hex(isset($t['accentColor']) ? (string) $t['accentColor'] : '');
            if ($accent === '') {
                $accent = autodocs_tags_normalize_hex($defaults['tags'][0]['accentColor']) ?: '#006157';
            }
            $row = [
                'id' => $id,
                'name' => mb_substr($name, 0, 80),
                'accentColor' => $accent,
            ];
            if (isset($t['createdAt']) && is_numeric($t['createdAt'])) {
                $row['createdAt'] = (int) $t['createdAt'];
            }
            $tagsOut[] = $row;
        }
    }

    if ($tagsOut === []) {
        $tagsOut = $defaults['tags'];
        $seenTagIds = [$tagsOut[0]['id'] => true];
    }

    $defaultTagId = $tagsOut[0]['id'];
    $linksOut = [];
    foreach ($allowedDocIds as $docId) {
        $linksOut[$docId] = $defaultTagId;
    }

    if (isset($raw['docLinks']) && is_array($raw['docLinks'])) {
        foreach ($raw['docLinks'] as $docId => $tagId) {
            $docId = (string) $docId;
            $tagId = trim((string) $tagId);
            if (!in_array($docId, $allowedDocIds, true)) {
                continue;
            }
            if ($tagId !== '' && isset($seenTagIds[$tagId])) {
                $linksOut[$docId] = $tagId;
            }
        }
    }

    return ['tags' => $tagsOut, 'docLinks' => $linksOut];
}

/**
 * @return array{tags: list<array{id: string, name: string, accentColor: string, createdAt?: int}>, docLinks: array<string, string>}
 */
function autodocs_tags_load_merged(): array
{
    if (!is_readable(AUTODOCS_TAGS_FILE)) {
        return autodocs_tags_defaults();
    }
    $raw = file_get_contents(AUTODOCS_TAGS_FILE);
    if ($raw === false || $raw === '') {
        return autodocs_tags_defaults();
    }
    $j = json_decode($raw, true);
    return autodocs_tags_sanitize_payload($j);
}

header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $persisted = is_readable(AUTODOCS_TAGS_FILE);
    $payload = autodocs_tags_load_merged();
    $payload['persisted'] = $persisted;
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Método não permitido'], JSON_UNESCAPED_UNICODE);
    exit;
}

require __DIR__ . '/bootstrap.php';

try {
    $pdo = autodocs_pdo();
    autodocs_require_admin($pdo);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if ($msg === 'UNAUTHORIZED') {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Não autenticado.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($msg === 'FORBIDDEN') {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Apenas administradores.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($e instanceof RuntimeException && str_contains($msg, 'config')) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
        exit;
    }
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Erro no servidor.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$body = autodocs_read_json_body();
$save = autodocs_tags_sanitize_payload($body);

$json = json_encode($save, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
if (@file_put_contents(AUTODOCS_TAGS_FILE, $json, LOCK_EX) === false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Não foi possível gravar api/private/tags.json (permissões?).'], JSON_UNESCAPED_UNICODE);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'tags' => $save['tags'], 'docLinks' => $save['docLinks']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;
