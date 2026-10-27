param(
  [switch]$PreflightOnly,
  [switch]$PrepareBuildOnly,
  [ValidateSet("Host", "AndroidEmulator")]
  [string]$EmbeddedBuildTarget = "Host",
  [switch]$UseStandaloneLocalEstimateDatabase,
  [switch]$VerifyFullTypecheck,
  [string]$MasterPath = "",
  [string]$PreparedReferenceManifestPath = "",
  [string]$PreparedReferenceManifestSha256 = "",
  [ValidateSet("Combined", "Web")]
  [string]$WarmupTarget = "Combined",
  [switch]$ReuseTransformCache,
  [ValidateRange(1024, 65535)]
  [int]$Port = 8081
)

$ErrorActionPreference = "Stop"
if ($PrepareBuildOnly -and ($PreflightOnly -or $VerifyFullTypecheck)) {
  throw "WHOLE_APP_BUILD_PREPARATION_SWITCH_CONFLICT"
}
if ($EmbeddedBuildTarget -eq "AndroidEmulator" -and -not $PrepareBuildOnly) {
  throw "WHOLE_APP_ANDROID_EMBEDDED_TARGET_REQUIRES_BUILD_PREPARATION"
}
Set-StrictMode -Version Latest

$ReviewClock = [Diagnostics.Stopwatch]::StartNew()
$ReviewStages = [Collections.Generic.List[object]]::new()
$ReviewPreviousStageMs = 0L
function Record-ReviewStage([string]$StageName) {
  $elapsed = $ReviewClock.ElapsedMilliseconds
  $duration = $elapsed - $script:ReviewPreviousStageMs
  $ReviewStages.Add(@{ stage = $StageName; duration_ms = $duration; elapsed_ms = $elapsed; utc = (Get-Date).ToUniversalTime().ToString("o") })
  $script:ReviewPreviousStageMs = $elapsed
  Write-Host "stage=$StageName duration_ms=$duration elapsed_ms=$elapsed"
}

function Fail-Review([string]$Code, [string]$Recovery) {
  Write-Error "WHOLE_APP_DEVELOPER_REVIEW_RED: $Code`nВосстановление: $Recovery"
  exit 1
}

