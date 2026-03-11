-- TASK: DB-Level Idempotency Enforcement for Approve -> Purchase v1
-- Scope: additive only, no destructive rewrites.
-- Status: draft/candidate SQL; apply in phased rollout after duplicate cleanup.

-- =========================================================
-- Phase A: Read-only duplicate audit queries
-- =========================================================

-- A1) purchases: one proposal_id -> one purchase
select proposal_id, count(*) as cnt
from public.purchases
where proposal_id is not null
group by proposal_id
having count(*) > 1
order by cnt desc, proposal_id;

-- A2) wh_incoming: one purchase_id -> one incoming header
select purchase_id, count(*) as cnt
from public.wh_incoming
where purchase_id is not null
group by purchase_id
having count(*) > 1
order by cnt desc, purchase_id;

-- A3) purchase_items fallback uniqueness in current model
-- (proposal_item_id may be absent; request_item_id acts as source proxy)
select purchase_id, request_item_id, count(*) as cnt
from public.purchase_items
where request_item_id is not null
group by purchase_id, request_item_id
having count(*) > 1
order by cnt desc, purchase_id;

-- A4) if proposal_item_id already exists in your installation
-- select proposal_item_id, count(*) as cnt
-- from public.purchase_items
-- where proposal_item_id is not null
-- group by proposal_item_id
-- having count(*) > 1
-- order by cnt desc, proposal_item_id;

-- A5) wh_ledger source duplicates (if source columns already exist)
-- select source_type, source_id, count(*) as cnt
-- from public.wh_ledger
-- where source_type is not null and source_id is not null
-- group by source_type, source_id
-- having count(*) > 1
-- order by cnt desc;

-- =========================================================
-- Phase B: Additive schema extension for canonical source keys
-- =========================================================

alter table if exists public.purchase_items
  add column if not exists source_proposal_item_id text;

alter table if exists public.wh_ledger
  add column if not exists source_type text,
  add column if not exists source_id text;

-- Optional canonical operation id (for retries/replays)
alter table if exists public.purchases
  add column if not exists source_approval_key text;

-- =========================================================
-- Phase C: Best-effort backfill (safe, non-destructive)
-- =========================================================

-- C1) purchase_items.source_proposal_item_id from (purchase.proposal_id + request_item_id)
-- Uses deterministic winner (latest proposal_item id) if multiple candidates exist.
with pi_candidates as (
  select
    pi.id as purchase_item_id,
    p.proposal_id::text as proposal_id,
    pi.request_item_id::text as request_item_id
  from public.purchase_items pi
  join public.purchases p on p.id = pi.purchase_id
  where p.proposal_id is not null
    and pi.request_item_id is not null
),
src as (
  select
    c.purchase_item_id,
    (
      select x.id::text
      from public.proposal_items x
      where x.proposal_id::text = c.proposal_id
        and x.request_item_id::text = c.request_item_id
      order by x.created_at desc nulls last, x.id desc
      limit 1
    ) as source_proposal_item_id
  from pi_candidates c
)
update public.purchase_items t
set source_proposal_item_id = s.source_proposal_item_id
from src s
where t.id = s.purchase_item_id
  and t.source_proposal_item_id is null
  and s.source_proposal_item_id is not null;

-- C2) wh_ledger source backfill for incoming movement rows
update public.wh_ledger l
set
  source_type = coalesce(l.source_type, 'incoming_item'),
  source_id = coalesce(l.source_id, l.incoming_item_id::text)
where l.incoming_item_id is not null
  and (l.source_type is null or l.source_id is null);

-- =========================================================
-- Phase D: Enforce unique invariants (apply only after cleanup)
-- =========================================================

-- D1) purchases: one proposal -> one purchase
create unique index if not exists ux_purchases_proposal_id
  on public.purchases (proposal_id)
  where proposal_id is not null;

-- D2) optional operation-level idempotency key
create unique index if not exists ux_purchases_source_approval_key
  on public.purchases (source_approval_key)
  where source_approval_key is not null;

-- D3) purchase_items strict mapping from proposal line (preferred)
create unique index if not exists ux_purchase_items_source_proposal_item_id
  on public.purchase_items (source_proposal_item_id)
  where source_proposal_item_id is not null;

-- D4) fallback: prevent duplicate request_item inside one purchase
create unique index if not exists ux_purchase_items_purchase_request_item
  on public.purchase_items (purchase_id, request_item_id)
  where request_item_id is not null;

-- D5) one purchase -> one incoming header
create unique index if not exists ux_wh_incoming_purchase_id
  on public.wh_incoming (purchase_id)
  where purchase_id is not null;

-- D6) one source event -> one ledger row
create unique index if not exists ux_wh_ledger_source
  on public.wh_ledger (source_type, source_id)
  where source_type is not null and source_id is not null;

-- =========================================================
-- Phase E: RPC idempotency alignment (implementation checklist)
-- =========================================================
-- 1) director_approve_min_auto:
--    - lock proposal row FOR UPDATE
--    - return early when already approved
-- 2) ensure_purchase_and_incoming_strict:
--    - upsert purchase by proposal_id
--    - upsert incoming by purchase_id
--    - line inserts must be INSERT .. ON CONFLICT DO NOTHING/UPDATE
-- 3) proposal_send_to_accountant_min:
--    - return early if sent_to_accountant_at is already set
-- 4) work_seed_from_purchase:
--    - idempotent seed by purchase_id + work source key

