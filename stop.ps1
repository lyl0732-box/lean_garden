$ErrorActionPreference = 'Stop'
$gardenRecord = Join-Path $PSScriptRoot 'logs\service.json'
if (-not (Test-Path -LiteralPath $gardenRecord)) { Write-Host 'No service record. Nothing was stopped.'; exit 0 }
$gardenService = Get-Content -Raw -Encoding UTF8 -LiteralPath $gardenRecord | ConvertFrom-Json
$gardenPid = [int]$gardenService.pid
$gardenProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $gardenPid"
if (-not $gardenProcess) { Write-Host 'Lean Garden is already stopped.'; exit 0 }
$gardenExpected = Join-Path $PSScriptRoot 'server\index.mjs'
if ($gardenProcess.Name -ne 'node.exe' -or -not $gardenProcess.CommandLine.Contains($gardenExpected)) { throw 'PID belongs to a different process. Nothing was stopped.' }
Stop-Process -Id $gardenPid
Write-Host 'Lean Garden stopped. Progress is saved in data\progress.json.'
