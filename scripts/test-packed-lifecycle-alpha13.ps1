param([string]$ReleaseVersion='2.0.0')
$ErrorActionPreference='Stop'
$taskRepo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskWorkspace=[IO.Path]::GetFullPath((Join-Path $taskRepo '..'))
$taskArchive=Join-Path $taskWorkspace 'Kinich_archive'
$taskProfile=[IO.Path]::GetFullPath((Join-Path $taskArchive ('packed-release-profile-'+[guid]::NewGuid().ToString('N'))))
if(-not $taskProfile.StartsWith($taskArchive+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid isolated Profile target.'}
$taskCandidate=Join-Path $taskWorkspace ('dsh-kinich-theme-'+$ReleaseVersion+'.tgz')
$taskOld=Join-Path $taskArchive '2026-10-13_cleanup_093113_017\packages\dsh-kinich-theme-1.8.1.tgz'
foreach($taskPackage in @($taskCandidate,$taskOld)){if(-not(Test-Path -LiteralPath $taskPackage -PathType Leaf)){throw "Missing package: $taskPackage"}}
$null=New-Item -ItemType Directory -Path $taskProfile
[IO.File]::WriteAllText((Join-Path $taskProfile 'package.json'),'{"name":"kinich-alpha13-lifecycle","version":"1.0.0","private":true,"dsh":{"profile":{"bundles":["dsh-kinich-theme"]}}}',[Text.UTF8Encoding]::new($false))
function Install-AuditPackage([string]$Package){
    npm install --prefix $taskProfile $Package --ignore-scripts --omit=dev --legacy-peer-deps --no-audit --no-fund | Out-Null
    if($LASTEXITCODE -ne 0){throw 'Isolated package installation failed.'}
}
function Get-AuditDataDigest {
    $taskData=Join-Path $taskProfile 'kinich-wallpaper'
    return (@(Get-ChildItem -LiteralPath $taskData -Recurse -File | Sort-Object FullName | ForEach-Object { $_.FullName.Substring($taskData.Length)+':'+$_.Length+':'+(Get-FileHash -LiteralPath $_.FullName).Hash }) -join "`n")
}
Install-AuditPackage $taskCandidate
node (Join-Path $PSScriptRoot 'check-packed-profile.mjs') $taskProfile initial $ReleaseVersion
if($LASTEXITCODE -ne 0){throw 'Installed candidate Host check failed.'}
$taskBefore=Get-AuditDataDigest
$taskResults=[Collections.Generic.List[object]]::new()
foreach($taskStage in @('rollback-1.8.1','reupgrade','uninstall','reinstall')){
    if($taskStage -eq 'uninstall'){
        npm uninstall --prefix $taskProfile dsh-kinich-theme --ignore-scripts --no-audit --no-fund | Out-Null
        if($LASTEXITCODE -ne 0){throw 'Isolated package uninstall failed.'}
        if(Test-Path -LiteralPath (Join-Path $taskProfile 'node_modules\dsh-kinich-theme\package.json')){throw 'Uninstall retained the package.'}
        $taskVersion='absent'
    }else{
        Install-AuditPackage $(if($taskStage -eq 'rollback-1.8.1'){$taskOld}else{$taskCandidate})
        $taskVersion=(Get-Content -LiteralPath (Join-Path $taskProfile 'node_modules\dsh-kinich-theme\package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
        $taskExpected=if($taskStage -eq 'rollback-1.8.1'){'1.8.1'}else{$ReleaseVersion}
        if($taskVersion -ne $taskExpected){throw 'Installed version mismatch.'}
        if($taskStage -ne 'rollback-1.8.1'){
            node (Join-Path $PSScriptRoot 'check-packed-profile.mjs') $taskProfile $taskStage $ReleaseVersion
            if($LASTEXITCODE -ne 0){throw 'Installed Host durable reopen failed.'}
        }
    }
    if((Get-AuditDataDigest) -cne $taskBefore){throw "Durable data changed at $taskStage"}
    $taskResults.Add([pscustomobject]@{stage=$taskStage;installedVersion=$taskVersion;durableHashesUnchanged=$true})
}
$taskRecord=[pscustomobject]@{date=(Get-Date -Format 'yyyy-MM-dd');version=$ReleaseVersion;profileDir=$taskProfile;stages=@($taskResults.ToArray());verification='actual installed Host bundle with isolated mock DSH services, full packaged asset reads; no Desktop visual check';desktopProfileTouched=$false}
$taskRecord | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskRepo ('docs\wallpaper-reference\2026-10-13\PACKED_LIFECYCLE_'+$ReleaseVersion+'.json')) -Encoding UTF8
Write-Output ('Packed lifecycle passed. Isolated data retained at: '+$taskProfile)
