# S_NIGHT_BUYER_37_SUMMARY_INBOX_PAGE25_QUERY_SHAPE_RCA

final_status: GREEN_BUYER_SUMMARY_INBOX_PAGE25_QUERY_SHAPE_RCA

## Route
- route: buyer_summary_inbox_page_25
- rpc: buyer_summary_inbox_scope_v1
- args: p_offset=0, p_limit=25, p_search=null, p_company_id=null

## Query Shape
- source path: stagingLoadCore -> Supabase RPC -> public wrapper -> private source body
- base source: public.list_buyer_inbox(p_company_id)
- joins: requests, proposal_items_view, v_proposals_summary, proposal_items, optional buyer_summary_inbox_search_v1
- order: request_id_old desc, latest_created_at desc, request_id desc
- count mode: exact total_group_count plus exact returned/gated counts

## RCA
- offset pagination: not primary for page25 because offset=0
- missing index: likely on proposal_items request_item_id::text paths
- count(*): contributor because exact group counts require full materialization
- join fanout: likely contributor for rejected lifecycle/context enrichment
- N+1: no, route path is one RPC per sample
- wide select: not primary, payload is stable around 14KB
- cold cache: not primary, repeated 250 samples remain high

## Safety
- no DB writes
- no migration apply
- no production calls
- no load expansion
