# Configuração MySQL, phpMyAdmin e XAMPP (AutoDocs)

Este guia assume **XAMPP** no Windows com **Apache** e **MySQL** já a arrancar e o **phpMyAdmin** a abrir no browser (por exemplo `http://localhost/phpmyadmin`).

## 1. Criar a base de dados e o utilizador MySQL

1. Abra o **phpMyAdmin**.
2. Vá ao separador **Contas de utilizador** (ou **User accounts**) e crie um utilizador dedicado (recomendado), por exemplo:
   - **Nome de utilizador:** `autodocs_app`
   - **Nome do anfitrião:** `localhost`
   - **Palavra-passe:** escolha uma palavra-passe forte e guarde-a.
   - Marque **Criar base de dados com o mesmo nome e conceder todas as permissões** *ou* crie primeiro a base manualmente (passo seguinte) e depois conceda **SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP** sobre essa base a este utilizador.
3. Crie a base de dados (se ainda não existir), por exemplo **`autodocs`**, com ordenação **utf8mb4_unicode_ci**.

## 2. Importar o schema

1. No phpMyAdmin, selecione a base **`autodocs`**.
2. Separador **Importar** → escolha o ficheiro do projeto **`sql/schema.sql`** → **Executar**.

Isto cria as tabelas (`users`, `sessions`, `doc_batches`, `doc_batch_items`, `user_doc_access`) e insere os lotes iniciais **“Todas as documentações”** (id 1) e **“Sofisa”** (id 2).

## 3. Ficheiro de configuração da API PHP

1. Copie o modelo:

   - De: `api/private/config.local.example.json`
   - Para: `api/private/config.local.json`

2. Edite `api/private/config.local.json` e preencha com os dados da base:

```json
{
  "db": {
    "host": "127.0.0.1",
    "port": 3306,
    "name": "autodocs",
    "user": "autodocs_app",
    "password": "A_SUA_PALAVRA_PASSE"
  },
  "session_cookie_secure": false,
  "registration_open": false
}
```

- **`session_cookie_secure`:** deixe `false` em **HTTP** local. Em produção com **HTTPS**, mude para `true`.
- **`registration_open`:** `false` = só administradores criam contas (página **Usuários**). `true` = permite a página **Cadastro** para registo público.

O ficheiro `config.local.json` está listado no `.gitignore` para não ser commitado com palavras-passe.

## 4. Servir o projeto pelo Apache (não use só “Live Server” para testar login)

A API e o *gate* de documentos precisam de **PHP** no mesmo *host* que o site, para **cookies de sessão** funcionarem.

Opções comuns:

### A) Alias ou pasta em `htdocs`

Copie ou ligue a pasta do projeto (por exemplo `AutoDocsv7`) para dentro de `C:\xampp\htdocs\`, de modo a aceder a:

`http://localhost/AutoDocsv7/`

### B) Virtual host

Crie um vhost que aponte o `DocumentRoot` para a pasta do projeto e use um nome tipo `http://autodocs.local/` (adicione a linha em `C:\Windows\System32\drivers\etc\hosts`).

Em qualquer caso, confirme que abre uma página PHP, por exemplo:

`http://localhost/AutoDocsv7/api/register-status.php`  
(resposta JSON)

## 5. `mod_rewrite` e `.htaccess`

As pastas **`documentos/`** e **`consulta/`** contêm `.htaccess` que encaminham os pedidos para `api/static-gate.php` (login + permissões por documentação).

No Apache do XAMPP, confirme que em `httpd.conf` (ou o include de extra) está:

- `LoadModule rewrite_module modules/mod_rewrite.so` **sem** `#` à frente.
- Para a pasta do site, `AllowOverride All` (em `<Directory ".../htdocs">` ou no vhost do projeto).

Reinicie o Apache após alterações.

## 6. Primeiro administrador

1. No browser, abra:  
   `http://localhost/AutoDocsv7/install/`  
   (ajuste o caminho à sua URL real.)
2. Preencha email e palavra-passe (mínimo **10** caracteres) e submeta.

Só funciona quando **ainda não existe** nenhum registo em `users`. O primeiro utilizador é **admin** e fica associado ao lote **“Todas as documentações”** (acesso completo).

## 7. Login e gestão

- **Login:** `.../login/`
- **Usuários (admin):** `.../usuarios/` — criar utilizadores, função, lotes de documentação.
- **Documentações:** o *hub* filtra por permissões; o acesso direto a ficheiros em `documentos/` e `consulta/` passa pelo *gate* PHP.

## 8. Produção (aaPanel + Apache + HTTPS)

- Mesmo fluxo: importar `sql/schema.sql`, criar utilizador MySQL, `config.local.json` com credenciais do servidor.
- Ative **HTTPS** e defina **`session_cookie_secure": true`**.
- Garanta `AllowOverride All` (ou equivalente) para os `.htaccess` nas pastas protegidas.

## Resolução de problemas

| Sintoma | Verificação |
|--------|-------------|
| JSON “Ficheiro de configuração em falta” | Existe `api/private/config.local.json`? |
| Erro PDO / “Access denied” | Utilizador, palavra-passe e nome da base no JSON |
| 500 ao abrir documentos | `mod_rewrite`, `AllowOverride`, caminho para `../api/static-gate.php` |
| Redirect infinito | URL base do site; `getBasePath()` no JS deve coincidir com a pasta publicada |
