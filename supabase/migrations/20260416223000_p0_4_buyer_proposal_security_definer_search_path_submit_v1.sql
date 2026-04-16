-- P0.4 buyer/proposal security-definer hardening: proposal submit write path.
-- Existing bodies already use schema-qualified public.* and auth.* references.
-- This migration intentionally changes only exact function search_path configs.

begin;

alter function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text)
  set search_path = '';

alter function public.rpc_proposal_submit_v3_core_h1_4(text, jsonb, text, boolean, text, text)
  set search_path = '';

alter function public.rpc_proposal_submit_v3_existing_replay_h1_4(text, jsonb, text, boolean, text, text)
  set search_path = '';

comment on function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text) is
  'P0.4 security-definer hardening: buyer proposal submit public wrapper now runs with an empty search_path; business behavior unchanged.';

comment on function public.rpc_proposal_submit_v3_core_h1_4(text, jsonb, text, boolean, text, text) is
  'P0.4 security-definer hardening: buyer proposal submit core boundary now runs with an empty search_path; business behavior unchanged.';

comment on function public.rpc_proposal_submit_v3_existing_replay_h1_4(text, jsonb, text, boolean, text, text) is
  'P0.4 security-definer hardening: buyer proposal duplicate-recovery replay helper now runs with an empty search_path; business behavior unchanged.';

notify pgrst, 'reload schema';

commit;
