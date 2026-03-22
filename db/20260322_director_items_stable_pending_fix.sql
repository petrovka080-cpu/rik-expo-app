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
where lower(btrim(coalesce(r.status::text, ''))) in (
  lower(U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'),
  'pending'
);

create or replace view public.director_inbox as
select *
from public.v_director_inbox;

drop function if exists public.list_director_inbox(text);

create function public.list_director_inbox(p_status text default null)
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
      and lower(btrim(coalesce(r.status::text, ''))) in (
        lower(U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'),
        'pending'
      )
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
   and lower(btrim(coalesce(ri.status::text, ''))) in (
     lower(U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'),
     lower(U&'\0423 \0434\0438\0440\0435\043A\0442\043E\0440\0430'),
     'pending'
   )
  group by b.id, b.submitted_at
  order by b.submitted_at desc nulls last, b.id;
$$;

create or replace function public.list_director_items_stable()
returns table (
  request_item_id uuid,
  request_id uuid,
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
    ri.id as request_item_id,
    ri.request_id as request_id,
    ri.name_human,
    ri.qty,
    ri.uom,
    ri.rik_code,
    ri.app_code,
    ri.item_kind,
    ri.note,
    ri.created_at
  from public.request_items ri
  join public.requests r
    on r.id = ri.request_id
  where
    lower(btrim(coalesce(r.status::text, ''))) in (
      lower(U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'),
      'pending'
    )
    and (
      ri.status is null
      or lower(btrim(coalesce(ri.status::text, ''))) in (
        lower(U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'),
        lower(U&'\0423 \0434\0438\0440\0435\043A\0442\043E\0440\0430'),
        'pending'
      )
    )
  order by
    coalesce(r.submitted_at, r.created_at) desc nulls last,
    ri.created_at desc;
$$;

notify pgrst, 'reload schema';

commit;
