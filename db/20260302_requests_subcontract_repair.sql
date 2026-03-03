-- db/20260302_requests_subcontract_repair.sql
-- Repair wrong legacy links and numbering for subcontract-bound requests.
-- Rule:
-- 1) request linked to subcontract must be created no earlier than subcontract.created_at (or approved_at).
-- 2) request_no is based on first request display_no inside subcontract and indexed as -1, -2, ...

begin;

with sub_bounds as (
  select
    s.id as subcontract_id,
    coalesce(s.created_at, s.approved_at) as border_ts
  from public.subcontracts s
  where s.status in ('approved', 'in_progress')
),
bad_links as (
  select r.id
  from public.requests r
  join sub_bounds b
    on coalesce(r.subcontract_id, r.contractor_job_id) = b.subcontract_id
  where b.border_ts is not null
    and r.created_at is not null
    and r.created_at < b.border_ts
)
update public.requests r
set
  subcontract_id = null,
  contractor_job_id = null,
  request_no = null
where r.id in (select id from bad_links);

with sub_bounds as (
  select
    s.id as subcontract_id,
    coalesce(s.created_at, s.approved_at) as border_ts
  from public.subcontracts s
  where s.status in ('approved', 'in_progress')
),
linked as (
  select
    r.id,
    r.created_at,
    coalesce(r.subcontract_id, r.contractor_job_id) as link_id,
    nullif(trim(r.display_no), '') as display_no,
    nullif(trim(r.request_no), '') as request_no
  from public.requests r
  join sub_bounds b
    on coalesce(r.subcontract_id, r.contractor_job_id) = b.subcontract_id
  where b.border_ts is null
     or r.created_at is null
     or r.created_at >= b.border_ts
),
base_per_link as (
  select distinct on (l.link_id)
    l.link_id,
    regexp_replace(
      coalesce(l.display_no, l.request_no, 'REQ'),
      '-[0-9]+$',
      ''
    ) as base_no
  from linked l
  order by l.link_id, l.created_at asc nulls last, l.id asc
),
numbered as (
  select
    l.id,
    b.base_no,
    row_number() over (
      partition by l.link_id
      order by l.created_at asc nulls last, l.id asc
    ) as seq_no
  from linked l
  join base_per_link b
    on b.link_id = l.link_id
)
update public.requests r
set request_no = numbered.base_no || '-' || numbered.seq_no::text
from numbered
where r.id = numbered.id
  and coalesce(r.request_no, '') <> (numbered.base_no || '-' || numbered.seq_no::text);

commit;

