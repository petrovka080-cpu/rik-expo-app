# WAVE 43 ? Buyer Summary Query Plan Verify After Index

Status: BLOCKED_BUYER_SUMMARY_INDEX_NOT_USED

Target:
- RPC: `public.buyer_summary_inbox_scope_v1`
- Args: `p_offset=0`, `p_limit=25`, `p_search=null`, `p_company_id=null`

Plan summary:
- Exact RPC EXPLAIN node shape: Function Scan
- Exact RPC plan opaque Function Scan: yes
- Preserved source-body plan checked with same args: yes
- Target W39 indexes used: none
- Other index sample: buyer_summary_inbox_search_v1_document_trgm_idx
- Estimated rows bucket/source top rows: 1
- Join nodes count: 16
- Sort/materialization count: 8
- Planning/execution bucket: le_10ms / le_100ms

Conclusion:
- The staging plan did not choose either new target index for this exact RPC argument shape; this is recorded as the safe blocked outcome.

Safety:
- Staging-only readonly query plan: yes
- Production query: no
- DB writes: no
- Raw row data/secrets printed: no
