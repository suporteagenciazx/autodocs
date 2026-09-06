<?php

declare(strict_types=1);

/**
 * Importação híbrida Figma → AutoDocs:
 * frames de página → PNG de fundo + campos dinâmicos (campo/* ou [PLACEHOLDER]).
 *
 * Rate limits Figma (desde nov/2025): GET /files, /nodes e /images = Tier 1.
 * - View/Collab ou ficheiro em Starter: ~20 pedidos/mês (por vezes menos)
 * - Dev/Full + ficheiro em Pro/Org/Enterprise: 10–20 pedidos/minuto
 * Docs: https://developers.figma.com/docs/rest-api/rate-limits/
 */

class AutodocsFigmaRateLimitException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $retryAfter = 60,
        public readonly ?string $planTier = null,
        public readonly ?string $rateLimitType = null,
        public readonly ?string $upgradeUrl = null
    ) {
        parent::__construct($message);
    }

    /** @return array<string, mixed> */
    public function toClientPayload(): array
    {
        return [
            'error' => $this->getMessage(),
            'rateLimited' => true,
            'retryAfter' => $this->retryAfter,
            'planTier' => $this->planTier,
            'rateLimitType' => $this->rateLimitType,
            'upgradeUrl' => $this->upgradeUrl,
        ];
    }
}

function autodocs_figma_rate_limit_message(?string $planTier, ?string $rateLimitType, int $retryAfter): string
{
    $wait = max(1, $retryAfter);
    $parts = [
        "Limite da API Figma atingido. Aguarde cerca de {$wait}s e tente de novo.",
    ];
    $tier = $planTier !== null ? strtolower($planTier) : '';
    $seat = $rateLimitType !== null ? strtolower($rateLimitType) : '';

    if ($tier === 'starter' || $seat === 'low') {
        $parts[] =
            'Para uso frequente precisa de seat Dev ou Full e o ficheiro tem de estar num plano Professional/Organization/Enterprise (não Starter). ' .
            'Ficheiros Starter ou seats View/Collab ficam com ~20 pedidos/mês no Tier 1 (ler ficheiro + exportar imagens).';
    } else {
        $parts[] =
            'Com Dev/Full em Pro+ o limite Tier 1 é 10–20 pedidos/minuto. Evite analisar várias vezes seguidas; o MCP/Cursor com o mesmo token também conta.';
    }

    return implode(' ', $parts);
}

function autodocs_figma_token(): ?string
{
    $env = getenv('AUTODOCS_FIGMA_TOKEN');
    if (is_string($env) && trim($env) !== '') {
        return trim($env);
    }
    $path = __DIR__ . '/private/config.local.json';
    if (!is_readable($path)) {
        return null;
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        return null;
    }
    $j = json_decode($raw, true);
    if (!is_array($j) || !isset($j['figma']) || !is_array($j['figma'])) {
        return null;
    }
    $t = $j['figma']['access_token'] ?? '';
    if (!is_string($t) || trim($t) === '') {
        return null;
    }
    return trim($t);
}

/**
 * @return array{fileKey: string, nodeId: string}
 */
function autodocs_figma_parse_url(string $url): array
{
    $url = trim($url);
    if ($url === '') {
        throw new InvalidArgumentException('Link do Figma em falta.');
    }
    $parts = parse_url($url);
    if ($parts === false || !isset($parts['host'])) {
        throw new InvalidArgumentException('Link do Figma inválido.');
    }
    $host = strtolower((string) $parts['host']);
    if (!str_contains($host, 'figma.com')) {
        throw new InvalidArgumentException('O link deve ser de figma.com.');
    }
    $path = $parts['path'] ?? '';
    if (!preg_match('#/(?:design|file|proto)/([A-Za-z0-9]+)#', $path, $m)) {
        throw new InvalidArgumentException('Não foi possível identificar o arquivo no link do Figma.');
    }
    $fileKey = $m[1];
    $nodeId = null;
    if (!empty($parts['query'])) {
        parse_str($parts['query'], $q);
        if (!empty($q['node-id']) && is_string($q['node-id'])) {
            $nodeId = str_replace('-', ':', rawurldecode($q['node-id']));
        }
    }
    if ($nodeId === null || $nodeId === '') {
        throw new InvalidArgumentException('Inclua no link o node-id da página ou frame (copie o link da página no Figma).');
    }
    return ['fileKey' => $fileKey, 'nodeId' => $nodeId];
}

/**
 * GET Figma API. Em 429: falha rápido (preview) ou espera Retry-After com teto (import).
 *
 * @param array{maxAttempts?: int, allowWait?: bool, maxWaitSeconds?: int} $opts
 * @return array{data: array, httpCode: int}
 */
