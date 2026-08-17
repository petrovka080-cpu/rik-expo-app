-- P0 ONE MONOLITH R5.4: forward-only immutable ledger for definition repairs.
-- Definition payloads remain immutable; a repair is admitted only as a successor release.

begin;

create table public.estimate_definition_defect_record (
  id uuid primary key,
  defect_key text not null unique,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  predecessor_release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null,
  predecessor_definition_version_id uuid not null
    references public.estimate_definition_version(id) on delete restrict,
  successor_definition_version_id uuid not null unique
    references public.estimate_definition_version(id) on delete restrict,
  defect_class text not null check (defect_class = 'R54_RESOURCE_SEMANTIC_OWNER_IDENTITY'),
  root_cause_ru text not null check (length(trim(root_cause_ru)) > 0),
  affected_resources jsonb not null check (
    jsonb_typeof(affected_resources) = 'array' and jsonb_array_length(affected_resources) > 0
  ),
  before_sha256 text not null check (before_sha256 ~ '^[0-9a-f]{64}$'),
  after_sha256 text not null check (after_sha256 ~ '^[0-9a-f]{64}$'),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  contract_version text not null check (contract_version = 'P0_ONE_MONOLITH_R54_DEFECT_LEDGER_V1'),
  created_at timestamptz not null default now(),
  check (release_id <> predecessor_release_id),
  check (predecessor_definition_version_id <> successor_definition_version_id)
);

create or replace function public.estimate_definition_defect_record_immutable_r54()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'R5.4 definition defect record is immutable';
end;
$$;

create trigger estimate_definition_defect_record_immutable_r54_trg
before update or delete on public.estimate_definition_defect_record
for each row execute function public.estimate_definition_defect_record_immutable_r54();

alter table public.estimate_definition_defect_record enable row level security;
revoke all on public.estimate_definition_defect_record from anon, authenticated;
grant select on public.estimate_definition_defect_record to authenticated;
grant all on public.estimate_definition_defect_record to service_role;

create policy estimate_definition_defect_record_read_r54
on public.estimate_definition_defect_record for select
using (exists (
  select 1
  from public.estimate_definition_release r
  where r.id = release_id and r.status in ('active', 'retired')
));

commit;
