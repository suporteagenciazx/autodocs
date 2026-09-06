<?php

declare(strict_types=1);

require_once __DIR__ . '/autodocs-figma-lib.php';
require_once __DIR__ . '/autodocs-tags-lib.php';

/**
 * Importação local: ZIP com .fig + PNGs (sem API Figma).
 */

function autodocs_figma_package_normalize_name(string $name): string
{
    $s = mb_strtolower(pathinfo($name, PATHINFO_FILENAME), 'UTF-8');
    $map = [
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
        'ç' => 'c', 'ñ' => 'n',
    ];
    $s = strtr($s, $map);
    $s = preg_replace('/[^a-z0-9]+/u', '-', $s) ?? '';
    return trim($s, '-');
}

/**
 * @return list<string>
 */
function autodocs_figma_package_list_files_recursive(string $dir): array
{
    $out = [];
    if (!is_dir($dir)) {
        return $out;
    }
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($it as $file) {
        if ($file->isFile()) {
            $out[] = $file->getPathname();
        }
    }
    return $out;
}

/**
 * @param string $zipPath
 * @return array{dir: string, fig: string|null, pngs: list<string>, pdfs: list<string>}
 */
function autodocs_figma_package_extract_zip(string $zipPath): array
{
    if (!class_exists('ZipArchive')) {
        throw new RuntimeException('Extensão PHP Zip não disponível.');
    }
    $tmp = sys_get_temp_dir() . '/autodocs-fig-' . bin2hex(random_bytes(8));
    if (!@mkdir($tmp, 0700, true) && !is_dir($tmp)) {
        throw new RuntimeException('Não foi possível criar pasta temporária.');
    }

    $zip = new ZipArchive();
    $opened = $zip->open($zipPath);
    if ($opened !== true) {
        autodocs_figma_package_rmdir($tmp);
        throw new RuntimeException('ZIP inválido ou corrompido.');
    }
    if (!$zip->extractTo($tmp)) {
        $zip->close();
        autodocs_figma_package_rmdir($tmp);
        throw new RuntimeException('Não foi possível extrair o ZIP.');
    }
    $zip->close();

    $fig = null;
    $pngs = [];
    $pdfs = [];
    foreach (autodocs_figma_package_list_files_recursive($tmp) as $path) {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if ($ext === 'fig' && $fig === null) {
            $fig = $path;
        } elseif ($ext === 'png') {
            $pngs[] = $path;
        } elseif ($ext === 'pdf') {
            $pdfs[] = $path;
        }
    }

    usort($pngs, static function ($a, $b) {
        $na = autodocs_figma_package_normalize_name(basename($a));
        $nb = autodocs_figma_package_normalize_name(basename($b));
        $pa = [];
        $pb = [];
        preg_match('/^(\d+)/', $na, $pa);
        preg_match('/^(\d+)/', $nb, $pb);
        if ($pa && $pb) {
            return (int) $pa[1] <=> (int) $pb[1];
        }
        return strcmp($na, $nb);
    });

    return ['dir' => $tmp, 'fig' => $fig, 'pngs' => $pngs, 'pdfs' => $pdfs];
}

function autodocs_figma_package_rmdir(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }
    foreach (autodocs_figma_package_list_files_recursive($dir) as $f) {
        @unlink($f);
    }
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $f) {
        if ($f->isDir()) {
            @rmdir($f->getPathname());
        }
    }
    @rmdir($dir);
}

function autodocs_figma_package_node_bin(): string
{
    $candidates = [
        AUTODOCS_ROOT . '/tools/figma-package/parse-fig.mjs',
        __DIR__ . '/../tools/figma-package/parse-fig.mjs',
    ];
    foreach ($candidates as $script) {
        if (is_readable($script)) {
            return $script;
        }
    }
    throw new RuntimeException('Parser .fig não encontrado (tools/figma-package).');
}

