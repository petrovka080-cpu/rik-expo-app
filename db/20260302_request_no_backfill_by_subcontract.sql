-- db/20260302_request_no_backfill_by_subcontract.sql
-- Normalize request_no for contractor/foreman chain:
-- one base number per subcontract, sequential suffix -1/-2/-3 by created_at.

begin;

with linked as (
  select
    r.id,
    r.created_at,
    coalesce(r.subcontract_id, r.contractor_job_id) as link_id,
    nullif(trim(r.request_no), '') as request_no,
    nullif(trim(r.display_no), '') as display_no
  from public.requests r
  where coalesce(r.subcontract_id, r.contractor_job_id) is not null
),
base_per_link as (
  select distinct on (l.link_id)
    l.link_id,
    regexp_replace(
      coalesce(l.request_no, l.display_no, 'REQ'),
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