function autodocs_figma_http_get_raw(string $url, string $token, array $opts = []): array
{
    $maxAttempts = max(1, (int) ($opts['maxAttempts'] ?? 3));
    $allowWait = (bool) ($opts['allowWait'] ?? false);
    $maxWaitSeconds = max(1, (int) ($opts['maxWaitSeconds'] ?? 70));
    $headers = ['X-Figma-Token: ' . $token, 'Accept: application/json'];
    $attempt = 0;
    $lastErr = '';
    $waited = 0;
    $lastRetryAfter = 60;
    $lastPlanTier = null;
    $lastRateType = null;
    $lastUpgrade = null;

    while ($attempt < $maxAttempts) {
        $attempt++;
        $retryAfter = 0;
        $planTier = null;
        $rateType = null;
        $upgradeUrl = null;
        $body = false;
        $code = 0;
        $respHeaders = [];

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_TIMEOUT => 120,
                CURLOPT_HEADERFUNCTION => static function ($ch, $headerLine) use (&$respHeaders) {
                    $len = strlen($headerLine);
                    $parts = explode(':', $headerLine, 2);
                    if (count($parts) === 2) {
                        $respHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                    }
                    return $len;
                },
            ]);
            $body = curl_exec($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $lastErr = curl_error($ch);
            curl_close($ch);
        } else {
            $ctx = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => implode("\r\n", $headers) . "\r\n",
                    'timeout' => 120,
                    'ignore_errors' => true,
                ],
            ]);
            $body = @file_get_contents($url, false, $ctx);
            $code = 0;
            if (isset($http_response_header) && is_array($http_response_header)) {
                if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $hm)) {
                    $code = (int) $hm[1];
                }
                foreach ($http_response_header as $h) {
                    $parts = explode(':', $h, 2);
                    if (count($parts) === 2) {
                        $respHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                    }
                }
            }
        }

        if (isset($respHeaders['retry-after'])) {
            $retryAfter = (int) $respHeaders['retry-after'];
        }
        if (isset($respHeaders['x-figma-plan-tier'])) {
            $planTier = (string) $respHeaders['x-figma-plan-tier'];
        }
        if (isset($respHeaders['x-figma-rate-limit-type'])) {
            $rateType = (string) $respHeaders['x-figma-rate-limit-type'];
        }
        if (isset($respHeaders['x-figma-upgrade-link'])) {
            $upgradeUrl = (string) $respHeaders['x-figma-upgrade-link'];
        }

        $lastBody = is_string($body) ? $body : '';

        if ($body === false) {
            if ($attempt >= $maxAttempts) {
                throw new RuntimeException('Falha ao contactar a API do Figma: ' . ($lastErr !== '' ? $lastErr : 'sem resposta'));
            }
            usleep(400000 * $attempt);
            continue;
        }

        if ($code === 429 || (is_string($lastBody) && stripos($lastBody, 'rate limit') !== false && $code !== 200)) {
            $lastRetryAfter = $retryAfter > 0 ? $retryAfter : 60;
            $lastPlanTier = $planTier;
            $lastRateType = $rateType;
            $lastUpgrade = $upgradeUrl;

            if (!$allowWait || $attempt >= $maxAttempts || $waited >= $maxWaitSeconds) {
                throw new AutodocsFigmaRateLimitException(
                    autodocs_figma_rate_limit_message($planTier, $rateType, $lastRetryAfter),
                    $lastRetryAfter,
                    $planTier,
                    $rateType,
                    $upgradeUrl
                );
            }

            $wait = $retryAfter > 0 ? $retryAfter : min(30, 2 ** $attempt);
            $wait = min($wait, max(1, $maxWaitSeconds - $waited));
            sleep($wait);
            $waited += $wait;
            continue;
        }

        $data = json_decode($lastBody, true);
        if ($code === 401 || $code === 403) {
            throw new RuntimeException('Token Figma inválido ou sem permissão para este arquivo.');
        }
        if ($code === 200 && is_array($data)) {
            return ['data' => $data, 'httpCode' => $code];
        }

        $msg = is_array($data) && isset($data['err']) ? (string) $data['err'] : 'Resposta inválida da API Figma (HTTP ' . $code . ').';
        throw new RuntimeException($msg);
    }

    throw new AutodocsFigmaRateLimitException(
        autodocs_figma_rate_limit_message($lastPlanTier, $lastRateType, $lastRetryAfter),
        $lastRetryAfter,
        $lastPlanTier,
        $lastRateType,
        $lastUpgrade
    );
}