function Resolve-WholeAppFrontendBuildStamp(
  [string]$RuntimeRoot, [object]$Identity, [object]$BackendManager
) {
  # A cached bundle keeps the timestamp of its first build attempt. A launcher
  # restart is not a new build of the same immutable source/release tuple.
  $tuple = [ordered]@{
    source_tree_hash = [string]$Identity.sourceTreeHash
    product_source_hash = [string]$Identity.productSourceHash
    js_bundle_fingerprint = [string]$Identity.jsBundleFingerprint
    master_sha256 = [string]$BackendManager.master_sha256
    definition_release_id = [string]$BackendManager.definition_release_id
    search_release_id = [string]$BackendManager.search_release_id
    capability_id = [string]$BackendManager.capability_id
  }
  $tupleHash = Get-Sha256 ($tuple | ConvertTo-Json -Compress)
  $stampRoot = Join-Path $RuntimeRoot "frontend-build-stamps"
  New-Item -ItemType Directory -Path $stampRoot -Force | Out-Null
  $stampPath = Join-Path $stampRoot "$tupleHash.json"
  if (Test-Path -LiteralPath $stampPath) {
    $stamp = Get-Content -LiteralPath $stampPath -Raw | ConvertFrom-Json
    if ($stamp.schema_version -cne 'rik-expo-app.frontend-build-stamp.v1' `
      -or $stamp.tuple_sha256 -cne $tupleHash) { throw "WHOLE_APP_FRONTEND_BUILD_STAMP_INVALID" }
    foreach ($name in $tuple.Keys) {
      if ([string]$stamp.tuple.$name -cne [string]$tuple[$name]) {
        throw "WHOLE_APP_FRONTEND_BUILD_STAMP_TUPLE_DRIFT"
      }
    }
    # PowerShell 7 deserializes ISO JSON dates; normalize its date object
    # back to the same invariant UTC string written by this owner.
    if ($stamp.build_time -is [DateTime]) {
      $stamp.build_time = ([DateTimeOffset]$stamp.build_time).ToUniversalTime().ToString("o", [Globalization.CultureInfo]::InvariantCulture)
    }
    [void][DateTimeOffset]::ParseExact([string]$stamp.build_time, "o",
      [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::None)
    return $stamp
  }
  $stamp = [ordered]@{
    schema_version = 'rik-expo-app.frontend-build-stamp.v1'
    tuple_sha256 = $tupleHash
    tuple = $tuple
    build_time = [DateTimeOffset]::UtcNow.ToString("o")
  }
  $stream = [IO.File]::Open($stampPath, [IO.FileMode]::CreateNew,
    [IO.FileAccess]::Write, [IO.FileShare]::Read)
  $writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false))
  try { $writer.Write(($stamp | ConvertTo-Json -Depth 4)) }
  finally { $writer.Dispose() }
  return [pscustomobject]$stamp
}

function Resolve-WholeAppCanonicalFunctionUrl(
  [ValidateSet("Host", "AndroidEmulator")][string]$Target
) {
  # The embedded Android variant uses the emulator's host-loopback alias,
  # already admitted by its narrow network_security_config. Web uses host
  # loopback directly; no Android network permission is broadened here.
  if ($Target -eq "AndroidEmulator") { return "http://10.0.2.2:8765" }
  return "http://127.0.0.1:8765"
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

function Test-WebBundleReady([int]$Port, [int]$TimeoutSec, [ref]$CompletedBundle = $null) {
  if ($null -ne $CompletedBundle) { $CompletedBundle.Value = $null }
  try {
    Record-ReviewStage "metro_start_and_status"
    $route = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/office/foreman" -TimeoutSec 15
    Record-ReviewStage "web_route"
    if ($route.StatusCode -ne 200) { return $false }
    $match = [regex]::Match([string]$route.Content, '<script[^>]+src="([^"]*index\.bundle[^"]*)"')
    if (-not $match.Success) { return $false }
    $bundlePath = [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
    $bundleUri = [Uri]::new([Uri]"http://127.0.0.1:$Port/office/foreman", $bundlePath).AbsoluteUri
    # One deadline covers headers and the entire body. ResponseHeadersRead alone
    # would leave body reads outside HttpClient.Timeout. Keep only one 64 KiB
    # buffer and require EOF; never retain or decode the JavaScript response.
    $cancellation = [System.Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds($TimeoutSec))
    try {
      $client = [System.Net.Http.HttpClient]::new()
      try {
        $client.Timeout = [System.Threading.Timeout]::InfiniteTimeSpan
        $bundle = $client.GetAsync($bundleUri, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead, $cancellation.Token).GetAwaiter().GetResult()
        try {
          if ($bundle.StatusCode -ne [System.Net.HttpStatusCode]::OK) { return $false }
          $body = $bundle.Content.ReadAsStreamAsync($cancellation.Token).GetAwaiter().GetResult()
          try {
            $buffer = [byte[]]::new(64 * 1024)
            $bundleBytes = 0L
            while ($true) {
              $cancellation.Token.ThrowIfCancellationRequested()
              $bytesRead = $body.ReadAsync($buffer, 0, $buffer.Length, $cancellation.Token).GetAwaiter().GetResult()
              if ($bytesRead -eq 0) { break }
              $bundleBytes += [int64]$bytesRead
            }
            $cancellation.Token.ThrowIfCancellationRequested()
            $declaredLength = $bundle.Content.Headers.ContentLength
            if ($null -ne $declaredLength -and $bundleBytes -ne $declaredLength) {
              throw "WHOLE_APP_WEB_BUNDLE_TRUNCATED"
            }
            if ($null -ne $CompletedBundle -and $bundleBytes -gt 1000) {
              # Capture this completed GET, not a later parse of the HTML route.
              # The installed Metro emits one 16-hex revision ID on a full 200.
              $revisionIds = @($bundle.Headers.GetValues("X-Metro-Delta-ID"))
              if ($revisionIds.Count -ne 1 -or $revisionIds[0] -cnotmatch '^[0-9a-f]{16}$' `
                -or $bundleUri.Length -gt 8192 `
                -or $bundle.RequestMessage.RequestUri.AbsoluteUri -cne $bundleUri) {
                throw "WHOLE_APP_COMPLETED_WEB_BUNDLE_IDENTITY_RED"
              }
              $completedWebBundle = @{
                uri = $bundleUri
                revision_id = [string]$revisionIds[0]
                bytes = $bundleBytes
              }
            }
          }
          finally { $body.Dispose() }
        }
        finally { $bundle.Dispose() }
      }
      finally { $client.Dispose() }
    }
    finally { $cancellation.Dispose() }
    Record-ReviewStage "web_bundle"
    if ($null -ne $CompletedBundle -and $bundleBytes -gt 1000) {
      $CompletedBundle.Value = $completedWebBundle
    }
    return $bundleBytes -gt 1000
  }
  catch {
    return $false
  }
}

function Test-WholeAppMetroLifetime(
  [System.Diagnostics.Process]$MetroProcess, [long]$StartedUtcTicks, [int]$Port
) {
  try {
    $MetroProcess.Refresh()
    if ($MetroProcess.HasExited -or $MetroProcess.StartTime.ToUniversalTime().Ticks -ne $StartedUtcTicks) { return $false }
    $current = Get-Process -Id $MetroProcess.Id -ErrorAction Stop
    if ($current.StartTime.ToUniversalTime().Ticks -ne $StartedUtcTicks) { return $false }
    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique)
    return $listeners.Count -eq 1 -and $listeners[0] -eq $MetroProcess.Id
  }
  catch { return $false }
}

function Remove-WholeAppPreClientWebGraph(
  [object]$CompletedBundle, [System.Diagnostics.Process]$MetroProcess,
  [long]$StartedUtcTicks, [int]$Port
) {
  try {
    # This one-shot startup operation must precede this task's clients/READY.
    # A 204 alone cannot prove deletion: Metro also returns it for absent graphs.
    # Bind it to the full earlier GET, its revision, and the same owned listener.
    if ($null -eq $CompletedBundle -or $CompletedBundle.bytes -le 1000 `
      -or $CompletedBundle.revision_id -cnotmatch '^[0-9a-f]{16}$' `
      -or $CompletedBundle.metro_pid -ne $MetroProcess.Id `
      -or $CompletedBundle.metro_started_utc_ticks -ne $StartedUtcTicks `
      -or -not (Test-WholeAppMetroLifetime -MetroProcess $MetroProcess -StartedUtcTicks $StartedUtcTicks -Port $Port)) { return $false }
    $exactUri = [string]$CompletedBundle.uri
    if ($exactUri.Length -gt 8192) { return $false }
    $uri = [Uri]$exactUri
    if (-not $uri.IsAbsoluteUri -or $uri.Scheme -cne 'http' -or $uri.Host -cne '127.0.0.1' `
      -or $uri.Port -ne $Port -or $uri.UserInfo -or $uri.Fragment `
      -or -not $uri.AbsolutePath.EndsWith('.bundle', [StringComparison]::Ordinal) `
      -or $uri.AbsoluteUri -cne $exactUri) { return $false }
    $platformValues = @()
    foreach ($pair in $uri.Query.TrimStart('?').Split('&')) {
      $parts = $pair.Split('=', 2)
      if ([Uri]::UnescapeDataString($parts[0].Replace('+', ' ')) -ceq 'platform') {
        if ($parts.Length -ne 2) { return $false }
        $platformValues += [Uri]::UnescapeDataString($parts[1].Replace('+', ' '))
      }
    }
    if ($platformValues.Count -ne 1 -or $platformValues[0] -cne 'web') { return $false }
    $cancellation = [System.Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds(15))
    try {
      $handler = [System.Net.Http.HttpClientHandler]::new()
      try {
        $handler.AllowAutoRedirect = $false
        $handler.UseProxy = $false
        $client = [System.Net.Http.HttpClient]::new($handler, $false)
        try {
          $client.Timeout = [System.Threading.Timeout]::InfiniteTimeSpan
          $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Delete, $exactUri)
          try {
            $response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead, $cancellation.Token).GetAwaiter().GetResult()
            try {
              if ($response.StatusCode -ne [System.Net.HttpStatusCode]::NoContent `
                -or $response.RequestMessage.RequestUri.AbsoluteUri -cne $exactUri) { return $false }
              # HttpClient exposes an empty 204 body even when malformed framing
              # advertises bytes. Reject that framing explicitly before EOF.
              $declaredDeleteLength = $response.Content.Headers.ContentLength
              if (($null -ne $declaredDeleteLength -and $declaredDeleteLength -ne 0) `
                -or $response.Headers.TransferEncoding.Count -ne 0) { return $false }
              $body = $response.Content.ReadAsStreamAsync($cancellation.Token).GetAwaiter().GetResult()
              try {
                $oneByte = [byte[]]::new(1)
                if ($body.ReadAsync($oneByte, 0, 1, $cancellation.Token).GetAwaiter().GetResult() -ne 0) { return $false }
                $cancellation.Token.ThrowIfCancellationRequested()
              }
              finally { $body.Dispose() }
            }
            finally { $response.Dispose() }
          }
          finally { $request.Dispose() }
        }
        finally { $client.Dispose() }
      }
      finally { $handler.Dispose() }
    }
    finally { $cancellation.Dispose() }
    return Test-WholeAppMetroLifetime -MetroProcess $MetroProcess -StartedUtcTicks $StartedUtcTicks -Port $Port
  }
  catch { return $false }
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
Record-ReviewStage "providers_and_database_preflight"
$IdentityRaw = & $Node --import tsx (Join-Path $Root "scripts\dev\printLocalDeveloperBuildIdentity.ts") 2>$null
if ($LASTEXITCODE -ne 0 -or -not $IdentityRaw) {
  Fail-Review "SOURCE_IDENTITY_RED" "выполните npm install и повторите запуск"
}
$Identity = $IdentityRaw | ConvertFrom-Json
$BuildCommit = (& git -C $Root rev-parse HEAD).Trim()
$BuildBranch = (& git -C $Root branch --show-current).Trim()
$SelectedReleaseManifestPath = Join-Path $Root "data\estimate-benchmarks\r568-local-developer-canonical-release.json"
$ReleaseManifestPath = $SelectedReleaseManifestPath
$PreparedReferenceMode = -not [string]::IsNullOrWhiteSpace($PreparedReferenceManifestPath)
if ($PreparedReferenceMode -or -not [string]::IsNullOrWhiteSpace($PreparedReferenceManifestSha256)) {
  if (-not $PreparedReferenceMode -or $PreparedReferenceManifestSha256 -cnotmatch '^[0-9a-f]{64}$' `
    -or -not [IO.Path]::IsPathRooted($PreparedReferenceManifestPath) `
    -or -not (Test-Path -LiteralPath $PreparedReferenceManifestPath -PathType Leaf)) {
    throw "WHOLE_APP_PREPARED_REFERENCE_MANIFEST_PIN_REQUIRED"
  }
  $ReleaseManifestPath = [IO.Path]::GetFullPath($PreparedReferenceManifestPath)
  if ($ReleaseManifestPath.Equals([IO.Path]::GetFullPath($SelectedReleaseManifestPath), [StringComparison]::OrdinalIgnoreCase)) {
    throw "WHOLE_APP_PREPARED_REFERENCE_REQUIRES_SEPARATE_POINTER"
  }
  $ReferenceFile = Get-Item -LiteralPath $ReleaseManifestPath
  if ($ReferenceFile.Length -gt 1048576 -or $ReferenceFile.Length -le 0 `
    -or (Get-FileHash -LiteralPath $ReleaseManifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $PreparedReferenceManifestSha256) {
    throw "WHOLE_APP_PREPARED_REFERENCE_MANIFEST_DRIFT"
  }
}
$ReleaseManifest = Get-Content -LiteralPath $ReleaseManifestPath -Raw | ConvertFrom-Json
if ($PreparedReferenceMode -and ($ReleaseManifest.schemaVersion -ne 'r568-local-developer-canonical-release.v1' `
  -or $ReleaseManifest.definitionReleaseStatus -ne 'prepared' -or $ReleaseManifest.searchReleaseStatus -ne 'draft' `
  -or $ReleaseManifest.productionAccessed -ne $false)) {
  throw "WHOLE_APP_PREPARED_REFERENCE_STATUS_INVALID"
}
$ReleaseManifestSha256 = (Get-FileHash -LiteralPath $ReleaseManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
Record-ReviewStage "source_identity"

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

$DeferBackendForColdBundle = -not $PreflightOnly -and -not $PrepareBuildOnly `
  -and (-not $ReuseTransformCache -or $WarmupTarget -eq 'Web') `
  -and @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue).Count -eq 0
$BackendManagerRaw = & $Node --import tsx (Join-Path $Root "scripts\dev\ensureLocalDeveloperCanonicalBackend.ts") $(if ($PreflightOnly) { "--preflight" } elseif ($DeferBackendForColdBundle) { "--prepare-only" }) 2>$null
if ($LASTEXITCODE -ne 0 -or -not $BackendManagerRaw) {
  Fail-Review "CANONICAL_ESTIMATE_BACKEND_RED" "проверьте local estimate capability и backend 8765"
}
$BackendManager = $BackendManagerRaw | ConvertFrom-Json
function Assert-WholeAppBackendRuntimeIdentity([object]$BackendManager) {
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
}
if ($DeferBackendForColdBundle) {
  if ($BackendManager.status -ne 'R568_BACKEND_INPUTS_PREPARED_PROCESS_NOT_STARTED' `
    -or $BackendManager.runtime_identity_verified -ne $false `
    -or $BackendManager.backend_pid -ne 0 -or $BackendManager.active_compile_jobs -ne 0) {
    Fail-Review "CANONICAL_ESTIMATE_DEFERRED_INPUTS_RED" "проверьте штатный prepare-only и отсутствие активного расчёта"
  }
  Record-ReviewStage "backend_inputs_prepared_without_process"
}
else {
  Assert-WholeAppBackendRuntimeIdentity -BackendManager $BackendManager
Record-ReviewStage "backend_ensure_and_identity"
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
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = Resolve-WholeAppCanonicalFunctionUrl -Target $EmbeddedBuildTarget
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK = "true"
$env:EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH = [string]$Identity.sourceTreeHash
$env:EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH = [string]$Identity.productSourceHash
$env:EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT = [string]$Identity.jsBundleFingerprint
$env:EXPO_PUBLIC_BUILD_COMMIT = $BuildCommit
$env:EXPO_PUBLIC_BUILD_BRANCH = $BuildBranch
$FrontendBuildStamp = Resolve-WholeAppFrontendBuildStamp -RuntimeRoot $RuntimeRoot -Identity $Identity -BackendManager $BackendManager
$env:EXPO_PUBLIC_BUILD_TIME = [string]$FrontendBuildStamp.build_time
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
  $OwnedMetroProcess = Get-Process -Id $pidValue -ErrorAction Stop
  Stop-Process -Id $pidValue -Force -ErrorAction Stop
  if (-not $OwnedMetroProcess.WaitForExit(10000)) {
    Fail-Review "OWNED_METRO_STOP_TIMEOUT_PID_$pidValue" "дождитесь завершения проверенного Metro перед тяжёлой типизацией"
  }
}

$ExpoCli = Join-Path $Root "node_modules\expo\bin\cli"
Record-ReviewStage "owned_metro_stop"
New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
if ($PrepareBuildOnly) {
  @{
    schemaVersion = "rik-expo-app.embedded-build-preparation.v1"
    status = "EMBEDDED_BUILD_ENVIRONMENT_PREPARED"
    buildTarget = $EmbeddedBuildTarget
    canonicalEstimateFunctionUrl = $env:EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL
    backendControlUrl = "http://127.0.0.1:8765"
    generatedUtc = (Get-Date).ToUniversalTime().ToString("o")
    sourceHead = $BuildCommit
    sourceTree = [string]$Identity.sourceTreeHash
    jsBundleFingerprint = [string]$Identity.jsBundleFingerprint
    masterSha256 = [string]$BackendManager.master_sha256
    definitionReleaseId = [string]$BackendManager.definition_release_id
    searchReleaseId = [string]$BackendManager.search_release_id
    preparedReferenceMode = $PreparedReferenceMode
    releaseManifestSha256 = $ReleaseManifestSha256
    capabilityId = [string]$BackendManager.capability_id
    buildTime = $env:EXPO_PUBLIC_BUILD_TIME
    authenticatedRuntimeManifestVerified = $false
    webReady = $false
    androidReady = $false
    stages = @($ReviewStages)
  } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $RuntimeRoot "embedded-build-preparation.json") -Encoding utf8
  Write-Host "mode=embedded_build_prepared"
  exit 0
}
$FullTypecheckExitCode = $null
if ($VerifyFullTypecheck) {
  # The old owned Metro has stopped; its Web/Android graph no longer competes
  # with the required sequential compiler heaps. A failed check restores Metro.
  $TypecheckRequiredFreeKiB = 5242880
  $TypecheckFreeKiB = [int64](Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory
  $TypecheckMemorySamples = @(@{ elapsed_ms = 0; free_kib = $TypecheckFreeKiB })
  # Windows may release a terminated Metro graph after the process exits.
  # Wait a bounded time for the SAME admission budget; do not lower it or
  # stop unrelated processes. No compiler runs while memory is insufficient.
  $TypecheckMemoryWait = [Diagnostics.Stopwatch]::StartNew()
  while ($TypecheckFreeKiB -lt $TypecheckRequiredFreeKiB -and $TypecheckMemoryWait.ElapsedMilliseconds -lt 20000) {
    Start-Sleep -Milliseconds 500
    $TypecheckFreeKiB = [int64](Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory
    $TypecheckMemorySamples += @{ elapsed_ms = $TypecheckMemoryWait.ElapsedMilliseconds; free_kib = $TypecheckFreeKiB }
  }
  $TypecheckMemoryWait.Stop()
  # One bounded compiler tree plus OS/service headroom. Source tests run in
  # their own required project; the runner proves combined roots are retained.
  # Measured complete 15-project run: 1,981,513,728 bytes peak at 1792 MiB
  # heap. Keep a 2 GiB process-tree allowance plus the same 3 GiB reserve.
  $TypecheckHeapMiB = 1792
  $TypecheckDiskFree = [long](Get-PSDrive -Name ([IO.Path]::GetPathRoot($Root).Substring(0,1))).Free
  $TypecheckAdmitted = $TypecheckFreeKiB -ge $TypecheckRequiredFreeKiB -and $TypecheckDiskFree -ge 11274289152
  @{
    source_head = $BuildCommit
    captured_utc = (Get-Date).ToUniversalTime().ToString("o")
    actual_free_kib = $TypecheckFreeKiB
    memory_wait_ms = $TypecheckMemoryWait.ElapsedMilliseconds
    memory_samples = $TypecheckMemorySamples
    required_free_kib = $TypecheckRequiredFreeKiB
    heap_mib = $TypecheckHeapMiB
    expected_process_tree_peak_bytes = 2147483648
    physical_reserve_bytes = 3221225472
    disk_free_bytes = $TypecheckDiskFree
    expected_temporary_bytes = 536870912
    disk_reserve_bytes = 10737418240
    executed = $TypecheckAdmitted
    coverage = "all required full typecheck projects; runner checks unchanged combined source roots"
  } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $RuntimeRoot "full-typecheck-admission.json") -Encoding UTF8
  if ($TypecheckAdmitted) {
    $PriorTypecheckNodeOptions = $env:NODE_OPTIONS
    try {
      $env:NODE_OPTIONS = "--max-old-space-size=$TypecheckHeapMiB"
      # Windows PowerShell treats native stderr diagnostics as terminating
      # errors under Stop. Redirect in the child process, then read its real
      # exit code; successful compiler diagnostics must not kill the runner.
      $TypecheckProcess = Start-Process -FilePath $Node -ArgumentList @(
        (Join-Path $Root "scripts/typecheck/runTypecheckShards.mjs"), "--diagnostics"
      ) -WorkingDirectory $Root -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $RuntimeRoot "full-typecheck.log") `
        -RedirectStandardError (Join-Path $RuntimeRoot "full-typecheck.diagnostics.log")
      if (-not $TypecheckProcess.WaitForExit(300000)) {
        # This handle was just created by this launcher. Guard the start time
        # before terminating its owned compiler tree after the fixed deadline.
        $stillOwned = Get-Process -Id $TypecheckProcess.Id -ErrorAction SilentlyContinue
        if ($null -ne $stillOwned -and $stillOwned.StartTime -eq $TypecheckProcess.StartTime) {
          & taskkill.exe /PID $TypecheckProcess.Id /T /F | Out-Null
        }
        throw "WHOLE_APP_FULL_TYPECHECK_TIMEOUT_300S"
      }
      $TypecheckProcess.Refresh()
      $FullTypecheckExitCode = $TypecheckProcess.ExitCode
    }
    catch {
      $FullTypecheckExitCode = 1
      $_.Exception.Message | Set-Content -LiteralPath (Join-Path $RuntimeRoot "full-typecheck-launch-error.log") -Encoding UTF8
      Write-Warning "Full typecheck failed; restoring the owned Metro runtime."
    }
    finally { $env:NODE_OPTIONS = $PriorTypecheckNodeOptions }
  }
  else {
    $FullTypecheckExitCode = 1
    Write-Warning "Full typecheck admission rejected: freeKiB=$TypecheckFreeKiB requiredKiB=$TypecheckRequiredFreeKiB diskFreeBytes=$TypecheckDiskFree; no compiler executed."
  }
  Write-Host "full_typecheck_exit=$FullTypecheckExitCode"
}
$MetroStdout = Join-Path $RuntimeRoot "metro.stdout.log"
Record-ReviewStage "optional_typecheck"
$MetroStderr = Join-Path $RuntimeRoot "metro.stderr.log"
New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
$MetroArguments = @($ExpoCli, "start", "--dev-client", "--host", "localhost", "--port", "$Port")
if (-not $ReuseTransformCache) { $MetroArguments += "--clear" }
$MetroArguments += @("--max-workers", "1")
$Metro = Start-Process -FilePath $Node -ArgumentList $MetroArguments `
  -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $MetroStdout -RedirectStandardError $MetroStderr -PassThru
$MetroStartedUtcTicks = $Metro.StartTime.ToUniversalTime().Ticks

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
# The cold, single-worker graph can exceed three minutes on the review host.
# Keep a finite startup deadline and still require the complete bundle before
# warming Android or publishing the shared runtime identity.
# Use the same pinned transport checker before the large Web graph in Web-only review.
# Combined review still warms Android after releasing its pre-client Web graph.
$RunWholeAppTransportWarmup = {
  $WholeAppWarmup = Start-Process -FilePath $Node -ArgumentList @(
    (Join-Path $Root "scripts/dev/warmWholeAppDeveloperRuntime.cjs"), "$Port", $Root,
    (Join-Path $RuntimeRoot "web-android-pdf-readiness.json"), $WarmupTarget.ToLowerInvariant()
  ) -WorkingDirectory $Root -WindowStyle Hidden -Wait -PassThru `
    -RedirectStandardOutput (Join-Path $RuntimeRoot "web-android-pdf-readiness.log") `
    -RedirectStandardError (Join-Path $RuntimeRoot "web-android-pdf-readiness.error.log")
  if ($WholeAppWarmup.ExitCode -ne 0) {
    Fail-Review "WHOLE_APP_ANDROID_PDF_START_RED" "проверьте web-android-pdf-readiness.error.log в $RuntimeRoot; текущий контур сохранён"
  }
  Record-ReviewStage $(if ($WarmupTarget -eq "Combined") { "android_bundle_and_pdf_assets" } else { "web_pdf_assets" })
  $WarmupReceipt = Get-Content -LiteralPath (Join-Path $RuntimeRoot "web-android-pdf-readiness.json") -Raw | ConvertFrom-Json
  if ($WarmupReceipt.target -cne $WarmupTarget.ToLowerInvariant() `
    -or [bool]$WarmupReceipt.androidTransportReady -ne ($WarmupTarget -eq "Combined") `
    -or ($WarmupTarget -eq "Combined" -and $WarmupReceipt.status -cne 'WHOLE_APP_WEB_ANDROID_PDF_TRANSPORT_READY') `
    -or ($WarmupTarget -eq "Web" -and $WarmupReceipt.status -cne 'WHOLE_APP_WEB_PDF_TRANSPORT_READY_ANDROID_NOT_CHECKED')) {
    Fail-Review "WHOLE_APP_PLATFORM_READINESS_SCOPE_RED" "проверьте точную платформу и действительный receipt прогрева"
  }
  return $WarmupReceipt
}
$WarmupReceipt = $null
if ($WarmupTarget -eq "Web") {
  $WarmupReceipt = & $RunWholeAppTransportWarmup
}

