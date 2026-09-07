<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/user-tag-links-lib.php';
require __DIR__ . '/autodocs-pin-lib.php';

header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    autodocs_json_response(405, ['error' => 'Método não permitido']);
    exit;
}

try {
    autodocs_load_config();
    $pdo = autodocs_pdo();
    autodocs_require_admin($pdo);
    autodocs_require_csrf();
} catch (Throwable $e) {
    autodocs_json_auth_error($e);
    if ($e instanceof RuntimeException && str_contains($e->getMessage(), 'config')) {
        autodocs_json_response(503, ['error' => $e->getMessage()]);
        exit;
    }
    autodocs_json_response(500, ['error' => 'Erro no servidor.']);
    exit;
}

$body = autodocs_read_json_body();
$action = isset($body['action']) ? (string) $body['action'] : '';

try {
    switch ($action) {
        case 'list':
            $rows = $pdo->query(
                'SELECT u.id, u.email, u.role, u.active, u.pin_hash,
                        GROUP_CONCAT(DISTINCT a.batch_id ORDER BY a.batch_id) AS batch_ids_csv
                 FROM users u
                 LEFT JOIN user_doc_access a ON a.user_id = u.id
                 GROUP BY u.id, u.email, u.role, u.active, u.pin_hash
                 ORDER BY u.id'
            )->fetchAll();
            require_once __DIR__ . '/autodocs-tags-lib.php';
            $tagsCatalog = autodocs_tags_load_merged()['tags'];
            $out = [];
            foreach ($rows as $r) {
                $batches = [];
                if (!empty($r['batch_ids_csv'])) {
                    foreach (explode(',', (string) $r['batch_ids_csv']) as $p) {
                        if ($p !== '') {
                            $batches[] = (int) $p;
                        }
                    }
                }
                $userId = (int) $r['id'];
                $tagIds = autodocs_user_tag_ids_for($userId);
                $tagLabels = autodocs_tag_labels_for_ids($tagIds, $tagsCatalog);
                $out[] = [
                    'id' => $userId,
                    'email' => (string) $r['email'],
                    'role' => (string) $r['role'],
                    'active' => (int) $r['active'],
                    'hasPin' => !empty($r['pin_hash']),
                    'batchIds' => $batches,
                    'tagIds' => $tagIds,
                    'tagLinkCount' => count($tagIds),
                    'tagLabels' => $tagLabels,
                    'hasLegacyBatches' => $batches !== [],
                ];
            }
            $batches = $pdo->query(
                'SELECT b.id, b.slug, b.name,
                        GROUP_CONCAT(i.catalog_doc_id ORDER BY i.catalog_doc_id SEPARATOR ",") AS doc_ids_csv
                 FROM doc_batches b
                 LEFT JOIN doc_batch_items i ON i.batch_id = b.id
                 GROUP BY b.id, b.slug, b.name
                 ORDER BY b.id'
            )->fetchAll();
            $batchMeta = [];
            foreach ($batches as $b) {
                $ids = [];
                if (!empty($b['doc_ids_csv'])) {
                    foreach (explode(',', (string) $b['doc_ids_csv']) as $d) {
                        if ($d !== '') {
                            $ids[] = $d;
                        }
                    }
                }
                $batchMeta[] = [
                    'id' => (int) $b['id'],
                    'slug' => (string) $b['slug'],
                    'name' => (string) $b['name'],
                    'catalogDocIds' => $ids,
                ];
            }
            autodocs_json_response(200, ['users' => $out, 'batches' => $batchMeta]);
            break;

        case 'create':
            $email = isset($body['email']) ? trim((string) $body['email']) : '';
            $role = isset($body['role']) && $body['role'] === 'admin' ? 'admin' : 'user';
            $batchIds = isset($body['batchIds']) && is_array($body['batchIds']) ? $body['batchIds'] : [];
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                autodocs_json_response(400, ['error' => 'Email inválido.']);
                exit;
            }
            $plainPin = autodocs_pin_generate();
            $pdo->beginTransaction();
            $hash = password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT);
            $pinHash = autodocs_pin_hash($plainPin);
            $st = $pdo->prepare(
                'INSERT INTO users (email, password_hash, pin_hash, pin_updated_at, role, active)
                 VALUES (?, ?, ?, NOW(), ?, 1)'
            );
            $st->execute([$email, $hash, $pinHash, $role]);
            $newId = (int) $pdo->lastInsertId();
            autodocs_admin_set_user_batches($pdo, $newId, $batchIds);
            $pdo->commit();
            autodocs_json_response(201, ['ok' => true, 'id' => $newId, 'pin' => $plainPin]);
            break;

        case 'update':
            $id = isset($body['id']) ? (int) $body['id'] : 0;
            if ($id <= 0) {
                autodocs_json_response(400, ['error' => 'id inválido.']);
                exit;
            }
            $stCur = $pdo->prepare('SELECT id, role, active FROM users WHERE id = ? LIMIT 1');
            $stCur->execute([$id]);
            $cur = $stCur->fetch();
            if (!$cur) {
                autodocs_json_response(404, ['error' => 'Utilizador não encontrado.']);
                exit;
            }
            $newRole = isset($body['role']) && in_array($body['role'], ['admin', 'user'], true)
                ? (string) $body['role']
                : (string) $cur['role'];
            $newActive = array_key_exists('active', $body)
                ? (int) (bool) $body['active']
                : (int) $cur['active'];
            $wasAdminActive = (string) $cur['role'] === 'admin' && (int) $cur['active'] === 1;
            $willBeAdminActive = $newRole === 'admin' && $newActive === 1;
            if ($wasAdminActive && !$willBeAdminActive) {
                $nAdmins = (int) $pdo->query(
                    "SELECT COUNT(*) FROM users WHERE role = 'admin' AND active = 1"
                )->fetchColumn();
                if ($nAdmins <= 1) {
                    autodocs_json_response(400, ['error' => 'Não pode remover o último administrador ativo.']);
                    exit;
                }
            }
            $pdo->beginTransaction();
            if (isset($body['email'])) {
                $em = trim((string) $body['email']);
                if ($em === '' || !filter_var($em, FILTER_VALIDATE_EMAIL)) {
                    $pdo->rollBack();
                    autodocs_json_response(400, ['error' => 'Email inválido.']);
                    exit;
                }
                $pdo->prepare('UPDATE users SET email = ? WHERE id = ?')->execute([$em, $id]);
            }
            if (isset($body['role']) && in_array($body['role'], ['admin', 'user'], true)) {
                $pdo->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$body['role'], $id]);
            }
            if (isset($body['active'])) {
                $pdo->prepare('UPDATE users SET active = ? WHERE id = ?')->execute([(int) (bool) $body['active'], $id]);
            }
            if (isset($body['batchIds']) && is_array($body['batchIds'])) {
                autodocs_admin_set_user_batches($pdo, $id, $body['batchIds']);
            }
            $pdo->commit();
            autodocs_json_response(200, ['ok' => true]);
            break;

        case 'regeneratePin':
            $id = isset($body['id']) ? (int) $body['id'] : 0;
            if ($id <= 0) {
                autodocs_json_response(400, ['error' => 'id inválido.']);
                exit;
            }
            $st = $pdo->prepare('SELECT id, email, role FROM users WHERE id = ? LIMIT 1');
            $st->execute([$id]);
            $row = $st->fetch();
            if (!$row) {
                autodocs_json_response(404, ['error' => 'Utilizador não encontrado.']);
                exit;
            }
            $plainPin = autodocs_pin_generate();
            $pinHash = autodocs_pin_hash($plainPin);
            $pdo->prepare('UPDATE users SET pin_hash = ?, pin_updated_at = NOW() WHERE id = ?')
                ->execute([$pinHash, $id]);
            autodocs_json_response(200, [
                'ok' => true,
                'id' => $id,
                'email' => (string) $row['email'],
                'pin' => $plainPin,
            ]);
            break;

        case 'ensureMissingPins':
            $rows = $pdo->query(
                'SELECT id, email FROM users WHERE pin_hash IS NULL OR pin_hash = \'\''
            )->fetchAll();
            $generated = [];
            $upd = $pdo->prepare('UPDATE users SET pin_hash = ?, pin_updated_at = NOW() WHERE id = ?');
            foreach ($rows as $r) {
                $plainPin = autodocs_pin_generate();
                $upd->execute([autodocs_pin_hash($plainPin), (int) $r['id']]);
                $generated[] = [
                    'id' => (int) $r['id'],
                    'email' => (string) $r['email'],
                    'pin' => $plainPin,
                ];
            }
            autodocs_json_response(200, [
                'ok' => true,
                'count' => count($generated),
                'users' => $generated,
                'message' => $generated === []
                    ? 'Todos os utilizadores já têm PIN.'
                    : 'PINs gerados. Guarde esta lista — só é mostrada uma vez.',
            ]);
            break;

        case 'delete':
            $id = isset($body['id']) ? (int) $body['id'] : 0;
            if ($id <= 0) {
                autodocs_json_response(400, ['error' => 'id inválido.']);
                exit;
            }
            $self = autodocs_session_user_id();
            if ($self === $id) {
                autodocs_json_response(400, ['error' => 'Não pode eliminar a sua própria conta.']);
                exit;
            }
            $stDel = $pdo->prepare('SELECT role, active FROM users WHERE id = ? LIMIT 1');
            $stDel->execute([$id]);
            $delRow = $stDel->fetch();
            if ($delRow && (string) $delRow['role'] === 'admin' && (int) $delRow['active'] === 1) {
                $nAdmins = (int) $pdo->query(
                    "SELECT COUNT(*) FROM users WHERE role = 'admin' AND active = 1"
                )->fetchColumn();
                if ($nAdmins <= 1) {
                    autodocs_json_response(400, ['error' => 'Não pode eliminar o último administrador ativo.']);
                    exit;
                }
            }
            $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
            autodocs_user_tag_links_remove_user($id);
            autodocs_json_response(200, ['ok' => true]);
            break;

        default:
            autodocs_json_response(400, ['error' => 'action desconhecida. Use list, create, update, regeneratePin, ensureMissingPins ou delete.']);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate')) {
        autodocs_json_response(409, ['error' => 'Email duplicado.']);
        exit;
    }
    autodocs_json_response(500, ['error' => 'Erro na base de dados.']);
}
