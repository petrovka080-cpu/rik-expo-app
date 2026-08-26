param(
  [string]$EvidenceRoot = ".release-runtime/real-useful-estimates-r2/evidence"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Utf8NoBom {
  param([string]$Path, [string]$Content)
  $parent = Split-Path -Parent $Path
  if ($parent) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Write-Json {
  param([string]$Path, [object]$Value)
  Write-Utf8NoBom -Path $Path -Content (($Value | ConvertTo-Json -Depth 100) + "`n")
}

function Get-Sha256 {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-TextSha256 {
  param([string]$Text)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Invoke-GitLines {
  param([string[]]$Arguments)
  $lines = @(& git -c core.quotepath=false @Arguments)
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
  return $lines
}

function Normalize-RepoPath {
  param([string]$Path)
  return $Path.Replace("\", "/").TrimStart("./")
}

function Get-SourceClassification {
  param([string]$RelativePath)
  $path = Normalize-RepoPath $RelativePath
  if ($path -match '^(\.release-runtime|artifacts)(/|$)') { return "EVIDENCE" }
  if ($path -match '^(node_modules|\.expo|coverage|dist|web-build)(/|$)') { return "REBUILDABLE_GENERATED" }
  if ($path -match '(^|/)(node_modules|\.gradle(?:-[^/]*)?|build(?:-[^/]*)?|\.cxx|coverage|dist|web-build)(/|$)') { return "REBUILDABLE_GENERATED" }
  if ($path -match '(^|/)(\.DS_Store|Thumbs\.db)$') { return "REBUILDABLE_GENERATED" }
  if ($path -match '^(\.tmp|tmp)(_|/|$)') { return "TEMPORARY_UNCLASSIFIED" }
  return "PRODUCT_SOURCE"
}

function Get-CommandVersion {
  param([string]$Command, [string[]]$Arguments)
  try {
    $value = @(& $Command @Arguments 2>&1) -join "`n"
    return [ordered]@{ available = $true; exit_code = $LASTEXITCODE; output = $value.Trim() }
  } catch {
    return [ordered]@{ available = $false; exit_code = $null; output = $_.Exception.Message }
  }
}

$repoRoot = (Invoke-GitLines @("rev-parse", "--show-toplevel") | Select-Object -First 1).Replace("/", "\")
Set-Location -LiteralPath $repoRoot
$evidenceAbsolute = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $EvidenceRoot))
New-Item -ItemType Directory -Path $evidenceAbsolute -Force | Out-Null

$generatedAt = [DateTime]::UtcNow.ToString("o")
$masterPath = "C:\Users\User\Downloads\MASTER_TZ_PRODUCTION_GRADE_CANONICAL_CODE_GREEN_REAL_ESTIMATES_SAFE_CLEANUP_R2_RU.md"
$masterSha = Get-Sha256 $masterPath
$masterItem = Get-Item -LiteralPath $masterPath
$masterLineCount = @(Get-Content -LiteralPath $masterPath -Encoding UTF8).Count
$scriptPath = $MyInvocation.MyCommand.Path
$scriptSha = Get-Sha256 $scriptPath

$patchPath = Join-Path $evidenceAbsolute "TRACKED_DIFF.patch"
& git --no-pager diff --binary --no-ext-diff "--output=$patchPath"
if ($LASTEXITCODE -ne 0) { throw "git diff failed with exit code $LASTEXITCODE" }
$patchSha = Get-Sha256 $patchPath
Write-Utf8NoBom -Path (Join-Path $evidenceAbsolute "TRACKED_DIFF.sha256") -Content "$patchSha  TRACKED_DIFF.patch`n"

$statusLines = @(Invoke-GitLines @("status", "--porcelain=v2", "--branch", "--untracked-files=all"))
Write-Utf8NoBom -Path (Join-Path $evidenceAbsolute "GIT_STATUS_PORCELAIN_V2.txt") -Content (($statusLines -join "`n") + "`n")
$sortedStatusSha = Get-TextSha256 ((@($statusLines | Sort-Object) -join "`n") + "`n")

$allRepoFiles = @(Invoke-GitLines @("ls-files", "--cached", "--others", "--exclude-standard") | ForEach-Object { Normalize-RepoPath $_ } | Sort-Object -Unique)
$productFiles = New-Object System.Collections.Generic.List[object]
$missingProductPaths = New-Object System.Collections.Generic.List[string]
foreach ($relativePath in $allRepoFiles) {
  if ((Get-SourceClassification $relativePath) -ne "PRODUCT_SOURCE") { continue }
  $absolutePath = Join-Path $repoRoot ($relativePath.Replace("/", "\"))
  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    $missingProductPaths.Add($relativePath)
    continue
  }
  $item = Get-Item -LiteralPath $absolutePath
  $productFiles.Add([ordered]@{
    path = $relativePath
    bytes = [int64]$item.Length
    sha256 = Get-Sha256 $absolutePath
  })
}
$productAggregateInput = (($productFiles.ToArray() | ForEach-Object { "$($_.path)`0$($_.bytes)`0$($_.sha256)" }) -join "`n") + "`n"
$productAggregateSha = Get-TextSha256 $productAggregateInput
$productTotalBytes = [int64]0
foreach ($productFile in $productFiles) { $productTotalBytes += [int64]$productFile["bytes"] }
$productManifestPath = Join-Path $evidenceAbsolute "02_PRODUCT_SOURCE_MANIFEST.json"
$productManifest = [ordered]@{
  schema_version = "real-useful-estimates-r2.product-source-manifest.v1"
  generated_at_utc = $generatedAt
  source_root = $repoRoot.Replace("\", "/")
  selection = [ordered]@{
    policy = "CONSERVATIVE_REPO_REACHABILITY"
    included = @("tracked and non-ignored untracked source/config/scripts/tests/supabase/app/android source inputs", "root app/build/package/lock configuration")
    excluded = @("node_modules", "build output", "Gradle caches", "evidence", "coverage", "dist", "temporary files")
  }
  file_count = $productFiles.Count
  total_bytes = $productTotalBytes
  aggregate_sha256 = $productAggregateSha
  missing_paths = $missingProductPaths.ToArray()
  files = $productFiles.ToArray()
  master_contract_sha256 = $masterSha
  tool = [ordered]@{ path = (Normalize-RepoPath $scriptPath.Substring($repoRoot.Length).TrimStart("\")); sha256 = $scriptSha }
}
Write-Json -Path $productManifestPath -Value $productManifest
$productManifestFileSha = Get-Sha256 $productManifestPath
Write-Utf8NoBom -Path (Join-Path $evidenceAbsolute "02_PRODUCT_SOURCE_MANIFEST.sha256") -Content "$productManifestFileSha  02_PRODUCT_SOURCE_MANIFEST.json`n"
Write-Utf8NoBom -Path (Join-Path $evidenceAbsolute "PRODUCT_SOURCE_MANIFEST.sha256") -Content "$productManifestFileSha  02_PRODUCT_SOURCE_MANIFEST.json`n"

$untrackedPaths = @(Invoke-GitLines @("ls-files", "--others", "--exclude-standard") | ForEach-Object { Normalize-RepoPath $_ } | Sort-Object -Unique)
$untrackedFiles = New-Object System.Collections.Generic.List[object]
foreach ($relativePath in $untrackedPaths) {
  $absolutePath = Join-Path $repoRoot ($relativePath.Replace("/", "\"))
  $classification = Get-SourceClassification $relativePath
  $exists = Test-Path -LiteralPath $absolutePath -PathType Leaf
  $item = if ($exists) { Get-Item -LiteralPath $absolutePath } else { $null }
  $untrackedFiles.Add([ordered]@{
    path = $relativePath
    classification = $classification
    exists = $exists
    bytes = if ($item) { [int64]$item.Length } else { $null }
    last_write_time_utc = if ($item) { $item.LastWriteTimeUtc.ToString("o") } else { $null }
    sha256 = if ($exists -and $classification -eq "PRODUCT_SOURCE") { Get-Sha256 $absolutePath } else { $null }
  })
}
$untrackedProduct = @($untrackedFiles.ToArray() | Where-Object { $_.classification -eq "PRODUCT_SOURCE" })
$untrackedProductAggregate = Get-TextSha256 (((@($untrackedProduct | ForEach-Object { "$($_.path)`0$($_.bytes)`0$($_.sha256)" }) -join "`n")) + "`n")
$untrackedManifestPath = Join-Path $evidenceAbsolute "UNTRACKED_MANIFEST.json"
$untrackedManifest = [ordered]@{
  schema_version = "real-useful-estimates-r2.untracked-manifest.v1"
  generated_at_utc = $generatedAt
  all_untracked_count = $untrackedFiles.Count
  product_untracked_count = $untrackedProduct.Count
  product_untracked_aggregate_sha256 = $untrackedProductAggregate
  classification_counts = [ordered]@{
    product_source = @($untrackedFiles.ToArray() | Where-Object { $_.classification -eq "PRODUCT_SOURCE" }).Count
    rebuildable_generated = @($untrackedFiles.ToArray() | Where-Object { $_.classification -eq "REBUILDABLE_GENERATED" }).Count
    evidence = @($untrackedFiles.ToArray() | Where-Object { $_.classification -eq "EVIDENCE" }).Count
    temporary_unclassified = @($untrackedFiles.ToArray() | Where-Object { $_.classification -eq "TEMPORARY_UNCLASSIFIED" }).Count
  }
  files = $untrackedFiles.ToArray()
  master_contract_sha256 = $masterSha
  tool_sha256 = $scriptSha
}
Write-Json -Path $untrackedManifestPath -Value $untrackedManifest
$untrackedManifestSha = Get-Sha256 $untrackedManifestPath

$currentPid = $PID
$relevantProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $currentPid -and (
    $_.Name -match '^(node|java|adb|emulator|qemu-system-x86_64|docker|com\.docker\.backend|gradle).*' -or
    $_.CommandLine -match 'jest|gradlew|GradleMain|uiautomator|canonical-estimate|realUsefulEstimates'
  )
} | Select-Object ProcessId, ParentProcessId, Name, CommandLine)
$activeGradleTasks = @($relevantProcesses | Where-Object { $_.CommandLine -match '(gradlew(?:\.bat)?|org\.gradle\.launcher\.GradleMain|:app:assemble|:app:bundle)' })
$activeJest = @($relevantProcesses | Where-Object { $_.CommandLine -match '(^|[\\/\s])jest(?:\.js)?([\s]|$)' })
$activeAndroidHarness = @($relevantProcesses | Where-Object { $_.CommandLine -match '(uiautomator|scripts[\\/]e2e[\\/].*Android.*(?:run|matrix))' })
$activeBackendServers = @($relevantProcesses | Where-Object { $_.CommandLine -match '(serveCanonicalEstimateLocalR1|serveBatch002R4LocalSupabaseStub)' })

$envNames = @(
  "NODE_ENV",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL",
  "EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK",
  "SENTRY_DISABLE_AUTO_UPLOAD",
  "EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH",
  "EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH"
)
$environmentVariables = [ordered]@{}
foreach ($name in $envNames) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ($name -eq "EXPO_PUBLIC_SUPABASE_ANON_KEY") {
    $environmentVariables[$name] = [ordered]@{
      present = -not [string]::IsNullOrWhiteSpace($value)
      length = if ($null -eq $value) { 0 } else { $value.Length }
      salted_sha256 = if ([string]::IsNullOrWhiteSpace($value)) { $null } else { Get-TextSha256 "$masterSha`:$value" }
      value_logged = $false
    }
  } else {
    $environmentVariables[$name] = [ordered]@{
      present = -not [string]::IsNullOrWhiteSpace($value)
      value = if ([string]::IsNullOrWhiteSpace($value)) { $null } else { $value }
    }
  }
}

$listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 5037, 8173, 8767, 55437 } | Select-Object LocalAddress, LocalPort, OwningProcess | Sort-Object LocalPort)
$environmentManifestPath = Join-Path $evidenceAbsolute "03_ENVIRONMENT_MANIFEST.json"
$environmentManifest = [ordered]@{
  schema_version = "real-useful-estimates-r2.environment-manifest.v1"
  generated_at_utc = $generatedAt
  machine = [ordered]@{
    computer_name = $env:COMPUTERNAME
    os = (Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber)
    logical_memory_bytes = [int64](Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
  }
  tools = [ordered]@{
    node = Get-CommandVersion "node" @("--version")
    npm = Get-CommandVersion "npm" @("--version")
    java = Get-CommandVersion "java" @("-version")
    adb = Get-CommandVersion "adb" @("version")
    docker = Get-CommandVersion "docker" @("version", "--format", "{{.Client.Version}}")
  }
  environment = $environmentVariables
  process_gate = [ordered]@{
    active_gradle_task_count = $activeGradleTasks.Count
    active_jest_count = $activeJest.Count
    active_android_harness_count = $activeAndroidHarness.Count
    expected_backend_server_process_count = $activeBackendServers.Count
    ide_gradle_daemon_is_not_counted_as_active_build = $true
    single_flight_green = ($activeGradleTasks.Count -eq 0 -and $activeJest.Count -eq 0 -and $activeAndroidHarness.Count -eq 0)
  }
  relevant_processes = $relevantProcesses
  listeners = $listeners
  master_contract_sha256 = $masterSha
  product_source_aggregate_sha256 = $productAggregateSha
  tool_sha256 = $scriptSha
}
Write-Json -Path $environmentManifestPath -Value $environmentManifest
$environmentManifestSha = Get-Sha256 $environmentManifestPath

$buildCommandPath = Join-Path $evidenceAbsolute "BUILD_COMMAND.txt"
Write-Utf8NoBom -Path $buildCommandPath -Content @"
PHASE0_NO_BUILD_EXECUTED
Heavy Android proof is not allowed while free space is below 60 GiB.
Historical accepted UI APK build command: android\gradlew.bat :app:assembleWaterProof --rerun-tasks --no-build-cache --console=plain
Any future build requires a fresh ANDROID_BUILD_ENVIRONMENT_MANIFEST.json bound to the then-current product source SHA.
"@

$head = Invoke-GitLines @("rev-parse", "HEAD") | Select-Object -First 1
$tree = Invoke-GitLines @("rev-parse", "HEAD^{tree}") | Select-Object -First 1
$branch = Invoke-GitLines @("branch", "--show-current") | Select-Object -First 1
$trackedChangeCount = @($statusLines | Where-Object { $_ -match '^[12u] ' }).Count
$untrackedStatusCount = @($statusLines | Where-Object { $_ -match '^\? ' }).Count

$sourceIdentityPath = Join-Path $evidenceAbsolute "01_SOURCE_IDENTITY.json"
$sourceIdentity = [ordered]@{
  schema_version = "real-useful-estimates-r2.source-identity.v1"
  generated_at_utc = $generatedAt
  phase = "PHASE_0_FREEZE"
  master_contract = [ordered]@{
    path = $masterPath.Replace("\", "/")
    sha256 = $masterSha
    bytes = [int64]$masterItem.Length
    lines = $masterLineCount
    read_completely = $true
    supersedes_r1 = $true
  }
  git = [ordered]@{
    worktree = $repoRoot.Replace("\", "/")
    common_dir = (Invoke-GitLines @("rev-parse", "--git-common-dir") | Select-Object -First 1)
    branch = $branch
    head = $head
    tree = $tree
    dirty_worktree_preserved = $true
    tracked_change_count = $trackedChangeCount
    untracked_status_file_count = $untrackedStatusCount
    sorted_porcelain_status_sha256 = $sortedStatusSha
  }
  source_seal = [ordered]@{
    tracked_diff = [ordered]@{ path = "TRACKED_DIFF.patch"; sha256 = $patchSha; bytes = [int64](Get-Item $patchPath).Length }
    untracked_manifest = [ordered]@{ path = "UNTRACKED_MANIFEST.json"; sha256 = $untrackedManifestSha; product_aggregate_sha256 = $untrackedProductAggregate }
    product_source_manifest = [ordered]@{ path = "02_PRODUCT_SOURCE_MANIFEST.json"; sha256 = $productManifestFileSha; aggregate_sha256 = $productAggregateSha; files = $productFiles.Count }
    environment_manifest = [ordered]@{ path = "03_ENVIRONMENT_MANIFEST.json"; sha256 = $environmentManifestSha }
    build_command = [ordered]@{ path = "BUILD_COMMAND.txt"; sha256 = Get-Sha256 $buildCommandPath; executed = $false }
  }
  preserved_historical_ui_runtime = [ordered]@{
    state = "UI_RUNTIME_HISTORICAL_SOURCE_DRIFT_REBUILD_REQUIRED"
    apk_sha256 = "6ecc06663d6188ba43edf08c811e739e1b376f381a8d55460f18bbbec772284b"
    bundle_sha256 = "782f764ee45b61617636c80da44c226503428a46d8ece5952706df8ac327c74a"
    historical_product_source_sha256 = "eb67a1c81eca262899b31059c3da57e44144e849b9f90db786380b38e3d40576"
    current_product_source_sha256 = $productAggregateSha
    evidence = ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/ui-bottom-actions-android-api34-r1/UI_BOTTOM_ACTIONS_ANDROID_API34_R1.json"
    accepted_as_current_source_proof = $false
  }
  restrictions = @("NO_MERGE", "NO_PUSH", "NO_DEPLOY", "NO_OTA", "NO_RELEASE", "NO_BATCH009", "NO_FULL_JEST", "NO_IRREVERSIBLE_CLEANUP_WITHOUT_APPROVAL")
  status = "SOURCE_IDENTITY_CAPTURED_RUNTIME_NOT_FROZEN_GLOBAL_RED"
  tool = [ordered]@{ path = (Normalize-RepoPath $scriptPath.Substring($repoRoot.Length).TrimStart("\")); sha256 = $scriptSha }
}
Write-Json -Path $sourceIdentityPath -Value $sourceIdentity
$sourceIdentitySha = Get-Sha256 $sourceIdentityPath

$executionState = [ordered]@{
  schema_version = "real-useful-estimates-r2.execution-state.v1"
  generated_at_utc = $generatedAt
  master_contract = $sourceIdentity.master_contract
  source_identity = [ordered]@{ path = "01_SOURCE_IDENTITY.json"; sha256 = $sourceIdentitySha }
  current_phase = "PHASE_0_SOURCE_CAPTURED_DISK_INVENTORY_PENDING"
  source_identity_gate = "CAPTURED_NOT_RUNTIME_FROZEN"
  disk_gate = "PENDING"
  free_space_gate = "PENDING_DISK_MANIFEST"
  public_ui = "RED_REQUIRES_R2_ROUTE_CONTRACT_AND_NEW_SOURCE_PROOF"
  canonical_architecture = "RED_OWNERSHIP_INVENTORY_PENDING"
  content = "RED_ENGINEER_ACCEPTANCE_INCOMPLETE"
  functional = "RED_R2_END_TO_END_NOT_PROVEN"
  web = "RED_80_OF_80_NOT_PROVEN_ON_R2_SOURCE"
  android = "RED_50_OF_50_NOT_PROVEN_ON_R2_SOURCE"
  safe_cleanup = "RED_INVENTORY_PENDING_NO_DELETE_AUTHORIZATION"
  global = "RED"
  terminal_wording = @("R2_IN_PROGRESS", "GLOBAL_RED", "NOT_PRODUCTION_READY")
  release_performed = $false
  deploy_performed = $false
  ota_performed = $false
  merge_performed = $false
  push_performed = $false
  batch009_performed = $false
  full_jest_performed = $false
}
Write-Json -Path (Join-Path $evidenceAbsolute "00_EXECUTION_STATE.json") -Value $executionState

[ordered]@{
  evidence_root = $evidenceAbsolute
  master_sha256 = $masterSha
  head = $head
  tree = $tree
  tracked_changes = $trackedChangeCount
  untracked_files = $untrackedStatusCount
  product_files = $productFiles.Count
  product_source_aggregate_sha256 = $productAggregateSha
  source_identity_sha256 = $sourceIdentitySha
  single_flight_green = $environmentManifest.process_gate.single_flight_green
  status = $executionState.current_phase
} | ConvertTo-Json -Depth 10
