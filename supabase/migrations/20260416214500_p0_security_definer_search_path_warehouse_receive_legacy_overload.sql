-- P0.2 follow-up: harden the legacy wh_receive_apply_ui uuid overload that
-- still exists on the linked database. The function body already uses
-- schema-qualified public.* references, so changing only the function config
-- avoids behavior drift.

begin;

alter function public.wh_receive_apply_ui(uuid, jsonb, text, text)
  set search_path = '';

comment on function public.wh_receive_apply_ui(uuid, jsonb, text, text) is
  'P0.2 security-definer hardening: legacy uuid overload now runs with an empty search_path. Current client path uses the text/idempotent overload.';

notify pgrst, 'reload schema';

commit;
