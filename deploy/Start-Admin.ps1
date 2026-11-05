param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$runtimeFile = Join-Path $PSScriptRoot '.private\admin-console-runtime.json'
$consoleURL = 'http://127.0.0.1:3218'
$existing = $null
try { $existing = Invoke-RestMethod -Uri ($consoleURL + '/health') -TimeoutSec 2 } catch {}
if ($null -ne $existing -and $existing.app -ne 'lean-garden-admin') { throw 'Port 3218 is occupied by another application.' }
if ($null -eq $existing) {
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    $logsDir = Join-Path $projectRoot 'logs'
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Start-Process -FilePath $nodePath -ArgumentList @('scripts/admin-console.mjs') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logsDir 'admin-console.log') -RedirectStandardError (Join-Path $logsDir 'admin-console.error.log') | Out-Null
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 250
        try { $existing = Invoke-RestMethod -Uri ($consoleURL + '/health') -TimeoutSec 1; if ($existing.app -eq 'lean-garden-admin' -and (Test-Path -LiteralPath $runtimeFile)) { break } } catch {}
    }
}
if ($null -eq $existing -or -not (Test-Path -LiteralPath $runtimeFile)) { throw 'Cannot start the local management console. See logs/admin-console.error.log.' }
$runtime = Get-Content -LiteralPath $runtimeFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($runtime.pid -ne $existing.pid) { throw 'Console runtime does not match the running process.' }
if (-not $NoBrowser) { Start-Process -FilePath $runtime.url }
Write-Host 'Management console ready. It refreshes every 3 seconds.'
