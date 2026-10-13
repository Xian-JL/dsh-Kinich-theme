$ErrorActionPreference = 'Stop'
$taskRepository = Split-Path -Parent $PSScriptRoot
$taskWorkspace = Split-Path -Parent $taskRepository
$taskFixture = Join-Path "$env:USERPROFILE\.dsh\profiles" ('.kinich-installer-test-' + [guid]::NewGuid().ToString('N'))
$taskFixture = [IO.Path]::GetFullPath($taskFixture)
if (-not $taskFixture.StartsWith([IO.Path]::GetFullPath("$env:USERPROFILE\.dsh\profiles\.kinich-installer-test-"),[StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected fixture Profile path.' }
$taskPnpm = Get-Command pnpm -ErrorAction Stop
$taskSourceFiles = @('package.json','src\client\wallpaper\stage.js','src\host\wallpaper\store.js','docs\wallpaper-reference\2026-10-08\CANDIDATE_PACKAGE_2026-10-11.json')
$taskSourceHashes = @{}
foreach ($taskName in $taskSourceFiles) { $taskSourceHashes[$taskName]=(Get-FileHash -LiteralPath (Join-Path $taskRepository $taskName)).Hash }
New-Item -ItemType Directory -Path $taskFixture -Force | Out-Null
$taskUtf8 = New-Object System.Text.UTF8Encoding($false)
$taskPackageJson = [ordered]@{name='kinich-installer-test';private=$true;dependencies=[ordered]@{'dsh-kinich-theme'=('link:'+$taskRepository.Replace('\','/'));fflate='0.8.3'};dsh=@{profile=@{bundles=@('dsh-kinich-theme')}}}
[IO.File]::WriteAllText((Join-Path $taskFixture 'package.json'),($taskPackageJson | ConvertTo-Json -Depth 8),$taskUtf8)
[IO.File]::WriteAllText((Join-Path $taskFixture 'pnpm-workspace.yaml'),"packages:`n  - .`nnodeLinker: hoisted`nautoInstallPeers: false`n",$taskUtf8)
$taskFixtureData = Join-Path $taskFixture 'kinich-wallpaper'
New-Item -ItemType Directory -Path $taskFixtureData | Out-Null
[IO.File]::WriteAllText((Join-Path $taskFixtureData 'index.json'),'{"fixture":"wallpaper-preservation"}',$taskUtf8)
Push-Location -LiteralPath $taskFixture
try { & $taskPnpm.Source install --ignore-scripts; if ($LASTEXITCODE -ne 0) { throw 'Fixture bootstrap failed.' } } finally { Pop-Location }
$taskOldEntry = Join-Path $taskFixture 'node_modules\dsh-kinich-theme'
if ((Get-Item -LiteralPath $taskOldEntry -Force).LinkType -ne 'Junction') { throw 'Fixture did not create the original workspace Junction.' }
$taskDataHash = (Get-FileHash -LiteralPath (Join-Path $taskFixtureData 'index.json')).Hash
& (Join-Path $taskWorkspace 'Install-Kinich-Desktop.ps1') -ProfileDir $taskFixture
if (-not $?) { throw 'Isolated installer execution failed.' }
$taskInstalled = Get-Content -LiteralPath (Join-Path $taskOldEntry 'package.json') -Encoding UTF8 -Raw | ConvertFrom-Json
$taskRecord = Get-Content -LiteralPath (Join-Path $taskRepository 'docs\wallpaper-reference\2026-10-08\CANDIDATE_PACKAGE_2026-10-11.json') -Encoding UTF8 -Raw | ConvertFrom-Json
if ($taskInstalled.version -ne $taskRecord.version) { throw 'Fixture installed version mismatch.' }
if ((Get-FileHash -LiteralPath (Join-Path $taskFixtureData 'index.json')).Hash -ne $taskDataHash) { throw 'Fixture wallpaper data changed.' }
foreach ($taskName in $taskSourceFiles) { if ((Get-FileHash -LiteralPath (Join-Path $taskRepository $taskName)).Hash -ne $taskSourceHashes[$taskName]) { throw "Workspace source changed: $taskName" } }
$taskStaged = @(Get-ChildItem -LiteralPath (Join-Path $taskFixture '.kinich-install-staging') -Directory | ForEach-Object { Get-Item -LiteralPath (Join-Path $_.FullName 'previous-plugin') -Force })
if ($taskStaged.Count -ne 1 -or $taskStaged[0].LinkType -ne 'Junction') { throw 'Staged original is not the original Junction entry.' }
Write-Output "Isolated Windows PowerShell installer passed: hoisted pnpm link-to-tarball, actual $($taskInstalled.version) package, same-volume Junction staging, source hashes and wallpaper bytes preserved."
Write-Output "Retained isolated fixture (no Desktop data touched): $taskFixture"
