param(
  [switch]$PreflightOnly,
  [switch]$UseStandaloneLocalEstimateDatabase,
  [string]$MasterPath = "",
  [ValidateRange(1024, 65535)]
  [int]$Port = 8081
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Fail-Review([string]$Code, [string]$Recovery) {
  Write-Error "WHOLE_APP_DEVELOPER_REVIEW_RED: $Code`nВосстановление: $Recovery"
  exit 1
}

function Get-ConfiguredValue([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable($Name, "User")
  }
  return [string]$value
}

function Resolve-MasterSpecSha256([string]$Path) {
  if (-not [string]::IsNullOrWhiteSpace($Path)) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
      throw "WHOLE_APP_MASTER_SPEC_FILE_MISSING"
    }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
  }
  $configured = (Get-ConfiguredValue "LOCAL_DEVELOPER_MASTER_SHA256").Trim().ToLowerInvariant()
  if ($configured -and $configured -notmatch '^[0-9a-f]{64}$') {
    throw "WHOLE_APP_MASTER_SPEC_SHA256_INVALID"
  }
  return $configured
}

function Get-OptionalProviderValue([object]$Provider, [string]$Name) {
  $property = $Provider.PSObject.Properties[$Name]
  if ($null -eq $property) { return "" }
  return [string]$property.Value
}

