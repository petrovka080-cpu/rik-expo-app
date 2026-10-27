-- S_WHOLE_APP_50K_EXPLAIN_P95_PROOF_CLOSEOUT
-- Safe additive indexes observed from live 50k synthetic fixture EXPLAIN ANALYZE.

create index if not exists idx_consumer_repair_request_drafts_user_created_cover_50k
  on public.consumer_repair_request_drafts (consumer_user_id, created_at desc)
  include (id, status);

create index if not exists idx_consumer_repair_request_pdfs_created_cover_50k
  on public.consumer_repair_request_pdfs (created_at desc)
  include (id, storage_bucket, storage_key);

create index if not exists idx_market_listings_active_published_created_cover_50k
  on public.market_listings (created_at desc)
  include (id, title, status)
  where status in ('active', 'published');

create index if not exists idx_ai_action_ledger_org_created_cover_50k
  on public.ai_action_ledger (organization_id, created_at desc)
  include (id, status);
