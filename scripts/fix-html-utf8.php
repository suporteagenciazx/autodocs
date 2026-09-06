<?php
declare(strict_types=1);

$root = dirname(__DIR__);

$googleInter = '/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*'
    . '<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*'
    . '<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter:wght@400;500;600;700&display=swap">\s*/i';

$googleMaterial = '/\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols[^>]*>\s*/i';

function autodocs_inter_href(string $rel): string
{
    $depth = substr_count($rel, '/');
    if ($depth === 0) {
        return './estilos/fontes/inter.css';
    }
    return str_repeat('../', $depth) . 'estilos/fontes/inter.css';
}

function autodocs_has_corrupted_accents(string $text): bool
{
    return (bool) preg_match(
        '/Usu\?rios|Documenta\?\?|fun\?\?o|n\?o |p\?gina|Configura\?\?|Cr\?dito|Emiss\?o|Raz\?o|Condi\?\?es|institui\?\?o|CL\?USULA|Presta\?\?o|Servi\?os|opera\?\?o|contrata\?\?o/',
        $text
    );
}

function autodocs_looks_utf8_pt(string $raw): bool
{
    if (!mb_check_encoding($raw, 'UTF-8')) {
        return false;
    }
    return (bool) preg_match('/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/u', $raw);
}

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
);

$fixed = 0;
foreach ($iterator as $file) {
    /** @var SplFileInfo $file */
    if (!$file->isFile() || strtolower($file->getExtension()) !== 'html') {
        continue;
    }
    $path = $file->getPathname();
    $rel = str_replace('\\', '/', substr($path, strlen($root) + 1));
    if (str_starts_with($rel, 'docs/') || str_contains($rel, '/.git/')) {
        continue;
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        fwrite(STDERR, "READ FAIL $rel\n");
        continue;
    }

    if (!autodocs_looks_utf8_pt($raw) && !mb_check_encoding($raw, 'UTF-8')) {
        $text = iconv('Windows-1252', 'UTF-8//IGNORE', $raw);
        $enc = 'cp1252';
        if ($text === false) {
            fwrite(STDERR, "ICONV FAIL $rel\n");
            continue;
        }
    } else {
        $text = $raw;
        $enc = 'utf-8';
    }

    // Restore from git if accents were replaced by literal '?'
    if (autodocs_has_corrupted_accents($text)) {
        $git = shell_exec('git -C ' . escapeshellarg($root) . ' show ' . escapeshellarg('HEAD:' . $rel));
        if (is_string($git) && $git !== '') {
            $text = $git;
            $enc = 'git-HEAD';
            echo "RESTORED $rel\n";
        }
    }

    $href = autodocs_inter_href($rel);
    $text2 = preg_replace($googleInter, "\n", $text) ?? $text;
    $text2 = preg_replace($googleMaterial, "\n", $text2) ?? $text2;

    if (!preg_match('/fontes\/inter\.css/i', $text2)) {
        $link = '    <link rel="stylesheet" href="' . $href . '">';
        if (preg_match('/(<link[^>]*rel="icon"[^>]*>)/i', $text2, $m, PREG_OFFSET_CAPTURE)) {
            $pos = $m[0][1] + strlen($m[0][0]);
            $text2 = substr($text2, 0, $pos) . "\n" . $link . substr($text2, $pos);
        } else {
            $text2 = preg_replace('/<\/head>/i', $link . "\n</head>", $text2, 1) ?? $text2;
        }
    } else {
        $text2 = preg_replace(
            '/<link rel="stylesheet" href="[^"]*fontes\/inter\.css">/',
            '<link rel="stylesheet" href="' . $href . '">',
            $text2
        ) ?? $text2;
    }

    $text2 = preg_replace("/\n{3,}/", "\n\n", $text2) ?? $text2;

    if ($text2 !== $raw) {
        file_put_contents($path, $text2);
        $fixed++;
        echo "WROTE ($enc) $rel\n";
    }
}

echo "fixed_files $fixed\n";

$usuarios = file_get_contents($root . '/usuarios/index.html');
if ($usuarios === false || !str_contains($usuarios, 'Usuários')) {
    fwrite(STDERR, "VERIFY FAIL usuarios\n");
    exit(1);
}
$docs = file_get_contents($root . '/documentacoes/index.html');
if ($docs === false || !str_contains($docs, 'Documentações')) {
    fwrite(STDERR, "VERIFY FAIL documentacoes\n");
    exit(1);
}
echo "VERIFY OK\n";
