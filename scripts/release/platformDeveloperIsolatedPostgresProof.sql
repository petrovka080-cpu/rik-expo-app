\set ON_ERROR_STOP on

do $$
declare
  v_protected public.developer_access_overrides%rowtype;
begin
  if (
    select count(*)
    from public.developer_access_overrides
    where entitlement = 'platform_developer'
      and is_enabled
  ) <> 1 then
    raise exception 'exactly_one_protected_grant_must_be_promoted';
  end if;

  select *
  into strict v_protected
  from public.developer_access_overrides
  where user_id = '00000000-0000-4000-8000-000000000003';

  if
    v_protected.entitlement is distinct from 'platform_developer'
    or not v_protected.is_enabled
    or not v_protected.can_access_all_office_routes
  then
    raise exception 'protected_grant_not_promoted';
  end if;

  if exists (
    select 1
    from public.developer_access_overrides
    where user_id in (
      '00000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-000000000005'
    )
      and (
        entitlement is not null
        or is_enabled
        or can_access_all_office_routes
        or can_impersonate_for_mutations
      )
  ) then
    raise exception 'legacy_identity_bound_seed_not_revoked';
  end if;

  if exists (
    select 1
    from public.developer_access_overrides
    where user_id in (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002'
    )
  ) then
    raise exception 'ordinary_user_or_director_was_promoted';
  end if;
end
$$;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000003',
  false
);

do $$
declare
  v_context jsonb;
begin
  if not public.platform_developer_entitled_v1() then
    raise exception 'protected_grant_rpc_denied';
  end if;

  v_context := public.developer_override_context_v1();
  if
    v_context ->> 'actorRole' <> 'platform_developer'
    or v_context ->> 'authorizationSource' <> 'server_entitlement'
  then
    raise exception 'protected_context_not_server_entitled';
  end if;

  begin
    update public.developer_access_overrides
    set entitlement = null
    where user_id = auth.uid();
    raise exception 'authenticated_direct_write_unexpectedly_succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select public.developer_set_effective_role_v1('buyer');
reset role;

do $$
begin
  if not exists (
    select 1
    from public.developer_override_audit_log
    where actor_user_id = '00000000-0000-4000-8000-000000000003'
      and actor_role = 'platform_developer'
      and effective_role = 'buyer'
      and action_name = 'developer_effective_role_selected'
      and created_at is not null
      and details ->> 'actor_role' = 'platform_developer'
      and details ->> 'effective_role' = 'buyer'
  ) then
    raise exception 'effective_role_audit_row_missing';
  end if;
end
$$;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  false
);

do $$
begin
  if public.platform_developer_entitled_v1() then
    raise exception 'ordinary_user_was_entitled';
  end if;
  begin
    perform public.developer_set_effective_role_v1('director');
    raise exception 'ordinary_user_role_switch_unexpectedly_succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;
reset role;

begin;
update public.developer_access_overrides
set
  entitlement = null,
  is_enabled = false,
  active_effective_role = null,
  can_access_all_office_routes = false,
  can_impersonate_for_mutations = false
where user_id = '00000000-0000-4000-8000-000000000003';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000003',
  true
);
do $$
begin
  if public.platform_developer_entitled_v1() then
    raise exception 'compensating_revocation_did_not_remove_access';
  end if;
end
$$;
reset role;
rollback;

set role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000003',
  false
);
do $$
begin
  if not public.platform_developer_entitled_v1() then
    raise exception 'rollback_did_not_restore_protected_grant';
  end if;
end
$$;
reset role;

select 'GREEN_PLATFORM_DEVELOPER_ISOLATED_POSTGRES_REPLAY_RLS_RPC_AUDIT_ROLLBACK' as result;
