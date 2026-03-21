begin;

create or replace view public.v_director_inbox as
select
  r.id,
  r.display_no,
  r.status,
  r.foreman_name,
  r.need_by,
  r.created_at
from public.requests r
where lower(btrim(coalesce(r.status::text, ''))) in ('на утверждении', 'pending');

create or replace view public.director_inbox as
select *
from public.v_director_inbox;

create or replace function public.list_director_inbox(p_status text default null)
returns table (
  kind text,
  request_id uuid,
  submitted_at timestamptz,
  items_count bigint
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      r.id,
      coalesce(r.submitted_at, r.created_at) as submitted_at
    from public.requests r
    where (
      p_status is null
      and lower(btrim(coalesce(r.status::text, ''))) in ('на утверждении', 'pending')
    ) or (
      p_status is not null
      and lower(btrim(coalesce(r.status::text, ''))) = lower(btrim(p_status))
    )
  )
  select
    'request'::text as kind,
    b.id as request_id,
    b.submitted_at,
    count(ri.id)::bigint as items_count
  from base b
  left join public.request_items ri
    on ri.request_id = b.id
   and lower(btrim(coalesce(ri.status::text, ''))) in ('на утверждении', 'у директора', 'pending')
  group by b.id, b.submitted_at
  order by b.submitted_at desc nulls last, b.id;
$$;

create or replace function public.list_director_items_stable()
returns table (
  request_id uuid,
  request_item_id uuid,
  name_human text,
  qty numeric,
  uom text,
  rik_code text,
  app_code text,
  item_kind text,
  note text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    di.request_id::uuid as request_id,
    di.request_item_id::uuid as request_item_id,
    di.name_human,
    di.qty,
    di.uom,
    di.rik_code,
    di.app_code,
    null::text as item_kind,
    di.note,
    di.created_at
  from public.debug_director_items di
  join public.requests r
    on r.id = di.request_id::uuid
  where lower(btrim(coalesce(r.status::text, ''))) in ('на утверждении', 'pending')
    and lower(btrim(coalesce(di.request_item_status, ''))) in ('на утверждении', 'у директора', 'pending')
  order by coalesce(r.submitted_at, di.created_at) desc nulls last, di.created_at asc, di.request_item_id::uuid;
$$;

notify pgrst, 'reload schema';

commit;
