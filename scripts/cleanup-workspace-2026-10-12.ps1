param([switch]$Execute)
$ErrorActionPreference='Stop'
$taskWorkspace=[IO.Path]::GetFullPath('E:\Codex_workspace').TrimEnd('\')
$taskRepo=Join-Path $taskWorkspace 'dsh-Kinich-theme-Astra_optimized'
$taskArchive=Join-Path $taskWorkspace ('Kinich_archive\2026-10-12_' + [DateTime]::UtcNow.ToString('HHmmss'))
function Assert-WorkspacePath([string]$Path) {
    $taskAbsolute=[IO.Path]::GetFullPath($Path)
    if (-not $taskAbsolute.StartsWith($taskWorkspace+'\',[StringComparison]::OrdinalIgnoreCase)) { throw "Outside workspace: $taskAbsolute" }
    $taskParent=[IO.Path]::GetDirectoryName($taskAbsolute)
    while ($taskParent -and $taskParent -ne $taskWorkspace) {
        if ((Test-Path -LiteralPath $taskParent) -and ((Get-Item -LiteralPath $taskParent -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Reparse-point parent: $taskParent" }
        $taskParent=[IO.Path]::GetDirectoryName($taskParent)
    }
    return $taskAbsolute
}
$taskProtected=@(
    (Join-Path $taskWorkspace 'dsh-kinich-theme-2.0.0-alpha.10.tgz'),
    (Join-Path $taskWorkspace 'dsh-kinich-theme-2.0.0-alpha.9.tgz'),
    (Join-Path $taskWorkspace 'dsh-kinich-theme-1.8.1.tgz'),
    (Join-Path $taskWorkspace 'Install-Kinich-Desktop.ps1'),
    (Join-Path $taskWorkspace 'dsh-Xiao-theme\dsh-xiao-theme-1.1.3.tgz'),
    (Join-Path $taskRepo 'package.json'),
    (Join-Path $taskRepo 'lib\client.js'),
    (Join-Path $taskRepo 'docs\KINICH_COMPLEX_WALLPAPER_SPECIFICATION.md')
)
$taskBefore=@($taskProtected | ForEach-Object { [pscustomobject]@{path=$_;sha256=(Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash} })
$taskPackages=@(Get-ChildItem -LiteralPath $taskWorkspace -File | Where-Object Name -match '^dsh-kinich-theme-2\.0\.0-alpha\.[1-8]\.tgz$') + @(Get-ChildItem -LiteralPath $taskRepo -File | Where-Object Name -match '^dsh-kinich-theme-2\.0\.0-alpha\.[1-8]\.tgz$')
$taskBackups=@(Get-ChildItem -LiteralPath $taskWorkspace -Directory | Where-Object Name -match '^Kinich_(Desktop_install_backup_|wallpaper_backup_)')
$taskReferences=@('kinich-reference-d-2026-10-12.js','kinich-reference-gucci-2026-10-12.html') | ForEach-Object { Join-Path $taskWorkspace ('tmp\'+$_) } | Where-Object {Test-Path -LiteralPath $_ -PathType Leaf}
if (-not $Execute) { Write-Output ('Archive target: '+$taskArchive); $taskPackages.FullName; $taskBackups.FullName; $taskReferences; return }
$null=Assert-WorkspacePath $taskArchive
New-Item -ItemType Directory -Path $taskArchive | Out-Null
$taskOperations=[Collections.Generic.List[object]]::new()
$taskRecordPath=Join-Path $taskArchive 'CLEANUP_MANIFEST.json'
function Save-Record {
    [pscustomobject]@{date='2026-10-12';workspace=$taskWorkspace;archive=$taskArchive;operations=@($taskOperations.ToArray());protected=$taskBefore} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $taskRecordPath -Encoding UTF8
}
function Archive-Item([string]$Source,[string]$Group) {
    $taskFrom=Assert-WorkspacePath $Source
    $taskGroupDir=Assert-WorkspacePath (Join-Path $taskArchive $Group)
    if (-not (Test-Path -LiteralPath $taskGroupDir)) { New-Item -ItemType Directory -Path $taskGroupDir | Out-Null }
    $taskTo=Assert-WorkspacePath (Join-Path $taskGroupDir ([IO.Path]::GetFileName($taskFrom)))
    $taskItem=Get-Item -LiteralPath $taskFrom -Force
    if ($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Refusing archive of reparse-point root: $taskFrom" }
    if ([IO.Path]::GetPathRoot($taskFrom) -ne [IO.Path]::GetPathRoot($taskTo)) { throw 'Cross-volume archive prohibited.' }
    if ($taskItem.PSIsContainer) {
        if (Test-Path -LiteralPath $taskTo) {throw "Archive destination exists: $taskTo"}
        [IO.Directory]::Move($taskFrom,$taskTo)
        $taskOperations.Add([pscustomobject]@{action='archive-directory';from=$taskFrom;to=$taskTo})
    } else {
        $taskHash=(Get-FileHash -LiteralPath $taskFrom -Algorithm SHA256).Hash
        if (Test-Path -LiteralPath $taskTo) {
            if ((Get-FileHash -LiteralPath $taskTo -Algorithm SHA256).Hash -ne $taskHash) {throw "Different file at archive destination: $taskTo"}
            Remove-Item -LiteralPath $taskFrom
            $taskOperations.Add([pscustomobject]@{action='remove-verified-duplicate';from=$taskFrom;retained=$taskTo;bytes=$taskItem.Length;sha256=$taskHash})
        } else {
            [IO.File]::Move($taskFrom,$taskTo)
            if ((Get-FileHash -LiteralPath $taskTo -Algorithm SHA256).Hash -ne $taskHash) {throw "Archive hash changed: $taskTo"}
            $taskOperations.Add([pscustomobject]@{action='archive-file';from=$taskFrom;to=$taskTo;bytes=$taskItem.Length;sha256=$taskHash})
        }
    }
    Save-Record
}
Save-Record
foreach ($taskItem in $taskPackages) {Archive-Item $taskItem.FullName 'packages'}
foreach ($taskItem in $taskBackups) {Archive-Item $taskItem.FullName 'backups'}
foreach ($taskReference in $taskReferences) {Archive-Item $taskReference 'reference-source'}
$taskDerived=Assert-WorkspacePath (Join-Path $taskWorkspace 'tmp\kinich-reference-readable-2026-10-12.js')
if (Test-Path -LiteralPath $taskDerived -PathType Leaf) {
    $taskBytes=(Get-Item -LiteralPath $taskDerived).Length
    Remove-Item -LiteralPath $taskDerived
    $taskOperations.Add([pscustomobject]@{action='remove-regenerable-reference-format';from=$taskDerived;bytes=$taskBytes});Save-Record
}
$taskFixture=Assert-WorkspacePath (Join-Path $taskWorkspace 'tmp\kinich-install-move-test-b423decb77544d1ba6eac5afce87492e')
if (Test-Path -LiteralPath $taskFixture) {
    $taskLink=Assert-WorkspacePath (Join-Path $taskFixture 'previous-plugin')
    $taskSource=Assert-WorkspacePath (Join-Path $taskFixture 'source')
    $taskLinkItem=Get-Item -LiteralPath $taskLink -Force
    $taskLinkTargets=@($taskLinkItem.Target)
    if ($taskLinkItem.LinkType -ne 'Junction' -or $taskLinkTargets.Count -ne 1 -or [IO.Path]::GetFullPath($taskLinkTargets[0]) -ne $taskSource) {throw 'Unexpected fixture Junction target.'}
    $taskMarker=Assert-WorkspacePath (Join-Path $taskSource 'marker.txt')
    if (@(Get-ChildItem -LiteralPath $taskSource -Force).Count -ne 1 -or -not (Test-Path -LiteralPath $taskMarker -PathType Leaf)) {throw 'Unexpected fixture contents.'}
    # Unlink only the Junction entry; never recurse through it.
    [IO.Directory]::Delete($taskLink,$false)
    Remove-Item -LiteralPath $taskMarker
    [IO.Directory]::Delete($taskSource,$false)
    [IO.Directory]::Delete($taskFixture,$false)
    $taskOperations.Add([pscustomobject]@{action='remove-isolated-fixture-nonrecursive';from=$taskFixture});Save-Record
}
foreach ($taskEntry in $taskBefore) {if ((Get-FileHash -LiteralPath $taskEntry.path -Algorithm SHA256).Hash -ne $taskEntry.sha256) {throw "Protected file changed: $($taskEntry.path)"}}
$taskManifest=Get-Content -LiteralPath $taskRecordPath -Raw -Encoding UTF8 | ConvertFrom-Json
$taskManifest | Add-Member -NotePropertyName protectedHashesVerified -NotePropertyValue $true
$taskManifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $taskRecordPath -Encoding UTF8
Write-Output ('Cleanup complete. Manifest: '+$taskRecordPath)
Write-Output ('Operations: '+$taskOperations.Count)
