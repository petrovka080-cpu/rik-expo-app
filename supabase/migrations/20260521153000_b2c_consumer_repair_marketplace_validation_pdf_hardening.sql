alter table public.consumer_repair_request_drafts
  add column if not exists marketplace_ready_at timestamptz null,
  add column if not exists marketplace_validation_errors jsonb not null default '[]'::jsonb,
  add column if not exists last_marketplace_submit_attempt_at timestamptz null;

alter table public.consumer_repair_request_media
  add column if not exists media_type text null
    check (media_type is null or media_type in ('photo', 'video', 'document'));

alter table public.consumer_repair_request_pdfs
  add column if not exists content_type text not null default 'application/pdf'
    check (content_type = 'application/pdf'),
  add column if not exists uploaded_at timestamptz null,
  add column if not exists storage_verified_at timestamptz null;

alter table public.consumer_marketplace_links
  add column if not exists idempotency_key text null;

create index if not exists idx_consumer_repair_requests_user_status_created
  on public.consumer_repair_request_drafts (consumer_user_id, status, created_at desc);

create index if not exists idx_consumer_repair_request_items_request
  on public.consumer_repair_request_items (request_draft_id);

create index if not exists idx_consumer_repair_request_media_request_type
  on public.consumer_repair_request_media (request_draft_id, media_type);

create index if not exists idx_consumer_repair_request_pdfs_request_created
  on public.consumer_repair_request_pdfs (request_draft_id, created_at desc);

create index if not exists idx_consumer_marketplace_links_request_status
  on public.consumer_marketplace_links (request_draft_id, status);

create index if not exists idx_consumer_repair_request_events_request_created
  on public.consumer_repair_request_events (request_draft_id, created_at desc);

create unique index if not exists ux_consumer_marketplace_links_request_sent
  on public.consumer_marketplace_links (request_draft_id)
  where status in ('sent', 'offers_received', 'closed');

create or replace function public.submit_consumer_repair_request_to_marketplace(
  p_request_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_request public.consumer_repair_request_drafts%rowtype;
  v_link public.consumer_marketplace_links%rowtype;
  v_items_count integer;
  v_media_count integer;
  v_pdf_count integer;
  v_errors jsonb := '[]'::jsonb;
  v_marketplace_demand_id text;
begin
  select *
    into v_request
    from public.consumer_repair_request_drafts
   where id = p_request_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 404, 'errors', jsonb_build_array(jsonb_build_object('code', 'REQUEST_NOT_FOUND', 'messageRu', 'Заявка не найдена.')));
  end if;

  if auth.uid() is distinct from v_request.consumer_user_id then
    v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'OWNER_MISMATCH', 'messageRu', 'Эта заявка принадлежит другому пользователю.', 'field', 'consumerUserId'));
  end if;

  select count(*) into v_items_count
    from public.consumer_repair_request_items
   where request_draft_id = p_request_id;

  select count(*) into v_media_count
    from public.consumer_repair_request_media
   where request_draft_id = p_request_id;

  select count(*) into v_pdf_count
    from public.consumer_repair_request_pdfs
   where request_draft_id = p_request_id
     and pdf_status = 'generated'
     and content_type = 'application/pdf'
     and storage_key is not null
     and coalesce(storage_verified_at, uploaded_at, created_at) is not null;

  if v_request.status not in ('consumer_approved', 'sent_to_marketplace') then
    v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'REQUEST_NOT_APPROVED', 'messageRu', 'Сначала утвердите заявку.', 'field', 'status'));
  end if;
  if coalesce(length(regexp_replace(v_request.contact_phone, '\D', '', 'g')), 0) < 7 then
    v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'CONTACT_REQUIRED', 'messageRu', 'Укажите телефон, чтобы мастера могли связаться с вами.', 'field', 'contactPhone'));
  end if;
  if length(trim(coalesce(v_request.problem_text, ''))) < 20 then
    v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'DESCRIPTION_REQUIRED', 'messageRu', 'Добавьте описание проблемы.', 'field', 'problemText'));
  end if;
  if v_media_count < 1 then
    v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'MEDIA_REQUIRED', 'messageRu', 'Добавьте хотя бы одно фото, видео или документ.', 'field', 'media'));
  end if;
  if v_items_count < 1 then
    v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'ITEMS_REQUIRED', 'messageRu', 'Добавьте хотя бы одну позицию заявки.', 'field', 'items'));
  end if;
  if coalesce(v_request.repair_type, 'unknown') = 'unknown' then
    v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'REPAIR_TYPE_REQUIRED', 'messageRu', 'Выберите тип ремонта.', 'field', 'repairType'));
  end if;
  if v_pdf_count < 1 then
    v_errors := v_errors || jsonb_build_array(jsonb_build_object('code', 'PDF_REQUIRED', 'messageRu', 'Сначала создайте PDF заявки.', 'field', 'pdf'));
  end if;

  if jsonb_array_length(v_errors) > 0 then
    update public.consumer_repair_request_drafts
       set marketplace_validation_errors = v_errors,
           last_marketplace_submit_attempt_at = now(),
           updated_at = now()
     where id = p_request_id;

    insert into public.consumer_repair_request_events (request_draft_id, event_type, actor_user_id, actor_type, payload)
    values (p_request_id, 'marketplace_send_blocked', auth.uid(), 'consumer', jsonb_build_object('errors', v_errors));

    return jsonb_build_object('ok', false, 'status', 422, 'errors', v_errors);
  end if;

  select *
    into v_link
    from public.consumer_marketplace_links
   where request_draft_id = p_request_id
     and status in ('sent', 'offers_received', 'closed')
   order by created_at desc
   limit 1
   for update;

  if found then
    return jsonb_build_object('ok', true, 'status', 200, 'marketplaceDemandId', v_link.marketplace_demand_id, 'idempotent', true);
  end if;

  v_marketplace_demand_id := 'marketplace_demand_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.consumer_marketplace_links (request_draft_id, marketplace_demand_id, status, sent_at, idempotency_key)
  values (p_request_id, v_marketplace_demand_id, 'sent', now(), p_idempotency_key)
  on conflict do nothing;

  update public.consumer_repair_request_drafts
     set status = 'sent_to_marketplace',
         marketplace_ready_at = now(),
         marketplace_validation_errors = '[]'::jsonb,
         last_marketplace_submit_attempt_at = now(),
         updated_at = now()
   where id = p_request_id;

  insert into public.consumer_repair_request_events (request_draft_id, event_type, actor_user_id, actor_type, payload)
  values (p_request_id, 'sent_to_marketplace', auth.uid(), 'consumer', jsonb_build_object('marketplaceDemandId', v_marketplace_demand_id, 'idempotencyKey', p_idempotency_key));

  return jsonb_build_object('ok', true, 'status', 201, 'marketplaceDemandId', v_marketplace_demand_id, 'idempotent', false);
end;
$$;