function Get-Sha256([string]$Value) {
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
    return ([BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  }
  finally {
    $algorithm.Dispose()
  }
}

function Test-WebBundleReady([int]$Port, [int]$TimeoutSec) {
  try {
    $route = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/office/foreman" -TimeoutSec 15
    if ($route.StatusCode -ne 200) { return $false }
    $match = [regex]::Match([string]$route.Content, '<script[^>]+src="([^"]*index\.bundle[^"]*)"')
    if (-not $match.Success) { return $false }
    $bundlePath = [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
    $bundleUri = [Uri]::new([Uri]"http://127.0.0.1:$Port/office/foreman", $bundlePath).AbsoluteUri
    $bundle = Invoke-WebRequest -UseBasicParsing -Uri $bundleUri -TimeoutSec $TimeoutSec
    return $bundle.StatusCode -eq 200 -and [int64]$bundle.RawContentLength -gt 1000
  }
  catch {
    return $false
  }
}

$ExpectedCanonicalRoot = [System.IO.Path]::GetFullPath("C:\dev\rik-expo-app-r4a5-dc4f0ce7")
$Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$GitRootRaw = & git -C $Root rev-parse --show-toplevel 2>$null
$GitRootExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
$GitRoot = if ($GitRootExitCode -eq 0 -and $null -ne $GitRootRaw) {
  ([string]$GitRootRaw).Trim()
} else {
  ""
}
if ($GitRootExitCode -ne 0 `
  -or [string]::IsNullOrWhiteSpace($GitRoot) `
  -or [System.IO.Path]::GetFullPath($GitRoot) -ne $Root `
  -or -not $Root.Equals($ExpectedCanonicalRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  Fail-Review "PROJECT_ROOT_MISMATCH" "используйте только $ExpectedCanonicalRoot; копии и другие worktree не являются рабочим ядром"
}
Set-Location -LiteralPath $Root

# An explicitly selected current MASTER takes precedence over any historical
# process/user value. The backend must attest that exact digest even before an
# ordinary signed-in request is available; never infer it from matching code.
$RequestedMasterSha256 = Resolve-MasterSpecSha256 -Path $MasterPath
if (-not [string]::IsNullOrWhiteSpace($RequestedMasterSha256)) {
  $env:LOCAL_DEVELOPER_MASTER_SHA256 = $RequestedMasterSha256
}

$WholeAppUrl = Get-ConfiguredValue "STAGING_SUPABASE_URL"
$WholeAppKey = Get-ConfiguredValue "STAGING_SUPABASE_READONLY_KEY"
if ([string]::IsNullOrWhiteSpace($WholeAppUrl) -or [string]::IsNullOrWhiteSpace($WholeAppKey)) {
  Fail-Review "WHOLE_APP_STAGING_PROVIDER_MISSING" "восстановите STAGING_SUPABASE_URL и STAGING_SUPABASE_READONLY_KEY"
}
try {
  $WholeAppUri = [Uri]$WholeAppUrl
}
catch {
  Fail-Review "WHOLE_APP_STAGING_URL_INVALID" "исправьте STAGING_SUPABASE_URL"
}
if ($WholeAppUri.Scheme -ne "https" -or $WholeAppKey -match "service[_-]?role|sb_secret|private[_-]?key") {
  Fail-Review "WHOLE_APP_PUBLIC_PROVIDER_CLASS_RED" "используйте только HTTPS URL и публичный anon/publishable key"
}
$WholeAppHeaders = @{
  apikey = $WholeAppKey
  Authorization = "Bearer $WholeAppKey"
}
try {
  $AuthHealth = Invoke-WebRequest -UseBasicParsing -Uri "$($WholeAppUrl.TrimEnd('/'))/auth/v1/health" -Headers $WholeAppHeaders -TimeoutSec 15
  $CatalogHealth = Invoke-WebRequest -UseBasicParsing -Uri "$($WholeAppUrl.TrimEnd('/'))/rest/v1/rik_items?select=rik_code&limit=1" -Headers $WholeAppHeaders -TimeoutSec 15
  $SupplierHealth = Invoke-WebRequest -UseBasicParsing -Uri "$($WholeAppUrl.TrimEnd('/'))/rest/v1/suppliers?select=id&limit=1" -Headers $WholeAppHeaders -TimeoutSec 15
  $SubcontractHealth = Invoke-WebRequest -UseBasicParsing -Uri "$($WholeAppUrl.TrimEnd('/'))/rest/v1/subcontracts?select=id&limit=1" -Headers $WholeAppHeaders -TimeoutSec 15
  if (@($AuthHealth, $CatalogHealth, $SupplierHealth, $SubcontractHealth).StatusCode -contains 500) {
    throw "whole_app_health_5xx"
  }
}
catch {
  Fail-Review "WHOLE_APP_STAGING_HEALTH_RED" "проверьте доступность staging Supabase и публичный ключ"
}

$ProviderRoot = Join-Path $Root ".release-runtime\r52\runtime\a7-supabase-project"
$ProviderConfig = Join-Path $ProviderRoot "supabase\config.toml"
$CanonicalStandaloneDatabaseRoot = Join-Path $Root ".release-runtime\r568\runtime\postgres-r4"
$CliCandidates = @(
  (Join-Path $Root ".release-runtime\r52\runtime\supabase-cli-2.105.0\supabase.exe"),
  (Join-Path $env:USERPROFILE ".local\share\supabase\v2.105.0\supabase.exe")
)
$SupabaseCli = $CliCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$ProviderConfigAvailable = Test-Path -LiteralPath $ProviderConfig
if ((-not $ProviderConfigAvailable -or -not $SupabaseCli) `
  -and -not $UseStandaloneLocalEstimateDatabase) {
  Fail-Review "LOCAL_ESTIMATE_PROVIDER_MISSING" "восстановите локальный estimate provider и Supabase CLI 2.105.0"
}
$statusRaw = $null
$statusExitCode = 1
if ($ProviderConfigAvailable -and $SupabaseCli) {
  Push-Location $ProviderRoot
  try {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $statusRaw = & $SupabaseCli status -o json 2>$null
    $statusExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
  }
  finally {
    $ErrorActionPreference = "Stop"
    Pop-Location
  }
}
if ($statusExitCode -ne 0 -or -not $statusRaw) {
  if (-not $UseStandaloneLocalEstimateDatabase) {
    Fail-Review "LOCAL_ESTIMATE_PROVIDER_NOT_READY" "запустите локальный proof provider или явно выберите проверенный standalone database mode"
  }
  $databaseListener = Get-NetTCPConnection -LocalPort 55432 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  $databaseOwner = if ($null -eq $databaseListener) { $null } else {
    Get-CimInstance Win32_Process -Filter "ProcessId=$($databaseListener.OwningProcess)" -ErrorAction SilentlyContinue
  }
  $databaseCommand = if ($null -eq $databaseOwner) { "" } else {
    ([string]$databaseOwner.CommandLine).Replace("\", "/")
  }
  $databaseIdentityOk = $null -ne $databaseOwner `
    -and $databaseOwner.Name -eq "postgres.exe" `
    -and $databaseCommand -match "-p\s+55432" `
    -and $databaseCommand -match "-h\s+127\.0\.0\.1" `
    -and $databaseCommand.Contains($CanonicalStandaloneDatabaseRoot.Replace("\", "/"))
  if (-not $databaseIdentityOk) {
    Fail-Review "STANDALONE_LOCAL_DATABASE_IDENTITY_RED" "восстановите проверенный loopback PostgreSQL из $CanonicalStandaloneDatabaseRoot на 127.0.0.1:55432"
  }
  $LocalCredentialsPath = Join-Path $Root ".release-runtime\r551\runtime\local-developer\credentials.json"
  if (-not (Test-Path -LiteralPath $LocalCredentialsPath)) {
    Fail-Review "STANDALONE_LOCAL_CREDENTIALS_MISSING" "восстановите штатный локальный provider receipt"
  }
  $LocalCredentials = Get-Content -LiteralPath $LocalCredentialsPath -Raw | ConvertFrom-Json
  $statusRaw = @{
    API_URL = [string]$LocalCredentials.provider_url
    PUBLISHABLE_KEY = [string]$LocalCredentials.publishable_key
    runtime_mode = "STANDALONE_LOOPBACK_DATABASE_WITH_WHOLE_APP_STAGING_AUTH"
    database_pid = [int]$databaseOwner.ProcessId
  } | ConvertTo-Json -Compress
}
$Provider = $statusRaw | ConvertFrom-Json
$LocalProviderUrl = [string]$Provider.API_URL
$LocalProviderKey = Get-OptionalProviderValue $Provider "PUBLISHABLE_KEY"
if ([string]::IsNullOrWhiteSpace($LocalProviderKey)) {
  $LocalProviderKey = Get-OptionalProviderValue $Provider "ANON_KEY"
}
if ([string]::IsNullOrWhiteSpace($LocalProviderKey)) {
  try {
    $kongConfig = & docker exec supabase_kong_rik-r52-a7-provider-20260824 cat /home/kong/kong.yml 2>$null
    $LocalProviderKey = [regex]::Match([string]$kongConfig, "sb_publishable_[A-Za-z0-9_-]+").Value
  }
  catch {
    $LocalProviderKey = ""
  }
}
if ([string]::IsNullOrWhiteSpace($LocalProviderUrl) -or [string]::IsNullOrWhiteSpace($LocalProviderKey)) {
  Fail-Review "LOCAL_ESTIMATE_PROVIDER_IDENTITY_RED" "перезапустите локальный estimate provider"
}
$localProviderClassOk = $LocalProviderUrl -match '^http://(127\.0\.0\.1|localhost):54321$' `
  -and $LocalProviderKey -notmatch 'service[_-]?role|sb_secret|private[_-]?key'
if (-not $localProviderClassOk) {
  Fail-Review "LOCAL_ESTIMATE_PROVIDER_CLASS_RED" "используйте только штатный loopback URL и публичный ключ"
}

$Node = (Get-Command node -ErrorAction Stop).Source
$TsxCli = Join-Path $Root "node_modules\tsx\dist\cli.mjs"
$IdentityRaw = & $Node $TsxCli (Join-Path $Root "scripts\dev\printLocalDeveloperBuildIdentity.ts") 2>$null
if ($LASTEXITCODE -ne 0 -or -not $IdentityRaw) {
  Fail-Review "SOURCE_IDENTITY_RED" "выполните npm install и повторите запуск"
}
$Identity = $IdentityRaw | ConvertFrom-Json
$BuildCommit = (& git -C $Root rev-parse HEAD).Trim()
$BuildBranch = (& git -C $Root branch --show-current).Trim()
$ReleaseManifest = Get-Content -LiteralPath (Join-Path $Root "data\estimate-benchmarks\r568-local-developer-canonical-release.json") -Raw | ConvertFrom-Json

$RuntimeRoot = if ($Port -eq 8081) {
  Join-Path $Root ".release-runtime\r568\runtime\whole-app-developer-current"
}
else {
  Join-Path $Root ".release-runtime\r568\runtime\whole-app-developer-$Port"
}
$env:LOCAL_DEVELOPER_EVIDENCE_ROOT = $RuntimeRoot
$env:LOCAL_DEVELOPER_PROVIDER_URL = $LocalProviderUrl
$env:LOCAL_DEVELOPER_PROVIDER_PUBLIC_KEY = $LocalProviderKey
$env:LOCAL_DEVELOPER_BACKEND_AUTH_PROFILE = "whole_app_staging"
$env:LOCAL_DEVELOPER_BACKEND_AUTH_URL = $WholeAppUrl.TrimEnd('/')
$env:LOCAL_DEVELOPER_BACKEND_AUTH_PUBLIC_KEY = $WholeAppKey
$env:LOCAL_DEVELOPER_BUILD_COMMIT = $BuildCommit
$env:LOCAL_DEVELOPER_DEFINITION_RELEASE_ID = [string]$ReleaseManifest.definitionReleaseId
$env:LOCAL_DEVELOPER_SEARCH_RELEASE_ID = [string]$ReleaseManifest.searchReleaseId
$env:LOCAL_DEVELOPER_SOURCE_TREE_HASH = [string]$Identity.sourceTreeHash
$env:LOCAL_DEVELOPER_PRODUCT_SOURCE_HASH = [string]$Identity.productSourceHash
$env:LOCAL_DEVELOPER_JS_BUNDLE_FINGERPRINT = [string]$Identity.jsBundleFingerprint

$BackendManagerRaw = & $Node $TsxCli (Join-Path $Root "scripts\dev\ensureLocalDeveloperCanonicalBackend.ts") $(if ($PreflightOnly) { "--preflight" }) 2>$null
if ($LASTEXITCODE -ne 0 -or -not $BackendManagerRaw) {
  Fail-Review "CANONICAL_ESTIMATE_BACKEND_RED" "проверьте local estimate capability и backend 8765"
}
$BackendManager = $BackendManagerRaw | ConvertFrom-Json
$RuntimeIdentity = Invoke-RestMethod -Uri "http://127.0.0.1:8765/runtime-identity" -TimeoutSec 15
$RuntimeIdentityRoot = [System.IO.Path]::GetFullPath([string]$RuntimeIdentity.workingDirectory)
$RuntimeFrontend = $RuntimeIdentity.frontendBuildIdentity
$RuntimeIdentityOk = $RuntimeIdentity.schemaVersion -eq "rik-expo-app.local-runtime-identity.v1" `
  -and $RuntimeIdentity.runtimeRole -eq "FULL_CANONICAL_ESTIMATE_BACKEND" `
  -and $RuntimeIdentityRoot.Equals($Root, [System.StringComparison]::OrdinalIgnoreCase) `
  -and [string]$RuntimeIdentity.sourceHead -eq $BuildCommit `
  -and [string]$RuntimeIdentity.sourceTree -eq [string]$Identity.sourceTreeHash `
  -and [string]$RuntimeIdentity.specSha256 -eq [string]$BackendManager.master_sha256 `
  -and [string]$RuntimeIdentity.definitionReleaseId -eq [string]$BackendManager.definition_release_id `
  -and [string]$RuntimeIdentity.searchReleaseId -eq [string]$BackendManager.search_release_id `
  -and [string]$RuntimeFrontend.sourceTreeHash -eq [string]$Identity.sourceTreeHash `
  -and [string]$RuntimeFrontend.productSourceHash -eq [string]$Identity.productSourceHash `
  -and [string]$RuntimeFrontend.jsBundleFingerprint -eq [string]$Identity.jsBundleFingerprint `
  -and [string]$RuntimeFrontend.buildCommit -eq $BuildCommit `
  -and $RuntimeIdentity.containsCredentials -eq $false `
  -and $RuntimeIdentity.containsTenantIdentity -eq $false
if (-not $RuntimeIdentityOk) {
  Fail-Review "CANONICAL_ESTIMATE_RUNTIME_IDENTITY_RED" "перезапустите единый backend 8765 из $Root с release из канонического manifest"
}

$ProviderFingerprint = (Get-Sha256 $WholeAppUrl).Substring(0, 12)
$PublicKeyFingerprint = (Get-Sha256 $WholeAppKey).Substring(0, 12)
Write-Host "WHOLE_APP_DEVELOPER_PREFLIGHT_GREEN"
Write-Host "runtime_profile=whole_app_staging_plus_local_estimate"
Write-Host "URL=http://localhost:$Port"
Write-Host "provider_url_fingerprint=$ProviderFingerprint"
Write-Host "provider_public_fingerprint=$PublicKeyFingerprint"
if ($PreflightOnly) {
  Write-Host "mode=preflight_only"
  exit 0
}

$env:EXPO_PUBLIC_APP_ENV = "staging"
$env:EXPO_PUBLIC_RELEASE_LABEL = "STAGING_WHOLE_APP_WITH_LOCAL_ESTIMATE"
$env:EXPO_PUBLIC_SUPABASE_URL = $WholeAppUrl
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY = $WholeAppKey
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = "http://127.0.0.1:8765"
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK = "true"
$env:EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH = [string]$Identity.sourceTreeHash
$env:EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH = [string]$Identity.productSourceHash
$env:EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT = [string]$Identity.jsBundleFingerprint
$env:EXPO_PUBLIC_BUILD_COMMIT = $BuildCommit
$env:EXPO_PUBLIC_BUILD_BRANCH = $BuildBranch
$env:EXPO_PUBLIC_BUILD_TIME = (Get-Date).ToUniversalTime().ToString("o")
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID = [string]$BackendManager.definition_release_id
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID = [string]$BackendManager.search_release_id
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID = [string]$BackendManager.capability_id
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_REQUIRE_RUNTIME_COMPATIBILITY = "true"
$env:EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED = "false"
$env:EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT = "0"
Remove-Item Env:\LOCAL_DEVELOPER_REVIEW -ErrorAction SilentlyContinue
Remove-Item Env:\EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW -ErrorAction SilentlyContinue
Remove-Item Env:\EXPO_PUBLIC_BFF_STAGING_BASE_URL -ErrorAction SilentlyContinue
foreach ($name in @("SUPABASE_SERVICE_ROLE_KEY", "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "EXPO_PUBLIC_SUPABASE_SECRET_KEY")) {
  Remove-Item -LiteralPath "Env:\$name" -ErrorAction SilentlyContinue
}

$listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
foreach ($pidValue in @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
  $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$pidValue" -ErrorAction SilentlyContinue
  $normalized = ([string]$owner.CommandLine).Replace("\", "/")
  if ($owner.Name -ne "node.exe" -or -not $normalized.Contains($Root.Replace("\", "/")) -or $normalized -notmatch "expo[/\\]bin[/\\]cli") {
    Fail-Review "PORT_8081_FOREIGN_OWNER_PID_$pidValue" "освободите порт после проверки владельца"
  }
  Stop-Process -Id $pidValue -Force -ErrorAction Stop
}

$ExpoCli = Join-Path $Root "node_modules\expo\bin\cli"
$MetroStdout = Join-Path $RuntimeRoot "metro.stdout.log"
$MetroStderr = Join-Path $RuntimeRoot "metro.stderr.log"
New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
$Metro = Start-Process -FilePath $Node -ArgumentList @(
  $ExpoCli, "start", "--dev-client", "--host", "localhost", "--port", "$Port", "--clear", "--max-workers", "1"
) -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $MetroStdout -RedirectStandardError $MetroStderr -PassThru

$deadline = (Get-Date).AddSeconds(90)
$ready = $false
while ((Get-Date) -lt $deadline) {
  if ($Metro.HasExited) { break }
  try {
    $status = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/status" -TimeoutSec 2
    $statusContent = if ($status.Content -is [byte[]]) {
      [System.Text.Encoding]::UTF8.GetString($status.Content)
    }
    else {
      [string]$status.Content
    }
    if ($status.StatusCode -eq 200 -and $statusContent -match "packager-status:running") {
      $ready = $true
      break
    }
  }
  catch {
    Start-Sleep -Milliseconds 250
  }
}
if (-not $ready -or -not (Test-WebBundleReady -Port $Port -TimeoutSec 180)) {
  if (-not $Metro.HasExited) { Stop-Process -Id $Metro.Id -Force -ErrorAction SilentlyContinue }
  Fail-Review "WHOLE_APP_METRO_START_RED" "проверьте metro stdout/stderr в $RuntimeRoot"
}

@{
  schema_version = "rik-expo-app.whole-app-developer-runtime.v1"
  generated_utc = (Get-Date).ToUniversalTime().ToString("o")
  canonical_root = $Root
  git_root = [System.IO.Path]::GetFullPath($GitRoot)
  runtime_profile = "whole_app_staging_plus_local_estimate"
  pid = $Metro.Id
  provider_url_fingerprint = $ProviderFingerprint
  provider_public_fingerprint = $PublicKeyFingerprint
  source_tree_hash = [string]$Identity.sourceTreeHash
  product_source_hash = [string]$Identity.productSourceHash
  js_bundle_fingerprint = [string]$Identity.jsBundleFingerprint
  master_sha256 = [string]$BackendManager.master_sha256
  build_commit = $BuildCommit
  build_branch = $BuildBranch
  definition_release_id = [string]$BackendManager.definition_release_id
  search_release_id = [string]$BackendManager.search_release_id
  capability_id = [string]$BackendManager.capability_id
  catalog_transport = "bff_primary_supabase_rls_unavailable_fallback"
  estimate_backend_auth_profile = [string]$BackendManager.auth_profile
  estimate_backend_authenticated_probe_pending = -not [bool]$BackendManager.authenticated_runtime_manifest_verified
  estimate_backend_runtime_identity_verified = [bool]$BackendManager.runtime_identity_verified
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $RuntimeRoot "metro.json") -Encoding UTF8

Write-Host "runtime_action=started_whole_app_staging_plus_local_estimate"
Write-Host "backend_pid=$($BackendManager.backend_pid)"
Write-Host "metro_pid=$($Metro.Id)"
exit 0