/**
 * @param array{maxAttempts?: int, allowWait?: bool, maxWaitSeconds?: int} $opts
 */
function autodocs_figma_http_get(string $url, string $token, array $opts = []): array
{
    $raw = autodocs_figma_http_get_raw($url, $token, $opts);
    return $raw['data'];
}

function autodocs_figma_cache_dir(): string
{
    return __DIR__ . '/private/cache/figma';
}

function autodocs_figma_cache_path(string $fileKey, string $nodeId): string
{
    $key = hash('sha256', $fileKey . '|' . $nodeId);
    return autodocs_figma_cache_dir() . '/' . $key . '.json';
}

/**
 * @param array<string, mixed> $document
 */
function autodocs_figma_cache_store(string $fileKey, string $nodeId, array $document, string $title): void
{
    $dir = autodocs_figma_cache_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        return;
    }
    $payload = [
        'storedAt' => time(),
        'fileKey' => $fileKey,
        'nodeId' => $nodeId,
        'title' => $title,
        'document' => $document,
    ];
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return;
    }
    @file_put_contents(autodocs_figma_cache_path($fileKey, $nodeId), $json, LOCK_EX);
}

/**
 * @return array{document: array, title: string}|null
 */
function autodocs_figma_cache_load(string $fileKey, string $nodeId, int $ttlSeconds = 900): ?array
{
    $path = autodocs_figma_cache_path($fileKey, $nodeId);
    if (!is_readable($path)) {
        return null;
    }
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') {
        return null;
    }
    $j = json_decode($raw, true);
    if (!is_array($j) || !isset($j['document']) || !is_array($j['document'])) {
        return null;
    }
    $storedAt = isset($j['storedAt']) ? (int) $j['storedAt'] : 0;
    if ($storedAt <= 0 || (time() - $storedAt) > $ttlSeconds) {
        @unlink($path);
        return null;
    }
    return [
        'document' => $j['document'],
        'title' => isset($j['title']) && is_string($j['title']) ? $j['title'] : 'Modelo Figma',
    ];
}

/**
 * @param array{maxAttempts?: int, allowWait?: bool, maxWaitSeconds?: int} $opts
 */
function autodocs_figma_fetch_node(string $fileKey, string $nodeId, string $token, array $opts = []): array
{
    $encodedId = rawurlencode($nodeId);
    $url = 'https://api.figma.com/v1/files/' . rawurlencode($fileKey) . '/nodes?ids=' . $encodedId . '&geometry=paths';
    $data = autodocs_figma_http_get($url, $token, $opts);
    $nodes = $data['nodes'] ?? [];
    if (!is_array($nodes) || !isset($nodes[$nodeId])) {
        throw new RuntimeException('Nó não encontrado no Figma. Verifique o node-id no link.');
    }
    $doc = $nodes[$nodeId]['document'] ?? null;
    if (!is_array($doc)) {
        throw new RuntimeException('Estrutura do nó Figma inválida.');
    }
    return $doc;
}

/**
 * @param list<string> $nodeIds
 * @param array{maxAttempts?: int, allowWait?: bool, maxWaitSeconds?: int} $opts
 * @return array<string, string> nodeId => image URL
 */
function autodocs_figma_export_image_urls(string $fileKey, array $nodeIds, string $token, float $scale = 2.0, array $opts = []): array
{
    $nodeIds = array_values(array_unique(array_filter($nodeIds, static fn($id) => is_string($id) && $id !== '')));
    if ($nodeIds === []) {
        return [];
    }
    $ids = implode(',', array_map('rawurlencode', $nodeIds));
    $url = 'https://api.figma.com/v1/images/' . rawurlencode($fileKey)
        . '?ids=' . $ids
        . '&format=png'
        . '&scale=' . rawurlencode((string) $scale);
    $data = autodocs_figma_http_get($url, $token, $opts !== [] ? $opts : [
        'maxAttempts' => 3,
        'allowWait' => true,
        'maxWaitSeconds' => 70,
    ]);
    $images = $data['images'] ?? [];
    if (!is_array($images)) {
        throw new RuntimeException('A API de imagens do Figma não devolveu resultados.');
    }
    $out = [];
    foreach ($nodeIds as $id) {
        if (!empty($images[$id]) && is_string($images[$id])) {
            $out[$id] = $images[$id];
        }
    }
    return $out;
}

function autodocs_figma_download_binary(string $url): string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 120,
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false || $code >= 400) {
            throw new RuntimeException('Falha ao descarregar imagem exportada do Figma.');
        }
        return $body;
    }
    $body = @file_get_contents($url);
    if ($body === false) {
        throw new RuntimeException('Falha ao descarregar imagem exportada do Figma.');
    }
    return $body;
}

