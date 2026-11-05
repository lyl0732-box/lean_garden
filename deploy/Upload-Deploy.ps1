param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-zA-Z0-9.-]+$')][string]$Server,
  [ValidatePattern('^[a-zA-Z_][a-zA-Z0-9_-]*$')][string]$User='ubuntu',
  [ValidatePattern('^[a-zA-Z0-9.-]*$')][string]$Domain='',
  [string]$IdentityFile=''
)
$ErrorActionPreference='Stop'
$gardenRoot=Split-Path -Parent $PSScriptRoot
Push-Location $gardenRoot
try {
  node scripts/package-deploy.mjs
  if($LASTEXITCODE -ne 0){throw 'Cloud source packaging failed.'}
  $gardenVersion=(Get-Content -Raw -Encoding UTF8 -LiteralPath package.json | ConvertFrom-Json).version
  $gardenArchive=Join-Path $gardenRoot "dist\deploy\lean-garden-cloud-$gardenVersion.tar.gz"
  $gardenKeyArgs=@();if($IdentityFile){$gardenKeyArgs=@('-i',(Resolve-Path -LiteralPath $IdentityFile).Path)}
  & scp @gardenKeyArgs $gardenArchive "${User}@${Server}:lean-garden-cloud.tar.gz"
  if($LASTEXITCODE -ne 0){throw 'Upload failed.'}
  $gardenInstallArgs=if($Domain){" --domain $Domain"}else{''}
  $gardenRemote="set -e; sudo mkdir -p /opt/lean-garden; sudo tar -xzf lean-garden-cloud.tar.gz -C /opt/lean-garden; cd /opt/lean-garden; sudo bash deploy/install.sh$gardenInstallArgs"
  & ssh @gardenKeyArgs -t "${User}@${Server}" $gardenRemote
  if($LASTEXITCODE -ne 0){throw 'Remote deployment did not complete. The local package and server data are preserved.'}
}finally{Pop-Location}
