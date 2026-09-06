#!/bin/bash
set -euo pipefail

PRIVATE_DIR="/var/www/html/api/private"
CONFIG_FILE="${PRIVATE_DIR}/config.local.json"

mkdir -p "${PRIVATE_DIR}"

seed_from_example() {
  local target="$1"
  local example="$2"
  if [[ ! -f "${target}" && -f "${example}" ]]; then
    cp "${example}" "${target}"
    echo "[autodocs] criado ${target} a partir do example"
  fi
}

seed_from_example "${PRIVATE_DIR}/tags.json" "${PRIVATE_DIR}/tags.example.json"
seed_from_example "${PRIVATE_DIR}/theme.json" "${PRIVATE_DIR}/theme.example.json"
seed_from_example "${PRIVATE_DIR}/user-doc-links.json" "${PRIVATE_DIR}/user-doc-links.example.json"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  export AUTODOCS_DB_HOST="${AUTODOCS_DB_HOST:-db}"
  export AUTODOCS_DB_PORT="${AUTODOCS_DB_PORT:-3306}"
  export AUTODOCS_DB_NAME="${AUTODOCS_DB_NAME:-autodocs}"
  export AUTODOCS_DB_USER="${AUTODOCS_DB_USER:-autodocs_app}"
  export AUTODOCS_DB_PASSWORD="${AUTODOCS_DB_PASSWORD:-changeme}"
  export AUTODOCS_REDIS_HOST="${AUTODOCS_REDIS_HOST:-redis}"
  export AUTODOCS_REDIS_PORT="${AUTODOCS_REDIS_PORT:-6379}"
  export AUTODOCS_REDIS_PREFIX="${AUTODOCS_REDIS_PREFIX:-autodocs:}"
  export AUTODOCS_SESSION_COOKIE_SECURE="${AUTODOCS_SESSION_COOKIE_SECURE:-0}"
  export AUTODOCS_REGISTRATION_OPEN="${AUTODOCS_REGISTRATION_OPEN:-0}"

  php -r '
$secure = in_array(strtolower((string)getenv("AUTODOCS_SESSION_COOKIE_SECURE")), ["1","true","yes"], true);
$reg = in_array(strtolower((string)getenv("AUTODOCS_REGISTRATION_OPEN")), ["1","true","yes"], true);
$cfg = [
  "db" => [
    "host" => (string)getenv("AUTODOCS_DB_HOST"),
    "port" => (int)getenv("AUTODOCS_DB_PORT"),
    "name" => (string)getenv("AUTODOCS_DB_NAME"),
    "user" => (string)getenv("AUTODOCS_DB_USER"),
    "password" => (string)getenv("AUTODOCS_DB_PASSWORD"),
  ],
  "redis" => [
    "host" => (string)getenv("AUTODOCS_REDIS_HOST"),
    "port" => (int)getenv("AUTODOCS_REDIS_PORT"),
    "prefix" => (string)getenv("AUTODOCS_REDIS_PREFIX"),
  ],
  "session_cookie_secure" => $secure,
  "registration_open" => $reg,
];
file_put_contents(getenv("AUTODOCS_CONFIG_OUT") ?: "/var/www/html/api/private/config.local.json",
  json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
'
  echo "[autodocs] gerado ${CONFIG_FILE} a partir das variáveis de ambiente"
fi

REDIS_HOST="${AUTODOCS_REDIS_HOST:-redis}"
REDIS_PORT="${AUTODOCS_REDIS_PORT:-6379}"
cat > /usr/local/etc/php/conf.d/zz-redis-session.ini <<EOF
session.save_handler=redis
session.save_path="tcp://${REDIS_HOST}:${REDIS_PORT}"
EOF

chown -R www-data:www-data "${PRIVATE_DIR}"
chmod 775 "${PRIVATE_DIR}"
find "${PRIVATE_DIR}" -type f -exec chmod 664 {} \; 2>/dev/null || true

IMPORTADOS_DIR="/var/www/html/documentos/importados"
mkdir -p "${IMPORTADOS_DIR}"
chown -R www-data:www-data "${IMPORTADOS_DIR}" 2>/dev/null || true
chmod 775 "${IMPORTADOS_DIR}" 2>/dev/null || true
find "${IMPORTADOS_DIR}" -type d -exec chmod 775 {} \; 2>/dev/null || true
find "${IMPORTADOS_DIR}" -type f -exec chmod 664 {} \; 2>/dev/null || true

exec "$@"
