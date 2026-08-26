\set ON_ERROR_STOP on

create or replace function pg_temp.r3_candidate(
  p_tenant uuid,
  p_author uuid,
  p_manifest_sha text,
  p_passport_sha text,
  p_source_sha text
)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'contract','real-useful-estimates.technology-passport-candidate-r2.v1',
    'tenantId',p_tenant,
    'definitionVersionId','a3b65bd6-bb8b-49a2-9fa1-44799d5ad675',
    'releaseId','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'catalogId','drywall_ceiling_interior_bulkhead_install_high_load',
    'technologyVariantId','variant-r3-tenant-proof',
    'definitionSha256','077b26bfc987482e8111962ce4bd8ab206cf56a5df9d42c4535e2b7e064df2d3',
    'passportContentSha256',p_passport_sha,
    'sourceSetSha256',p_source_sha,
    'authorId',p_author,
    'authorAuditIdentity','human-engineer-'||p_author::text,
    'engineeringScope','drywall-systems',
    'passportPayload',jsonb_build_object(
      'tenantId',p_tenant,
      'catalogId','drywall_ceiling_interior_bulkhead_install_high_load',
      'technologyVariantId','variant-r3-tenant-proof',
      'definitionSha256','077b26bfc987482e8111962ce4bd8ab206cf56a5df9d42c4535e2b7e064df2d3',
      'authorId',p_author,
      'engineeringScope','drywall-systems'
    ),
    'sourceClaims',jsonb_build_array(jsonb_build_object(
      'claimId','claim-r3-1','sourceFileSha256',p_source_sha
    )),
    'candidateManifestSha256',p_manifest_sha
  );
$$;

create or replace function pg_temp.r3_acceptance(
  p_tenant uuid,
  p_author uuid,
  p_reviewer uuid,
  p_decision text,
  p_supersedes uuid,
  p_signature text,
  p_passport_sha text,
  p_source_sha text,
  p_decided_at text
)
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'contract','real-useful-estimates.technology-passport-human-acceptance-r3.v1',
    'tenantId',p_tenant,
    'definitionVersionId','a3b65bd6-bb8b-49a2-9fa1-44799d5ad675',
    'releaseId','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'catalogId','drywall_ceiling_interior_bulkhead_install_high_load',
    'technologyVariantId','variant-r3-tenant-proof',
    'definitionSha256','077b26bfc987482e8111962ce4bd8ab206cf56a5df9d42c4535e2b7e064df2d3',
    'passportContentSha256',p_passport_sha,
    'sourceSetSha256',p_source_sha,
    'authorId',p_author,
    'reviewerId',p_reviewer,
    'reviewerRole','engineer',
    'reviewerScope','drywall-systems',
    'decision',p_decision,
    'comment','Independent R3 behavior proof: '||p_decision,
    'signatureOrAuditId',p_signature,
    'acceptanceOrigin','HUMAN_SIGNED_AUDIT',
    'createdByAgent',false,
    'createdAtUtc',p_decided_at,
    'decidedAtUtc',p_decided_at,
    'invalidatedAtUtc',null,
    'supersedesAcceptanceId',p_supersedes
  );
$$;

insert into public.estimate_technology_engineer_authorization_r3(
  tenant_id,engineer_user_id,engineer_role,reviewer_scope,authorization_event,
  signature_or_audit_id,supersedes_authorization_id,decided_at_utc
) values
  ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','engineer','drywall-systems','GRANTED','r3-auth-author-a',null,'2026-08-21T12:00:00.000Z'),
  ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','engineer','drywall-systems','GRANTED','r3-auth-reviewer-a',null,'2026-08-21T12:01:00.000Z'),
  ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','engineer','drywall-systems','GRANTED','r3-auth-author-b',null,'2026-08-21T12:02:00.000Z'),
  ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','engineer','drywall-systems','GRANTED','r3-auth-reviewer-b',null,'2026-08-21T12:03:00.000Z');

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',false);
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
select * from public.estimate_submit_technology_passport_candidate_r3(
  pg_temp.r3_candidate(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    repeat('a',64),repeat('b',64),repeat('c',64)
  ),repeat('a',64)
);
reset role;

