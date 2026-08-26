param(
  [ValidateSet("Scan", "Execute", "Finalize")]
  [string]$Mode = "Scan",
  [string]$EvidenceRoot = ".release-runtime/real-estimates-global-green-r3/evidence/generated-cleanup-r1"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$MasterSha256 = "f617befe4fc22e6c9e4dbaa6ca276bd271b8f021a3cd8825610196471aef3820"
$AddendumPath = "C:\Users\User\Downloads\ADDENDUM_R3_2_PRODUCTION_GRADE_SAFE_LARGE_GENERATED_CLEANUP_R1_RU.md"
$AddendumSha256 = "561257cf2031ef8477b2b5ac6124b1c8040ddd302296127f7327147b155f1b12"
$PriorManifestRelative = ".release-runtime/real-useful-estimates-r2/evidence/phase2-delete-manifest/14_EARLY_DELETE_MANIFEST.json"
$PriorManifestSha256 = "52cba1806cd380d496bc0d2ff5fd4c954c7fd24bfc7b9cf8bba553b3aa53bdce"
$CurrentSourceRelative = ".release-runtime/real-estimates-global-green-r3/evidence/01_CURRENT_SOURCE_IDENTITY_R3.json"
$CurrentProductRelative = ".release-runtime/real-estimates-global-green-r3/evidence/02_PRODUCT_SOURCE_MANIFEST_R3.json"
$CurrentHumanRelative = ".release-runtime/real-estimates-global-green-r3/evidence/HUMAN_ACCEPTANCE_PLATFORM_R3.json"
$CurrentDenominatorRelative = ".release-runtime/real-estimates-global-green-r3/evidence/05_CONTENT_AUTHORING_DENOMINATOR_R3.json"

function Write-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $parent = Split-Path -Parent $Path
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  [IO.File]::WriteAllText($Path, $Content, [Text.UTF8Encoding]::new($false))
}

function Get-TextSha256 {
  param([string]$Text)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($algorithm.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace("-", "").ToLowerInvariant()
  } finally { $algorithm.Dispose() }
}

function Get-Sha256 {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "FILE_MISSING:$Path" }
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Write-EvidenceJson {
  param([string]$Path, [System.Collections.IDictionary]$Value)
  $payload = $Value | ConvertTo-Json -Depth 100 -Compress
  $Value["payload_sha256"] = Get-TextSha256 $payload
  Write-Utf8NoBom -Path $Path -Content (($Value | ConvertTo-Json -Depth 100) + "`n")
  return Get-Sha256 $Path
}

