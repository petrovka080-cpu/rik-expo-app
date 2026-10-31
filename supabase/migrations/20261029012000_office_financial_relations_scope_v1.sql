-- Financial views must not regain table-owner access after document RLS.
-- Exact view bodies/column contracts were captured before this change.
-- No historical document tenant is inferred or backfilled by this migration.
create index if not exists company_members_user_company_scope_v1_idx
on public.company_members(user_id,company_id);

create or replace function public.office_payment_role_allowed_v1(p_payment_id bigint,p_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (select 1 from public.proposal_payments pp where pp.id=p_payment_id
    and public.office_proposal_role_allowed_v1(pp.proposal_id,p_roles));
$function$;

create or replace function public.office_financial_parent_guard_v1()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_proposal uuid; v_roles text[];
begin
  if public.office_document_trusted_backend_v1() then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if tg_table_name='proposal_payment_allocations' then
    if tg_op='DELETE' then
      select pp.proposal_id into v_proposal from public.proposal_payments pp where pp.id=old.payment_id;
    else
      select pp.proposal_id into v_proposal from public.proposal_payments pp where pp.id=new.payment_id;
      if tg_op='UPDATE' and new.payment_id is distinct from old.payment_id then
        raise exception 'Allocation payment is immutable' using errcode='42501';
      end if;
      if not exists (select 1 from public.proposal_items pi
        where pi.id=new.proposal_item_id and pi.proposal_id=v_proposal) then
        raise exception 'Allocation item belongs to another document' using errcode='42501';
      end if;
    end if;
  else
    if tg_op='DELETE' then v_proposal:=old.proposal_id;
    else v_proposal:=new.proposal_id; end if;
    if tg_op='UPDATE' and new.proposal_id is distinct from old.proposal_id then
      raise exception 'Financial document parent is immutable' using errcode='42501';
    end if;
  end if;
  v_roles:=case tg_table_name
    when 'proposal_items' then array['buyer','director']::text[]
    when 'accounting_invoices' then array['buyer','accountant']::text[]
    else array['accountant']::text[] end;
  if not coalesce(public.office_proposal_role_allowed_v1(v_proposal,v_roles),false) then
    raise exception 'Target company financial role required' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$function$;

do $guard$
declare p record; t text;
begin
  for p in select tablename,policyname from pg_catalog.pg_policies
    where schemaname='public' and tablename in
      ('proposal_items','proposal_payments','proposal_payment_allocations','accounting_invoices') loop
    if p.policyname not like 'office_financial_v1_%' and not p.policyname=any(array[
      'ai_insert_any','ai_select_any','pi_sel','proposal_items_insert_auth',
      'proposal_items_select_auth','proposal_items_update_auth','read_proposals_authenticated',
      'ppa_select_auth','director_realtime_select_proposal_payments','pp_insert_auth_valid_proposal',
      'pp_select_auth_all','rls_proposal_payments_company_scope_v1'
    ]::text[]) then raise exception 'Unreviewed financial policy: %.%',p.tablename,p.policyname; end if;
    execute format('drop policy %I on public.%I',p.policyname,p.tablename);
  end loop;
  foreach t in array array['proposal_items','proposal_payments','proposal_payment_allocations','accounting_invoices'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('drop trigger if exists aaa_office_financial_parent_v1 on public.%I',t);
    execute format('create trigger aaa_office_financial_parent_v1 before insert or update or delete on public.%I for each row execute function public.office_financial_parent_guard_v1()',t);
  end loop;
end;
$guard$;

create policy office_financial_v1_item_read on public.proposal_items for select to authenticated
using (public.rls_proposal_visible_v1(proposal_id));
create policy office_financial_v1_item_write on public.proposal_items for all to authenticated
using (public.office_proposal_role_allowed_v1(proposal_id,array['buyer','director']::text[]))
with check (public.office_proposal_role_allowed_v1(proposal_id,array['buyer','director']::text[]));
create policy office_financial_v1_payment_read on public.proposal_payments for select to authenticated
using (public.office_proposal_role_allowed_v1(proposal_id,array['director','accountant','buyer']::text[]));
create policy office_financial_v1_payment_write on public.proposal_payments for all to authenticated
using (public.office_proposal_role_allowed_v1(proposal_id,array['accountant']::text[]))
with check (public.office_proposal_role_allowed_v1(proposal_id,array['accountant']::text[]));
create policy office_financial_v1_invoice_read on public.accounting_invoices for select to authenticated
using (public.office_proposal_role_allowed_v1(proposal_id,array['director','accountant','buyer']::text[]));
create policy office_financial_v1_invoice_write on public.accounting_invoices for all to authenticated
using (public.office_proposal_role_allowed_v1(proposal_id,array['buyer','accountant']::text[]))
with check (public.office_proposal_role_allowed_v1(proposal_id,array['buyer','accountant']::text[]));
create policy office_financial_v1_allocation_read on public.proposal_payment_allocations for select to authenticated
using (public.office_payment_role_allowed_v1(payment_id,array['director','accountant','buyer']::text[]));
create policy office_financial_v1_allocation_write on public.proposal_payment_allocations for all to authenticated
using (public.office_payment_role_allowed_v1(payment_id,array['accountant']::text[]))
with check (public.office_payment_role_allowed_v1(payment_id,array['accountant']::text[]));

revoke all on function public.office_payment_role_allowed_v1(bigint,text[]),
  public.office_financial_parent_guard_v1() from public,anon,authenticated;
grant execute on function public.office_payment_role_allowed_v1(bigint,text[]) to authenticated,service_role;

-- PostgreSQL 17 staging supports security_invoker. The explicit document role
-- predicates also protect calls nested inside existing SECURITY DEFINER RPCs.
create or replace view public.v_accountant_inbox_v2 with (security_invoker=true) as
with pay as (
  select pp.proposal_id,sum(pp.amount)::numeric(14,2) as total_paid,count(*)::integer as payments_count
  from public.proposal_payments pp group by pp.proposal_id
), items as (
  select pi.proposal_id,sum(coalesce(pi.qty,0::numeric)*coalesce(pi.price,0::numeric))::numeric(14,2) as items_sum
  from public.proposal_items pi group by pi.proposal_id
), inv as (
  select a.proposal_id,true as has_invoice from public.proposal_attachments a
  where a.group_key='invoice'::text group by a.proposal_id
)
select p.id as proposal_id,p.supplier,p.invoice_number,p.invoice_date,
  coalesce(p.invoice_amount,items.items_sum,0::numeric)::numeric(14,2) as invoice_amount,
  coalesce(p.invoice_currency,'KGS'::text) as invoice_currency,
  coalesce(pay.total_paid,0::numeric)::numeric(14,2) as total_paid,
  coalesce(pay.payments_count,0) as payments_count,
  (coalesce(p.invoice_amount,items.items_sum,0::numeric)-coalesce(pay.total_paid,0::numeric))::numeric(14,2) as balance,
  case when lower(coalesce(p.payment_status,p.status,''::text)) like 'на доработке%' then 'На доработке'::text
    when coalesce(pay.total_paid,0::numeric)=0::numeric then 'К оплате'::text
    when coalesce(p.invoice_amount,items.items_sum,0::numeric)>coalesce(pay.total_paid,0::numeric) then 'Частично оплачено'::text
    else 'Оплачено'::text end as payment_status,
  coalesce(inv.has_invoice,false) as has_invoice,p.sent_to_accountant_at
from public.proposals p left join pay on pay.proposal_id=p.id
left join items on items.proposal_id=p.id left join inv on inv.proposal_id=p.id
where p.sent_to_accountant_at is not null
  and public.office_proposal_role_allowed_v1(p.id,array['director','accountant','buyer']::text[]);

create or replace view public.v_proposal_payments_fact with (security_invoker=true) as
select pp.proposal_id,min(pp.paid_at) as paid_first_at,max(pp.paid_at) as paid_last_at
from public.proposal_payments pp where pp.paid_at is not null
  and public.office_proposal_role_allowed_v1(pp.proposal_id,array['director','accountant','buyer']::text[])
group by pp.proposal_id;
revoke all on public.v_accountant_inbox_v2,public.v_proposal_payments_fact from public,anon;
grant select on public.v_accountant_inbox_v2,public.v_proposal_payments_fact to authenticated,service_role;
