begin;

create table if not exists public.construction_work_domains (
  id uuid primary key default gen_random_uuid(),
  domain_key text not null unique,
  title_ru text not null,
  title_en text,
  description_ru text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint construction_work_domains_domain_key_not_empty_check
    check (length(btrim(domain_key)) > 0),
  constraint construction_work_domains_domain_key_format_check
    check (domain_key = lower(domain_key) and domain_key ~ '^[a-z0-9][a-z0-9_]*$'),
  constraint construction_work_domains_title_ru_not_empty_check
    check (length(btrim(title_ru)) > 0)
);

create table if not exists public.construction_work_definitions (
  id uuid primary key default gen_random_uuid(),
  work_key text not null unique,
  domain_key text not null references public.construction_work_domains(domain_key),
  system_key text,
  element_key text,
  operation_key text not null,
  title_ru text not null,
  title_en text,
  description_ru text,
  default_unit text not null,
  measurement_kind text not null,
  complexity_level text not null default 'standard',
  is_active boolean not null default true,
  source_kind text not null default 'internal_custom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint construction_work_definitions_work_key_not_empty_check
    check (length(btrim(work_key)) > 0),
  constraint construction_work_definitions_work_key_format_check
    check (work_key = lower(work_key) and work_key ~ '^[a-z0-9][a-z0-9_]*(\.[a-z0-9][a-z0-9_]*)+$'),
  constraint construction_work_definitions_operation_key_not_empty_check
    check (length(btrim(operation_key)) > 0),
  constraint construction_work_definitions_title_ru_not_empty_check
    check (length(btrim(title_ru)) > 0),
  constraint construction_work_definitions_default_unit_not_empty_check
    check (length(btrim(default_unit)) > 0),
  constraint construction_work_definitions_measurement_kind_check
    check (measurement_kind in ('area', 'volume', 'length', 'count', 'weight', 'time', 'lump_sum')),
  constraint construction_work_definitions_complexity_level_check
    check (complexity_level in ('basic', 'standard', 'complex')),
  constraint construction_work_definitions_source_kind_check
    check (source_kind in ('internal_custom', 'licensed_external', 'public_reference', 'custom')),
  constraint construction_work_definitions_no_unlicensed_official_csi_check
    check (source_kind <> 'official_csi')
);

create table if not exists public.construction_work_aliases (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.construction_work_definitions(id) on delete cascade,
  alias_text text not null,
  normalized_alias text not null,
  language text not null default 'ru',
  alias_kind text not null default 'user_phrase',
  confidence_weight numeric not null default 1.0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint construction_work_aliases_alias_text_not_empty_check
    check (length(btrim(alias_text)) > 0),
  constraint construction_work_aliases_normalized_alias_not_empty_check
    check (length(btrim(normalized_alias)) > 0),
  constraint construction_work_aliases_language_check
    check (language in ('ru', 'en', 'ky', 'custom')),
  constraint construction_work_aliases_alias_kind_check
    check (alias_kind in ('canonical_title', 'work_key_phrase', 'user_phrase', 'abbreviation')),
  constraint construction_work_aliases_confidence_weight_check
    check (confidence_weight > 0 and confidence_weight <= 1.5),
  unique (work_id, normalized_alias)
);

create table if not exists public.construction_work_classification_codes (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.construction_work_definitions(id) on delete cascade,
  standard text not null,
  code text not null,
  title text,
  mapping_kind text not null default 'internal_reference',
  source_license text,
  is_official boolean not null default false,
  created_at timestamptz not null default now(),

  constraint construction_work_classification_codes_standard_check
    check (standard in ('internal', 'masterformat_like', 'uniformat_like', 'omniclass_like', 'custom')),
  constraint construction_work_classification_codes_code_not_empty_check
    check (length(btrim(code)) > 0),
  constraint construction_work_classification_codes_mapping_kind_check
    check (mapping_kind in ('internal_reference', 'manual_mapping', 'licensed_source', 'custom')),
  constraint construction_work_classification_codes_no_unlicensed_official_check
    check (is_official is false),
  unique (work_id, standard, code)
);