$InitialWebBundle = $null
if (-not $ready `
  -or -not (Test-WholeAppMetroLifetime -MetroProcess $Metro -StartedUtcTicks $MetroStartedUtcTicks -Port $Port) `
  -or -not (Test-WebBundleReady -Port $Port -TimeoutSec 360 -CompletedBundle ([ref]$InitialWebBundle)) `
  -or -not (Test-WholeAppMetroLifetime -MetroProcess $Metro -StartedUtcTicks $MetroStartedUtcTicks -Port $Port)) {
  if (-not $Metro.HasExited) { Stop-Process -Id $Metro.Id -Force -ErrorAction SilentlyContinue }
  Fail-Review "WHOLE_APP_METRO_START_RED" "проверьте metro stdout/stderr в $RuntimeRoot"
}

$InitialWebBundle.metro_pid = $Metro.Id
$InitialWebBundle.metro_started_utc_ticks = $MetroStartedUtcTicks
# Limit cold-transform overlap before this task opens any clients. This is a
# transient-memory hypothesis; the final Web and Android graphs must coexist.
if ($WarmupTarget -eq "Combined") {
if (-not (Remove-WholeAppPreClientWebGraph -CompletedBundle $InitialWebBundle `
  -MetroProcess $Metro -StartedUtcTicks $MetroStartedUtcTicks -Port $Port)) {
  Fail-Review "WHOLE_APP_PRECLIENT_WEB_GRAPH_RELEASE_RED" "проверьте exact Web GET/revision и owned Metro lifetime; запуск завершён без READY"
}
Record-ReviewStage "preclient_web_graph_release"
}
else {
  Record-ReviewStage "web_graph_retained_for_web_review"
}

