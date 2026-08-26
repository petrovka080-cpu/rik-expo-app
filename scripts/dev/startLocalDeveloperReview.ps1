param(
  [switch]$PreflightOnly
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Fail-Preflight([string]$Code, [string]$Recovery) {
  Write-Error "LOCAL_DEVELOPER_PREFLIGHT_RED: $Code`nВосстановление: $Recovery"
  exit 1
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
$PublicKey = if ([string]$Provider.PUBLISHABLE_KEY) {
  [string]$Provider.PUBLISHABLE_KEY
}
else {
  [string]$Provider.ANON_KEY
}
$ForbiddenKeys = @([string]$Provider.SERVICE_ROLE_KEY, [string]$Provider.SECRET_KEY) |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

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
$BackendListeners = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
if ($BackendListeners.Count -ne 1) {
  Fail-Preflight "CANONICAL_BACKEND_LISTENER_RED" "запустите один canonical estimate backend на 127.0.0.1:8765"
}
$BackendPid = [int]$BackendListeners[0].OwningProcess
$BackendOwner = Get-CimInstance Win32_Process -Filter "ProcessId=$BackendPid" -ErrorAction SilentlyContinue
if (
  -not $BackendOwner -or
  $BackendOwner.Name -ne "node.exe" -or
  [string]$BackendOwner.CommandLine -notmatch "serveCanonicalEstimateLocalR1\.ts"
) {
  Fail-Preflight "CANONICAL_BACKEND_OWNER_RED_PID_$BackendPid" "проверьте exact owner порта 8765"
}
try {
  Invoke-WebRequest -UseBasicParsing -Uri "$CanonicalBackendUrl/search/catalog?query=preflight&pageSize=1" -TimeoutSec 5 | Out-Null
  Fail-Preflight "CANONICAL_BACKEND_AUTH_GUARD_RED" "backend обязан отклонять запрос без provider session"
}
catch {
  $BackendResponse = $_.Exception.Response
  if (-not $BackendResponse -or [int]$BackendResponse.StatusCode -ne 401) {
    Fail-Preflight "CANONICAL_BACKEND_PREFLIGHT_RED" "восстановите strict-session backend на порту 8765"
  }
}

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

$Port = 8081
$ExistingListeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
$ExistingPids = @($ExistingListeners | Select-Object -ExpandProperty OwningProcess -Unique)
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
  if (-not $PreflightOnly) {
    Stop-Process -Id $ExistingPid -ErrorAction Stop
    $Deadline = (Get-Date).AddSeconds(10)
    while ((Get-Process -Id $ExistingPid -ErrorAction SilentlyContinue) -and (Get-Date) -lt $Deadline) {
      Start-Sleep -Milliseconds 100
    }
    if (Get-Process -Id $ExistingPid -ErrorAction SilentlyContinue) {
      Fail-Preflight "OWNED_METRO_STOP_TIMEOUT_PID_$ExistingPid" "остановите exact Metro PID вручную"
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

$BackendProbe = Join-Path $Root "scripts\dev\probeLocalDeveloperCanonicalBackend.ts"
$BackendProbeRaw = & $Node $TsxCli $BackendProbe 2>$null
if ($LASTEXITCODE -ne 0 -or -not $BackendProbeRaw) {
  Fail-Preflight "LOCAL_DEVELOPER_CANONICAL_BACKEND_RED" "проверьте provider principal RPC и backend 8765"
}
$BackendProbeResult = $BackendProbeRaw | ConvertFrom-Json
if (
  $BackendProbeResult.status -ne "GREEN_LOCAL_DEVELOPER_CANONICAL_BACKEND" -or
  [int]$BackendProbeResult.returned_items -lt 1 -or
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
$env:EXPO_PUBLIC_BUILD_COMMIT = (& git -C $Root rev-parse HEAD).Trim()
$env:EXPO_PUBLIC_BUILD_BRANCH = (& git -C $Root branch --show-current).Trim()
$env:EXPO_PUBLIC_BUILD_TIME = (Get-Date).ToUniversalTime().ToString("o")

foreach ($SecretName in @(
  "SUPABASE_SERVICE_ROLE_KEY",
  "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "EXPO_PUBLIC_SUPABASE_SECRET_KEY"
)) {
  Remove-Item -LiteralPath "Env:\$SecretName" -ErrorAction SilentlyContinue
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

try {
  $Metro = Start-Process -FilePath $Node -ArgumentList @(
    $ExpoCli,
    "start",
    "--web",
    "--port",
    "$Port",
    "--clear"
  ) -WorkingDirectory $Root -NoNewWindow -PassThru
  Write-Host "metro_pid=$($Metro.Id)"
  $Metro.WaitForExit()
  $MetroExitCode = $Metro.ExitCode
}
finally {
  if ($Broker -and -not $Broker.HasExited) {
    Stop-Process -Id $Broker.Id -ErrorAction SilentlyContinue
  }
}
exit $MetroExitCode
