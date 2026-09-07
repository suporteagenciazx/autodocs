<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

autodocs_send_security_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    autodocs_json_response(405, ['error' => 'Método não permitido.']);
}

try {
    $pdo = autodocs_pdo();
    autodocs_require_unlocked($pdo);
} catch (Throwable $e) {
    autodocs_json_auth_error($e);
    autodocs_json_response(503, ['error' => 'Serviço indisponível.']);
}

$raw = isset($_GET['cnpj']) ? (string) $_GET['cnpj'] : '';
$digits = preg_replace('/\D+/', '', $raw) ?? '';
if (strlen($digits) !== 14) {
    autodocs_json_response(400, ['error' => 'CNPJ inválido. Informe 14 dígitos.']);
}

$url = 'https://api.opencnpj.org/' . $digits;

$body = false;
$code = 0;
if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: AutoDocs/7'],
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
} else {
    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\nUser-Agent: AutoDocs/7\r\n",
            'timeout' => 15,
            'ignore_errors' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $code = (int) $m[1];
    }
}

if ($body === false || $code === 0) {
    autodocs_json_response(502, ['error' => 'Não foi possível contactar a API OpenCNPJ.']);
}

$data = json_decode((string) $body, true);
if ($code === 404) {
    autodocs_json_response(404, ['error' => 'CNPJ não encontrado na base OpenCNPJ.']);
}
if ($code === 429) {
    autodocs_json_response(429, ['error' => 'Limite de consultas OpenCNPJ. Tente novamente em instantes.']);
}
if ($code !== 200 || !is_array($data)) {
    autodocs_json_response(502, ['error' => 'Resposta inválida da API OpenCNPJ.']);
}

autodocs_json_response(200, ['ok' => true, 'data' => $data]);
