# AutoDocs — Docker (cópia de teste)

Guia único para correr esta cópia **só com Docker** (PHP + Apache + MySQL + Redis).  
XAMPP **não** faz parte deste fluxo.

URL local: **http://localhost:8088/** (padrão deste `.env.example`; altere `APP_PORT` se preferir outra)

> Esta pasta é uma **cópia isolada** (`AutoDocsv7-docker`). Não faça `git push` nem deploy na VPS de produção Apache a partir daqui, até validar.

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) ou Docker Engine + Compose (Linux)
- Portas livres: **8088** (HTTP padrão deste exemplo; configurável via `APP_PORT`), MySQL/Redis só na rede Docker

---

## Arranque local (passos exatos)

```bash
# 1) Na raiz desta cópia
cd AutoDocsv7-docker

# 2) Variáveis de ambiente (passwords locais)
cp .env.example .env
# Edite .env se quiser (MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD, APP_PORT)

# 3) Build + up
docker compose up -d --build

# 4) Ver logs do app (opcional)
docker compose logs -f app
```

Abra no browser: **http://localhost:8088/** (ou a porta definida em `APP_PORT`)

### Navegador do Cursor / porta errada

Nesta máquina o AutoDocs Docker usa **`APP_PORT=8088`** (ver `.env`). A porta **8080** costuma estar ocupada por outro serviço (ex.: Evolution API) — ao abrir `http://localhost:8080/` **não** verá o AutoDocs e a página ficará sem estilos.

- URL correta: **http://localhost:8088/**
- Atalho: `Ctrl+Shift+P` → **Tasks: Run Task** → **AutoDocs: abrir no browser**
- Ou: `.\scripts\open-autodocs.ps1`

### Dados do XAMPP (admin já existente) — recomendado nesta cópia

O MySQL Docker começa **vazio**. Para reutilizar users/admin do XAMPP (sem passar pelo `/install/`):

1. MySQL do XAMPP a correr (Control Panel → Start MySQL).
2. Stack Docker up (`docker compose up -d`).
3. Na raiz desta cópia:

```powershell
.\scripts\docker-import-xampp-db.ps1
```

O script:
- faz `mysqldump` da BD `autodocs` no XAMPP;
- grava em `sql/dumps/autodocs-from-xampp.sql` (gitignored);
- importa para o contentor `db`;
- cria `api/private/install.lock` para não pedir install de novo.

4. Abra **http://localhost:8088/login/** e entre com o **mesmo admin** do XAMPP.

Credenciais da origem XAMPP estão no `.env` (`XAMPP_MYSQL_*`). Por defeito: `root` sem password em `127.0.0.1`.

Importar só a partir de um ficheiro já exportado:

```powershell
.\scripts\docker-import-xampp-db.ps1 -FromFile .\sql\dumps\meu-dump.sql
```

### Alternativa: primeiro admin (install) sem import

1. Se a BD estiver vazia e não existir `api/private/install.lock`, o app redireciona para `/install/`.
2. Crie o utilizador administrador.
3. Faça login em `/login/`.

O entrypoint gera `api/private/config.local.json` (host `db`, Redis `redis`) e faz seed de `tags.json` / `theme.json` a partir dos examples, se ainda não existirem.

---

## Serviços

| Serviço | Imagem / build | Função |
|---------|----------------|--------|
| `app`   | Dockerfile (PHP 8.2 + Apache) | App + API |
| `db`    | MySQL 8.0 | Dados (schema em `sql/schema.sql`) |
| `redis` | Redis 7 | Sessões PHP + cache tags/tema |

Extensões PHP: `mbstring`, `pdo_mysql`, `redis`, `opcache`.  
Apache: `rewrite`, `headers`, `expires`, `deflate` (+ `.htaccess` na raiz).

---

## Comandos úteis

```bash
# Estado
docker compose ps

# Logs
docker compose logs -f app
docker compose logs -f db
docker compose logs -f redis

# Entrar no contentor PHP
docker compose exec app bash

# PHP info rápido (mbstring / redis / opcache)
docker compose exec app php -m

# Parar
docker compose down

# Parar e apagar volumes MySQL/Redis (reset total da BD)
docker compose down -v
```

---

## Soft-nav (sidebar fixa)

Nas páginas do hub (painel, documentações, tags, usuários, etc.) o `#navdrawer` **não recarrega**: só a área `.conteudo` atualiza (`autodocsSoftNavigate` em `scripts/navdrawer.js`), com prefetch no hover e `pushState`/`popstate`.

Rotas de documento (`/documentos/`, `/consulta/`) e auth (`/login/`, `/install/`) continuam com navegação completa.

---

## Troubleshooting

| Sintoma | O que verificar |
|---------|-----------------|
| Porta ocupada | Altere `APP_PORT` no `.env` (ex.: 8088). A 8080 muitas vezes já está em uso |
| 503 / config em falta | `docker compose logs app`; confirme volume `api/private` e ficheiro `config.local.json` |
| Login não mantém sessão | Redis up? `docker compose exec redis redis-cli ping` → `PONG` |
| Erro `mb_substr` / mbstring | Rebuild: `docker compose up -d --build` e `php -m \| grep mbstring` |
| BD vazia após rebuild | Volumes persistem; use `docker compose down -v` só se quiser reset |
| Login falha após import | Confirme que o XAMPP MySQL estava up no dump; re-execute o script; users: `docker compose exec db mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "SELECT email,role FROM autodocs.users"` |
| Script não acha mysqldump | Ajuste `XAMPP_MYSQL_BIN` no `.env` (ex.: `C:\xampp\mysql\bin`) |
| `install` aparece com dados já importados | Falta `install.lock` — o script cria-o; ou volte a correr o import |
| `install` recusado / BD vazia | Remova `api/private/install.lock` só se quiser criar admin novo via `/install/` |
| Permissões em `api/private` | O entrypoint faz `chown www-data`; no Windows o bind mount costuma funcionar na mesma |

---

## Secrets (não commit)

- `.env` — passwords MySQL (gitignored)
- `api/private/config.local.json` — gerado no arranque (gitignored)
- `install.lock`, `login-throttle.json` — estado local (gitignored)

Use sempre `.env.example` e `config.local.example.json` como modelos.

---

## Próximo passo (manual): VPS Docker de teste

**Não execute estes passos nesta sessão de Agent** — são o seu fluxo depois de validar localmente:

1. Confirmar checklist local (login, usuários, tags, documentações, sidebar fixa, sem erro mbstring).
2. Copiar esta pasta (ou a imagem buildada) para uma **VPS Docker de teste** (não a VPS Apache de produção).
3. Na VPS: criar `.env` com passwords fortes; `AUTODOCS_SESSION_COOKIE_SECURE=1` se servir HTTPS; `docker compose up -d --build`.
4. Abrir o URL da VPS de teste, repetir install/login.
5. **Só depois** de validar na VPS Docker: merge/push no GitHub (quando você pedir explicitamente).

Fora de escopo aqui: Traefik, MinIO, Cloudflare, push automático, produção Apache atual.

---

## Checklist “quando estiver OK”

- [ ] `docker compose up -d --build` OK nesta cópia
- [ ] http://localhost:8088/ (ou `APP_PORT`) abre sem XAMPP
- [ ] Login com admin importado do XAMPP (ou install novo) OK
- [ ] Usuários / tags / documentações OK
- [ ] Sem erro mbstring
- [ ] Sidebar fixa (só a direita muda)
- [ ] → VPS Docker de teste (manual)
- [ ] → Só depois: git commit/push (quando você pedir)