create table if not exists public.construction_work_catalog_links (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.construction_work_definitions(id) on delete cascade,
  catalog_item_id uuid not null,
  link_kind text not null,
  quantity_formula text,
  default_waste_percent numeric,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint construction_work_catalog_links_link_kind_check
    check (link_kind in ('material', 'equipment', 'tool', 'service', 'supplier_offer', 'warehouse_item')),
  constraint construction_work_catalog_links_waste_percent_check
    check (default_waste_percent is null or (default_waste_percent >= 0 and default_waste_percent <= 100)),
  unique (work_id, catalog_item_id, link_kind)
);

do $$
begin
  if to_regclass('public.catalog_items') is not null
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.construction_work_catalog_links'::regclass
        and conname = 'construction_work_catalog_links_catalog_item_id_fkey'
    )
  then
    alter table public.construction_work_catalog_links
      add constraint construction_work_catalog_links_catalog_item_id_fkey
      foreign key (catalog_item_id) references public.catalog_items(id);
  end if;
end $$;

create table if not exists public.construction_work_recipe_rows (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.construction_work_definitions(id) on delete cascade,
  row_kind text not null,
  title_ru text not null,
  unit text not null,
  quantity_formula text not null,
  unit_price_source text not null default 'catalog_or_reference',
  sort_order integer not null default 0,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),

  constraint construction_work_recipe_rows_row_kind_check
    check (row_kind in ('material', 'labor', 'equipment', 'overhead', 'risk', 'timeline')),
  constraint construction_work_recipe_rows_title_ru_not_empty_check
    check (length(btrim(title_ru)) > 0),
  constraint construction_work_recipe_rows_unit_not_empty_check
    check (length(btrim(unit)) > 0),
  constraint construction_work_recipe_rows_quantity_formula_not_empty_check
    check (length(btrim(quantity_formula)) > 0),
  constraint construction_work_recipe_rows_unit_price_source_check
    check (unit_price_source in ('catalog_or_reference', 'labor_reference', 'equipment_reference', 'manual_reference')),
  unique (work_id, row_kind, title_ru, sort_order)
);

create table if not exists public.construction_work_migration_audit (
  id uuid primary key default gen_random_uuid(),
  wave text not null,
  migration_name text not null,
  audit_source_commit text not null,
  migration_commit text,
  status text not null,
  created_tables jsonb not null default '[]'::jsonb,
  modified_existing_tables jsonb not null default '[]'::jsonb,
  catalog_items_modified boolean not null default false,
  destructive_change_detected boolean not null default false,
  created_at timestamptz not null default now(),

  constraint construction_work_migration_audit_status_check
    check (status in ('planned', 'applied', 'blocked', 'rolled_back')),
  constraint construction_work_migration_audit_created_tables_array_check
    check (jsonb_typeof(created_tables) = 'array'),
  constraint construction_work_migration_audit_modified_existing_tables_array_check
    check (jsonb_typeof(modified_existing_tables) = 'array'),
  constraint construction_work_migration_audit_catalog_items_not_modified_check
    check (catalog_items_modified is false),
  constraint construction_work_migration_audit_no_destructive_change_check
    check (destructive_change_detected is false),
  unique (wave, migration_name)
);

create index if not exists construction_work_domains_active_sort_idx
  on public.construction_work_domains (is_active, sort_order, domain_key);

create index if not exists construction_work_definitions_domain_active_idx
  on public.construction_work_definitions (domain_key, is_active, work_key);

create index if not exists construction_work_definitions_measurement_idx
  on public.construction_work_definitions (measurement_kind, default_unit);

create index if not exists construction_work_aliases_normalized_alias_idx
  on public.construction_work_aliases (normalized_alias);

create index if not exists construction_work_aliases_work_active_idx
  on public.construction_work_aliases (work_id, is_active);

create index if not exists construction_work_classification_codes_lookup_idx
  on public.construction_work_classification_codes (standard, code);

create index if not exists construction_work_classification_codes_work_idx
  on public.construction_work_classification_codes (work_id);

create index if not exists construction_work_catalog_links_work_sort_idx
  on public.construction_work_catalog_links (work_id, sort_order);

create index if not exists construction_work_catalog_links_catalog_item_idx
  on public.construction_work_catalog_links (catalog_item_id);

create index if not exists construction_work_recipe_rows_work_sort_idx
  on public.construction_work_recipe_rows (work_id, sort_order);

