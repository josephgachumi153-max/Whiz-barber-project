$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$git = 'C:\Program Files\Git\cmd\git.exe'

if (-not (Test-Path -LiteralPath $git)) {
    throw "Git was not found at $git"
}

Push-Location $repoRoot
try {
    & $git add -A
    $staged = & $git diff --cached --name-only
    if (-not $staged) {
        exit 0
    }

    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm zzz'
    & $git commit -m "chore: weekly project sync ($stamp)"
    & $git push origin main
    if ($LASTEXITCODE -ne 0) {
        throw "Git push failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
