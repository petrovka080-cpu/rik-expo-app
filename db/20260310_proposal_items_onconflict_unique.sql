-- Additive unique index to support buyer submit bulk upsert path:
-- .upsert(..., { onConflict: 'proposal_id,request_item_id' })
--
-- Important:
-- PostgREST/Supabase ON CONFLICT inference does not reliably match this path
-- against a partial unique index in all runtimes. Use a full unique index.
-- NULL values remain allowed (Postgres unique indexes treat NULLs as distinct).

drop index if exists public.ux_proposal_items_proposal_request_item;

create unique index if not exists ux_proposal_items_proposal_request_item
  on public.proposal_items (proposal_id, request_item_id);