select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',false);
set role authenticated;
select * from public.estimate_submit_technology_passport_candidate_r3(
  pg_temp.r3_candidate(
    '22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    repeat('d',64),repeat('e',64),repeat('f',64)
  ),repeat('d',64)
);
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',false);
set role authenticated;
do $$
declare v_visible integer;
begin
  select count(*) into v_visible from public.estimate_technology_passport_r3;
  if v_visible<>1 then raise exception 'RLS_CROSS_TENANT_READ_LEAK:%',v_visible; end if;
  begin
    insert into public.estimate_technology_passport_acceptance_r3(
      tenant_id,definition_version_id,release_id,catalog_id,technology_variant_id,
      contract_version,definition_sha256,passport_content_sha256,source_set_sha256,
      author_id,reviewer_id,reviewer_role,reviewer_scope,decision,review_comment,
      signature_or_audit_id,acceptance_origin,created_by_agent,decided_at_utc,
      manifest_payload,manifest_sha256
    ) values (
      '11111111-1111-4111-8111-111111111111','a3b65bd6-bb8b-49a2-9fa1-44799d5ad675',
      'b28fdda9-e55f-4629-bba8-24ff15e7d8b6','drywall_ceiling_interior_bulkhead_install_high_load',
      'variant-r3-tenant-proof','real-useful-estimates.technology-passport-human-acceptance-r3.v1',
      repeat('0',64),repeat('0',64),repeat('0',64),
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      'engineer','drywall-systems','ACCEPTED','forbidden direct write','forbidden-direct',
      'HUMAN_SIGNED_AUDIT',false,clock_timestamp(),'{}'::jsonb,repeat('0',64)
    );
    raise exception 'AUTHENTICATED_DIRECT_WRITE_WAS_ALLOWED';
  exception when insufficient_privilege then null;
  end;
end
$$;
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',false);
set role authenticated;
do $$
begin
  begin
    perform 1 from public.estimate_record_technology_acceptance_r3(
      pg_temp.r3_acceptance(
        '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','ACCEPTED',null,'r3-self-review',
        repeat('b',64),repeat('c',64),'2026-08-21T13:00:00.000Z'
      ),repeat('1',64)
    );
    raise exception 'SELF_REVIEW_WAS_ALLOWED';
  exception when sqlstate '55000' then
    if sqlerrm<>'ESTIMATE_TECHNOLOGY_R3_AUTHOR_REVIEWER_COLLISION' then raise; end if;
  end;
end
$$;
reset role;

select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-ccccccccccc1',false);
set role authenticated;
do $$
begin
  begin
    perform 1 from public.estimate_record_technology_acceptance_r3(
      pg_temp.r3_acceptance(
        '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc1','ACCEPTED',null,'r3-non-engineer',
        repeat('b',64),repeat('c',64),'2026-08-21T13:01:00.000Z'
      ),repeat('2',64)
    );
    raise exception 'NON_ENGINEER_WAS_ALLOWED';
  exception when sqlstate '42501' then
    if sqlerrm<>'ESTIMATE_TECHNOLOGY_R3_REVIEWER_NOT_AUTHORIZED' then raise; end if;
  end;
end
$$;
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',false);
set role authenticated;
do $$
begin
  begin
    perform 1 from public.estimate_record_technology_acceptance_r3(
      pg_temp.r3_acceptance(
        '22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','ACCEPTED',null,'r3-wrong-tenant',
        repeat('e',64),repeat('f',64),'2026-08-21T13:02:00.000Z'
      ),repeat('3',64)
    );
    raise exception 'WRONG_TENANT_WRITE_WAS_ALLOWED';
  exception when sqlstate '42501' then
    if sqlerrm<>'ESTIMATE_TECHNOLOGY_R3_REVIEWER_NOT_AUTHORIZED' then raise; end if;
  end;
