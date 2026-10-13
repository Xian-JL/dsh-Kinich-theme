$ErrorActionPreference = 'Stop'
$taskRepository = Split-Path -Parent $PSScriptRoot
$taskWorkspace = Split-Path -Parent $taskRepository
$taskInstaller = Join-Path $taskWorkspace 'Install-Kinich-Desktop.ps1'
$taskMetadata = Join-Path $taskRepository 'docs\wallpaper-reference\2026-10-08\CANDIDATE_PACKAGE_2026-10-11.json'
$taskRecord = Get-Content -LiteralPath $taskMetadata -Raw -Encoding UTF8 | ConvertFrom-Json
$taskExpectedNotice = @(0x5982,0x6709,0x4fb5,0x6743,0xff0c,0x8054,0x7cfb,0x5220,0x9664) | ForEach-Object { [char]$_ }
if ($taskRecord.thirdPartyLastLine -ne ($taskExpectedNotice -join '')) { throw 'Unicode metadata did not decode correctly.' }
$taskTokens = $null
$taskErrors = $null
$taskAst = [System.Management.Automation.Language.Parser]::ParseFile($taskInstaller,[ref]$taskTokens,[ref]$taskErrors)
if ($taskErrors.Count) { throw 'Installer parsing failed.' }
$taskUnsafeMoves = @($taskAst.FindAll({param($node) $node -is [System.Management.Automation.Language.CommandAst] -and $node.GetCommandName() -eq 'Move-Item'},$true))
if ($taskUnsafeMoves.Count) { throw 'Installer must use guarded same-volume entry renames, not unguarded Move-Item.' }
$taskReads = @($taskAst.FindAll({param($node) $node -is [System.Management.Automation.Language.CommandAst] -and $node.GetCommandName() -eq 'Get-Content'},$true))
if ($taskReads.Count -ne 4) { throw 'Unexpected JSON read count; review the encoding checks.' }
foreach ($taskRead in $taskReads) {
    if ($taskRead.Extent.Text -notmatch '-Encoding\s+UTF8\b') { throw 'A JSON read has no explicit UTF-8 encoding.' }
}
& $taskInstaller -CheckOnly
if (-not $?) { throw 'Read-only installer preflight failed.' }
Write-Output "Desktop installer test passed on PowerShell $($PSVersionTable.PSVersion): Unicode notice, all four UTF-8 reads, syntax and read-only SHA-256 preflight."