function autodocs_figma_slugify(string $text): string
{
    $s = mb_strtolower(trim($text), 'UTF-8');
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
    $s = trim($s, '-');
    if ($s === '') {
        $s = 'modelo';
    }
    return substr($s, 0, 48);
}

function autodocs_figma_field_id_from_placeholder(string $placeholder): string
{
    $inner = trim($placeholder, '[]');
    $s = mb_strtolower($inner, 'UTF-8');
    $s = str_replace(
        ['ã', 'á', 'à', 'â', 'ä', 'é', 'è', 'ê', 'ë', 'í', 'ì', 'î', 'ï', 'ó', 'ò', 'ô', 'ö', 'ú', 'ù', 'û', 'ü', 'ç', 'ñ'],
        ['a', 'a', 'a', 'a', 'a', 'e', 'e', 'e', 'e', 'i', 'i', 'i', 'i', 'o', 'o', 'o', 'o', 'u', 'u', 'u', 'u', 'c', 'n'],
        $s
    );
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    $s = trim($s, '-');
    return $s !== '' ? $s : 'campo';
}

function autodocs_figma_label_from_key(string $key): string
{
    $s = trim(str_replace(['-', '_'], ' ', $key));
    if ($s === '') {
        return 'Campo';
    }
    return mb_convert_case($s, MB_CASE_TITLE, 'UTF-8');
}

/**
 * @return array{w: float, h: float}
 */
function autodocs_figma_node_size(array $node): array
{
    $box = $node['absoluteBoundingBox'] ?? null;
    if (is_array($box) && isset($box['width'], $box['height'])) {
        return ['w' => (float) $box['width'], 'h' => (float) $box['height']];
    }
    return ['w' => 0.0, 'h' => 0.0];
}

function autodocs_figma_looks_like_page_frame(array $node): bool
{
    $type = (string) ($node['type'] ?? '');
    if ($type !== 'FRAME' && $type !== 'COMPONENT' && $type !== 'INSTANCE') {
        return false;
    }
    $name = trim((string) ($node['name'] ?? ''));
    if (preg_match('#^(?:pagina|página|page|folha|capa)(/|\\s|$)#iu', $name)) {
        return true;
    }
    $size = autodocs_figma_node_size($node);
    // A4-ish (portrait) in Figma points (~794×1123 at 96dpi)
    if ($size['w'] >= 500 && $size['h'] >= 700 && $size['h'] > $size['w'] * 1.15) {
        return true;
    }
    return false;
}

function autodocs_figma_page_sort_key(string $name): array
{
    if (preg_match('#^(?:capa)#iu', $name)) {
        return [0, 0, mb_strtolower($name, 'UTF-8')];
    }
    if (preg_match('#(?:pagina|página|page|folha)\\s*/?\\s*(\\d+)#iu', $name, $m)) {
        return [1, (int) $m[1], mb_strtolower($name, 'UTF-8')];
    }
    return [2, 0, mb_strtolower($name, 'UTF-8')];
}

/**
 * Descobre frames de página a partir do nó do link.
 *
 * @return list<array{id: string, name: string, node: array<string, mixed>, isCapa: bool, width: float, height: float}>
 */
