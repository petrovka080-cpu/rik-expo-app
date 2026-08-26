param(
  [string]$Container = "rik-real-useful-before-batch004-r1",
  [string]$TemplateDatabase = "before_batch005008_audit",
  [string]$ProbeDatabase = "r3_human_acceptance_tenant_probe",
  [string]$EvidenceRoot = ".release-runtime/real-estimates-global-green-r3/evidence",
  [string]$OutputLabel = ""
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$MasterSha256 = "f617befe4fc22e6c9e4dbaa6ca276bd271b8f021a3cd8825610196471aef3820"
$R2Migration = "supabase/migrations/20260821130000_r2_technology_passport_human_acceptance.sql"
$R3Migration = "supabase/migrations/20260821140000_r3_technology_passport_tenant_acceptance.sql"
$BehaviorSql = "scripts/estimate/realUsefulEstimatesR3/technologyPassportAcceptanceR3Behavior.sql"
$SourceIdentityPath = Join-Path $EvidenceRoot "01_CURRENT_SOURCE_IDENTITY_R3.json"
$ProductManifestPath = Join-Path $EvidenceRoot "02_CURRENT_PRODUCT_SOURCE_MANIFEST_R3.json"
if ($OutputLabel -notin @("","_REPEAT_A")) { throw "R3_SQL_PROBE_OUTPUT_LABEL_INVALID:$OutputLabel" }
$BehaviorOutputPath = Join-Path $EvidenceRoot "28_HUMAN_ACCEPTANCE_PROMOTION_SQL_BEHAVIOR_R3$OutputLabel.json"
$RlsOutputPath = Join-Path $EvidenceRoot "29_HUMAN_ACCEPTANCE_RLS_TENANT_R3$OutputLabel.json"

function Invoke-Docker {
  param([string[]]$Arguments, [string]$InputText = $null, [switch]$AllowFailure)
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = if ($null -eq $InputText) {
      @(& docker @Arguments 2>&1)
    } else {
      @($InputText | & docker @Arguments 2>&1)
    }
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
  $result = [ordered]@{ exit_code = $exitCode; output = ($output -join "`n").Trim() }
  if (-not $AllowFailure -and $exitCode -ne 0) {
    throw "docker $($Arguments -join ' ') failed:`n$($result.output)"
  }
  return $result
}

function Get-Sha256 {
  param([string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Write-JsonUtf8 {
  param([string]$Path, [object]$Value)
  $absolute = [System.IO.Path]::GetFullPath($Path)
  $parent = Split-Path -Parent $absolute
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  [System.IO.File]::WriteAllText(
    $absolute,
    (($Value | ConvertTo-Json -Depth 100) + "`n"),
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Assert-SealedSourceFile {
  param([object]$Manifest, [string]$Path)
  $normalized = $Path.Replace("\", "/")
  $entry = @($Manifest.files | Where-Object path -eq $normalized)
  if ($entry.Count -ne 1) { throw "R3_SOURCE_MANIFEST_ENTRY_MISSING:$normalized" }
  if ((Get-Sha256 $Path) -ne $entry[0].sha256) { throw "R3_SOURCE_MANIFEST_FILE_DRIFT:$normalized" }
}

function New-ConcurrentDecisionSql {
  param(
    [string]$SupersedesId,
    [string]$Decision,
    [string]$Signature,
    [string]$ManifestSha,
    [string]$Timestamp
  )
  return @"
\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',false);
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
select * from public.estimate_record_technology_acceptance_r3(
  jsonb_build_object(
    'contract','real-useful-estimates.technology-passport-human-acceptance-r3.v1',
    'tenantId','11111111-1111-4111-8111-111111111111',
    'definitionVersionId','a3b65bd6-bb8b-49a2-9fa1-44799d5ad675',
    'releaseId','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'catalogId','drywall_ceiling_interior_bulkhead_install_high_load',
    'technologyVariantId','variant-r3-tenant-proof',
    'definitionSha256','077b26bfc987482e8111962ce4bd8ab206cf56a5df9d42c4535e2b7e064df2d3',
    'passportContentSha256','d'||repeat('0',63),
    'sourceSetSha256','e'||repeat('0',63),
    'authorId','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'reviewerId','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'reviewerRole','engineer','reviewerScope','drywall-systems',
    'decision','$Decision','comment','Concurrent deterministic winner probe',
    'signatureOrAuditId','$Signature','acceptanceOrigin','HUMAN_SIGNED_AUDIT',
    'createdByAgent',false,'createdAtUtc','$Timestamp','decidedAtUtc','$Timestamp',
    'invalidatedAtUtc',null,'supersedesAcceptanceId','$SupersedesId'
  ),'$ManifestSha'
);
"@
}

if ($TemplateDatabase -ne "before_batch005008_audit") {
  throw "R3_SQL_PROBE_TEMPLATE_NOT_ALLOWLISTED:$TemplateDatabase"
}
if ($ProbeDatabase -notmatch '^r3_human_acceptance_[a-z0-9_]+$') {
  throw "R3_SQL_PROBE_DATABASE_NAME_UNSAFE:$ProbeDatabase"
}
foreach ($path in @($R2Migration,$R3Migration,$BehaviorSql,$SourceIdentityPath,$ProductManifestPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "R3_SQL_PROBE_INPUT_MISSING:$path" }
}

$sourceIdentity = Get-Content -Raw -Encoding UTF8 -LiteralPath $SourceIdentityPath | ConvertFrom-Json
$productManifest = Get-Content -Raw -Encoding UTF8 -LiteralPath $ProductManifestPath | ConvertFrom-Json
if ($sourceIdentity.status -ne "R3_SOURCE_IDENTITY_GREEN") { throw "R3_SQL_PROBE_SOURCE_IDENTITY_NOT_GREEN" }
if ($sourceIdentity.master_contract.sha256 -ne $MasterSha256) { throw "R3_SQL_PROBE_MASTER_SHA_DRIFT" }
Assert-SealedSourceFile -Manifest $productManifest -Path $R2Migration
Assert-SealedSourceFile -Manifest $productManifest -Path $R3Migration
Assert-SealedSourceFile -Manifest $productManifest -Path $BehaviorSql
$repoRoot = (& git rev-parse --show-toplevel).Trim().Replace("/", "\")
$toolRelative = $MyInvocation.MyCommand.Path.Substring($repoRoot.Length).TrimStart("\").Replace("\", "/")
Assert-SealedSourceFile -Manifest $productManifest -Path $toolRelative

$running = (Invoke-Docker @("inspect","--format","{{.State.Running}}",$Container)).output
if ($running -ne "true") { throw "R3_SQL_PROBE_CONTAINER_NOT_RUNNING:$Container" }
$templateExists = (Invoke-Docker @(
  "exec",$Container,"psql","-X","-U","postgres","-d","postgres","-Atc",
  "select count(*) from pg_database where datname='$TemplateDatabase'"
)).output
if ($templateExists -ne "1") { throw "R3_SQL_PROBE_TEMPLATE_MISSING:$TemplateDatabase" }
$probeExists = (Invoke-Docker @(
  "exec",$Container,"psql","-X","-U","postgres","-d","postgres","-Atc",
  "select count(*) from pg_database where datname='$ProbeDatabase'"
)).output
if ($probeExists -ne "0") { throw "R3_SQL_PROBE_REFUSES_EXISTING_DATABASE:$ProbeDatabase" }

$created = $false
$removed = $false
$postgresVersion = $null
$rollbackGreen = $false
$behaviorSentinel = $null
$concurrency = $null
$policyCount = $null
try {
  Invoke-Docker @("exec",$Container,"createdb","-U","postgres","-T",$TemplateDatabase,$ProbeDatabase) | Out-Null
  $created = $true
  Invoke-Docker @(
    "exec",$Container,"psql","-X","-U","postgres","-d","postgres","-c",
    "alter database $ProbeDatabase set default_transaction_read_only=off"
  ) | Out-Null
  $postgresVersion = (Invoke-Docker @(
    "exec",$Container,"psql","-X","-U","postgres","-d",$ProbeDatabase,"-Atc","show server_version"
  )).output

  $r2Sql = Get-Content -Raw -Encoding UTF8 -LiteralPath $R2Migration
  Invoke-Docker @(
    "exec","-i",$Container,"psql","-X","-q","-v","ON_ERROR_STOP=1","-U","postgres","-d",$ProbeDatabase
  ) $r2Sql | Out-Null

  $r3Sql = Get-Content -Raw -Encoding UTF8 -LiteralPath $R3Migration
  $rollbackSql = [regex]::Replace($r3Sql,'(?is)commit;\s*$','rollback;')
  Invoke-Docker @(
    "exec","-i",$Container,"psql","-X","-q","-v","ON_ERROR_STOP=1","-U","postgres","-d",$ProbeDatabase
  ) $rollbackSql | Out-Null
  $afterRollback = (Invoke-Docker @(
    "exec",$Container,"psql","-X","-U","postgres","-d",$ProbeDatabase,"-Atc",
    "select to_regclass('public.estimate_technology_passport_acceptance_r3') is null"
  )).output
  if ($afterRollback -ne "t") { throw "R3_SQL_PROBE_ROLLBACK_LEFT_SCHEMA" }
  $rollbackGreen = $true

  Invoke-Docker @(
    "exec","-i",$Container,"psql","-X","-q","-v","ON_ERROR_STOP=1","-U","postgres","-d",$ProbeDatabase
  ) $r3Sql | Out-Null

  $behaviorSqlText = Get-Content -Raw -Encoding UTF8 -LiteralPath $BehaviorSql
  $behaviorOutput = (Invoke-Docker @(
    "exec","-i",$Container,"psql","-X","-q","-t","-A","-v","ON_ERROR_STOP=1",
    "-U","postgres","-d",$ProbeDatabase
  ) $behaviorSqlText).output
  $behaviorSentinel = @($behaviorOutput -split "`r?`n" |
    Where-Object { $_ -like "R3_TENANT_ACCEPTANCE_BEHAVIOR_GREEN|*" } | Select-Object -Last 1)
  if ($behaviorSentinel.Count -ne 1) { throw "R3_SQL_PROBE_BEHAVIOR_SENTINEL_MISSING:$behaviorOutput" }

  $latestAcceptanceId = (Invoke-Docker @(
    "exec",$Container,"psql","-X","-U","postgres","-d",$ProbeDatabase,"-Atc",
    "select acceptance_id from public.estimate_technology_passport_acceptance_r3 where tenant_id='11111111-1111-4111-8111-111111111111' order by decision_sequence desc limit 1"
  )).output
  if ($latestAcceptanceId -notmatch '^[0-9a-f-]{36}$') { throw "R3_SQL_PROBE_CURRENT_ACCEPTANCE_MISSING" }

  $sqlA = New-ConcurrentDecisionSql -SupersedesId $latestAcceptanceId -Decision "NEEDS_CHANGES" `
    -Signature "r3-concurrent-a" -ManifestSha ("f0" + ("0"*62)) -Timestamp "2026-08-21T13:20:00.000Z"
  $sqlB = New-ConcurrentDecisionSql -SupersedesId $latestAcceptanceId -Decision "REJECTED" `
    -Signature "r3-concurrent-b" -ManifestSha ("f1" + ("0"*62)) -Timestamp "2026-08-21T13:20:00.000Z"
  $jobScript = {
    param($ContainerName,$DatabaseName,$Sql)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $lines = @($Sql | & docker exec -i $ContainerName psql -X -q -t -A -v ON_ERROR_STOP=1 -U postgres -d $DatabaseName 2>&1)
      $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previous }
    [pscustomobject]@{ exit_code = $code; output = ($lines -join "`n").Trim() }
  }
  $jobA = Start-Job -ScriptBlock $jobScript -ArgumentList $Container,$ProbeDatabase,$sqlA
  $jobB = Start-Job -ScriptBlock $jobScript -ArgumentList $Container,$ProbeDatabase,$sqlB
  $done = @(Wait-Job -Job @($jobA,$jobB) -Timeout 60)
  if ($done.Count -ne 2) {
    Stop-Job -Job @($jobA,$jobB) -ErrorAction SilentlyContinue
    throw "R3_SQL_PROBE_CONCURRENCY_TIMEOUT"
  }
  $results = @(@($jobA,$jobB) | Receive-Job)
  Remove-Job -Job @($jobA,$jobB) -Force
  $successes = @($results | Where-Object exit_code -eq 0)
  $failures = @($results | Where-Object exit_code -ne 0)
  if ($successes.Count -ne 1 -or $failures.Count -ne 1 -or
      $failures[0].output -notmatch 'ESTIMATE_TECHNOLOGY_R3_STALE_SUPERSEDES') {
    throw "R3_SQL_PROBE_CONCURRENCY_WINNER_INVALID:$($results | ConvertTo-Json -Depth 5)"
  }
  $concurrentRows = (Invoke-Docker @(
    "exec",$Container,"psql","-X","-U","postgres","-d",$ProbeDatabase,"-Atc",
    "select count(*) from public.estimate_technology_passport_acceptance_r3 where manifest_sha256 in ('f0'||repeat('0',62),'f1'||repeat('0',62))"
  )).output
  if ($concurrentRows -ne "1") { throw "R3_SQL_PROBE_CONCURRENT_DECISION_COUNT:$concurrentRows" }
  $concurrency = [ordered]@{
    attempts = 2
    committed_winners = 1
    stale_losers = 1
    current_decision_rows = [int]$concurrentRows
    winner_output = $successes[0].output
    loser_error = $failures[0].output
  }

  $policyCount = (Invoke-Docker @(
    "exec",$Container,"psql","-X","-U","postgres","-d",$ProbeDatabase,"-Atc",
    "select count(*) from pg_policies where schemaname='public' and tablename in ('estimate_technology_engineer_authorization_r3','estimate_technology_passport_r3','estimate_technology_passport_acceptance_r3') and roles='{authenticated}' and cmd='SELECT'"
  )).output
  if ($policyCount -ne "3") { throw "R3_SQL_PROBE_RLS_POLICY_COUNT:$policyCount" }
} finally {
  if ($created) {
    Invoke-Docker @("exec",$Container,"dropdb","--force","-U","postgres",$ProbeDatabase) | Out-Null
    $remaining = (Invoke-Docker @(
      "exec",$Container,"psql","-X","-U","postgres","-d","postgres","-Atc",
      "select count(*) from pg_database where datname='$ProbeDatabase'"
    )).output
    $removed = $remaining -eq "0"
  }
}

if (-not $removed) { throw "R3_SQL_PROBE_DATABASE_NOT_REMOVED:$ProbeDatabase" }

$common = [ordered]@{
  generated_at_utc = [DateTime]::UtcNow.ToString("o")
  master_contract_sha256 = $MasterSha256
  parent_source_identity_sha256 = Get-Sha256 $SourceIdentityPath
  exact_product_source_sha256 = $sourceIdentity.hashes.product_source_sha256
  tool = [ordered]@{ path = $toolRelative; sha256 = Get-Sha256 $toolRelative }
  inputs = [ordered]@{
    r2_migration = [ordered]@{ path = $R2Migration; sha256 = Get-Sha256 $R2Migration }
    r3_migration = [ordered]@{ path = $R3Migration; sha256 = Get-Sha256 $R3Migration }
    behavior_sql = [ordered]@{ path = $BehaviorSql; sha256 = Get-Sha256 $BehaviorSql }
  }
  postgres_version = $postgresVersion
  source = [ordered]@{
    container = $Container
    frozen_template_database = $TemplateDatabase
    frozen_template_mutated = $false
    production_accessed = $false
  }
  temporary_probe_database = [ordered]@{
    name = $ProbeDatabase
    created = $created
    removed = $removed
  }
}

$behaviorEvidence = [ordered]@{
  schema_version = "real-estimates-global-green-r3.human-acceptance-promotion-sql-behavior.v1"
  generated_at_utc = $common.generated_at_utc
  master_contract_sha256 = $common.master_contract_sha256
  parent_source_identity_sha256 = $common.parent_source_identity_sha256
  exact_product_source_sha256 = $common.exact_product_source_sha256
  tool = $common.tool
  inputs = $common.inputs
  postgres_version = $postgresVersion
  compile_rollback_green = $rollbackGreen
  isolated_applied_schema_green = $true
  checks = @(
    "AUTHOR_CANNOT_SELF_APPROVE","NON_ENGINEER_CANNOT_ACCEPT","SIGNATURE_REQUIRED",
    "EXACT_HASH_ACCEPTANCE_ALLOWED","IDEMPOTENT_REPLAY_NO_DUPLICATE",
    "NEEDS_CHANGES_BLOCKS_ADMISSION","REJECTED_BLOCKS_ADMISSION",
    "PASSPORT_HASH_DRIFT_RESETS_DRAFT","SOURCE_HASH_DRIFT_RESETS_DRAFT",
    "REVOKED_REVIEWER_BLOCKS_ADMISSION","HISTORICAL_ACCEPTANCE_APPEND_ONLY_AUDITABLE",
    "UNSCOPED_ADMISSION_ALWAYS_FALSE","TENANT_SCOPED_ADMISSION_GREEN",
    "CONCURRENT_DECISIONS_ONE_DETERMINISTIC_SEQUENCE_WINNER"
  )
  behavior_sentinel = $behaviorSentinel[0]
  concurrency = $concurrency
  source = $common.source
  temporary_probe_database = $common.temporary_probe_database
  status = "GREEN_R3_HUMAN_ACCEPTANCE_SQL_BEHAVIOR"
  global_status = "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE"
}
Write-JsonUtf8 -Path $BehaviorOutputPath -Value $behaviorEvidence

$rlsEvidence = [ordered]@{
  schema_version = "real-estimates-global-green-r3.human-acceptance-rls-tenant.v1"
  generated_at_utc = $common.generated_at_utc
  master_contract_sha256 = $common.master_contract_sha256
  parent_source_identity_sha256 = $common.parent_source_identity_sha256
  exact_product_source_sha256 = $common.exact_product_source_sha256
  tool = $common.tool
  inputs = $common.inputs
  forced_rls_tables = @(
    "estimate_technology_engineer_authorization_r3",
    "estimate_technology_passport_r3",
    "estimate_technology_passport_acceptance_r3",
    "estimate_technology_acceptance_security_audit_r3"
  )
  authenticated_select_policy_count = [int]$policyCount
  authenticated_direct_write = "BLOCKED"
  wrong_tenant_read = "BLOCKED"
  wrong_tenant_write = "BLOCKED"
  service_role_direct_table_insert_privilege = $false
  service_role_product_rpc = "LOGGED_AND_BLOCKED"
  authorization_revocation = "FAIL_CLOSED"
  concurrency = $concurrency
  source = $common.source
  temporary_probe_database = $common.temporary_probe_database
  status = "GREEN_R3_HUMAN_ACCEPTANCE_RLS_TENANT"
  global_status = "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE"
}
Write-JsonUtf8 -Path $RlsOutputPath -Value $rlsEvidence

[ordered]@{
  status = "GREEN_R3_HUMAN_ACCEPTANCE_SQL_AND_RLS"
  behavior_evidence = $BehaviorOutputPath
  rls_evidence = $RlsOutputPath
  source_identity_sha256 = $common.parent_source_identity_sha256
  product_source_sha256 = $common.exact_product_source_sha256
  compile_rollback_green = $rollbackGreen
  behavior_sentinel = $behaviorSentinel[0]
  concurrency = $concurrency
  probe_removed = $removed
  production_accessed = $false
} | ConvertTo-Json -Depth 20
