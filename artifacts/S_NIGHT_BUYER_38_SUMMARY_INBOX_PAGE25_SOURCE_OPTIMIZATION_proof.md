# S_NIGHT_BUYER_38_SUMMARY_INBOX_PAGE25_SOURCE_OPTIMIZATION

final_status: BLOCKED_BUYER_SUMMARY_REQUIRES_DB_INDEX_MIGRATION

No safe app-only fix was applied. The direct staging hotspot calls buyer_summary_inbox_scope_v1 with p_limit=25, while the UI inbox path already uses React Query, bounded pagination, and no cancel/refetch churn.

Blocked reason: SQL/RPC source still performs exact group counts, global order, and rejected proposal enrichment before page cut. That requires DB index/function migration planning, not a random smaller limit or semantic change.