if ($WarmupTarget -eq "Combined") {
  $WarmupReceipt = & $RunWholeAppTransportWarmup
}

# Reconstruct Web once from the existing transform cache before any READY.
# The distinct Android platform graph is retained; never evict either graph
# after this barrier or introduce a retry/eviction loop for client requests.
$FinalWebBundle = $null
if ($WarmupTarget -eq "Combined") {
if (-not (Test-WholeAppMetroLifetime -MetroProcess $Metro -StartedUtcTicks $MetroStartedUtcTicks -Port $Port) `
  -or -not (Test-WebBundleReady -Port $Port -TimeoutSec 360 -CompletedBundle ([ref]$FinalWebBundle)) `
  -or -not (Test-WholeAppMetroLifetime -MetroProcess $Metro -StartedUtcTicks $MetroStartedUtcTicks -Port $Port) `
  -or $FinalWebBundle.uri -cne $InitialWebBundle.uri `
  -or $FinalWebBundle.revision_id -ceq $InitialWebBundle.revision_id) {
  Fail-Review "WHOLE_APP_FINAL_WEB_GRAPH_REBUILD_RED" "проверьте полный Web rebuild после Android/PDF в прежнем Metro; READY не опубликован"
}
Record-ReviewStage "web_graph_rebuilt_after_android_pdf"
}
else {
  if (-not (Test-WholeAppMetroLifetime -MetroProcess $Metro -StartedUtcTicks $MetroStartedUtcTicks -Port $Port)) {
    Fail-Review "WHOLE_APP_WEB_REVIEW_METRO_LIFETIME_RED" "проверьте тот же Metro после проверки PDF-ресурсов"
  }
  $FinalWebBundle = $InitialWebBundle
  Record-ReviewStage "web_graph_ready_android_not_checked"
}

