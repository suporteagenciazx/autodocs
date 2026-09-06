# Abre o AutoDocs na porta definida em .env (APP_PORT)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
$port = 8088

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*APP_PORT\s*=\s*(\d+)\s*$') {
      $port = $Matches[1]
    }
  }
}

$url = "http://localhost:$port/"
Write-Host "A abrir AutoDocs em $url"
Start-Process $url
