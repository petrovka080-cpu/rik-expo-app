param(
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path,
  [string]$ContractPath = 'C:\Users\User\Downloads\MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (3).md',
  [string]$RecoveryManifestPath = 'C:\dev\rik-expo-app-r5-recovery\r52-batch002-20260819-134622\RECOVERY_MANIFEST.json',
  [string]$Phase = 'PHASE_1_BATCH002_WEB',
  [string]$Shard = 'SMOKE_409_RECALCULATE',
  [string]$Status = 'RED_PRODUCT_DEFECT',
  [string]$FailedAssertion = 'POST /jobs/recalculate returned 409 for a logical price-edit retry',
  [string]$FailureClassification = 'PRODUCT_DEFECT',
  [string]$NextAction = 'restart exact task-owned backend, rebuild loopback Web bundle, and rerun the complete BATCH-002 smoke path'
)

$ErrorActionPreference = 'Stop'
$outputRoot = Join-Path $RepositoryRoot '.release-runtime\real-professional-estimates-r5\evidence'
$baselinePath = Join-Path $outputRoot '00-baseline\R5_BASELINE_INVENTORY.json'
$deltaPath = Join-Path $outputRoot '00-baseline\R52_RESUME_DELTA.json'
$statePath = Join-Path $outputRoot 'EXECUTION_STATE.json'

function Invoke-Git([string[]]$Arguments) {
  $value = & git -C $RepositoryRoot @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed: $($value -join "`n")" }
  return @($value | ForEach-Object { [string]$_ })
}

function Get-TextSha256([string]$Value) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Value)))).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Write-HashedJson([System.Collections.Specialized.OrderedDictionary]$Payload, [string]$Path) {
  $withoutHash = $Payload | ConvertTo-Json -Depth 20
  $Payload.content_hash = Get-TextSha256 $withoutHash
  $json = $Payload | ConvertTo-Json -Depth 20
  $temporary = "$Path.tmp-$PID"
  New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
  Set-Content -LiteralPath $temporary -Value $json -Encoding UTF8
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}

$contractHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ContractPath).Hash.ToLowerInvariant()
if ($contractHash -ne 'e392dbca6bb2bbac9d1ba1a67ebf55e07bd5c6f813700a28f20035a4542f1ce7') {
  throw "R52_CONTRACT_SHA_MISMATCH:$contractHash"
}
$baseline = Get-Content -LiteralPath $baselinePath -Raw -Encoding UTF8 | ConvertFrom-Json
$recovery = Get-Content -LiteralPath $RecoveryManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$statusLines = @(Invoke-Git @('status', '--porcelain=v1'))
$worktrees = @(Invoke-Git @('worktree', 'list', '--porcelain') | Where-Object { $_ -like 'worktree *' })
$localBranches = @(Invoke-Git @('for-each-ref', '--format=%(refname)', 'refs/heads'))
$remoteRefs = @(Invoke-Git @('for-each-ref', '--format=%(refname)', 'refs/remotes'))
$portRows = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in @(8172, 8173, 8767, 55434) } |
  ForEach-Object {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" -ErrorAction SilentlyContinue
    [ordered]@{
      port = $_.LocalPort
      pid = $_.OwningProcess
      process_name = $process.Name
      command_line = $process.CommandLine
    }
  })
$containerRows = @(& docker ps -a --filter 'name=rik-batch002-r4-parity-temp' --format '{{json .}}' 2>$null |
  ForEach-Object { $_ | ConvertFrom-Json })
$generatedAt = (Get-Date).ToUniversalTime().ToString('o')
$head = (Invoke-Git @('rev-parse', 'HEAD'))[0]
$tree = (Invoke-Git @('rev-parse', 'HEAD^{tree}'))[0]

$delta = [ordered]@{
  schema_version = 'r5.2-resume-delta.v1'
  generated_at = $generatedAt
  contract_sha256 = $contractHash
  source_head = $head
  source_tree = $tree
  baseline = [ordered]@{
    captured_at = $baseline.captured_at
    local_branch_count = $baseline.local_branch_count
    remote_branch_count = $baseline.remote_branch_count
    worktree_count = $baseline.worktree_count
  }
  current = [ordered]@{
    repository_root = $RepositoryRoot
    branch = (Invoke-Git @('branch', '--show-current'))[0]
    status_entry_count = $statusLines.Count
    tracked_changed_count = @($statusLines | Where-Object { $_ -notlike '??*' }).Count
    untracked_status_entry_count = @($statusLines | Where-Object { $_ -like '??*' }).Count
    staged_count = @($statusLines | Where-Object { $_[0] -notin @(' ', '?') }).Count
    deleted_count = @($statusLines | Where-Object { $_.Substring(0, 2) -match 'D' }).Count
    local_branch_count = $localBranches.Count
    remote_branch_count = $remoteRefs.Count
    worktree_count = $worktrees.Count
    task_ports = $portRows
    task_containers = $containerRows
  }
  delta = [ordered]@{
    local_branches = $localBranches.Count - [int]$baseline.local_branch_count
    remote_refs = $remoteRefs.Count - [int]$baseline.remote_branch_count
    worktrees = $worktrees.Count - [int]$baseline.worktree_count
  }
  recovery = [ordered]@{
    manifest_path = $RecoveryManifestPath
    manifest_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $RecoveryManifestPath).Hash.ToLowerInvariant()
    tracked_patch_sha256 = $recovery.tracked_patch.sha256
    untracked_archive_sha256 = $recovery.untracked_archive.sha256
  }
}
Write-HashedJson $delta $deltaPath

$state = [ordered]@{
  schema_version = 'r5.2-execution-state.v1'
  generated_at = $generatedAt
  contract_sha256 = $contractHash
  source_head = $head
  source_tree = $tree
  phase = $Phase
  batch = 'BATCH-002'
  shard = $Shard
  status = $Status
  failed_assertion = if ([string]::IsNullOrWhiteSpace($FailedAssertion)) { $null } else { $FailedAssertion }
  failure_classification = $FailureClassification
  affected = [ordered]@{
    catalog_id = 'drywall_ceiling_interior_bulkhead_finish_joint_large_area'
    revision_id = 'ecc8f871-2662-464d-8a41-dd3eb4cc814e'
    path = '/canonical-estimate/jobs/recalculate'
  }
  evidence_preserved = $true
  resume_delta_path = $deltaPath
  recovery_manifest_path = $RecoveryManifestPath
  next_action = $NextAction
  release_allowed = $false
  deploy_allowed = $false
  push_allowed = $false
  batch009_allowed = $false
}
Write-HashedJson $state $statePath

[ordered]@{
  state_path = $statePath
  state_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $statePath).Hash.ToLowerInvariant()
  delta_path = $deltaPath
  delta_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $deltaPath).Hash.ToLowerInvariant()
} | ConvertTo-Json -Depth 5
