param([int]$Port = 3210)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'start.ps1') -Port $Port
$gardenTailscale = (Get-Command tailscale -ErrorAction Stop).Source
$gardenServe = & $gardenTailscale serve status --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Cannot read Tailscale Serve configuration.' }
$gardenExisting = $gardenServe.TCP."$Port"
if ($gardenExisting -and $gardenExisting.TCPForward -ne "127.0.0.1:$Port") {
    throw "Tailscale port $Port is already used by a different service. Existing settings were preserved."
}
& $gardenTailscale serve --bg "--tcp=$Port" --yes "tcp://127.0.0.1:$Port"
if ($LASTEXITCODE -ne 0) { throw 'Tailscale could not start the game forwarder.' }
$gardenIP = & $gardenTailscale ip -4
Write-Host "On your laptop, connect to Tailscale and open http://${gardenIP}:$Port" -ForegroundColor Green
