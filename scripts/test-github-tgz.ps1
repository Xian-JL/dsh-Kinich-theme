param(
    [string]$Target = "E:\Codex_workspace\dsh-Kinich-theme-TEST",
    [string]$Repository = "Xian-JL/dsh-Kinich-theme"
)

$ErrorActionPreference = "Stop"
$downloadUrl = "https://github.com/$Repository/releases/latest/download/dsh-kinich-theme-latest.tgz"

if (Test-Path $Target) {
    if (Get-ChildItem $Target -Force | Select-Object -First 1) {
        throw "Test directory is not empty: $Target"
    }
} else {
    New-Item -ItemType Directory -Path $Target | Out-Null
}

$tarball = Join-Path $Target "dsh-kinich-theme-latest.tgz"
Invoke-WebRequest -Uri $downloadUrl -OutFile $tarball

Write-Host "Downloaded: $tarball"
Write-Host "SHA256: $((Get-FileHash $tarball -Algorithm SHA256).Hash.ToLowerInvariant())"

Remove-Item Env:npm_config_offline -ErrorAction SilentlyContinue
$env:npm_config_offline = "false"

dsh plugin --profile web add $tarball

$profilePackage = Join-Path $env:USERPROFILE ".dsh\profiles\web\package.json"
node -e "const p=require(process.argv[1]); console.log('Installed dependency:', p.dependencies?.['dsh-kinich-theme'])" $profilePackage

Write-Host "Starting DSH Web. Stop it with Ctrl+C after visual verification."
dsh web
