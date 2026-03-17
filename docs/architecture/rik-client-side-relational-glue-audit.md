# Client-Side Relational Glue Audit Pass

Read-only audit. No code changes, no refactors, no migration proposals, no DB/view/RPC edits.

## Part A. Executive Summary

### 1. Общая оценка client-side relational glue debt в приложении

Debt системный и уже load-bearing.

- Самый тяжелый слой находится в [`src/lib/api/director_reports.ts`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts): клиент там реально работает как join engine, собирая usable fact rows из `warehouse_issues`, `warehouse_issue_items`, `request_items`, `requests`, reference tables и name lookups.
- Второй load-bearing слой находится в [`src/lib/catalog_api.ts`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts): `createProposalsBySupplier()` исполняет write-side orchestration chain с approval gating, counterparty binding, proposal head patching, proposal item linking, snapshot/meta sync и request item status sync.
- Третий слой находится в buyer/warehouse operational paths: queue hydration, proposal view/rework sheets, request-head fallback assembly.

### 2. Топ confirmed load-bearing patterns

1. Director fact/read-model construction across issue/request/reference/name sources in [`director_reports.ts`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts).
2. Proposal creation and binding orchestration in [`createProposalsBySupplier()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092).
3. Buyer inbox gating and rejected-context enrichment across inbox RPC, `requests`, `proposal_items`, and `v_proposals_summary` in [`src/lib/api/buyer.ts`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts).
4. Warehouse request-head/request-item assembly across view rows, base tables, approval gate, stats recomputation, and note/meta enrichment in [`src/screens/warehouse/warehouse.api.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts).
5. Buyer proposal title/detail/rework hydration via `proposal_items -> request_items -> requests -> labels` chains in [`src/screens/buyer/buyer.actions.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts).

### 3. Где client-side relational glue уже реально влияет на correctness

- Director reports: affects final report rows, object filtering, KPI, discipline grouping, and purchase-cost attribution.
- Buyer inbox: affects which items remain actionable for procurement, plus last-offer/rework context shown in the working queue.
- Proposal creation: affects proposal head identity, counterparty linkage, proposal item semantics, and request-item post-write status.
- Warehouse issuance/read models: affects which approved requests are visible/issuable and what quantitative truth the issuance UI sees.

### 4. Где это пока только maintainability / composition debt

- `fetchRequestDetails()` / `getRequestHeader()` in [`src/lib/catalog_api.ts`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts) use multi-source fallback reads, but the output is a bounded request-header contract, not a business-critical join engine.
- `proposalItems()` in [`src/lib/api/proposals.ts`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts#L323) falls back between `proposal_items` and `proposal_snapshot_items`, but the resulting payload is narrow and bounded.
- Buyer counterparty suggestion loading is a real merge layer, but mostly selection UX rather than approval/report correctness.

### 5. Verdict: local problem or systemic pattern

Verdict: systemic repeated pattern.

- It is not just “many fetches”.
- Multiple core flows depend on client-side joined read models and write-side reconciliation.
- The heaviest systemic glue is in director reports and proposal creation. Buyer/warehouse paths repeat the same pattern at lower but still material business impact.

## Part B. Inventory of Exact Findings

### Finding 1

- Priority: `P1 relational-glue blocker`
- Status: `confirmed`
- File: [`src/lib/api/director_reports.ts`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts)
- Exact function/path:
  - [`fetchDirectorFactViaAccRpc()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1533)
  - [`fetchAllFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1780)
  - [`fetchDisciplineFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2020)
  - final consumers: [`buildPayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2386), [`buildDisciplinePayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2929)
- Base query/query set:
  - `warehouse_issues`
  - `warehouse_issue_items`
  - `acc_report_issues_v2` + issue lines RPC path
  - `v_director_issued_fact_rows` in view path
- Secondary/tertiary queries:
  - `request_items(id, request_id)`
  - `requests`
  - object/system/object-type reference lookups
  - name lookup sources for material names
- Reconstructed semantic entity/payload:
  - director fact row with resolved `issue_id`, `object_name`, `work_name`, `level_name`, `request_item_id`, `rik_code`, `material_name_ru`, `uom`, `qty`, `is_without_request`
  - this row does not exist as one stable contract on all fallback paths; it is repeatedly assembled on client
