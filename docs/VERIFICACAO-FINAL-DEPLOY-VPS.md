# AutoDocs — Verificação Final + Deploy Docker VPS

**Data:** 2026-09-07  
**Branch de trabalho:** `dev`  
**Checkpoint restaurável:** `backup/pre-verificacao-final-20260907` @ `4c5b16f`

> **Guia para pessoa leiga (copiar e colar):** [`DEPLOY-VPS-PASSO-A-PASSO-LEIGO.md`](./DEPLOY-VPS-PASSO-A-PASSO-LEIGO.md)

---

## 1. Resumo executivo


| Item                | Estado                                                                     |
| ------------------- | -------------------------------------------------------------------------- |
| Pronto para deploy? | **Sim com ressalvas** — após smoke tests no domínio                        |
| Bloqueadores P0     | Corrigidos (install/registo com PIN; migração via «Gerar PINs em falta»)   |
| Decisão             | Subir para **VPS Docker de teste** → smoke no domínio → só depois produção |


### Como voltar ao estado anterior (se algo partir)

```bash
cd AutoDocsv7-docker
git fetch  # se aplicável
git reset --hard backup/pre-verificacao-final-20260907
# Working tree volta ao checkpoint «projeto concluído» pré-correções
docker compose up -d --build
```

Não faça `git push --force` em `dev`/`main` sem acordo explícito.

---

## 2. Achados e status

### P0 (bloqueava deploy) — corrigido


| ID       | Achado                              | Status                                                         |
| -------- | ----------------------------------- | -------------------------------------------------------------- |
| F01      | Install criava admin sem `pin_hash` | Corrigido — gera PIN e mostra uma vez                          |
| F02      | Registo sem PIN                     | Corrigido — gera PIN e mostra uma vez                          |
| Migração | Users importados sem PIN            | Botão **Usuários → Gerar PINs em falta** (`ensureMissingPins`) |


### P1 — corrigido


| ID  | Achado                                           | Status                                                                     |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| F03 | Idle lock só no cliente                          | Corrigido — `auth-session-lock.php` + `pin_ok` no static-gate / admin APIs |
| F04 | Env Secure/registo ignorados se config já existe | Corrigido — override em `autodocs_load_config()`                           |
| F05 | HTML admin público                               | Corrigido — rewrite → `api/app-gate.php`                                   |
| F06 | Sem CSRF                                         | Corrigido — header `X-AutoDocs-CSRF`                                       |
| F08 | Último admin removível                           | Corrigido — bloqueio em update/delete                                      |


### P2/P3 — aplicado / residual


| ID      | Achado                       | Status                                                    |
| ------- | ---------------------------- | --------------------------------------------------------- |
| F07     | Password morta no login      | UI install/cadastro sem password; hash residual aleatório |
| F09     | gitignore incompleto         | Atualizado (`security.json`, `_tmp`*, `sql/dumps/`)       |
| F10     | Sem CSP                      | `Content-Security-Policy-Report-Only`                     |
| F12     | Idle default 1 min           | Default **15 min**                                        |
| F11/F13 | CSS inline / tabela sessions | Dívida — não bloqueia go-live                             |


---

## 3. Plano autorizado (executado)

1. Checkpoint Git `backup/pre-verificacao-final-20260907`
2. P0 PIN install/registo + `ensureMissingPins`
3. P1 lock server-side, env override, app-gate HTML
4. P2 CSRF, último admin, gitignore, idle 15
5. P3 CSP Report-Only
6. Este documento

---

## 4. Checklist pré-deploy Docker VPS

### Pré-requisitos VPS

- [ ] Docker Engine + Compose plugin
- [ ] Domínio com DNS **A** apontando ao IP da VPS
- [ ] Reverse proxy TLS (Caddy/Nginx/Traefik) na frente do contentor `app`
- [ ] Portas 80/443 abertas; **não** expor MySQL/Redis publicamente

### Variáveis `.env` (produção — placeholders)

```env
APP_PORT=8088
MYSQL_DATABASE=autodocs
MYSQL_USER=autodocs_app
MYSQL_PASSWORD=***FORTE***
MYSQL_ROOT_PASSWORD=***FORTE***
AUTODOCS_REDIS_PREFIX=autodocs:
AUTODOCS_SESSION_COOKIE_SECURE=1
AUTODOCS_REGISTRATION_OPEN=0
AUTODOCS_FIGMA_TOKEN=
```

> `AUTODOCS_SESSION_COOKIE_SECURE=1` e `AUTODOCS_REGISTRATION_OPEN` são lidos em **runtime** (mesmo com `config.local.json` antigo).

### Não enviar para produção

- `_tmp`*, dumps SQL locais, `.env` de desenvolvimento
- `logins.txt`, logs, tokens Figma em texto no git
- Bind mount de código de desenvolvimento (preferir imagem buildada)