function autodocs_figma_discover_pages(array $rootNode): array
{
    $type = (string) ($rootNode['type'] ?? '');
    $rootId = (string) ($rootNode['id'] ?? '');
    $rootName = trim((string) ($rootNode['name'] ?? 'Documento'));
    $candidates = [];

    $children = is_array($rootNode['children'] ?? null) ? $rootNode['children'] : [];

    // Prefer named page frames among children
    foreach ($children as $child) {
        if (!is_array($child)) {
            continue;
        }
        if (autodocs_figma_looks_like_page_frame($child)) {
            $size = autodocs_figma_node_size($child);
            $name = trim((string) ($child['name'] ?? 'Página'));
            $candidates[] = [
                'id' => (string) ($child['id'] ?? ''),
                'name' => $name,
                'node' => $child,
                'isCapa' => (bool) preg_match('#^capa#iu', $name),
                'width' => $size['w'],
                'height' => $size['h'],
            ];
        }
    }

    // If root itself is a page frame and no children matched
    if ($candidates === [] && autodocs_figma_looks_like_page_frame($rootNode)) {
        $size = autodocs_figma_node_size($rootNode);
        $candidates[] = [
            'id' => $rootId,
            'name' => $rootName !== '' ? $rootName : 'Página 1',
            'node' => $rootNode,
            'isCapa' => (bool) preg_match('#^capa#iu', $rootName),
            'width' => $size['w'],
            'height' => $size['h'],
        ];
    }

    // CANVAS / SECTION: all FRAME children as pages if still empty
    if ($candidates === [] && ($type === 'CANVAS' || $type === 'SECTION')) {
        foreach ($children as $child) {
            if (!is_array($child)) {
                continue;
            }
            $ctype = (string) ($child['type'] ?? '');
            if ($ctype !== 'FRAME' && $ctype !== 'COMPONENT' && $ctype !== 'INSTANCE') {
                continue;
            }
            $size = autodocs_figma_node_size($child);
            $name = trim((string) ($child['name'] ?? 'Página'));
            $candidates[] = [
                'id' => (string) ($child['id'] ?? ''),
                'name' => $name,
                'node' => $child,
                'isCapa' => (bool) preg_match('#^capa#iu', $name),
                'width' => $size['w'],
                'height' => $size['h'],
            ];
        }
    }

    // Last resort: treat root as single page
    if ($candidates === []) {
        $size = autodocs_figma_node_size($rootNode);
        $candidates[] = [
            'id' => $rootId,
            'name' => $rootName !== '' ? $rootName : 'Página 1',
            'node' => $rootNode,
            'isCapa' => false,
            'width' => $size['w'],
            'height' => $size['h'],
        ];
    }

    $candidates = array_values(array_filter($candidates, static fn($p) => $p['id'] !== ''));

    usort($candidates, static function ($a, $b) {
        $ka = autodocs_figma_page_sort_key($a['name']);
        $kb = autodocs_figma_page_sort_key($b['name']);
        return $ka <=> $kb;
    });

    return $candidates;
}

/**
 * @param list<array{inputId: string, targetId: string, originalText: string, label: string}> $fields
 */
function autodocs_figma_register_field(array &$fields, array &$seen, string $placeholder, ?string $label = null): string
{
    $original = '[' . trim($placeholder, '[]') . ']';
    if (isset($seen[$original])) {
        return $seen[$original];
    }
    $baseId = autodocs_figma_field_id_from_placeholder($original);
    $targetId = $baseId;
    $n = 2;
    while (in_array($targetId, array_column($fields, 'targetId'), true)) {
        $targetId = $baseId . '-' . $n;
        $n++;
    }
    $fields[] = [
        'inputId' => 'i-' . $targetId,
        'targetId' => $targetId,
        'originalText' => $original,
        'label' => $label !== null && $label !== '' ? $label : trim($placeholder, '[]'),
    ];
    $seen[$original] = $targetId;
    return $targetId;
}

/**
 * Extrai campos de um frame (layers campo/* ou [PLACEHOLDER] no texto).
 *
 * @return list<array{inputId: string, targetId: string, originalText: string, label: string, x?: float, y?: float, w?: float, h?: float}>
 */
function autodocs_figma_extract_fields_from_node(array $node, array &$globalFields, array &$seen, ?array $pageBox = null): array
{
    $pageFields = [];
    $pageBox = $pageBox ?? ($node['absoluteBoundingBox'] ?? null);
    $px = is_array($pageBox) ? (float) ($pageBox['x'] ?? 0) : 0.0;
    $py = is_array($pageBox) ? (float) ($pageBox['y'] ?? 0) : 0.0;
    $pw = is_array($pageBox) ? (float) ($pageBox['width'] ?? 1) : 1.0;
    $ph = is_array($pageBox) ? (float) ($pageBox['height'] ?? 1) : 1.0;
    if ($pw <= 0) {
        $pw = 1.0;
    }
    if ($ph <= 0) {
        $ph = 1.0;
    }

    $walk = static function (array $n) use (&$walk, &$globalFields, &$seen, &$pageFields, $px, $py, $pw, $ph): void {
        $type = (string) ($n['type'] ?? '');
        $name = trim((string) ($n['name'] ?? ''));
        $box = $n['absoluteBoundingBox'] ?? null;

        $pushPos = static function (string $targetId) use (&$pageFields, $box, $px, $py, $pw, $ph): void {
            if (!is_array($box)) {
                return;
            }
            $pageFields[] = [
                'targetId' => $targetId,
                'leftPct' => max(0, min(100, (((float) $box['x'] - $px) / $pw) * 100)),
                'topPct' => max(0, min(100, (((float) $box['y'] - $py) / $ph) * 100)),
                'widthPct' => max(1, min(100, ((float) $box['width'] / $pw) * 100)),
                'heightPct' => max(0.5, min(20, ((float) $box['height'] / $ph) * 100)),
            ];
        };

        if ($type === 'TEXT') {
            $chars = (string) ($n['characters'] ?? '');
            if (preg_match('#^(?:campo|var|field)/(.+)$#iu', $name, $m)) {
                $key = autodocs_figma_field_id_from_placeholder($m[1]);
                $label = autodocs_figma_label_from_key($m[1]);
                $placeholder = mb_strtoupper(str_replace('-', ' ', $key), 'UTF-8');
                $targetId = autodocs_figma_register_field($globalFields, $seen, $placeholder, $label);
                $pushPos($targetId);
            } elseif (preg_match_all('/\[([^\]]+)\]/u', $chars, $mm)) {
                foreach ($mm[1] as $inner) {
                    $targetId = autodocs_figma_register_field($globalFields, $seen, $inner);
                    $pushPos($targetId);
                }
            }
        }

        foreach ($n['children'] ?? [] as $child) {
            if (is_array($child)) {
                $walk($child);
            }
        }
    };

    $walk($node);
    return $pageFields;
}

