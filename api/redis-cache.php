<?php

declare(strict_types=1);

/**
 * Cliente Redis opcional (cache tags/tema). Sessões usam session.save_handler=redis via php.ini.
 */
function autodocs_redis(): ?Redis
{
    static $client = false; // false = ainda não tentou; null = indisponível; Redis = ok
    if ($client instanceof Redis) {
        return $client;
    }
    if ($client === null) {
        return null;
    }
    $client = null;
    if (!class_exists('Redis')) {
        return null;
    }
    try {
        $cfg = autodocs_load_config();
        $r = $cfg['redis'] ?? null;
        if (!is_array($r) || empty($r['host'])) {
            return null;
        }
        $redis = new Redis();
        $ok = @$redis->connect((string) $r['host'], (int) ($r['port'] ?? 6379), 1.5);
        if (!$ok) {
            return null;
        }
        $client = $redis;
        return $client;
    } catch (Throwable $e) {
        return null;
    }
}

function autodocs_redis_prefix(): string
{
    try {
        $cfg = autodocs_load_config();
        $p = $cfg['redis']['prefix'] ?? 'autodocs:';
        return is_string($p) && $p !== '' ? $p : 'autodocs:';
    } catch (Throwable $e) {
        return 'autodocs:';
    }
}

function autodocs_cache_get(string $key): ?string
{
    $redis = autodocs_redis();
    if (!$redis) {
        return null;
    }
    try {
        $v = $redis->get(autodocs_redis_prefix() . $key);
        return is_string($v) ? $v : null;
    } catch (Throwable $e) {
        return null;
    }
}

function autodocs_cache_set(string $key, string $value, int $ttlSeconds = 300): void
{
    $redis = autodocs_redis();
    if (!$redis) {
        return;
    }
    try {
        $redis->setex(autodocs_redis_prefix() . $key, max(1, $ttlSeconds), $value);
    } catch (Throwable $e) {
        /* ignore */
    }
}

function autodocs_cache_delete(string $key): void
{
    $redis = autodocs_redis();
    if (!$redis) {
        return;
    }
    try {
        $redis->del(autodocs_redis_prefix() . $key);
    } catch (Throwable $e) {
        /* ignore */
    }
}
