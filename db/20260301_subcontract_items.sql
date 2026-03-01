-- db/20260301_subcontract_items.sql
-- Строки черновика/подряда: позиции из каталога и сметы.

begin;

create table if not exists public.subcontract_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subcontract_id uuid not null references public.subcontracts(id) on delete cascade,
  created_by uuid null,

  source text not null default 'catalog'
    check (source in ('catalog', 'smeta')),

  rik_code text null,
  name text not null,
  qty numeric not null default 1 check (qty > 0),
  uom text null,

  status text not null default 'draft'
    check (status in ('draft', 'canceled'))
);

create index if not exists idx_subcontract_items_subcontract_created
  on public.subcontract_items (subcontract_id, created_at desc);

create index if not exists idx_subcontract_items_subcontract_status
  on public.subcontract_items (subcontract_id, status);

commit;

