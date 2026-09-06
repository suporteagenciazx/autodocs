<?php
/** Smoke test: monta HTML nativo sem PDF real */
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/api/bootstrap.php';
require_once dirname(__DIR__, 2) . '/api/autodocs-pdf-native-lib.php';

$fields = autodocs_pdf_native_build_fields(['[GERENTE]', '[CLIENTE]', '[CNPJ]']);
$body1 = autodocs_pdf_native_text_to_html(
    "Garantia de Liberação\n\nPrezados, eu [GERENTE] confirmo liberação para [CLIENTE] CNPJ [CNPJ].",
    $fields
);
$body2 = autodocs_pdf_native_text_to_html(
    "Página final. Assinatura: [GERENTE]",
    $fields
);

$pagesHtml =
    "        <div class=\"pagina\" style=\"background-image:url(assets/mda.svg);background-size:cover;\">\n" .
    "            <div class=\"pagina-conteudo\"><div class=\"pagina-textos\">\n{$body1}            </div></div>\n" .
    "        </div>\n" .
    "        <div class=\"pagina\" style=\"background-image:none;background-color:#ffffff;\">\n" .
    "            <div class=\"pagina-conteudo\"><div class=\"pagina-textos\">\n{$body2}            </div></div>\n" .
    "        </div>\n";

$html = autodocs_pdf_native_build_html('Smoke PDF Nativo', 'smoke-pdf-nativo', $fields, $pagesHtml);
$js = autodocs_figma_build_inputs_js($fields);

$dir = AUTODOCS_ROOT . '/documentos/importados/smoke-pdf-nativo';
if (!is_dir($dir)) {
    mkdir($dir, 0775, true);
}
file_put_contents($dir . '/index.html', $html);
file_put_contents($dir . '/inputs.js', $js);
echo "OK fields=" . count($fields) . " dir=$dir\n";
echo (str_contains($html, 'id="cnpj"') ? "has cnpj span\n" : "MISSING cnpj\n");
echo (str_contains($js, "i-cnpj") ? "has i-cnpj\n" : "MISSING i-cnpj\n");
