begin;

create or replace function public.proposal_request_item_integrity_v1(p_proposal_id text)
returns table (
  proposal_id text,
  proposal_item_id bigint,
  request_item_id text,
  integrity_state text,
  integrity_reason text,
  request_item_exists boolean,
  request_item_status text,
  request_item_cancelled_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    coalesce(pi.proposal_id_text, pi.proposal_id::text) as proposal_id,
    pi.id::bigint as proposal_item_id,
    pi.request_item_id::text as request_item_id,
    case
      when ri.id is null then 'source_missing'
      when ri.cancelled_at is not null
        or lower(trim(coalesce(ri.status, ''))) in ('cancelled', 'canceled', 'отменена', 'отменено')
        then 'source_cancelled'
      else 'active'
    end as integrity_state,
    case
      when ri.id is null then 'request_item_missing'
      when ri.cancelled_at is not null
        or lower(trim(coalesce(ri.status, ''))) in ('cancelled', 'canceled', 'отменена', 'отменено')
        then 'request_item_cancelled'
      else null
    end as integrity_reason,
    ri.id is not null as request_item_exists,
    ri.status as request_item_status,
    ri.cancelled_at as request_item_cancelled_at
  from public.proposal_items pi
  left join public.request_items ri
    on ri.id = pi.request_item_id
  where coalesce(pi.proposal_id_text, pi.proposal_id::text) = p_proposal_id::text
  order by pi.id;
$$;

comment on function public.proposal_request_item_integrity_v1(text) is
'Canonical proposal -> request_item integrity classifier. Preserves proposal rows while marking source_cancelled/source_missing instead of silently dropping them.';

grant execute on function public.proposal_request_item_integrity_v1(text) to authenticated;

create or replace function public.proposal_request_item_integrity_guard_v1(p_proposal_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  v_degraded integer := 0;
  v_cancelled integer := 0;
  v_missing integer := 0;
  v_request_item_ids text[] := '{}';
  v_summary jsonb;
begin
  select
    count(*)::integer,
    count(*) filter (where integrity_state <> 'active')::integer,
    count(*) filter (where integrity_state = 'source_cancelled')::integer,
    count(*) filter (where integrity_state = 'source_missing')::integer,
    coalesce(
      array_agg(request_item_id order by request_item_id)
        filter (where integrity_state <> 'active'),
      '{}'
    )
  into
    v_total,
    v_degraded,
    v_cancelled,
    v_missing,
    v_request_item_ids
  from public.proposal_request_item_integrity_v1(p_proposal_id);

  v_summary := jsonb_build_object(
    'proposal_id', p_proposal_id,
    'total_items', coalesce(v_total, 0),
    'degraded_items', coalesce(v_degraded, 0),
    'cancelled_items', coalesce(v_cancelled, 0),
    'missing_items', coalesce(v_missing, 0),
    'request_item_ids', coalesce(v_request_item_ids, '{}')
  );

  if coalesce(v_degraded, 0) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_request_item_integrity_degraded',
      detail = v_summary::text,
      hint = 'Resolve cancelled or missing request items before submit or approval.';
  end if;

  return v_summary;
end;
$$;

comment on function public.proposal_request_item_integrity_guard_v1(text) is
'Fails closed when a proposal still links to cancelled or missing request_items. Used by submit/approval wrappers to prevent silent degraded progression.';

create or replace function public.proposal_submit_text_v1(p_proposal_id_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.proposal_request_item_integrity_guard_v1(p_proposal_id_text);
  perform public.proposal_submit(p_proposal_id => p_proposal_id_text::text);
end;
$$;

comment on function public.proposal_submit_text_v1(text) is
'Canonical proposal_submit wrapper with proposal request_item integrity guard. Rejects submit when proposal links are cancelled or missing.';

grant execute on function public.proposal_submit_text_v1(text) to authenticated;

create or replace function public.director_approve_min_auto_v1(
  p_proposal_id text,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.proposal_request_item_integrity_guard_v1(p_proposal_id);
  perform public.director_approve_min_auto(
    p_proposal_id => p_proposal_id,
    p_comment => p_comment
  );
end;
$$;

comment on function public.director_approve_min_auto_v1(text, text) is
'Director approval wrapper with proposal request_item integrity guard. Prevents approving proposals whose source request_items were cancelled or lost.';

grant execute on function public.director_approve_min_auto_v1(text, text) to authenticated;

commit;
