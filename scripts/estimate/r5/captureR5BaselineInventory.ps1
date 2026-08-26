param(
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path,
  [string]$ContractPath = 'C:\Users\User\Downloads\MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU.md',
  [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$script:GitWarnings = @()

if (-not $OutputPath) {
  $OutputPath = Join-Path $RepositoryRoot '.release-runtime\real-professional-estimates-r5\evidence\00-baseline\R5_BASELINE_INVENTORY.json'
}

function Invoke-Git {
  param([string[]]$Arguments, [string]$At = $RepositoryRoot, [switch]$AllowFailure)
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = & git -C $At @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  $warningLines = @($output | Where-Object { [string]$_ -match '^warning:' })
  if ($warningLines.Count -gt 0) {
    $script:GitWarnings += $warningLines | ForEach-Object { [string]$_ }
  }
  if ($exitCode -ne 0 -and -not $AllowFailure) {
    throw "git $($Arguments -join ' ') failed: $($output -join "`n")"
  }
  return @($output | Where-Object { [string]$_ -notmatch '^warning:' } | ForEach-Object { [string]$_ })
}

function Get-DirectorySize {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return 0L }
  $sum = (Get-ChildItem -LiteralPath $Path -File -Recurse -Force -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
  if ($null -eq $sum) { return 0L }
  return [int64]$sum
}

function Get-CommandResult {
  param([scriptblock]$Command)
  try {
    $value = & $Command
    return [ordered]@{ available = $true; output = @($value | ForEach-Object { [string]$_ }) }
  } catch {
    return [ordered]@{ available = $false; error = $_.Exception.Message; output = @() }
  }
}

$repositoryRootResolved = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$head = @(Invoke-Git @('rev-parse', 'HEAD'))[0]
$tree = @(Invoke-Git @('rev-parse', 'HEAD^{tree}'))[0]
$currentBranch = @(Invoke-Git @('branch', '--show-current'))[0]
$statusLines = @(Invoke-Git @('status', '--porcelain=v2', '--branch'))
$trackedFiles = @(Invoke-Git @('ls-files'))
$untrackedFiles = @(Invoke-Git @('ls-files', '--others', '--exclude-standard'))

$branchRows = @(Invoke-Git @(
  'for-each-ref',
  '--format=%(refname)|%(objectname)|%(upstream:short)|%(worktreepath)|%(symref)',
  'refs/heads',
  'refs/remotes'
))

$branches = @()
foreach ($row in $branchRows) {
  $parts = $row -split '\|', 5
  if ($parts.Count -lt 5) { continue }
  $refName = $parts[0]
  $tip = $parts[1]
  $symref = $parts[4]
  if ($symref) { continue }
  $scope = if ($refName.StartsWith('refs/heads/')) { 'local' } else { 'remote' }
  $shortName = $refName -replace '^refs/heads/', '' -replace '^refs/remotes/', ''
  $aheadBehind = @(Invoke-Git @('rev-list', '--left-right', '--count', "$head...$tip") -AllowFailure)
  $counts = if ($aheadBehind.Count -gt 0) { $aheadBehind[0] -split '\s+' } else { @('0', '0') }
  $uniqueShas = @(Invoke-Git @('rev-list', "$head..$tip") -AllowFailure)
  & git -C $repositoryRootResolved merge-base --is-ancestor $tip $head 2>$null
  $tipReachableFromHead = ($LASTEXITCODE -eq 0)
  & git -C $repositoryRootResolved merge-base --is-ancestor $head $tip 2>$null
  $headReachableFromTip = ($LASTEXITCODE -eq 0)
  $branches += [ordered]@{
    branch_name = $shortName
    ref = $refName
    local_or_remote = $scope
    tip_sha = $tip
    upstream = $parts[2]
    worktree_path = $parts[3]
    tip_reachable_from_current_head = [bool]$tipReachableFromHead
    current_head_reachable_from_tip = [bool]$headReachableFromTip
    current_head_only_commit_count = if ($counts.Count -ge 1) { [int]$counts[0] } else { 0 }
    unique_commit_count = if ($counts.Count -ge 2) { [int]$counts[1] } else { $uniqueShas.Count }
    unique_commit_shas = $uniqueShas
  }
}

$worktreeLines = @(Invoke-Git @('worktree', 'list', '--porcelain'))
$worktrees = @()
$current = $null
foreach ($line in @($worktreeLines + '')) {
  if (-not $line) {
    if ($null -ne $current) {
      $path = $current.path
      $wtStatus = if (Test-Path -LiteralPath $path) { @(Invoke-Git @('status', '--porcelain=v2', '--branch') $path -AllowFailure) } else { @() }
      $wtUntracked = if (Test-Path -LiteralPath $path) { @(Invoke-Git @('ls-files', '--others', '--exclude-standard') $path -AllowFailure) } else { @() }
      $current.dirty = [bool](@($wtStatus | Where-Object { $_ -notmatch '^#' }).Count)
      $current.git_status = $wtStatus
      $current.untracked_files = $wtUntracked
      $worktrees += $current
      $current = $null
    }
    continue
  }
  $pair = $line -split ' ', 2
  switch ($pair[0]) {
    'worktree' { $current = [ordered]@{ path = $pair[1]; head = ''; branch = ''; detached = $false; locked = $false; prunable = $false } }
    'HEAD' { $current.head = $pair[1] }
    'branch' { $current.branch = ($pair[1] -replace '^refs/heads/', '') }
    'detached' { $current.detached = $true }
    'locked' { $current.locked = $true }
    'prunable' { $current.prunable = $true }
  }
}

$openPrs = Get-CommandResult { & gh pr list --state open --limit 500 --json number,headRefName,headRefOid,baseRefName,url 2>&1 }
if ($openPrs.available -and $openPrs.output.Count -gt 0) {
  try { $openPrs.output = @((($openPrs.output -join "`n") | ConvertFrom-Json)) } catch { $openPrs.available = $false; $openPrs.error = $_.Exception.Message }
}
$protectedBranches = Get-CommandResult { & gh api --paginate 'repos/{owner}/{repo}/branches?protected=true&per_page=100' 2>&1 }
if ($protectedBranches.available -and $protectedBranches.output.Count -gt 0) {
  try { $protectedBranches.output = @((($protectedBranches.output -join "`n") | ConvertFrom-Json | ForEach-Object { $_.name })) } catch { $protectedBranches.available = $false; $protectedBranches.error = $_.Exception.Message }
}

$taskNeedles = @(
  $repositoryRootResolved.ToLowerInvariant(),
  'runbatch002r4',
  'servebatch002r4',
  'rik-batch002-r4-parity-temp'
)
$candidateProcesses = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  $commandLine = if ($_.CommandLine) { $_.CommandLine.ToLowerInvariant() } else { '' }
  ($taskNeedles | Where-Object { $commandLine.Contains($_) }).Count -gt 0
} | ForEach-Object {
  [ordered]@{
    pid = [int]$_.ProcessId
    parent_pid = [int]$_.ParentProcessId
    name = $_.Name
    executable_path = $_.ExecutablePath
    command_line = $_.CommandLine
  }
})

$taskPorts = @(8172, 8173, 8767, 55434)
$portRows = @()
foreach ($port in $taskPorts) {
  $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
  foreach ($listener in $listeners) {
    $portRows += [ordered]@{
      protocol = 'tcp'
      local_address = $listener.LocalAddress
      local_port = [int]$listener.LocalPort
      owning_pid = [int]$listener.OwningProcess
    }
  }
}

$dockerContainers = Get-CommandResult { & docker ps -a --no-trunc --format '{{json .}}' 2>&1 }
if ($dockerContainers.available) {
  $parsed = @()
  foreach ($line in $dockerContainers.output) {
    if ($line) { try { $parsed += ($line | ConvertFrom-Json) } catch {} }
  }
  $dockerContainers.output = $parsed
}
$dockerImages = Get-CommandResult { & docker image ls --no-trunc --format '{{json .}}' 2>&1 }
if ($dockerImages.available) {
  $parsed = @()
  foreach ($line in $dockerImages.output) {
    if ($line) { try { $parsed += ($line | ConvertFrom-Json) } catch {} }
  }
  $dockerImages.output = $parsed
}
$dockerVolumes = Get-CommandResult { & docker volume ls --format '{{json .}}' 2>&1 }
if ($dockerVolumes.available) {
  $parsed = @()
  foreach ($line in $dockerVolumes.output) {
    if ($line) { try { $parsed += ($line | ConvertFrom-Json) } catch {} }
  }
  $dockerVolumes.output = $parsed
}
$dockerDiskUsage = Get-CommandResult { & docker system df --format '{{json .}}' 2>&1 }

$drive = Get-PSDrive -Name ([System.IO.Path]::GetPathRoot($repositoryRootResolved).TrimEnd(':\'))
$contractHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ContractPath).Hash.ToLowerInvariant()
$capturedAt = (Get-Date).ToUniversalTime().ToString('o')
$repositorySize = Get-DirectorySize $repositoryRootResolved
$gitSize = Get-DirectorySize (Join-Path $repositoryRootResolved '.git')
$nodeModulesSize = Get-DirectorySize (Join-Path $repositoryRootResolved 'node_modules')
$releaseRuntimeSize = Get-DirectorySize (Join-Path $repositoryRootResolved '.release-runtime')
$expoSize = Get-DirectorySize (Join-Path $repositoryRootResolved '.expo')
$androidBuildSize = (Get-DirectorySize (Join-Path $repositoryRootResolved 'android\build')) + (Get-DirectorySize (Join-Path $repositoryRootResolved 'android\app\build'))

$inventory = [ordered]@{
  schema_version = 'R5_BASELINE_INVENTORY_V1'
  immutable_checkpoint = $true
  captured_at = $capturedAt
  r5_contract = [ordered]@{
    path = (Resolve-Path -LiteralPath $ContractPath).Path
    sha256 = $contractHash
    expected_sha256 = '541d15f20ea5cb71181a41b7572b9b2665d4c5c938b175e8b97076e0bbb0df28'
    hash_matches = ($contractHash -eq '541d15f20ea5cb71181a41b7572b9b2665d4c5c938b175e8b97076e0bbb0df28')
  }
  repository_root = $repositoryRootResolved
  current_worktree = $repositoryRootResolved
  current_branch = $currentBranch
  HEAD = $head
  TREE = $tree
  git_status = $statusLines
  tracked_file_count = $trackedFiles.Count
  untracked_file_count = $untrackedFiles.Count
  untracked_files = $untrackedFiles
  local_branch_count = @($branches | Where-Object { $_.local_or_remote -eq 'local' }).Count
  remote_branch_count = @($branches | Where-Object { $_.local_or_remote -eq 'remote' }).Count
  worktree_count = $worktrees.Count
  open_pr_branches = $openPrs
  protected_branches = $protectedBranches
  branches = $branches
  worktrees = $worktrees
  git_object_size = @(Invoke-Git @('count-objects', '-vH'))
  git_warnings = @($script:GitWarnings | Select-Object -Unique)
  repository_size = $repositorySize
  node_modules_size = $nodeModulesSize
  release_runtime_size = $releaseRuntimeSize
  expo_cache_size = $expoSize
  android_build_size = $androidBuildSize
  docker_container_count = if ($dockerContainers.available) { @($dockerContainers.output).Count } else { $null }
  docker_image_count = if ($dockerImages.available) { @($dockerImages.output).Count } else { $null }
  docker_volume_count = if ($dockerVolumes.available) { @($dockerVolumes.output).Count } else { $null }
  docker = [ordered]@{
    containers = $dockerContainers
    images = $dockerImages
    volumes = $dockerVolumes
    disk_usage = $dockerDiskUsage
  }
  free_disk_before = [int64]$drive.Free
  used_disk_before = [int64]$drive.Used
  task_owned_processes = $candidateProcesses
  task_owned_ports = $portRows
}

$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$json = $inventory | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($OutputPath, $json + "`n", [System.Text.UTF8Encoding]::new($false))

$writtenHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutputPath).Hash.ToLowerInvariant()
[ordered]@{
  output = (Resolve-Path -LiteralPath $OutputPath).Path
  sha256 = $writtenHash
  captured_at = $capturedAt
  head = $head
  tree = $tree
  local_branches = @($branches | Where-Object { $_.local_or_remote -eq 'local' }).Count
  remote_branches = @($branches | Where-Object { $_.local_or_remote -eq 'remote' }).Count
  worktrees = $worktrees.Count
  repository_size = $repositorySize
  release_runtime_size = $releaseRuntimeSize
  free_disk_before = [int64]$drive.Free
} | ConvertTo-Json -Depth 8
