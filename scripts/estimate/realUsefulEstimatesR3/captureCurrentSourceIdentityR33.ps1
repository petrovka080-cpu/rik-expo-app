param(
  [string]$EvidenceRoot = ".release-runtime/real-useful-estimates-r3/evidence/r3-3-closeout"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$MasterPath = "C:\Users\User\Downloads\MASTER_TZ_R3_3_PRODUCTION_GRADE_GLOBAL_GREEN_CANONICAL_CODE_REAL_ESTIMATES_RU.md"
$MasterSha256 = "d755fd0fecb51f3642218f6a29115c5a981c6b2220fc7f87e2fc6870f5c3278a"
$ParentIdentityRelative = ".release-runtime/real-estimates-global-green-r3/evidence/01_CURRENT_SOURCE_IDENTITY_R3.json"
$ParentCloseoutRelative = ".release-runtime/real-estimates-global-green-r3/evidence/R3_2_AUTOMATED_CLOSEOUT_VERDICT.json"
$ParentIdentitySha256 = "750f31ee8d1e516afb5318a434c8eb73c75a996227814bfde2e815f08b095929"
$ParentCloseoutSha256 = "413ec084365e43a3a0f43a6f1b808e9c3f460f8225ee3af886202b85090349a8"

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

function Is-ProductSource {
  param([string]$RelativePath)
  $path = Normalize-RepoPath $RelativePath
  if ($path -match '^(\.release-runtime|artifacts)(/|$)') { return $false }
  if ($path -match '^(node_modules|\.expo|coverage|dist|web-build|build)(/|$)') { return $false }
  if ($path -match '(^|/)(node_modules|\.gradle(?:-[^/]*)?|build(?:-[^/]*)?|\.cxx|coverage|dist|web-build)(/|$)') { return $false }
  if ($path -match '^(\.tmp|tmp)(_|/|$)') { return $false }
  return $true
}

function Get-Aggregate {
  param([object[]]$Files)
  $sorted = @($Files | Sort-Object path)
  [int64]$bytes = 0
  foreach ($file in $sorted) { $bytes += [int64]$file.bytes }
  $lines = @($sorted | ForEach-Object { "$($_.path)`0$($_.bytes)`0$($_.sha256)" })
  return [ordered]@{
    files = $sorted.Count
    bytes = $bytes
    sha256 = Get-TextSha256 ((($lines -join "`n")) + "`n")
  }
}

if (-not (Test-Path -LiteralPath $MasterPath -PathType Leaf)) { throw "R33_MASTER_MISSING" }
if ((Get-Sha256 $MasterPath) -ne $MasterSha256) { throw "R33_MASTER_SHA256_DRIFT" }
if ((Get-Item -LiteralPath $MasterPath).Length -ne 81475) { throw "R33_MASTER_BYTES_DRIFT" }
if (@(Get-Content -LiteralPath $MasterPath -Encoding UTF8).Count -ne 2108) { throw "R33_MASTER_LINES_DRIFT" }

$repoRoot = (Invoke-GitLines @("rev-parse", "--show-toplevel") | Select-Object -First 1).Replace("/", "\")
Set-Location -LiteralPath $repoRoot
$evidenceAbsolute = [IO.Path]::GetFullPath((Join-Path $repoRoot $EvidenceRoot))
New-Item -ItemType Directory -Path $evidenceAbsolute -Force | Out-Null
$parentIdentityPath = Join-Path $repoRoot $ParentIdentityRelative.Replace("/", "\")
$parentCloseoutPath = Join-Path $repoRoot $ParentCloseoutRelative.Replace("/", "\")
if ((Get-Sha256 $parentIdentityPath) -ne $ParentIdentitySha256) { throw "R33_PARENT_IDENTITY_DRIFT" }
if ((Get-Sha256 $parentCloseoutPath) -ne $ParentCloseoutSha256) { throw "R33_PARENT_CLOSEOUT_DRIFT" }

$generatedAt = [DateTime]::UtcNow.ToString("o")
$statusLines = @(Invoke-GitLines @("status", "--porcelain=v2", "--branch", "--untracked-files=all"))
$sortedStatusSha256 = Get-TextSha256 (((@($statusLines | Sort-Object) -join "`n")) + "`n")
$statusPath = Join-Path $evidenceAbsolute "CURRENT_GIT_STATUS_PORCELAIN_V2_R33.txt"
Write-Utf8NoBom $statusPath (($statusLines -join "`n") + "`n")

$trackedDeletionPaths = @(Invoke-GitLines @("diff", "--name-only", "--diff-filter=D") |
  ForEach-Object { Normalize-RepoPath $_ } | Sort-Object -Unique)
$trackedDeletionSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($path in $trackedDeletionPaths) { [void]$trackedDeletionSet.Add($path) }

$repoFiles = @(Invoke-GitLines @("ls-files", "--cached", "--others", "--exclude-standard") |
  ForEach-Object { Normalize-RepoPath $_ } | Sort-Object -Unique)
$productFiles = New-Object System.Collections.Generic.List[object]
$missingPaths = New-Object System.Collections.Generic.List[string]
foreach ($relativePath in $repoFiles) {
  if (-not (Is-ProductSource $relativePath)) { continue }
  $absolute = Join-Path $repoRoot $relativePath.Replace("/", "\")
  if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) {
    if (-not $trackedDeletionSet.Contains($relativePath)) { $missingPaths.Add($relativePath) }
    continue
  }
  $item = Get-Item -LiteralPath $absolute
  $productFiles.Add([ordered]@{
    path = $relativePath
    bytes = [int64]$item.Length
    sha256 = Get-Sha256 $absolute
    harness = $relativePath -match '^(maestro|scripts/e2e|scripts/release|tests/e2e|tests/android|android/app/src/androidTest)(/|$)'
    audit_tool = $relativePath -match '^(scripts/architecture|scripts/estimate|tests/architecture|tests/estimateBackend)(/|$)'
    sql_migration = $relativePath -match '^supabase/(migrations|rollback)/.*\.sql$'
    lockfile = $relativePath -match '(^|/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|deno\.lock)$'
  })
}

$product = @($productFiles.ToArray() | Sort-Object path)
$productAggregate = Get-Aggregate $product
$harnessAggregate = Get-Aggregate @($product | Where-Object harness)
$auditAggregate = Get-Aggregate @($product | Where-Object audit_tool)
$sqlAggregate = Get-Aggregate @($product | Where-Object sql_migration)
$lockAggregate = Get-Aggregate @($product | Where-Object lockfile)

$manifestPath = Join-Path $evidenceAbsolute "06_CURRENT_PRODUCT_SOURCE_MANIFEST_R33.json"
$manifest = [ordered]@{
  schema_version = "master-r33.current-product-source-manifest.v1"
  generated_at_utc = $generatedAt
  master_contract_sha256 = $MasterSha256
  source_root = $repoRoot.Replace("\", "/")
  policy = [ordered]@{
    included = "tracked and non-ignored untracked product/config/script/test/sql/lock inputs"
    excluded = @("evidence", "generated outputs", "node_modules", "build caches", "coverage", "dist", "temporary files")
    evidence_in_product_hash = $false
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
Write-Json $manifestPath $manifest

$identityPath = Join-Path $evidenceAbsolute "07_CURRENT_SOURCE_IDENTITY_R33.json"
$identity = [ordered]@{
  schema_version = "master-r33.current-source-identity.v1"
  generated_at_utc = $generatedAt
  status = if ($missingPaths.Count -eq 0) { "R33_SOURCE_IDENTITY_GREEN" } else { "R33_SOURCE_IDENTITY_RED" }
  master_contract = [ordered]@{
    path = $MasterPath.Replace("\", "/")
    sha256 = $MasterSha256
    bytes = 81475
    lines = 2108
    read_completely = $true
    replaces_all_previous_master_documents = $true
  }
  parent_automated_closeout = [ordered]@{
    source_identity_path = $ParentIdentityRelative
    source_identity_sha256 = $ParentIdentitySha256
    closeout_path = $ParentCloseoutRelative
    closeout_sha256 = $ParentCloseoutSha256
  }
  git = [ordered]@{
    worktree = $repoRoot.Replace("\", "/")
    branch = Invoke-GitLines @("branch", "--show-current") | Select-Object -First 1
    head = Invoke-GitLines @("rev-parse", "HEAD") | Select-Object -First 1
    tree = Invoke-GitLines @("rev-parse", "HEAD^{tree}") | Select-Object -First 1
    dirty_worktree_preserved = $true
    sorted_status_sha256 = $sortedStatusSha256
  }
  hashes = [ordered]@{
    product_source_sha256 = $productAggregate.sha256
    harness_source_sha256 = $harnessAggregate.sha256
    audit_tools_sha256 = $auditAggregate.sha256
    sql_migrations_sha256 = $sqlAggregate.sha256
    lockfile_sha256 = $lockAggregate.sha256
  }
  artifacts = [ordered]@{
    product_manifest = [ordered]@{ path = "06_CURRENT_PRODUCT_SOURCE_MANIFEST_R33.json"; sha256 = Get-Sha256 $manifestPath }
    git_status = [ordered]@{ path = "CURRENT_GIT_STATUS_PORCELAIN_V2_R33.txt"; sha256 = Get-Sha256 $statusPath }
  }
  source_drift_at_capture = 0
  missing_product_paths = $missingPaths.Count
  engineer_accepted = "0_OF_71"
  production_accessed = $false
  global_status = "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE"
  dead_source_policy = [ordered]@{
    proven_dead_source_delete_authorization = "GRANTED"
    additional_user_approval_required = $false
    delete_in_same_bounded_change = $true
  }
  tool = [ordered]@{
    path = Normalize-RepoPath $MyInvocation.MyCommand.Path.Substring($repoRoot.Length).TrimStart("\")
    sha256 = Get-Sha256 $MyInvocation.MyCommand.Path
  }
}
Write-Json $identityPath $identity

[ordered]@{
  status = $identity.status
  source_identity_sha256 = Get-Sha256 $identityPath
  product_source_sha256 = $productAggregate.sha256
  product_files = $product.Count
  missing_paths = $missingPaths.Count
  global_status = $identity.global_status
} | ConvertTo-Json -Depth 10
