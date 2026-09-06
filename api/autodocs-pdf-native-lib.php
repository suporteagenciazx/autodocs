<?php

declare(strict_types=1);

require_once __DIR__ . '/autodocs-figma-package-lib.php';

/**
 * Extrai texto por página via tools/pdf-native/extract.mjs
 *
 * @return array{pageCount: int, pages: list<array{index: int, text: string}>}
 */
function autodocs_pdf_native_extract_pages(string $pdfPath): array
{
    $toolDir = AUTODOCS_ROOT . '/tools/pdf-native';
    $script = $toolDir . '/extract.mjs';
    if (!is_file($script)) {
        throw new RuntimeException('Ferramenta de extração PDF em falta (tools/pdf-native/extract.mjs).');
    }

    $nodeModules = $toolDir . '/node_modules/pdf-parse';
    if (!is_dir($nodeModules)) {
        throw new RuntimeException(
            'Dependências PDF não instaladas. No contentor: cd tools/pdf-native && npm install'
        );
    }

    $node = trim((string) shell_exec('command -v node 2>/dev/null')) ?: 'node';
    $cmd = escapeshellarg($node) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($pdfPath) . ' 2>&1';
    $out = shell_exec($cmd);
    if ($out === null || trim($out) === '') {
        throw new RuntimeException('Falha ao executar a extração do PDF.');
    }

    $json = json_decode(trim($out), true);
    if (!is_array($json)) {
        // stdout pode misturar logs; tentar última linha JSON
        $lines = preg_split('/\r\n|\n|\r/', trim($out)) ?: [];
        $last = end($lines);
        $json = is_string($last) ? json_decode($last, true) : null;
    }
    if (!is_array($json) || empty($json['ok'])) {
        $err = is_array($json) && isset($json['error']) ? (string) $json['error'] : 'Resposta inválida do extrator.';
        throw new RuntimeException($err);
    }

    $pages = [];
    foreach (($json['pages'] ?? []) as $p) {
        if (!is_array($p)) {
            continue;
        }
        $pages[] = [
            'index' => (int) ($p['index'] ?? count($pages) + 1),
            'text' => trim((string) ($p['text'] ?? '')),
        ];
    }
    if ($pages === []) {
        throw new RuntimeException('O PDF não contém texto extraível. Use um PDF com texto (não só imagem).');
    }

    return [
        'pageCount' => count($pages),
        'pages' => $pages,
    ];
}

/**
 * @return list<string> placeholders com colchetes, ex.: [CNPJ]
 */
function autodocs_pdf_native_find_placeholders(string $text): array
{
    if (!preg_match_all('/\[[^\[\]]{1,80}\]/u', $text, $m)) {
        return [];
    }
    $out = [];
    $seen = [];
    foreach ($m[0] as $ph) {
        $key = mb_strtoupper($ph, 'UTF-8');
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        $out[] = $ph;
    }
    return $out;
}

/**
 * @param list<string> $placeholders
 * @return list<array{inputId: string, targetId: string, originalText: string, label: string, key: string}>
 */
function autodocs_pdf_native_build_fields(array $placeholders): array
{
    $fields = [];
    $seenInput = [];
    foreach ($placeholders as $ph) {
        $key = autodocs_figma_field_id_from_placeholder($ph);
        $inputId = 'i-' . $key;
        $n = 1;
        $base = $inputId;
        while (isset($seenInput[$inputId])) {
            $n++;
            $inputId = $base . '-' . $n;
        }
        $seenInput[$inputId] = true;
        $fields[] = [
            'inputId' => $inputId,
            'targetId' => $key,
            'originalText' => $ph,
            'label' => autodocs_figma_label_from_key($key),
            'key' => $key,
        ];
    }
    return $fields;
}

/**
 * Converte texto de página em HTML com spans para placeholders.
 *
 * @param list<array{originalText: string, targetId: string}> $fields
 */