### Volumes / persistência

- `autodocs_db_data`, `autodocs_redis_data`
- `api/private/` (config, tags, theme, security, install.lock)

---

## 5. Procedimento de subida (passo a passo)

### 5.1 Sync do código

```bash
# Na VPS (exemplo)
cd /opt/autodocs   # ou pasta escolhida
# git clone / pull da branch validada OU rsync da pasta buildada
```

### 5.2 Ambiente

```bash
cp .env.example .env
# Editar passwords + AUTODOCS_SESSION_COOKIE_SECURE=1
```

### 5.3 Build e up

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

### 5.4 BD

- Stack nova: schema em `sql/schema.sql` via init do MySQL.
- Ou importar dump validado (sem expor o ficheiro via HTTP).

### 5.5 Install / PINs

1. Se BD vazia: abrir `https://SEU_DOMINIO/install/` → email → **anotar PIN**.
2. Se importou users: login admin que já tem PIN, ou:
  - Entrar com um admin que tenha PIN
  - **Usuários → Gerar PINs em falta** e guardar a lista.

### 5.6 Proxy TLS (exemplo Caddy)

```caddyfile
autodocs.exemplo.com {
    reverse_proxy 127.0.0.1:8088
}
```

Garantir que o cookie Secure chega ao browser (HTTPS terminado no proxy).

### 5.7 Smoke no contentor

```bash
docker compose exec app php -m | grep -E 'mbstring|redis|pdo_mysql'
docker compose exec redis redis-cli ping
curl -sI http://127.0.0.1:8088/login/ | head
curl -sI http://127.0.0.1:8088/api/private/config.local.json   # deve ser 403/denied
```

---

## 6. Plano de testes no domínio AutoDocs

Marcar pass/fail em HTTPS:

- [ ] HTTPS e redirect HTTP→HTTPS
- [ ] `/login/` carrega (logo/tema)
- [ ] Login admin com PIN
- [ ] Login user com PIN + só docs das tags
- [ ] Idle lock: após timeout, overlay; documento/`api` sensível responde 423 até unlock
- [ ] Unlock PIN (`auth-pin-verify`) e navegação OK
- [ ] Home / documentações / abrir 2–3 documentos críticos
- [ ] Admin: usuários, tags, segurança, configurações (HTML **não** acessível sem sessão)
- [ ] «Gerar PINs em falta» (se houver órfãos)
- [ ] Logout limpa sessão
- [ ] Registo público **fechado** (`REGISTRATION_OPEN=0`)
- [ ] `api/private/`* inacessível
- [ ] Mobile: login, hub, menu drawer (~375px)
- [ ] Headers: `X-Content-Type-Options`, CSP-Report-Only presentes

---

## 7. Rollback


| Cenário              | Ação                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| Código mau após pull | `git reset --hard backup/pre-verificacao-final-20260907` + rebuild    |
| BD corrompida        | Restaurar dump MySQL pré-deploy; volumes Docker                       |
| Só config            | Restaurar `api/private/config.local.json` / `security.json` do backup |
| Contentor            | `docker compose down` → imagem/tag anterior → `up -d`                 |


Backup recomendado **antes** do go-live:

```bash
docker compose exec db mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" autodocs > autodocs-pre-deploy-$(date +%F).sql
```

---

## 8. Critérios de go-live

Liberar domínio público só se **todos** estiverem verdes:

1. Login PIN admin + user OK
2. Documentos gated por permissão OK
3. Idle lock server-side OK
4. `api/private` negado OK
5. Cookie Secure em HTTPS OK
6. Registo fechado (salvo política contrária) OK
7. Nenhum P0 aberto

---

## 9. Ficheiros-chave desta rodada


| Área        | Ficheiros                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Auth/PIN    | `api/auth-login.php`, `install-bootstrap.php`, `auth-register.php`, `auth-pin-verify.php`, `auth-session-lock.php` |
| Sessão/CSRF | `api/bootstrap.php`, `scripts/autodocs-api.js`, `scripts/navdrawer.js`                                             |
| Gates       | `api/static-gate.php`, `api/app-gate.php`, `.htaccess`                                                             |
| Admin       | `api/admin-users.php`, `scripts/usuarios-page.js`                                                                  |
| Deploy      | `docker/entrypoint.sh`, `.env.example`, `.gitignore`                                                               |


---

## 10. Notas operacionais

- Login é **apenas email + PIN de 6 dígitos**.
- PIN em claro só na **criação** / **regeneração** / **ensureMissingPins**.
- Tabela SQL `sessions` existe no schema mas as sessões PHP usam **Redis** — normal.
- CSP está em **Report-Only**; endurecer para enforce só depois de validar a consola do browser.

