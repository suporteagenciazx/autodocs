-- AutoDocs: utilizadores, sessões, lotes de documentação e permissões
-- Charset recomendado para a base de dados: utf8mb4_unicode_ci

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS user_doc_access;
DROP TABLE IF EXISTS doc_batch_items;
DROP TABLE IF EXISTS doc_batches;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  id VARCHAR(128) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  ip VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(512) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE doc_batches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_doc_batches_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE doc_batch_items (
  batch_id INT UNSIGNED NOT NULL,
  catalog_doc_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (batch_id, catalog_doc_id),
  CONSTRAINT fk_batch_items_batch FOREIGN KEY (batch_id) REFERENCES doc_batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_doc_access (
  user_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, batch_id),
  CONSTRAINT fk_uda_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_uda_batch FOREIGN KEY (batch_id) REFERENCES doc_batches (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lote 1: todas as documentações do catálogo atual
INSERT INTO doc_batches (id, slug, name) VALUES
  (1, 'todos', 'Todas as documentações');

INSERT INTO doc_batch_items (batch_id, catalog_doc_id) VALUES
  (1, 'consulta'),
  (1, 'aprovacao'),
  (1, 'contrato'),
  (1, 'comprovante'),
  (1, 'termo'),
  (1, 'declaracao'),
  (1, 'ordem'),
  (1, 'garantia'),
  (1, 'aprovacao-daycoval'),
  (1, 'contrato-daycoval'),
  (1, 'comprovante-daycoval'),
  (1, 'termo-daycoval'),
  (1, 'declaracao-daycoval'),
  (1, 'ordem-daycoval'),
  (1, 'garantia-daycoval'),
  (1, 'tela-aprovacao-daycoval'),
  (1, 'magnus-laudo'),
  (1, 'valuation-aguia'),
  (1, 'orcamento-aguia'),
  (1, 'orcamento-magnus'),
  (1, 'lae-dvego'),
  (1, 'lae-dvego-magnus'),
  (1, 'nfe-magnus'),
  (1, 'nfe-aguia'),
  (1, 'recibo-magnus'),
  (1, 'recibo-aguia'),
  (1, 'tela-aprovacao'),
  (1, 'tela-auditoria-fiscal'),
  (1, 'varredura-expansao'),
  (1, 'cce-bacen'),
  (1, 'cdl-bacen'),
  (1, 'cce-aguia'),
  (1, 'cce-magnus'),
  (1, 'eve-aguia'),
  (1, 'eve-magnus');

-- Lote 2: exemplo “Sofisa” (subconjunto; ajuste os IDs conforme o teu catálogo)
INSERT INTO doc_batches (id, slug, name) VALUES
  (2, 'sofisa', 'Documentações Sofisa');

INSERT INTO doc_batch_items (batch_id, catalog_doc_id) VALUES
  (2, 'consulta'),
  (2, 'aprovacao'),
  (2, 'tela-aprovacao'),
  (2, 'contrato'),
  (2, 'comprovante');
