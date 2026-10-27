begin;

create or replace function public.rls_same_company_as_user_v1(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (
      p_user_id = auth.uid()
      or exists (
        select 1
        from public.company_members mine
        join public.company_members other_member
          on other_member.company_id = mine.company_id
        where mine.user_id = auth.uid()
          and other_member.user_id = p_user_id
      )
    );
$$;

create or replace function public.rls_same_company_as_user_text_v1(p_user_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when nullif(trim(coalesce(p_user_id, '')), '') is null then false
    when trim(p_user_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then false
    else public.rls_same_company_as_user_v1(trim(p_user_id)::uuid)
  end;
$$;

create or replace function public.rls_same_company_as_user_text_v1(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.rls_same_company_as_user_v1(p_user_id);
$$;

create or replace function public.rls_current_user_company_member_v1(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_company_id is not null
    and exists (
      select 1
      from public.company_members cm
      where cm.user_id = auth.uid()
        and cm.company_id = p_company_id
    );
$$;

create or replace function public.rls_request_visible_v1(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.requests r
    where r.id = p_request_id
      and (
        public.rls_same_company_as_user_text_v1(r.created_by)
        or public.rls_same_company_as_user_text_v1(r.submitted_by)
        or public.rls_same_company_as_user_text_v1(r.requested_by)
      )
  );
$$;

create or replace function public.rls_proposal_visible_v1(p_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.proposals p
    where p.id = p_proposal_id
      and (
        public.rls_same_company_as_user_text_v1(p.created_by)
        or (p.request_id is not null and public.rls_request_visible_v1(p.request_id))
      )
  );
$$;

create or replace function public.rls_purchase_visible_v1(p_purchase_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.purchases p
    where p.id = p_purchase_id
      and (
        public.rls_same_company_as_user_text_v1(p.created_by)
        or (p.request_id is not null and public.rls_request_visible_v1(p.request_id))
        or (p.proposal_id is not null and public.rls_proposal_visible_v1(p.proposal_id))
      )
  );
$$;

create or replace function public.rls_warehouse_issue_visible_v1(p_issue_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.warehouse_issues wi
    where wi.id = p_issue_id
      and wi.request_id is not null
      and public.rls_request_visible_v1(wi.request_id)
  );
$$;

alter table public.consumer_repair_request_drafts enable row level security;
alter table public.consumer_repair_request_items enable row level security;
alter table public.consumer_repair_request_media enable row level security;
alter table public.consumer_repair_request_pdfs enable row level security;
alter table public.consumer_marketplace_links enable row level security;
alter table public.consumer_repair_request_events enable row level security;
alter table public.market_listings enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_links enable row level security;
alter table public.media_ai_analysis enable row level security;
alter table public.requests enable row level security;
alter table public.request_items enable row level security;
alter table public.proposals enable row level security;
alter table public.warehouse_issues enable row level security;
alter table public.warehouse_issue_items enable row level security;
alter table public.purchases enable row level security;
alter table public.proposal_payments enable row level security;
alter table public.payments enable row level security;
alter table public.accounting_payments enable row level security;
alter table public.proposal_attachments enable row level security;
alter table public.app_errors enable row level security;
alter table public.ai_action_ledger enable row level security;
alter table public.ai_action_ledger_audit enable row level security;

drop policy if exists rls_consumer_repair_request_drafts_owner_v1 on public.consumer_repair_request_drafts;
create policy rls_consumer_repair_request_drafts_owner_v1 on public.consumer_repair_request_drafts
  for all to authenticated
  using (consumer_user_id = auth.uid())
  with check (consumer_user_id = auth.uid());

drop policy if exists rls_consumer_repair_request_items_owner_v1 on public.consumer_repair_request_items;
create policy rls_consumer_repair_request_items_owner_v1 on public.consumer_repair_request_items
  for all to authenticated
  using (exists (select 1 from public.consumer_repair_request_drafts d where d.id = request_draft_id and d.consumer_user_id = auth.uid()))
  with check (exists (select 1 from public.consumer_repair_request_drafts d where d.id = request_draft_id and d.consumer_user_id = auth.uid()));

drop policy if exists rls_consumer_repair_request_media_owner_v1 on public.consumer_repair_request_media;
create policy rls_consumer_repair_request_media_owner_v1 on public.consumer_repair_request_media
  for all to authenticated
  using (exists (select 1 from public.consumer_repair_request_drafts d where d.id = request_draft_id and d.consumer_user_id = auth.uid()))
  with check (exists (select 1 from public.consumer_repair_request_drafts d where d.id = request_draft_id and d.consumer_user_id = auth.uid()));

drop policy if exists rls_consumer_repair_request_pdfs_owner_v1 on public.consumer_repair_request_pdfs;
create policy rls_consumer_repair_request_pdfs_owner_v1 on public.consumer_repair_request_pdfs
  for select to authenticated
  using (exists (select 1 from public.consumer_repair_request_drafts d where d.id = request_draft_id and d.consumer_user_id = auth.uid()));

drop policy if exists rls_consumer_marketplace_links_owner_v1 on public.consumer_marketplace_links;
create policy rls_consumer_marketplace_links_owner_v1 on public.consumer_marketplace_links
  for select to authenticated
  using (exists (select 1 from public.consumer_repair_request_drafts d where d.id = request_draft_id and d.consumer_user_id = auth.uid()));

drop policy if exists rls_consumer_repair_request_events_owner_v1 on public.consumer_repair_request_events;
create policy rls_consumer_repair_request_events_owner_v1 on public.consumer_repair_request_events
  for select to authenticated
  using (exists (select 1 from public.consumer_repair_request_drafts d where d.id = request_draft_id and d.consumer_user_id = auth.uid()));

drop policy if exists rls_market_listings_owner_company_v1 on public.market_listings;
create policy rls_market_listings_owner_company_v1 on public.market_listings
  for all to authenticated
  using (user_id = auth.uid() or public.rls_current_user_company_member_v1(company_id))
  with check (user_id = auth.uid() or public.rls_current_user_company_member_v1(company_id));

drop policy if exists rls_market_listings_published_public_v1 on public.market_listings;
create policy rls_market_listings_published_public_v1 on public.market_listings
  for select to anon, authenticated
  using (status in ('active', 'published'));

drop policy if exists rls_media_assets_owner_company_public_v1 on public.media_assets;
create policy rls_media_assets_owner_company_public_v1 on public.media_assets
  for select to authenticated
  using (owner_user_id = auth.uid() or public.rls_current_user_company_member_v1(org_id) or public_marketplace_visible = true);

drop policy if exists rls_media_links_company_public_v1 on public.media_links;
create policy rls_media_links_company_public_v1 on public.media_links
  for select to authenticated
  using (public.rls_current_user_company_member_v1(org_id) or marketplace_visible = true);

drop policy if exists rls_media_ai_analysis_backend_only_v1 on public.media_ai_analysis;
create policy rls_media_ai_analysis_backend_only_v1 on public.media_ai_analysis
  for select to authenticated
  using (false);

drop policy if exists rls_requests_company_scope_v1 on public.requests;
drop policy if exists "dev.requests.select.any" on public.requests;
drop policy if exists "dev.requests.update.any" on public.requests;
drop policy if exists pdf_req_sel on public.requests;
drop policy if exists pdf_req_sel_anon on public.requests;
drop policy if exists req_sel_any on public.requests;
drop policy if exists req_upd_any on public.requests;
drop policy if exists requests_select_auth on public.requests;
drop policy if exists requests_update_auth on public.requests;
drop policy if exists rq_sel on public.requests;
create policy rls_requests_company_scope_v1 on public.requests
  for all to authenticated
  using (
    public.rls_same_company_as_user_text_v1(created_by)
    or public.rls_same_company_as_user_text_v1(submitted_by)
    or public.rls_same_company_as_user_text_v1(requested_by)
  )
  with check (
    public.rls_same_company_as_user_text_v1(created_by)
    or public.rls_same_company_as_user_text_v1(submitted_by)
    or public.rls_same_company_as_user_text_v1(requested_by)
  );

drop policy if exists rls_request_items_company_scope_v1 on public.request_items;
create policy rls_request_items_company_scope_v1 on public.request_items
  for all to authenticated
  using (public.rls_request_visible_v1(request_id))
  with check (public.rls_request_visible_v1(request_id));

drop policy if exists rls_proposals_company_scope_v1 on public.proposals;
create policy rls_proposals_company_scope_v1 on public.proposals
  for all to authenticated
  using (public.rls_same_company_as_user_text_v1(created_by) or (request_id is not null and public.rls_request_visible_v1(request_id)))
  with check (public.rls_same_company_as_user_text_v1(created_by) or (request_id is not null and public.rls_request_visible_v1(request_id)));

drop policy if exists rls_warehouse_issues_company_scope_v1 on public.warehouse_issues;
create policy rls_warehouse_issues_company_scope_v1 on public.warehouse_issues
  for all to authenticated
  using (request_id is not null and public.rls_request_visible_v1(request_id))
  with check (request_id is not null and public.rls_request_visible_v1(request_id));

drop policy if exists rls_warehouse_issue_items_company_scope_v1 on public.warehouse_issue_items;
create policy rls_warehouse_issue_items_company_scope_v1 on public.warehouse_issue_items
  for all to authenticated
  using (public.rls_warehouse_issue_visible_v1(issue_id))
  with check (public.rls_warehouse_issue_visible_v1(issue_id));

drop policy if exists rls_purchases_company_scope_v1 on public.purchases;
create policy rls_purchases_company_scope_v1 on public.purchases
  for all to authenticated
  using (
    public.rls_same_company_as_user_text_v1(created_by)
    or (request_id is not null and public.rls_request_visible_v1(request_id))
    or (proposal_id is not null and public.rls_proposal_visible_v1(proposal_id))
  )
  with check (
    public.rls_same_company_as_user_text_v1(created_by)
    or (request_id is not null and public.rls_request_visible_v1(request_id))
    or (proposal_id is not null and public.rls_proposal_visible_v1(proposal_id))
  );

drop policy if exists rls_proposal_payments_company_scope_v1 on public.proposal_payments;
create policy rls_proposal_payments_company_scope_v1 on public.proposal_payments
  for all to authenticated
  using (public.rls_proposal_visible_v1(proposal_id))
  with check (public.rls_proposal_visible_v1(proposal_id));

drop policy if exists rls_payments_company_scope_v1 on public.payments;
create policy rls_payments_company_scope_v1 on public.payments
  for all to authenticated
  using (
    public.rls_proposal_visible_v1(proposal_id)
    or (purchase_id is not null and public.rls_purchase_visible_v1(purchase_id))
  )
  with check (
    public.rls_proposal_visible_v1(proposal_id)
    or (purchase_id is not null and public.rls_purchase_visible_v1(purchase_id))
  );

drop policy if exists rls_accounting_payments_company_scope_v1 on public.accounting_payments;
create policy rls_accounting_payments_company_scope_v1 on public.accounting_payments
  for all to authenticated
  using (public.rls_proposal_visible_v1(proposal_id))
  with check (public.rls_proposal_visible_v1(proposal_id));

drop policy if exists rls_proposal_attachments_company_scope_v1 on public.proposal_attachments;
create policy rls_proposal_attachments_company_scope_v1 on public.proposal_attachments
  for select to authenticated
  using (proposal_id is not null and public.rls_proposal_visible_v1(proposal_id));

drop policy if exists rls_app_errors_backend_only_v1 on public.app_errors;
create policy rls_app_errors_backend_only_v1 on public.app_errors
  for select to authenticated
  using (false);

drop policy if exists rls_ai_action_ledger_company_scope_v1 on public.ai_action_ledger;
create policy rls_ai_action_ledger_company_scope_v1 on public.ai_action_ledger
  for select to authenticated
  using (requested_by = auth.uid() or public.rls_current_user_company_member_v1(organization_id));

drop policy if exists rls_ai_action_ledger_audit_company_scope_v1 on public.ai_action_ledger_audit;
create policy rls_ai_action_ledger_audit_company_scope_v1 on public.ai_action_ledger_audit
  for select to authenticated
  using (actor_user_id = auth.uid() or public.rls_current_user_company_member_v1(organization_id));

drop policy if exists rls_storage_private_media_read_v1 on storage.objects;
create policy rls_storage_private_media_read_v1 on storage.objects
  for select to authenticated
  using (
    bucket_id = 'private-media'
    and exists (
      select 1
      from public.media_assets ma
      where ma.storage_bucket = bucket_id
        and ma.storage_key = name
        and (ma.owner_user_id = auth.uid() or public.rls_current_user_company_member_v1(ma.org_id))
    )
  );

drop policy if exists rls_storage_client_visible_media_read_v1 on storage.objects;
create policy rls_storage_client_visible_media_read_v1 on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-visible-media'
    and exists (
      select 1
      from public.media_assets ma
      where ma.storage_bucket = bucket_id
        and ma.storage_key = name
        and (ma.owner_user_id = auth.uid() or public.rls_current_user_company_member_v1(ma.org_id) or ma.client_visible = true)
    )
  );

drop policy if exists rls_storage_public_marketplace_media_read_v1 on storage.objects;
create policy rls_storage_public_marketplace_media_read_v1 on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'public-marketplace-media'
    and exists (
      select 1
      from public.media_assets ma
      where ma.storage_bucket = bucket_id
        and ma.storage_key = name
        and ma.public_marketplace_visible = true
    )
  );

commit;
