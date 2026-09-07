<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/autodocs-figma-package-lib.php';

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

if ($title === '') {
    autodocs_json_response(400, ['error' => 'Informe o nome da documentação.']);
}

if (!isset($_FILES['package']) || !is_array($_FILES['package'])) {
    autodocs_json_response(400, ['error' => 'Envie o ficheiro ZIP com .fig e PNGs.']);
}

$file = $_FILES['package'];
$err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
if ($err !== UPLOAD_ERR_OK) {
    $messages = [
        UPLOAD_ERR_INI_SIZE => 'O ZIP excede o limite do servidor.',
        UPLOAD_ERR_FORM_SIZE => 'O ZIP excede o limite do formulário.',
        UPLOAD_ERR_PARTIAL => 'Upload incompleto.',
        UPLOAD_ERR_NO_FILE => 'Nenhum ficheiro enviado.',
    ];
    autodocs_json_response(400, ['error' => $messages[$err] ?? 'Falha no upload.']);
}

$tmp = (string) ($file['tmp_name'] ?? '');
$name = (string) ($file['name'] ?? '');
if ($tmp === '' || !is_uploaded_file($tmp)) {
    autodocs_json_response(400, ['error' => 'Upload inválido.']);
}

$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
if ($ext !== 'zip') {
    autodocs_json_response(400, ['error' => 'O pacote deve ser um ficheiro .zip.']);
}

try {
    $result = autodocs_figma_package_import($tmp, $title, $tagId !== '' ? $tagId : null, $newTagName !== '' ? $newTagName : null, $newTagColor !== '' ? $newTagColor : null);
    autodocs_json_response(200, [
        'ok' => true,
        'slug' => $result['slug'],
        'href' => $result['href'],
        'title' => $result['title'],
        'fieldsCount' => $result['fieldsCount'],
        'pagesCount' => $result['pagesCount'],
        'warnings' => $result['warnings'],
        'model' => $result['model'],
    ]);
} catch (InvalidArgumentException $e) {
    autodocs_json_response(400, ['error' => $e->getMessage()]);
} catch (RuntimeException $e) {
    autodocs_json_response(422, ['error' => $e->getMessage()]);
} catch (Throwable $e) {
    autodocs_json_response(500, ['error' => 'Falha ao importar o pacote Figma.']);
}
