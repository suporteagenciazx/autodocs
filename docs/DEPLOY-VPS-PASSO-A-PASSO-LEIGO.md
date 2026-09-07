# AutoDocs — Subir na VPS (guia para copiar e colar)

Este guia é para quem **não é técnico**.  
Siga na ordem. Em cada passo: **copie o comando → cole no terminal → Enter**.

Antes de começar, anote estes dados (peça a quem cuida do servidor se não tiver):

| O que precisa | Exemplo | O seu valor |
|---------------|---------|-------------|
| Endereço do site (domínio) | `docs.suaempresa.com.br` | ________________ |
| IP da VPS | `192.0.2.10` | ________________ |
| Utilizador SSH | `root` ou `ubuntu` | ________________ |
| Pasta no servidor | `/opt/autodocs` | ________________ |

> **Importante:** o login do AutoDocs usa **email + PIN de 6 números** (não é palavra-passe normal).  
> Quando o sistema mostrar um PIN, **anote num papel seguro** — ele só aparece uma vez.

---

## Parte 0 — No seu computador (só 1 vez)

### 0.1 Ligar o domínio ao servidor

No site onde comprou o domínio (Registro.br, Cloudflare, GoDaddy, etc.):

1. Crie um registo do tipo **A**
2. Nome/host: o seu domínio (ou `docs`, se for subdomínio)
3. Valor/IP: o **IP da VPS**
4. Guarde e espere alguns minutos (às vezes até 1 hora)

### 0.2 Entrar na VPS

No Windows, abra o **PowerShell** ou o **Terminal**.  
Substitua `UTILIZADOR` e `IP_DA_VPS` pelos seus dados e cole:

```bash
ssh UTILIZADOR@IP_DA_VPS
```

Exemplo:

```bash
ssh root@192.0.2.10
```

Se pedir confirmação (`yes/no`), escreva `yes` e Enter.  
Se pedir palavra-passe ou chave, use a da VPS.

A partir daqui, **todos os comandos são dentro da VPS**.

---

## Parte 1 — Preparar a pasta do AutoDocs

### 1.1 Ir para a pasta (ou criar)

Cole:

```bash
sudo mkdir -p /opt/autodocs
cd /opt/autodocs
pwd
```

Deve aparecer: `/opt/autodocs`

### 1.2 Colocar o código do AutoDocs nesta pasta

Escolha **uma** opção.

**Opção A — Já tem o projeto no GitHub (recomendado)**  
Substitua a URL pelo repositório real e cole:

```bash
cd /opt
sudo git clone URL_DO_SEU_REPOSITORIO autodocs
cd /opt/autodocs
```

**Opção B — Alguém já enviou os ficheiros para `/opt/autodocs`**  
Só confirme:

```bash
cd /opt/autodocs
ls
```

Deve ver ficheiros como `docker-compose.yml`, `Dockerfile`, `.env.example`.

---

## Parte 2 — Criar o ficheiro de senhas (`.env`)

### 2.1 Copiar o modelo

Cole:

```bash
cd /opt/autodocs
cp .env.example .env
```

### 2.2 Abrir o ficheiro para editar

Cole:

```bash
nano .env
```

### 2.3 Alterar estas linhas (obrigatório)

Dentro do `nano`, use as setas do teclado.  
Deixe o ficheiro **parecido com isto** (troque as senhas longas pelas suas):

```env
APP_PORT=8088
MYSQL_DATABASE=autodocs
MYSQL_USER=autodocs_app
MYSQL_PASSWORD=TroquePorUmaSenhaLonga123
MYSQL_ROOT_PASSWORD=TroquePorOutraSenhaLonga456
AUTODOCS_REDIS_PREFIX=autodocs:
AUTODOCS_SESSION_COOKIE_SECURE=1
AUTODOCS_REGISTRATION_OPEN=0
AUTODOCS_FIGMA_TOKEN=
```

Regras simples:

- `MYSQL_PASSWORD` e `MYSQL_ROOT_PASSWORD` → senhas **fortes e diferentes**
- `AUTODOCS_SESSION_COOKIE_SECURE=1` → deixe **1** (site com HTTPS)
- `AUTODOCS_REGISTRATION_OPEN=0` → deixe **0** (ninguém se regista sozinho)

### 2.4 Guardar e sair do nano

1. `Ctrl + O` (guardar)
2. `Enter` (confirmar)
3. `Ctrl + X` (sair)

---

## Parte 3 — Ligar o AutoDocs (Docker)

### 3.1 Confirmar que o Docker existe

Cole:

```bash
docker --version
docker compose version
```

Se der erro “command not found”, **pare** e peça a um técnico para instalar Docker na VPS.

### 3.2 Construir e iniciar

Isto pode demorar vários minutos. Cole e espere terminar:

```bash
cd /opt/autodocs
docker compose up -d --build
```

### 3.3 Ver se está a correr

Cole:

```bash
docker compose ps
```

Procure a palavra **running** / **Up** nas linhas `app`, `db` e `redis`.