/**
 * @param list<array{inputId: string, targetId: string, originalText: string, label: string}> $fields
 */
function autodocs_figma_build_inputs_js(array $fields): string
{
    $lines = [];
    foreach ($fields as $f) {
        $lines[] = "        { inputId: '" . addslashes($f['inputId']) . "', targetId: '" . addslashes($f['targetId']) . "', originalText: '" . addslashes($f['originalText']) . "' },";
    }
    $config = implode("\n", $lines);
    return <<<JS
document.addEventListener('DOMContentLoaded', () => {
    const configurations = [
{$config}
    ];

    configurations.forEach(config => {
        const inputElement = document.getElementById(config.inputId);
        const targetElements = document.querySelectorAll('[id="' + config.targetId + '"], [data-field-id="' + config.targetId + '"]');
        if (!inputElement || !targetElements.length) return;

        targetElements.forEach(targetElement => {
            targetElement.textContent = config.originalText;
        });

        inputElement.addEventListener('input', () => {
            const value = inputElement.value.trim() === '' ? config.originalText : inputElement.value;
            targetElements.forEach(targetElement => {
                targetElement.textContent = value;
            });
        });
    });
});

JS;
}

/**
 * @param list<array{inputId: string, targetId: string, originalText: string, label: string}> $fields
 * @param list<array{kind: string, name: string, asset?: string, overlays?: list<array{targetId: string, leftPct: float, topPct: float, widthPct: float, heightPct: float}>, originalTexts?: array<string, string>}> $pages
 */