/**
 * @return array{title: string, pages: list<array{id: string, name: string, isCapa: bool, width: float, height: float, node: array}>}
 */
function autodocs_figma_package_parse_fig(string $figPath): array
{
    $script = autodocs_figma_package_node_bin();
    $node = '/usr/bin/node';
    if (!is_executable($node)) {
        $which = trim((string) shell_exec('which node 2>/dev/null') ?: '');
        if ($which !== '' && is_executable($which)) {
            $node = $which;
        } else {
            throw new RuntimeException('Node.js não está instalado no servidor (necessário para ler .fig).');
        }
    }

    $cmd = escapeshellarg($node) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($figPath) . ' 2>&1';
    $output = shell_exec($cmd);
    if ($output === null || trim($output) === '') {
        throw new RuntimeException('O parser .fig não devolveu dados.');
    }

    $jsonLine = trim($output);
    $data = json_decode($jsonLine, true);
    if (!is_array($data)) {
        throw new RuntimeException('Parser .fig devolveu JSON inválido: ' . substr($output, 0, 200));
    }
    if (empty($data['ok'])) {
        $err = isset($data['error']) ? (string) $data['error'] : 'Falha ao analisar .fig.';
        throw new RuntimeException($err);
    }

    $pages = [];
    foreach ($data['pages'] ?? [] as $p) {
        if (!is_array($p) || empty($p['node']) || !is_array($p['node'])) {
            continue;
        }
        $pages[] = [
            'id' => (string) ($p['id'] ?? ''),
            'name' => (string) ($p['name'] ?? 'Página'),
            'isCapa' => !empty($p['isCapa']),
            'width' => (float) ($p['width'] ?? 0),
            'height' => (float) ($p['height'] ?? 0),
            'node' => $p['node'],
        ];
    }

    return [
        'title' => trim((string) ($data['title'] ?? 'Modelo Figma')),
        'pages' => $pages,
    ];
}

/**
 * @param list<array{name: string}> $pages
 * @param list<string> $pngPaths
 * @return array<string, string> page name key => png path
 */
function autodocs_figma_package_match_pngs(array $pages, array $pngPaths): array
{
    $available = [];
    foreach ($pngPaths as $p) {
        $key = autodocs_figma_package_normalize_name(basename($p));
        if ($key !== '') {
            $available[$key] = $p;
        }
    }

    $map = [];
    $used = [];

    foreach ($pages as $page) {
        $pageKey = autodocs_figma_package_normalize_name((string) $page['name']);
        $best = null;
        $bestScore = -1;

        foreach ($available as $pngKey => $pngPath) {
            if (isset($used[$pngPath])) {
                continue;
            }
            $score = 0;
            if ($pngKey === $pageKey) {
                $score = 100;
            } elseif ($pageKey !== '' && (str_contains($pngKey, $pageKey) || str_contains($pageKey, $pngKey))) {
                $score = 70;
            } else {
                similar_text($pngKey, $pageKey, $pct);
                $score = (int) $pct;
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $pngPath;
            }
        }

        if ($best !== null && $bestScore >= 40) {
            $map[(string) $page['name']] = $best;
            $used[$best] = true;
        }
    }

    // Atribuir PNGs restantes por ordem às páginas sem match
    $left = array_values(array_filter($pngPaths, static fn($p) => !isset($used[$p])));
    $idx = 0;
    foreach ($pages as $page) {
        $name = (string) $page['name'];
        if (isset($map[$name])) {
            continue;
        }
        if ($idx < count($left)) {
            $map[$name] = $left[$idx];
            $used[$left[$idx]] = true;
            $idx++;
        }
    }

    return $map;
}

/**
 * @return list<array{id: string, name: string, isCapa: bool, width: float, height: float, node: array}>
 */
