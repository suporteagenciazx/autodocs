<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/autodocs-pdf-native-lib.php';

autodocs_send_security_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    autodocs_json_response(405, ['error' => 'Método não permitido.']);
}

try {
    $pdo = autodocs_pdo();
    autodocs_require_admin($pdo);
    autodocs_require_csrf();
} catch (Throwable $e) {
    autodocs_json_auth_error($e);
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
}

$title = isset($_POST['title']) ? trim((string) $_POST['title']) : '';
$tagId = isset($_POST['tagId']) ? trim((string) $_POST['tagId']) : '';
$newTagName = isset($_POST['newTagName']) ? trim((string) $_POST['newTagName']) : '';
$newTagColor = isset($_POST['newTagColor']) ? trim((string) $_POST['newTagColor']) : '';
$lastPageColor = isset($_POST['lastPageColor']) ? trim((string) $_POST['lastPageColor']) : '#ffffff';

if ($title === '') {
    autodocs_json_response(400, ['error' => 'Informe o nome da documentação.']);
}

if (!isset($_FILES['pdf']) || !is_array($_FILES['pdf'])) {
    autodocs_json_response(400, ['error' => 'Envie o ficheiro PDF.']);
}

$pdf = $_FILES['pdf'];
$err = (int) ($pdf['error'] ?? UPLOAD_ERR_NO_FILE);
if ($err !== UPLOAD_ERR_OK) {
    $messages = [
        UPLOAD_ERR_INI_SIZE => 'O PDF excede o limite do servidor.',
        UPLOAD_ERR_FORM_SIZE => 'O PDF excede o limite do formulário.',
        UPLOAD_ERR_PARTIAL => 'Upload incompleto.',
        UPLOAD_ERR_NO_FILE => 'Nenhum PDF enviado.',
    ];
    autodocs_json_response(400, ['error' => $messages[$err] ?? 'Falha no upload do PDF.']);
}

$tmp = (string) ($pdf['tmp_name'] ?? '');
$name = (string) ($pdf['name'] ?? '');
if ($tmp === '' || !is_uploaded_file($tmp)) {
    autodocs_json_response(400, ['error' => 'Upload de PDF inválido.']);
}
$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
if ($ext !== 'pdf') {
    autodocs_json_response(400, ['error' => 'O ficheiro deve ser .pdf.']);
}

$capaFile = isset($_FILES['capa']) && is_array($_FILES['capa']) ? $_FILES['capa'] : null;
$mdaFile = isset($_FILES['mda']) && is_array($_FILES['mda']) ? $_FILES['mda'] : null;

try {
    $result = autodocs_pdf_native_import([
        'title' => $title,
        'pdfTmp' => $tmp,
        'tagId' => $tagId !== '' ? $tagId : null,
        'newTagName' => $newTagName !== '' ? $newTagName : null,
        'newTagColor' => $newTagColor !== '' ? $newTagColor : null,
        'capaFile' => $capaFile,
        'mdaFile' => $mdaFile,
        'lastPageColor' => $lastPageColor,
    ]);
    autodocs_json_response(200, [
        'ok' => true,
        'slug' => $result['slug'],
        'href' => $result['href'],
        'title' => $result['title'],
        'fieldsCount' => $result['fieldsCount'],
        'pagesCount' => $result['pagesCount'],
        'warnings' => $result['warnings'],
        'placeholders' => $result['placeholders'],
        'model' => $result['model'],
    ]);
} catch (InvalidArgumentException $e) {
    autodocs_json_response(400, ['error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    autodocs_json_response(422, ['error' => $e->getMessage()]);
} catch (Throwable $e) {
    autodocs_json_response(500, ['error' => 'Falha ao importar o PDF.']);
}
