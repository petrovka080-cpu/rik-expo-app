begin;

drop function if exists public.estimate_record_migration_event_v1(text, text, jsonb);
drop function if exists public.estimate_cancel_compile_job_v1(uuid);
drop function if exists public.estimate_create_artifact_job_v1(text, uuid, text);
drop function if exists public.estimate_commit_artifact_job_v1(uuid, text, jsonb);
drop function if exists public.estimate_create_legacy_revision_job_v1(text, text, uuid, text, text, text, uuid, jsonb);
drop function if exists public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb);
drop function if exists public.estimate_fail_compile_job_v1(uuid, text, text, jsonb, integer);
drop function if exists public.estimate_claim_compile_jobs_v1(text, integer, integer);
drop function if exists public.estimate_create_compile_job_v1(text, text, text, uuid, uuid, jsonb);

drop table if exists public.estimate_migration_import;
drop table if exists public.estimate_program_event;
drop table if exists public.estimate_program_control_state;
drop table if exists public.estimate_legacy_revision_import;
drop table if exists public.estimate_compile_job;
drop table if exists public.estimate_revision_artifact;
drop table if exists public.estimate_revision_row_price;
drop table if exists public.estimate_revision_row;
drop table if exists public.estimate_revision;
drop table if exists public.estimate_price_snapshot_item;
drop table if exists public.estimate_price_snapshot;
drop table if exists public.estimate_resource_price_route_binding;
drop table if exists public.estimate_price_route;
drop table if exists public.estimate_work_normative_binding;
drop table if exists public.estimate_normative_locator;
drop table if exists public.estimate_normative_source;
drop table if exists public.estimate_resource_spec;
drop table if exists public.estimate_formula_graph;
drop table if exists public.estimate_parameter_definition;
drop table if exists public.estimate_definition_version;
drop table if exists public.estimate_work_identity;
drop table if exists public.estimate_definition_release;

drop function if exists public.estimate_revision_visible_v1(uuid);
drop function if exists public.estimate_guard_definition_mutation_v1();
drop function if exists public.estimate_guard_definition_child_mutation_v1();
drop function if exists public.estimate_reject_mutation_v1();

commit;
