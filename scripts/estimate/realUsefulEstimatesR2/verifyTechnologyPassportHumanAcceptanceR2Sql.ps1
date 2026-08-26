param(
  [string]$Container = "rik-real-useful-before-batch004-r1",
  [string]$TemplateDatabase = "before_batch005008_audit",
  [string]$ProbeDatabase = "r2_human_acceptance_probe_phase4",
  [string]$Output = ".release-runtime/real-useful-estimates-r2/evidence/phase4-platform/SQL_BEHAVIOR_PROBE_R2.json"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Migration = "supabase/migrations/20260821130000_r2_technology_passport_human_acceptance.sql"
$Fixture = [ordered]@{
  definition_version_id = "a3b65bd6-bb8b-49a2-9fa1-44799d5ad675"
  release_id = "b28fdda9-e55f-4629-bba8-24ff15e7d8b6"
  catalog_id = "drywall_ceiling_interior_bulkhead_install_high_load"
}

function Invoke-Docker {
  param([string[]]$Arguments, [string]$InputText = $null)
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = if ($null -eq $InputText) {
      @(& docker @Arguments 2>&1)
    } else {
      @($InputText | & docker @Arguments 2>&1)
    }
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne 0) {
    throw "docker $($Arguments -join ' ') failed:`n$($output -join "`n")"
  }
  return ($output -join "`n").Trim()
}

function Write-JsonUtf8 {
  param([string]$Path, [object]$Value)
  $absolute = [System.IO.Path]::GetFullPath($Path)
  $parent = Split-Path -Parent $absolute
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  [System.IO.File]::WriteAllText(
    $absolute,
    (($Value | ConvertTo-Json -Depth 30) + "`n"),
    [System.Text.UTF8Encoding]::new($false)
  )
}

if ($TemplateDatabase -ne "before_batch005008_audit") {
  throw "R2_SQL_PROBE_TEMPLATE_NOT_ALLOWLISTED:$TemplateDatabase"
}
if ($ProbeDatabase -notmatch '^r2_human_acceptance_probe_[a-z0-9_]+$') {
  throw "R2_SQL_PROBE_DATABASE_NAME_UNSAFE:$ProbeDatabase"
}
if (-not (Test-Path -LiteralPath $Migration -PathType Leaf)) {
  throw "R2_SQL_PROBE_MIGRATION_MISSING:$Migration"
}

$containerRunning = Invoke-Docker @("inspect", "--format", "{{.State.Running}}", $Container)
if ($containerRunning -ne "true") { throw "R2_SQL_PROBE_CONTAINER_NOT_RUNNING:$Container" }
$templateExists = Invoke-Docker @(
  "exec", $Container, "psql", "-X", "-U", "postgres", "-d", "postgres", "-Atc",
  "select count(*) from pg_database where datname='$TemplateDatabase'"
)
if ($templateExists -ne "1") { throw "R2_SQL_PROBE_TEMPLATE_MISSING:$TemplateDatabase" }
$probeExists = Invoke-Docker @(
  "exec", $Container, "psql", "-X", "-U", "postgres", "-d", "postgres", "-Atc",
  "select count(*) from pg_database where datname='$ProbeDatabase'"
)
if ($probeExists -ne "0") { throw "R2_SQL_PROBE_REFUSES_EXISTING_DATABASE:$ProbeDatabase" }

$created = $false
$removed = $false
$postgresVersion = $null
$behaviorOutput = $null
try {
  Invoke-Docker @("exec", $Container, "createdb", "-U", "postgres", "-T", $TemplateDatabase, $ProbeDatabase) | Out-Null
  $created = $true
  Invoke-Docker @(
    "exec", $Container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-c",
    "alter database $ProbeDatabase set default_transaction_read_only=off"
  ) | Out-Null
  $postgresVersion = Invoke-Docker @(
    "exec", $Container, "psql", "-X", "-U", "postgres", "-d", $ProbeDatabase, "-Atc", "show server_version"
  )
  $fixtureCount = Invoke-Docker @(
    "exec", $Container, "psql", "-X", "-U", "postgres", "-d", $ProbeDatabase, "-Atc",
    "select count(*) from public.estimate_cumulative_manifest_entry where definition_version_id='$($Fixture.definition_version_id)' and release_id='$($Fixture.release_id)' and catalog_id='$($Fixture.catalog_id)'"
  )
  if ($fixtureCount -ne "1") { throw "R2_SQL_PROBE_FIXTURE_BINDING_MISSING" }

  $migrationSql = Get-Content -LiteralPath $Migration -Raw -Encoding UTF8
  Invoke-Docker @(
    "exec", "-i", $Container, "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", $ProbeDatabase
  ) $migrationSql | Out-Null

  $behaviorSql = @'
\set ON_ERROR_STOP on
begin;
alter table public.estimate_definition_version disable trigger estimate_definition_version_immutable_trg;

do $$
begin
  if public.estimate_technology_passport_exact_accepted_r2(
    'b28fdda9-e55f-4629-bba8-24ff15e7d8b6','drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'DRAFT_WITHOUT_MANIFEST_WAS_ACCEPTED'; end if;
  begin
    update public.estimate_definition_version set content_gate_status=content_gate_status
    where id='a3b65bd6-bb8b-49a2-9fa1-44799d5ad675';
    raise exception 'PROMOTION_WITHOUT_PASSPORT_WAS_ALLOWED';
  exception when sqlstate '55000' then
    if sqlerrm<>'ESTIMATE_TECHNOLOGY_R2_HUMAN_ACCEPTANCE_MISSING' then raise; end if;
  end;
end
$$;

insert into public.estimate_technology_passport_r2 (
  definition_version_id,release_id,catalog_id,technology_variant_id,contract_version,
  passport_content_sha256,source_set_sha256,author_audit_identity,author_role,
  authorship_origin,author_created_by_agent,status,passport_payload,source_claims,validator_decision
) values (
  'a3b65bd6-bb8b-49a2-9fa1-44799d5ad675','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
  'drywall_ceiling_interior_bulkhead_install_high_load','variant-r2-probe',
  'real-useful-estimates.technology-passport-candidate-r2.v1',repeat('a',64),repeat('b',64),
  'passport-author-42','ENGINEER','HUMAN_ENGINEERING_WORKFLOW',false,'DRAFT',
  jsonb_build_object('catalogId','drywall_ceiling_interior_bulkhead_install_high_load','technologyVariantId','variant-r2-probe'),
  jsonb_build_array(jsonb_build_object('claimId','claim-1')),
  jsonb_build_object('contract','real-useful-estimates.technology-passport-human-acceptance-r2.v1',
    'allowed',false,'status','DRAFT','passportContentSha256',repeat('a',64),'sourceSetSha256',repeat('b',64))
);

do $$
begin
  begin
    insert into public.estimate_technology_passport_acceptance_r2 (
      definition_version_id,release_id,catalog_id,technology_variant_id,contract_version,
      passport_content_sha256,source_set_sha256,reviewer_id,reviewer_role,reviewer_scope,
      decision,review_comment,accepted_at_utc,signature_or_audit_id,acceptance_origin,
      created_by_agent,manifest_payload,manifest_sha256
    ) values (
      'a3b65bd6-bb8b-49a2-9fa1-44799d5ad675','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
      'drywall_ceiling_interior_bulkhead_install_high_load','variant-r2-probe',
      'real-useful-estimates.technology-passport-human-acceptance-r2.v1',repeat('a',64),repeat('b',64),
      'passport-author-42','engineer','probe scope','ACCEPTED','probe review',
      '2026-08-21T12:00:00.000Z','engineering-audit-self-review','HUMAN_SIGNED_AUDIT',false,
      jsonb_build_object('contract','real-useful-estimates.technology-passport-human-acceptance-r2.v1',
        'catalogId','drywall_ceiling_interior_bulkhead_install_high_load','technologyVariantId','variant-r2-probe',
        'passportContentSha256',repeat('a',64),'sourceSetSha256',repeat('b',64),
        'reviewerId','passport-author-42','reviewerRole','engineer','decision','ACCEPTED',
        'signatureOrAuditId','engineering-audit-self-review','acceptanceOrigin','HUMAN_SIGNED_AUDIT','createdByAgent',false),
      repeat('c',64)
    );
    raise exception 'SELF_REVIEW_WAS_ALLOWED';
  exception when sqlstate '55000' then
    if sqlerrm<>'ESTIMATE_TECHNOLOGY_R2_AUTHOR_REVIEWER_COLLISION' then raise; end if;
  end;
end
$$;

insert into public.estimate_technology_passport_acceptance_r2 (
  definition_version_id,release_id,catalog_id,technology_variant_id,contract_version,
  passport_content_sha256,source_set_sha256,reviewer_id,reviewer_role,reviewer_scope,
  decision,review_comment,accepted_at_utc,signature_or_audit_id,acceptance_origin,
  created_by_agent,manifest_payload,manifest_sha256
) values (
  'a3b65bd6-bb8b-49a2-9fa1-44799d5ad675','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
  'drywall_ceiling_interior_bulkhead_install_high_load','variant-r2-probe',
  'real-useful-estimates.technology-passport-human-acceptance-r2.v1',repeat('a',64),repeat('b',64),
  'independent-reviewer-84','engineer','drywall systems','ACCEPTED','independent review passed',
  '2026-08-21T12:00:00.000Z','engineering-audit-20260821-0001','HUMAN_SIGNED_AUDIT',false,
  jsonb_build_object('contract','real-useful-estimates.technology-passport-human-acceptance-r2.v1',
    'catalogId','drywall_ceiling_interior_bulkhead_install_high_load','technologyVariantId','variant-r2-probe',
    'passportContentSha256',repeat('a',64),'sourceSetSha256',repeat('b',64),
    'reviewerId','independent-reviewer-84','reviewerRole','engineer','decision','ACCEPTED',
    'signatureOrAuditId','engineering-audit-20260821-0001','acceptanceOrigin','HUMAN_SIGNED_AUDIT','createdByAgent',false),
  repeat('d',64)
);

update public.estimate_technology_passport_r2
set status='ENGINEER_ACCEPTED',validator_decision=jsonb_build_object(
  'contract','real-useful-estimates.technology-passport-human-acceptance-r2.v1',
  'allowed',true,'status','ENGINEER_ACCEPTED','passportContentSha256',repeat('a',64),'sourceSetSha256',repeat('b',64))
where definition_version_id='a3b65bd6-bb8b-49a2-9fa1-44799d5ad675';

do $$
begin
  if not public.estimate_technology_passport_exact_accepted_r2(
    'b28fdda9-e55f-4629-bba8-24ff15e7d8b6','drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'EXACT_SIGNED_ACCEPTANCE_WAS_NOT_ACCEPTED'; end if;
end
$$;

update public.estimate_definition_version set content_gate_status=content_gate_status
where id='a3b65bd6-bb8b-49a2-9fa1-44799d5ad675';

update public.estimate_technology_passport_r2
set passport_content_sha256=repeat('e',64),validator_decision=jsonb_build_object(
  'contract','real-useful-estimates.technology-passport-human-acceptance-r2.v1',
  'allowed',true,'status','ENGINEER_ACCEPTED','passportContentSha256',repeat('e',64),'sourceSetSha256',repeat('b',64))
where definition_version_id='a3b65bd6-bb8b-49a2-9fa1-44799d5ad675';

do $$
declare v_status text; v_allowed text; v_decision_status text;
begin
  select status,validator_decision->>'allowed',validator_decision->>'status'
  into v_status,v_allowed,v_decision_status from public.estimate_technology_passport_r2
  where definition_version_id='a3b65bd6-bb8b-49a2-9fa1-44799d5ad675';
  if v_status<>'DRAFT' or v_allowed<>'false' or v_decision_status<>'DRAFT' then
    raise exception 'HASH_DRIFT_DID_NOT_RESET_ACCEPTANCE';
  end if;
  if public.estimate_technology_passport_exact_accepted_r2(
    'b28fdda9-e55f-4629-bba8-24ff15e7d8b6','drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'STALE_ACCEPTANCE_REMAINED_EXACT'; end if;
  begin
    update public.estimate_definition_version set content_gate_status=content_gate_status
    where id='a3b65bd6-bb8b-49a2-9fa1-44799d5ad675';
    raise exception 'PROMOTION_AFTER_HASH_DRIFT_WAS_ALLOWED';
  exception when sqlstate '55000' then
    if sqlerrm<>'ESTIMATE_TECHNOLOGY_R2_HUMAN_ACCEPTANCE_MISSING' then raise; end if;
  end;
end
$$;

do $$
begin
  begin
    delete from public.estimate_technology_passport_acceptance_r2
    where definition_version_id='a3b65bd6-bb8b-49a2-9fa1-44799d5ad675';
    raise exception 'ACCEPTANCE_DELETE_WAS_ALLOWED';
  exception when sqlstate '55000' then
    if sqlerrm<>'ESTIMATE_TECHNOLOGY_R2_ACCEPTANCE_IMMUTABLE' then raise; end if;
  end;
end
$$;

select 'R2_HUMAN_ACCEPTANCE_BEHAVIOR_GREEN' || '|' || count(*)::text
from public.estimate_technology_passport_acceptance_r2;
rollback;
'@
  $behaviorOutput = Invoke-Docker @(
    "exec", "-i", $Container, "psql", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", $ProbeDatabase
  ) $behaviorSql
  if (($behaviorOutput -split "`r?`n" | Where-Object { $_ -like "R2_HUMAN_ACCEPTANCE_BEHAVIOR_GREEN|*" } | Select-Object -Last 1) -ne
      "R2_HUMAN_ACCEPTANCE_BEHAVIOR_GREEN|1") {
    throw "R2_SQL_PROBE_BEHAVIOR_SENTINEL_MISSING:$behaviorOutput"
  }
} finally {
  if ($created) {
    Invoke-Docker @("exec", $Container, "dropdb", "--force", "-U", "postgres", $ProbeDatabase) | Out-Null
    $remaining = Invoke-Docker @(
      "exec", $Container, "psql", "-X", "-U", "postgres", "-d", "postgres", "-Atc",
      "select count(*) from pg_database where datname='$ProbeDatabase'"
    )
    $removed = $remaining -eq "0"
  }
}

if (-not $removed) { throw "R2_SQL_PROBE_DATABASE_NOT_REMOVED:$ProbeDatabase" }

$migrationSha = (Get-FileHash -LiteralPath $Migration -Algorithm SHA256).Hash.ToLowerInvariant()
$result = [ordered]@{
  schema_version = "real-useful-estimates-r2.technology-passport-sql-behavior-proof.v1"
  generated_at_utc = [DateTime]::UtcNow.ToString("o")
  status = "GREEN_R2_HUMAN_ACCEPTANCE_SQL_BEHAVIOR"
  migration = [ordered]@{ path = $Migration.Replace("\", "/"); sha256 = $migrationSha }
  postgres_version = $postgresVersion
  source = [ordered]@{
    container = $Container
    frozen_template_database = $TemplateDatabase
    fixture = $Fixture
    frozen_template_mutated = $false
    production_accessed = $false
  }
  checks = @(
    "DRAFT_WITHOUT_MANIFEST_BLOCKED",
    "CONTENT_GREEN_PROMOTION_WITHOUT_HUMAN_ACCEPTANCE_BLOCKED",
    "AUTHOR_REVIEWER_COLLISION_BLOCKED",
    "EXACT_INDEPENDENT_ACCEPTANCE_ALLOWED",
    "CONTENT_GREEN_PROMOTION_WITH_EXACT_ACCEPTANCE_ALLOWED",
    "PASSPORT_HASH_DRIFT_RESETS_DRAFT",
    "STALE_ACCEPTANCE_BLOCKED",
    "SIGNED_ACCEPTANCE_IMMUTABLE"
  )
  temporary_probe_database = [ordered]@{
    name = $ProbeDatabase
    created = $created
    removed = $removed
  }
  sentinel = "R2_HUMAN_ACCEPTANCE_BEHAVIOR_GREEN|1"
}
Write-JsonUtf8 -Path $Output -Value $result
$result | ConvertTo-Json -Depth 20
