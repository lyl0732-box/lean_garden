param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$runtimeFile = Join-Path $PSScriptRoot '.private\admin-console-runtime.json'
$consoleURL = 'http://127.0.0.1:3218'
$target = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'linux-target.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$keyPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $target.key))
if (-not (Test-Path -LiteralPath $keyPath -PathType Leaf)) { throw 'SSH private key is missing. Restore deploy/.private/deploy-key.pem.' }
# A move to another drive can restore inherited permissions that OpenSSH rejects.
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$keyAcl = Get-Acl -LiteralPath $keyPath
$keyOwner = $keyAcl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
$allowedSids = @($currentUser.Value, 'S-1-5-18', 'S-1-5-32-544')
$unsafeRules = @($keyAcl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | Where-Object { $_.IdentityReference.Value -notin $allowedSids })
if (-not $keyAcl.AreAccessRulesProtected -or $keyOwner -ne $currentUser.Value -or $unsafeRules.Count -gt 0) {
    $privateAcl = New-Object System.Security.AccessControl.FileSecurity
    $privateAcl.SetOwner($currentUser)
    $privateAcl.SetAccessRuleProtection($true, $false)
    $privateAcl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, 'FullControl', 'Allow')))
    Set-Acl -LiteralPath $keyPath -AclObject $privateAcl
}
$existing = $null
try { $existing = Invoke-RestMethod -Uri ($consoleURL + '/health') -TimeoutSec 2 } catch {}
if ($null -ne $existing -and $existing.app -ne 'lean-garden-admin') { throw 'Port 3218 is occupied by another application.' }
if ($null -ne $existing -and $existing.projectRoot -ne $projectRoot) {
    if (-not (Test-Path -LiteralPath $runtimeFile)) { throw 'Another management console is running. Stop it from its project folder first.' }
    $oldRuntime = Get-Content -LiteralPath $runtimeFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($oldRuntime.pid -ne $existing.pid) { throw 'Console runtime does not match the running process. No process was stopped.' }
    $oldProcess = Get-Process -Id $existing.pid -ErrorAction Stop
    if ($oldProcess.ProcessName -ne 'node') { throw 'Console process identity check failed. No process was stopped.' }
    Stop-Process -InputObject $oldProcess -ErrorAction Stop
    if (-not $oldProcess.WaitForExit(5000)) { throw 'The old management console did not stop. Try launching again.' }
    $existing = $null
    Write-Host 'Project location changed. Restarting the local management console.'
}
if ($null -eq $existing) {
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    $logsDir = Join-Path $projectRoot 'logs'
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    $entryPoint = Join-Path $projectRoot 'scripts\admin-console.mjs'
    $process = Start-Process -FilePath $nodePath -ArgumentList ('"{0}"' -f $entryPoint) -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logsDir 'admin-console.log') -RedirectStandardError (Join-Path $logsDir 'admin-console.error.log') -PassThru
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        Start-Sleep -Milliseconds 250
        if ($process.HasExited) { throw 'The local management console exited. See logs/admin-console.error.log.' }
        try { $existing = Invoke-RestMethod -Uri ($consoleURL + '/health') -TimeoutSec 1; if ($existing.app -eq 'lean-garden-admin' -and $existing.pid -eq $process.Id -and $existing.projectRoot -eq $projectRoot -and (Test-Path -LiteralPath $runtimeFile)) { break } } catch {}
    }
}
if ($null -eq $existing -or $existing.app -ne 'lean-garden-admin' -or $existing.projectRoot -ne $projectRoot -or -not (Test-Path -LiteralPath $runtimeFile)) { throw 'Cannot start the local management console. See logs/admin-console.error.log.' }
$runtime = Get-Content -LiteralPath $runtimeFile -Raw -Encoding UTF8 | ConvertFrom-Json
if ($runtime.pid -ne $existing.pid) { throw 'Console runtime does not match the running process.' }
if (-not $NoBrowser) { Start-Process -FilePath $runtime.url }
Write-Host 'Management console ready. It refreshes every 3 seconds.'
