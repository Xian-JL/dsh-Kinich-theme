param([switch]$Execute)
$ErrorActionPreference = 'Stop'
$taskWorkspace = [IO.Path]::GetFullPath('E:\Codex_workspace').TrimEnd('\')
$taskRepo = Join-Path $taskWorkspace 'dsh-Kinich-theme-Astra_optimized'
$taskAudit = Join-Path $taskRepo 'docs\wallpaper-reference\2026-10-13'
$taskArchive = Join-Path $taskWorkspace ('Kinich_archive\2026-10-13_cleanup_' + (Get-Date -Format 'HHmmss_fff'))
function Assert-TaskPath([string]$Path) {
    $taskAbsolute = [IO.Path]::GetFullPath($Path)
    if (-not $taskAbsolute.StartsWith($taskWorkspace + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Outside workspace: $taskAbsolute" }
    $taskAncestor = $taskAbsolute
    while ($taskAncestor -and $taskAncestor -ne $taskWorkspace) {
        if (Test-Path -LiteralPath $taskAncestor) {
            if ((Get-Item -LiteralPath $taskAncestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse point: $taskAncestor" }
        }
        $taskAncestor = [IO.Path]::GetDirectoryName($taskAncestor)
    }
    return $taskAbsolute
}
$taskTargets = @(
    @{path=(Join-Path $taskWorkspace 'dsh-kinich-theme-1.8.1.tgz');group='packages'},
    @{path=(Join-Path $taskWorkspace 'dsh-kinich-theme-2.0.0-alpha.9.tgz');group='packages'},
    @{path=(Join-Path $taskWorkspace 'dsh-kinich-theme-2.0.0-alpha.10.tgz');group='packages'},
    @{path=(Join-Path $taskWorkspace 'Kinich_Desktop_install_backup_2026-10-13_082657_062');group='backups'},
    @{path=(Join-Path $taskAudit 'baseline');group='acceptance-fixtures'},
    @{path=(Join-Path $taskAudit 'fixtures');group='acceptance-fixtures'},
    @{path=(Join-Path $taskAudit 'reference-script-readable.js');group='reference-source'}
)
$taskProtected = @(
    (Join-Path $taskWorkspace 'dsh-kinich-theme-2.0.0-alpha.11.tgz'),
    (Join-Path $taskWorkspace 'Install-Kinich-Desktop.ps1'),
    (Join-Path $taskWorkspace 'dsh-Xiao-theme\dsh-xiao-theme-1.1.3.tgz'),
    (Join-Path $taskRepo 'package.json'),
    (Join-Path $taskRepo 'lib\client.js'),
    (Join-Path $taskRepo 'lib\index.js'),
    (Join-Path $taskRepo 'docs\KINICH_COMPLEX_WALLPAPER_SPECIFICATION.md')
)
$taskBefore = @($taskProtected | ForEach-Object { [pscustomobject]@{path=$_;sha256=(Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash} })
foreach ($taskTarget in $taskTargets) { $null = Assert-TaskPath $taskTarget.path }
$null = Assert-TaskPath $taskArchive
if (-not $Execute) {
    Write-Output ('Archive: ' + $taskArchive)
    $taskTargets | ForEach-Object { if (Test-Path -LiteralPath $_.path) { Write-Output $_.path } }
    return
}
$null = New-Item -ItemType Directory -Path $taskArchive
$taskOperations = [Collections.Generic.List[object]]::new()
$taskManifestPath = Join-Path $taskArchive 'CLEANUP_MANIFEST.json'
function Save-TaskManifest([bool]$Verified=$false) {
    [pscustomobject]@{
        date='2026-10-13';timezone='Asia/Shanghai';workspace=$taskWorkspace;archive=$taskArchive
        policy='Archive allowlisted Kinich artifacts only; do not touch installed Profile or restore cleared history.'
        operations=@($taskOperations.ToArray());protected=$taskBefore;protectedHashesVerified=$Verified
    } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $taskManifestPath -Encoding UTF8
}
Save-TaskManifest
foreach ($taskTarget in $taskTargets) {
    $taskFrom = Assert-TaskPath $taskTarget.path
    if (-not (Test-Path -LiteralPath $taskFrom)) { continue }
    $taskGroup = Assert-TaskPath (Join-Path $taskArchive $taskTarget.group)
    if (-not (Test-Path -LiteralPath $taskGroup)) { $null = New-Item -ItemType Directory -Path $taskGroup }
    $taskTo = Assert-TaskPath (Join-Path $taskGroup ([IO.Path]::GetFileName($taskFrom)))
    if (Test-Path -LiteralPath $taskTo) { throw "Destination exists: $taskTo" }
    if ([IO.Path]::GetPathRoot($taskFrom) -ne [IO.Path]::GetPathRoot($taskTo)) { throw 'Cross-volume move prohibited.' }
    $taskItem = Get-Item -LiteralPath $taskFrom -Force
    if ($taskItem.PSIsContainer) {
        [IO.Directory]::Move($taskFrom,$taskTo)
        $taskOperations.Add([pscustomobject]@{action='archive-directory';from=$taskFrom;to=$taskTo})
    } else {
        $taskHash = (Get-FileHash -LiteralPath $taskFrom -Algorithm SHA256).Hash
        [IO.File]::Move($taskFrom,$taskTo)
        if ((Get-FileHash -LiteralPath $taskTo -Algorithm SHA256).Hash -ne $taskHash) { throw "Changed hash: $taskTo" }
        $taskOperations.Add([pscustomobject]@{action='archive-file';from=$taskFrom;to=$taskTo;bytes=$taskItem.Length;sha256=$taskHash})
    }
    Save-TaskManifest
}
foreach ($taskEntry in $taskBefore) {
    if ((Get-FileHash -LiteralPath $taskEntry.path -Algorithm SHA256).Hash -ne $taskEntry.sha256) { throw "Protected file changed: $($taskEntry.path)" }
}
Save-TaskManifest $true
Write-Output ('Archived items: ' + $taskOperations.Count)
Write-Output ('Manifest: ' + $taskManifestPath)
