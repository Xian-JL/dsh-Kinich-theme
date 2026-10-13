param([Parameter(Mandatory=$true)][string]$Case,[int]$R,[int]$A,[int]$E,[int]$V)
$ErrorActionPreference='Stop'
$taskRoot=Join-Path $env:USERPROFILE '.dsh\profiles\desktop\kinich-wallpaper'
$taskEvidence=Join-Path $PSScriptRoot '..\docs\wallpaper-reference\2026-10-13'
$taskExpected=@{rhythm=$R;amplitude=$A;elementDensity=$E;visibility=$V}
$taskMatched=$false
for($taskAttempt=0;$taskAttempt -lt 50;$taskAttempt++) {
    $taskState=(Get-Content -LiteralPath (Join-Path $taskRoot 'index.json') -Raw -Encoding UTF8 | ConvertFrom-Json).state
    $taskSnapshot=Get-Content -LiteralPath (Join-Path (Join-Path $taskRoot 'snapshots') ($taskState.active+'.json')) -Raw -Encoding UTF8 | ConvertFrom-Json
    $taskMatched=@($taskExpected.Keys | Where-Object { $taskSnapshot.parameters.$_ -ne $taskExpected[$_] }).Count -eq 0
    if($taskMatched){break}
    Start-Sleep -Milliseconds 100
}
$taskRecord=[pscustomobject]@{case=$Case;recordedAtUtc=[DateTime]::UtcNow.ToString('o');expected=$taskExpected;matched=$taskMatched;revision=$taskState.revision;activeHash=$taskState.active;historyCount=$taskState.history.Count;mode=$taskSnapshot.mode;parameters=$taskSnapshot.parameters;sampledAccent=$taskSnapshot.sampledAccent;paletteCaptured=$taskSnapshot.paletteCaptured;autoPalette=$taskSnapshot.autoPalette;originVersion=$taskSnapshot.originVersion}
$taskRecordsPath=Join-Path $taskEvidence 'PARAMETER_NATIVE_RECORDS.json'
$taskRecords=@();if(Test-Path -LiteralPath $taskRecordsPath){$taskRecords=@(Get-Content -LiteralPath $taskRecordsPath -Raw -Encoding UTF8 | ConvertFrom-Json)}
$taskRecords=@($taskRecords | Where-Object case -ne $Case)+@($taskRecord)
ConvertTo-Json -InputObject $taskRecords -Depth 10 | Set-Content -LiteralPath $taskRecordsPath -Encoding UTF8
$taskRecord | Select-Object case,matched,revision,parameters,mode,sampledAccent,paletteCaptured | ConvertTo-Json -Depth 8 -Compress
if(-not $taskMatched){throw 'Native UI change has not persisted with the expected parameters.'}
