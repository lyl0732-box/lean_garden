$ErrorActionPreference = 'Stop'
$runtimeFile = Join-Path $PSScriptRoot '.private\admin-console-runtime.json'
if (-not (Test-Path -LiteralPath $runtimeFile)) { Write-Host 'No local monitoring process recorded.'; exit 0 }
$runtime = Get-Content -LiteralPath $runtimeFile -Raw -Encoding UTF8 | ConvertFrom-Json
try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3218/health' -TimeoutSec 2 } catch { Write-Host 'Local monitoring is already stopped.'; exit 0 }
if ($health.app -ne 'lean-garden-admin' -or $health.pid -ne $runtime.pid) { throw 'Process identity check failed. No process was stopped.' }
Stop-Process -Id $runtime.pid -ErrorAction Stop
Write-Host 'Local monitoring stopped. The cloud game server is still running.'
