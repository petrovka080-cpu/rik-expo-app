param(
  [switch]$PreflightOnly
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Fail-Preflight([string]$Code, [string]$Recovery) {
  Write-Error "LOCAL_DEVELOPER_PREFLIGHT_RED: $Code`nВосстановление: $Recovery"
  exit 1
}

function Get-OptionalProviderValue([object]$Provider, [string]$Name) {
  $Property = $Provider.PSObject.Properties[$Name]
  if ($null -eq $Property) { return "" }
  return [string]$Property.Value
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

$Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$GitRoot = (& git -C $Root rev-parse --show-toplevel 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or [System.IO.Path]::GetFullPath($GitRoot) -ne $Root) {
  Fail-Preflight "PROJECT_ROOT_MISMATCH" "запустите скрипт из канонического worktree"
}
if (-not (Test-Path -LiteralPath (Join-Path $Root "package.json"))) {
  Fail-Preflight "PACKAGE_JSON_MISSING" "восстановите checkout проекта"
}

$ProviderRoot = Join-Path $Root ".release-runtime\r52\runtime\a7-supabase-project"
$ProviderConfig = Join-Path $ProviderRoot "supabase\config.toml"
if (-not (Test-Path -LiteralPath $ProviderConfig)) {
  Fail-Preflight "LOCAL_PROVIDER_CONFIG_MISSING" "восстановите локальный proof provider из раздела P0.6 MASTER R5.5.1"
}

$CliCandidates = @(
  (Join-Path $Root ".release-runtime\r52\runtime\supabase-cli-2.105.0\supabase.exe"),
  (Join-Path $env:USERPROFILE ".local\share\supabase\v2.105.0\supabase.exe")
)
$SupabaseCli = $CliCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $SupabaseCli) {
  Fail-Preflight "SUPABASE_CLI_MISSING" "установите Supabase CLI 2.105.0 и повторите запуск"
}

Push-Location $ProviderRoot
try {
  $PreviousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $StatusRaw = & $SupabaseCli status -o json 2>$null
  $StatusExitCode = $LASTEXITCODE
  $ErrorActionPreference = $PreviousErrorActionPreference
  if ($StatusExitCode -ne 0 -or -not $StatusRaw) {
    Fail-Preflight "LOCAL_PROVIDER_NOT_READY" "& `"$SupabaseCli`" start"
  }
}
finally {
  $ErrorActionPreference = "Stop"
  Pop-Location
}

try {
  $Provider = $StatusRaw | ConvertFrom-Json
}
catch {
  Fail-Preflight "LOCAL_PROVIDER_STATUS_INVALID" "перезапустите локальный Supabase provider"
}

$ApiUrl = [string]$Provider.API_URL
$PublishableKey = Get-OptionalProviderValue $Provider "PUBLISHABLE_KEY"
$AnonKey = Get-OptionalProviderValue $Provider "ANON_KEY"
$PublicKey = if (-not [string]::IsNullOrWhiteSpace($PublishableKey)) {
  $PublishableKey
}
else {
  $AnonKey
}
$ForbiddenKeys = @(
  (Get-OptionalProviderValue $Provider "SERVICE_ROLE_KEY"),
  (Get-OptionalProviderValue $Provider "SECRET_KEY")
) |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
if ([string]::IsNullOrWhiteSpace($PublicKey)) {
  try {
    $KongConfig = & docker exec supabase_kong_rik-r52-a7-provider-20260824 cat /home/kong/kong.yml 2>$null
    $PublicKey = [regex]::Match([string]$KongConfig, "sb_publishable_[A-Za-z0-9_-]+").Value
    $LocalSecretKey = [regex]::Match([string]$KongConfig, "sb_secret_[A-Za-z0-9_-]+").Value
    if (-not [string]::IsNullOrWhiteSpace($LocalSecretKey)) {
      $ForbiddenKeys = @($ForbiddenKeys) + $LocalSecretKey
    }
  }
  catch {
    $PublicKey = ""
  }
}

try {
  $ApiUri = [Uri]$ApiUrl
}
catch {
  Fail-Preflight "LOCAL_PROVIDER_URL_INVALID" "перезапустите локальный Supabase provider"
}
$LoopbackHosts = @("localhost", "127.0.0.1", "::1")
if ($ApiUri.Scheme -ne "http" -or $LoopbackHosts -notcontains $ApiUri.Host -or $ApiUri.Port -ne 54321) {
  Fail-Preflight "NON_LOCAL_PROVIDER_FORBIDDEN" "используйте только http://127.0.0.1:54321"
}
if (
  [string]::IsNullOrWhiteSpace($PublicKey) -or
  $PublicKey -match "service[_-]?role|sb_secret|private[_-]?key" -or
  $ForbiddenKeys -contains $PublicKey
) {
  Fail-Preflight "PUBLIC_KEY_CLASS_RED" "пересоздайте локальный provider и его publishable key"
}

try {
  $Health = Invoke-WebRequest -UseBasicParsing -Uri "$ApiUrl/auth/v1/health" -TimeoutSec 5
  if ($Health.StatusCode -ne 200) { throw "health_status_$($Health.StatusCode)" }
  $Rest = Invoke-WebRequest -UseBasicParsing -Uri "$ApiUrl/rest/v1/" -Headers @{
    apikey = $PublicKey
    Authorization = "Bearer $PublicKey"
  } -TimeoutSec 5
  if ($Rest.StatusCode -lt 200 -or $Rest.StatusCode -ge 500) {
    throw "rest_status_$($Rest.StatusCode)"
  }
}
catch {
  Fail-Preflight "LOCAL_PROVIDER_HEALTH_RED" "перезапустите локальный Supabase provider и повторите запуск"
}

$CanonicalBackendUrl = "http://127.0.0.1:8765"

$Node = (Get-Command node -ErrorAction Stop).Source
$IdentityTool = Join-Path $Root "scripts\dev\printLocalDeveloperBuildIdentity.ts"
$TsxCli = Join-Path $Root "node_modules\tsx\dist\cli.mjs"
$IdentityRaw = & $Node $TsxCli $IdentityTool 2>$null
if ($LASTEXITCODE -ne 0 -or -not $IdentityRaw) {
  Fail-Preflight "SOURCE_IDENTITY_RED" "выполните npm install и повторите запуск"
}
$Identity = $IdentityRaw | ConvertFrom-Json
foreach ($Name in @("sourceTreeHash", "productSourceHash", "jsBundleFingerprint")) {
  if ([string]$Identity.$Name -notmatch "^[0-9a-f]{64}$") {
    Fail-Preflight "SOURCE_IDENTITY_${Name}_RED" "исправьте canonical fingerprint calculator"
  }
}
$BuildCommit = (& git -C $Root rev-parse HEAD).Trim()
$BuildBranch = (& git -C $Root branch --show-current).Trim()
$env:LOCAL_DEVELOPER_PROVIDER_URL = $ApiUrl
$env:LOCAL_DEVELOPER_PROVIDER_PUBLIC_KEY = $PublicKey
$env:LOCAL_DEVELOPER_BUILD_COMMIT = $BuildCommit
$ExactCandidateReceiptPath = Join-Path $Root ".release-runtime\r568\rc09-r4-production-closeout\r4-a5-exact-ui-confirm-durability-1\12_FORMULA_DEPENDENCY_SUCCESSOR.json"
if (-not (Test-Path -LiteralPath $ExactCandidateReceiptPath)) {
  Fail-Preflight "EXACT_CANDIDATE_RECEIPT_MISSING" "подготовьте immutable R4-A5 successor и повторите запуск"
}
$ExactCandidateReceipt = Get-Content -LiteralPath $ExactCandidateReceiptPath -Raw | ConvertFrom-Json
if ($ExactCandidateReceipt.status -ne "GREEN_SUCCESSOR_PREPARED_NOT_ACTIVE") {
  Fail-Preflight "EXACT_CANDIDATE_RECEIPT_RED" "повторно проверьте и подготовьте R4-A5 successor"
}
$env:LOCAL_DEVELOPER_DEFINITION_RELEASE_ID = [string]$ExactCandidateReceipt.successor.releaseId
$env:LOCAL_DEVELOPER_SEARCH_RELEASE_ID = [string]$ExactCandidateReceipt.successor.searchReleaseId
$env:LOCAL_DEVELOPER_SOURCE_TREE_HASH = [string]$Identity.sourceTreeHash
$env:LOCAL_DEVELOPER_PRODUCT_SOURCE_HASH = [string]$Identity.productSourceHash
$env:LOCAL_DEVELOPER_JS_BUNDLE_FINGERPRINT = [string]$Identity.jsBundleFingerprint

$Port = 8081
$ExistingListeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
$ExistingPids = @($ExistingListeners | Select-Object -ExpandProperty OwningProcess -Unique)
$ExistingMetroPid = 0
$MetroIdentityMatches = $false
$MetroReceiptPath = Join-Path $Root ".release-runtime\r568\rc09-r4-production-closeout\r4-a5-exact-ui-confirm-durability-1\runtime\metro.json"
foreach ($ExistingPid in $ExistingPids) {
  $ExistingProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$ExistingPid" -ErrorAction SilentlyContinue
  if (-not $ExistingProcess) { continue }
  $CommandLine = [string]$ExistingProcess.CommandLine
  $NormalizedCommand = $CommandLine.Replace("\", "/")
  $NormalizedRoot = $Root.Replace("\", "/")
  $OwnedMetro =
    $ExistingProcess.Name -eq "node.exe" -and
    $NormalizedCommand.Contains($NormalizedRoot) -and
    $NormalizedCommand -match "expo[/\\]bin[/\\]cli" -and
    $NormalizedCommand -match "\bstart\b" -and
    $NormalizedCommand -match "--web"
  if (-not $OwnedMetro) {
    Fail-Preflight "PORT_8081_FOREIGN_OWNER_PID_$ExistingPid" "освободите порт 8081 вручную после проверки владельца"
  }
  $ExistingMetroPid = [int]$ExistingPid
  if (Test-Path -LiteralPath $MetroReceiptPath) {
    try {
      $MetroReceipt = Get-Content -LiteralPath $MetroReceiptPath -Raw | ConvertFrom-Json
      $MetroIdentityMatches =
        [int]$MetroReceipt.pid -eq $ExistingMetroPid -and
        [string]$MetroReceipt.source_tree_hash -eq [string]$Identity.sourceTreeHash -and
        [string]$MetroReceipt.product_source_hash -eq [string]$Identity.productSourceHash -and
        [string]$MetroReceipt.js_bundle_fingerprint -eq [string]$Identity.jsBundleFingerprint -and
        [string]$MetroReceipt.build_commit -eq $BuildCommit
    }
    catch {
      $MetroIdentityMatches = $false
    }
  }
}

$PublicFingerprint = (Get-Sha256 $PublicKey).Substring(0, 12)
$SourceFingerprint = ([string]$Identity.productSourceHash).Substring(0, 12)
$BundleFingerprint = ([string]$Identity.jsBundleFingerprint).Substring(0, 12)

Write-Host "LOCAL_DEVELOPER_PREFLIGHT_GREEN"
Write-Host "URL=http://localhost:8081"
Write-Host "environment=local_developer"
Write-Host "provider_public_fingerprint=$PublicFingerprint"
Write-Host "source_fingerprint=$SourceFingerprint"
Write-Host "bundle_fingerprint=$BundleFingerprint"
if ($PreflightOnly) {
  $BackendManager = Join-Path $Root "scripts\dev\ensureLocalDeveloperCanonicalBackend.ts"
  $BackendManagerRaw = & $Node $TsxCli $BackendManager --preflight 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $BackendManagerRaw) {
    Fail-Preflight "CANONICAL_BACKEND_MANAGER_PREFLIGHT_RED" "проверьте capability, release tuple и владельца порта 8765"
  }
  Write-Host "backend=$BackendManagerRaw"
  Write-Host "mode=preflight_only"
  exit 0
}

$Provisioner = Join-Path $Root "scripts\dev\provisionLocalDeveloperReview.ts"
$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$ProvisionResultRaw = & $Node $TsxCli $Provisioner 2>$null
$ProvisionExitCode = $LASTEXITCODE
$ErrorActionPreference = $PreviousErrorActionPreference
if ($ProvisionExitCode -ne 0 -or -not $ProvisionResultRaw) {
  Fail-Preflight "LOCAL_DEVELOPER_PRINCIPAL_PROVISION_RED" "проверьте local provider и повторите запуск"
}
$ProvisionResult = $ProvisionResultRaw | ConvertFrom-Json
if (
  $ProvisionResult.status -ne "GREEN_R555_LOCAL_DEVELOPER_PROVIDER_PRINCIPALS_9_OFFICE_PLUS_1_CONSUMER" -or
  [int]$ProvisionResult.green -ne 10 -or
  [int]$ProvisionResult.office_green -ne 9 -or
  [int]$ProvisionResult.consumer_green -ne 1
) {
  Fail-Preflight "LOCAL_DEVELOPER_PRINCIPAL_MATRIX_RED" "повторите безопасный local provisioning"
}

$BackendManager = Join-Path $Root "scripts\dev\ensureLocalDeveloperCanonicalBackend.ts"
$PreviousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$BackendManagerRaw = & $Node $TsxCli $BackendManager 2>$null
$BackendManagerExitCode = $LASTEXITCODE
$ErrorActionPreference = $PreviousErrorActionPreference
if ($BackendManagerExitCode -ne 0 -or -not $BackendManagerRaw) {
  Fail-Preflight "CANONICAL_BACKEND_MANAGER_RED" "проверьте exact runtime tuple, capability TTL и активные compile jobs"
}
$BackendManagerResult = $BackendManagerRaw | ConvertFrom-Json
if (
  $BackendManagerResult.status -ne "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT" -or
  [int]$BackendManagerResult.active_compile_jobs -ne 0 -or
  [int]$BackendManagerResult.production_requests -ne 0
) {
  Fail-Preflight "CANONICAL_BACKEND_MANAGER_RESULT_RED" "не используйте frontend до exact runtime-manifest GREEN"
}

$ReuseMetro = $MetroIdentityMatches -and
  [string]$MetroReceipt.definition_release_id -eq [string]$BackendManagerResult.definition_release_id -and
  [string]$MetroReceipt.search_release_id -eq [string]$BackendManagerResult.search_release_id -and
  [string]$MetroReceipt.capability_id -eq [string]$BackendManagerResult.capability_id
if ($ExistingMetroPid -gt 0 -and -not $ReuseMetro) {
  Stop-Process -Id $ExistingMetroPid -ErrorAction Stop
  $Deadline = (Get-Date).AddSeconds(10)
  while ((Get-Process -Id $ExistingMetroPid -ErrorAction SilentlyContinue) -and (Get-Date) -lt $Deadline) {
    Start-Sleep -Milliseconds 100
  }
  if (Get-Process -Id $ExistingMetroPid -ErrorAction SilentlyContinue) {
    Fail-Preflight "OWNED_METRO_STOP_TIMEOUT_PID_$ExistingMetroPid" "остановите exact Metro PID вручную"
  }
}

$BackendProbe = Join-Path $Root "scripts\dev\probeLocalDeveloperCanonicalBackend.ts"
$BackendProbeRaw = & $Node $TsxCli $BackendProbe 2>$null
if ($LASTEXITCODE -ne 0 -or -not $BackendProbeRaw) {
  Fail-Preflight "LOCAL_DEVELOPER_CANONICAL_BACKEND_RED" "проверьте provider principal RPC и backend 8765"
}
$BackendProbeResult = $BackendProbeRaw | ConvertFrom-Json
if (
  $BackendProbeResult.status -ne "GREEN_LOCAL_DEVELOPER_CANONICAL_BACKEND" -or
  [int]$BackendProbeResult.returned_items -lt 1 -or
  [int]$BackendProbeResult.ready_items -lt 1 -or
  [int]$BackendProbeResult.production_requests -ne 0
) {
  Fail-Preflight "LOCAL_DEVELOPER_CANONICAL_BACKEND_RESULT_RED" "восстановите поиск canonical backend"
}

# These variables live only in this wrapper and the one Metro child. Changing
# any EXPO_PUBLIC_* value therefore always follows the owned-Metro stop above.
$env:LOCAL_DEVELOPER_REVIEW = "1"
$env:EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW = "1"
$env:EXPO_PUBLIC_APP_ENV = "local_developer"
$env:EXPO_PUBLIC_RELEASE_LABEL = "LOCAL_DEVELOPMENT"
$env:EXPO_PUBLIC_SUPABASE_URL = $ApiUrl
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY = $PublicKey
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = $CanonicalBackendUrl
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK = "true"
$env:EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH = [string]$Identity.sourceTreeHash
$env:EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH = [string]$Identity.productSourceHash
$env:EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT = [string]$Identity.jsBundleFingerprint
$env:EXPO_PUBLIC_BUILD_COMMIT = $BuildCommit
$env:EXPO_PUBLIC_BUILD_BRANCH = $BuildBranch
$env:EXPO_PUBLIC_BUILD_TIME = (Get-Date).ToUniversalTime().ToString("o")
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID = [string]$BackendManagerResult.definition_release_id
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID = [string]$BackendManagerResult.search_release_id
$env:EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID = [string]$BackendManagerResult.capability_id

foreach ($SecretName in @(
  "SUPABASE_SERVICE_ROLE_KEY",
  "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "EXPO_PUBLIC_SUPABASE_SECRET_KEY"
)) {
  Remove-Item -LiteralPath "Env:\$SecretName" -ErrorAction SilentlyContinue
}

if ($ReuseMetro) {
  Write-Host "runtime_action=reuse_exact_healthy_runtime"
  Write-Host "backend_pid=$($BackendManagerResult.backend_pid)"
  Write-Host "metro_pid=$ExistingMetroPid"
  exit 0
}

$ExpoCli = Join-Path $Root "node_modules\expo\bin\cli"
if (-not (Test-Path -LiteralPath $ExpoCli)) {
  Fail-Preflight "EXPO_CLI_MISSING" "выполните npm install и повторите запуск"
}

$BrokerPort = 54329
$BrokerScript = Join-Path $Root "scripts\dev\serveLocalDeveloperAuthBroker.ts"
$BrokerListeners = @(Get-NetTCPConnection -LocalPort $BrokerPort -State Listen -ErrorAction SilentlyContinue)
foreach ($BrokerPid in @($BrokerListeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
  $BrokerOwner = Get-CimInstance Win32_Process -Filter "ProcessId=$BrokerPid" -ErrorAction SilentlyContinue
  if (-not $BrokerOwner) { continue }
  $BrokerCommand = [string]$BrokerOwner.CommandLine
  if (
    $BrokerOwner.Name -ne "node.exe" -or
    -not $BrokerCommand.Replace("\", "/").Contains($Root.Replace("\", "/")) -or
    $BrokerCommand -notmatch "serveLocalDeveloperAuthBroker\.ts"
  ) {
    Fail-Preflight "AUTH_BROKER_PORT_FOREIGN_OWNER_PID_$BrokerPid" "освободите порт 54329 после проверки владельца"
  }
  Stop-Process -Id $BrokerPid -ErrorAction Stop
}

$BrokerRuntime = Join-Path $Root ".release-runtime\r551\runtime\local-developer\broker"
New-Item -ItemType Directory -Path $BrokerRuntime -Force | Out-Null
$BrokerStdout = Join-Path $BrokerRuntime "stdout.log"
$BrokerStderr = Join-Path $BrokerRuntime "stderr.log"
$Broker = Start-Process -FilePath $Node -ArgumentList @(
  $TsxCli,
  $BrokerScript
) -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $BrokerStdout -RedirectStandardError $BrokerStderr -PassThru

$BrokerReady = $false
$BrokerDeadline = (Get-Date).AddSeconds(10)
while ((Get-Date) -lt $BrokerDeadline) {
  if ($Broker.HasExited) { break }
  try {
    $BrokerHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$BrokerPort/health" -TimeoutSec 1
    if ($BrokerHealth.status -eq "ready" -and [int]$BrokerHealth.principal_count -eq 10) {
      $BrokerReady = $true
      break
    }
  }
  catch {
    Start-Sleep -Milliseconds 150
  }
}
if (-not $BrokerReady) {
  if (-not $Broker.HasExited) { Stop-Process -Id $Broker.Id -ErrorAction SilentlyContinue }
  Fail-Preflight "LOCAL_DEVELOPER_AUTH_BROKER_RED" "проверьте broker stderr в .release-runtime/r551/runtime/local-developer/broker"
}
Write-Host "auth_broker_pid=$($Broker.Id)"

$MetroRuntime = Split-Path -Parent $MetroReceiptPath
New-Item -ItemType Directory -Path $MetroRuntime -Force | Out-Null
$MetroStdout = Join-Path $MetroRuntime "metro.stdout.log"
$MetroStderr = Join-Path $MetroRuntime "metro.stderr.log"
$Metro = Start-Process -FilePath $Node -ArgumentList @(
  $ExpoCli,
  "start",
  "--web",
  "--port",
  "$Port",
  "--clear"
) -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $MetroStdout -RedirectStandardError $MetroStderr -PassThru

$MetroReady = $false
$MetroDeadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $MetroDeadline) {
  if ($Metro.HasExited) { break }
  try {
    $MetroHealth = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/status" -TimeoutSec 2
    $MetroHealthContent = if ($MetroHealth.Content -is [byte[]]) {
      [System.Text.Encoding]::UTF8.GetString($MetroHealth.Content)
    }
    else {
      [string]$MetroHealth.Content
    }
    if ($MetroHealth.StatusCode -eq 200 -and $MetroHealthContent -match "packager-status:running") {
      $MetroReady = $true
      break
    }
  }
  catch {
    Start-Sleep -Milliseconds 250
  }
}
if (-not $MetroReady) {
  if (-not $Metro.HasExited) { Stop-Process -Id $Metro.Id -ErrorAction SilentlyContinue }
  if ($Broker -and -not $Broker.HasExited) { Stop-Process -Id $Broker.Id -ErrorAction SilentlyContinue }
  Fail-Preflight "LOCAL_DEVELOPER_METRO_START_RED" "проверьте metro stderr в runtime evidence"
}

@{
  schema_version = "rik-expo-app.r568.metro-runtime.v1"
  generated_utc = (Get-Date).ToUniversalTime().ToString("o")
  pid = $Metro.Id
  source_tree_hash = [string]$Identity.sourceTreeHash
  product_source_hash = [string]$Identity.productSourceHash
  js_bundle_fingerprint = [string]$Identity.jsBundleFingerprint
  build_commit = $BuildCommit
  definition_release_id = [string]$BackendManagerResult.definition_release_id
  search_release_id = [string]$BackendManagerResult.search_release_id
  capability_id = [string]$BackendManagerResult.capability_id
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $MetroReceiptPath -Encoding UTF8
Write-Host "runtime_action=started_exact_healthy_runtime"
Write-Host "backend_pid=$($BackendManagerResult.backend_pid)"
Write-Host "auth_broker_pid=$($Broker.Id)"
Write-Host "metro_pid=$($Metro.Id)"
exit 0
