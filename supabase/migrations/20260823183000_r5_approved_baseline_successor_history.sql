begin;

-- Baselines are immutable accepted records. A definition may acquire a newer
-- accepted parameter fixture without rewriting either the definition or its
-- predecessor baseline; the cumulative manifest selects the exact current ID.
alter table public.estimate_approved_template_baseline
  drop constraint if exists estimate_approved_template_baseline_definition_version_id_key;

alter table public.estimate_approved_template_baseline
  drop constraint if exists estimate_approved_template_ba_catalog_id_source_definition__key;

create index if not exists estimate_approved_template_baseline_definition_history_idx
  on public.estimate_approved_template_baseline(definition_version_id,accepted_at desc,id);

create unique index if not exists estimate_approved_template_baseline_one_direct_successor_uq
  on public.estimate_approved_template_baseline(supersedes_baseline_id)
  where supersedes_baseline_id is not null;

comment on index public.estimate_approved_template_baseline_definition_history_idx is
  'R5 immutable approved-baseline history. Current ownership is the explicit cumulative-manifest baseline ID.';

commit;