if ($DeferBackendForColdBundle) {
  $PreparedBackendManager = $BackendManager
  $BackendManagerRaw = & $Node --import tsx (Join-Path $Root "scripts\dev\ensureLocalDeveloperCanonicalBackend.ts") 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $BackendManagerRaw) {
    Fail-Review "CANONICAL_ESTIMATE_BACKEND_AFTER_BUNDLE_RED" "проверьте единый backend после последовательной сборки"
  }
  $BackendManager = $BackendManagerRaw | ConvertFrom-Json
  if ($BackendManager.capability_id -ne $PreparedBackendManager.capability_id `
    -or $BackendManager.definition_release_id -ne $PreparedBackendManager.definition_release_id `
    -or $BackendManager.search_release_id -ne $PreparedBackendManager.search_release_id `
    -or $BackendManager.master_sha256 -ne $PreparedBackendManager.master_sha256) {
    Fail-Review "CANONICAL_ESTIMATE_PREPARED_TUPLE_DRIFT" "сборка и backend должны использовать один и тот же допуск, MASTER и release"
  }
  Assert-WholeAppBackendRuntimeIdentity -BackendManager $BackendManager
  Record-ReviewStage "backend_started_after_cold_bundles"
}

@{
  schema_version = "rik-expo-app.whole-app-developer-runtime.v1"
  generated_utc = (Get-Date).ToUniversalTime().ToString("o")
  launch_duration_ms = $ReviewClock.ElapsedMilliseconds
  launch_stages = $ReviewStages.ToArray()
  warmup_target = $WarmupTarget
  frontend_build_time = [string]$FrontendBuildStamp.build_time
  frontend_build_stamp_tuple_sha256 = [string]$FrontendBuildStamp.tuple_sha256
  metro_transform_cache_policy = $(if ($ReuseTransformCache) { "EXISTING_METRO_CONTENT_ADDRESSED_CACHE" } else { "EXPLICIT_RESET" })
  android_transport_ready = [bool]$WarmupReceipt.androidTransportReady
  transport_readiness_status = [string]$WarmupReceipt.status
  preclient_graph_schedule = @{
    schema_version = "rik-expo-app.whole-app-preclient-graph-schedule.v1"
    metro_pid = $Metro.Id
    metro_started_utc_ticks = $MetroStartedUtcTicks
    web_bundle_uri_sha256 = Get-Sha256 $InitialWebBundle.uri
    initial_web_revision_id = $InitialWebBundle.revision_id
    initial_web_bytes = $InitialWebBundle.bytes
    exact_web_delete_status = $(if ($WarmupTarget -eq "Combined") { 204 } else { $null })
    final_web_revision_id = $FinalWebBundle.revision_id
    final_web_bytes = $FinalWebBundle.bytes
    same_exact_web_uri = $true
    same_owned_metro_lifetime = $true
    android_graph_delete_requested = $false
    whole_os_client_absence_verified = $false
  }
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
  prepared_reference_mode = $PreparedReferenceMode
  release_manifest_sha256 = $ReleaseManifestSha256
  capability_id = [string]$BackendManager.capability_id
  catalog_transport = "bff_primary_supabase_rls_unavailable_fallback"
  estimate_backend_auth_profile = [string]$BackendManager.auth_profile
  estimate_backend_authenticated_probe_pending = -not [bool]$BackendManager.authenticated_runtime_manifest_verified
  estimate_backend_runtime_identity_verified = [bool]$BackendManager.runtime_identity_verified
  backend_started_after_cold_bundles = $DeferBackendForColdBundle
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $RuntimeRoot "metro.json") -Encoding UTF8

Write-Host "runtime_action=started_whole_app_staging_plus_local_estimate"
Write-Host "backend_pid=$($BackendManager.backend_pid)"
Write-Host "metro_pid=$($Metro.Id)"
if ($VerifyFullTypecheck -and $FullTypecheckExitCode -ne 0) {
  Fail-Review "FULL_TYPECHECK_NOT_GREEN_RUNTIME_RESTORED" "проверьте full-typecheck-admission.json и full-typecheck.log в $RuntimeRoot"
}
exit 0
