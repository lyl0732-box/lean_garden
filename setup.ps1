$ErrorActionPreference = 'Stop'
Get-Command node, lean, lake -ErrorAction Stop | Out-Null
Push-Location (Join-Path $PSScriptRoot 'lean')
try {
    if (-not (Test-Path -LiteralPath '.lake\packages\mathlib\lakefile.lean')) {
        lake update
        if ($LASTEXITCODE -ne 0) { throw 'Lake dependency installation failed.' }
    }
    lake exe cache get
    if ($LASTEXITCODE -ne 0) { throw 'Mathlib cache download failed.' }
    lake build Garden
    if ($LASTEXITCODE -ne 0) { throw 'Lean engine build failed.' }
} finally { Pop-Location }
Write-Host 'Setup completed. Run start.cmd to play.' -ForegroundColor Green
