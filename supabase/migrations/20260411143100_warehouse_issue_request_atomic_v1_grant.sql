comment on function public.wh_issue_request_atomic_v1(text, text, text, text, text, jsonb, text) is
  'Atomic server-owned warehouse request issue boundary. Creates issue, adds lines, commits ledger, and replays safely by client mutation id.';