function autodocs_pdf_native_text_to_html(string $text, array $fields): string
{
    $text = str_replace(["\r\n", "\r"], "\n", $text);
    $paragraphs = preg_split('/\n{2,}/', trim($text)) ?: [];
    if ($paragraphs === ['']) {
        $paragraphs = [];
    }
    if ($paragraphs === []) {
        $paragraphs = [trim($text)];
    }

    $map = [];
    foreach ($fields as $f) {
        $map[$f['originalText']] = $f;
        $map[mb_strtoupper($f['originalText'], 'UTF-8')] = $f;
    }

    $html = '';
    foreach ($paragraphs as $para) {
        $para = trim($para);
        if ($para === '') {
            continue;
        }
        $lines = preg_split('/\n/', $para) ?: [$para];
        $innerParts = [];
        foreach ($lines as $line) {
            $line = htmlspecialchars($line, ENT_QUOTES, 'UTF-8');
            // Restaurar placeholders escapados e trocar por spans
            $line = preg_replace_callback(
                '/\[([^\[\]]{1,80})\]/u',
                static function (array $m) use ($map): string {
                    $raw = '[' . html_entity_decode($m[1], ENT_QUOTES, 'UTF-8') . ']';
                    $ph = '[' . $m[1] . ']';
                    $f = $map[$raw] ?? $map[mb_strtoupper($raw, 'UTF-8')] ?? $map[$ph] ?? null;
                    if (!$f) {
                        // tentar match case-insensitive nas keys
                        foreach ($map as $k => $field) {
                            if (mb_strtoupper($k, 'UTF-8') === mb_strtoupper($raw, 'UTF-8')) {
                                $f = $field;
                                break;
                            }
                        }
                    }
                    if (!$f) {
                        return $ph;
                    }
                    $id = htmlspecialchars($f['targetId'], ENT_QUOTES, 'UTF-8');
                    $ot = htmlspecialchars($f['originalText'], ENT_QUOTES, 'UTF-8');
                    return '<span id="' . $id . '">' . $ot . '</span>';
                },
                $line
            );
            $innerParts[] = $line;
        }
        $inner = implode("<br>\n", $innerParts);
        $html .= "                    <p>{$inner}</p>\n";
    }
    return $html;
}

function autodocs_pdf_native_store_upload(?array $file, string $destPath, array $allowedExt): ?string
{
    if ($file === null || !is_array($file)) {
        return null;
    }
    $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($err === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($err !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException('Falha no upload de asset.');
    }
    $tmp = (string) ($file['tmp_name'] ?? '');
    $name = (string) ($file['name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        throw new InvalidArgumentException('Upload inválido.');
    }
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt, true)) {
        throw new InvalidArgumentException('Formato de ficheiro não suportado: .' . $ext);
    }
    $bin = file_get_contents($tmp);
    if ($bin === false) {
        throw new RuntimeException('Não foi possível ler o ficheiro enviado.');
    }
    autodocs_figma_write_file($destPath, $bin);
    return $ext;
}

/**
 * @param array{
 *   title: string,
 *   pdfTmp: string,
 *   tagId?: ?string,
 *   newTagName?: ?string,
 *   newTagColor?: ?string,
 *   capaFile?: ?array,
 *   mdaFile?: ?array,
 *   lastPageColor?: string
 * } $opts
 * @return array<string, mixed>
 */
