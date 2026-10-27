-- P0.5 attachment/evidence adjacent security-definer hardening.
-- Exact slice: canonical proposal attachment evidence scope read boundary.
-- The existing body already uses schema-qualified public.* and auth.* references.
-- This migration intentionally changes only the exact function search_path config.

begin;

alter function public.proposal_attachment_evidence_scope_v1(text, text, text)
  set search_path = '';

comment on function public.proposal_attachment_evidence_scope_v1(text, text, text) is
  'P0.5 security-definer hardening: canonical proposal attachment evidence scope now runs with an empty search_path; visibility and ownership behavior unchanged.';

notify pgrst, 'reload schema';

commit;
