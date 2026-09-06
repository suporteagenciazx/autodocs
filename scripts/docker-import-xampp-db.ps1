# AutoDocs - importar BD do XAMPP (ou de um .sql) para o MySQL Docker
#
# Uso (na raiz do projeto):
#   .\scripts\docker-import-xampp-db.ps1
#   .\scripts\docker-import-xampp-db.ps1 -FromFile .\sql\dumps\autodocs-xampp.sql
#
# Requisito: Docker Compose com servico "db" a correr; para XAMPP, MySQL do XAMPP acessivel.

[CmdletBinding()]
param(
    [string]$FromFile = "",
    [string]$EnvFile = ".env",
    [string]$DumpOut = "sql\dumps\autodocs-from-xampp.sql",
    [string]$XamppMysqlBin = "C:\xampp\mysql\bin",
    [string]$SourceHost = "127.0.0.1",
    [int]$SourcePort = 3306,
    [string]$SourceUser = "root",
    [string]$SourcePassword = "",
    [string]$SourceDatabase = "autodocs",
    [switch]$SkipLock
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Read-DotEnv([string]$path) {
    $map = @{}
    if (-not (Test-Path $path)) { return $map }
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $i = $line.IndexOf("=")
        if ($i -lt 1) { return }
        $k = $line.Substring(0, $i).Trim()
        $v = $line.Substring($i + 1).Trim()
        if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
            $v = $v.Substring(1, $v.Length - 2)
        }
        $map[$k] = $v
    }
    return $map
}

$envMap = Read-DotEnv (Join-Path $Root $EnvFile)

if ($envMap.ContainsKey("XAMPP_MYSQL_HOST") -and $envMap["XAMPP_MYSQL_HOST"]) { $SourceHost = $envMap["XAMPP_MYSQL_HOST"] }
if ($envMap.ContainsKey("XAMPP_MYSQL_PORT") -and $envMap["XAMPP_MYSQL_PORT"]) { $SourcePort = [int]$envMap["XAMPP_MYSQL_PORT"] }
if ($envMap.ContainsKey("XAMPP_MYSQL_USER") -and $envMap["XAMPP_MYSQL_USER"]) { $SourceUser = $envMap["XAMPP_MYSQL_USER"] }
if ($envMap.ContainsKey("XAMPP_MYSQL_PASSWORD")) { $SourcePassword = $envMap["XAMPP_MYSQL_PASSWORD"] }
if ($envMap.ContainsKey("XAMPP_MYSQL_DATABASE") -and $envMap["XAMPP_MYSQL_DATABASE"]) { $SourceDatabase = $envMap["XAMPP_MYSQL_DATABASE"] }
if ($envMap.ContainsKey("XAMPP_MYSQL_BIN") -and $envMap["XAMPP_MYSQL_BIN"]) { $XamppMysqlBin = $envMap["XAMPP_MYSQL_BIN"] }

$dockerDb = if ($envMap.ContainsKey("MYSQL_DATABASE") -and $envMap["MYSQL_DATABASE"]) { $envMap["MYSQL_DATABASE"] } else { "autodocs" }
if (-not ($envMap.ContainsKey("MYSQL_ROOT_PASSWORD") -and $envMap["MYSQL_ROOT_PASSWORD"])) {
    throw "MYSQL_ROOT_PASSWORD em falta no .env"
}
$dockerRootPass = $envMap["MYSQL_ROOT_PASSWORD"]
$appPort = if ($envMap.ContainsKey("APP_PORT") -and $envMap["APP_PORT"]) { $envMap["APP_PORT"] } else { "8088" }

$ps = @(docker compose ps --status running --services 2>$null)
if ($ps -notcontains "db") {
    Write-Host "[import] a subir stack (db)..."
    docker compose up -d db
    $deadline = (Get-Date).AddSeconds(90)
    do {
        Start-Sleep -Seconds 3
        $h = docker compose ps db --format "{{.Status}}" 2>$null
        if ($h -match "healthy") { break }
    } while ((Get-Date) -lt $deadline)
}

