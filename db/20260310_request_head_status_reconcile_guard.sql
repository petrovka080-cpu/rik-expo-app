-- TASK: Protect requests head status from reverting after item-level routing
-- Additive migration: introduce canonical reconcile RPC and harden request_submit.

begin;

create or replace function public.request_reconcile_head_status(
  p_request_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target text;
  v_total int := 0;
  v_draft int := 0;
  v_pending int := 0;
  v_proc int := 0;
  v_approved int := 0;
  v_rejected int := 0;
begin
  select
    count(*)::int as total_cnt,
    count(*) filter (
      where ri.status is null
         or btrim(ri.status) = ''
         or lower(btrim(ri.status)) in ('draft', 'черновик')
    )::int as draft_cnt,
    count(*) filter (
      where lower(btrim(coalesce(ri.status, ''))) in ('pending', 'на утверждении')
    )::int as pending_cnt,
    count(*) filter (
      where lower(btrim(coalesce(ri.status, ''))) like '%закуп%'
    )::int as proc_cnt,
    count(*) filter (
      where lower(btrim(coalesce(ri.status, ''))) in ('approved', 'утверждено', 'утверждена')
    )::int as approved_cnt,
    count(*) filter (
      where lower(btrim(coalesce(ri.status, ''))) in ('rejected', 'отклонено', 'отклонена')
    )::int as rejected_cnt
  into v_total, v_draft, v_pending, v_proc, v_approved, v_rejected
  from public.request_items ri
  where ri.request_id = p_request_id;

  if v_total = 0 then
    return null;
  end if;

  if v_rejected = v_total then
    v_target := 'Отклонено';
  elsif (v_proc + v_approved) > 0 then
    -- procurement-ready request must not fall back to pending.
    v_target := 'К закупке';
  elsif v_pending > 0 then
    v_target := 'На утверждении';
  else
    v_target := 'Черновик';
  end if;

  update public.requests r
     set status = v_target
   where r.id = p_request_id
     and coalesce(r.status, '') is distinct from v_target;

  return v_target;
end;
$$;

create or replace function public.request_submit(
  p_request_id uuid
)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.requests;
  v_has_post_draft boolean := false;
begin
  -- If routing already happened on item layer, never downgrade head back to pending.
  select exists (
    select 1
    from public.request_items ri
    where ri.request_id = p_request_id
      and not (
        ri.status is null
        or btrim(ri.status) = ''
        or lower(btrim(ri.status)) in ('draft', 'черновик', 'pending', 'на утверждении')
      )
  ) into v_has_post_draft;

  if v_has_post_draft then
    update public.requests r
       set submitted_at = coalesce(r.submitted_at, now())
     where r.id = p_request_id
     returning * into v_row;
  else
    update public.requests r
       set status = 'На утверждении',
           submitted_at = coalesce(r.submitted_at, now())
     where r.id = p_request_id
     returning * into v_row;

    update public.request_items ri
       set status = 'На утверждении'
     where ri.request_id = p_request_id
       and (
         ri.status is null
         or btrim(ri.status) = ''
         or lower(btrim(ri.status)) in ('черновик', 'draft')
       );
  end if;

  if not found then
    raise exception 'request % not found', p_request_id;
  end if;

  perform public.request_reconcile_head_status(p_request_id);

  select * into v_row
  from public.requests r
  where r.id = p_request_id;

  return v_row;
end;
$$;

commit;