function Normalize-Absolute {
  param([string]$Path)
  return [IO.Path]::GetFullPath($Path).Replace("\", "/").TrimEnd("/")
}

function Get-SafeRelativePath {
  param([string]$Owner, [string]$Target)
  $ownerAbsolute = Normalize-Absolute $Owner
  $targetAbsolute = Normalize-Absolute $Target
  $ownerPrefix = $ownerAbsolute + "/"
  if (-not $targetAbsolute.StartsWith($ownerPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "TARGET_OUTSIDE_OWNER:$targetAbsolute"
  }
  $relative = $targetAbsolute.Substring($ownerPrefix.Length)
  if ([string]::IsNullOrWhiteSpace($relative) -or $relative -match '(^|/)\.\.(/|$)') {
    throw "UNSAFE_RELATIVE_TARGET:$targetAbsolute"
  }
  return $relative
}

function Test-FullyQualifiedPath {
  param([string]$Path)
  $normalized = [string]$Path
  return ($normalized -match '^[A-Za-z]:/') -or ($normalized -match '^//[^/]+/[^/]+/')
}

function Remove-ExactDirectory {
  param([string]$Path)
  $normalized = Normalize-Absolute $Path
  if (-not (Test-FullyQualifiedPath $normalized)) { throw "DELETE_PATH_NOT_FULLY_QUALIFIED:$normalized" }
  $removeItemError = $null
  try {
    Remove-Item -LiteralPath $normalized -Recurse -Force -ErrorAction Stop
    return "POWERSHELL_REMOVE_ITEM_LITERAL_FORCE"
  } catch {
    $removeItemError = $_.Exception.Message
  }
  if (-not (Test-Path -LiteralPath $normalized)) {
    return "POWERSHELL_REMOVE_ITEM_LITERAL_FORCE"
  }
  $native = $normalized.Replace("/", "\")
  $extendedLiteral = if ($native.StartsWith("\\")) {
    "\\?\UNC\" + $native.TrimStart("\")
  } else {
    "\\?\" + $native
  }
  try {
    [IO.Directory]::Delete($extendedLiteral, $true)
    return "POWERSHELL_REMOVE_ITEM_FORCE_THEN_SYSTEM_IO_EXTENDED_LITERAL"
  } catch {
    throw "REMOVE_ITEM_FAILED:$removeItemError|EXTENDED_DELETE_FAILED:$($_.Exception.Message)"
  }
}

function Invoke-GitLines {
  param([string[]]$Arguments)
  $output = @(& git -c core.quotepath=false @Arguments 2>$null)
  if ($LASTEXITCODE -ne 0) { throw "GIT_FAILED:$($Arguments -join ' ')" }
  return $output
}

function Get-WorktreeBlocks {
  $lines = @(Invoke-GitLines @("worktree", "list", "--porcelain"))
  $blocks = New-Object Collections.Generic.List[object]
  $current = [ordered]@{}
  foreach ($line in @($lines + "")) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      if ($current.Contains("worktree")) { $blocks.Add([pscustomobject]$current) }
      $current = [ordered]@{}
      continue
    }
    $parts = $line -split " ", 2
    if ($parts.Count -eq 1) { $current[$parts[0]] = $true } else { $current[$parts[0]] = $parts[1] }
  }
  return @($blocks.ToArray())
}

function Get-StatusRecord {
  param([string]$Owner)
  $lines = @(& git -C $Owner -c core.quotepath=false status --porcelain=v2 --untracked-files=all 2>$null)
  if ($LASTEXITCODE -ne 0) { throw "GIT_STATUS_FAILED:$Owner" }
  $sorted = @($lines | Sort-Object)
  return [pscustomobject][ordered]@{
    tracked = @($lines | Where-Object { $_ -match '^[12u] ' }).Count
    untracked = @($lines | Where-Object { $_ -match '^\? ' }).Count
    lines = $sorted
    sha256 = Get-TextSha256 (($sorted -join "`n") + "`n")
  }
}

function Get-TargetStatusCount {
  param([string]$Owner, [string]$Target)
  $relative = Get-SafeRelativePath $Owner $Target
  $lines = @(& git -C $Owner -c core.quotepath=false status --porcelain=v2 --untracked-files=all -- $relative 2>$null)
  if ($LASTEXITCODE -ne 0) { throw "GIT_TARGET_STATUS_FAILED:$Target" }
  return $lines.Count
}

function Get-TrackedTargetCount {
  param([string]$Owner, [string]$Target)
  $relative = Get-SafeRelativePath $Owner $Target
  $lines = @(& git -C $Owner -c core.quotepath=false ls-files -- $relative 2>$null)
  if ($LASTEXITCODE -ne 0) { throw "GIT_LS_FILES_FAILED:$Target" }
  return $lines.Count
}

function Get-OwnerConsumers {
  param([object[]]$Processes, [string]$Owner, [string]$Target)
  $ownerNeedle = $Owner.Replace("/", "\").ToLowerInvariant()
  $targetNeedle = $Target.Replace("/", "\").ToLowerInvariant()
  return @($Processes | Where-Object {
    $line = [string]$_.CommandLine
    $line -and ($line.ToLowerInvariant().Contains($ownerNeedle) -or $line.ToLowerInvariant().Contains($targetNeedle))
  } | ForEach-Object {
    [ordered]@{ process_id = [int]$_.ProcessId; name = [string]$_.Name; command_line_sha256 = Get-TextSha256 ([string]$_.CommandLine) }
  })
}

function Test-ReparseRoot {
  param([string]$Path)
  $item = Get-Item -LiteralPath $Path -Force
  return (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) -or -not [string]::IsNullOrWhiteSpace([string]$item.LinkType)
}

function Test-HandleRenameProbe {
  param([string]$Path)
  $parent = Split-Path -Parent $Path
  $leaf = Split-Path -Leaf $Path
  $probe = Join-Path $parent "$leaf.codex-handle-probe-$PID-$([guid]::NewGuid().ToString('N'))"
  $renamed = $false
  try {
    [IO.Directory]::Move($Path, $probe)
    $renamed = $true
    [IO.Directory]::Move($probe, $Path)
    $renamed = $false
    return [ordered]@{ passed = $true; mechanism = "ATOMIC_DIRECTORY_RENAME_AND_RESTORE"; error = $null }
  } catch {
    return [ordered]@{ passed = $false; mechanism = "ATOMIC_DIRECTORY_RENAME_AND_RESTORE"; error = $_.Exception.Message }
  } finally {
    if ($renamed -and (Test-Path -LiteralPath $probe -PathType Container) -and -not (Test-Path -LiteralPath $Path)) {
      try { [IO.Directory]::Move($probe, $Path); $renamed = $false } catch {}
    }
    if ($renamed -or -not (Test-Path -LiteralPath $Path -PathType Container)) {
      throw "HANDLE_PROBE_RESTORE_FAILED:$Path"
    }
  }
}

function Convert-ToWslPath {
  param([string]$Path)
  $full = [IO.Path]::GetFullPath($Path)
  $drive = $full.Substring(0, 1).ToLowerInvariant()
  $tail = $full.Substring(2).Replace("\", "/")
  return "/tmp/docker-desktop-root/run/desktop/mnt/host/$drive$tail"
}

function Get-DuBytes {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return [int64]0 }
  $wslPath = Convert-ToWslPath $Path
  if ($wslPath.Contains("'")) { throw "UNSUPPORTED_QUOTE_IN_PATH:$Path" }
  $output = @(& wsl.exe -e sh -lc "du -sb '$wslPath' 2>/dev/null | tail -n 1")
  if ($LASTEXITCODE -ne 0 -or $output.Count -eq 0) { throw "DU_FAILED:$Path" }
  $value = ($output[-1] -split "`t|\s+", 2)[0]
  $parsed = [int64]0
  if (-not [int64]::TryParse($value, [ref]$parsed)) { throw "DU_INVALID:$Path" }
  return $parsed
}

function Get-AndroidEvidenceOutputs {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return @() }
  return @(Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object {
    $normalized = $_.FullName.Replace("\", "/")
    $_.Extension -in @(".apk", ".aab") -or
      $_.Name -eq "mapping.txt" -or
      $normalized -match '/(?:native-debug-symbols|androidTest-results|test-results|reports/tests)(?:/|$)'
  } | ForEach-Object { Normalize-Absolute $_.FullName })
}

function Get-DiskRecord {
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  return [ordered]@{
    volume = "C:"
    filesystem = $disk.FileSystem
    size_bytes = [int64]$disk.Size
    free_bytes = [int64]$disk.FreeSpace
    used_bytes = [int64]($disk.Size - $disk.FreeSpace)
    free_gib = [math]::Round([int64]$disk.FreeSpace / 1GB, 3)
  }
}

function Assert-DeleteBoundary {
  param([string]$Owner, [string]$Path, [string]$Category)
  $ownerNormalized = Normalize-Absolute $Owner
  $pathNormalized = Normalize-Absolute $Path
  if (-not $pathNormalized.StartsWith("$ownerNormalized/", [StringComparison]::OrdinalIgnoreCase)) { throw "PATH_ESCAPE:$pathNormalized" }
  if ($pathNormalized.Equals($ownerNormalized, [StringComparison]::OrdinalIgnoreCase)) { throw "WORKTREE_ROOT_TARGETED:$pathNormalized" }
  $leaf = [IO.Path]::GetFileName($pathNormalized)
  if ($Category -eq "NODE_MODULES" -and $leaf -cne "node_modules") { throw "NODE_MODULES_LEAF_RED:$pathNormalized" }
  if ($Category -eq "ANDROID_BUILD" -and $leaf -cne "build") { throw "ANDROID_BUILD_LEAF_RED:$pathNormalized" }
  if ($Category -eq "ANDROID_BUILD" -and $pathNormalized -notmatch '/android(?:/[^/]+)*/build$') { throw "ANDROID_BUILD_BOUNDARY_RED:$pathNormalized" }
}

function Get-CurrentSourceContext {
  param([string]$RepoRoot)
  $sourcePath = Join-Path $RepoRoot $CurrentSourceRelative
  $productPath = Join-Path $RepoRoot $CurrentProductRelative
  $humanPath = Join-Path $RepoRoot $CurrentHumanRelative
  $denominatorPath = Join-Path $RepoRoot $CurrentDenominatorRelative
  $source = Get-Content -Raw -LiteralPath $sourcePath | ConvertFrom-Json
  $product = Get-Content -Raw -LiteralPath $productPath | ConvertFrom-Json
  $sourceSha = Get-Sha256 $sourcePath
  if ($source.status -ne "R3_SOURCE_IDENTITY_GREEN") { throw "CURRENT_SOURCE_NOT_GREEN" }
  if ($source.master_contract.sha256 -ne $MasterSha256) { throw "MASTER_BINDING_RED" }
  $addendum = @($source.supplemental_contracts | Where-Object { $_.sha256 -eq $AddendumSha256 })
  if ($addendum.Count -ne 1) { throw "ADDENDUM_NOT_BOUND_TO_SOURCE_IDENTITY" }
  if ($product.master_contract_sha256 -ne $MasterSha256) { throw "PRODUCT_MASTER_BINDING_RED" }
  $human = Get-Content -Raw -LiteralPath $humanPath | ConvertFrom-Json
  $denominator = Get-Content -Raw -LiteralPath $denominatorPath | ConvertFrom-Json
  if ($human.status -ne "HUMAN_ACCEPTANCE_PLATFORM_GREEN" -or $human.parent_source_identity_sha256 -ne $sourceSha) { throw "R3_1_CURRENT_SEAL_RED" }
  if ($denominator.status -ne "AUTHORITATIVE_DENOMINATOR_GREEN" -or $denominator.parent_source_identity_sha256 -ne $sourceSha) { throw "DENOMINATOR_CURRENT_BINDING_RED" }
  return [pscustomobject][ordered]@{
    source_path = $sourcePath
    source_sha256 = $sourceSha
    product_path = $productPath
    product_sha256 = Get-Sha256 $productPath
    product_source_sha256 = [string]$product.aggregates.product_source.sha256
    human_path = $humanPath
    human_sha256 = Get-Sha256 $humanPath
    denominator_path = $denominatorPath
    denominator_sha256 = Get-Sha256 $denominatorPath
  }
}

function Invoke-NodeCommand {
  param([string[]]$Arguments)
  $watch = [Diagnostics.Stopwatch]::StartNew()
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = @(& node @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  $watch.Stop()
  $text = ($output -join "`n") + "`n"
  return [ordered]@{
    command = "node $($Arguments -join ' ')"
    exit_code = $exitCode
    elapsed_seconds = [math]::Round($watch.Elapsed.TotalSeconds, 3)
    output_sha256 = Get-TextSha256 $text
    output_lines = $output.Count
  }
}

$repoRoot = (Invoke-GitLines @("rev-parse", "--show-toplevel") | Select-Object -First 1).Replace("/", "\")
Set-Location -LiteralPath $repoRoot
$evidenceAbsolute = [IO.Path]::GetFullPath((Join-Path $repoRoot $EvidenceRoot))
New-Item -ItemType Directory -Path $evidenceAbsolute -Force | Out-Null
$toolSha256 = Get-Sha256 $MyInvocation.MyCommand.Path
if ((Get-Sha256 $AddendumPath) -ne $AddendumSha256) { throw "ADDENDUM_SHA_DRIFT" }
$priorManifestPath = Join-Path $repoRoot $PriorManifestRelative
if ((Get-Sha256 $priorManifestPath) -ne $PriorManifestSha256) { throw "PRIOR_MANIFEST_SHA_DRIFT" }

if ($Mode -eq "Finalize") {
  $generatedAt = [DateTime]::UtcNow.ToString("o")
  $source = Get-CurrentSourceContext $repoRoot
  $evidenceBase = Join-Path $repoRoot ".release-runtime/real-estimates-global-green-r3/evidence"
  $waveDefinitions = @(
    [pscustomobject][ordered]@{
      wave = "INITIAL"
      root = Join-Path $evidenceBase "generated-cleanup-r1"
      manifest_sha256 = "c373784b31540eba60b2e7a42cf86072a25d297759b2a8851ffa2284ab21227c"
      ledger_sha256 = "3f3b6fad786eee3f1a1906d591af745acc2f3d1dae1398a834a209d1eb6d26ce"
    },
    [pscustomobject][ordered]@{
      wave = "RESUME_A"
      root = Join-Path $evidenceBase "generated-cleanup-r1-resume-a"
      manifest_sha256 = "b5c14a2679febae3f8767b9f9b3a9427250b4cfddb33c6f233ff742bbda6ff38"
      ledger_sha256 = "50d813a4699a50ab5596c5dee0b4c4074f70efb4716744268f93b5977116a9f4"
    },
    [pscustomobject][ordered]@{
      wave = "RESUME_B"
      root = Join-Path $evidenceBase "generated-cleanup-r1-resume-b"
      manifest_sha256 = "d0afe6069015b5bcdeb20b2a482a917a30c52080b3af450ff3b91e8cb547f76b"
      ledger_sha256 = "a0f5120004a6596066850b7220cfe73f4d400f3a5103885d053fc09737c8ebbf"
    }
  )
  $combinedEntries = New-Object Collections.Generic.List[object]
  $waveArtifacts = New-Object Collections.Generic.List[object]
  $initialManifest = $null
  foreach ($definition in $waveDefinitions) {
    $manifestPath = Join-Path $definition.root "03_SAFE_LARGE_GENERATED_CLEANUP_MANIFEST_R1.json"
    $ledgerPath = Join-Path $definition.root "08_NODE_MODULES_DELETE_LEDGER_R1.json"
    if ((Get-Sha256 $manifestPath) -ne $definition.manifest_sha256) { throw "FINALIZE_MANIFEST_SHA_DRIFT:$($definition.wave)" }
    if ((Get-Sha256 $ledgerPath) -ne $definition.ledger_sha256) { throw "FINALIZE_LEDGER_SHA_DRIFT:$($definition.wave)" }
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    $ledger = Get-Content -Raw -LiteralPath $ledgerPath | ConvertFrom-Json
    if ($manifest.master_r3_2_sha256 -ne $MasterSha256 -or $manifest.addendum_sha256 -ne $AddendumSha256) { throw "FINALIZE_MANIFEST_CONTRACT_RED:$($definition.wave)" }
    if ($ledger.master_r3_2_sha256 -ne $MasterSha256 -or $ledger.addendum_sha256 -ne $AddendumSha256) { throw "FINALIZE_LEDGER_CONTRACT_RED:$($definition.wave)" }
    if ($ledger.manifest_sha256 -ne $definition.manifest_sha256) { throw "FINALIZE_LEDGER_MANIFEST_BINDING_RED:$($definition.wave)" }
    if ($definition.wave -eq "INITIAL") { $initialManifest = $manifest }
    foreach ($entry in @($ledger.entries)) {
      $combinedEntries.Add([pscustomobject][ordered]@{
        wave = [string]$definition.wave
        ledger_sha256 = [string]$definition.ledger_sha256
        sequence = [int]$entry.sequence
        path = Normalize-Absolute ([string]$entry.path)
        ownerWorktree = Normalize-Absolute ([string]$entry.ownerWorktree)
        category = [string]$entry.category
        recoveryGroupId = $entry.recoveryGroupId
        measured_bytes = [int64]$entry.measured_bytes
        observed_free_delta_bytes = [int64]$entry.observed_free_delta_bytes
        delete_method = $entry.delete_method
        exit_code = [int]$entry.exit_code
        deleted = [bool]$entry.deleted
        error = $entry.error
        source_identity_sha256_after = [string]$entry.source_identity_sha256_after
      })
    }
    $waveArtifacts.Add([pscustomobject][ordered]@{
      wave = [string]$definition.wave
      root = Normalize-Absolute ([string]$definition.root)
      manifest_sha256 = [string]$definition.manifest_sha256
      ledger_sha256 = [string]$definition.ledger_sha256
      ledger_entries = @($ledger.entries).Count
      successful_entries = @($ledger.entries | Where-Object deleted).Count
      failed_entries = @($ledger.entries | Where-Object { -not $_.deleted }).Count
    })
  }
  if ($null -eq $initialManifest) { throw "FINALIZE_INITIAL_MANIFEST_MISSING" }
  $initialEligible = @($initialManifest.entries | Where-Object classification -eq "ELIGIBLE")
  $initialProtected = @($initialManifest.entries | Where-Object classification -ne "ELIGIBLE")
  $successEntries = @($combinedEntries.ToArray() | Where-Object deleted)
  $failureEntries = @($combinedEntries.ToArray() | Where-Object { -not $_.deleted })
  $successfulPaths = @($successEntries.path | Sort-Object -Unique)
  $initialEligiblePaths = @($initialEligible.path | ForEach-Object { (Normalize-Absolute $_).ToLowerInvariant() })
  $unexpectedSuccessfulPaths = @($successfulPaths | Where-Object { $initialEligiblePaths -notcontains $_.ToLowerInvariant() })
  $successfulTargetsStillPresent = @($successfulPaths | Where-Object { Test-Path -LiteralPath $_ -PathType Container })
  $protectedMissing = @($initialProtected | Where-Object { -not (Test-Path -LiteralPath $_.path -PathType Container) })
  $failedNotRecovered = @($failureEntries | Where-Object { $successfulPaths -notcontains $_.path })
  $successfulNonNodeModules = @($successEntries | Where-Object category -ne "NODE_MODULES")
  $duplicateSuccesses = $successEntries.Count - $successfulPaths.Count
  $measuredSuccessfulBytes = [int64](($successEntries | Measure-Object measured_bytes -Sum).Sum)
  $observedFailureDelta = [int64](($failureEntries | Measure-Object observed_free_delta_bytes -Sum).Sum)
  $methodCounts = @($successEntries | Group-Object delete_method | Sort-Object Name | ForEach-Object {
    [ordered]@{ method = if ([string]::IsNullOrWhiteSpace($_.Name)) { "HISTORICAL_REMOVE_ITEM_LITERAL_FORCE" } else { $_.Name }; paths = $_.Count }
  })

  $combinedLedger = [ordered]@{
    schema_version = "r3.2-cleanup-r1.combined-delete-ledger.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    initial_manifest_sha256 = [string]$waveDefinitions[0].manifest_sha256
    waves = @($waveArtifacts.ToArray())
    totals = [ordered]@{
      ledger_entries = $combinedEntries.Count
      successful_entries = $successEntries.Count
      distinct_successful_paths = $successfulPaths.Count
      failed_entries = $failureEntries.Count
      failed_entries_recovered_later = $failureEntries.Count - $failedNotRecovered.Count
      duplicate_successes = $duplicateSuccesses
      measured_successful_bytes = $measuredSuccessfulBytes
      observed_positive_delta_during_failed_attempts = $observedFailureDelta
      methods = $methodCounts
    }
    entries = @($combinedEntries.ToArray())
  }
  $combinedLedgerSha = Write-EvidenceJson (Join-Path $evidenceAbsolute "16_COMBINED_DELETE_LEDGER_R1.json") $combinedLedger

  $diskBeforeArtifact = Get-Content -Raw -LiteralPath (Join-Path $waveDefinitions[0].root "01_DISK_BEFORE_R1.json") | ConvertFrom-Json
  $diskAfter = Get-DiskRecord
  $actualReclaimed = [int64]$diskAfter.free_bytes - [int64]$diskBeforeArtifact.disk.free_bytes
  $diskAfterArtifact = [ordered]@{
    schema_version = "r3.2-cleanup-r1.combined-disk-after.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    initial_manifest_sha256 = [string]$waveDefinitions[0].manifest_sha256
    combined_ledger_sha256 = $combinedLedgerSha
    disk = $diskAfter
    before_free_bytes = [int64]$diskBeforeArtifact.disk.free_bytes
    actual_reclaimed_bytes = $actualReclaimed
    actual_reclaimed_gib = [math]::Round($actualReclaimed / 1GB, 3)
    initial_eligible_measured_bytes = [int64]$initialManifest.totals.eligible_bytes
    measured_successful_ledger_bytes = $measuredSuccessfulBytes
    failure_attempt_observed_delta_bytes = $observedFailureDelta
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "10_DISK_AFTER_R1.json") $diskAfterArtifact | Out-Null

  $statusBeforeFinalize = Get-StatusRecord $repoRoot
  $worktreeTextBeforeFinalize = ((Invoke-GitLines @("worktree", "list", "--porcelain")) -join "`n") + "`n"
  $worktreeCountBeforeFinalize = @(Get-WorktreeBlocks).Count
  $sourceShaBeforeFinalize = Get-Sha256 $source.source_path
  $spotPath = [string]$successfulPaths[0]
  $spotEntry = @($initialEligible | Where-Object { (Normalize-Absolute $_.path).Equals($spotPath, [StringComparison]::OrdinalIgnoreCase) })[0]
  $spotOwner = Normalize-Absolute ([string]$spotEntry.ownerWorktree)
  $spotLock = Join-Path $spotOwner "package-lock.json"
  $spotPackage = Join-Path $spotOwner "package.json"
  $spotLockBefore = Get-Sha256 $spotLock
  $spotPackageBefore = Get-Sha256 $spotPackage
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $spotOutput = @(& npm.cmd ci --dry-run --ignore-scripts --workspaces=false --no-audit --no-fund --loglevel=error --prefix $spotOwner 2>&1)
    $spotExit = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  $spotGreen = $spotExit -eq 0 -and $spotLockBefore -eq (Get-Sha256 $spotLock) -and $spotPackageBefore -eq (Get-Sha256 $spotPackage) -and -not (Test-Path -LiteralPath $spotPath)
  $recoverySpot = [ordered]@{
    schema_version = "r3.2-cleanup-r1.combined-recovery-spot.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    combined_ledger_sha256 = $combinedLedgerSha
    status = if ($spotGreen) { "GREEN" } else { "RED" }
    representative_path = $spotPath
    representative_worktree = $spotOwner
    recovery_group_id = $spotEntry.recoveryGroupId
    command = "npm ci --dry-run --ignore-scripts --workspaces=false --no-audit --no-fund --loglevel=error"
    exit_code = $spotExit
    output_sha256 = Get-TextSha256 (($spotOutput -join "`n") + "`n")
    lockfile_unchanged = $spotLockBefore -eq (Get-Sha256 $spotLock)
    package_json_unchanged = $spotPackageBefore -eq (Get-Sha256 $spotPackage)
    restored_node_modules = Test-Path -LiteralPath $spotPath
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "12_RECOVERY_SPOT_R1.json") $recoverySpot | Out-Null

  $productTsc = Invoke-NodeCommand @("node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.product.json", "--pretty", "false")
  $edgeTsc = Invoke-NodeCommand @("node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.edge.json", "--pretty", "false")
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $scriptsTscOutput = @(& node node_modules/typescript/bin/tsc --noEmit -p tsconfig.typecheck.scripts.json --pretty false 2>&1)
    $scriptsTscExit = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  $scriptsErrors = @($scriptsTscOutput | Where-Object { $_ -match ': error TS\d+:' })
  $targeted = Invoke-NodeCommand @("node_modules/jest/bin/jest.js", "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.test.ts", "--runInBand", "--no-cache")
  $ownership = Invoke-NodeCommand @("node_modules/tsx/dist/cli.mjs", "scripts/architecture/auditR2CanonicalOwnership.ts", "--contract-version=r3", "--master-sha=$MasterSha256", "--output-root=.release-runtime/real-estimates-global-green-r3/evidence/r3-0-ownership-raw")
  $checkpoint = Invoke-NodeCommand @("node_modules/tsx/dist/cli.mjs", "scripts/architecture/buildR3Phase0Checkpoint.ts")
  $statusAfterFinalize = Get-StatusRecord $repoRoot
  $worktreeTextAfterFinalize = ((Invoke-GitLines @("worktree", "list", "--porcelain")) -join "`n") + "`n"
  $worktreeCountAfterFinalize = @(Get-WorktreeBlocks).Count
  $sourceShaAfterFinalize = Get-Sha256 $source.source_path
  $sourceStatus = [ordered]@{
    schema_version = "r3.2-cleanup-r1.combined-source-status-after.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    combined_ledger_sha256 = $combinedLedgerSha
    source_identity_sha256_before_finalize = $sourceShaBeforeFinalize
    source_identity_sha256_after_finalize = $sourceShaAfterFinalize
    source_identity_unchanged_during_finalize = $sourceShaBeforeFinalize -eq $sourceShaAfterFinalize
    git_status_sha256_before_finalize = $statusBeforeFinalize.sha256
    git_status_sha256_after_finalize = $statusAfterFinalize.sha256
    git_status_unchanged_during_finalize = $statusBeforeFinalize.sha256 -eq $statusAfterFinalize.sha256
    registered_worktrees_before_finalize = $worktreeCountBeforeFinalize
    registered_worktrees_after_finalize = $worktreeCountAfterFinalize
    registered_worktrees_sha256_before_finalize = Get-TextSha256 $worktreeTextBeforeFinalize
    registered_worktrees_sha256_after_finalize = Get-TextSha256 $worktreeTextAfterFinalize
    registered_worktrees_unchanged_during_finalize = (Get-TextSha256 $worktreeTextBeforeFinalize) -eq (Get-TextSha256 $worktreeTextAfterFinalize)
    successful_targets_still_present = $successfulTargetsStillPresent.Count
    protected_targets_missing = $protectedMissing.Count
    unexpected_successful_paths = $unexpectedSuccessfulPaths.Count
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "11_SOURCE_STATUS_AFTER_R1.json") $sourceStatus | Out-Null

  $structuralGreen = $initialEligible.Count -eq 45 -and $initialProtected.Count -eq 30 -and $successEntries.Count -eq 45 -and $successfulPaths.Count -eq 45 -and $failureEntries.Count -eq 2 -and $failedNotRecovered.Count -eq 0 -and $duplicateSuccesses -eq 0 -and $unexpectedSuccessfulPaths.Count -eq 0 -and $successfulTargetsStillPresent.Count -eq 0 -and $protectedMissing.Count -eq 0 -and $successfulNonNodeModules.Count -eq 0
  $platformGreen = $productTsc.exit_code -eq 0 -and $edgeTsc.exit_code -eq 0 -and $scriptsTscExit -eq 0 -and $scriptsErrors.Count -eq 0 -and $targeted.exit_code -eq 0 -and $ownership.exit_code -eq 0 -and $checkpoint.exit_code -eq 0 -and $spotGreen -and $sourceStatus.source_identity_unchanged_during_finalize -and $sourceStatus.git_status_unchanged_during_finalize -and $sourceStatus.registered_worktrees_unchanged_during_finalize -and (Test-Path -LiteralPath (Join-Path $repoRoot "node_modules"))
  $stability = [ordered]@{
    schema_version = "r3.2-cleanup-r1.combined-platform-stability-after.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    combined_ledger_sha256 = $combinedLedgerSha
    status = if ($platformGreen) { "GREEN" } else { "RED" }
    product_typecheck = $productTsc
    edge_typecheck = $edgeTsc
    scripts_typecheck = [ordered]@{ exit_code = $scriptsTscExit; total_known_errors = $scriptsErrors.Count; output_sha256 = Get-TextSha256 (($scriptsTscOutput -join "`n") + "`n") }
    canonical_targeted_smoke = $targeted
    ownership = $ownership
    phase0_checkpoint = $checkpoint
    recovery_spot_status = $recoverySpot.status
    source_status = $sourceStatus
    current_platform_node_modules_present = Test-Path -LiteralPath (Join-Path $repoRoot "node_modules")
    android_builds_deleted = 0
    protected_paths_present = $initialProtected.Count - $protectedMissing.Count
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "13_PLATFORM_STABILITY_AFTER_R1.json") $stability | Out-Null

  $verdictGreen = $structuralGreen -and $platformGreen -and $actualReclaimed -gt 0
  $verdict = [ordered]@{
    schema_version = "r3.2-cleanup-r1.combined-final-verdict.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    initial_manifest_sha256 = [string]$waveDefinitions[0].manifest_sha256
    combined_ledger_sha256 = $combinedLedgerSha
    status = if ($verdictGreen) { "SAFE_LARGE_GENERATED_CLEANUP_R1_GREEN" } else { "SAFE_LARGE_GENERATED_CLEANUP_R1_RED" }
    structural_proof_green = $structuralGreen
    platform_stability_and_recovery_green = $platformGreen
    initial_candidate_paths = [int]$initialManifest.totals.candidate_paths
    initial_eligible_paths = $initialEligible.Count
    successful_distinct_paths = $successfulPaths.Count
    protected_paths = $initialProtected.Count
    protected_paths_missing = $protectedMissing.Count
    android_builds_deleted = 0
    node_modules_deleted = $successfulPaths.Count
    failure_entries = $failureEntries.Count
    failed_paths_recovered_later = $failureEntries.Count - $failedNotRecovered.Count
    measured_successful_ledger_bytes = $measuredSuccessfulBytes
    initial_eligible_measured_bytes = [int64]$initialManifest.totals.eligible_bytes
    actual_reclaimed_bytes = $actualReclaimed
    actual_reclaimed_gib = [math]::Round($actualReclaimed / 1GB, 3)
    free_bytes_before = [int64]$diskBeforeArtifact.disk.free_bytes
    free_bytes_after = [int64]$diskAfter.free_bytes
    source_sha_before_finalize = $sourceShaBeforeFinalize
    source_sha_after_finalize = $sourceShaAfterFinalize
    release_performed = $false
    merge_push_deploy_ota_performed = $false
    full_jest_performed = $false
    global_status = "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE"
  }
  $verdictSha = Write-EvidenceJson (Join-Path $evidenceAbsolute "14_FINAL_GENERATED_CLEANUP_VERDICT_R1.json") $verdict
  $report = @"
# R3.2 safe large generated cleanup R1 — combined final

- Status: `$($verdict.status)`
- Initial candidates: $($verdict.initial_candidate_paths)
- Eligible/deleted node_modules: $($verdict.initial_eligible_paths)/$($verdict.node_modules_deleted)
- Protected paths present: $($verdict.protected_paths - $verdict.protected_paths_missing)/$($verdict.protected_paths)
- Android builds deleted: $($verdict.android_builds_deleted)
- Failure entries recovered by later exact manifests: $($verdict.failed_paths_recovered_later)/$($verdict.failure_entries)
- Initial eligible measured bytes: $($verdict.initial_eligible_measured_bytes)
- Successful-ledger measured bytes: $($verdict.measured_successful_ledger_bytes)
- Actual reclaimed: $($verdict.actual_reclaimed_bytes) bytes ($($verdict.actual_reclaimed_gib) GiB)
- Free BEFORE/AFTER: $($verdict.free_bytes_before) / $($verdict.free_bytes_after) bytes
- Product/Edge typecheck exits: $($productTsc.exit_code)/$($edgeTsc.exit_code)
- Scripts known errors: $($scriptsErrors.Count); targeted smoke exit: $($targeted.exit_code)
- Ownership/checkpoint exits: $($ownership.exit_code)/$($checkpoint.exit_code)
- Recovery spot: $($recoverySpot.status)
- Combined ledger SHA-256: `$combinedLedgerSha`
- Verdict SHA-256: `$verdictSha`

Protected and untouched: current/dirty worktrees, source, git/history, runtime evidence, databases/dumps, Docker, AVD, unique artifacts, package/lock files and Gradle wrapper/config. Global release status remains RED.
"@
  Write-Utf8NoBom (Join-Path $evidenceAbsolute "15_FINAL_GENERATED_CLEANUP_REPORT_R1.md") $report
  $state = [ordered]@{
    schema_version = "r3.2-cleanup-r1.combined-execution-state.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    combined_ledger_sha256 = $combinedLedgerSha
    phase = if ($verdictGreen) { "COMPLETE_GREEN" } else { "COMPLETE_RED" }
    deleted_paths = $successfulPaths.Count
    protected_paths = $initialProtected.Count
    actual_reclaimed_bytes = $actualReclaimed
    deletion_performed_in_finalize = $false
    verdict_sha256 = $verdictSha
    global_status = "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE"
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "00_GENERATED_CLEANUP_EXECUTION_STATE_R1.json") $state | Out-Null
  $verdict | ConvertTo-Json -Depth 10
  if (-not $verdictGreen) { exit 1 }
  exit 0
}

if ($Mode -eq "Scan") {
  $generatedAt = [DateTime]::UtcNow.ToString("o")
  $source = Get-CurrentSourceContext $repoRoot
  $worktrees = @(Get-WorktreeBlocks)
  if ($worktrees.Count -ne 114) { throw "WORKTREE_COUNT_DRIFT:$($worktrees.Count)" }
  $worktreeMap = @{}
  foreach ($worktree in $worktrees) { $worktreeMap[(Normalize-Absolute ([string]$worktree.worktree)).ToLowerInvariant()] = $worktree }
  $processes = @(Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine)
  $prior = Get-Content -Raw -LiteralPath $priorManifestPath | ConvertFrom-Json
  if (@($prior.entries).Count -ne 75) { throw "PRIOR_CANDIDATE_COUNT_DRIFT" }
  $priorPaths = @($prior.entries.exact_path_or_object_id | ForEach-Object { (Normalize-Absolute $_).ToLowerInvariant() })
  if (@($priorPaths | Sort-Object -Unique).Count -ne 75) { throw "PRIOR_DUPLICATE_PATHS" }

  $currentStatus = Get-StatusRecord $repoRoot
  $worktreeText = ((Invoke-GitLines @("worktree", "list", "--porcelain")) -join "`n") + "`n"
  $diskBefore = Get-DiskRecord
  $diskBeforeRecord = [ordered]@{
    schema_version = "r3.2-cleanup-r1.disk-before.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $null
    disk = $diskBefore
  }

  $statusBefore = [ordered]@{
    schema_version = "r3.2-cleanup-r1.source-status-before.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $null
    product_source_sha256 = $source.product_source_sha256
    git_status_porcelain_v2_sha256 = $currentStatus.sha256
    git_status_porcelain_v2_lines = $currentStatus.lines.Count
    registered_worktrees = $worktrees.Count
    registered_worktrees_sha256 = Get-TextSha256 $worktreeText
    current_worktree = Normalize-Absolute $repoRoot
  }

  $ownerStatusCache = @{}
  $entries = New-Object Collections.Generic.List[object]
  foreach ($oldEntry in @($prior.entries | Sort-Object exact_path_or_object_id)) {
    $path = Normalize-Absolute ([string]$oldEntry.exact_path_or_object_id)
    $owner = Normalize-Absolute ([string]$oldEntry.owner_worktree)
    $category = [string]$oldEntry.category
    Assert-DeleteBoundary -Owner $owner -Path $path -Category $category
    $ownerKey = $owner.ToLowerInvariant()
    $ownerRegistered = $worktreeMap.ContainsKey($ownerKey)
    $ownerCurrent = $owner.Equals((Normalize-Absolute $repoRoot), [StringComparison]::OrdinalIgnoreCase)
    $exists = Test-Path -LiteralPath $path -PathType Container
    $status = $null
    if ($ownerRegistered -and (Test-Path -LiteralPath $owner -PathType Container)) {
      if (-not $ownerStatusCache.ContainsKey($ownerKey)) { $ownerStatusCache[$ownerKey] = Get-StatusRecord $owner }
      $status = $ownerStatusCache[$ownerKey]
    }
    $consumers = @(Get-OwnerConsumers -Processes $processes -Owner $owner -Target $path)
    $ownerActive = $consumers.Count -gt 0
    $targetStatus = if ($exists -and $ownerRegistered) { Get-TargetStatusCount -Owner $owner -Target $path } else { -1 }
    $trackedInside = if ($exists -and $ownerRegistered) { Get-TrackedTargetCount -Owner $owner -Target $path } else { -1 }
    $reparse = if ($exists) { Test-ReparseRoot $path } else { $false }
    $bytes = if ($exists) { Get-DuBytes $path } else { [int64]0 }
    $androidEvidence = if ($exists -and $category -eq "ANDROID_BUILD") { @(Get-AndroidEvidenceOutputs $path) } else { @() }
    $packageJson = Join-Path $owner "package.json"
    $lockfile = Join-Path $owner "package-lock.json"
    $packageSha = if ($category -eq "NODE_MODULES" -and (Test-Path -LiteralPath $packageJson -PathType Leaf)) { Get-Sha256 $packageJson } else { $null }
    $lockSha = if ($category -eq "NODE_MODULES" -and (Test-Path -LiteralPath $lockfile -PathType Leaf)) { Get-Sha256 $lockfile } else { $null }
    $recoveryGroup = if ($packageSha -and $lockSha) { Get-TextSha256 "$lockSha|$packageSha" } else { $null }
    $handleProof = [ordered]@{ passed = $false; mechanism = "NOT_RUN"; error = "PRECONDITION_RED" }
    $classification = "ELIGIBLE_PENDING_RECOVERY"
    $reason = "all non-recovery preconditions green"
    if (-not $exists) { $classification = "SKIP_UNKNOWN"; $reason = "candidate directory missing" }
    elseif (-not $ownerRegistered) { $classification = "SKIP_UNKNOWN"; $reason = "owner worktree not registered" }
    elseif ($ownerCurrent) { $classification = "SKIP_ACTIVE"; $reason = "current remediation worktree" }
    elseif ($ownerActive) { $classification = "SKIP_ACTIVE"; $reason = "running process command line references owner or target" }
    elseif ($null -eq $status) { $classification = "SKIP_UNKNOWN"; $reason = "owner git status unavailable" }
    elseif ($status.tracked -gt 0 -or $status.untracked -gt 0) { $classification = "SKIP_DIRTY_OWNER"; $reason = "owner worktree has tracked or untracked changes" }
    elseif ($targetStatus -ne 0 -or $trackedInside -ne 0) { $classification = "SKIP_UNIQUE"; $reason = "target contains tracked or target-local dirty content" }
    elseif ($reparse) { $classification = "SKIP_UNKNOWN"; $reason = "target root is a reparse point or symlink" }
    elseif ($category -eq "ANDROID_BUILD" -and $androidEvidence.Count -gt 0) { $classification = "SKIP_UNIQUE"; $reason = "Android target contains APK/AAB/mapping/symbol/test evidence output" }
    elseif ($category -eq "NODE_MODULES" -and (-not $packageSha -or -not $lockSha)) { $classification = "SKIP_RECOVERY_RED"; $reason = "package.json or package-lock.json missing" }
    else {
      $handleProof = Test-HandleRenameProbe $path
      if (-not $handleProof.passed) { $classification = "SKIP_UNKNOWN"; $reason = "atomic rename open-handle probe failed" }
    }
    $entry = [pscustomobject][ordered]@{
      path = $path
      normalizedPath = $path
      category = $category
      bytes = [int64]$bytes
      historicalBytes = [int64]$oldEntry.measured_bytes
      ownerWorktree = $owner
      ownerRegistered = $ownerRegistered
      ownerCurrent = $ownerCurrent
      ownerActive = $ownerActive
      ownerTrackedDirtyCount = if ($status) { [int]$status.tracked } else { -1 }
      ownerUntrackedCount = if ($status) { [int]$status.untracked } else { -1 }
      targetLocalDirty = $targetStatus -ne 0
      reparsePoint = $reparse
      symlink = $reparse
      openHandles = if ($handleProof.passed) { @() } else { @($handleProof.error) }
      openHandleProof = $handleProof
      runningConsumers = $consumers
      sourceFilesInside = [math]::Max(0, $trackedInside)
      uniqueEvidenceInside = $androidEvidence.Count
      uniqueEvidenceSample = @($androidEvidence | Select-Object -First 20)
      uniqueDataInside = if ($targetStatus -gt 0 -or $trackedInside -gt 0) { 1 } else { 0 }
      packageJsonSha256 = $packageSha
      lockfileSha256 = $lockSha
      recoveryGroupId = $recoveryGroup
      recoveryCommand = if ($category -eq "NODE_MODULES") { "npm ci --workspaces=false" } else { ".\gradlew.bat app:assembleDebug" }
      recoveryProofStatus = if ($classification -eq "ELIGIBLE_PENDING_RECOVERY" -and $category -eq "ANDROID_BUILD") { "GREEN_STATIC_WRAPPER_SOURCE_OUTSIDE_TARGET" } else { "UNKNOWN" }
      classification = $classification
      reason = $reason
      manifestSourceSha256 = $source.source_sha256
      deleted = $false
    }
    $entries.Add($entry)
  }

  $recoveryProofs = New-Object Collections.Generic.List[object]
  $pendingNode = @($entries | Where-Object { $_.classification -eq "ELIGIBLE_PENDING_RECOVERY" -and $_.category -eq "NODE_MODULES" })
  foreach ($group in @($pendingNode | Group-Object recoveryGroupId | Sort-Object Name)) {
    $sample = $group.Group[0]
    $lockfile = Join-Path $sample.ownerWorktree "package-lock.json"
    $packageJson = Join-Path $sample.ownerWorktree "package.json"
    $lockBefore = Get-Sha256 $lockfile
    $packageBefore = Get-Sha256 $packageJson
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $output = @(& npm.cmd ci --dry-run --ignore-scripts --workspaces=false --no-audit --no-fund --loglevel=error --prefix $sample.ownerWorktree 2>&1)
    $exitCode = $LASTEXITCODE
    $watch.Stop()
    $lockAfter = Get-Sha256 $lockfile
    $packageAfter = Get-Sha256 $packageJson
    $passed = $exitCode -eq 0 -and $lockBefore -eq $lockAfter -and $packageBefore -eq $packageAfter
    $proof = [pscustomobject][ordered]@{
      recovery_group_id = $group.Name
      lockfile_sha256 = $lockBefore
      package_json_sha256 = $packageBefore
      representative_worktree = $sample.ownerWorktree
      covered_paths = $group.Count
      command = "npm ci --dry-run --ignore-scripts --workspaces=false --no-audit --no-fund --loglevel=error"
      exit_code = $exitCode
      elapsed_seconds = [math]::Round($watch.Elapsed.TotalSeconds, 3)
      output_sha256 = Get-TextSha256 (($output -join "`n") + "`n")
      lockfile_unchanged = $lockBefore -eq $lockAfter
      package_json_unchanged = $packageBefore -eq $packageAfter
      status = if ($passed) { "GREEN" } else { "RED" }
    }
    $recoveryProofs.Add($proof)
    foreach ($entry in @($group.Group)) {
      if ($passed) {
        $entry.recoveryProofStatus = "GREEN"
        $entry.classification = "ELIGIBLE"
        $entry.reason = "clean inactive generated target; current recovery and rename-handle proofs green"
      } else {
        $entry.recoveryProofStatus = "RED"
        $entry.classification = "SKIP_RECOVERY_RED"
        $entry.reason = "current npm ci dry-run or lock immutability proof failed"
      }
    }
  }
  foreach ($entry in @($entries | Where-Object { $_.classification -eq "ELIGIBLE_PENDING_RECOVERY" -and $_.category -eq "ANDROID_BUILD" })) {
    $wrapper = Join-Path $entry.ownerWorktree "android\gradlew.bat"
    if (Test-Path -LiteralPath $wrapper -PathType Leaf) {
      $entry.recoveryProofStatus = "GREEN_STATIC_WRAPPER_SOURCE_OUTSIDE_TARGET"
      $entry.classification = "ELIGIBLE"
      $entry.reason = "clean inactive generated Android target without unique outputs; wrapper/source outside target"
    } else {
      $entry.recoveryProofStatus = "RED"
      $entry.classification = "SKIP_RECOVERY_RED"
      $entry.reason = "Gradle wrapper missing"
    }
  }

  $entryArray = @($entries.ToArray() | Sort-Object @{Expression={ if ($_.classification -eq 'ELIGIBLE') { 0 } else { 1 } }}, category, @{Expression='bytes';Descending=$true})
  $eligible = @($entryArray | Where-Object classification -eq "ELIGIBLE")
  $skipped = @($entryArray | Where-Object classification -ne "ELIGIBLE")
  $eligibleBytes = [int64](($eligible | Measure-Object bytes -Sum).Sum)
  $candidateBytes = [int64](($entryArray | Measure-Object bytes -Sum).Sum)
  $manifest = [ordered]@{
    schema_version = "r3.2-cleanup-r1.safe-large-generated-cleanup-manifest.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $null
    status = if ($eligible.Count -gt 0 -and $eligibleBytes -gt 0) { "SAFE_GENERATED_MANIFEST_READY_AUTHORIZED" } else { "SAFE_GENERATED_MANIFEST_NO_ELIGIBLE_PATHS" }
    authorization = [ordered]@{
      safe_generated_cleanup_authorization = "GRANTED"
      repeat_user_approval_for_eligible_paths = $false
      source_or_data_deletion = "FORBIDDEN"
    }
    lineage = [ordered]@{
      prior_manifest_path = Normalize-Absolute $priorManifestPath
      prior_manifest_sha256 = $PriorManifestSha256
      prior_candidate_paths = 75
      current_source_identity_path = Normalize-Absolute $source.source_path
      current_product_source_sha256 = $source.product_source_sha256
      human_acceptance_sha256 = $source.human_sha256
      denominator_sha256 = $source.denominator_sha256
    }
    gates = [ordered]@{
      candidate_count = $entryArray.Count
      candidate_count_lte_75 = $entryArray.Count -le 75
      duplicate_paths = $entryArray.Count - @($entryArray.path | Sort-Object -Unique).Count
      relative_paths = @($entryArray | Where-Object { -not (Test-FullyQualifiedPath ([string]$_.path)) }).Count
      glob_paths = @($entryArray | Where-Object { $_.path -match '[*?\[\]]' }).Count
      unresolved_variables = @($entryArray | Where-Object { $_.path -match '\$\{|%[^%]+%' }).Count
      path_escape = 0
      current_worktree_targets = @($eligible | Where-Object ownerCurrent).Count
      dirty_owner_targets_eligible = @($eligible | Where-Object { $_.ownerTrackedDirtyCount -ne 0 -or $_.ownerUntrackedCount -ne 0 }).Count
      unknown_targets_eligible = @($eligible | Where-Object { $_.classification -match 'UNKNOWN' }).Count
      all_eligible_recovery_green = @($eligible | Where-Object { $_.recoveryProofStatus -notmatch '^GREEN' }).Count -eq 0
      all_eligible_handle_probes_green = @($eligible | Where-Object { -not $_.openHandleProof.passed }).Count -eq 0
    }
    totals = [ordered]@{
      candidate_paths = $entryArray.Count
      eligible_paths = $eligible.Count
      skipped_paths = $skipped.Count
      candidate_bytes = $candidateBytes
      eligible_bytes = $eligibleBytes
      eligible_gib = [math]::Round($eligibleBytes / 1GB, 3)
      by_category = @($entryArray | Group-Object category | Sort-Object Name | ForEach-Object {
        [ordered]@{
          category = $_.Name
          candidate_paths = $_.Count
          eligible_paths = @($_.Group | Where-Object classification -eq "ELIGIBLE").Count
          candidate_bytes = [int64](($_.Group | Measure-Object bytes -Sum).Sum)
          eligible_bytes = [int64]((@($_.Group | Where-Object classification -eq "ELIGIBLE") | Measure-Object bytes -Sum).Sum)
        }
      })
    }
    entries = $entryArray
  }
  $manifestPath = Join-Path $evidenceAbsolute "03_SAFE_LARGE_GENERATED_CLEANUP_MANIFEST_R1.json"
  $manifestPayloadSha = Write-EvidenceJson $manifestPath $manifest
  $manifestSha = Get-Sha256 $manifestPath

  $diskBeforeRecord.manifest_sha256 = $manifestSha
  Write-EvidenceJson (Join-Path $evidenceAbsolute "01_DISK_BEFORE_R1.json") $diskBeforeRecord | Out-Null
  $statusBefore.manifest_sha256 = $manifestSha
  Write-EvidenceJson (Join-Path $evidenceAbsolute "02_SOURCE_STATUS_BEFORE_R1.json") $statusBefore | Out-Null
  $diff = [ordered]@{
    schema_version = "r3.2-cleanup-r1.manifest-diff-vs-r2.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    prior_manifest_sha256 = $PriorManifestSha256
    prior_paths = 75
    current_paths = $entryArray.Count
    new_unknown_paths = @($entryArray | Where-Object { -not $priorPaths.Contains($_.path.ToLowerInvariant()) }).Count
    eligible_paths = $eligible.Count
    excluded_since_r2 = $skipped.Count
    historical_bytes = [int64]$prior.totals.measured_bytes
    current_candidate_bytes = $candidateBytes
    current_eligible_bytes = $eligibleBytes
    exact_same_candidate_path_set = ((@($entryArray.path | ForEach-Object { $_.ToLowerInvariant() } | Sort-Object) -join "`n") -eq (@($priorPaths | Sort-Object) -join "`n"))
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "04_MANIFEST_DIFF_VS_R2_R1.json") $diff | Out-Null
  $recovery = [ordered]@{
    schema_version = "r3.2-cleanup-r1.recovery-groups.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    status = if (@($recoveryProofs | Where-Object status -ne "GREEN").Count -eq 0) { "GREEN" } else { "RED" }
    unique_groups = $recoveryProofs.Count
    covered_eligible_node_modules = @($eligible | Where-Object category -eq "NODE_MODULES").Count
    proofs = @($recoveryProofs.ToArray())
  }
  $recoverySha = Write-EvidenceJson (Join-Path $evidenceAbsolute "05_RECOVERY_GROUPS_R1.json") $recovery
  $processAudit = [ordered]@{
    schema_version = "r3.2-cleanup-r1.process-handle-audit.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    recovery_proof_sha256 = $recoverySha
    mechanism = "process command-line owner/target scan plus exact atomic directory rename-and-restore probe"
    process_snapshot_count = $processes.Count
    eligible_running_consumers = @($eligible | Where-Object { @($_.runningConsumers).Count -gt 0 }).Count
    eligible_handle_probe_failures = @($eligible | Where-Object { -not $_.openHandleProof.passed }).Count
    status = if (@($eligible | Where-Object { @($_.runningConsumers).Count -gt 0 -or -not $_.openHandleProof.passed }).Count -eq 0) { "GREEN" } else { "RED" }
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "06_PROCESS_HANDLE_AUDIT_R1.json") $processAudit | Out-Null
  $skippedArtifact = [ordered]@{
    schema_version = "r3.2-cleanup-r1.skipped-unsafe-paths.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    skipped_paths = $skipped.Count
    skipped_bytes = [int64](($skipped | Measure-Object bytes -Sum).Sum)
    by_reason = @($skipped | Group-Object classification | Sort-Object Name | ForEach-Object { [ordered]@{ classification = $_.Name; paths = $_.Count; bytes = [int64](($_.Group | Measure-Object bytes -Sum).Sum) } })
    entries = @($skipped | ForEach-Object { [ordered]@{ path = $_.path; ownerWorktree = $_.ownerWorktree; category = $_.category; bytes = $_.bytes; classification = $_.classification; reason = $_.reason } })
    deleted = 0
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "09_SKIPPED_UNSAFE_PATHS_R1.json") $skippedArtifact | Out-Null
  $state = [ordered]@{
    schema_version = "r3.2-cleanup-r1.execution-state.v1"
    generated_at_utc = $generatedAt
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    recovery_proof_sha256 = $recoverySha
    phase = "MANIFEST_READY_EXECUTION_AUTHORIZED"
    eligible_paths = $eligible.Count
    eligible_bytes = $eligibleBytes
    deleted_paths = 0
    deletion_performed = $false
    global_status = "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE"
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "00_GENERATED_CLEANUP_EXECUTION_STATE_R1.json") $state | Out-Null
  [ordered]@{
    status = $manifest.status
    manifest_sha256 = $manifestSha
    payload_file_sha256 = $manifestPayloadSha
    candidate_paths = $entryArray.Count
    eligible_paths = $eligible.Count
    skipped_paths = $skipped.Count
    candidate_gib = [math]::Round($candidateBytes / 1GB, 3)
    eligible_gib = [math]::Round($eligibleBytes / 1GB, 3)
    eligible_android = @($eligible | Where-Object category -eq "ANDROID_BUILD").Count
    eligible_node_modules = @($eligible | Where-Object category -eq "NODE_MODULES").Count
    recovery_groups = $recoveryProofs.Count
    deletion_performed = $false
  } | ConvertTo-Json -Depth 10
  exit 0
}

if ($Mode -eq "Execute") {
  $generatedAt = [DateTime]::UtcNow.ToString("o")
  $manifestPath = Join-Path $evidenceAbsolute "03_SAFE_LARGE_GENERATED_CLEANUP_MANIFEST_R1.json"
  $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
  $manifestSha = Get-Sha256 $manifestPath
  $source = Get-CurrentSourceContext $repoRoot
  if ($manifest.status -ne "SAFE_GENERATED_MANIFEST_READY_AUTHORIZED") { throw "MANIFEST_NOT_READY" }
  if ($manifest.addendum_sha256 -ne $AddendumSha256 -or $manifest.current_r3_source_sha256 -ne $source.source_sha256) { throw "MANIFEST_BINDING_STALE" }
  if (@($manifest.entries).Count -gt 75) { throw "MANIFEST_SCOPE_EXCEEDED" }
  $beforeStatus = Get-Content -Raw -LiteralPath (Join-Path $evidenceAbsolute "02_SOURCE_STATUS_BEFORE_R1.json") | ConvertFrom-Json
  $currentStatus = Get-StatusRecord $repoRoot
  if ($currentStatus.sha256 -ne $beforeStatus.git_status_porcelain_v2_sha256) { throw "SOURCE_STATUS_DRIFT_BEFORE_DELETE" }
  $worktreeText = ((Invoke-GitLines @("worktree", "list", "--porcelain")) -join "`n") + "`n"
  if ((Get-TextSha256 $worktreeText) -ne $beforeStatus.registered_worktrees_sha256) { throw "WORKTREE_REGISTRATION_DRIFT_BEFORE_DELETE" }
  $eligible = @($manifest.entries | Where-Object classification -eq "ELIGIBLE")
  if ($eligible.Count -eq 0 -or [int64](($eligible | Measure-Object bytes -Sum).Sum) -le 0) { throw "NO_ELIGIBLE_BYTES" }

  $androidLedger = New-Object Collections.Generic.List[object]
  $nodeLedger = New-Object Collections.Generic.List[object]
  $deletedCount = 0
  $deletedMeasuredBytes = [int64]0
  $deleteFailure = $null
  $orderedDelete = @(
    $eligible | Where-Object category -eq "ANDROID_BUILD" | Sort-Object bytes -Descending
    $eligible | Where-Object category -eq "NODE_MODULES" | Sort-Object recoveryGroupId, @{Expression='bytes';Descending=$true}
  )
  foreach ($entry in $orderedDelete) {
    if ($deleteFailure) { break }
    $path = Normalize-Absolute ([string]$entry.path)
    $owner = Normalize-Absolute ([string]$entry.ownerWorktree)
    Assert-DeleteBoundary -Owner $owner -Path $path -Category ([string]$entry.category)
    if (-not (Test-Path -LiteralPath $path -PathType Container)) { $deleteFailure = "TARGET_MISSING_BEFORE_DELETE:$path"; break }
    $ownerStatus = Get-StatusRecord $owner
    if ($ownerStatus.tracked -ne 0 -or $ownerStatus.untracked -ne 0) { $deleteFailure = "OWNER_BECAME_DIRTY:$path"; break }
    if (Test-ReparseRoot $path) { $deleteFailure = "TARGET_BECAME_REPARSE:$path"; break }
    $processes = @(Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine)
    if (@(Get-OwnerConsumers -Processes $processes -Owner $owner -Target $path).Count -ne 0) { $deleteFailure = "TARGET_BECAME_ACTIVE:$path"; break }
    $handle = Test-HandleRenameProbe $path
    if (-not $handle.passed) { $deleteFailure = "HANDLE_PROBE_RED:$path"; break }
    if ($entry.category -eq "NODE_MODULES") {
      if ((Get-Sha256 (Join-Path $owner "package.json")) -ne $entry.packageJsonSha256 -or (Get-Sha256 (Join-Path $owner "package-lock.json")) -ne $entry.lockfileSha256) {
        $deleteFailure = "RECOVERY_INPUT_DRIFT:$path"; break
      }
    }
    $freeBefore = [int64](Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $exitCode = 0
    $errorText = $null
    $deleteMethod = $null
    try { $deleteMethod = Remove-ExactDirectory $path } catch { $exitCode = 1; $errorText = $_.Exception.Message }
    $watch.Stop()
    $freeAfter = [int64](Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'").FreeSpace
    $deleted = $exitCode -eq 0 -and -not (Test-Path -LiteralPath $path)
    $record = [pscustomobject][ordered]@{
      sequence = $deletedCount + 1
      path = $path
      ownerWorktree = $owner
      category = [string]$entry.category
      recoveryGroupId = $entry.recoveryGroupId
      measured_bytes = [int64]$entry.bytes
      free_bytes_before = $freeBefore
      free_bytes_after = $freeAfter
      observed_free_delta_bytes = [int64]($freeAfter - $freeBefore)
      delete_method = $deleteMethod
      exit_code = $exitCode
      elapsed_seconds = [math]::Round($watch.Elapsed.TotalSeconds, 3)
      deleted = $deleted
      error = $errorText
      source_identity_sha256_after = Get-Sha256 $source.source_path
    }
    if ($entry.category -eq "ANDROID_BUILD") { $androidLedger.Add($record) } else { $nodeLedger.Add($record) }
    $ledgerEnvelope = [ordered]@{
      schema_version = "r3.2-cleanup-r1.delete-ledger.v1"
      generated_at_utc = [DateTime]::UtcNow.ToString("o")
      tool_sha256 = $toolSha256
      master_r3_2_sha256 = $MasterSha256
      addendum_sha256 = $AddendumSha256
      current_r3_source_sha256 = $source.source_sha256
      manifest_sha256 = $manifestSha
      category = [string]$entry.category
      entries = if ($entry.category -eq "ANDROID_BUILD") { @($androidLedger.ToArray()) } else { @($nodeLedger.ToArray()) }
    }
    $ledgerName = if ($entry.category -eq "ANDROID_BUILD") { "07_ANDROID_BUILD_DELETE_LEDGER_R1.json" } else { "08_NODE_MODULES_DELETE_LEDGER_R1.json" }
    Write-EvidenceJson (Join-Path $evidenceAbsolute $ledgerName) $ledgerEnvelope | Out-Null
    if (-not $deleted) { $deleteFailure = "DELETE_FAILED:${path}:$errorText"; break }
    $deletedCount++
    $deletedMeasuredBytes += [int64]$entry.bytes
    if ((Get-Sha256 $source.source_path) -ne $source.source_sha256) { $deleteFailure = "SOURCE_IDENTITY_CHANGED_DURING_DELETE"; break }
    if ($currentStatus.sha256 -ne (Get-StatusRecord $repoRoot).sha256) { $deleteFailure = "SOURCE_STATUS_CHANGED_DURING_DELETE"; break }
    if ((($deletedCount % 5) -eq 0) -or $deletedMeasuredBytes -ge 10GB) {
      $checkpointState = [ordered]@{
        schema_version = "r3.2-cleanup-r1.execution-state.v1"
        generated_at_utc = [DateTime]::UtcNow.ToString("o")
        tool_sha256 = $toolSha256
        master_r3_2_sha256 = $MasterSha256
        addendum_sha256 = $AddendumSha256
        current_r3_source_sha256 = $source.source_sha256
        manifest_sha256 = $manifestSha
        phase = "DELETE_IN_PROGRESS"
        eligible_paths = $eligible.Count
        deleted_paths = $deletedCount
        deleted_measured_bytes = $deletedMeasuredBytes
        deletion_performed = $deletedCount -gt 0
        global_status = "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE"
      }
      Write-EvidenceJson (Join-Path $evidenceAbsolute "00_GENERATED_CLEANUP_EXECUTION_STATE_R1.json") $checkpointState | Out-Null
    }
  }

  if (-not (Test-Path -LiteralPath (Join-Path $evidenceAbsolute "07_ANDROID_BUILD_DELETE_LEDGER_R1.json"))) {
    Write-EvidenceJson (Join-Path $evidenceAbsolute "07_ANDROID_BUILD_DELETE_LEDGER_R1.json") ([ordered]@{
      schema_version = "r3.2-cleanup-r1.delete-ledger.v1"; generated_at_utc = $generatedAt; tool_sha256 = $toolSha256
      master_r3_2_sha256 = $MasterSha256; addendum_sha256 = $AddendumSha256; current_r3_source_sha256 = $source.source_sha256
      manifest_sha256 = $manifestSha; category = "ANDROID_BUILD"; entries = @()
    }) | Out-Null
  }
  if (-not (Test-Path -LiteralPath (Join-Path $evidenceAbsolute "08_NODE_MODULES_DELETE_LEDGER_R1.json"))) {
    Write-EvidenceJson (Join-Path $evidenceAbsolute "08_NODE_MODULES_DELETE_LEDGER_R1.json") ([ordered]@{
      schema_version = "r3.2-cleanup-r1.delete-ledger.v1"; generated_at_utc = $generatedAt; tool_sha256 = $toolSha256
      master_r3_2_sha256 = $MasterSha256; addendum_sha256 = $AddendumSha256; current_r3_source_sha256 = $source.source_sha256
      manifest_sha256 = $manifestSha; category = "NODE_MODULES"; entries = @()
    }) | Out-Null
  }
  if ($deleteFailure) { throw $deleteFailure }
  if ($deletedCount -ne $eligible.Count) { throw "ELIGIBLE_DELETE_COUNT_MISMATCH:$deletedCount/$($eligible.Count)" }

  $diskAfter = Get-DiskRecord
  $diskBefore = Get-Content -Raw -LiteralPath (Join-Path $evidenceAbsolute "01_DISK_BEFORE_R1.json") | ConvertFrom-Json
  $actualReclaimed = [int64]$diskAfter.free_bytes - [int64]$diskBefore.disk.free_bytes
  $diskAfterArtifact = [ordered]@{
    schema_version = "r3.2-cleanup-r1.disk-after.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    disk = $diskAfter
    before_free_bytes = [int64]$diskBefore.disk.free_bytes
    actual_reclaimed_bytes = $actualReclaimed
    actual_reclaimed_gib = [math]::Round($actualReclaimed / 1GB, 3)
    measured_deleted_bytes = $deletedMeasuredBytes
    filesystem_delta_minus_measured_bytes = [int64]($actualReclaimed - $deletedMeasuredBytes)
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "10_DISK_AFTER_R1.json") $diskAfterArtifact | Out-Null

  $afterStatus = Get-StatusRecord $repoRoot
  $afterWorktreeText = ((Invoke-GitLines @("worktree", "list", "--porcelain")) -join "`n") + "`n"
  $sourceStatusAfter = [ordered]@{
    schema_version = "r3.2-cleanup-r1.source-status-after.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    source_identity_sha256_after = Get-Sha256 $source.source_path
    source_identity_unchanged = (Get-Sha256 $source.source_path) -eq $source.source_sha256
    git_status_porcelain_v2_sha256_before = $beforeStatus.git_status_porcelain_v2_sha256
    git_status_porcelain_v2_sha256_after = $afterStatus.sha256
    git_status_unchanged = $beforeStatus.git_status_porcelain_v2_sha256 -eq $afterStatus.sha256
    registered_worktrees_before = [int]$beforeStatus.registered_worktrees
    registered_worktrees_after = @(Get-WorktreeBlocks).Count
    registered_worktrees_sha256_after = Get-TextSha256 $afterWorktreeText
    registered_worktrees_unchanged = $beforeStatus.registered_worktrees_sha256 -eq (Get-TextSha256 $afterWorktreeText)
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "11_SOURCE_STATUS_AFTER_R1.json") $sourceStatusAfter | Out-Null

  $deletedNode = @($eligible | Where-Object category -eq "NODE_MODULES" | Select-Object -First 1)
  $recoverySpot = [ordered]@{
    schema_version = "r3.2-cleanup-r1.recovery-spot.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    status = "NOT_RUN"
    restored_node_modules = $false
  }
  if ($deletedNode.Count -eq 1) {
    $spot = $deletedNode[0]
    $lock = Join-Path $spot.ownerWorktree "package-lock.json"
    $package = Join-Path $spot.ownerWorktree "package.json"
    $lockBefore = Get-Sha256 $lock
    $packageBefore = Get-Sha256 $package
    $output = @(& npm.cmd ci --dry-run --ignore-scripts --workspaces=false --no-audit --no-fund --loglevel=error --prefix $spot.ownerWorktree 2>&1)
    $exitCode = $LASTEXITCODE
    $recoverySpot.status = if ($exitCode -eq 0 -and $lockBefore -eq (Get-Sha256 $lock) -and $packageBefore -eq (Get-Sha256 $package) -and -not (Test-Path -LiteralPath $spot.path)) { "GREEN" } else { "RED" }
    $recoverySpot.recovery_group_id = $spot.recoveryGroupId
    $recoverySpot.representative_worktree = $spot.ownerWorktree
    $recoverySpot.command = "npm ci --dry-run --ignore-scripts --workspaces=false --no-audit --no-fund --loglevel=error"
    $recoverySpot.exit_code = $exitCode
    $recoverySpot.output_sha256 = Get-TextSha256 (($output -join "`n") + "`n")
    $recoverySpot.lockfile_unchanged = $lockBefore -eq (Get-Sha256 $lock)
    $recoverySpot.package_json_unchanged = $packageBefore -eq (Get-Sha256 $package)
    $recoverySpot.restored_node_modules = Test-Path -LiteralPath $spot.path
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "12_RECOVERY_SPOT_R1.json") $recoverySpot | Out-Null

  $productTsc = Invoke-NodeCommand @("node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.product.json", "--pretty", "false")
  $edgeTsc = Invoke-NodeCommand @("node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.edge.json", "--pretty", "false")
  $scriptsTscOutput = @(& node node_modules/typescript/bin/tsc --noEmit -p tsconfig.typecheck.scripts.json --pretty false 2>&1)
  $scriptsTscExit = $LASTEXITCODE
  $scriptsErrors = @($scriptsTscOutput | Where-Object { $_ -match ': error TS\d+:' })
  $targeted = Invoke-NodeCommand @("node_modules/jest/bin/jest.js", "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.test.ts", "--runInBand", "--no-cache")
  $ownership = Invoke-NodeCommand @("node_modules/tsx/dist/cli.mjs", "scripts/architecture/auditR2CanonicalOwnership.ts", "--contract-version=r3", "--master-sha=$MasterSha256", "--output-root=.release-runtime/real-estimates-global-green-r3/evidence/r3-0-ownership-raw")
  $checkpoint = Invoke-NodeCommand @("node_modules/tsx/dist/cli.mjs", "scripts/architecture/buildR3Phase0Checkpoint.ts")
  $stabilityGreen = $productTsc.exit_code -eq 0 -and $edgeTsc.exit_code -eq 0 -and $scriptsTscExit -eq 0 -and $scriptsErrors.Count -eq 0 -and $targeted.exit_code -eq 0 -and $ownership.exit_code -eq 0 -and $checkpoint.exit_code -eq 0 -and $recoverySpot.status -eq "GREEN" -and $sourceStatusAfter.source_identity_unchanged -and $sourceStatusAfter.git_status_unchanged -and $sourceStatusAfter.registered_worktrees_unchanged
  $stability = [ordered]@{
    schema_version = "r3.2-cleanup-r1.platform-stability-after.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    status = if ($stabilityGreen) { "GREEN" } else { "RED" }
    product_typecheck = $productTsc
    edge_typecheck = $edgeTsc
    scripts_typecheck = [ordered]@{ exit_code = $scriptsTscExit; total_known_errors = $scriptsErrors.Count; output_sha256 = Get-TextSha256 (($scriptsTscOutput -join "`n") + "`n") }
    canonical_targeted_smoke = $targeted
    ownership = $ownership
    phase0_checkpoint = $checkpoint
    source_status = $sourceStatusAfter
    current_platform_node_modules_present = Test-Path -LiteralPath (Join-Path $repoRoot "node_modules")
    current_platform_android_build_untouched = $true
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "13_PLATFORM_STABILITY_AFTER_R1.json") $stability | Out-Null

  $verdictGreen = $stabilityGreen -and $deletedCount -eq $eligible.Count -and $actualReclaimed -gt 0
  $verdict = [ordered]@{
    schema_version = "r3.2-cleanup-r1.final-verdict.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    status = if ($verdictGreen) { "SAFE_LARGE_GENERATED_CLEANUP_R1_GREEN" } else { "SAFE_LARGE_GENERATED_CLEANUP_R1_RED" }
    eligible_generated_paths_deleted_no_source_data_evidence_loss = $verdictGreen
    platform_stability_and_recovery_green = $stabilityGreen
    candidate_paths = [int]$manifest.totals.candidate_paths
    eligible_paths = $eligible.Count
    deleted_paths = $deletedCount
    skipped_paths = [int]$manifest.totals.skipped_paths
    candidate_bytes = [int64]$manifest.totals.candidate_bytes
    eligible_bytes = [int64]$manifest.totals.eligible_bytes
    measured_deleted_bytes = $deletedMeasuredBytes
    actual_reclaimed_bytes = $actualReclaimed
    actual_reclaimed_gib = [math]::Round($actualReclaimed / 1GB, 3)
    free_bytes_before = [int64]$diskBefore.disk.free_bytes
    free_bytes_after = [int64]$diskAfter.free_bytes
    source_sha_before = $source.source_sha256
    source_sha_after = Get-Sha256 $source.source_path
    protected_categories_not_touched = @("current worktree", "dirty/untracked worktrees", "source", ".git/history/refs", ".release-runtime/evidence", "databases/dumps", "Docker", "AVD/emulator", "unique APK/PDF/photo evidence", "package and lock files", "Gradle wrapper/config")
    release_performed = $false
    merge_push_deploy_ota_performed = $false
    full_jest_performed = $false
  }
  $verdictSha = Write-EvidenceJson (Join-Path $evidenceAbsolute "14_FINAL_GENERATED_CLEANUP_VERDICT_R1.json") $verdict
  $report = @"
# R3.2 safe large generated cleanup R1

- Status: `$($verdict.status)`
- Candidate paths: $($verdict.candidate_paths)
- Eligible/deleted paths: $($verdict.eligible_paths)/$($verdict.deleted_paths)
- Skipped paths: $($verdict.skipped_paths)
- Candidate bytes: $($verdict.candidate_bytes)
- Eligible measured bytes: $($verdict.eligible_bytes)
- Actual reclaimed: $($verdict.actual_reclaimed_bytes) bytes ($($verdict.actual_reclaimed_gib) GiB)
- Free BEFORE/AFTER: $($verdict.free_bytes_before) / $($verdict.free_bytes_after) bytes
- Source SHA BEFORE/AFTER: `$($verdict.source_sha_before)` / `$($verdict.source_sha_after)`
- Product/Edge typecheck: $($productTsc.exit_code)/$($edgeTsc.exit_code)
- Scripts known errors: $($scriptsErrors.Count); targeted smoke exit: $($targeted.exit_code)
- Ownership/checkpoint exits: $($ownership.exit_code)/$($checkpoint.exit_code)
- Recovery spot: $($recoverySpot.status)
- Manifest SHA-256: `$manifestSha`
- Verdict SHA-256: `$verdictSha`

Protected and untouched: current/dirty worktrees, source, git/history, runtime evidence, databases/dumps, Docker, AVD, unique artifacts, manifests, locks and Gradle wrapper/config.
"@
  Write-Utf8NoBom (Join-Path $evidenceAbsolute "15_FINAL_GENERATED_CLEANUP_REPORT_R1.md") $report
  $state = [ordered]@{
    schema_version = "r3.2-cleanup-r1.execution-state.v1"
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
    tool_sha256 = $toolSha256
    master_r3_2_sha256 = $MasterSha256
    addendum_sha256 = $AddendumSha256
    current_r3_source_sha256 = $source.source_sha256
    manifest_sha256 = $manifestSha
    phase = if ($verdictGreen) { "COMPLETE_GREEN" } else { "COMPLETE_RED" }
    eligible_paths = $eligible.Count
    deleted_paths = $deletedCount
    actual_reclaimed_bytes = $actualReclaimed
    deletion_performed = $deletedCount -gt 0
    verdict_sha256 = $verdictSha
    global_status = "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE"
  }
  Write-EvidenceJson (Join-Path $evidenceAbsolute "00_GENERATED_CLEANUP_EXECUTION_STATE_R1.json") $state | Out-Null
  $verdict | ConvertTo-Json -Depth 10
  if (-not $verdictGreen) { exit 1 }
}
