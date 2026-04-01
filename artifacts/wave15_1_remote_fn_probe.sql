select n.nspname as schema, p.proname as name, pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_args, pg_catalog.pg_get_function_result(p.oid) as result_type
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('fn_next_subcontract_number','subcontract_create_v1','subcontract_create_draft','subcontract_approve_v1','subcontract_reject_v1')
order by p.proname, identity_args;