- Join/enrichment mechanism:
  - map by `issue_id`
  - map by `request_item_id -> request_id`
  - map by `request_id -> request row`
  - map by object/system/type code
  - fallback merge between request-backed and free-issue contexts
  - staged hydration with path selection across RPC/view/table sources
- Downstream dependency:
  - reporting
  - filtering
  - aggregation
  - discipline report
  - purchase-cost enrichment inputs
- Failure mode:
  - partial hydration mismatch
  - wrong child-parent association
  - fallback divergence
  - report payload inconsistency
- Blast radius:
  - director report materials
  - director discipline report
  - object-filtered report runs
  - systemic repeated pattern across all report source strategies
  - read-only path, but business-critical
- Suggested future solidification target:
  - stable joined fact contract for director reporting
  - likely home: stable RPC output contract or explicit joined read model
  - current source-of-truth is spread across issues, issue items, request items, requests, and reference/name lookups
- Touch risk: `high`

### Finding 2

- Priority: `P1 relational-glue blocker`
- Status: `confirmed`
- File: [`src/lib/catalog_api.ts`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts)
- Exact function/path:
  - [`loadCounterpartyBinding()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2059)
  - [`createProposalsBySupplier()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092)
- Base query/query set:
  - `loadRequestItemsForProposal(allItemIds)`
  - `requests(id,status)` for approval gate
  - proposal create RPC / proposal add-items RPC
- Secondary/tertiary queries:
  - suppliers binding lookup
  - contractors binding lookup
  - proposal-items binding column capability probe
  - `proposals` head patch/update after creation
  - `proposal_items` fallback insert/upsert/update
  - snapshot/meta RPC
  - request item status update RPC/table fallback
- Reconstructed semantic entity/payload:
  - effective proposal head + linked proposal items + canonical supplier/contractor binding + request-item post-submit state
  - no single stable write contract exists here; the usable mutation boundary emerges from several client-side stages
- Join/enrichment mechanism:
  - map by `request_item_id`
  - map by normalized counterparty name to `supplier_id` / `contractor_id`
  - grouped bucket processing
  - fallback merge between RPC success paths and direct table writes
  - staged hydration and post-write patching
- Downstream dependency:
  - write decision
  - approval flow
  - proposal creation
  - request item status progression
  - attachment upload chain later depends on created proposal ids
- Failure mode:
  - approval/write decision on incomplete relation
  - wrong child-parent association
  - missing enrichment fields
  - fallback contract fragility
- Blast radius:
  - buyer proposal creation flow
  - downstream director/accountant proposal flows
  - write path, not just read-only composition
  - systemic in one critical mutation boundary
- Suggested future solidification target:
  - explicit write-side bounded contract for proposal creation with canonical request-item validation, proposal head fields, and counterparty bindings resolved together
  - likely home: stable RPC output contract or write-side bounded contract
  - current source-of-truth is split across request items, requests, suppliers, contractors, proposals, and proposal_items schema capability branches
- Touch risk: `high`

### Finding 3

