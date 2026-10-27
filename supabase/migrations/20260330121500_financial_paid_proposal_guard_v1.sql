begin;

create or replace function public.guard_paid_proposal_financial_revocation_v1()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_approved boolean :=
    lower(trim(coalesce(old.status, ''))) in (
      U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\043E',
      U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\0430',
      'approved'
    );
  v_new_approved boolean :=
    lower(trim(coalesce(new.status, ''))) in (
      U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\043E',
      U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\0430',
      'approved'
    );
  v_has_payments boolean := false;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if not (
    (old.sent_to_accountant_at is not null and new.sent_to_accountant_at is null)
    or (v_old_approved and not v_new_approved)
  ) then
    return new;
  end if;

  select exists(
    select 1
    from public.proposal_payments pp
    where pp.proposal_id = old.id
    limit 1
  )
  into v_has_payments;

  if not v_has_payments then
    return new;
  end if;

  raise exception using
    errcode = 'P0001',
    message = 'proposal_financial_state_locked',
    detail = format(
      'Cannot revoke approval/accountant handoff for paid proposal %s.',
      old.id::text
    ),
    hint = 'Paid proposals must keep approved/accountant handoff state aligned with committed payments.';
end;
$$;

comment on function public.guard_paid_proposal_financial_revocation_v1() is
'Prevents paid proposals from losing approved/accountant-handoff state after committed payments. Closes revoke-vs-pay race by rejecting destructive proposal-state updates once proposal_payments exist.';

drop trigger if exists trg_guard_paid_proposal_financial_revocation_v1 on public.proposals;

create trigger trg_guard_paid_proposal_financial_revocation_v1
before update of status, sent_to_accountant_at
on public.proposals
for each row
execute function public.guard_paid_proposal_financial_revocation_v1();

commit;
