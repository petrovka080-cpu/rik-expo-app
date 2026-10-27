begin;

create or replace function public.buyer_rfq_actor_context_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context jsonb;
begin
  v_context := public.app_actor_role_context_v1(array['buyer']);

  return jsonb_build_object(
    'actorUserId', v_context ->> 'actorUserId',
    'role', nullif(lower(trim(coalesce(v_context ->> 'role', ''))), ''),
    'source', coalesce(v_context ->> 'source', 'none'),
    'allowed', coalesce((v_context ->> 'allowed')::boolean, false)
      and nullif(lower(trim(coalesce(v_context ->> 'role', ''))), '') = 'buyer',
    'override', coalesce((v_context ->> 'override')::boolean, false),
    'baseRole', v_context ->> 'baseRole',
    'baseSource', v_context ->> 'baseSource',
    'reason', v_context ->> 'reason'
  );
end;
$$;

comment on function public.buyer_rfq_actor_context_v1() is
'H1.8b RFQ publish boundary: volatile because override-aware role resolution writes audit rows. RFQ publish remains buyer-only.';

grant execute on function public.buyer_rfq_actor_context_v1() to authenticated, service_role;

create or replace function public.buyer_rfq_actor_is_buyer_v1()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context jsonb;
begin
  v_context := public.buyer_rfq_actor_context_v1();
  return coalesce((v_context ->> 'allowed')::boolean, false);
end;
$$;

comment on function public.buyer_rfq_actor_is_buyer_v1() is
'H1.8b RFQ publish remains buyer-only and uses volatile override-aware buyer RFQ actor context.';

grant execute on function public.buyer_rfq_actor_is_buyer_v1() to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
