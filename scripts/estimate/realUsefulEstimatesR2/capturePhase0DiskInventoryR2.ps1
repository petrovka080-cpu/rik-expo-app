param(
  [string]$EvidenceRoot = ".release-runtime/real-useful-estimates-r2/evidence",
  [ValidateRange(1, 114)]
  [int]$BatchSize = 10
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $parent = Split-Path -Parent $Path
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Write-Json {
  param([string]$Path, [object]$Value)
  Write-Utf8NoBom -Path $Path -Content (($Value | ConvertTo-Json -Depth 100) + "`n")
}

function Read-Json {
  param([string]$Path)
  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-Sha256 {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Invoke-GitLines {
  param([string[]]$Arguments)
  $lines = @(& git -c core.quotepath=false @Arguments 2>$null)
  if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE" }
  return $lines
}

function Convert-WindowsPathToDockerDesktopWsl {
  param([string]$Path)
  $full = [System.IO.Path]::GetFullPath($Path)
  $drive = $full.Substring(0, 1).ToLowerInvariant()
  $tail = $full.Substring(2).Replace("\", "/")
  return "/tmp/docker-desktop-root/run/desktop/mnt/host/$drive$tail"
}

function Get-WslDuBytes {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return [int64]0 }
  $wslPath = Convert-WindowsPathToDockerDesktopWsl $Path
  if ($wslPath.Contains("'")) { throw "WSL disk path contains unsupported single quote: $Path" }
  $output = @(& wsl.exe -e sh -lc "du -sb '$wslPath' 2>/dev/null | tail -n 1")
  if ($LASTEXITCODE -ne 0 -or $output.Count -eq 0) { throw "du failed for $Path" }
  $first = ($output[-1] -split "`t|\s+", 2)[0]
  $parsed = [int64]0
  if (-not [int64]::TryParse($first, [ref]$parsed)) { throw "du returned an invalid byte count for $Path" }
  return $parsed
}

function Save-Checkpoint {
  param([string]$Path, [object]$Checkpoint)
  $Checkpoint.updated_at_utc = [DateTime]::UtcNow.ToString("o")
  Write-Json -Path $Path -Value $Checkpoint
}

function Get-FieldSum {
  param([object[]]$Items, [string]$Field)
  $sum = [int64]0
  foreach ($item in $Items) {
    $value = $item.$Field
    if ($null -ne $value) { $sum += [int64]$value }
  }
  return $sum
}

function Set-ExecutionDiskState {
  param([string]$ExecutionStatePath, [string]$Gate, [string]$FreeSpaceGate, [object]$Progress)
  $state = Read-Json $ExecutionStatePath
  $state.current_phase = "PHASE_0_SOURCE_CAPTURED_DISK_INVENTORY_IN_PROGRESS"
  $state.disk_gate = $Gate
  $state.free_space_gate = $FreeSpaceGate
  $state.safe_cleanup = "RED_READ_ONLY_INVENTORY_NO_DELETE_AUTHORIZATION"
  $state | Add-Member -NotePropertyName disk_inventory_progress -NotePropertyValue $Progress -Force
  Write-Json -Path $ExecutionStatePath -Value $state
}

$repoRoot = (Invoke-GitLines @("rev-parse", "--show-toplevel") | Select-Object -First 1).Replace("/", "\")
Set-Location -LiteralPath $repoRoot
$evidenceAbsolute = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $EvidenceRoot))
New-Item -ItemType Directory -Path $evidenceAbsolute -Force | Out-Null
$generatedAt = [DateTime]::UtcNow.ToString("o")
$masterPath = "C:\Users\User\Downloads\MASTER_TZ_PRODUCTION_GRADE_CANONICAL_CODE_GREEN_REAL_ESTIMATES_SAFE_CLEANUP_R2_RU.md"
$masterSha = Get-Sha256 $masterPath
$scriptSha = Get-Sha256 $MyInvocation.MyCommand.Path
$sourceIdentityPath = Join-Path $evidenceAbsolute "01_SOURCE_IDENTITY.json"
$executionStatePath = Join-Path $evidenceAbsolute "00_EXECUTION_STATE.json"
if (-not (Test-Path -LiteralPath $sourceIdentityPath)) { throw "01_SOURCE_IDENTITY.json is required before disk inventory" }
$sourceIdentitySha = Get-Sha256 $sourceIdentityPath
$checkpointRoot = Join-Path $evidenceAbsolute ("disk-inventory-checkpoints\" + $sourceIdentitySha.Substring(0, 16))
New-Item -ItemType Directory -Path $checkpointRoot -Force | Out-Null
$failureLedgerPath = Join-Path $evidenceAbsolute "09_DISK_INVENTORY_ATTEMPT_FAILURES.json"
if (-not (Test-Path -LiteralPath $failureLedgerPath)) {
  Write-Json -Path $failureLedgerPath -Value ([ordered]@{
    schema_version = "real-useful-estimates-r2.disk-inventory-attempt-failures.v1"
    generated_at_utc = $generatedAt
    attempts = @([ordered]@{
      attempt = 1
      command = "capturePhase0DiskInventoryR2.ps1 (pre-checkpoint implementation)"
      result = "REJECTED_TIMEOUT"
      exit_code = 124
      elapsed_seconds = 3604
      partial_manifest_accepted = $false
      root_cause = "All 114 worktree measurements were retained in memory and the process reached the one-hour command limit before atomic output."
      corrective_action = "Incremental per-worktree and per-field checkpoints with identity-bound resume."
      deletion_performed = $false
    })
    parent_source_identity_sha256 = $sourceIdentitySha
    master_contract_sha256 = $masterSha
    tool_sha256 = $scriptSha
    status = "FAILURE_RECORDED_NOT_A_GREEN_GATE"
  })
}

$volumePath = Join-Path $evidenceAbsolute "10_DISK_VOLUME_BEFORE.json"
$volumeNeedsCapture = -not (Test-Path -LiteralPath $volumePath)
if (-not $volumeNeedsCapture) {
  $existingVolume = Read-Json $volumePath
  if ($existingVolume.parent_source_identity_sha256 -ne $sourceIdentitySha) {
    $attemptOneVolumePath = Join-Path $evidenceAbsolute "10_DISK_VOLUME_BEFORE_ATTEMPT1_REJECTED.json"
    if (-not (Test-Path -LiteralPath $attemptOneVolumePath)) { Write-Json -Path $attemptOneVolumePath -Value $existingVolume }
    $volumeNeedsCapture = $true
  }
}
if ($volumeNeedsCapture) {
  $volume = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  Write-Json -Path $volumePath -Value ([ordered]@{
    schema_version = "real-useful-estimates-r2.disk-volume-before.v1"
    generated_at_utc = $generatedAt
    volume = "C:"
    filesystem = $volume.FileSystem
    size_bytes = [int64]$volume.Size
    free_bytes = [int64]$volume.FreeSpace
    used_bytes = [int64]($volume.Size - $volume.FreeSpace)
    free_gib = [math]::Round($volume.FreeSpace / 1GB, 3)
    thresholds = [ordered]@{ heavy_stop_below_gib = 30; bounded_android_minimum_gib = 60; working_minimum_gib = 80; preferred_final_gib = 100 }
    gate = if ($volume.FreeSpace -lt 30GB) { "STOP_HEAVY_OPERATIONS" } elseif ($volume.FreeSpace -lt 60GB) { "READ_ONLY_AND_LIGHTWEIGHT_ONLY_NO_ANDROID_PROOF" } else { "BOUNDED_ANDROID_SPACE_GATE_GREEN" }
    parent_source_identity_sha256 = $sourceIdentitySha
    master_contract_sha256 = $masterSha
    tool_sha256 = $scriptSha
  })
}
$volumeBefore = Read-Json $volumePath
$volumeNow = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeSpaceGateNow = if ($volumeNow.FreeSpace -lt 30GB) { "STOP_HEAVY_OPERATIONS_READ_ONLY_ONLY" } elseif ($volumeNow.FreeSpace -lt 60GB) { "NO_ANDROID_PROOF" } else { "BOUNDED_ANDROID_SPACE_GATE_GREEN" }

$worktreeLines = @(Invoke-GitLines @("worktree", "list", "--porcelain"))
$blocks = New-Object System.Collections.Generic.List[object]
$current = [ordered]@{}
foreach ($line in @($worktreeLines + "")) {
  if ([string]::IsNullOrWhiteSpace($line)) {
    if ($current.Contains("worktree")) { $blocks.Add($current) }
    $current = [ordered]@{}
    continue
  }
  $parts = $line -split " ", 2
  if ($parts.Count -eq 1) { $current[$parts[0]] = $true } else { $current[$parts[0]] = $parts[1] }
}

$allProcesses = @(Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine)
$newlyCompleted = 0
for ($index = 0; $index -lt $blocks.Count -and $newlyCompleted -lt $BatchSize; $index++) {
  $block = $blocks[$index]
  $path = [System.IO.Path]::GetFullPath($block.worktree.Replace("/", "\"))
  $checkpointPath = Join-Path $checkpointRoot ("worktree-{0:D3}.json" -f ($index + 1))
  if (Test-Path -LiteralPath $checkpointPath) {
    $checkpoint = Read-Json $checkpointPath
    if ($checkpoint.absolute_path -ne $path.Replace("\", "/")) { throw "checkpoint path mismatch at index $index" }
    if ($checkpoint.complete) { continue }
  } else {
    $checkpoint = [pscustomobject][ordered]@{
      schema_version = "real-useful-estimates-r2.disk-worktree-checkpoint.v1"
      index = $index + 1
      total = $blocks.Count
      absolute_path = $path.Replace("\", "/")
      volume = [System.IO.Path]::GetPathRoot($path).TrimEnd("\")
      exists = Test-Path -LiteralPath $path -PathType Container
      head = if ($block.Contains("HEAD")) { $block.HEAD } else { $null }
      branch = if ($block.Contains("branch")) { $block.branch } elseif ($block.Contains("detached")) { "DETACHED" } else { $null }
      locked = $block.Contains("locked")
      prunable = $block.Contains("prunable")
      tracked_dirty_count = $null
      untracked_count = $null
      bytes_total = $null
      node_modules_bytes = $null
      android_build_bytes = $null
      release_runtime_bytes = $null
      active_processes_using_path = @()
      unique_commit_or_patch_status = "NOT_YET_PROVEN"
      classification = "UNKNOWN"
      complete = $false
      parent_source_identity_sha256 = $sourceIdentitySha
      master_contract_sha256 = $masterSha
      tool_sha256 = $scriptSha
      updated_at_utc = $null
    }
    Save-Checkpoint -Path $checkpointPath -Checkpoint $checkpoint
  }

  if (-not $checkpoint.exists) {
    $checkpoint.classification = "UNKNOWN_MISSING_REGISTERED_WORKTREE"
    $checkpoint.complete = $true
    Save-Checkpoint -Path $checkpointPath -Checkpoint $checkpoint
    $newlyCompleted++
    continue
  }

  if ($null -eq $checkpoint.tracked_dirty_count) {
    $status = @(& git -C $path -c core.quotepath=false status --porcelain=v2 --untracked-files=all 2>$null)
    if ($LASTEXITCODE -ne 0) { throw "git status failed for $path" }
    $checkpoint.tracked_dirty_count = @($status | Where-Object { $_ -match '^[12u] ' }).Count
    $checkpoint.untracked_count = @($status | Where-Object { $_ -match '^\? ' }).Count
    $normalized = $path.ToLowerInvariant()
    $checkpoint.active_processes_using_path = @($allProcesses | Where-Object { $_.CommandLine -and $_.CommandLine.ToLowerInvariant().Contains($normalized) } | Select-Object ProcessId, Name, CommandLine)
    Save-Checkpoint -Path $checkpointPath -Checkpoint $checkpoint
  }
  if ($null -eq $checkpoint.bytes_total) {
    $checkpoint.bytes_total = Get-WslDuBytes $path
    Save-Checkpoint -Path $checkpointPath -Checkpoint $checkpoint
  }
  if ($null -eq $checkpoint.node_modules_bytes) {
    $checkpoint.node_modules_bytes = Get-WslDuBytes (Join-Path $path "node_modules")
    Save-Checkpoint -Path $checkpointPath -Checkpoint $checkpoint
  }
  if ($null -eq $checkpoint.release_runtime_bytes) {
    $checkpoint.release_runtime_bytes = Get-WslDuBytes (Join-Path $path ".release-runtime")
    Save-Checkpoint -Path $checkpointPath -Checkpoint $checkpoint
  }
  if ($null -eq $checkpoint.android_build_bytes) {
    $androidBuildBytes = [int64]0
    foreach ($candidate in @((Join-Path $path "android\build"), (Join-Path $path "android\app\build"))) {
      $androidBuildBytes += [int64](Get-WslDuBytes $candidate)
    }
    $androidApp = Join-Path $path "android\app"
    foreach ($candidate in @(Get-ChildItem -LiteralPath $androidApp -Directory -Filter "build-*" -ErrorAction SilentlyContinue)) {
      $androidBuildBytes += [int64](Get-WslDuBytes $candidate.FullName)
    }
    $checkpoint.android_build_bytes = $androidBuildBytes
    Save-Checkpoint -Path $checkpointPath -Checkpoint $checkpoint
  }
  $checkpoint.classification = if ($path -ieq $repoRoot) { "KEEP_CANONICAL" } elseif ($checkpoint.tracked_dirty_count -gt 0 -or $checkpoint.untracked_count -gt 0) { "KEEP_UNIQUE_DIRTY" } else { "UNKNOWN_REQUIRES_UNIQUE_COMMIT_AND_EVIDENCE_AUDIT" }
  $checkpoint.complete = $true
  Save-Checkpoint -Path $checkpointPath -Checkpoint $checkpoint
  $newlyCompleted++
}

$checkpointFiles = @(Get-ChildItem -LiteralPath $checkpointRoot -File -Filter "worktree-*.json" | Sort-Object Name)
$records = @($checkpointFiles | ForEach-Object { Read-Json $_.FullName })
$completeRecords = @($records | Where-Object { $_.complete })
$progress = [ordered]@{
  completed = $completeRecords.Count
  expected = $blocks.Count
  batch_size = $BatchSize
  newly_completed = $newlyCompleted
  checkpoint_root = $checkpointRoot.Replace("\", "/")
  free_gib_now = [math]::Round($volumeNow.FreeSpace / 1GB, 3)
  free_space_gate_now = $freeSpaceGateNow
  deletion_performed = $false
}

if ($completeRecords.Count -ne $blocks.Count) {
  Write-Json -Path (Join-Path $evidenceAbsolute "11_DISK_REPOSITORIES_WORKTREES.partial.json") -Value ([ordered]@{
    schema_version = "real-useful-estimates-r2.disk-repositories-worktrees.partial.v1"
    generated_at_utc = $generatedAt
    progress = $progress
    completed_worktrees = $completeRecords
    status = "PARTIAL_READ_ONLY_INVENTORY"
    parent_source_identity_sha256 = $sourceIdentitySha
    master_contract_sha256 = $masterSha
    tool_sha256 = $scriptSha
  })
  Set-ExecutionDiskState -ExecutionStatePath $executionStatePath -Gate "PARTIAL_$($completeRecords.Count)_OF_$($blocks.Count)" -FreeSpaceGate $freeSpaceGateNow -Progress $progress
  $progress | ConvertTo-Json -Depth 10
  exit 0
}

$localRefs = @(Invoke-GitLines @("for-each-ref", "refs/heads", "--format=%(refname)"))
$remoteRefs = @(Invoke-GitLines @("for-each-ref", "refs/remotes", "--format=%(refname)"))
$cDevDirs = @(Get-ChildItem -LiteralPath "C:\dev" -Directory -Force)
$registeredPaths = @($completeRecords | ForEach-Object { $_.absolute_path.ToLowerInvariant() })
$fullCloneRoots = @($cDevDirs | Where-Object {
  (Test-Path -LiteralPath (Join-Path $_.FullName ".git") -PathType Container) -and
  -not $registeredPaths.Contains($_.FullName.Replace("\", "/").ToLowerInvariant())
} | ForEach-Object { $_.FullName.Replace("\", "/") })

$repositoryManifest = [ordered]@{
  schema_version = "real-useful-estimates-r2.disk-repositories-worktrees.v1"
  generated_at_utc = $generatedAt
  counts = [ordered]@{
    local_branch_refs_count = $localRefs.Count
    remote_branch_refs_count = $remoteRefs.Count
    registered_worktrees_count = $completeRecords.Count
    c_dev_top_level_directories_count = $cDevDirs.Count
    full_clone_roots_not_registered_count = $fullCloneRoots.Count
    dirty_worktrees_count = @($completeRecords | Where-Object { $_.tracked_dirty_count -gt 0 -or $_.untracked_count -gt 0 }).Count
    orphan_worktree_admin_records_count = @($completeRecords | Where-Object { -not $_.exists -or $_.prunable }).Count
  }
  historical_reported_113 = [ordered]@{
    current_exact_registered_worktrees = $completeRecords.Count
    verdict = if ($completeRecords.Count -eq 113) { "MATCHES_CURRENT_REGISTERED_WORKTREE_COUNT" } else { "DOES_NOT_MATCH_CURRENT_REGISTERED_WORKTREE_COUNT" }
    note = "Dirty state belongs to a worktree, not to a branch ref."
  }
  full_clone_roots_not_registered = $fullCloneRoots
  worktrees = $completeRecords
  parent_source_identity_sha256 = $sourceIdentitySha
  master_contract_sha256 = $masterSha
  tool_sha256 = $scriptSha
}
Write-Json -Path (Join-Path $evidenceAbsolute "11_DISK_REPOSITORIES_WORKTREES.json") -Value $repositoryManifest

$dockerDf = @(& docker system df --format '{{json .}}' 2>$null)
$dockerVerbosePath = Join-Path $evidenceAbsolute "DISK_05_DOCKER_DF_VERBOSE.txt"
Write-Utf8NoBom -Path $dockerVerbosePath -Content ((@(& docker system df -v 2>&1) -join "`n") + "`n")
$sizeByCategory = [ordered]@{
  schema_version = "real-useful-estimates-r2.disk-size-by-category.v1"
  generated_at_utc = $generatedAt
  registered_worktree_totals = [ordered]@{
    worktree_total_bytes_sum = Get-FieldSum -Items $completeRecords -Field "bytes_total"
    node_modules_bytes_sum = Get-FieldSum -Items $completeRecords -Field "node_modules_bytes"
    android_build_bytes_sum = Get-FieldSum -Items $completeRecords -Field "android_build_bytes"
    release_runtime_bytes_sum = Get-FieldSum -Items $completeRecords -Field "release_runtime_bytes"
  }
  docker_system_df_json_lines = $dockerDf
  docker_system_df_verbose = [ordered]@{ path = "DISK_05_DOCKER_DF_VERBOSE.txt"; sha256 = Get-Sha256 $dockerVerbosePath }
  external_cache_measurement = "DEFERRED_WHILE_FREE_SPACE_BELOW_30_GIB"
  parent_source_identity_sha256 = $sourceIdentitySha
  master_contract_sha256 = $masterSha
  tool_sha256 = $scriptSha
}
Write-Json -Path (Join-Path $evidenceAbsolute "12_DISK_SIZE_BY_CATEGORY.json") -Value $sizeByCategory

$candidates = New-Object System.Collections.Generic.List[object]
foreach ($record in $completeRecords) {
  foreach ($pair in @(
    [ordered]@{ category = "NODE_MODULES"; bytes = $record.node_modules_bytes },
    [ordered]@{ category = "ANDROID_BUILD"; bytes = $record.android_build_bytes },
    [ordered]@{ category = "RELEASE_RUNTIME"; bytes = $record.release_runtime_bytes }
  )) {
    if ([int64]$pair.bytes -le 0) { continue }
    $candidates.Add([ordered]@{
      owner_worktree = $record.absolute_path
      category = $pair.category
      measured_bytes = [int64]$pair.bytes
      worktree_classification = $record.classification
      active_process_count = @($record.active_processes_using_path).Count
      classification = if ($pair.category -in @("NODE_MODULES", "ANDROID_BUILD")) { "REBUILDABLE_GENERATED_CANDIDATE_REQUIRES_EXACT_PATH_MANIFEST" } else { "UNKNOWN_EVIDENCE_REQUIRES_INDEX" }
      deletion_authorized = $false
    })
  }
}
$candidateArray = $candidates.ToArray()
$rebuildable = @($candidateArray | Where-Object { $_.classification -like "REBUILDABLE_GENERATED*" })
Write-Json -Path (Join-Path $evidenceAbsolute "13_DISK_RECLAIM_CANDIDATES.json") -Value ([ordered]@{
  schema_version = "real-useful-estimates-r2.disk-reclaim-candidates.v1"
  generated_at_utc = $generatedAt
  measured_candidate_bytes = Get-FieldSum -Items $rebuildable -Field "measured_bytes"
  candidates = @($candidateArray | Sort-Object measured_bytes -Descending)
  unknown_targets_deleted = 0
  deletion_performed = $false
  approval_required = $true
  parent_source_identity_sha256 = $sourceIdentitySha
  master_contract_sha256 = $masterSha
  tool_sha256 = $scriptSha
})

$state = Read-Json $executionStatePath
$state.current_phase = "PHASE_0_SOURCE_AND_DISK_BEFORE_CAPTURED"
$state.disk_gate = "DISK_INVENTORY_BEFORE_COMPLETE"
$state.free_space_gate = $freeSpaceGateNow
$state.safe_cleanup = "RED_READ_ONLY_CANDIDATES_CLASSIFIED_NO_DELETE_AUTHORIZATION"
$state | Add-Member -NotePropertyName disk_inventory_progress -NotePropertyValue $progress -Force
Write-Json -Path $executionStatePath -Value $state

[ordered]@{
  completed = $completeRecords.Count
  expected = $blocks.Count
  local_refs = $localRefs.Count
  remote_refs = $remoteRefs.Count
  dirty_worktrees = $repositoryManifest.counts.dirty_worktrees_count
  free_gib_now = $progress.free_gib_now
  free_space_gate_now = $freeSpaceGateNow
  deletion_performed = $false
  status = $state.current_phase
} | ConvertTo-Json -Depth 10
