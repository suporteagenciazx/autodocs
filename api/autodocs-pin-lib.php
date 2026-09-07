<?php

declare(strict_types=1);

/**
 * Helpers de PIN (6 dígitos) para login e unlock.
 */

function autodocs_pin_generate(): string
{
    return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function autodocs_pin_normalize(?string $pin): string
{
    if ($pin === null) {
        return '';
    }
    $digits = preg_replace('/\D+/', '', $pin) ?? '';
    return $digits;
}

function autodocs_pin_valid(string $pin): bool
{
    return (bool) preg_match('/^\d{6}$/', $pin);
}

function autodocs_pin_hash(string $pin): string
{
    return password_hash($pin, PASSWORD_DEFAULT);
}

function autodocs_pin_verify(string $pin, ?string $hash): bool
{
    if ($hash === null || $hash === '' || !autodocs_pin_valid($pin)) {
        return false;
    }
    return password_verify($pin, $hash);
}