alter table public.construction_work_domains enable row level security;
alter table public.construction_work_definitions enable row level security;
alter table public.construction_work_aliases enable row level security;
alter table public.construction_work_classification_codes enable row level security;
alter table public.construction_work_catalog_links enable row level security;
alter table public.construction_work_recipe_rows enable row level security;
alter table public.construction_work_migration_audit enable row level security;

revoke all on table public.construction_work_domains from anon, authenticated;
revoke all on table public.construction_work_definitions from anon, authenticated;
revoke all on table public.construction_work_aliases from anon, authenticated;
revoke all on table public.construction_work_classification_codes from anon, authenticated;
revoke all on table public.construction_work_catalog_links from anon, authenticated;
revoke all on table public.construction_work_recipe_rows from anon, authenticated;
revoke all on table public.construction_work_migration_audit from anon, authenticated;

grant select on table public.construction_work_domains to authenticated;
grant select on table public.construction_work_definitions to authenticated;
grant select on table public.construction_work_aliases to authenticated;
grant select on table public.construction_work_classification_codes to authenticated;
grant select on table public.construction_work_catalog_links to authenticated;
grant select on table public.construction_work_recipe_rows to authenticated;
grant select on table public.construction_work_migration_audit to authenticated;

grant select, insert, update, delete on table public.construction_work_domains to service_role;
grant select, insert, update, delete on table public.construction_work_definitions to service_role;
grant select, insert, update, delete on table public.construction_work_aliases to service_role;
grant select, insert, update, delete on table public.construction_work_classification_codes to service_role;
grant select, insert, update, delete on table public.construction_work_catalog_links to service_role;
grant select, insert, update, delete on table public.construction_work_recipe_rows to service_role;
grant select, insert, update, delete on table public.construction_work_migration_audit to service_role;

create policy construction_work_domains_select_active_authenticated
  on public.construction_work_domains
  for select
  to authenticated
  using (is_active is true);

create policy construction_work_domains_service_role_manage
  on public.construction_work_domains
  for all
  to service_role
  using (true)
  with check (true);

create policy construction_work_definitions_select_active_authenticated
  on public.construction_work_definitions
  for select
  to authenticated
  using (
    is_active is true
    and exists (
      select 1
      from public.construction_work_domains d
      where d.domain_key = construction_work_definitions.domain_key
        and d.is_active is true
    )
  );

create policy construction_work_definitions_service_role_manage
  on public.construction_work_definitions
  for all
  to service_role
  using (true)
  with check (true);

create policy construction_work_aliases_select_active_authenticated
  on public.construction_work_aliases
  for select
  to authenticated
  using (
    is_active is true
    and exists (
      select 1
      from public.construction_work_definitions w
      join public.construction_work_domains d on d.domain_key = w.domain_key
      where w.id = construction_work_aliases.work_id
        and w.is_active is true
        and d.is_active is true
    )
  );

create policy construction_work_aliases_service_role_manage
  on public.construction_work_aliases
  for all
  to service_role
  using (true)
  with check (true);

create policy construction_work_classification_codes_select_active_authenticated
  on public.construction_work_classification_codes
  for select
  to authenticated
  using (
    is_official is false
    and exists (
      select 1
      from public.construction_work_definitions w
      join public.construction_work_domains d on d.domain_key = w.domain_key
      where w.id = construction_work_classification_codes.work_id
        and w.is_active is true
        and d.is_active is true
    )
  );

create policy construction_work_classification_codes_service_role_manage
  on public.construction_work_classification_codes
  for all
  to service_role
  using (true)
  with check (true);

create policy construction_work_catalog_links_select_active_authenticated
  on public.construction_work_catalog_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.construction_work_definitions w
      join public.construction_work_domains d on d.domain_key = w.domain_key
      where w.id = construction_work_catalog_links.work_id
        and w.is_active is true
        and d.is_active is true
    )
  );

create policy construction_work_catalog_links_service_role_manage
  on public.construction_work_catalog_links
  for all
  to service_role
  using (true)
  with check (true);

create policy construction_work_recipe_rows_select_active_authenticated
  on public.construction_work_recipe_rows
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.construction_work_definitions w
      join public.construction_work_domains d on d.domain_key = w.domain_key
      where w.id = construction_work_recipe_rows.work_id
        and w.is_active is true
        and d.is_active is true
    )
  );