function autodocs_pdf_native_import(array $opts): array
{
    $title = trim((string) ($opts['title'] ?? ''));
    $pdfTmp = (string) ($opts['pdfTmp'] ?? '');
    if ($title === '') {
        throw new InvalidArgumentException('Informe o nome da documentação.');
    }
    if ($pdfTmp === '' || !is_readable($pdfTmp)) {
        throw new InvalidArgumentException('PDF inválido.');
    }

    $lastColor = trim((string) ($opts['lastPageColor'] ?? '#ffffff'));
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $lastColor)) {
        $lastColor = '#ffffff';
    }

    $warnings = [];
    $extracted = autodocs_pdf_native_extract_pages($pdfTmp);
    $allText = '';
    foreach ($extracted['pages'] as $p) {
        $allText .= "\n" . $p['text'];
    }
    $placeholders = autodocs_pdf_native_find_placeholders($allText);
    if ($placeholders === []) {
        $warnings[] = 'Nenhum placeholder [CAMPO] encontrado no PDF. O formulário ficará vazio até adicionar campos (Fase 2).';
    }
    $fields = autodocs_pdf_native_build_fields($placeholders);

    $resolvedTagId = autodocs_figma_package_resolve_tag_id(
        isset($opts['tagId']) ? (string) $opts['tagId'] : null,
        isset($opts['newTagName']) ? (string) $opts['newTagName'] : null,
        isset($opts['newTagColor']) ? (string) $opts['newTagColor'] : null
    );

    $slug = autodocs_figma_slugify($title);
    $rootDir = AUTODOCS_ROOT . '/documentos/importados';
    autodocs_figma_ensure_writable_dir($rootDir);
    $dir = $rootDir . '/' . $slug;
    if (is_dir($dir)) {
        $slug = autodocs_figma_slugify($title . '-' . date('ymd-His'));
        $dir = $rootDir . '/' . $slug;
    }
    autodocs_figma_ensure_writable_dir($dir);
    $assetsDir = $dir . '/assets';
    autodocs_figma_ensure_writable_dir($assetsDir);

    // Guardar PDF original
    $pdfBin = file_get_contents($pdfTmp);
    if ($pdfBin !== false) {
        autodocs_figma_write_file($dir . '/origem.pdf', $pdfBin);
    }

    $capaRel = null;
    $capaExt = autodocs_pdf_native_store_upload(
        $opts['capaFile'] ?? null,
        $assetsDir . '/capa-upload.tmp',
        ['png', 'jpg', 'jpeg', 'webp', 'svg']
    );
    if ($capaExt !== null) {
        $capaName = 'capa.' . ($capaExt === 'jpeg' ? 'jpg' : $capaExt);
        rename($assetsDir . '/capa-upload.tmp', $assetsDir . '/' . $capaName);
        $capaRel = 'assets/' . $capaName;
    }

    $mdaRel = null;
    $mdaExt = autodocs_pdf_native_store_upload(
        $opts['mdaFile'] ?? null,
        $assetsDir . '/mda-upload.tmp',
        ['png', 'jpg', 'jpeg', 'webp', 'svg']
    );
    if ($mdaExt !== null) {
        $mdaName = 'mda.' . ($mdaExt === 'jpeg' ? 'jpg' : $mdaExt);
        rename($assetsDir . '/mda-upload.tmp', $assetsDir . '/' . $mdaName);
        $mdaRel = 'assets/' . $mdaName;
    } else {
        // fallback: copiar MDA global do sistema se existir
        $sysMda = AUTODOCS_ROOT . '/sistema/mda.svg';
        if (is_readable($sysMda)) {
            $bin = file_get_contents($sysMda);
            if ($bin !== false) {
                autodocs_figma_write_file($assetsDir . '/mda.svg', $bin);
                $mdaRel = 'assets/mda.svg';
                $warnings[] = 'MDA não enviado — a usar sistema/mda.svg.';
            }
        }
    }

    $pageCount = count($extracted['pages']);
    $pagesHtml = '';
    if ($capaRel !== null) {
        $capaUrl = htmlspecialchars($capaRel, ENT_QUOTES, 'UTF-8');
        $pagesHtml .= "        <div class=\"capa\" style=\"background-image:url({$capaUrl});background-size:cover;\"></div>\n";
    }

    foreach ($extracted['pages'] as $idx => $p) {
        $isLast = ($idx === $pageCount - 1);
        $body = autodocs_pdf_native_text_to_html($p['text'], $fields);
        if (trim($body) === '') {
            $body = "                    <p></p>\n";
        }
        $style = '';
        if ($isLast) {
            $style = ' style="background-image:none;background-color:' . htmlspecialchars($lastColor, ENT_QUOTES, 'UTF-8') . ';"';
        } elseif ($mdaRel !== null) {
            $mdaUrl = htmlspecialchars($mdaRel, ENT_QUOTES, 'UTF-8');
            $style = ' style="background-image:url(' . $mdaUrl . ');background-size:cover;"';
        }
        $pagesHtml .= <<<HTML
        <div class="pagina"{$style}>
            <div class="pagina-conteudo">
                <div class="pagina-textos">
{$body}                </div>
            </div>
        </div>

HTML;
    }

    $html = autodocs_pdf_native_build_html($title, $slug, $fields, $pagesHtml);
    $inputsJs = autodocs_figma_build_inputs_js($fields);
    autodocs_figma_write_file($dir . '/index.html', $html);
    autodocs_figma_write_file($dir . '/inputs.js', $inputsJs);

    // meta para Fase 2
    $meta = [
        'source' => 'pdf',
        'title' => $title,
        'slug' => $slug,
        'lastPageColor' => $lastColor,
        'fields' => $fields,
        'pageCount' => $pageCount,
        'hasCapa' => $capaRel !== null,
        'hasMda' => $mdaRel !== null,
        'createdAt' => date('c'),
    ];
    autodocs_figma_write_file($dir . '/import-meta.json', json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");

    if ($resolvedTagId !== '' && function_exists('autodocs_tags_link_doc')) {
        try {
            /* tag linking handled client-side via model.tagId; server may persist later */
        } catch (Throwable $e) {
            /* ignore */
        }
    }

    $href = 'documentos/importados/' . $slug . '/';
    return [
        'slug' => $slug,
        'href' => $href,
        'title' => $title,
        'fieldsCount' => count($fields),
        'pagesCount' => $pageCount + ($capaRel !== null ? 1 : 0),
        'warnings' => $warnings,
        'placeholders' => $placeholders,
        'model' => [
            'id' => 'designer-' . $slug,
            'title' => $title,
            'blurb' => 'Importado de PDF (nativo) · ' . $pageCount . ' página(s) · ' . count($fields) . ' campo(s).',
            'href' => $href,
            'source' => 'pdf',
            'tagId' => $resolvedTagId,
            'isCatalog' => false,
            'updatedAt' => date('c'),
        ],
    ];
}

