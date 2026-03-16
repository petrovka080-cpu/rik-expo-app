-- Remove legacy RPC overloads for public.request_recalc_status without touching
-- the live trigger function or the UUID RPC implementation.

begin;

-- Pre-check: if this returns rows, the no-args trigger function is live and must stay.
select
  t.tgname as trigger_name,
  c.relname as table_name,
  n.nspname as schema_name,
  pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and pg_get_triggerdef(t.oid) ilike '%request_recalc_status%';

-- Cleanup only legacy RPC overloads from the pre-UUID schema era.
drop function if exists public.request_recalc_status(bigint);
drop function if exists public.request_recalc_status(integer);

-- Final verification: expected survivors are
-- 1) public.request_recalc_status() returns trigger
-- 2) public.request_recalc_status(p_request_id uuid) returns void
select
  n.nspname as schema_name,
  p.proname,
  pg_get_function_identity_arguments(p.oid) as identity_args,
  pg_get_function_result(p.oid) as return_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'request_recalc_status'
  and n.nspname = 'public'
order by identity_args;

commit;
