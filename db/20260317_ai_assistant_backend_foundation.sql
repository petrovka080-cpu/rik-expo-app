begin;

create extension if not exists pgcrypto;

create table if not exists public.ai_reports (
  id text primary key,
  company_id uuid null references public.companies(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  role text null,
  context text null,
  title text null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_reports_user_created
  on public.ai_reports(user_id, created_at desc);
create index if not exists idx_ai_reports_company_created
  on public.ai_reports(company_id, created_at desc);

alter table public.ai_reports enable row level security;
grant select, insert, update on public.ai_reports to authenticated;

drop policy if exists ai_reports_select_own on public.ai_reports;
create policy ai_reports_select_own
on public.ai_reports
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists ai_reports_insert_own on public.ai_reports;
create policy ai_reports_insert_own
on public.ai_reports
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists ai_reports_update_own on public.ai_reports;
create policy ai_reports_update_own
on public.ai_reports
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.ai_configs (
  id text primary key,
  content text not null,
  description text null,
  updated_at timestamptz not null default now()
);

alter table public.ai_configs enable row level security;
grant select on public.ai_configs to authenticated;

drop policy if exists ai_configs_public_read on public.ai_configs;
create policy ai_configs_public_read
on public.ai_configs
for select
to authenticated
using (true);

insert into public.ai_configs (id, content, description)
values (
  'procurement_system_prompt',
  'You are GOX AI assistant for construction procurement and marketplace workflows. Reply concisely and use Russian when the user writes in Russian.',
  'Default procurement prompt for the mobile AI assistant'
)
on conflict (id) do update
set content = excluded.content,
    description = excluded.description,
    updated_at = now();

create table if not exists public.ai_user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_type text not null check (
    preference_type in (
      'preferred_supplier',
      'preferred_unit',
      'default_quantity',
      'price_sensitivity',
      'quality_priority'
    )
  ),
  category text null,
  key text not null,
  value jsonb not null,
  confidence numeric not null default 0.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_learnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid null,
  input_text text not null,
  parsed_items jsonb null,
  corrected_items jsonb null,
  was_correct boolean not null default true,
  learning_type text null check (
    learning_type in (
      'quantity_correction',
      'unit_correction',
      'material_correction',
      'supplier_preference',
      'synonym_learned'
    )
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_construction_knowledge (
  id uuid primary key default gen_random_uuid(),
  knowledge_type text not null check (
    knowledge_type in (
      'snip_norm',
      'material_relation',
      'typical_quantity',
      'unit_conversion',
      'safety_rule',
      'work_sequence'
    )
  ),
  category text null,
  material text null,
  key text not null,
  value jsonb not null,
  source text null,
  priority integer not null default 50,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_user_order_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_name text not null,
  rik_code text null,
  total_quantity numeric not null default 0,
  order_count integer not null default 0,
  last_ordered_at timestamptz null,
  avg_quantity numeric null,
  preferred_unit text null,
  preferred_supplier_id uuid null,
  category text null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_preferences_user
  on public.ai_user_preferences(user_id);
create index if not exists idx_ai_preferences_type
  on public.ai_user_preferences(preference_type, category);
create index if not exists idx_ai_learnings_user
  on public.ai_learnings(user_id);
create index if not exists idx_ai_learnings_type
  on public.ai_learnings(learning_type);
create index if not exists idx_ai_knowledge_type
  on public.ai_construction_knowledge(knowledge_type, category);
create index if not exists idx_ai_knowledge_material
  on public.ai_construction_knowledge(material);
create index if not exists idx_ai_order_history_user
  on public.ai_user_order_history(user_id);
create index if not exists idx_ai_order_history_material
  on public.ai_user_order_history(material_name);

alter table public.ai_user_preferences enable row level security;
alter table public.ai_learnings enable row level security;
alter table public.ai_construction_knowledge enable row level security;
alter table public.ai_user_order_history enable row level security;

grant select, insert, update, delete on public.ai_user_preferences to authenticated;
grant select, insert, update, delete on public.ai_learnings to authenticated;
grant select on public.ai_construction_knowledge to authenticated;
grant select, insert, update, delete on public.ai_user_order_history to authenticated;

drop policy if exists ai_user_preferences_own on public.ai_user_preferences;
create policy ai_user_preferences_own
on public.ai_user_preferences
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists ai_learnings_own on public.ai_learnings;
create policy ai_learnings_own
on public.ai_learnings
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists ai_construction_knowledge_read on public.ai_construction_knowledge;
create policy ai_construction_knowledge_read
on public.ai_construction_knowledge
for select
to authenticated
using (true);

drop policy if exists ai_user_order_history_own on public.ai_user_order_history;
create policy ai_user_order_history_own
on public.ai_user_order_history
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.get_user_order_patterns(
  p_user_id uuid,
  p_limit integer default 10
)
returns table (
  material_name text,
  order_count integer,
  avg_quantity numeric,
  preferred_unit text,
  preferred_supplier_id uuid,
  last_ordered_at timestamptz
)
language sql
stable
as $$
  select
    h.material_name,
    h.order_count,
    h.avg_quantity,
    h.preferred_unit,
    h.preferred_supplier_id,
    h.last_ordered_at
  from public.ai_user_order_history h
  where h.user_id = p_user_id
  order by h.order_count desc, h.last_ordered_at desc nulls last
  limit greatest(coalesce(p_limit, 10), 1)
$$;

create or replace function public.get_construction_recommendations(
  p_category text default null,
  p_material text default null,
  p_limit integer default 10
)
returns table (
  knowledge_type text,
  category text,
  material text,
  key text,
  value jsonb,
  source text,
  priority integer
)
language sql
stable
as $$
  select
    k.knowledge_type,
    k.category,
    k.material,
    k.key,
    k.value,
    k.source,
    k.priority
  from public.ai_construction_knowledge k
  where k.is_active = true
    and (p_category is null or k.category = p_category)
    and (p_material is null or k.material = p_material)
  order by k.priority desc, k.created_at desc
  limit greatest(coalesce(p_limit, 10), 1)
$$;

grant execute on function public.get_user_order_patterns(uuid, integer) to authenticated;
grant execute on function public.get_construction_recommendations(text, text, integer) to authenticated;

commit;