/**
 * @param list<array{inputId: string, targetId: string, originalText: string, label: string}> $fields
 */
function autodocs_pdf_native_build_html(string $title, string $slug, array $fields, string $pagesHtml): string
{
    $escTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $formFields = '';
    foreach ($fields as $f) {
        $label = htmlspecialchars($f['label'], ENT_QUOTES, 'UTF-8');
        $inputId = htmlspecialchars($f['inputId'], ENT_QUOTES, 'UTF-8');
        $ph = htmlspecialchars($f['originalText'], ENT_QUOTES, 'UTF-8');
        $formFields .= <<<HTML
                        <div class="campo">
                            <div class="label">
                                <label class="label-campo" for="{$inputId}">{$label}</label>
                            </div>
                            <input class="input" id="{$inputId}" placeholder="{$ph}" type="text">
                        </div>

HTML;
    }
    if ($formFields === '') {
        $formFields = "                        <p class=\"campo-texto\">Nenhum placeholder detectado. Adicione campos na Fase 2.</p>\n";
    }

    return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$escTitle} | AutoDocs</title>
    <link rel="icon" href="../../sistema/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="../../estilos/fontes/inter.css">
    <link rel="stylesheet" href="../../estilos/sistema.css">
    <link rel="stylesheet" href="../../estilos/exportar.css">
    <link rel="stylesheet" href="../../estilos/documentos.css">
    <link rel="stylesheet" href="../../estilos/icones.css">
    <script src="../../scripts/autodocs-page-transition-boot.js"></script>
</head>

<body id="{$slug}">
    <div class="conteudo" id="conteudo">
        <header id="pagina">
            <span id="sistema-banco" class="banco-razaosocial"></span>
            <span id="sistema-cnpj" class="banco-cnpj"></span>
        </header>
        <div class="sistema-pagina">
            <h1>{$escTitle}</h1>
            <div class="formularios">
                <div class="area-boxes" style="grid-template-columns: 100%;">
                <div class="base-box">
                    <h2>Campos do documento</h2>
                    <div class="base-boxcampos">
{$formFields}                    </div>
                </div>
                <div class="base-box">
                    <h2>Selos e Carimbos</h2>
                    <div class="base-boxcampos">
                        <div class="campo">
                            <label class="label-campo" for="i-selo-qr">Selo QR (Tribunal)</label>
                            <input id="i-selo-qr" type="checkbox">
                        </div>
                        <div class="campo">
                            <label class="label-campo" for="i-selo-png">Selo de Autenticidade (PNG)</label>
                            <input id="i-selo-png" type="checkbox">
                        </div>
                    </div>
                </div>
            </div>
            <div class="menu-inferior">
                <div class="confirmacao">
                    <label for="confirmacao" class="label-confirmacao">
                        Todos os campos foram preenchidos?<input type="checkbox" id="confirmacao">
                    </label>
                </div>
                <button type="button" id="exportar">
                    <span class="material-symbols-rounded">download</span>
                    Exportar
                </button>
            </div>
            </div>
        </div>
    </div>
    <div id="documento">
{$pagesHtml}    </div>
    <script src="../../scripts/navdrawer.js"></script>
    <script src="../../scripts/banco.js"></script>
    <script src="../../scripts/assinatura.js"></script>
    <script src="../../scripts/cnpj.js"></script>
    <script src="../../scripts/autodocs-toast.js"></script>
    <script src="../../scripts/opencnpj-autofill.js?v=2"></script>
    <script src="./inputs.js"></script>
    <script src="../../scripts/titulo.js"></script>
    <script src="../../scripts/selo-digital.js"></script>
    <script src="../../scripts/exportar.js?v=3"></script>
    <script src="../../scripts/impressao.js?v=3"></script>
</body>

</html>
HTML;
}
