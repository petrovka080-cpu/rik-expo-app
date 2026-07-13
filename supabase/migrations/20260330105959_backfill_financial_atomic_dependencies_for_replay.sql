begin;

alter table if exists public.proposals
  add column if not exists invoice_number text,
  add column if not exists invoice_date date,
  add column if not exists invoice_currency text,
  add column if not exists invoice_amount numeric,
  add column if not exists total_paid numeric,
  add column if not exists payment_status text;

alter table if exists public.proposal_items
  add column if not exists name_human text,
  add column if not exists uom text,
  add column if not exists supplier text,
  add column if not exists total_qty numeric,
  add column if not exists app_code text,
  add column if not exists note text,
  add column if not exists proposal_id_text text,
  add column if not exists proposal_id_bigint bigint;

alter table if exists public.request_items
  add column if not exists status text,
  add column if not exists cancelled_at timestamptz;

alter table if exists public.proposal_payments
  add column if not exists accountant_fio text,
  add column if not exists idempotency_key text;

create table if not exists public.accounting_invoices (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid,
  invoice_number text,
  invoice_date date,
  invoice_currency text,
  invoice_amount numeric,
  created_at timestamptz,
  created_by uuid
);

create table if not exists public.proposal_payment_allocations (
  id bigint generated always as identity primary key,
  payment_id bigint,
  proposal_item_id bigint,
  amount numeric,
  created_at timestamptz
);

create table if not exists public.accounting_events (
  id bigint generated always as identity primary key,
  proposal_id uuid,
  kind text,
  payload jsonb,
  actor_id uuid,
  created_at timestamptz
);

create table if not exists public.accounting_payments (
  id bigint generated always as identity primary key,
  proposal_id uuid,
  amount numeric,
  currency text,
  method text,
  note text,
  purpose text,
  created_by uuid,
  paid_at timestamptz,
  created_at timestamptz
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid,
  purchase_id uuid,
  request_item_id uuid,
  amount numeric not null default 0,
  method text,
  note text,
  paid_at timestamptz
);

comment on table public.accounting_invoices is
'Compatibility empty accounting invoices table for local replayability when remote history placeholders did not recreate the original accounting tables. Created only when absent.';

comment on table public.proposal_payment_allocations is
'Compatibility empty proposal payment allocations table for local replayability when remote history placeholders did not recreate the original allocation table. Created only when absent.';

comment on table public.payments is
'Compatibility empty payments table for local replayability when remote history placeholders did not recreate the original purchase/proposal payment table. Created only when absent.';

commit;
