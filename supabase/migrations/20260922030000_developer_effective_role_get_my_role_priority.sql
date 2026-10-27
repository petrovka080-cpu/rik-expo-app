begin;

create or replace function public.get_my_role()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_base_role text;
  v_is_contractor boolean := false;
  v_override jsonb := '{}'::jsonb;
  v_effective_role text;
begin
  v_base_role := nullif(
    lower(trim(coalesce(public.get_my_role_base(), ''))),
    ''
  );

  -- A denied canonical principal cannot be recovered by an override.
  if v_base_role = 'revoked' then
    return 'revoked';
  end if;
  if v_base_role = 'cross_tenant' then
    return 'cross_tenant';
  end if;

  if v_actor_id is not null then
    v_override := coalesce(
      public.developer_override_context_v1(),
      '{}'::jsonb
    );
    v_effective_role := nullif(
      lower(trim(coalesce(v_override ->> 'activeEffectiveRole', ''))),
      ''
    );

    if
      v_override ->> 'actorUserId' = v_actor_id::text
      and v_override ->> 'isEnabled' = 'true'
      and v_override ->> 'isActive' = 'true'
      and v_override ->> 'canAccessAllOfficeRoutes' = 'true'
      and v_override ->> 'canImpersonateForMutations' = 'true'
      and v_effective_role is not null
      and exists (
        select 1
        from jsonb_array_elements_text(
          coalesce(v_override -> 'allowedRoles', '[]'::jsonb)
        ) as allowed(role_name)
        where lower(trim(allowed.role_name)) = v_effective_role
      )
    then
      return v_effective_role;
    end if;
  end if;

  select coalesce(up.is_contractor, false)
  into v_is_contractor
  from public.user_profiles up
  where up.user_id = v_actor_id
  limit 1;

  if coalesce(v_is_contractor, false) then
    return 'contractor';
  end if;

  return coalesce(v_base_role, 'guest');
end;
$$;

comment on function public.get_my_role() is
'Returns a denied canonical role unchanged; otherwise gives an active, same-actor, allowlisted server developer effective role priority over the legacy contractor compatibility flag.';

revoke all on function public.get_my_role() from public, anon;
grant execute on function public.get_my_role() to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