- Priority: `P1 relational-glue blocker`
- Status: `confirmed`
- File: [`src/lib/api/buyer.ts`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts)
- Exact function/path:
  - [`listBuyerInbox()`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts#L265)
  - [`filterInboxByRequestStatus()`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts#L184)
  - [`loadLatestProposalLifecycleByRequestItem()`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts#L73)
  - [`enrichRejectedRows()`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts#L124)
- Base query/query set:
  - primary: `list_buyer_inbox` RPC
  - fallback: direct `request_items` scan
- Secondary/tertiary queries:
  - `requests(id,status)` for gating
  - `proposal_items_view(proposal_id, request_item_id)`
  - `v_proposals_summary(proposal_id, status, sent_to_accountant_at, submitted_at)`
  - `proposal_items(*)` for reject context
- Reconstructed semantic entity/payload:
  - actionable buyer inbox row with current procurement visibility plus latest reject/rework context and last supplier/price metadata
  - final usable row is not fully stable from one source; it is refined client-side after multiple gates and enrichments
- Join/enrichment mechanism:
  - map by `request_id`
  - map by `request_item_id`
  - latest-by-timestamp selection per request item
  - fallback gating when secondary relation loads fail
- Downstream dependency:
  - buyer working queue
  - filtering of actionable items
  - selection defaults via `last_offer_supplier` / `last_offer_price`
- Failure mode:
  - incomplete relational view
  - fallback divergence
  - missing enrichment fields
  - approval/write decision on incomplete relation
- Blast radius:
  - buyer inbox and procurement action entry point
  - local to buyer role but business-critical
  - read path, but directly affects downstream write preparation
- Suggested future solidification target:
  - stable buyer inbox read model with current request status, latest proposal lifecycle, and latest reject context already attached
  - likely home: stable view row or joined read model
- Touch risk: `high`

### Finding 4

- Priority: `P1 relational-glue blocker`
- Status: `confirmed`
- File: [`src/screens/warehouse/warehouse.api.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts)
- Exact function/path:
  - [`apiFetchReqHeads()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L841)
  - [`loadReqHeadTruthByRequestIds()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L361)
  - [`enrichReqHeadsMeta()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L443)
  - [`apiFetchReqItems()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L1166)
- Base query/query set:
  - `v_wh_issue_req_heads_ui`
  - `v_wh_issue_req_items_ui`
- Secondary/tertiary queries:
  - `requests(id,status)` approval gate
  - `v_wh_issue_req_items_ui` truth aggregation by request id
  - fallback `requests` narrow select
  - fallback `request_items(id,request_id,status,qty,note)`
  - request meta rows + request item note rows
- Reconstructed semantic entity/payload:
  - issuable warehouse request head with approval state, aggregated quantity truth, contractor/phone/volume, and fallback materialization for requests absent from warehouse views
  - issuable request item rows with note enrichment and deduped quantitative truth
  - final operational row does not come from one stable contract on all paths
- Join/enrichment mechanism:
  - map by `request_id`
  - grouped truth aggregation by `request_item_id`
  - fallback merge of view rows with table-derived rows
  - staged hydration and dedupe
  - secondary note/meta enrichment
- Downstream dependency:
  - UI display
  - issuance flow
  - filtering (`not done`, `qty_left > 0`)
  - request modal hydration
- Failure mode:
  - partial hydration mismatch
  - duplicate/fragmented entity view
  - missing enrichment fields
  - fallback divergence
- Blast radius:
  - warehouse request list
  - warehouse request issue modal
  - read path that feeds issuance decisions
  - repeated but mostly confined to warehouse
- Suggested future solidification target:
  - stable warehouse request-head read model and stable warehouse request-item read model with approval, truth metrics, and request meta already attached
  - likely home: stable view row or normalized adapter boundary
- Touch risk: `high`

### Finding 5

- Priority: `P2 relational-glue debt`
- Status: `confirmed`
- File: [`src/screens/buyer/buyer.actions.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts)
- Exact function/path:
  - [`openReworkAction()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L964)
  - [`openProposalViewAction()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L1228)
  - [`preloadProposalTitlesAction()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L1261)
  - support repo: [`src/screens/buyer/buyer.repo.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.repo.ts)
- Base query/query set:
  - `proposal_items`
  - `proposals`
- Secondary/tertiary queries:
  - `request_items`
  - `proposal_items -> request_item_id -> request_id`
  - `batchResolveRequestLabels()`
- Reconstructed semantic entity/payload:
  - buyer proposal detail lines with material identity/name/uom/qty
  - buyer rework edit rows with supplier/price/note plus item identity
  - proposal title by proposal id
- Join/enrichment mechanism:
  - map by `request_item_id`
  - map by `proposal_id -> request_item_ids -> request_ids`
  - staged hydration
- Downstream dependency:
  - UI display
  - buyer rework sheet
  - proposal detail sheet
- Failure mode:
  - incomplete relational view
  - missing enrichment fields
  - UI degradation
- Blast radius:
  - buyer detail/rework flows
  - local, not systemic across all roles
  - read-only path
- Suggested future solidification target:
  - stable proposal detail read model with request item identity and request label already attached
  - likely home: joined read model or normalized adapter boundary
- Touch risk: `medium`

### Finding 6

- Priority: `P2 relational-glue debt`
- Status: `confirmed`
- File:
  - [`src/screens/buyer/buyer.counterparty.data.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.counterparty.data.ts)
  - [`src/lib/catalog_api.ts`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts)
- Exact function/path:
  - [`loadBuyerCounterpartyDataFresh()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.counterparty.data.ts#L216)
  - [`mapBuyerCounterpartyData()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.counterparty.data.ts#L137)
  - [`listUnifiedCounterparties()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L726)
- Base query/query set:
  - `listSuppliers()` or `suppliers`
- Secondary/tertiary queries:
  - `contractors`
  - `subcontracts`
  - `proposal_items`
  - `user_profiles` contractor-compatible rows in `listUnifiedCounterparties()`
- Reconstructed semantic entity/payload:
  - unified buyer counterparty suggestion / supplier option list
  - no single stable row exists; the entity is synthesized in-memory from several origins
- Join/enrichment mechanism:
  - merge by normalized name/INN key
  - source-origin accumulation
  - role/type derivation
  - fallback source plans
- Downstream dependency:
  - buyer supplier/contractor suggestion UI
  - proposal preparation support
- Failure mode:
  - duplicate/fragmented entity view
  - mismatched enrichment
  - UI degradation
- Blast radius:
  - buyer counterparty selection
  - local but repeated
  - read path only
- Suggested future solidification target:
  - stable unified counterparty read model for buyer workflows
  - likely home: stable view row or normalized adapter boundary
- Touch risk: `medium`

### Finding 7

- Priority: `acceptable bounded composition`
- Status: `confirmed`
- File: [`src/lib/catalog_api.ts`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts)
- Exact function/path:
  - [`getRequestHeader()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L1081)
  - [`fetchRequestDisplayNo()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L1101)
  - [`fetchRequestDetails()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L1200)
  - [`listForemanRequests()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L1684)
- Base query/query set:
  - `requests`
  - request display views
- Secondary/tertiary queries:
  - fallback display RPCs
  - `request_items(request_id,status)` in `listForemanRequests()`
- Reconstructed semantic entity/payload:
  - request header/details
  - foreman request summary with aggregated display status
- Join/enrichment mechanism:
  - fallback source selection across semantically similar request-header sources
  - bounded status aggregation by `request_id`
- Downstream dependency:
  - UI display
  - request list labels/details
- Failure mode:
  - incomplete relational view
  - UI degradation
- Blast radius:
  - foreman/request detail screens
  - bounded and mostly acceptable
- Suggested future solidification target:
  - none urgent; current contract is bounded enough
- Touch risk: `low`

### Finding 8

- Priority: `acceptable bounded composition`
- Status: `already mitigated`
- File:
  - [`src/lib/api/proposals.ts`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts)
  - [`src/screens/buyer/buyer.fetchers.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.fetchers.ts)
- Exact function/path:
  - [`proposalItems()`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts#L323)
  - [`fetchBuyerBucketsProd()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.fetchers.ts#L73)
- Base query/query set:
  - `proposal_items` or `proposal_snapshot_items`
  - `v_proposals_summary`
- Secondary/tertiary queries:
  - `proposal_items` id-only counts for rejected filtering
  - proposal title preload
- Reconstructed semantic entity/payload:
  - proposal bucket summaries and item totals
- Join/enrichment mechanism:
  - bounded fallback source reconciliation
  - grouped count map for presence filtering
- Downstream dependency:
  - buyer proposal buckets UI
- Failure mode:
  - UI degradation
  - missing enrichment fields
- Blast radius:
  - buyer proposal overview only
- Suggested future solidification target:
  - none urgent
- Touch risk: `low`

## Part C. Pattern Clusters

### 1. Report assembly glue

- `director_reports.ts` repeatedly reconstructs fact rows from issues, issue items, requests, references, and names before any report payload exists.
- This is the clearest case where the client acts as joined read-model engine.

### 2. Parent/child entity hydration

- Warehouse request heads/items:
  - request head view + request approval + truth recompute + request/item meta enrichment
- Buyer proposal details/rework:
  - proposal items + request items + request labels

### 3. Fallback source reconciliation

- Director reports switch between canonical RPC, legacy RPC, view, table scan, and joined table path.
- Buyer inbox switches between inbox RPC and request_items fallback, then still applies secondary relation gates.
- Catalog request header/details switch among table, views, and display RPCs, but this one is relatively bounded.

### 4. Cross-source metadata enrichment

- Buyer inbox enriches rejected rows with last supplier/price/note from proposal_items.
- Warehouse request heads enrich contractor/phone/volume after base row load.
- Director fact rows enrich object/system/type names and material names from secondary sources.

### 5. Client-side joined read-model construction

- `buildPayloadFromFactRows()` and `buildDisciplinePayloadFromFactRows()` only become possible after client-side row reconstruction.
- `openProposalViewAction()` and `preloadProposalTitlesAction()` explicitly build joined proposal read models client-side.

### 6. Write-path relational glue

- `createProposalsBySupplier()` is the main case.
- It performs approval gating, canonical binding resolution, proposal head patching, snapshot/meta sync, and request item status progression across multiple sources and fallback branches.

### 7. Other repeated patterns

- Name-based binding and normalized key maps recur in buyer counterparty and proposal binding flows.
- Many flows degrade gracefully on partial failure, which is operationally useful but also hides missing stable contracts.

## Part D. Solidification Priority Map

### 1. Batch codename: `director-fact-read-model`

- Exact target contract/path:
  - director fact row consumed by [`fetchDirectorWarehouseReport()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L3183) and [`fetchDirectorWarehouseReportDiscipline()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L3293)
- What should become stable:
  - one explicit fact-row contract carrying resolved issue/request/object/work/level/material semantics
- Expected payoff:
  - removes repeated client-side joins across issue/request/reference/name sources
  - stabilizes report assembly and object-filter behavior
- Risk:
  - high

### 2. Batch codename: `proposal-write-boundary`

- Exact target contract/path:
  - [`createProposalsBySupplier()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092)
- What should become stable:
  - one bounded mutation contract for proposal creation with validated request items, canonical counterparty binding, proposal head fields, item meta, and status transition
- Expected payoff:
  - removes the heaviest write-side client orchestration chain
  - lowers fallback divergence in buyer proposal creation
- Risk:
  - high

### 3. Batch codename: `buyer-inbox-read-model`

- Exact target contract/path:
  - [`listBuyerInbox()`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts#L265)
- What should become stable:
  - actionable buyer inbox row with request readiness, latest proposal lifecycle, reject context, and last-offer fields attached
- Expected payoff:
  - turns buyer queue into a single trusted contract instead of post-filter/post-enrich client assembly
- Risk:
  - high

### 4. Batch codename: `warehouse-issuance-read-model`

- Exact target contract/path:
  - [`apiFetchReqHeads()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L841)
  - [`apiFetchReqItems()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L1166)
- What should become stable:
  - approved, issuable request-head and request-item contracts with truth metrics and request meta already attached
- Expected payoff:
  - reduces staged hydration and fallback assembly before issuance actions
- Risk:
  - high

### 5. Batch codename: `buyer-proposal-detail-model`

- Exact target contract/path:
  - proposal detail/rework/title loaders in [`src/screens/buyer/buyer.actions.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts)
- What should become stable:
  - proposal detail row and proposal title/read-model contract
- Expected payoff:
  - removes repeated `proposal_items -> request_items -> requests -> labels` stitching
- Risk:
  - medium

## Part E. Final Verdict

- Главный confirmed relational-glue blocker:
  - director fact row reconstruction in [`director_reports.ts`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts), because reports only become semantically usable after multi-stage client joins
- Главный read-model assembly risk:
  - warehouse and buyer operational screens often receive partial base rows and must hydrate them via secondary queries before the entity is really usable
- Главный write/approval/issuance risk:
  - `createProposalsBySupplier()` in [`catalog_api.ts`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092), because proposal creation semantics depend on client-side reconciliation across request items, request statuses, counterparty bindings, and proposal_items write fallbacks
- Главный report assembly risk:
  - director report table/RPC fallback paths reconstruct the same business fact via different client-side join chains
- Главный maintainability-only glue debt:
  - buyer proposal detail/title/rework hydration and unified counterparty suggestions
- Что нужно solidify first and why:
  - first solidify the director fact read model
  - reason: it is the widest confirmed relational-glue contract in the codebase and already affects report correctness across several fallback data-source paths
