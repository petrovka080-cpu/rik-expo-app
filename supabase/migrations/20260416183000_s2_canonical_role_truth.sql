begin;

create or replace function public.app_actor_role_context_v1(
  p_allowed_roles text[] default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_allowed_roles text[] := '{}';
  v_has_allowed_filter boolean := false;
  v_role text := null;
  v_source text := 'none';
begin
  select coalesce(array_agg(distinct normalized_role order by normalized_role), '{}')
  into v_allowed_roles
  from (
    select nullif(lower(trim(role_value)), '') as normalized_role
    from unnest(coalesce(p_allowed_roles, '{}')) as role_value
  ) roles
  where normalized_role is not null;

  v_has_allowed_filter := coalesce(array_length(v_allowed_roles, 1), 0) > 0;

  if v_actor_id is null then
    return jsonb_build_object(
      'allowed', false,
      'role', null,
      'source', 'none',
      'reason', 'auth_required'
    );
  end if;

  select nullif(lower(trim(cm.role)), '')
  into v_role
  from public.company_members cm
  where cm.user_id = v_actor_id
    and nullif(trim(cm.role), '') is not null
    and (
      v_has_allowed_filter = false
      or lower(trim(cm.role)) = any(v_allowed_roles)
    )
  order by
    case
      when v_has_allowed_filter then array_position(v_allowed_roles, lower(trim(cm.role)))
      else 1
    end asc nulls last,
    cm.created_at asc nulls last
  limit 1;

  if v_role is not null then
    return jsonb_build_object(
      'allowed', true,
      'role', v_role,
      'source', 'company_members',
      'reason', 'matched'
    );
  end if;

  select nullif(lower(trim(cm.role)), '')
  into v_role
  from public.company_members cm
  where cm.user_id = v_actor_id
    and nullif(trim(cm.role), '') is not null
  order by cm.created_at asc nulls last
  limit 1;

  if v_role is not null then
    return jsonb_build_object(
      'allowed', v_has_allowed_filter = false,
      'role', v_role,
      'source', 'company_members',
      'reason', case when v_has_allowed_filter then 'source_role_forbidden' else 'matched' end
    );
  end if;

  select nullif(lower(trim(p.role)), '')
  into v_role
  from public.profiles p
  where p.user_id = v_actor_id
    and nullif(trim(p.role), '') is not null
    and (
      v_has_allowed_filter = false
      or lower(trim(p.role)) = any(v_allowed_roles)
    )
  limit 1;

  if v_role is not null then
    return jsonb_build_object(
      'allowed', true,
      'role', v_role,
      'source', 'profiles',
      'reason', 'matched'
    );
  end if;

  select nullif(lower(trim(p.role)), '')
  into v_role
  from public.profiles p
  where p.user_id = v_actor_id
    and nullif(trim(p.role), '') is not null
  limit 1;

  if v_role is not null then
    return jsonb_build_object(
      'allowed', v_has_allowed_filter = false,
      'role', v_role,
      'source', 'profiles',
      'reason', case when v_has_allowed_filter then 'source_role_forbidden' else 'matched' end
    );
  end if;

  v_role := nullif(lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))), '');

  if v_role is not null then
    return jsonb_build_object(
      'allowed', v_has_allowed_filter = false or v_role = any(v_allowed_roles),
      'role', v_role,
      'source', 'app_metadata',
      'reason',
        case
          when v_has_allowed_filter = false or v_role = any(v_allowed_roles) then 'matched'
          else 'source_role_forbidden'
        end
    );
  end if;

  v_role := nullif(lower(trim(coalesce(public.get_my_role(), ''))), '');

  if v_role is not null then
    return jsonb_build_object(
      'allowed', v_has_allowed_filter = false or v_role = any(v_allowed_roles),
      'role', v_role,
      'source', 'get_my_role',
      'reason',
        case
          when v_has_allowed_filter = false or v_role = any(v_allowed_roles) then 'matched'
          else 'source_role_forbidden'
        end
    );
  end if;

  return jsonb_build_object(
    'allowed', false,
    'role', null,
    'source', 'none',
    'reason', 'role_missing'
  );
end;
$$;

comment on function public.app_actor_role_context_v1(text[]) is
'S2 canonical actor role resolver. Critical actions resolve auth.uid() role from company_members, then profiles, then signed app_metadata, then get_my_role fallback. Lower-priority sources do not override explicit higher-priority DB truth.';

grant execute on function public.app_actor_role_context_v1(text[]) to authenticated, service_role;

create or replace function public.buyer_rfq_actor_is_buyer_v1()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_context jsonb;
begin
  v_context := public.app_actor_role_context_v1(array['buyer']);
  return coalesce((v_context ->> 'allowed')::boolean, false)
    and coalesce(v_context ->> 'role', '') = 'buyer';
end;
$$;

comment on function public.buyer_rfq_actor_is_buyer_v1() is
'S2 role truth hardening: RFQ publish remains buyer-only and now uses the canonical membership-first actor role resolver.';

grant execute on function public.buyer_rfq_actor_is_buyer_v1() to authenticated, service_role;

create or replace function public.proposal_attachment_actor_role_v1(
  p_fallback_role text default null
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_context jsonb;
  v_role text := null;
begin
  v_context := public.app_actor_role_context_v1(array['buyer', 'director', 'accountant']);
  v_role := nullif(lower(trim(coalesce(v_context ->> 'role', ''))), '');

  if coalesce((v_context ->> 'allowed')::boolean, false) then
    return v_role;
  end if;

  return coalesce(v_role, nullif(lower(trim(p_fallback_role)), ''));
end;
$$;

comment on function public.proposal_attachment_actor_role_v1(text) is
'S2 role truth hardening: proposal attachment role resolution uses the shared membership-first canonical actor role resolver. Business allow-lists stay in the caller.';

grant execute on function public.proposal_attachment_actor_role_v1(text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