function autodocs_figma_build_hybrid_html(string $title, string $slug, array $fields, array $pages): string
{
    $escTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $formFields = '';
    foreach ($fields as $f) {
        $label = htmlspecialchars($f['label'], ENT_QUOTES, 'UTF-8');
        $inputId = htmlspecialchars($f['inputId'], ENT_QUOTES, 'UTF-8');
        $formFields .= <<<HTML
                        <div class="campo selo-opcao">
                            <div class="label">
                                <label class="label-campo" for="{$inputId}">{$label}</label>
                            </div>
                            <input class="input" id="{$inputId}" type="text" placeholder="{$label}">
                        </div>

HTML;
    }
    if ($formFields === '') {
        $formFields = "                        <p class=\"campo-texto\">Nenhum campo dinâmico detectado. No Figma use layers <code>campo/nome</code> ou texto <code>[PLACEHOLDER]</code>.</p>\n";
    }

    $pagesHtml = '';
    foreach ($pages as $i => $page) {
        $kind = $page['kind'] ?? 'pagina';
        $asset = htmlspecialchars((string) ($page['asset'] ?? ''), ENT_QUOTES, 'UTF-8');
        $pageName = htmlspecialchars((string) ($page['name'] ?? ('Página ' . ($i + 1))), ENT_QUOTES, 'UTF-8');
        $class = $kind === 'capa' ? 'capa capa--figma-hybrid' : 'pagina pagina--figma-hybrid';
        $overlays = '';
        foreach ($page['overlays'] ?? [] as $ov) {
            $tid = htmlspecialchars((string) $ov['targetId'], ENT_QUOTES, 'UTF-8');
            $left = number_format((float) $ov['leftPct'], 3, '.', '');
            $top = number_format((float) $ov['topPct'], 3, '.', '');
            $w = number_format((float) $ov['widthPct'], 3, '.', '');
            $h = number_format((float) $ov['heightPct'], 3, '.', '');
            $orig = htmlspecialchars((string) ($page['originalTexts'][$ov['targetId']] ?? '[' . strtoupper($ov['targetId']) . ']'), ENT_QUOTES, 'UTF-8');
            $overlays .= <<<HTML
            <span class="figma-field-overlay" id="{$tid}" data-field-id="{$tid}" style="left:{$left}%;top:{$top}%;width:{$w}%;min-height:{$h}%;">{$orig}</span>

HTML;
        }
        $pagesHtml .= <<<HTML
        <div class="{$class}" data-page-name="{$pageName}">
            <img class="figma-page-bg" src="{$asset}" alt="{$pageName}" draggable="false">
            <div class="figma-page-overlays">
{$overlays}            </div>
        </div>

HTML;
    }

    if ($pagesHtml === '') {
        $pagesHtml = "        <div class=\"pagina\"><div class=\"pagina-conteudo\"><p>Sem páginas exportadas.</p></div></div>\n";
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
    <script src="./inputs.js"></script>
    <script src="../../scripts/titulo.js"></script>
    <script src="../../scripts/selo-digital.js"></script>
    <script src="../../scripts/exportar.js?v=3"></script>
    <script src="../../scripts/impressao.js?v=3"></script>
</body>

</html>
HTML;
}

/**
 * Preview: lista páginas + miniaturas temporárias da API Figma.
 *
 * @return array{title: string, fileKey: string, nodeId: string, pages: list<array{id: string, name: string, isCapa: bool, width: float, height: float, fieldsCount: int, previewUrl: string|null}>}
 */
function autodocs_figma_preview(string $figmaUrl): array
{
    $token = autodocs_figma_token();
    if ($token === null) {
        throw new RuntimeException('Token Figma não configurado.');
    }
    $parsed = autodocs_figma_parse_url($figmaUrl);
    // Preview: 1 pedido, sem sleep em 429 (evita UI presa em "A analisar…").
    $root = autodocs_figma_fetch_node($parsed['fileKey'], $parsed['nodeId'], $token, [
        'maxAttempts' => 1,
        'allowWait' => false,
    ]);
    $title = trim((string) ($root['name'] ?? 'Modelo Figma'));
    if ($title === '') {
        $title = 'Modelo Figma';
    }
    // Cacheia a árvore para o import não repetir GET /nodes (economiza 1 pedido Tier 1).
    autodocs_figma_cache_store($parsed['fileKey'], $parsed['nodeId'], $root, $title);

    $pages = autodocs_figma_discover_pages($root);
    // Não exportar miniaturas no preview — a API /images esgota o rate limit
    // antes do "Importar e montar". As thumbs são opcionais na UI.

    $outPages = [];
    foreach ($pages as $p) {
        $tmpFields = [];
        $tmpSeen = [];
        $overlays = autodocs_figma_extract_fields_from_node($p['node'], $tmpFields, $tmpSeen, $p['node']['absoluteBoundingBox'] ?? null);
        $outPages[] = [
            'id' => $p['id'],
            'name' => $p['name'],
            'isCapa' => $p['isCapa'],
            'width' => $p['width'],
            'height' => $p['height'],
            'fieldsCount' => count($tmpFields),
            'overlayCount' => count($overlays),
            'previewUrl' => null,
            'selected' => true,
        ];
    }

    return [
        'title' => $title,
        'fileKey' => $parsed['fileKey'],
        'nodeId' => $parsed['nodeId'],
        'pages' => $outPages,
        'fromCache' => false,
    ];
}

function autodocs_figma_ensure_writable_dir(string $dir): void
{
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('Não foi possível criar a pasta: ' . $dir);
    }
    @chmod($dir, 0775);
    if (!is_writable($dir)) {
        throw new RuntimeException(
            'Pasta sem permissão de escrita: ' . $dir .
            '. No Docker, confirme o volume documentos/importados e reinicie o contentor.'
        );
    }
}

function autodocs_figma_write_file(string $path, string $contents): void
{
    $dir = dirname($path);
    autodocs_figma_ensure_writable_dir($dir);

    // Se o ficheiro existe mas não é gravável (ex.: criado como root), tentar corrigir.
    if (file_exists($path) && !is_writable($path)) {
        @chmod($path, 0664);
        if (!is_writable($path)) {
            @unlink($path);
        }
    }

    $ok = @file_put_contents($path, $contents, LOCK_EX);
    if ($ok === false) {
        // Retry sem LOCK_EX (alguns volumes Windows falham com lock exclusivo)
        $ok = @file_put_contents($path, $contents);
    }
    if ($ok === false) {
        throw new RuntimeException(
            'Não foi possível gravar ' . basename($path) .
            '. Verifique permissões em documentos/importados/.'
        );
    }
    @chmod($path, 0664);
}

