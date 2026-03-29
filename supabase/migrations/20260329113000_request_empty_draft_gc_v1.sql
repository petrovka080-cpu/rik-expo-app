begin;

create or replace function public.request_find_reusable_empty_draft_v1(
  p_user_id uuid default auth.uid()
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select r.id
  from public.requests r
  where r.created_by = coalesce(p_user_id, auth.uid())
    and r.submitted_at is null
    and (
      position('draft' in lower(coalesce(r.status::text, ''))) > 0
      or position('чернов' in lower(coalesce(r.status::text, ''))) > 0
    )
    and not exists (
      select 1
      from public.request_items ri
      where ri.request_id = r.id
    )
  order by
    coalesce(r.updated_at, r.created_at) desc nulls last,
    r.created_at desc nulls last,
    r.id desc
  limit 1;
$$;

grant execute on function public.request_find_reusable_empty_draft_v1(uuid) to authenticated;
grant execute on function public.request_find_reusable_empty_draft_v1(uuid) to service_role;

create or replace function public.request_gc_empty_drafts_v1(
  p_older_than_days integer default 7,
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(coalesce(p_older_than_days, 7), 1);
  v_limit integer := greatest(least(coalesce(p_limit, 500), 5000), 1);
  v_deleted_ids uuid[] := '{}'::uuid[];
begin
  with empty_drafts as (
    select
      r.id,
      r.created_by,
      coalesce(r.updated_at, r.created_at) as freshness_at,
      row_number() over (
        partition by r.created_by
        order by
          coalesce(r.updated_at, r.created_at) desc nulls last,
          r.created_at desc nulls last,
          r.id desc
      ) as creator_rank
    from public.requests r
    where r.submitted_at is null
      and (
        position('draft' in lower(coalesce(r.status::text, ''))) > 0
        or position('чернов' in lower(coalesce(r.status::text, ''))) > 0
      )
      and not exists (
        select 1
        from public.request_items ri
        where ri.request_id = r.id
      )
  ),
  candidates as (
    select ed.id
    from empty_drafts ed
    where ed.creator_rank > 1
      and coalesce(ed.freshness_at, now()) < now() - make_interval(days => v_days)
    order by ed.freshness_at asc nulls first, ed.id asc
    limit v_limit
  ),
  deleted as (
    delete from public.requests r
    using candidates c
    where r.id = c.id
    returning r.id
  )
  select coalesce(array_agg(d.id order by d.id), '{}'::uuid[])
  into v_deleted_ids
  from deleted d;

  return jsonb_build_object(
    'older_than_days', v_days,
    'limit', v_limit,
    'deleted_count', coalesce(array_length(v_deleted_ids, 1), 0),
    'deleted_ids', to_jsonb(v_deleted_ids)
  );
end;
$$;

grant execute on function public.request_gc_empty_drafts_v1(integer, integer) to service_role;

commit;
