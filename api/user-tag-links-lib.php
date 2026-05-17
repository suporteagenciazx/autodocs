<?php

declare(strict_types=1);

const AUTODOCS_USER_TAG_LINKS_FILE = __DIR__ . '/private/user-doc-links.json';
const AUTODOCS_USO_GERAL_TAG_ID = 'tag-uso-geral';

/**
 * @return array{users: array<string, list<string>>}
 */
function autodocs_user_tag_links_load(): array
{
    if (!is_readable(AUTODOCS_USER_TAG_LINKS_FILE)) {
        return ['users' => []];
    }
    $raw = file_get_contents(AUTODOCS_USER_TAG_LINKS_FILE);
    if ($raw === false || $raw === '') {
        return ['users' => []];
    }
    $j = json_decode($raw, true);
    if (!is_array($j) || !isset($j['users']) || !is_array($j['users'])) {
        return ['users' => []];
    }
    $out = ['users' => []];
    foreach ($j['users'] as $uid => $val) {
        $uid = (string) $uid;
        if ($uid === '' || !ctype_digit($uid)) {
            continue;
        }
        if (!is_array($val)) {
            continue;
        }
        if ($val === []) {
            continue;
        }
        $tagIds = [];
        $isList = array_keys($val) === range(0, count($val) - 1);
        if ($isList) {
            foreach ($val as $tid) {
                $tid = trim((string) $tid);
                if ($tid !== '' && preg_match('/^tag-[a-zA-Z0-9_-]+$/', $tid)) {
                    $tagIds[] = $tid;
                }
            }
        } else {
            foreach ($val as $maybeDoc => $tid) {
                $tid = trim((string) $tid);
                if ($tid !== '' && preg_match('/^tag-[a-zA-Z0-9_-]+$/', $tid)) {
                    $tagIds[] = $tid;
                }
            }
            $tagIds = array_values(array_unique($tagIds));
        }
        if ($tagIds !== []) {
            $out['users'][$uid] = array_values(array_unique($tagIds));
        }
    }
    return $out;
}

/**
 * @param array{users: array<string, list<string>>} $data
 */
function autodocs_user_tag_links_save(array $data): bool
{
    $out = ['users' => []];
    foreach ($data['users'] as $uid => $tagIds) {
        if (!is_array($tagIds)) {
            continue;
        }
        $uid = (string) $uid;
        if ($uid === '' || !ctype_digit($uid)) {
            continue;
        }
        $clean = [];
        foreach ($tagIds as $tid) {
            $tid = trim((string) $tid);
            if ($tid === '' || !preg_match('/^tag-[a-zA-Z0-9_-]+$/', $tid)) {
                continue;
            }
            $clean[] = $tid;
        }
        $clean = array_values(array_unique($clean));
        if ($clean !== []) {
            $out['users'][$uid] = $clean;
        }
    }
    $json = json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    return @file_put_contents(AUTODOCS_USER_TAG_LINKS_FILE, $json, LOCK_EX) !== false;
}

/**
 * @return list<string>
 */
function autodocs_user_tag_ids_for(int $userId): array
{
    $data = autodocs_user_tag_links_load();
    $key = (string) $userId;
    if (!isset($data['users'][$key]) || !is_array($data['users'][$key])) {
        return [];
    }
    return $data['users'][$key];
}

function autodocs_user_tag_links_link(int $userId, string $tagId): bool
{
    if (!preg_match('/^tag-[a-zA-Z0-9_-]+$/', $tagId)) {
        return false;
    }
    $data = autodocs_user_tag_links_load();
    $key = (string) $userId;
    if (!isset($data['users'][$key]) || !is_array($data['users'][$key])) {
        $data['users'][$key] = [];
    }
    if (!in_array($tagId, $data['users'][$key], true)) {
        $data['users'][$key][] = $tagId;
    }
    return autodocs_user_tag_links_save($data);
}

function autodocs_user_tag_links_unlink(int $userId, string $tagId): bool
{
    $data = autodocs_user_tag_links_load();
    $key = (string) $userId;
    if (!isset($data['users'][$key])) {
        return true;
    }
    $data['users'][$key] = array_values(array_filter(
        $data['users'][$key],
        static fn (string $t): bool => $t !== $tagId
    ));
    if ($data['users'][$key] === []) {
        unset($data['users'][$key]);
    }
    return autodocs_user_tag_links_save($data);
}

function autodocs_user_tag_links_remove_user(int $userId): void
{
    $data = autodocs_user_tag_links_load();
    $key = (string) $userId;
    if (!isset($data['users'][$key])) {
        return;
    }
    unset($data['users'][$key]);
    autodocs_user_tag_links_save($data);
}

/**
 * @return array<string, int> userId => número de tags
 */
function autodocs_user_tag_links_counts(): array
{
    $data = autodocs_user_tag_links_load();
    $counts = [];
    foreach ($data['users'] as $uid => $tagIds) {
        if (is_array($tagIds)) {
            $counts[(string) $uid] = count($tagIds);
        }
    }
    return $counts;
}

/**
 * Documentações do catálogo vinculadas a uma tag (docLinks globais).
 *
 * @param array<string, string> $docLinks
 * @return list<string>
 */
function autodocs_doc_ids_for_tag(string $tagId, array $docLinks): array
{
    $ids = [];
    foreach ($docLinks as $docId => $linkedTag) {
        if ((string) $linkedTag === $tagId && in_array((string) $docId, autodocs_catalog_doc_ids(), true)) {
            $ids[] = (string) $docId;
        }
    }
    sort($ids);
    return $ids;
}

/**
 * @param list<string> $userTagIds
 * @param array<string, string> $docLinks
 * @return list<string>
 */
function autodocs_allowed_docs_from_user_tags(array $userTagIds, array $docLinks): array
{
    if ($userTagIds === []) {
        return [];
    }
    $allowed = [];
    $catalog = autodocs_catalog_doc_ids();
    foreach ($catalog as $docId) {
        $tagId = isset($docLinks[$docId]) ? (string) $docLinks[$docId] : '';
        if ($tagId !== '' && in_array($tagId, $userTagIds, true)) {
            $allowed[] = $docId;
        }
    }
    return array_values(array_unique($allowed));
}

/**
 * @param list<string> $tagIds
 * @param list<array{id: string, name: string}> $tagsCatalog
 * @return list<string>
 */
function autodocs_tag_labels_for_ids(array $tagIds, array $tagsCatalog): array
{
    $nameById = [];
    foreach ($tagsCatalog as $t) {
        if (isset($t['id'], $t['name'])) {
            $nameById[(string) $t['id']] = (string) $t['name'];
        }
    }
    $labels = [];
    foreach ($tagIds as $tid) {
        $tid = (string) $tid;
        if (isset($nameById[$tid])) {
            $labels[] = $nameById[$tid];
        }
    }
    return $labels;
}

function autodocs_user_tag_links_clear_legacy_batches(PDO $pdo, int $userId): void
{
    $pdo->prepare('DELETE FROM user_doc_access WHERE user_id = ?')->execute([$userId]);
}