create policy construction_work_recipe_rows_service_role_manage
  on public.construction_work_recipe_rows
  for all
  to service_role
  using (true)
  with check (true);

create policy construction_work_migration_audit_select_safe_authenticated
  on public.construction_work_migration_audit
  for select
  to authenticated
  using (
    catalog_items_modified is false
    and destructive_change_detected is false
  );

create policy construction_work_migration_audit_service_role_manage
  on public.construction_work_migration_audit
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.construction_work_domains is
  'Additive source-of-truth domains for internal construction work ontology. Does not replace catalog_items.';
comment on table public.construction_work_definitions is
  'Additive source-of-truth work definitions keyed by internal work_key. catalog_items remains source-of-truth for materials/products/suppliers/warehouse items.';
comment on table public.construction_work_aliases is
  'User phrase aliases for construction work definitions. This layer does not resolve AI prompts.';
comment on table public.construction_work_classification_codes is
  'Internal/custom classification mapping only. Official CSI bulk content is not seeded by this migration.';
comment on table public.construction_work_catalog_links is
  'Optional links from work definitions to existing catalog_items rows. FK is installed when catalog_items exists; migration inserts no catalog_items rows.';
comment on table public.construction_work_recipe_rows is
  'Starter BOQ recipe rows for future compiler work. This migration does not alter estimate engine output semantics.';
comment on table public.construction_work_migration_audit is
  'Proof row for additive construction_work_* ontology migration. catalog_items_modified must remain false.';

comment on column public.construction_work_definitions.work_key is
  'Stable internal source-of-truth key for construction work types.';
comment on column public.construction_work_classification_codes.is_official is
  'Must remain false unless a licensed official source migration is approved separately.';
comment on column public.construction_work_catalog_links.catalog_item_id is
  'References existing catalog_items.id when catalog_items exists in the replay target; this migration inserts no catalog_items rows.';

insert into public.construction_work_domains (
  domain_key,
  title_ru,
  title_en,
  description_ru,
  sort_order
)
values
  ('concrete', 'Concrete works', 'Concrete', 'Internal custom concrete work domain.', 10),
  ('masonry', 'Masonry works', 'Masonry', 'Internal custom masonry work domain.', 20),
  ('roofing', 'Roofing works', 'Roofing', 'Internal custom roofing work domain.', 30),
  ('facade', 'Facade works', 'Facade', 'Internal custom facade work domain.', 40),
  ('plumbing', 'Plumbing works', 'Plumbing', 'Internal custom plumbing work domain.', 50),
  ('electrical', 'Electrical works', 'Electrical', 'Internal custom electrical work domain.', 60),
  ('hvac', 'HVAC works', 'HVAC', 'Internal custom HVAC work domain.', 70),
  ('flooring', 'Flooring works', 'Flooring', 'Internal custom flooring work domain.', 80),
  ('earthworks', 'Earthworks', 'Earthworks', 'Internal custom earthworks domain.', 90),
  ('roadworks', 'Road works', 'Roadworks', 'Internal custom roadworks domain.', 100)
on conflict (domain_key) do nothing;

