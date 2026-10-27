comment on function public.wh_issue_free_atomic_v5(text, text, text, text, jsonb, text) is
  'Idempotent wrapper for warehouse free issue. Preserves wh_issue_free_atomic_v4 semantics while enforcing client mutation replay safety.';
