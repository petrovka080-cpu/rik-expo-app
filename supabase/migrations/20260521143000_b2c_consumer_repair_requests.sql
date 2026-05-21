create table if not exists public.consumer_repair_request_drafts (
  id uuid primary key default gen_random_uuid(),
  consumer_user_id uuid not null,
  org_id uuid null,
  title text null,
  problem_text text null,
  repair_type text not null default 'unknown',
  city text null,
  address_text text null,
  preferred_time_text text null,
  contact_phone text null,
  status text not null default 'draft'
    check (status in ('draft', 'consumer_approved', 'sent_to_marketplace', 'cancelled', 'archived')),
  ai_summary_ru text null,
  missing_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  approved_at timestamptz null
);

create table if not exists public.consumer_repair_request_items (
  id uuid primary key default gen_random_uuid(),
  request_draft_id uuid not null references public.consumer_repair_request_drafts(id) on delete cascade,
  item_type text not null check (item_type in ('work', 'material', 'service', 'document', 'other')),
  title_ru text not null,
  quantity numeric null,
  unit text null,
  unit_price numeric null,
  total_price numeric null,
  currency text not null default 'KGS',
  source text not null default 'ai_suggested'
    check (source in ('ai_suggested', 'user_added', 'marketplace', 'reference_price_book')),
  editable_by_consumer boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.consumer_repair_request_media (
  id uuid primary key default gen_random_uuid(),
  request_draft_id uuid not null references public.consumer_repair_request_drafts(id) on delete cascade,
  media_asset_id uuid not null,
  purpose text not null default 'request_evidence',
  created_at timestamptz not null default now()
);

create table if not exists public.consumer_repair_request_pdfs (
  id uuid primary key default gen_random_uuid(),
  request_draft_id uuid not null references public.consumer_repair_request_drafts(id) on delete cascade,
  document_asset_id uuid null,
  storage_bucket text not null,
  storage_key text not null,
  title_ru text not null,
  pdf_status text not null default 'generated' check (pdf_status in ('generated', 'failed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.consumer_repair_request_events (
  id uuid primary key default gen_random_uuid(),
  request_draft_id uuid not null references public.consumer_repair_request_drafts(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid null,
  actor_type text not null default 'consumer' check (actor_type in ('consumer', 'ai', 'system', 'marketplace')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.consumer_marketplace_links (
  id uuid primary key default gen_random_uuid(),
  request_draft_id uuid not null references public.consumer_repair_request_drafts(id) on delete cascade,
  marketplace_demand_id text null,
  status text not null default 'not_sent' check (status in ('not_sent', 'sent', 'offers_received', 'closed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz null
);

create index if not exists consumer_repair_request_drafts_consumer_idx
  on public.consumer_repair_request_drafts (consumer_user_id, created_at desc);

create index if not exists consumer_repair_request_items_draft_idx
  on public.consumer_repair_request_items (request_draft_id);

create index if not exists consumer_repair_request_media_draft_idx
  on public.consumer_repair_request_media (request_draft_id);

create index if not exists consumer_repair_request_pdfs_draft_idx
  on public.consumer_repair_request_pdfs (request_draft_id, created_at desc);

alter table public.consumer_repair_request_drafts enable row level security;
alter table public.consumer_repair_request_items enable row level security;
alter table public.consumer_repair_request_media enable row level security;
alter table public.consumer_repair_request_pdfs enable row level security;
alter table public.consumer_repair_request_events enable row level security;
alter table public.consumer_marketplace_links enable row level security;
