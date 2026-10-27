-- H1.3: Director approve pipeline uuid contract recovery
-- Scope: wrapper argument typing only.
-- Keeps client-facing director_approve_pipeline_v1(text, text, text, text) contract.
-- Keeps existing approve / purchase / accountant business semantics.

begin;

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
  v_proposal_id_text text := nullif(trim(p_proposal_id), '');
  v_proposal_id uuid;
  v_proposal_exists boolean := false;
  v_current_status text := '';
  v_sent_at timestamptz;
  v_purchase_result jsonb;
  v_purchase_id text;
  v_work_seed_ok boolean := true;
  v_work_seed_error text;
begin
  if v_proposal_id_text is null then
    return jsonb_build_object(
      'ok', false,
      'failure_message', 'Предложение не найдено',
      'failure_code', 'proposal_id_empty',
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  begin
    v_proposal_id := v_proposal_id_text::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object(
      'ok', false,
      'failure_message', 'Предложение не найдено',
      'failure_code', 'proposal_id_invalid',
      'client_mutation_id', p_client_mutation_id
    );
  end;

  select true, trim(coalesce(p.status::text, '')), p.sent_to_accountant_at
  into v_proposal_exists, v_current_status, v_sent_at
  from public.proposals p
  where p.id = v_proposal_id
  limit 1;

  if v_proposal_exists is distinct from true then
    return jsonb_build_object(
      'ok', false,
      'failure_message', 'Предложение не найдено',
      'failure_code', 'proposal_not_found',
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  if v_sent_at is not null then
    select pu.id::text into v_purchase_id
    from public.purchases pu
    where pu.proposal_id = v_proposal_id
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

  perform public.proposal_request_item_integrity_guard_v1(v_proposal_id::text);

  perform public.director_approve_min_auto(
    p_proposal_id => v_proposal_id,
    p_comment => p_comment
  );

  begin
    v_purchase_result := public.ensure_purchase_and_incoming_strict(
      p_proposal_id => v_proposal_id
    );
    v_purchase_id := v_purchase_result ->> 'purchase_id';
  exception when others then
    v_work_seed_ok := false;
    v_work_seed_error := sqlerrm;
    begin
      v_purchase_id := public.ensure_purchase_and_incoming_from_proposal(
        p_proposal_id => v_proposal_id
      )::text;
    exception when others then
      v_work_seed_error := coalesce(v_work_seed_error, '') || '; fallback: ' || sqlerrm;
    end;
  end;

  begin
    perform public.director_send_to_accountant(
      p_proposal_id => v_proposal_id
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
'H1.3 recovery: keeps client text RPC contract but calls uuid-only approve/purchase/accountant functions with an explicit uuid proposal id.';

grant execute on function public.director_approve_pipeline_v1(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
