begin;

create index if not exists idx_requests_issue_queue_coalesced_order_sloadfix6
on public.requests (
  (coalesce(submitted_at, created_at)) desc nulls last,
  (id::text) desc
)
include (
  status,
  display_no,
  object_name,
  object_type_code,
  level_code,
  system_code,
  zone_code
);

create index if not exists idx_requests_issue_queue_id_text_sloadfix6
on public.requests ((id::text))
include (
  status,
  submitted_at,
  created_at,
  display_no,
  object_name,
  object_type_code,
  level_code,
  system_code,
  zone_code
);

comment on index public.idx_requests_issue_queue_coalesced_order_sloadfix6 is
'S-LOAD-FIX-6 additive index for warehouse_issue_queue_scope_v4 request_source ordering. Matches coalesce(submitted_at, created_at) and request_id text ordering used by the bounded issue queue source without changing RPC semantics.';

comment on index public.idx_requests_issue_queue_id_text_sloadfix6 is
'S-LOAD-FIX-6 additive index for warehouse_issue_queue_scope_v4 request_id::text comparisons. Supports text-cast request visibility joins without changing warehouse issue queue payloads, visibility, or stock math.';

commit;