end
$$;
reset role;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',false);
set role authenticated;
do $$
begin
  begin
    perform 1 from public.estimate_record_technology_acceptance_r3(
      pg_temp.r3_acceptance(
        '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','ACCEPTED',null,'',
        repeat('b',64),repeat('c',64),'2026-08-21T13:03:00.000Z'
      ),repeat('4',64)
    );
    raise exception 'EMPTY_SIGNATURE_WAS_ALLOWED';
  exception when check_violation then null;
  end;
end
$$;

select * from public.estimate_record_technology_acceptance_r3(
  pg_temp.r3_acceptance(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','ACCEPTED',null,'r3-accept-0001',
    repeat('b',64),repeat('c',64),'2026-08-21T13:04:00.000Z'
  ),repeat('5',64)
);
select * from public.estimate_record_technology_acceptance_r3(
  pg_temp.r3_acceptance(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','ACCEPTED',null,'r3-accept-0001',
    repeat('b',64),repeat('c',64),'2026-08-21T13:04:00.000Z'
  ),repeat('5',64)
);
reset role;

do $$
begin
  if (select count(*) from public.estimate_technology_passport_acceptance_r3
      where tenant_id='11111111-1111-4111-8111-111111111111')<>1 then
    raise exception 'IDEMPOTENT_REPLAY_DUPLICATED';
  end if;
  if not public.estimate_technology_passport_exact_accepted_r3(
    '11111111-1111-4111-8111-111111111111','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'EXACT_TENANT_ACCEPTANCE_NOT_ALLOWED'; end if;
  if public.estimate_technology_passport_exact_accepted_r3(
    '22222222-2222-4222-8222-222222222222','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'TENANT_B_INHERITED_TENANT_A_ACCEPTANCE'; end if;
  if public.estimate_content_passport_exact_r3(
    'b28fdda9-e55f-4629-bba8-24ff15e7d8b6','drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'UNSCOPED_ADMISSION_WAS_ALLOWED'; end if;
  if not public.estimate_content_passport_exact_r3(
    'b28fdda9-e55f-4629-bba8-24ff15e7d8b6','drywall_ceiling_interior_bulkhead_install_high_load',
    '11111111-1111-4111-8111-111111111111'
  ) then raise exception 'TENANT_SCOPED_CONTENT_ADMISSION_BLOCKED'; end if;
end
$$;

select set_config('request.jwt.claim.role','service_role',false);
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',false);
set role service_role;
select * from public.estimate_record_technology_acceptance_r3(
  pg_temp.r3_acceptance(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','NEEDS_CHANGES',null,
    'r3-service-role-attempt',repeat('b',64),repeat('c',64),'2026-08-21T13:05:00.000Z'
  ),repeat('6',64)
);
reset role;
select set_config('request.jwt.claim.role','authenticated',false);

do $$
begin
  if (select count(*) from public.estimate_technology_acceptance_security_audit_r3
      where reason='SERVICE_ROLE_PRODUCT_PATH_FORBIDDEN')<>1 then
    raise exception 'SERVICE_ROLE_ATTEMPT_NOT_LOGGED';
  end if;
  if has_table_privilege('service_role','public.estimate_technology_passport_acceptance_r3','INSERT') then
    raise exception 'SERVICE_ROLE_HAS_DIRECT_ACCEPTANCE_INSERT';
  end if;
end
$$;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',false);
set role authenticated;
select * from public.estimate_record_technology_acceptance_r3(
  pg_temp.r3_acceptance(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','NEEDS_CHANGES',
    (select acceptance_id from public.estimate_technology_passport_acceptance_r3
      where tenant_id='11111111-1111-4111-8111-111111111111'
      order by decision_sequence desc limit 1),
    'r3-needs-0002',repeat('b',64),repeat('c',64),'2026-08-21T13:06:00.000Z'
  ),repeat('7',64)
);
reset role;

do $$
begin
  if public.estimate_technology_passport_exact_accepted_r3(
    '11111111-1111-4111-8111-111111111111','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'NEEDS_CHANGES_PASSED_ADMISSION'; end if;
  if (select status from public.estimate_technology_passport_r3
      where tenant_id='11111111-1111-4111-8111-111111111111')<>'DRAFT' then
    raise exception 'NEEDS_CHANGES_DID_NOT_RESET_DRAFT';
  end if;
end
$$;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',false);
set role authenticated;
select * from public.estimate_record_technology_acceptance_r3(
  pg_temp.r3_acceptance(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','ACCEPTED',
    (select acceptance_id from public.estimate_technology_passport_acceptance_r3
      where tenant_id='11111111-1111-4111-8111-111111111111'
      order by decision_sequence desc limit 1),
    'r3-accept-0003',repeat('b',64),repeat('c',64),'2026-08-21T13:07:00.000Z'
  ),repeat('8',64)
);
select * from public.estimate_record_technology_acceptance_r3(
  pg_temp.r3_acceptance(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','REJECTED',
    (select acceptance_id from public.estimate_technology_passport_acceptance_r3
      where tenant_id='11111111-1111-4111-8111-111111111111'
      order by decision_sequence desc limit 1),
    'r3-reject-0004',repeat('b',64),repeat('c',64),'2026-08-21T13:08:00.000Z'
  ),repeat('9',64)
);
reset role;

do $$
begin
  if public.estimate_technology_passport_exact_accepted_r3(
    '11111111-1111-4111-8111-111111111111','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'REJECTED_PASSED_ADMISSION'; end if;
  begin
    update public.estimate_technology_passport_acceptance_r3 set review_comment='mutated'
    where tenant_id='11111111-1111-4111-8111-111111111111';
    raise exception 'HISTORICAL_ACCEPTANCE_UPDATE_WAS_ALLOWED';
  exception when sqlstate '55000' then
    if sqlerrm<>'ESTIMATE_TECHNOLOGY_R3_AUDIT_APPEND_ONLY' then raise; end if;
  end;
end
$$;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',false);
set role authenticated;
select * from public.estimate_record_technology_acceptance_r3(
  pg_temp.r3_acceptance(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','ACCEPTED',
    (select acceptance_id from public.estimate_technology_passport_acceptance_r3
      where tenant_id='11111111-1111-4111-8111-111111111111'
      order by decision_sequence desc limit 1),
    'r3-accept-0005',repeat('b',64),repeat('c',64),'2026-08-21T13:09:00.000Z'
  ),repeat('0',64)
);
do $$
declare v_old_id uuid;
begin
  select acceptance_id into v_old_id
  from public.estimate_technology_passport_acceptance_r3
  where tenant_id='11111111-1111-4111-8111-111111111111'
  order by decision_sequence asc limit 1;
  begin
    perform 1 from public.estimate_record_technology_acceptance_r3(
      pg_temp.r3_acceptance(
        '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','NEEDS_CHANGES',v_old_id,
        'r3-stale-concurrent',repeat('b',64),repeat('c',64),'2026-08-21T13:10:00.000Z'
      ),'1'||repeat('0',63)
    );
    raise exception 'STALE_CONCURRENT_DECISION_WAS_ALLOWED';
  exception when sqlstate '40001' then
    if sqlerrm<>'ESTIMATE_TECHNOLOGY_R3_STALE_SUPERSEDES' then raise; end if;
  end;
end
$$;
reset role;

insert into public.estimate_technology_engineer_authorization_r3(
  tenant_id,engineer_user_id,engineer_role,reviewer_scope,authorization_event,
  signature_or_audit_id,supersedes_authorization_id,decided_at_utc
)
select tenant_id,engineer_user_id,'engineer',reviewer_scope,'REVOKED','r3-revoke-reviewer-a',id,
  '2026-08-21T13:11:00.000Z'
from public.estimate_technology_engineer_authorization_r3
where tenant_id='11111111-1111-4111-8111-111111111111'
  and engineer_user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
order by event_sequence desc limit 1;

do $$
begin
  if public.estimate_technology_passport_exact_accepted_r3(
    '11111111-1111-4111-8111-111111111111','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'REVOKED_REVIEWER_ACCEPTANCE_REMAINED_ACTIVE'; end if;
end
$$;

insert into public.estimate_technology_engineer_authorization_r3(
  tenant_id,engineer_user_id,engineer_role,reviewer_scope,authorization_event,
  signature_or_audit_id,supersedes_authorization_id,decided_at_utc
)
select tenant_id,engineer_user_id,'engineer',reviewer_scope,'GRANTED','r3-regrant-reviewer-a',id,
  '2026-08-21T13:12:00.000Z'
from public.estimate_technology_engineer_authorization_r3
where tenant_id='11111111-1111-4111-8111-111111111111'
  and engineer_user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
order by event_sequence desc limit 1;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',false);
set role authenticated;
select * from public.estimate_submit_technology_passport_candidate_r3(
  pg_temp.r3_candidate(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '2'||repeat('0',63),'d'||repeat('0',63),repeat('c',64)
  ),'2'||repeat('0',63)
);
select * from public.estimate_submit_technology_passport_candidate_r3(
  pg_temp.r3_candidate(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '3'||repeat('0',63),'d'||repeat('0',63),'e'||repeat('0',63)
  ),'3'||repeat('0',63)
);
reset role;

do $$
begin
  if (select status from public.estimate_technology_passport_r3
      where tenant_id='11111111-1111-4111-8111-111111111111')<>'DRAFT' then
    raise exception 'HASH_DRIFT_DID_NOT_RESET_DRAFT';
  end if;
  if public.estimate_technology_passport_exact_accepted_r3(
    '11111111-1111-4111-8111-111111111111','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'HASH_DRIFT_REMAINED_ACCEPTED'; end if;
end
$$;

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',false);
set role authenticated;
select * from public.estimate_record_technology_acceptance_r3(
  pg_temp.r3_acceptance(
    '11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','ACCEPTED',
    (select acceptance_id from public.estimate_technology_passport_acceptance_r3
      where tenant_id='11111111-1111-4111-8111-111111111111'
      order by decision_sequence desc limit 1),
    'r3-current-new-hashes','d'||repeat('0',63),'e'||repeat('0',63),'2026-08-21T13:13:00.000Z'
  ),'4'||repeat('0',63)
);
reset role;

do $$
begin
  if not public.estimate_technology_passport_exact_accepted_r3(
    '11111111-1111-4111-8111-111111111111','b28fdda9-e55f-4629-bba8-24ff15e7d8b6',
    'drywall_ceiling_interior_bulkhead_install_high_load'
  ) then raise exception 'NEW_HASH_ACCEPTANCE_NOT_ACTIVE'; end if;
  if (select count(*) from public.estimate_technology_passport_acceptance_history_r3
      where tenant_id='11111111-1111-4111-8111-111111111111'
        and effective_invalidated_at_utc is not null)<5 then
    raise exception 'HISTORICAL_ACCEPTANCE_NOT_AUDITABLE';
  end if;
end
$$;

select 'R3_TENANT_ACCEPTANCE_BEHAVIOR_GREEN'
  ||'|decisions='||(select count(*) from public.estimate_technology_passport_acceptance_r3
    where tenant_id='11111111-1111-4111-8111-111111111111')::text
  ||'|security_blocks='||(select count(*) from public.estimate_technology_acceptance_security_audit_r3)::text
  ||'|tenant_a_candidates='||(select count(*) from public.estimate_technology_passport_r3
    where tenant_id='11111111-1111-4111-8111-111111111111')::text;
