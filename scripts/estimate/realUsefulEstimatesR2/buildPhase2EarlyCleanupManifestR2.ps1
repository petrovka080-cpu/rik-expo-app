param(
  [string]$InventoryRoot = ".release-runtime/real-useful-estimates-r2/evidence",
  [string]$OutputRoot = ".release-runtime/real-useful-estimates-r2/evidence/phase2-delete-manifest",
  [string]$SourceIdentityPath = ".release-runtime/real-useful-estimates-r2/evidence/phase3-static/source-seal/01_SOURCE_IDENTITY.json"
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

function Get-Sha256 {
  param([string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Normalize-Path {
  param([string]$Path)
  return [System.IO.Path]::GetFullPath($Path).Replace("\", "/").TrimEnd("/")
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
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return [int64]0 }
  $wslPath = Convert-WindowsPathToDockerDesktopWsl $Path
  if ($wslPath.Contains("'")) { throw "unsupported quote in disk path: $Path" }
  $output = @(& wsl.exe -e sh -lc "du -sb '$wslPath' 2>/dev/null | tail -n 1")
  if ($LASTEXITCODE -ne 0 -or $output.Count -eq 0) { throw "du failed for $Path" }
  $first = ($output[-1] -split "`t|\s+", 2)[0]
  $parsed = [int64]0
  if (-not [int64]::TryParse($first, [ref]$parsed)) { throw "invalid du bytes for $Path" }
  return $parsed
}

function Get-OwnerProcesses {
  param([object[]]$Processes, [string]$OwnerPath)
  $needle = $OwnerPath.Replace("/", "\").ToLowerInvariant()
  return @($Processes | Where-Object {
    $_.CommandLine -and $_.CommandLine.ToLowerInvariant().Contains($needle)
  } | ForEach-Object {
    [ordered]@{
      process_id = [int]$_.ProcessId
      name = [string]$_.Name
      owner_path_reference = $true
    }
  })
}

function Assert-DeleteBoundary {
  param([string]$OwnerPath, [string]$CandidatePath, [string]$ExpectedLeaf)
  $owner = Normalize-Path $OwnerPath
  $candidate = Normalize-Path $CandidatePath
  $prefix = "$owner/"
  if (-not $candidate.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "candidate escaped owner worktree: $candidate"
  }
  if ($candidate.Equals($owner, [StringComparison]::OrdinalIgnoreCase)) {
    throw "worktree root cannot be a generated cleanup candidate: $candidate"
  }
  if (-not ([System.IO.Path]::GetFileName($candidate)).Equals($ExpectedLeaf, [StringComparison]::OrdinalIgnoreCase) -and
    -not ($ExpectedLeaf -eq "build-*" -and [System.IO.Path]::GetFileName($candidate).StartsWith("build-", [StringComparison]::OrdinalIgnoreCase))) {
    throw "candidate leaf does not match expected generated directory: $candidate"
  }
  return [ordered]@{
    within_owner_worktree = $true
    owner_root_targeted = $false
    expected_generated_leaf = $ExpectedLeaf
    resolved_candidate_path = $candidate
  }
}

$repoRoot = Normalize-Path (& git rev-parse --show-toplevel | Select-Object -First 1)
$inventoryAbsolute = Normalize-Path (Join-Path $repoRoot $InventoryRoot)
$outputAbsolute = Normalize-Path (Join-Path $repoRoot $OutputRoot)
$inventoryPath = Join-Path $inventoryAbsolute "11_DISK_REPOSITORIES_WORKTREES.json"
$sourceIdentityPath = Join-Path $repoRoot $SourceIdentityPath
$masterPath = "C:\Users\User\Downloads\MASTER_TZ_PRODUCTION_GRADE_CANONICAL_CODE_GREEN_REAL_ESTIMATES_SAFE_CLEANUP_R2_RU.md"
$masterSha = Get-Sha256 $masterPath
if ($masterSha -ne "1c18212fcea75adf57473146e04f25ce29a3c9a4febaaebfb5442ae2cdb78da4") {
  throw "master contract SHA mismatch"
}
$inventory = Get-Content -LiteralPath $inventoryPath -Raw | ConvertFrom-Json
$sourceIdentitySha = Get-Sha256 $sourceIdentityPath
$allProcesses = @(Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine)
$toolSha = Get-Sha256 $PSCommandPath
$generatedAt = [DateTime]::UtcNow.ToString("o")
$entries = New-Object System.Collections.Generic.List[object]
$excluded = New-Object System.Collections.Generic.List[object]

foreach ($worktree in @($inventory.worktrees | Sort-Object absolute_path)) {
  $owner = Normalize-Path ([string]$worktree.absolute_path)
  if (-not $worktree.exists -or -not (Test-Path -LiteralPath $owner -PathType Container)) { continue }
  if ($owner.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase)) {
    $excluded.Add([ordered]@{ owner_worktree = $owner; reason = "KEEP_CANONICAL_ACTIVE_WORKTREE" })
    continue
  }
  $ownerProcesses = @(Get-OwnerProcesses -Processes $allProcesses -OwnerPath $owner)
  if ($ownerProcesses.Count -gt 0) {
    $excluded.Add([ordered]@{
      owner_worktree = $owner
      reason = "ACTIVE_PROCESS_REFERENCES_WORKTREE"
      processes = $ownerProcesses
    })
    continue
  }

  $packageLock = Join-Path $owner "package-lock.json"
  $packageJson = Join-Path $owner "package.json"
  $nodeModules = Join-Path $owner "node_modules"
  if ([int64]$worktree.node_modules_bytes -ge 1MB -and
    (Test-Path -LiteralPath $nodeModules -PathType Container) -and
    (Test-Path -LiteralPath $packageLock -PathType Leaf) -and
    (Test-Path -LiteralPath $packageJson -PathType Leaf)) {
    $boundary = Assert-DeleteBoundary -OwnerPath $owner -CandidatePath $nodeModules -ExpectedLeaf "node_modules"
    $entries.Add([pscustomobject][ordered]@{
      exact_path_or_object_id = Normalize-Path $nodeModules
      owner_worktree = $owner
      category = "NODE_MODULES"
      classification = "REBUILDABLE_GENERATED"
      measured_bytes = [int64]$worktree.node_modules_bytes
      measurement_source = "11_DISK_REPOSITORIES_WORKTREES.json:node_modules_bytes"
      measurement_generated_at_utc = $inventory.generated_at_utc
      reason = "inactive worktree dependency installation reproducible from pinned package-lock.json"
      replacement_or_backup = Normalize-Path $packageLock
      backup_sha256 = Get-Sha256 $packageLock
      package_json_sha256 = Get-Sha256 $packageJson
      recovery_command = "npm ci --workspaces=false"
      recovery_working_directory = $owner
      active_handle_check = [ordered]@{
        checked_at_utc = $generatedAt
        process_command_lines_referencing_owner = 0
        passed = $true
      }
      owner_git = [ordered]@{
        head = $worktree.head
        branch = $worktree.branch
        tracked_dirty_count = $worktree.tracked_dirty_count
        untracked_count = $worktree.untracked_count
        worktree_classification = $worktree.classification
        source_tree_is_not_targeted = $true
      }
      boundary_check = $boundary
      approved_by = $null
      deletion_authorized = $false
      deleted_at = $null
      bytes_actually_reclaimed = 0
    })
  }

  $androidRoot = Join-Path $owner "android"
  $gradleWrapper = Join-Path $androidRoot "gradlew.bat"
  if ([int64]$worktree.android_build_bytes -gt 0 -and
    (Test-Path -LiteralPath $gradleWrapper -PathType Leaf)) {
    $androidCandidates = @(
      [ordered]@{ path = (Join-Path $androidRoot "build"); expected_leaf = "build" },
      [ordered]@{ path = (Join-Path $androidRoot "app\build"); expected_leaf = "build" }
    )
    $androidApp = Join-Path $androidRoot "app"
    foreach ($directory in @(Get-ChildItem -LiteralPath $androidApp -Directory -Filter "build-*" -ErrorAction SilentlyContinue)) {
      $androidCandidates += [ordered]@{ path = $directory.FullName; expected_leaf = "build-*" }
    }
    foreach ($candidate in $androidCandidates) {
      if (-not (Test-Path -LiteralPath $candidate.path -PathType Container)) { continue }
      $bytes = Get-WslDuBytes $candidate.path
      if ($bytes -lt 1MB) { continue }
      $boundary = Assert-DeleteBoundary -OwnerPath $owner -CandidatePath $candidate.path -ExpectedLeaf $candidate.expected_leaf
      $entries.Add([pscustomobject][ordered]@{
        exact_path_or_object_id = Normalize-Path $candidate.path
        owner_worktree = $owner
        category = "ANDROID_BUILD"
        classification = "REBUILDABLE_GENERATED"
        measured_bytes = [int64]$bytes
        measurement_source = "current du -sb exact generated directory"
        measurement_generated_at_utc = $generatedAt
        reason = "inactive worktree Gradle build output reproducible from source and checked-in Gradle wrapper"
        replacement_or_backup = Normalize-Path $gradleWrapper
        backup_sha256 = Get-Sha256 $gradleWrapper
        recovery_command = ".\gradlew.bat app:assembleDebug"
        recovery_working_directory = Normalize-Path $androidRoot
        active_handle_check = [ordered]@{
          checked_at_utc = $generatedAt
          process_command_lines_referencing_owner = 0
          passed = $true
        }
        owner_git = [ordered]@{
          head = $worktree.head
          branch = $worktree.branch
          tracked_dirty_count = $worktree.tracked_dirty_count
          untracked_count = $worktree.untracked_count
          worktree_classification = $worktree.classification
          source_tree_is_not_targeted = $true
        }
        boundary_check = $boundary
        approved_by = $null
        deletion_authorized = $false
        deleted_at = $null
        bytes_actually_reclaimed = 0
      })
    }
  }
}

$entryArray = @($entries.ToArray() | Sort-Object measured_bytes -Descending)
$totalBytes = [int64](($entryArray | Measure-Object -Property measured_bytes -Sum).Sum)
$byCategory = @($entryArray | Group-Object category | Sort-Object Name | ForEach-Object {
  [ordered]@{
    category = $_.Name
    objects = $_.Count
    measured_bytes = [int64](($_.Group | Measure-Object measured_bytes -Sum).Sum)
  }
})
$volume = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$manifest = [ordered]@{
  schema_version = "real-useful-estimates-r2.early-delete-manifest.v1"
  generated_at_utc = $generatedAt
  status = "AWAITING_EXPLICIT_DELETE_APPROVAL"
  master_contract_sha256 = $masterSha
  parent_source_identity_sha256 = $sourceIdentitySha
  parent_disk_inventory = [ordered]@{
    path = Normalize-Path $inventoryPath
    sha256 = Get-Sha256 $inventoryPath
  }
  tool = [ordered]@{
    path = Normalize-Path $PSCommandPath
    sha256 = $toolSha
  }
  safety = [ordered]@{
    deletion_performed = $false
    approval_required = $true
    unknown_targets_in_manifest = 0
    release_runtime_targets_in_manifest = 0
    worktree_root_targets_in_manifest = 0
    canonical_worktree_targets_in_manifest = 0
    source_or_history_targets_in_manifest = 0
    permitted_classifications = @("REBUILDABLE_GENERATED")
  }
  volume_before_delete = [ordered]@{
    volume = "C:"
    size_bytes = [int64]$volume.Size
    free_bytes = [int64]$volume.FreeSpace
  }
  totals = [ordered]@{
    objects = $entryArray.Count
    measured_bytes = $totalBytes
    measured_gib = [math]::Round($totalBytes / 1GB, 3)
    projected_free_gib_after = [math]::Round(([int64]$volume.FreeSpace + $totalBytes) / 1GB, 3)
    by_category = $byCategory
  }
  excluded = @($excluded.ToArray())
  entries = $entryArray
}

$manifestPath = Join-Path $outputAbsolute "14_EARLY_DELETE_MANIFEST.json"
Write-Json -Path $manifestPath -Value $manifest
$manifestSha = Get-Sha256 $manifestPath
Write-Utf8NoBom -Path (Join-Path $outputAbsolute "14_EARLY_DELETE_MANIFEST.sha256") -Content "$manifestSha  14_EARLY_DELETE_MANIFEST.json`n"
$summary = @"
# R2 Phase 2 early cleanup manifest

- Status: `AWAITING_EXPLICIT_DELETE_APPROVAL`
- Exact objects: $($entryArray.Count)
- Measured rebuildable/generated bytes: $totalBytes ($([math]::Round($totalBytes / 1GB, 3)) GiB)
- Current free space: $([math]::Round([int64]$volume.FreeSpace / 1GB, 3)) GiB
- Projected free space after exact manifest: $([math]::Round(([int64]$volume.FreeSpace + $totalBytes) / 1GB, 3)) GiB
- UNKNOWN/evidence/worktree/source/history targets: 0
- Deletion performed: false
- Manifest SHA-256: `$manifestSha`

Only exact `REBUILDABLE_GENERATED` paths are listed. Approval must name this manifest SHA before deletion.
"@
Write-Utf8NoBom -Path (Join-Path $outputAbsolute "15_EARLY_DELETE_MANIFEST_SUMMARY.md") -Content $summary

[ordered]@{
  status = $manifest.status
  manifest = Normalize-Path $manifestPath
  manifest_sha256 = $manifestSha
  objects = $entryArray.Count
  measured_gib = [math]::Round($totalBytes / 1GB, 3)
  current_free_gib = [math]::Round([int64]$volume.FreeSpace / 1GB, 3)
  projected_free_gib = [math]::Round(([int64]$volume.FreeSpace + $totalBytes) / 1GB, 3)
  deletion_performed = $false
} | ConvertTo-Json
