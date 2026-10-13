param([string]$SourceData = "$env:USERPROFILE\.dsh\profiles\desktop\kinich-wallpaper")
$ErrorActionPreference = 'Stop'
$taskProfilesRoot = [IO.Path]::GetFullPath("$env:USERPROFILE\.dsh\profiles").TrimEnd('\')
$taskProfile = Join-Path $taskProfilesRoot ('.kinich-lifecycle-' + [guid]::NewGuid().ToString('N'))
if (-not [IO.Path]::GetFullPath($taskProfile).StartsWith($taskProfilesRoot + '\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected isolated Profile path.' }
$taskWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$taskOld = Join-Path $taskWorkspace 'dsh-kinich-theme-1.8.1.tgz'
$taskCandidate = Join-Path $taskWorkspace 'dsh-kinich-theme-2.0.0-alpha.9.tgz'
foreach ($taskPackage in @($taskOld,$taskCandidate)) { if (-not (Test-Path -LiteralPath $taskPackage -PathType Leaf)) { throw "Missing package: $taskPackage" } }
New-Item -ItemType Directory -Path $taskProfile | Out-Null
'{"name":"kinich-lifecycle-audit","version":"1.0.0","private":true}' | Set-Content -LiteralPath (Join-Path $taskProfile 'package.json') -Encoding UTF8
Copy-Item -LiteralPath $SourceData -Destination (Join-Path $taskProfile 'kinich-wallpaper') -Recurse
$taskData = Join-Path $taskProfile 'kinich-wallpaper'
function Get-DataDigest {
    $taskRows = @(Get-ChildItem -LiteralPath $taskData -Recurse -File | Sort-Object FullName | ForEach-Object { ($_.FullName.Substring($taskData.Length)) + ':' + $_.Length + ':' + (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash })
    return $taskRows -join "`n"
}
$taskBefore = Get-DataDigest
$taskStages = @()
Push-Location $taskProfile
try {
    foreach ($taskStage in @('candidate','rollback-1.8.1','reupgrade','uninstall','reinstall')) {
        if ($taskStage -notin @('candidate','reinstall')) { & pnpm remove --config.ignore-scripts=true dsh-kinich-theme | Out-Null; if ($LASTEXITCODE -ne 0) { throw "Removal failed: $taskStage" } }
        if ($taskStage -ne 'uninstall') {
            $taskArchive = if ($taskStage -eq 'rollback-1.8.1') { $taskOld } else { $taskCandidate }
            & pnpm add --save-prod --ignore-scripts --force $taskArchive | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "Installation failed: $taskStage" }
            $taskInstalled = Get-Content -LiteralPath (Join-Path $taskProfile 'node_modules\dsh-kinich-theme\package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
            $taskExpected = if ($taskStage -eq 'rollback-1.8.1') { '1.8.1' } else { '2.0.0-alpha.9' }
            if ($taskInstalled.version -ne $taskExpected) { throw "Wrong actual installed version: $taskStage" }
        } else { $taskExpected = 'absent'; if (Test-Path -LiteralPath (Join-Path $taskProfile 'node_modules\dsh-kinich-theme\package.json')) { throw 'Uninstall retained package entry.' } }
        if ((Get-DataDigest) -cne $taskBefore) { throw "Wallpaper data changed: $taskStage" }
        $taskStages += [pscustomobject]@{ stage=$taskStage; version=$taskExpected; wallpaperHashesUnchanged=$true }
    }
} finally { Pop-Location }
$taskResult = [pscustomobject]@{ recordedAtUtc=[DateTime]::UtcNow.ToString('o'); profileDir=$taskProfile; sourceData=$SourceData; fileCount=@(Get-ChildItem -LiteralPath $taskData -Recurse -File).Count; stages=$taskStages; desktopVisualAcceptance='not performed by this package lifecycle audit' }
$taskResult | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $PSScriptRoot '..\docs\wallpaper-reference\2026-10-08\INSTALLED_LIFECYCLE_2026-10-12.json') -Encoding UTF8
Write-Output ('Isolated installed-package lifecycle passed; retained Profile: ' + $taskProfile)