### 3.4 (Opcional) Ver se o login responde no servidor

Cole:

```bash
curl -sI http://127.0.0.1:8088/login/ | head -n 5
```

Se aparecer `HTTP` com `200` ou `302`, está bom.

---

## Parte 4 — Ligar o domínio com HTTPS (cadeado)

Sem isto, o site só funciona por IP/porta.  
Abaixo está o caminho **mais simples** com **Caddy** (ele cria o certificado sozinho).

### 4.1 Instalar Caddy (Ubuntu/Debian)

Cole um bloco de cada vez:

```bash
sudo apt update
```

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
```

```bash
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
```

```bash
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
```

```bash
sudo apt update
sudo apt install -y caddy
```

### 4.2 Configurar o domínio

**Substitua `SEU_DOMINIO.com.br` pelo domínio real** e cole:

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
SEU_DOMINIO.com.br {
    reverse_proxy 127.0.0.1:8088
}
EOF
```

Exemplo real (não copie se não for o seu domínio):

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
docs.suaempresa.com.br {
    reverse_proxy 127.0.0.1:8088
}
EOF
```

### 4.3 Reiniciar o Caddy

Cole:

```bash
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Se estiver **active (running)**, continue.

### 4.4 Abrir no browser

Abra:

`https://SEU_DOMINIO.com.br/login/`

Deve aparecer o cadeado e a página de login do AutoDocs.

---

## Parte 5 — Criar o administrador (primeira vez)

Só faça isto se for **instalação nova** (base de dados vazia).

1. Abra: `https://SEU_DOMINIO.com.br/install/`
2. Escreva o **email** do administrador
3. Clique para criar
4. **Anote o PIN de 6 dígitos** que aparecer
5. Clique para continuar / ir para o sistema
6. Da próxima vez use: `https://SEU_DOMINIO.com.br/login/`

Se a página `/install/` disser que a instalação já foi feita, vá direto ao login.

---

## Parte 6 — Se já tinha utilizadores sem PIN

1. Entre como administrador
2. No menu, abra **Usuários**
3. Clique em **Gerar PINs em falta**
4. Confirme
5. **Copie/anote todos os PINs** que aparecerem (só mostram uma vez)
6. Entregue cada PIN à pessoa certa de forma segura

---

## Parte 7 — Teste rápido no browser (checklist)

Abra o site em HTTPS e marque:

- [ ] O site abre com `https://` e cadeado
- [ ] A página `/login/` aparece
- [ ] Consigo entrar com email + PIN
- [ ] Consigo abrir Documentações e 1–2 documentos
- [ ] Menu Usuários / Tags / Segurança (se for admin) abre
- [ ] Depois de uns minutos parado, pede PIN outra vez (bloqueio de sessão)
- [ ] Consigo sair (logout) e volto ao login
- [ ] No telemóvel também dá para usar o menu

Se **tudo** estiver marcado, pode considerar o AutoDocs no ar.

---

## Parte 8 — Comandos úteis no dia a dia

Sempre comece com:

```bash
cd /opt/autodocs
```

### Ver se está ligado

```bash
docker compose ps
```

### Ver erros do sistema

```bash
docker compose logs -f app
```

(Para parar de ver logs: `Ctrl + C`)

### Reiniciar tudo

```bash
cd /opt/autodocs
docker compose restart
```

### Atualizar o código e voltar a subir

```bash
cd /opt/autodocs
git pull
docker compose up -d --build
```

---

## Parte 9 — Se algo correr mal (voltar atrás)

### 9.1 Parar o AutoDocs

```bash
cd /opt/autodocs
docker compose down
```

### 9.2 Voltar ao ponto seguro do código (só se usarem Git neste projeto)

```bash
cd /opt/autodocs
git reset --hard backup/pre-verificacao-final-20260907
docker compose up -d --build
```

> Só faça o `git reset` se alguém da equipa confirmar que é isso que querem.  
> Isto **apaga alterações de código** posteriores a esse ponto.

### 9.3 Pedir ajuda — envie estas 3 saídas

```bash
cd /opt/autodocs
docker compose ps
docker compose logs --tail=80 app
curl -sI http://127.0.0.1:8088/login/ | head -n 10
```

---

## Resumo em 1 ecrã

1. Ligar domínio → IP da VPS  
2. `ssh` na VPS  
3. Código em `/opt/autodocs`  
4. `cp .env.example .env` e editar senhas + `AUTODOCS_SESSION_COOKIE_SECURE=1`  
5. `docker compose up -d --build`  
6. Configurar Caddy com o domínio → `127.0.0.1:8088`  
7. Abrir `https://SEU_DOMINIO/install/` ou `/login/`  
8. Anotar PIN  
9. Fazer o checklist do browser  

---

## Versão técnica

Detalhes para a equipa de desenvolvimento:  
[`VERIFICACAO-FINAL-DEPLOY-VPS.md`](./VERIFICACAO-FINAL-DEPLOY-VPS.md)