insert into public.construction_work_definitions (
  work_key,
  domain_key,
  system_key,
  element_key,
  operation_key,
  title_ru,
  title_en,
  description_ru,
  default_unit,
  measurement_kind,
  complexity_level,
  source_kind
)
values
  ('concrete.grade_beam_installation', 'concrete', 'structural', 'grade_beam', 'installation', 'Grade beam concrete installation', 'Grade beam concrete installation', 'Internal custom work definition.', 'm3', 'volume', 'standard', 'internal_custom'),
  ('concrete.slab_on_grade_pour', 'concrete', 'structural', 'slab_on_grade', 'pour', 'Slab on grade concrete pour', 'Slab on grade concrete pour', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('concrete.column_casting', 'concrete', 'structural', 'column', 'casting', 'Concrete column casting', 'Concrete column casting', 'Internal custom work definition.', 'm3', 'volume', 'standard', 'internal_custom'),
  ('concrete.stair_flight_casting', 'concrete', 'structural', 'stair_flight', 'casting', 'Concrete stair flight casting', 'Concrete stair flight casting', 'Internal custom work definition.', 'm3', 'volume', 'complex', 'internal_custom'),
  ('concrete.formwork_panel_installation', 'concrete', 'temporary_works', 'formwork_panel', 'installation', 'Concrete formwork panel installation', 'Concrete formwork panel installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('masonry.brick_wall_masonry', 'masonry', 'envelope', 'brick_wall', 'masonry', 'Brick wall masonry', 'Brick wall masonry', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('masonry.block_partition_installation', 'masonry', 'interior', 'block_partition', 'installation', 'Block partition installation', 'Block partition installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('masonry.stone_cladding_masonry', 'masonry', 'envelope', 'stone_cladding', 'masonry', 'Stone cladding masonry', 'Stone cladding masonry', 'Internal custom work definition.', 'm2', 'area', 'complex', 'internal_custom'),
  ('masonry.mortar_joint_repointing', 'masonry', 'repair', 'mortar_joint', 'repointing', 'Mortar joint repointing', 'Mortar joint repointing', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('masonry.lintel_bearing_masonry', 'masonry', 'structural', 'lintel_bearing', 'masonry', 'Lintel bearing masonry', 'Lintel bearing masonry', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('roofing.membrane_waterproofing_installation', 'roofing', 'roof', 'membrane_waterproofing', 'installation', 'Roof membrane waterproofing installation', 'Roof membrane waterproofing installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('roofing.metal_roof_sheet_installation', 'roofing', 'roof', 'metal_roof_sheet', 'installation', 'Metal roof sheet installation', 'Metal roof sheet installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('roofing.roof_insulation_layer_installation', 'roofing', 'roof', 'insulation_layer', 'installation', 'Roof insulation layer installation', 'Roof insulation layer installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('roofing.gutter_installation', 'roofing', 'roof_drainage', 'gutter', 'installation', 'Roof gutter installation', 'Roof gutter installation', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('roofing.parapet_flashing_installation', 'roofing', 'roof_edge', 'parapet_flashing', 'installation', 'Parapet flashing installation', 'Parapet flashing installation', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('facade.ventilated_panel_installation', 'facade', 'envelope', 'ventilated_panel', 'installation', 'Ventilated facade panel installation', 'Ventilated facade panel installation', 'Internal custom work definition.', 'm2', 'area', 'complex', 'internal_custom'),
  ('facade.exterior_plaster_application', 'facade', 'envelope', 'exterior_plaster', 'application', 'Exterior plaster application', 'Exterior plaster application', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('facade.facade_insulation_installation', 'facade', 'envelope', 'facade_insulation', 'installation', 'Facade insulation installation', 'Facade insulation installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('facade.curtain_wall_module_installation', 'facade', 'envelope', 'curtain_wall_module', 'installation', 'Curtain wall module installation', 'Curtain wall module installation', 'Internal custom work definition.', 'pcs', 'count', 'complex', 'internal_custom'),
  ('facade.soffit_cladding_installation', 'facade', 'envelope', 'soffit_cladding', 'installation', 'Soffit cladding installation', 'Soffit cladding installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('plumbing.water_supply_pipe_installation', 'plumbing', 'water_supply', 'pipe', 'installation', 'Water supply pipe installation', 'Water supply pipe installation', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('plumbing.sewer_pipe_installation', 'plumbing', 'sanitary', 'pipe', 'installation', 'Sewer pipe installation', 'Sewer pipe installation', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('plumbing.fixture_installation', 'plumbing', 'sanitary', 'fixture', 'installation', 'Plumbing fixture installation', 'Plumbing fixture installation', 'Internal custom work definition.', 'pcs', 'count', 'standard', 'internal_custom'),
  ('plumbing.pump_unit_installation', 'plumbing', 'equipment', 'pump_unit', 'installation', 'Pump unit installation', 'Pump unit installation', 'Internal custom work definition.', 'pcs', 'count', 'complex', 'internal_custom'),
  ('plumbing.pressure_testing', 'plumbing', 'commissioning', 'pipe_network', 'testing', 'Plumbing pressure testing', 'Plumbing pressure testing', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('electrical.socket_line_installation', 'electrical', 'power', 'socket_line', 'installation', 'Socket line installation', 'Socket line installation', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('electrical.lighting_fixture_installation', 'electrical', 'lighting', 'fixture', 'installation', 'Lighting fixture installation', 'Lighting fixture installation', 'Internal custom work definition.', 'pcs', 'count', 'standard', 'internal_custom'),
  ('electrical.distribution_board_installation', 'electrical', 'power', 'distribution_board', 'installation', 'Distribution board installation', 'Distribution board installation', 'Internal custom work definition.', 'pcs', 'count', 'complex', 'internal_custom'),
  ('electrical.cable_tray_installation', 'electrical', 'containment', 'cable_tray', 'installation', 'Cable tray installation', 'Cable tray installation', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('electrical.grounding_loop_installation', 'electrical', 'earthing', 'grounding_loop', 'installation', 'Grounding loop installation', 'Grounding loop installation', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('hvac.duct_installation', 'hvac', 'ventilation', 'duct', 'installation', 'HVAC duct installation', 'HVAC duct installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('hvac.air_handling_unit_installation', 'hvac', 'equipment', 'air_handling_unit', 'installation', 'Air handling unit installation', 'Air handling unit installation', 'Internal custom work definition.', 'pcs', 'count', 'complex', 'internal_custom'),
  ('hvac.fan_coil_installation', 'hvac', 'equipment', 'fan_coil', 'installation', 'Fan coil installation', 'Fan coil installation', 'Internal custom work definition.', 'pcs', 'count', 'standard', 'internal_custom'),
  ('hvac.refrigerant_pipe_installation', 'hvac', 'cooling', 'refrigerant_pipe', 'installation', 'Refrigerant pipe installation', 'Refrigerant pipe installation', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('hvac.ventilation_balancing', 'hvac', 'commissioning', 'ventilation_network', 'balancing', 'Ventilation balancing', 'Ventilation balancing', 'Internal custom work definition.', 'pcs', 'count', 'standard', 'internal_custom'),
  ('flooring.laminate_floor_installation', 'flooring', 'finish', 'laminate_floor', 'installation', 'Laminate floor installation', 'Laminate floor installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('flooring.ceramic_tile_installation', 'flooring', 'finish', 'ceramic_tile', 'installation', 'Ceramic tile installation', 'Ceramic tile installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('flooring.screed_installation', 'flooring', 'substrate', 'screed', 'installation', 'Floor screed installation', 'Floor screed installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('flooring.vinyl_floor_installation', 'flooring', 'finish', 'vinyl_floor', 'installation', 'Vinyl floor installation', 'Vinyl floor installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('flooring.industrial_coating_application', 'flooring', 'finish', 'industrial_coating', 'application', 'Industrial floor coating application', 'Industrial floor coating application', 'Internal custom work definition.', 'm2', 'area', 'complex', 'internal_custom'),
  ('earthworks.trench_excavation', 'earthworks', 'excavation', 'trench', 'excavation', 'Trench excavation', 'Trench excavation', 'Internal custom work definition.', 'm3', 'volume', 'standard', 'internal_custom'),
  ('earthworks.foundation_pit_excavation', 'earthworks', 'excavation', 'foundation_pit', 'excavation', 'Foundation pit excavation', 'Foundation pit excavation', 'Internal custom work definition.', 'm3', 'volume', 'complex', 'internal_custom'),
  ('earthworks.soil_backfill_compaction', 'earthworks', 'backfill', 'soil_backfill', 'compaction', 'Soil backfill compaction', 'Soil backfill compaction', 'Internal custom work definition.', 'm3', 'volume', 'standard', 'internal_custom'),
  ('earthworks.gravel_base_preparation', 'earthworks', 'base', 'gravel_base', 'preparation', 'Gravel base preparation', 'Gravel base preparation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('earthworks.site_grading', 'earthworks', 'grading', 'site', 'grading', 'Site grading', 'Site grading', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('roadworks.asphalt_pavement_installation', 'roadworks', 'pavement', 'asphalt_pavement', 'installation', 'Asphalt pavement installation', 'Asphalt pavement installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('roadworks.concrete_curb_installation', 'roadworks', 'road_edge', 'concrete_curb', 'installation', 'Concrete curb installation', 'Concrete curb installation', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('roadworks.road_marking_application', 'roadworks', 'traffic', 'road_marking', 'application', 'Road marking application', 'Road marking application', 'Internal custom work definition.', 'm', 'length', 'standard', 'internal_custom'),
  ('roadworks.sidewalk_paving_installation', 'roadworks', 'pedestrian', 'sidewalk_paving', 'installation', 'Sidewalk paving installation', 'Sidewalk paving installation', 'Internal custom work definition.', 'm2', 'area', 'standard', 'internal_custom'),
  ('roadworks.storm_drain_inlet_installation', 'roadworks', 'drainage', 'storm_drain_inlet', 'installation', 'Storm drain inlet installation', 'Storm drain inlet installation', 'Internal custom work definition.', 'pcs', 'count', 'standard', 'internal_custom')
on conflict (work_key) do nothing;

with alias_seed as (
  select
    id as work_id,
    title_ru as alias_text,
    lower(regexp_replace(title_ru, '[^a-zA-Z0-9]+', ' ', 'g')) as normalized_alias,
    'canonical_title'::text as alias_kind,
    1.0::numeric as confidence_weight
  from public.construction_work_definitions
  where source_kind = 'internal_custom'

  union all

  select
    id as work_id,
    replace(work_key, '.', ' ') as alias_text,
    lower(replace(replace(work_key, '.', ' '), '_', ' ')) as normalized_alias,
    'work_key_phrase'::text as alias_kind,
    0.95::numeric as confidence_weight
  from public.construction_work_definitions
  where source_kind = 'internal_custom'

  union all

  select
    id as work_id,
    concat(domain_key, ' ', operation_key, ' ', coalesce(element_key, 'work')) as alias_text,
    lower(concat(domain_key, ' ', operation_key, ' ', coalesce(element_key, 'work'))) as normalized_alias,
    'user_phrase'::text as alias_kind,
    0.85::numeric as confidence_weight
  from public.construction_work_definitions
  where source_kind = 'internal_custom'
)
insert into public.construction_work_aliases (
  work_id,
  alias_text,
  normalized_alias,
  language,
  alias_kind,
  confidence_weight
)
select
  work_id,
  alias_text,
  btrim(regexp_replace(normalized_alias, '\s+', ' ', 'g')) as normalized_alias,
  'ru',
  alias_kind,
  confidence_weight
from alias_seed
on conflict (work_id, normalized_alias) do nothing;

insert into public.construction_work_classification_codes (
  work_id,
  standard,
  code,
  title,
  mapping_kind,
  source_license,
  is_official
)
select
  id,
  'internal',
  'CW-' || lpad(row_number() over (order by work_key)::text, 4, '0'),
  title_ru,
  'internal_reference',
  null,
  false
from public.construction_work_definitions
where source_kind = 'internal_custom'
on conflict (work_id, standard, code) do nothing;

insert into public.construction_work_recipe_rows (
  work_id,
  row_kind,
  title_ru,
  unit,
  quantity_formula,
  unit_price_source,
  sort_order,
  is_required
)
select
  id,
  case
    when domain_key in ('plumbing', 'electrical', 'hvac') then 'labor'
    when domain_key in ('earthworks', 'roadworks') then 'equipment'
    else 'material'
  end,
  'Base recipe row: ' || title_ru,
  default_unit,
  case measurement_kind
    when 'area' then 'area_m2'
    when 'volume' then 'volume_m3'
    when 'length' then 'length_m'
    when 'count' then 'count'
    when 'weight' then 'weight_kg'
    when 'time' then 'hours'
    else 'lump_sum'
  end,
  case
    when domain_key in ('plumbing', 'electrical', 'hvac') then 'labor_reference'
    when domain_key in ('earthworks', 'roadworks') then 'equipment_reference'
    else 'catalog_or_reference'
  end,
  10,
  true
from public.construction_work_definitions
where source_kind = 'internal_custom'
on conflict (work_id, row_kind, title_ru, sort_order) do nothing;

insert into public.construction_work_migration_audit (
  wave,
  migration_name,
  audit_source_commit,
  migration_commit,
  status,
  created_tables,
  modified_existing_tables,
  catalog_items_modified,
  destructive_change_detected
)
values (
  'S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN',
  '20260605090000_add_construction_work_ontology',
  '2ff47297',
  null,
  'applied',
  '[
    "construction_work_domains",
    "construction_work_definitions",
    "construction_work_aliases",
    "construction_work_classification_codes",
    "construction_work_catalog_links",
    "construction_work_recipe_rows",
    "construction_work_migration_audit"
  ]'::jsonb,
  '[]'::jsonb,
  false,
  false
)
on conflict (wave, migration_name) do nothing;

commit;