function autodocs_figma_package_pages_from_pngs(array $pngPaths): array
{
    $pages = [];
    $i = 0;
    foreach ($pngPaths as $png) {
        $i++;
        $name = pathinfo($png, PATHINFO_FILENAME);
        $pages[] = [
            'id' => 'png-' . $i,
            'name' => $name,
            'isCapa' => $i === 1 && (bool) preg_match('#capa#iu', $name),
            'width' => 794.0,
            'height' => 1123.0,
            'node' => [
                'id' => 'png-' . $i,
                'type' => 'FRAME',
                'name' => $name,
                'absoluteBoundingBox' => ['x' => 0, 'y' => 0, 'width' => 794, 'height' => 1123],
                'children' => [],
            ],
        ];
    }
    return $pages;
}

function autodocs_figma_package_resolve_tag_id(?string $tagId, ?string $newTagName, ?string $newTagColor): string
{
    $payload = autodocs_tags_load_merged();
    $tags = $payload['tags'];

    $newName = $newTagName !== null ? trim($newTagName) : '';
    if ($newName !== '') {
        foreach ($tags as $t) {
            if (strcasecmp((string) ($t['name'] ?? ''), $newName) === 0) {
                return (string) $t['id'];
            }
        }
        $hex = autodocs_tags_normalize_hex($newTagColor ?? '');
        if ($hex === '') {
            $hex = '#5c6b73';
        }
        $id = 'tag-' . bin2hex(random_bytes(4));
        $tags[] = [
            'id' => $id,
            'name' => $newName,
            'accentColor' => $hex,
            'createdAt' => time(),
        ];
        $json = json_encode(
            ['tags' => $tags, 'docLinks' => $payload['docLinks']],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ) . "\n";
        if (@file_put_contents(AUTODOCS_TAGS_FILE, $json, LOCK_EX) === false) {
            throw new RuntimeException('Não foi possível gravar a nova tag.');
        }
        if (function_exists('autodocs_tags_cache_invalidate')) {
            autodocs_tags_cache_invalidate();
        }
        return $id;
    }

    if ($tagId !== null && $tagId !== '') {
        foreach ($tags as $t) {
            if ((string) ($t['id'] ?? '') === $tagId) {
                return $tagId;
            }
        }
    }

    return $tags[0]['id'] ?? 'tag-uso-geral';
}

/**
 * @return array{slug: string, href: string, title: string, fieldsCount: int, pagesCount: int, model: array<string, mixed>, warnings: list<string>}
 */
