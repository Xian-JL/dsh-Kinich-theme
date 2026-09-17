param(
    [string]$Version = "1.1.0",
    [string]$Repository = "Xian-JL/dsh-Kinich-theme"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $projectRoot "dist"
$expectedVersion = (Get-Content (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json).version

if ($expectedVersion -ne $Version) {
    throw "package.json version is $expectedVersion, expected $Version."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI is missing. Install it with: winget install --id GitHub.cli"
}

Push-Location $projectRoot
try {
    gh auth status

    $origin = git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Git remote 'origin' is missing. Add it with: git remote add origin https://github.com/$Repository.git"
    }
    if ($origin -notmatch "github\.com[:/]$([regex]::Escape($Repository))(\.git)?$") {
        throw "Git remote 'origin' points to '$origin', expected https://github.com/$Repository.git"
    }

    if (git status --porcelain | Select-String -SimpleMatch "dist/") {
        throw "dist/ must remain ignored by Git. Check .gitignore before releasing."
    }

    npm run verify

    New-Item -ItemType Directory -Force -Path $dist | Out-Null
    Get-ChildItem $dist -File -ErrorAction SilentlyContinue | Remove-Item -Force

    npm pack --pack-destination $dist
    $versioned = Join-Path $dist "dsh-kinich-theme-$Version.tgz"
    $latest = Join-Path $dist "dsh-kinich-theme-latest.tgz"
    Copy-Item $versioned $latest -Force

    $versionedHash = (Get-FileHash $versioned -Algorithm SHA256).Hash.ToLowerInvariant()
    $latestHash = (Get-FileHash $latest -Algorithm SHA256).Hash.ToLowerInvariant()
    @(
        "$versionedHash  dsh-kinich-theme-$Version.tgz"
        "$latestHash  dsh-kinich-theme-latest.tgz"
    ) | Set-Content (Join-Path $dist "SHA256SUMS.txt") -Encoding ascii

    git diff --check
    git add .
    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "No source changes to commit."
    } else {
        git commit -m "release: v$Version"
    }

    if (git rev-parse "v$Version" 2>$null) {
        throw "Git tag v$Version already exists. Choose a new version or remove the accidental tag manually."
    }
    git tag -a "v$Version" -m "Kinich Theme v$Version"
    git push origin HEAD
    git push origin "v$Version"

    gh release create "v$Version" `
        $versioned `
        $latest `
        (Join-Path $dist "SHA256SUMS.txt") `
        --repo $Repository `
        --title "Kinich Theme v$Version" `
        --notes-file (Join-Path $projectRoot "RELEASE_NOTES.md") `
        --latest

    Write-Host "Release deployed: https://github.com/$Repository/releases/tag/v$Version"
}
finally {
    Pop-Location
}
