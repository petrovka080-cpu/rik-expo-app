param(
  [string]$ManifestPath = ".release-runtime/real-useful-estimates-r2/evidence/phase2-delete-manifest/14_EARLY_DELETE_MANIFEST.json"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $parent = Split-Path -Parent $Path
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Get-Sha256 {
  param([string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-TextSha256 {
  param([string]$Text)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

$repoRoot = (& git rev-parse --show-toplevel | Select-Object -First 1).Replace("/", "\")
$manifestAbsolute = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ManifestPath))
$manifest = Get-Content -LiteralPath $manifestAbsolute -Raw | ConvertFrom-Json
if ($manifest.status -ne "AWAITING_EXPLICIT_DELETE_APPROVAL" -or $manifest.safety.deletion_performed) {
  throw "cleanup manifest is not in the expected no-delete state"
}
$nodeEntries = @($manifest.entries | Where-Object { $_.category -eq "NODE_MODULES" })
$groups = @($nodeEntries | Group-Object { "$($_.backup_sha256)|$($_.package_json_sha256)" } | Sort-Object Name)
$proofs = New-Object System.Collections.Generic.List[object]

foreach ($group in $groups) {
  $sample = $group.Group[0]
  $owner = [string]$sample.owner_worktree
  $lockPath = Join-Path $owner "package-lock.json"
  $packagePath = Join-Path $owner "package.json"
  $lockBefore = Get-Sha256 $lockPath
  $packageBefore = Get-Sha256 $packagePath
  if ($lockBefore -ne $sample.backup_sha256 -or $packageBefore -ne $sample.package_json_sha256) {
    throw "recovery input hash drifted before npm dry-run: $owner"
  }
  $stopwatch = [Diagnostics.Stopwatch]::StartNew()
  $output = @(& npm.cmd ci --dry-run --ignore-scripts --workspaces=false --no-audit --no-fund --loglevel=error --prefix $owner 2>&1)
  $exitCode = $LASTEXITCODE
  $stopwatch.Stop()
  $outputText = ($output -join "`n") + "`n"
  $lockAfter = Get-Sha256 $lockPath
  $packageAfter = Get-Sha256 $packagePath
  $passed = $exitCode -eq 0 -and $lockAfter -eq $lockBefore -and $packageAfter -eq $packageBefore
  $proofs.Add([pscustomobject][ordered]@{
    lockfile_sha256 = $lockBefore
    package_json_sha256 = $packageBefore
    representative_worktree = $owner.Replace("\", "/")
    covered_manifest_entries = $group.Count
    command = "npm ci --dry-run --ignore-scripts --workspaces=false --no-audit --no-fund --loglevel=error"
    exit_code = $exitCode
    elapsed_seconds = [math]::Round($stopwatch.Elapsed.TotalSeconds, 3)
    output_sha256 = Get-TextSha256 $outputText
    output_lines = $output.Count
    lockfile_unchanged = $lockAfter -eq $lockBefore
    package_json_unchanged = $packageAfter -eq $packageBefore
    passed = $passed
  })
}

$proofArray = @($proofs.ToArray())
$coveredEntries = [int](($proofArray | Measure-Object covered_manifest_entries -Sum).Sum)
$failed = @($proofArray | Where-Object { -not $_.passed })
$report = [ordered]@{
  schema_version = "real-useful-estimates-r2.early-cleanup-recovery-proof.v1"
  generated_at_utc = [DateTime]::UtcNow.ToString("o")
  status = if ($failed.Count -eq 0 -and $coveredEntries -eq $nodeEntries.Count) {
    "GREEN_NODE_MODULES_REINSTALL_DRY_RUN"
  } else {
    "RED_NODE_MODULES_REINSTALL_DRY_RUN"
  }
  deletion_performed = $false
  manifest = [ordered]@{
    path = $manifestAbsolute.Replace("\", "/")
    sha256 = Get-Sha256 $manifestAbsolute
    node_modules_entries = $nodeEntries.Count
  }
  unique_lock_package_pairs = $groups.Count
  covered_manifest_entries = $coveredEntries
  failed_groups = $failed.Count
  proofs = $proofArray
}
$outputRoot = Split-Path -Parent $manifestAbsolute
$reportPath = Join-Path $outputRoot "16_NODE_MODULES_RECOVERY_PROOF.json"
Write-Utf8NoBom -Path $reportPath -Content (($report | ConvertTo-Json -Depth 50) + "`n")
$reportSha = Get-Sha256 $reportPath
Write-Utf8NoBom -Path (Join-Path $outputRoot "16_NODE_MODULES_RECOVERY_PROOF.sha256") -Content "$reportSha  16_NODE_MODULES_RECOVERY_PROOF.json`n"

[ordered]@{
  status = $report.status
  report = $reportPath.Replace("\", "/")
  report_sha256 = $reportSha
  unique_pairs = $groups.Count
  covered_entries = $coveredEntries
  failed_groups = $failed.Count
  deletion_performed = $false
} | ConvertTo-Json

if ($report.status -ne "GREEN_NODE_MODULES_REINSTALL_DRY_RUN") { exit 1 }