function autodocs_figma_package_import(string $zipPath, string $titleOverride, ?string $tagId, ?string $newTagName, ?string $newTagColor): array
{
    $titleOverride = trim($titleOverride);
    if ($titleOverride === '') {
        throw new InvalidArgumentException('Informe o nome da documentação.');
    }

    $extracted = autodocs_figma_package_extract_zip($zipPath);
    $warnings = [];

    try {
        if ($extracted['pngs'] === []) {
            throw new RuntimeException('O ZIP não contém ficheiros PNG. Exporte os frames no Figma como PNG.');
        }

        $pages = [];
        $figTitle = '';
        if ($extracted['fig'] !== null) {
            try {
                $parsed = autodocs_figma_package_parse_fig($extracted['fig']);
                $figTitle = $parsed['title'];
                $pages = $parsed['pages'];
                if ($pages === []) {
                    $warnings[] = 'O .fig foi lido mas nenhuma página foi detectada; a usar apenas os PNGs.';
                }
            } catch (Throwable $e) {
                $warnings[] = 'Não foi possível ler o .fig (' . $e->getMessage() . '). A usar apenas os PNGs.';
            }
        } else {
            $warnings[] = 'ZIP sem ficheiro .fig — campos dinâmicos não serão detectados.';
        }

        if ($pages === []) {
            $pages = autodocs_figma_package_pages_from_pngs($extracted['pngs']);
        }

        $pngMap = autodocs_figma_package_match_pngs($pages, $extracted['pngs']);
        if ($pngMap === []) {
            throw new RuntimeException('Não foi possível associar os PNGs às páginas.');
        }

        $resolvedTagId = autodocs_figma_package_resolve_tag_id($tagId, $newTagName, $newTagColor);
        $title = $titleOverride;
        $slug = autodocs_figma_slugify($title);
        $rootDir = AUTODOCS_ROOT . '/documentos/importados';
        autodocs_figma_ensure_writable_dir($rootDir);
        $dir = $rootDir . '/' . $slug;
        if (is_dir($dir)) {
            $slug = autodocs_figma_slugify($title . '-' . date('ymd'));
            $dir = $rootDir . '/' . $slug;
        }
        autodocs_figma_ensure_writable_dir($dir);
        $assetsDir = $dir . '/assets';
        autodocs_figma_ensure_writable_dir($assetsDir);

        $globalFields = [];
        $seen = [];
        $builtPages = [];
        $paginaNum = 0;

        foreach ($pages as $p) {
            $pageName = (string) $p['name'];
            $pngSrc = $pngMap[$pageName] ?? null;
            if ($pngSrc === null || !is_readable($pngSrc)) {
                $warnings[] = 'PNG em falta para a página “' . $pageName . '”.';
                continue;
            }

            if (!empty($p['isCapa'])) {
                $fileName = 'capa.png';
            } else {
                $paginaNum++;
                $fileName = 'pagina-' . $paginaNum . '.png';
            }

            $bin = file_get_contents($pngSrc);
            if ($bin === false) {
                throw new RuntimeException('Não foi possível ler ' . basename($pngSrc));
            }
            autodocs_figma_write_file($assetsDir . '/' . $fileName, $bin);

            $overlaysRaw = autodocs_figma_extract_fields_from_node(
                $p['node'],
                $globalFields,
                $seen,
                $p['node']['absoluteBoundingBox'] ?? null
            );

            $originalTexts = [];
            foreach ($globalFields as $f) {
                $originalTexts[$f['targetId']] = $f['originalText'];
            }

            $builtPages[] = [
                'kind' => !empty($p['isCapa']) ? 'capa' : 'pagina',
                'name' => $pageName,
                'asset' => 'assets/' . $fileName,
                'overlays' => $overlaysRaw,
                'originalTexts' => $originalTexts,
            ];
        }

        if ($builtPages === []) {
            throw new RuntimeException('Nenhuma página foi montada. Verifique o ZIP.');
        }

        // PDF opcional — guardar na pasta do documento
        foreach ($extracted['pdfs'] as $pdfPath) {
            $pdfBin = file_get_contents($pdfPath);
            if ($pdfBin !== false) {
                $pdfName = autodocs_figma_slugify(pathinfo($pdfPath, PATHINFO_FILENAME)) . '.pdf';
                autodocs_figma_write_file($dir . '/' . $pdfName, $pdfBin);
            }
        }

        $html = autodocs_figma_build_hybrid_html($title, $slug, $globalFields, $builtPages);
        $inputsJs = autodocs_figma_build_inputs_js($globalFields);
        autodocs_figma_write_file($dir . '/index.html', $html);
        autodocs_figma_write_file($dir . '/inputs.js', $inputsJs);

        $href = 'documentos/importados/' . $slug . '/';
        return [
            'slug' => $slug,
            'href' => $href,
            'title' => $title,
            'fieldsCount' => count($globalFields),
            'pagesCount' => count($builtPages),
            'warnings' => $warnings,
            'model' => [
                'id' => 'designer-' . $slug,
                'title' => $title,
                'blurb' => 'Importado do Figma (pacote local) · ' . count($builtPages) . ' página(s) · ' . count($globalFields) . ' campo(s).',
                'href' => $href,
                'source' => 'figma',
                'tagId' => $resolvedTagId,
                'figmaUrl' => '',
                'updatedAt' => gmdate('c'),
            ],
        ];
    } finally {
        autodocs_figma_package_rmdir($extracted['dir']);
    }
}
