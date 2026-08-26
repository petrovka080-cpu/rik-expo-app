param(
  [string]$EvidenceRoot = ".release-runtime/real-estimates-global-green-r3/evidence"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$MasterPath = "C:\Users\User\Downloads\MASTER_TZ_PRODUCTION_GRADE_CANONICAL_CODE_REAL_ESTIMATES_GLOBAL_GREEN_R3_RU (1).md"
$MasterSha256 = "f617befe4fc22e6c9e4dbaa6ca276bd271b8f021a3cd8825610196471aef3820"
$GeneratedCleanupAddendumPath = "C:\Users\User\Downloads\ADDENDUM_R3_2_PRODUCTION_GRADE_SAFE_LARGE_GENERATED_CLEANUP_R1_RU.md"
$GeneratedCleanupAddendumSha256 = "561257cf2031ef8477b2b5ac6124b1c8040ddd302296127f7327147b155f1b12"
$PredecessorSha256 = "1c18212fcea75adf57473146e04f25ce29a3c9a4febaaebfb5442ae2cdb78da4"

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

function Get-TextSha256 {
  param([string]$Text)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function Invoke-GitLines {
  param([string[]]$Arguments)
  $lines = @(& git -c core.quotepath=false @Arguments)
  if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed ($LASTEXITCODE)" }
  return $lines
}

function Normalize-RepoPath {
  param([string]$Path)
  $normalized = $Path.Replace("\", "/")
  if ($normalized.StartsWith("./")) { return $normalized.Substring(2) }
  return $normalized
}

function Get-Classification {
  param([string]$RelativePath)
  $path = Normalize-RepoPath $RelativePath
  if ($path -match '^(\.release-runtime|artifacts)(/|$)') { return "EVIDENCE" }
  if ($path -match '^(node_modules|\.expo|coverage|dist|web-build|build)(/|$)') { return "REBUILDABLE_GENERATED" }
  if ($path -match '(^|/)(node_modules|\.gradle(?:-[^/]*)?|build(?:-[^/]*)?|\.cxx|coverage|dist|web-build)(/|$)') {
    return "REBUILDABLE_GENERATED"
  }
  if ($path -match '^(\.tmp|tmp)(_|/|$)') { return "TEMPORARY_UNCLASSIFIED" }
  return "PRODUCT_SOURCE"
}

function Get-SubsetKind {
  param([string]$RelativePath)
  $path = Normalize-RepoPath $RelativePath
  return [ordered]@{
    harness = $path -match '^(maestro|scripts/e2e|scripts/release|tests/e2e|tests/android|android/app/src/androidTest)(/|$)' -or
      $path -match '^scripts/_shared/.*[Hh]arness'
    audit = $path -match '^(scripts/architecture|scripts/estimate|tests/architecture|tests/estimateBackend)(/|$)' -or
      $path -match '^scripts/release/audit'
    sql = $path -match '^supabase/(migrations|rollback)/.*\.sql$'
    lockfile = $path -match '(^|/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|deno\.lock)$'
  }
}

function Get-Aggregate {
  param([object[]]$Files)
  $lines = @($Files | Sort-Object path | ForEach-Object { "$($_.path)`0$($_.bytes)`0$($_.sha256)" })
  [int64]$byteTotal = 0
  foreach ($file in @($Files)) { $byteTotal += [int64]$file.bytes }
  return [ordered]@{
    files = $Files.Count
    bytes = $byteTotal
    sha256 = Get-TextSha256 ((($lines -join "`n")) + "`n")
  }
}

function Get-CommandVersion {
  param([string]$Command, [string[]]$Arguments)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = @(& $Command @Arguments 2>&1) -join "`n"
    $exit = $LASTEXITCODE
    return [ordered]@{ available = $true; exit_code = $exit; output = $output.Trim() }
  } catch {
    return [ordered]@{ available = $false; exit_code = $null; output = $_.Exception.Message }
  } finally { $ErrorActionPreference = $previous }
}

if (-not (Test-Path -LiteralPath $MasterPath -PathType Leaf)) { throw "R3_MASTER_MISSING" }
if ((Get-Sha256 $MasterPath) -ne $MasterSha256) { throw "R3_MASTER_SHA256_DRIFT" }
if ((Get-Item -LiteralPath $MasterPath).Length -ne 103465) { throw "R3_MASTER_BYTES_DRIFT" }
if (@(Get-Content -LiteralPath $MasterPath -Encoding UTF8).Count -ne 2586) { throw "R3_MASTER_LINES_DRIFT" }
if (-not (Test-Path -LiteralPath $GeneratedCleanupAddendumPath -PathType Leaf)) { throw "R3_GENERATED_CLEANUP_ADDENDUM_MISSING" }
if ((Get-Sha256 $GeneratedCleanupAddendumPath) -ne $GeneratedCleanupAddendumSha256) { throw "R3_GENERATED_CLEANUP_ADDENDUM_SHA256_DRIFT" }
if ((Get-Item -LiteralPath $GeneratedCleanupAddendumPath).Length -ne 19432) { throw "R3_GENERATED_CLEANUP_ADDENDUM_BYTES_DRIFT" }
if (@(Get-Content -LiteralPath $GeneratedCleanupAddendumPath -Encoding UTF8).Count -ne 513) { throw "R3_GENERATED_CLEANUP_ADDENDUM_LINES_DRIFT" }

$repoRoot = (Invoke-GitLines @("rev-parse", "--show-toplevel") | Select-Object -First 1).Replace("/", "\")
Set-Location -LiteralPath $repoRoot
$evidenceAbsolute = [IO.Path]::GetFullPath((Join-Path $repoRoot $EvidenceRoot))
New-Item -ItemType Directory -Path $evidenceAbsolute -Force | Out-Null
$generatedAt = [DateTime]::UtcNow.ToString("o")

$trackedDiffPath = Join-Path $evidenceAbsolute "03_CURRENT_TRACKED_DIFF_R3.patch"
& git --no-pager diff --binary --no-ext-diff "--output=$trackedDiffPath"
if ($LASTEXITCODE -ne 0) { throw "R3_TRACKED_DIFF_CAPTURE_FAILED" }
$trackedDiffSha = Get-Sha256 $trackedDiffPath

$statusLines = @(Invoke-GitLines @("status", "--porcelain=v2", "--branch", "--untracked-files=all"))
$statusPath = Join-Path $evidenceAbsolute "CURRENT_GIT_STATUS_PORCELAIN_V2_R3.txt"
Write-Utf8NoBom $statusPath (($statusLines -join "`n") + "`n")
$sortedStatusSha = Get-TextSha256 (((@($statusLines | Sort-Object) -join "`n")) + "`n")

$repoFiles = @(Invoke-GitLines @("ls-files", "--cached", "--others", "--exclude-standard") |
  ForEach-Object { Normalize-RepoPath $_ } | Sort-Object -Unique)
$trackedDeletionPaths = @(Invoke-GitLines @("diff", "--name-only", "--diff-filter=D") |
  ForEach-Object { Normalize-RepoPath $_ } | Sort-Object -Unique)
$trackedDeletionSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($path in $trackedDeletionPaths) { [void]$trackedDeletionSet.Add($path) }
$productFiles = New-Object System.Collections.Generic.List[object]
$missingPaths = New-Object System.Collections.Generic.List[string]
foreach ($relativePath in $repoFiles) {
  if ((Get-Classification $relativePath) -ne "PRODUCT_SOURCE") { continue }
  $absolute = Join-Path $repoRoot $relativePath.Replace("/", "\")
  if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) {
    if (-not $trackedDeletionSet.Contains($relativePath)) { $missingPaths.Add($relativePath) }
    continue
  }
  $item = Get-Item -LiteralPath $absolute
  $subset = Get-SubsetKind $relativePath
  $productFiles.Add([ordered]@{
    path = $relativePath
    bytes = [int64]$item.Length
    sha256 = Get-Sha256 $absolute
    harness = [bool]$subset.harness
    audit_tool = [bool]$subset.audit
    sql_migration = [bool]$subset.sql
    lockfile = [bool]$subset.lockfile
  })
}
$product = @($productFiles.ToArray())
$productAggregate = Get-Aggregate $product
$harnessAggregate = Get-Aggregate @($product | Where-Object harness)
$auditAggregate = Get-Aggregate @($product | Where-Object audit_tool)
$sqlAggregate = Get-Aggregate @($product | Where-Object sql_migration)
$lockAggregate = Get-Aggregate @($product | Where-Object lockfile)

$productManifestPath = Join-Path $evidenceAbsolute "02_CURRENT_PRODUCT_SOURCE_MANIFEST_R3.json"
$canonicalProductManifestPath = Join-Path $evidenceAbsolute "02_PRODUCT_SOURCE_MANIFEST_R3.json"
$productManifest = [ordered]@{
  schema_version = "real-estimates-global-green-r3.product-source-manifest.v1"
  generated_at_utc = $generatedAt
  master_contract_sha256 = $MasterSha256
  source_root = $repoRoot.Replace("\", "/")
  policy = [ordered]@{
    included = "tracked and non-ignored untracked product/config/script/test/sql/lock inputs"
    excluded = @("evidence", "generated outputs", "node_modules", "build caches", "coverage", "dist", "temporary files")
    evidence_in_product_hash = $false
    generated_in_product_hash = $false
  }
  aggregates = [ordered]@{
    product_source = $productAggregate
    harness_source = $harnessAggregate
    audit_tools = $auditAggregate
    sql_migrations = $sqlAggregate
    lockfiles = $lockAggregate
  }
  tracked_deletions = $trackedDeletionPaths
  missing_paths = $missingPaths.ToArray()
  files = $product
}
Write-Json $productManifestPath $productManifest
Write-Json $canonicalProductManifestPath $productManifest

$untrackedPaths = @(Invoke-GitLines @("ls-files", "--others", "--exclude-standard") |
  ForEach-Object { Normalize-RepoPath $_ } | Sort-Object -Unique)
$untrackedFiles = foreach ($relativePath in $untrackedPaths) {
  $absolute = Join-Path $repoRoot $relativePath.Replace("/", "\")
  $classification = Get-Classification $relativePath
  $exists = Test-Path -LiteralPath $absolute -PathType Leaf
  $item = if ($exists) { Get-Item -LiteralPath $absolute } else { $null }
  [ordered]@{
    path = $relativePath
    classification = $classification
    exists = $exists
    bytes = if ($item) { [int64]$item.Length } else { $null }
    sha256 = if ($exists -and $classification -eq "PRODUCT_SOURCE") { Get-Sha256 $absolute } else { $null }
  }
}
$untrackedManifestPath = Join-Path $evidenceAbsolute "04_CURRENT_UNTRACKED_MANIFEST_R3.json"
$untrackedManifest = [ordered]@{
  schema_version = "real-estimates-global-green-r3.untracked-manifest.v1"
  generated_at_utc = $generatedAt
  master_contract_sha256 = $MasterSha256
  files_total = $untrackedFiles.Count
  classification_counts = [ordered]@{
    product_source = @($untrackedFiles | Where-Object classification -eq "PRODUCT_SOURCE").Count
    evidence = @($untrackedFiles | Where-Object classification -eq "EVIDENCE").Count
    rebuildable_generated = @($untrackedFiles | Where-Object classification -eq "REBUILDABLE_GENERATED").Count
    temporary_unclassified = @($untrackedFiles | Where-Object classification -eq "TEMPORARY_UNCLASSIFIED").Count
  }
  files = @($untrackedFiles)
}
Write-Json $untrackedManifestPath $untrackedManifest

$currentPid = $PID
$processes = @(Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $currentPid -and (
    $_.Name -match '^(node|java|adb|emulator|qemu-system-x86_64|gradle).*' -or
    $_.CommandLine -match 'jest|gradlew|GradleMain|uiautomator|canonical-estimate|realUsefulEstimates|global-green-r3'
  )
} | Select-Object ProcessId, ParentProcessId, Name, CommandLine)
$activeGradle = @($processes | Where-Object { $_.CommandLine -match 'gradlew|GradleMain|:app:assemble|:app:bundle' })
$activeJest = @($processes | Where-Object { $_.CommandLine -match '(^|[\\/\s])jest(?:\.js)?([\s]|$)' })
$activeAndroid = @($processes | Where-Object { $_.CommandLine -match 'uiautomator|Android.*(?:run|matrix)' })

$sensitiveEnvNames = @(
  "EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL", "PROD_DATABASE_READONLY_URL",
  "PROD_SUPABASE_READONLY_KEY", "STAGING_SUPABASE_READONLY_KEY"
)
$environment = [ordered]@{}
foreach ($name in $sensitiveEnvNames) {
  $value = [Environment]::GetEnvironmentVariable($name)
  $environment[$name] = [ordered]@{
    present = -not [string]::IsNullOrWhiteSpace($value)
    length = if ($null -eq $value) { 0 } else { $value.Length }
    salted_sha256 = if ([string]::IsNullOrWhiteSpace($value)) { $null } else { Get-TextSha256 "$MasterSha256`:$value" }
    value_logged = $false
  }
}
$drive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($repoRoot).TrimEnd("\").TrimEnd(":"))
$environmentManifestPath = Join-Path $evidenceAbsolute "05_CURRENT_ENVIRONMENT_R3.json"
$canonicalEnvironmentManifestPath = Join-Path $evidenceAbsolute "03_ENVIRONMENT_MANIFEST_R3.json"
$environmentManifest = [ordered]@{
  schema_version = "real-estimates-global-green-r3.environment.v1"
  generated_at_utc = $generatedAt
  master_contract_sha256 = $MasterSha256
  machine = [ordered]@{
    computer_name = $env:COMPUTERNAME
    os = Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber
    free_gib = [Math]::Round($drive.Free / 1GB, 3)
  }
  tools = [ordered]@{
    node = Get-CommandVersion "node" @("--version")
    npm = Get-CommandVersion "npm" @("--version")
    java = Get-CommandVersion "java" @("-version")
    adb = Get-CommandVersion "adb" @("version")
    docker = Get-CommandVersion "docker" @("version", "--format", "{{.Client.Version}}")
  }
  environment = $environment
  process_gate = [ordered]@{
    active_gradle = $activeGradle.Count
    active_jest = $activeJest.Count
    active_android_harness = $activeAndroid.Count
    single_flight_green = ($activeGradle.Count -eq 0 -and $activeJest.Count -eq 0 -and $activeAndroid.Count -eq 0)
  }
  relevant_processes = $processes
}
Write-Json $environmentManifestPath $environmentManifest
Write-Json $canonicalEnvironmentManifestPath $environmentManifest

$sourceIdentityPath = Join-Path $evidenceAbsolute "01_CURRENT_SOURCE_IDENTITY_R3.json"
$sourceIdentity = [ordered]@{
  schema_version = "real-estimates-global-green-r3.current-source-identity.v1"
  generated_at_utc = $generatedAt
  master_contract = [ordered]@{
    path = $MasterPath.Replace("\", "/")
    sha256 = $MasterSha256
    bytes = 103465
    lines = 2586
    read_completely = $true
    supersedes_r2_sha256 = $PredecessorSha256
  }
  supplemental_contracts = @([ordered]@{
    role = "SAFE_GENERATED_CLEANUP_AUTHORIZATION"
    path = $GeneratedCleanupAddendumPath.Replace("\", "/")
    sha256 = $GeneratedCleanupAddendumSha256
    bytes = 19432
    lines = 513
    read_completely = $true
  })
  git = [ordered]@{
    worktree = $repoRoot.Replace("\", "/")
    branch = Invoke-GitLines @("branch", "--show-current") | Select-Object -First 1
    head = Invoke-GitLines @("rev-parse", "HEAD") | Select-Object -First 1
    tree = Invoke-GitLines @("rev-parse", "HEAD^{tree}") | Select-Object -First 1
    dirty_worktree_preserved = $true
    tracked_change_count = @($statusLines | Where-Object { $_ -match '^[12u] ' }).Count
    untracked_file_count = @($statusLines | Where-Object { $_ -match '^\? ' }).Count
    sorted_status_sha256 = $sortedStatusSha
  }
  hashes = [ordered]@{
    product_source_sha256 = $productAggregate.sha256
    harness_source_sha256 = $harnessAggregate.sha256
    audit_tools_sha256 = $auditAggregate.sha256
    sql_migrations_sha256 = $sqlAggregate.sha256
    lockfile_sha256 = $lockAggregate.sha256
  }
  artifacts = [ordered]@{
    product_manifest = [ordered]@{ path = "02_CURRENT_PRODUCT_SOURCE_MANIFEST_R3.json"; sha256 = Get-Sha256 $productManifestPath }
    canonical_product_manifest = [ordered]@{ path = "02_PRODUCT_SOURCE_MANIFEST_R3.json"; sha256 = Get-Sha256 $canonicalProductManifestPath }
    tracked_diff = [ordered]@{ path = "03_CURRENT_TRACKED_DIFF_R3.patch"; sha256 = $trackedDiffSha }
    untracked_manifest = [ordered]@{ path = "04_CURRENT_UNTRACKED_MANIFEST_R3.json"; sha256 = Get-Sha256 $untrackedManifestPath }
    environment = [ordered]@{ path = "05_CURRENT_ENVIRONMENT_R3.json"; sha256 = Get-Sha256 $environmentManifestPath }
    canonical_environment = [ordered]@{ path = "03_ENVIRONMENT_MANIFEST_R3.json"; sha256 = Get-Sha256 $canonicalEnvironmentManifestPath }
  }
  historical_android_footer_proof = [ordered]@{
    status = "HISTORICAL_UI_EVIDENCE_SOURCE_DRIFT"
    product_source_sha256 = "eb67a1c81eca262899b31059c3da57e44144e849b9f90db786380b38e3d40576"
    apk_sha256 = "6ecc06663d6188ba43edf08c811e739e1b376f381a8d55460f18bbbec772284b"
    bundle_sha256 = "782f764ee45b61617636c80da44c226503428a46d8ece5952706df8ac327c74a"
    accepted_as_current_runtime_proof = $false
  }
  single_flight_green = $environmentManifest.process_gate.single_flight_green
  source_drift_at_capture = 0
  status = if ($environmentManifest.process_gate.single_flight_green -and $missingPaths.Count -eq 0) {
    "R3_SOURCE_IDENTITY_GREEN"
  } else { "R3_SOURCE_IDENTITY_RED" }
  restrictions = @("NO_MERGE", "NO_PUSH", "NO_DEPLOY", "NO_OTA", "NO_RELEASE", "NO_BATCH009", "NO_FULL_JEST", "NO_STORAGE_OR_DATA_DELETE_OUTSIDE_SAFE_GENERATED_ADDENDUM")
  dead_source_policy = [ordered]@{
    proven_dead_source_delete_authorization = "GRANTED"
    additional_user_approval_required = $false
    delete_in_same_bounded_change = $true
  }
  generated_cleanup_policy = [ordered]@{
    safe_generated_cleanup_authorization = "GRANTED"
    repeat_user_approval_for_eligible_paths = $false
    delete_only_if_platform_impact = "PROVEN_ZERO"
    delete_only_if_recovery = "PROVEN"
    source_or_data_deletion = "FORBIDDEN"
  }
  tool = [ordered]@{
    path = (Normalize-RepoPath $MyInvocation.MyCommand.Path.Substring($repoRoot.Length).TrimStart("\"))
    sha256 = Get-Sha256 $MyInvocation.MyCommand.Path
  }
}
Write-Json $sourceIdentityPath $sourceIdentity

$executionState = [ordered]@{
  schema_version = "real-estimates-global-green-r3.execution-state.v1"
  generated_at_utc = $generatedAt
  master_contract_sha256 = $MasterSha256
  generated_cleanup_addendum_sha256 = $GeneratedCleanupAddendumSha256
  current_phase = "R3_0_CURRENT_RESEAL_OWNERSHIP_PENDING"
  source_identity = [ordered]@{ path = "01_CURRENT_SOURCE_IDENTITY_R3.json"; sha256 = Get-Sha256 $sourceIdentityPath; status = $sourceIdentity.status }
  architecture = "REVALIDATION_PENDING"
  human_acceptance_platform = "CHECKPOINT_REVALIDATION_PENDING"
  engineer_accepted = "0_OF_71_KNOWN_DRAFTS"
  cleanup = "SAFE_GENERATED_CLEANUP_AUTHORIZED_MANIFEST_PENDING"
  proven_dead_source_delete_authorization = "GRANTED"
  global = "GLOBAL_RED"
  production_ready = $false
  release_performed = $false
  deploy_performed = $false
  ota_performed = $false
  merge_performed = $false
  push_performed = $false
  batch009_performed = $false
  full_jest_performed = $false
  deletion_performed = $false
  terminal_wording = @("R3_IN_PROGRESS", "GLOBAL_RED", "NOT_PRODUCTION_READY", "NO_RELEASE")
}
Write-Json (Join-Path $evidenceAbsolute "00_EXECUTION_STATE_R3.json") $executionState

[ordered]@{
  status = $sourceIdentity.status
  evidence_root = $evidenceAbsolute
  source_identity_sha256 = Get-Sha256 $sourceIdentityPath
  product_source_sha256 = $productAggregate.sha256
  harness_source_sha256 = $harnessAggregate.sha256
  audit_tools_sha256 = $auditAggregate.sha256
  sql_migrations_sha256 = $sqlAggregate.sha256
  lockfile_sha256 = $lockAggregate.sha256
  product_files = $product.Count
  missing_paths = $missingPaths.Count
  single_flight_green = $sourceIdentity.single_flight_green
} | ConvertTo-Json -Depth 10