/**
 * @param list<string>|null $selectedPageIds
 * @return array{slug: string, href: string, title: string, fieldsCount: int, pagesCount: int, model: array<string, mixed>}
 */
function autodocs_figma_import_to_document(
    string $figmaUrl,
    ?string $titleOverride = null,
    ?string $tagId = null,
    ?array $selectedPageIds = null
): array {
    $token = autodocs_figma_token();
    if ($token === null) {
        throw new RuntimeException('Token Figma não configurado. Defina figma.access_token em api/private/config.local.json ou AUTODOCS_FIGMA_TOKEN no .env.');
    }
    $parsed = autodocs_figma_parse_url($figmaUrl);
    $cached = autodocs_figma_cache_load($parsed['fileKey'], $parsed['nodeId']);
    if ($cached !== null) {
        $root = $cached['document'];
        $title = $titleOverride && trim($titleOverride) !== ''
            ? trim($titleOverride)
            : $cached['title'];
    } else {
        $root = autodocs_figma_fetch_node($parsed['fileKey'], $parsed['nodeId'], $token, [
            'maxAttempts' => 2,
            'allowWait' => true,
            'maxWaitSeconds' => 65,
        ]);
        $title = $titleOverride && trim($titleOverride) !== ''
            ? trim($titleOverride)
            : trim((string) ($root['name'] ?? 'Modelo Figma'));
        autodocs_figma_cache_store($parsed['fileKey'], $parsed['nodeId'], $root, $title !== '' ? $title : 'Modelo Figma');
    }
    if ($title === '') {
        $title = 'Modelo Figma';
    }

    $pages = autodocs_figma_discover_pages($root);
    if (is_array($selectedPageIds) && $selectedPageIds !== []) {
        $want = array_fill_keys($selectedPageIds, true);
        $pages = array_values(array_filter($pages, static fn($p) => isset($want[$p['id']])));
    }
    if ($pages === []) {
        throw new RuntimeException('Nenhuma página/frame selecionada para importar.');
    }

    $slug = autodocs_figma_slugify($title);
    $rootDir = AUTODOCS_ROOT . '/documentos/importados';
    autodocs_figma_ensure_writable_dir($rootDir);
    $dir = $rootDir . '/' . $slug;
    autodocs_figma_ensure_writable_dir($dir);
    $assetsDir = $dir . '/assets';
    autodocs_figma_ensure_writable_dir($assetsDir);

    $ids = array_column($pages, 'id');
    // Só /images aqui se o preview já cacheou /nodes (1 pedido Tier 1 em vez de 2).
    $imageUrls = autodocs_figma_export_image_urls($parsed['fileKey'], $ids, $token, 2.0, [
        'maxAttempts' => 3,
        'allowWait' => true,
        'maxWaitSeconds' => 70,
    ]);
    if ($imageUrls === []) {
        throw new RuntimeException('Não foi possível exportar as imagens dos frames do Figma.');
    }

    $globalFields = [];
    $seen = [];
    $builtPages = [];
    $pageIndex = 0;

    foreach ($pages as $p) {
        $pageIndex++;
        $imgUrl = $imageUrls[$p['id']] ?? null;
        if ($imgUrl === null) {
            continue;
        }
        // Descarregar PNGs com pequeno intervalo — evita rajadas no CDN/API.
        if ($pageIndex > 1) {
            usleep(250000);
        }
        $bin = autodocs_figma_download_binary($imgUrl);
        $fileName = ($p['isCapa'] ? 'capa' : 'pagina-' . $pageIndex) . '.png';
        $relAsset = 'assets/' . $fileName;
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
            'kind' => $p['isCapa'] ? 'capa' : 'pagina',
            'name' => $p['name'],
            'asset' => $relAsset,
            'overlays' => $overlaysRaw,
            'originalTexts' => $originalTexts,
        ];
    }

    if ($builtPages === []) {
        throw new RuntimeException('Nenhuma página foi exportada com sucesso.');
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
        'model' => [
            'id' => 'designer-' . $slug,
            'title' => $title,
            'blurb' => 'Importado do Figma · ' . count($builtPages) . ' página(s) · ' . count($globalFields) . ' campo(s).',
            'href' => $href,
            'source' => 'figma',
            'tagId' => $tagId ?? '',
            'figmaUrl' => $figmaUrl,
            'figmaFileKey' => $parsed['fileKey'],
            'figmaNodeId' => $parsed['nodeId'],
            'updatedAt' => gmdate('c'),
        ],
    ];
}
