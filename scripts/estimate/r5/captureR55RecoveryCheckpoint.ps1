param(
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path,
  [string]$ContractPath = 'C:\Users\User\Downloads\MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (7).md',
  [string]$RecoveryRoot = 'C:\dev\rik-expo-app-r5-recovery'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Invoke-GitText {
  param([string[]]$Arguments)
  $result = & git -C $RepositoryRoot @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed"
  }
  return @($result | ForEach-Object { [string]$_ })
}

function Get-Sha256 {
  param([string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

$expectedContractSha256 = '554a9c4d2480c70ce2592a302a04e47f11ed7cc35353fb22fd15396f6fb91f27'
$contractSha256 = Get-Sha256 $ContractPath
if ($contractSha256 -ne $expectedContractSha256) {
  throw "R55_CONTRACT_SHA_MISMATCH:$contractSha256"
}

$timestamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$checkpointRoot = Join-Path $RecoveryRoot "r55-photo-contract-$timestamp"
$untrackedRoot = Join-Path $checkpointRoot 'untracked-preserve-paths'
$verificationRoot = Join-Path $checkpointRoot 'untracked-extracted-forensics'
New-Item -ItemType Directory -Path $untrackedRoot -Force | Out-Null

$head = @(Invoke-GitText @('rev-parse', 'HEAD'))[0]
$tree = @(Invoke-GitText @('rev-parse', 'HEAD^{tree}'))[0]
$branch = @(Invoke-GitText @('branch', '--show-current'))[0]
$untrackedPaths = @(Invoke-GitText @('ls-files', '--others', '--exclude-standard') | Sort-Object)
$trackedChangedPaths = @(Invoke-GitText @('diff', '--name-only', 'HEAD') | Sort-Object)
$deletedTrackedPaths = @(Invoke-GitText @('ls-files', '--deleted') | Sort-Object)

$untrackedFiles = @()
foreach ($relativePath in $untrackedPaths) {
  $normalizedPath = $relativePath.Replace('\', '/')
  $sourcePath = Join-Path $RepositoryRoot $relativePath
  $destinationPath = Join-Path $untrackedRoot ($relativePath.Replace('/', '\'))
  New-Item -ItemType Directory -Path (Split-Path -Parent $destinationPath) -Force | Out-Null
  Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
  $sourceHash = Get-Sha256 $sourcePath
  $copiedHash = Get-Sha256 $destinationPath
  if ($sourceHash -ne $copiedHash) {
    throw "R55_UNTRACKED_COPY_VERIFY_FAILED:$normalizedPath"
  }
  $untrackedFiles += [ordered]@{
    path = $normalizedPath
    bytes = [int64](Get-Item -LiteralPath $sourcePath).Length
    sha256 = $sourceHash
  }
}

$trackedFiles = @()
foreach ($relativePath in $trackedChangedPaths) {
  $normalizedPath = $relativePath.Replace('\', '/')
  $sourcePath = Join-Path $RepositoryRoot $relativePath
  if (Test-Path -LiteralPath $sourcePath -PathType Leaf) {
    $trackedFiles += [ordered]@{
      path = $normalizedPath
      bytes = [int64](Get-Item -LiteralPath $sourcePath).Length
      sha256 = Get-Sha256 $sourcePath
      deleted = $false
    }
  } else {
    $trackedFiles += [ordered]@{
      path = $normalizedPath
      bytes = 0
      sha256 = $null
      deleted = $true
    }
  }
}

$trackedPatchPath = Join-Path $checkpointRoot 'tracked-working-tree.patch'
$indexPatchPath = Join-Path $checkpointRoot 'index.patch'
$trackedPatchArgument = "--output=$trackedPatchPath"
$indexPatchArgument = "--output=$indexPatchPath"
& git -C $RepositoryRoot diff --binary $trackedPatchArgument
if ($LASTEXITCODE -ne 0) { throw 'R55_TRACKED_PATCH_FAILED' }
& git -C $RepositoryRoot diff --cached --binary $indexPatchArgument
if ($LASTEXITCODE -ne 0) { throw 'R55_INDEX_PATCH_FAILED' }

$statusPath = Join-Path $checkpointRoot 'git-status-porcelain-v2.txt'
$statPath = Join-Path $checkpointRoot 'git-diff-stat.txt'
$statusText = (Invoke-GitText @('status', '--porcelain=v2', '--branch', '--untracked-files=all')) -join "`n"
$statText = (Invoke-GitText @('diff', '--stat', 'HEAD')) -join "`n"
[System.IO.File]::WriteAllText($statusPath, $statusText + "`n", [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($statPath, $statText + "`n", [System.Text.UTF8Encoding]::new($false))

$bundlePath = Join-Path $checkpointRoot 'head.bundle'
& git -C $RepositoryRoot bundle create $bundlePath HEAD
if ($LASTEXITCODE -ne 0) { throw 'R55_HEAD_BUNDLE_FAILED' }

$contractCopyPath = Join-Path $checkpointRoot 'MASTER_EXECUTION_TZ_R5.5.md'
Copy-Item -LiteralPath $ContractPath -Destination $contractCopyPath
if ((Get-Sha256 $contractCopyPath) -ne $expectedContractSha256) {
  throw 'R55_CONTRACT_COPY_VERIFY_FAILED'
}

$archivePath = Join-Path $checkpointRoot 'untracked-files-preserve-paths.zip'
if ($untrackedFiles.Count -gt 0) {
  Compress-Archive -Path (Join-Path $untrackedRoot '*') -DestinationPath $archivePath -CompressionLevel Optimal
  Expand-Archive -LiteralPath $archivePath -DestinationPath $verificationRoot
  foreach ($file in $untrackedFiles) {
    $verifiedPath = Join-Path $verificationRoot ($file.path.Replace('/', '\'))
    if (-not (Test-Path -LiteralPath $verifiedPath -PathType Leaf)) {
      throw "R55_UNTRACKED_ARCHIVE_PATH_MISSING:$($file.path)"
    }
    if ((Get-Sha256 $verifiedPath) -ne $file.sha256) {
      throw "R55_UNTRACKED_ARCHIVE_HASH_MISMATCH:$($file.path)"
    }
  }
} else {
  [System.IO.File]::WriteAllBytes($archivePath, [byte[]]@())
}

$canonicalRows = @(
  $trackedFiles | ForEach-Object { "tracked`0$($_.path)`0$($_.sha256)`0$($_.bytes)`0$($_.deleted)" }
  $untrackedFiles | ForEach-Object { "untracked`0$($_.path)`0$($_.sha256)`0$($_.bytes)`0False" }
) | Sort-Object
$canonicalBytes = [System.Text.Encoding]::UTF8.GetBytes(($canonicalRows -join "`n") + "`n")
$hasher = [System.Security.Cryptography.SHA256]::Create()
try {
  $dirtyStateSha256 = ([System.BitConverter]::ToString($hasher.ComputeHash($canonicalBytes))).Replace('-', '').ToLowerInvariant()
} finally {
  $hasher.Dispose()
}

$manifest = [ordered]@{
  schemaVersion = 'real-professional-estimates-r5.5.path-preserving-recovery-checkpoint.v1'
  createdAt = (Get-Date).ToUniversalTime().ToString('o')
  repository = (Resolve-Path -LiteralPath $RepositoryRoot).Path
  branch = $branch
  head = $head
  tree = $tree
  contract = [ordered]@{
    path = (Resolve-Path -LiteralPath $ContractPath).Path
    sha256 = $contractSha256
    copiedPath = 'MASTER_EXECUTION_TZ_R5.5.md'
  }
  dirtyStateSha256 = $dirtyStateSha256
  trackedChangedFileCount = $trackedFiles.Count
  untrackedFileCount = $untrackedFiles.Count
  deletedTrackedPaths = $deletedTrackedPaths
  trackedFiles = $trackedFiles
  untrackedFiles = $untrackedFiles
  artifacts = [ordered]@{
    trackedPatch = [ordered]@{ path = 'tracked-working-tree.patch'; bytes = [int64](Get-Item $trackedPatchPath).Length; sha256 = Get-Sha256 $trackedPatchPath }
    indexPatch = [ordered]@{ path = 'index.patch'; bytes = [int64](Get-Item $indexPatchPath).Length; sha256 = Get-Sha256 $indexPatchPath }
    headBundle = [ordered]@{ path = 'head.bundle'; bytes = [int64](Get-Item $bundlePath).Length; sha256 = Get-Sha256 $bundlePath }
    untrackedArchive = [ordered]@{ path = 'untracked-files-preserve-paths.zip'; bytes = [int64](Get-Item $archivePath).Length; sha256 = Get-Sha256 $archivePath; verifiedEntries = $untrackedFiles.Count }
    status = [ordered]@{ path = 'git-status-porcelain-v2.txt'; sha256 = Get-Sha256 $statusPath }
    diffStat = [ordered]@{ path = 'git-diff-stat.txt'; sha256 = Get-Sha256 $statPath }
  }
  verification = [ordered]@{
    copiedUntrackedFilesRehashed = $untrackedFiles.Count
    extractedArchiveFilesRehashed = $untrackedFiles.Count
    relativeDirectoriesPreserved = $true
    headBundleVerified = $false
  }
  restoreOrder = @(
    'Verify and clone/fetch head.bundle if HEAD is unavailable.',
    'Apply index.patch with git apply --binary --index when non-empty.',
    'Apply tracked-working-tree.patch with git apply --binary.',
    'Extract untracked-files-preserve-paths.zip at the repository root without overwriting unrelated files.'
  )
}

& git bundle verify $bundlePath | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'R55_HEAD_BUNDLE_VERIFY_FAILED' }
$manifest.verification.headBundleVerified = $true

$manifestPath = Join-Path $checkpointRoot 'CHECKPOINT.json'
$manifestJson = $manifest | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($manifestPath, $manifestJson + "`n", [System.Text.UTF8Encoding]::new($false))

[ordered]@{
  checkpointRoot = $checkpointRoot
  checkpointManifestSha256 = Get-Sha256 $manifestPath
  contractSha256 = $contractSha256
  dirtyStateSha256 = $dirtyStateSha256
  trackedChangedFiles = $trackedFiles.Count
  untrackedFiles = $untrackedFiles.Count
  copiedAndRehashed = $untrackedFiles.Count
  extractedAndRehashed = $untrackedFiles.Count
  headBundleVerified = $manifest.verification.headBundleVerified
  status = 'R55_RECOVERY_CHECKPOINT_CREATED_AND_VERIFIED'
} | ConvertTo-Json -Depth 10