$dumpPath = Join-Path $Root $DumpOut
$dumpDir = Split-Path $dumpPath -Parent
New-Item -ItemType Directory -Force -Path $dumpDir | Out-Null

if ($FromFile -ne "") {
    $dumpPath = if ([System.IO.Path]::IsPathRooted($FromFile)) { $FromFile } else { Join-Path $Root $FromFile }
    if (-not (Test-Path $dumpPath)) { throw "Ficheiro dump nao encontrado: $dumpPath" }
    Write-Host "[import] a usar dump: $dumpPath"
} else {
    $mysqldump = Join-Path $XamppMysqlBin "mysqldump.exe"
    if (-not (Test-Path $mysqldump)) {
        throw "mysqldump nao encontrado em $mysqldump. Ajuste -XamppMysqlBin ou XAMPP_MYSQL_BIN no .env"
    }
    Write-Host ("[import] a exportar de XAMPP {0}@{1}:{2} /{3} ..." -f $SourceUser, $SourceHost, $SourcePort, $SourceDatabase)
    $errFile = Join-Path $env:TEMP "autodocs-mysqldump.err"
    $dumpArgs = [System.Collections.Generic.List[string]]::new()
    if ($SourcePassword -ne "") {
        $dumpArgs.Add("-p$SourcePassword")
    }
    $dumpArgs.Add("-h$SourceHost")
    $dumpArgs.Add("-P$SourcePort")
    $dumpArgs.Add("-u$SourceUser")
    $dumpArgs.Add("--single-transaction")
    $dumpArgs.Add("--routines")
    $dumpArgs.Add("--triggers")
    $dumpArgs.Add("--add-drop-table")
    $dumpArgs.Add("--default-character-set=utf8mb4")
    $dumpArgs.Add($SourceDatabase)

    $p = Start-Process -FilePath $mysqldump -ArgumentList $dumpArgs.ToArray() -NoNewWindow -Wait -PassThru `
        -RedirectStandardOutput $dumpPath -RedirectStandardError $errFile
    if ($p.ExitCode -ne 0) {
        $err = ""
        if (Test-Path $errFile) { $err = Get-Content $errFile -Raw -ErrorAction SilentlyContinue }
        throw "mysqldump falhou (exit $($p.ExitCode)): $err"
    }
    $size = (Get-Item $dumpPath).Length
    if ($size -lt 100) {
        throw "Dump demasiado pequeno ($size bytes). Verifique credenciais/BD XAMPP."
    }
    Write-Host "[import] dump gravado ($size bytes): $dumpPath"
}

Write-Host "[import] a importar para Docker MySQL ($dockerDb)..."
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
Get-Content -Raw -Encoding UTF8 $dumpPath | docker compose exec -T db mysql "-uroot" "-p$dockerRootPass" --default-character-set=utf8mb4 $dockerDb 2>$null
$importExit = $LASTEXITCODE
$countOut = docker compose exec -T db mysql "-uroot" "-p$dockerRootPass" -N -e "SELECT COUNT(*) FROM users;" $dockerDb 2>$null
$countExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($importExit -ne 0) {
    throw "Import para o contentor db falhou (exit $importExit)."
}

$userCount = 0
if ($countExit -eq 0 -and $countOut) {
    $userCount = [int](((($countOut | Out-String).Trim()) -replace "[^0-9]", ""))
}
Write-Host "[import] users na BD Docker: $userCount"

if (-not $SkipLock) {
    $lockPath = Join-Path $Root "api\private\install.lock"
    New-Item -ItemType Directory -Force -Path (Split-Path $lockPath) | Out-Null
    $lockBody = (Get-Date).ToString("o") + "`nimported-from-xampp`n"
    Set-Content -Path $lockPath -Value $lockBody -NoNewline
    Write-Host "[import] escrito api/private/install.lock (skip /install/)"
}

Write-Host ""
Write-Host "[import] OK - abra http://localhost:$appPort/login/ e entre com o admin do XAMPP."
Write-Host ""
