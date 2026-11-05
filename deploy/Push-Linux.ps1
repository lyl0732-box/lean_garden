$ErrorActionPreference='Stop'
$gardenRoot=Split-Path -Parent $PSScriptRoot
Push-Location $gardenRoot
try {
  node scripts/build-media.mjs --manifest-only
  if($LASTEXITCODE -ne 0){throw 'Resource build failed.'}
  node scripts/push-linux.mjs
  if($LASTEXITCODE -ne 0){throw 'Deployment failed; see output above. Player data was not uploaded or replaced.'}
} finally {Pop-Location}
