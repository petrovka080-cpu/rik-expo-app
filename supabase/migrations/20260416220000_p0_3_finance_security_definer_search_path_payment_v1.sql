-- P0.3 finance security-definer hardening: accountant payment write path.
-- Bodies already use schema-qualified public.* references, so this slice changes
-- only exact function configs to avoid business-logic drift.

begin;

alter function public.accounting_pay_invoice_v1(
  text,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  date,
  numeric,
  text,
  numeric,
  numeric,
  text
)
  set search_path = '';

alter function public.accounting_pay_invoice_apply_v1(
  text,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  date,
  numeric,
  text,
  numeric,
  numeric
)
  set search_path = '';

alter function public.acc_add_payment_v3_uuid(
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  jsonb
)
  set search_path = '';

comment on function public.accounting_pay_invoice_v1(
  text,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  date,
  numeric,
  text,
  numeric,
  numeric,
  text
) is
'P0.3 security-definer hardening: idempotent accountant payment boundary now runs with an empty search_path; business behavior unchanged.';

comment on function public.accounting_pay_invoice_apply_v1(
  text,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  date,
  numeric,
  text,
  numeric,
  numeric
) is
'P0.3 security-definer hardening: accountant payment apply boundary now runs with an empty search_path; business behavior unchanged.';

comment on function public.acc_add_payment_v3_uuid(
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  jsonb
) is
'P0.3 security-definer hardening: legacy accountant payment helper now runs with an empty search_path; business behavior unchanged.';

notify pgrst, 'reload schema';

commit;
