param([int]$Port = 3210, [switch]$Lan, [switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$gardenRoot = $PSScriptRoot
$gardenUrl = "http://localhost:$Port"
$gardenLogs = Join-Path $gardenRoot 'logs'
$gardenEntry = Join-Path $gardenRoot 'server\index.mjs'
New-Item -ItemType Directory -Force -Path $gardenLogs | Out-Null
$gardenReady = $false
try { $gardenHealth = Invoke-RestMethod "$gardenUrl/api/health" -TimeoutSec 3; $gardenReady = $gardenHealth.version -like 'Lean 4.34*' } catch {}
if (-not $gardenReady) {
    $gardenNode = (Get-Command node -ErrorAction Stop).Source
    $env:PORT = "$Port"
    $env:HOST = if ($Lan) { '0.0.0.0' } else { '127.0.0.1' }
    $gardenProc = Start-Process -FilePath $gardenNode -ArgumentList ('"' + $gardenEntry + '"') -WorkingDirectory $gardenRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $gardenLogs 'server.log') -RedirectStandardError (Join-Path $gardenLogs 'server.err.log') -PassThru
    @{ pid = $gardenProc.Id; root = $gardenRoot; port = $Port; lan = [bool]$Lan } | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $gardenLogs 'service.json')
    for ($gardenAttempt = 0; $gardenAttempt -lt 12; $gardenAttempt++) {
        Start-Sleep -Milliseconds 500
        try { $gardenHealth = Invoke-RestMethod "$gardenUrl/api/health" -TimeoutSec 5; $gardenReady = $true; break } catch {}
        $gardenProc.Refresh()
        if ($gardenProc.HasExited) { throw "Server exited. See $gardenLogs\server.err.log. Another process may be using port $Port." }
    }
    if (-not $gardenReady) { throw "Server is not responding. See $gardenLogs\server.err.log." }
}
Write-Host "Lean Garden is running: $gardenUrl" -ForegroundColor Green
if (-not $gardenHealth.ready) { Write-Host 'Lean needs setup. Run setup.ps1 before playing.' -ForegroundColor Yellow }
if ($Lan) { Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { Write-Host "Phone on the same LAN: http://$($_.IPAddress):$Port" } }
if ($OpenBrowser) { Start-Process $gardenUrl }
