<?php

declare(strict_types=1);

const AUTODOCS_TAGS_FILE = __DIR__ . '/private/tags.json';

function autodocs_tags_substr(string $s, int $start, int $length): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($s, $start, $length);
    }
    return substr($s, $start, $length);
}

/**
 * @return list<string>
 */
function autodocs_tags_catalog_doc_ids(): array
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

/**
 * @return array{tags: list<array{id: string, name: string, accentColor?: string, createdAt?: int}>, docLinks: array<string, string>, catalogOverrides: array<string, array{title?: string, blurb?: string}>}
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
            [
                'id' => 'tag-uso-geral',
                'name' => 'Uso Geral',
                'accentColor' => '#5c6b73',
            ],
        ],
        'docLinks' => $links,
        'catalogOverrides' => [],
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
 * @param array{tags?: mixed, docLinks?: mixed, catalogOverrides?: mixed}|null $existing
 * @return array{tags: list<array{id: string, name: string, accentColor: string, createdAt?: int}>, docLinks: array<string, string>, catalogOverrides: array<string, array{title: string, blurb: string}>}
 */
function autodocs_tags_sanitize_payload($raw, $existing = null): array
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
                'name' => autodocs_tags_substr($name, 0, 80),
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

    $overridesSource = null;
    if (array_key_exists('catalogOverrides', $raw) && is_array($raw['catalogOverrides'])) {
        $overridesSource = $raw['catalogOverrides'];
    } elseif (is_array($existing) && isset($existing['catalogOverrides']) && is_array($existing['catalogOverrides'])) {
        $overridesSource = $existing['catalogOverrides'];
    }

    $overridesOut = [];
    if (is_array($overridesSource)) {
        foreach ($overridesSource as $docId => $over) {
            $docId = (string) $docId;
            if (!in_array($docId, $allowedDocIds, true) || !is_array($over)) {
                continue;
            }
            $title = isset($over['title']) ? trim((string) $over['title']) : '';
            $blurb = isset($over['blurb']) ? trim((string) $over['blurb']) : '';
            if ($title === '' && $blurb === '') {
                continue;
            }
            $row = [];
            if ($title !== '') {
                $row['title'] = autodocs_tags_substr($title, 0, 120);
            }
            if ($blurb !== '') {
                $row['blurb'] = autodocs_tags_substr($blurb, 0, 400);
            }
            if ($row !== []) {
                $overridesOut[$docId] = $row;
            }
        }
    }

    return [
        'tags' => $tagsOut,
        'docLinks' => $linksOut,
        'catalogOverrides' => $overridesOut,
    ];
}

/**
 * @return array{tags: list<array{id: string, name: string, accentColor: string, createdAt?: int}>, docLinks: array<string, string>, catalogOverrides: array<string, array{title: string, blurb: string}>}
 */
function autodocs_tags_load_merged(): array
{
    $cacheKey = 'cache:tags';
    if (function_exists('autodocs_cache_get')) {
        $cached = autodocs_cache_get($cacheKey);
        if (is_string($cached) && $cached !== '') {
            $j = json_decode($cached, true);
            if (is_array($j)) {
                return autodocs_tags_sanitize_payload($j, $j);
            }
        }
    }

    if (!is_readable(AUTODOCS_TAGS_FILE)) {
        return autodocs_tags_defaults();
    }
    $raw = file_get_contents(AUTODOCS_TAGS_FILE);
    if ($raw === false || $raw === '') {
        return autodocs_tags_defaults();
    }
    $j = json_decode($raw, true);
    $payload = autodocs_tags_sanitize_payload(is_array($j) ? $j : null, is_array($j) ? $j : null);
    if (function_exists('autodocs_cache_set')) {
        autodocs_cache_set($cacheKey, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 300);
    }
    return $payload;
}

function autodocs_tags_cache_invalidate(): void
{
    if (function_exists('autodocs_cache_delete')) {
        autodocs_cache_delete('cache:tags');
    }
}

/**
 * @return array<string, true>
 */
function autodocs_tags_valid_ids_map(): array
{
    $map = [];
    foreach (autodocs_tags_load_merged()['tags'] as $t) {
        $map[(string) $t['id']] = true;
    }
    return $map;
}
