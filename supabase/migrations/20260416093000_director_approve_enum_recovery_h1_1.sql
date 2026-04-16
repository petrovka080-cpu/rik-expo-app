-- H1.1: Director approve enum recovery
-- Scope: server-side enum-safe status normalization only.
-- No UI, route, mutation, PDF, or business aggregate changes.

begin;

create or replace function public.proposal_request_item_integrity_v1(p_proposal_id text)
returns table (
  proposal_id text,
  proposal_item_id bigint,
  request_item_id text,
  integrity_state text,
  integrity_reason text,
  request_item_exists boolean,
  request_item_status text,
  request_item_cancelled_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    coalesce(pi.proposal_id_text, pi.proposal_id::text) as proposal_id,
    pi.id::bigint as proposal_item_id,
    pi.request_item_id::text as request_item_id,
    case
      when ri.id is null then 'source_missing'
      when ri.cancelled_at is not null
        or lower(trim(coalesce(ri.status::text, ''))) in (
          'cancelled',
          'canceled',
          U&'\043E\0442\043C\0435\043D\0435\043D\0430',
          U&'\043E\0442\043C\0435\043D\0435\043D\043E'
        )
        then 'source_cancelled'
      else 'active'
    end as integrity_state,
    case
      when ri.id is null then 'request_item_missing'
      when ri.cancelled_at is not null
        or lower(trim(coalesce(ri.status::text, ''))) in (
          'cancelled',
          'canceled',
          U&'\043E\0442\043C\0435\043D\0435\043D\0430',
          U&'\043E\0442\043C\0435\043D\0435\043D\043E'
        )
        then 'request_item_cancelled'
      else null
    end as integrity_reason,
    ri.id is not null as request_item_exists,
    ri.status::text as request_item_status,
    ri.cancelled_at as request_item_cancelled_at
  from public.proposal_items pi
  left join public.request_items ri
    on ri.id = pi.request_item_id
  where coalesce(pi.proposal_id_text, pi.proposal_id::text) = p_proposal_id::text
  order by pi.id;
$$;

comment on function public.proposal_request_item_integrity_v1(text) is
'H1.1 enum-safe proposal -> request_item integrity classifier. Reads request_items.status via ::text before empty-string fallback.';

grant execute on function public.proposal_request_item_integrity_v1(text) to authenticated;

create or replace function public.director_approve_request_v1(
  p_request_id text,
  p_client_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_exists boolean := false;
  v_current_status text := '';
  v_current_status_norm text := '';
  v_items_affected integer := 0;
  v_target_status public.request_status_enum :=
    U&'\041A \0437\0430\043A\0443\043F\043A\0435'::public.request_status_enum;
begin
  select true, trim(coalesce(r.status::text, ''))
  into v_request_exists, v_current_status
  from public.requests r
  where r.id::text = p_request_id::text
  limit 1;

  if v_request_exists is distinct from true then
    return jsonb_build_object(
      'ok', false,
      'failure_message', U&'\0417\0430\044F\0432\043A\0430 \043D\0435 \043D\0430\0439\0434\0435\043D\0430',
      'failure_code', 'request_not_found',
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  v_current_status_norm := lower(regexp_replace(trim(coalesce(v_current_status, '')), '\s+', ' ', 'g'));

  if v_current_status_norm in (
    'approved',
    'sent',
    'to_purchase',
    U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\0430',
    U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\043E',
    U&'\043A \0437\0430\043A\0443\043F\043A\0435'
  ) then
    return jsonb_build_object(
      'ok', true,
      'idempotent_replay', true,
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  update public.request_items ri
  set
    status = v_target_status,
    updated_at = now()
  where ri.request_id::text = p_request_id::text
    and lower(trim(coalesce(ri.status::text, ''))) not in (
      'rejected',
      'cancelled',
      'canceled',
      U&'\043E\0442\043A\043B\043E\043D\0435\043D\0430',
      U&'\043E\0442\043A\043B\043E\043D\0435\043D\043E',
      U&'\043E\0442\043C\0435\043D\0435\043D\0430',
      U&'\043E\0442\043C\0435\043D\0435\043D\043E'
    );

  get diagnostics v_items_affected = row_count;

  update public.requests
  set
    status = v_target_status,
    updated_at = now()
  where id::text = p_request_id::text;

  return jsonb_build_object(
    'ok', true,
    'items_approved', v_items_affected,
    'client_mutation_id', p_client_mutation_id
  );
end;
$$;

comment on function public.director_approve_request_v1(text, text) is
'H1.1 recovery: enum-safe director request approval. Status reads use ::text; writes valid request_status_enum target for buyer handoff.';

grant execute on function public.director_approve_request_v1(text, text) to authenticated;

create or replace function public.director_approve_pipeline_v1(
  p_proposal_id text,
  p_comment text default null,
  p_invoice_currency text default 'KGS',
  p_client_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_exists boolean := false;
  v_current_status text := '';
  v_sent_at timestamptz;
  v_purchase_result jsonb;
  v_purchase_id text;
  v_work_seed_ok boolean := true;
  v_work_seed_error text;
begin
  select true, trim(coalesce(p.status::text, '')), p.sent_to_accountant_at
  into v_proposal_exists, v_current_status, v_sent_at
  from public.proposals p
  where p.id::text = p_proposal_id::text
  limit 1;

  if v_proposal_exists is distinct from true then
    return jsonb_build_object(
      'ok', false,
      'failure_message', U&'\041F\0440\0435\0434\043B\043E\0436\0435\043D\0438\0435 \043D\0435 \043D\0430\0439\0434\0435\043D\043E',
      'failure_code', 'proposal_not_found',
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  if v_sent_at is not null then
    select pu.id::text into v_purchase_id
    from public.purchases pu
    where pu.proposal_id::text = p_proposal_id::text
    order by pu.created_at desc
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'idempotent_replay', true,
      'purchase_id', v_purchase_id,
      'work_seed_ok', true,
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  perform public.proposal_request_item_integrity_guard_v1(p_proposal_id);

  perform public.director_approve_min_auto(
    p_proposal_id => p_proposal_id,
    p_comment => p_comment
  );

  begin
    v_purchase_result := public.ensure_purchase_and_incoming_strict(
      p_proposal_id => p_proposal_id
    );
    v_purchase_id := v_purchase_result ->> 'purchase_id';
  exception when others then
    v_work_seed_ok := false;
    v_work_seed_error := sqlerrm;
    begin
      v_purchase_id := public.ensure_purchase_and_incoming_from_proposal(
        p_proposal_id => p_proposal_id
      );
    exception when others then
      v_work_seed_error := coalesce(v_work_seed_error, '') || '; fallback: ' || sqlerrm;
    end;
  end;

  begin
    perform public.director_send_to_accountant(
      p_proposal_id => p_proposal_id
    );
  exception when others then
    v_work_seed_ok := false;
    v_work_seed_error := coalesce(v_work_seed_error, '') || '; send_to_accountant: ' || sqlerrm;
  end;

  return jsonb_build_object(
    'ok', true,
    'purchase_id', v_purchase_id,
    'work_seed_ok', v_work_seed_ok,
    'work_seed_error', v_work_seed_error,
    'idempotent_replay', false,
    'client_mutation_id', p_client_mutation_id
  );
end;
$$;

comment on function public.director_approve_pipeline_v1(text, text, text, text) is
'H1.1 recovery: enum-safe director proposal approval pipeline. Keeps approve/purchase/accountant semantics and removes enum empty-string casts.';

grant execute on function public.director_approve_pipeline_v1(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
