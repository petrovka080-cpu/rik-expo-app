# Write-Path Boundary Audit Pass

Read-only audit. No code changes, no refactors, no migration proposals, no DB/view/RPC edits.

## Part A. Executive Summary

### 1. Общая оценка write-path boundary debt в приложении

Debt системный и уже load-bearing.

- Самый тяжелый слой находится в [`src/lib/catalog_api.ts`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092): `createProposalsBySupplier()` исполняет бизнес-операцию не как один bounded mutation contract, а как staged orchestration chain через approval gate, parent create, child linking, canonical binding sync, optional submit и request-item status sync.
- Второй тяжелый слой находится в [`src/screens/buyer/buyer.actions.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L310): buyer submit flow оборачивает proposal creation дополнительными attachment writes, queue-vs-sync branching, post-submit director-status sync и reject-state cleanup.
- Третий тяжелый слой находится в request-backed warehouse issuance: [`submitReqPick()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L99) и [`issueByRequestItem()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L321) собирают выдачу через create issue -> add items -> commit ledger -> refresh dependent truth.
- Request lifecycle submit тоже размазан между несколькими mutation stages: [`requestSubmit()`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L463) делает RPC/fallback head update, item status sync и head-status reconciliation.

### 2. Топ confirmed load-bearing mutation boundaries

1. `createProposalsBySupplier()` proposal creation boundary in [`src/lib/catalog_api.ts`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092)
2. `handleCreateProposalsBySupplierAction()` buyer commercial submission boundary in [`src/screens/buyer/buyer.actions.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L310)
3. `submitReqPick()` / `issueByRequestItem()` request-backed warehouse issuance boundary in [`src/screens/warehouse/warehouse.issue.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L99)
4. `requestSubmit()` request lifecycle transition boundary in [`src/lib/api/requests.ts`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L463)
5. `sendToAccountingAction()` accounting handoff with attachment side effects in [`src/screens/buyer/buyer.actions.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L762)

### 3. Где client-side write orchestration уже реально влияет на business semantics

- Proposal creation affects proposal head identity, child proposal_items, counterparty binding, submit state, and request-item lifecycle progression.
- Buyer submit affects downstream director handoff semantics and attachment completeness for created proposals.
- Warehouse request-backed issuance affects stock/ledger commit semantics and what the UI treats as issued truth right after mutation.
- Request submit affects request head status, request_items status, and approval readiness seen by downstream roles.
- Accounting send affects proposal accounting state plus invoice/proposal document side effects.

### 4. Где это пока только maintainability / bounded mutation debt

- [`submitStockPick()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L222) already delegates the stock-affecting mutation to one atomic RPC `wh_issue_free_atomic_v4`; client work is mainly pre-validation and post-refresh.
- [`applyWarehouseReceive()`](/c:/dev/rik-expo-app/src/screens/warehouse/hooks/useWarehouseReceiveApply.ts#L5) is a bounded receive contract over one RPC `wh_receive_apply_ui`.
- [`directorReturnToBuyer()`](/c:/dev/rik-expo-app/src/lib/api/director.ts#L160), [`accountantAddPayment()`](/c:/dev/rik-expo-app/src/lib/api/accountant.ts#L57), and [`accountantReturnToBuyer()`](/c:/dev/rik-expo-app/src/lib/api/accountant.ts#L79) use RPC or rpc-compat wrappers, but the semantic mutation boundary itself is relatively compact.

### 5. Verdict: local problem or systemic pattern

Verdict: systemic repeated pattern.

- It is not just “many writes”.
- Several core business operations are semantically complete only after multiple client-driven stages succeed.
- The heaviest systemic boundaries are proposal creation/submission, request submission, and request-backed warehouse issuance.

## Part B. Inventory of Exact Findings

### Finding 1

- Priority: `P1 mutation-boundary blocker`
- Status: `confirmed`
- File: [`src/lib/catalog_api.ts`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts)
- Exact function/path:
  - [`loadCounterpartyBinding()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2059)
  - [`createProposalsBySupplier()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092)
- Business operation:
  - proposal creation by supplier bucket with child item linking, canonical counterparty binding, optional submit, and request-item status progression
- Pre-write reads / validation inputs:
  - `loadRequestItemsForProposal(allItemIds)`
  - `requests(id,status)` approval gate
  - `suppliers` and `contractors` binding loads
  - proposal_items binding-column capability probe
  - per-item validation of `qty`, `price`, `kind`, canonical binding availability
- Primary write stage(s):
  - proposal head create via `rpcProposalCreateFull()`
  - proposal head patch via `proposals.update(...)`
  - proposal item link via `rpcProposalAddItems(...)` or table insert fallback
- Secondary / post-write stage(s):
  - `rpcProposalSnapshotItems(...)`
  - canonical binding sync into `proposal_items` via bulk upsert or row updates
  - optional `rpcProposalSubmit(proposalId)`
  - request item status sync via `request_items_set_status` RPC or table fallback
- Fallback branches:
  - approval gate degrades open if request-status read fails
  - proposal add-items falls back to direct `proposal_items` inserts
  - proposal_items canonical binding sync falls back from bulk upsert to row-by-row updates
  - request-item status sync falls back from RPC to table update
- Reconstructed semantic result:
  - usable proposal business result consisting of proposal head, linked children, validated supplier/contractor binding, optional submitted state, and downstream request-item lifecycle advancement
  - this does not exist here as one stable mutation contract; it emerges after several client-side stages
- Downstream dependency:
  - buyer submission flow
  - director approval flow
  - accountant handoff path
  - proposal attachments and later proposal lifecycle reads
  - request-item status progression
- Failure mode:
  - partial business commit
  - parent/child divergence
  - status progression drift
  - fallback semantic divergence
  - incomplete mutation envelope
- Blast radius:
  - buyer proposal creation
  - downstream director/accountant lifecycle
  - systemic in one critical write boundary
  - write path also infects later read and approval layers
- Suggested future solidification target:
  - stable proposal creation mutation contract covering approval gate, proposal head, child items, canonical bindings, submit flag, and request-item status transition together
  - likely home: stable RPC mutation contract or explicit write-side service boundary
- Touch risk: `high`

### Finding 2

- Priority: `P1 mutation-boundary blocker`
- Status: `confirmed`
- File: [`src/screens/buyer/buyer.actions.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts)
- Exact function/path:
  - [`handleCreateProposalsBySupplierAction()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L310)
- Business operation:
  - buyer commercial submission to director
- Pre-write reads / validation inputs:
  - picked request-item ids
  - per-item supplier/price/note metadata
  - attachment presence warning
  - `validatePicked()`
  - `confirmSendWithoutAttachments()`
- Primary write stage(s):
  - queue mode: `stageProposalAttachmentForQueue(...)` + `enqueueSubmitJob(...)`
  - sync mode: `apiCreateProposalsBySupplier(...)`
- Secondary / post-write stage(s):
  - attachment upload to created proposals via `uploadProposalAttachment(...)`
  - best-effort `setRequestItemsDirectorStatus(...)` with fallback
  - `clearRequestItemsDirectorRejectState(...)`
  - background inbox/buckets refresh
- Fallback branches:
  - queue-mode path vs legacy sync path
  - post-submit director-status sync fallback to `setRequestItemsDirectorStatusFallback(...)`
  - attachment upload is secondary and may fail after proposals are already created
- Reconstructed semantic result:
  - effective buyer submission result consisting of proposal creation or queued submit intent, attachment association, request-item director status update, and reject-state cleanup
  - no single bounded mutation contract spans the whole business handoff
- Downstream dependency:
  - buyer inbox removal
  - director pending queue
  - attachment flow
  - request-item director-facing state
- Failure mode:
  - partial semantic completion
  - post-write sync omission
  - attachment/meta orphan risk
  - downstream handoff mismatch
- Blast radius:
  - buyer submit entry point
  - downstream director workflow
  - systemic around one high-value handoff boundary
  - write path also influences later read queues
- Suggested future solidification target:
  - stable buyer submit mutation envelope covering proposal creation/queue acceptance, attachment association intent, and request-item director handoff state
  - likely home: stable RPC mutation contract or explicit write-side service boundary
- Touch risk: `high`

### Finding 3

- Priority: `P1 mutation-boundary blocker`
- Status: `confirmed`
- File: [`src/screens/warehouse/warehouse.issue.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts)
- Exact function/path:
  - [`submitReqPick()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L99)
  - [`issueByRequestItem()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L321)
  - repo helpers in [`src/screens/warehouse/warehouse.issue.repo.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.repo.ts)
- Business operation:
  - request-backed warehouse issuance
- Pre-write reads / validation inputs:
  - recipient validation
  - request/request_item ids
  - qty vs `qty_left`, `qty_available`, `qty_can_issue_now`
  - line-to-request-item mapping
  - object/work labels from current UI context
- Primary write stage(s):
  - `createWarehouseIssue(...)` via `issue_via_ui`
  - `addWarehouseIssueItems(...)` or `addWarehouseIssueItem(...)`
  - `commitWarehouseIssue(...)` via `acc_issue_commit_ledger`
- Secondary / post-write stage(s):
  - `refreshAfterIssueCommit(...)` => `fetchStock()`, `fetchReqHeads()`, `fetchReqItems(requestId)`
  - local cart/input cleanup
  - note/context write embedded into issue head
- Fallback branches:
  - no alternative write backend is coded here, but semantic completion still depends on separate add-items and commit stages plus refresh convergence
- Reconstructed semantic result:
  - semantically complete issuance result consisting of issue head, child issue lines, committed ledger effect, and refreshed request/stock truth
  - there is no one bounded mutation contract at this client boundary
- Downstream dependency:
  - warehouse issuance flow
  - request qty-left truth
  - stock truth seen by warehouse UI
  - downstream reporting through committed issue records
- Failure mode:
  - partial business commit
  - parent/child divergence
  - stock/issuance boundary fragility
  - downstream handoff mismatch
- Blast radius:
  - warehouse request issuance
  - stock/ledger-affecting path
  - localized to warehouse role but business-critical
  - write path also feeds later read/report layers
- Suggested future solidification target:
  - stable request-backed issuance mutation boundary covering issue head, issue lines, ledger commit, and resolved request-item effects together
  - likely home: bounded parent+children write contract or stable RPC mutation contract
- Touch risk: `high`

### Finding 4

- Priority: `P1 mutation-boundary blocker`
- Status: `confirmed`
- File: [`src/lib/api/requests.ts`](/c:/dev/rik-expo-app/src/lib/api/requests.ts)
- Exact function/path:
  - [`requestSubmit()`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L463)
  - support paths:
    - [`requestHasPostDraftItems()`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L427)
    - [`reconcileRequestHeadStatus()`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L440)
    - [`addRequestItemFromRik()`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L328)
- Business operation:
  - request lifecycle transition from draft/pending into submitted/ready state
- Pre-write reads / validation inputs:
  - guard probe on `request_items.status`
  - request select schema capability load
  - request id normalization
- Primary write stage(s):
  - preferred RPC `request_submit(...)`
  - fallback request head update via `updateRequestHeadStatus(...)`
- Secondary / post-write stage(s):
  - `reconcileRequestHeadStatus(...)` through compat RPCs
  - `updateRequestItemsPendingStatus(...)` on fallback route
  - record reload via `selectRequestRecordById(...)`
- Fallback branches:
  - if post-draft items already exist, skip primary submit and only reconcile head state
  - if `request_submit` RPC fails, fallback to head update
  - if `submitted_at` write mismatches schema, retry fallback without `submitted_at`
  - head reconciliation switches between `request_recalc_status` and `request_update_status_from_items`
- Reconstructed semantic result:
  - effective submitted request state with synchronized head status and item statuses
  - no single stable mutation contract guarantees this semantic result on all paths
- Downstream dependency:
  - foreman submit flow
  - buyer visibility and procurement gating
  - warehouse request eligibility
  - request lifecycle reads
- Failure mode:
  - status progression drift
  - fallback semantic divergence
  - post-write sync omission
  - incomplete mutation envelope
- Blast radius:
  - request lifecycle across multiple roles
  - systemic repeated pattern in a core status boundary
  - write path also affects later read and approval paths
- Suggested future solidification target:
  - stable request submit/status-transition contract covering head transition, item status normalization, and final read shape together
  - likely home: stable status-transition RPC mutation contract
- Touch risk: `high`

### Finding 5

- Priority: `P2 mutation-boundary debt`
- Status: `confirmed`
- File:
  - [`src/lib/api/proposals.ts`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts)
  - consumed by buyer flows in [`src/screens/buyer/buyer.actions.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts)
- Exact function/path:
  - [`proposalCreateFull()`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts#L255)
  - [`proposalAddItems()`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts#L276)
  - [`proposalSubmit()`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts#L293)
- Business operation:
  - low-level proposal head creation, child linking, and submit transition
- Pre-write reads / validation inputs:
  - proposal meta select after create
  - request-item id list for add-items
- Primary write stage(s):
  - `proposal_create` RPC
  - `proposal_add_items` RPC
  - `proposal_submit` RPC
- Secondary / post-write stage(s):
  - metadata select after create
  - `cleanupProposalSubmission(proposalId)` after submit
- Fallback branches:
  - proposal head create falls back to direct `proposals` insert
  - add-items falls back to bulk then row-by-row `proposal_items` insert
  - submit falls back to `proposals.update(...)`
- Reconstructed semantic result:
  - proposal mutation result is partially normalized by helpers, but semantic consistency still depends on fallback branch and post-submit cleanup
- Downstream dependency:
  - buyer rework flow
  - proposal creation helpers
  - director/accountant proposal lifecycle
- Failure mode:
  - fallback semantic divergence
  - post-write sync omission
  - boundary fragility
- Blast radius:
  - repeated low-level helper layer
  - not as wide as `createProposalsBySupplier()`, but reused
- Suggested future solidification target:
  - stable low-level proposal mutation helper contract with uniform create/add-items/submit semantics across all schema variants
  - likely home: stable RPC mutation contract or explicit adapter boundary
- Touch risk: `medium`

### Finding 6

- Priority: `P2 mutation-boundary debt`
- Status: `confirmed`
- File: [`src/screens/buyer/buyer.actions.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts)
- Exact function/path:
  - [`sendToAccountingAction()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L762)
- Business operation:
  - proposal handoff from buyer to accountant
- Pre-write reads / validation inputs:
  - invoice number/date/amount validation
  - proposal id
  - optional existing invoice attachment name
- Primary write stage(s):
  - invoice attachment upload if needed
  - `sendToAccountingWithFallback(...)`
  - `ensureAccountingFlags(...)`
- Secondary / post-write stage(s):
  - proposal HTML attachment generation/upload
  - select-check on `proposals(payment_status,sent_to_accountant_at)`
  - local approved-list removal and bucket refresh
- Fallback branches:
  - main send uses primary adapter then fallback RPC path
  - HTML attachment failure is tolerated as warning after main mutation
- Reconstructed semantic result:
  - effective accounting handoff result combines accountant-visible proposal state, invoice payload, accounting flags, and supporting attachment side effects
  - this boundary is only partially bounded; semantic completeness is split
- Downstream dependency:
  - accountant inbox
  - payment flow
  - proposal document trail
- Failure mode:
  - partial semantic completion
  - attachment/meta orphan risk
  - fallback semantic divergence
  - downstream handoff mismatch
- Blast radius:
  - buyer-to-accountant handoff
  - moderate blast radius, role-critical but more bounded than proposal creation
- Suggested future solidification target:
  - stable accounting handoff mutation envelope covering send transition, invoice metadata, accounting flags, and required technical attachments
  - likely home: stable RPC mutation contract or attachment/meta write envelope
- Touch risk: `medium`

### Finding 7

- Priority: `acceptable bounded mutation`
- Status: `confirmed`
- File:
  - [`src/screens/warehouse/warehouse.issue.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts)
  - [`src/screens/warehouse/hooks/useWarehouseReceiveApply.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/hooks/useWarehouseReceiveApply.ts)
- Exact function/path:
  - [`submitStockPick()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L222)
  - [`applyWarehouseReceive()`](/c:/dev/rik-expo-app/src/screens/warehouse/hooks/useWarehouseReceiveApply.ts#L5)
- Business operation:
  - free stock issue and receive apply
- Pre-write reads / validation inputs:
  - local qty validation and grouped stock checks for stock issue
  - receive payload preparation for incoming items
- Primary write stage(s):
  - `wh_issue_free_atomic_v4`
  - `wh_receive_apply_ui`
- Secondary / post-write stage(s):
  - UI refresh/cleanup only
- Fallback branches:
  - none in client mutation semantics
- Reconstructed semantic result:
  - bounded stock-affecting mutation already lives in one explicit RPC contract per operation
- Downstream dependency:
  - warehouse stock issue / receive UI
- Failure mode:
  - UI refresh degradation if follow-up reload fails
- Blast radius:
  - warehouse only
  - bounded and acceptable
- Suggested future solidification target:
  - none urgent
- Touch risk: `low`

### Finding 8

- Priority: `acceptable bounded mutation`
- Status: `already mitigated`
- File:
  - [`src/lib/api/director.ts`](/c:/dev/rik-expo-app/src/lib/api/director.ts)
  - [`src/lib/api/accountant.ts`](/c:/dev/rik-expo-app/src/lib/api/accountant.ts)
- Exact function/path:
  - [`directorReturnToBuyer()`](/c:/dev/rik-expo-app/src/lib/api/director.ts#L160)
  - [`accountantAddPayment()`](/c:/dev/rik-expo-app/src/lib/api/accountant.ts#L57)
  - [`accountantReturnToBuyer()`](/c:/dev/rik-expo-app/src/lib/api/accountant.ts#L79)
  - related but less bounded status helpers: [`approve()`](/c:/dev/rik-expo-app/src/lib/api/director.ts#L124), [`reject()`](/c:/dev/rik-expo-app/src/lib/api/director.ts#L142)
- Business operation:
  - return/add-payment/accountant return and small approval transitions
- Pre-write reads / validation inputs:
  - minimal payload shaping only
- Primary write stage(s):
  - one RPC or rpc-compat mutation per operation
- Secondary / post-write stage(s):
  - none significant in client
- Fallback branches:
  - rpc-compat function name variants in accountant actions
  - `approve()` / `reject()` fall back to direct `proposals.status` update
- Reconstructed semantic result:
  - most of these actions already have compact mutation boundaries; only `approve/reject` show modest fallback semantic spread
- Downstream dependency:
  - director/accountant action buttons
- Failure mode:
  - bounded boundary fragility
- Blast radius:
  - role-specific lifecycle actions
  - comparatively narrow
- Suggested future solidification target:
  - none urgent for return/payment actions
  - `approve/reject` can stay low-priority unless lifecycle semantics widen
- Touch risk: `low`

## Part C. Pattern Clusters

### 1. Parent/child write orchestration

- `createProposalsBySupplier()` creates proposal heads, links `proposal_items`, then patches bindings and statuses.
- `submitReqPick()` / `issueByRequestItem()` create issue heads, add child issue lines, then commit ledger.

### 2. Status-transition glue

- `requestSubmit()` spreads request submit semantics across request head write, request_items status sync, and head reconciliation.
- `proposalSubmit()` adds submit fallback plus cleanup side effect.
- buyer post-submit flow separately advances request-item director-facing state.

### 3. Fallback mutation branching

- proposal creation/add-items/submit all branch between RPC and direct table writes.
- request submit branches between RPC submit, direct head patch, schema-capability retry, and compat reconciliation.
- director `approve/reject` also branch between RPC and table update, but with smaller blast radius.

### 4. Write + side-effect split boundaries

- buyer commercial submit creates proposals first, then uploads attachments, then syncs request-item statuses/reject state.
- accounting handoff sends to accountant, then separately ensures accounting flags and proposal HTML/invoice attachment state.

### 5. Stock / issuance mutation chains

- request-backed warehouse issuance depends on create issue -> add lines -> commit ledger.
- free issue and receive apply are better bounded because they already use one atomic RPC each.

### 6. Approval-gated mutation chains

- `createProposalsBySupplier()` gates items by request/request-item approval state before writing.
- `requestSubmit()` decides route based on current request_item statuses loaded before write.
- buyer submit flow branches by queue configuration and attachment warning acceptance before mutation.

### 7. Attachment/meta/snapshot follow-up writes

- proposal creation calls `rpcProposalSnapshotItems(...)` after core write.
- buyer submit attaches supplier quotes only after proposal ids exist.
- accounting send uploads invoice and proposal HTML separately from the main accountant-handoff mutation.

### 8. Other repeated patterns

- graceful degradation is common: many flows treat the primary business write as “good enough” and continue with best-effort secondary completion.
- that is operationally useful, but it also means several write boundaries are semantically complete only after optional convergence stages.

## Part D. Solidification Priority Map

### 1. Batch codename: `proposal-creation-boundary`

- Exact target mutation boundary/path:
  - [`createProposalsBySupplier()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092)
- What should become stable:
  - one bounded mutation contract for approval-gated proposal creation, child linking, canonical binding resolution, optional submit, and request-item status transition
- Expected payoff:
  - removes the heaviest client-side proposal orchestration chain
  - reduces parent/child divergence and status drift risk
- Risk:
  - high

### 2. Batch codename: `buyer-commercial-submit-boundary`

- Exact target mutation boundary/path:
  - [`handleCreateProposalsBySupplierAction()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L310)
- What should become stable:
  - one buyer submit envelope that covers created proposals or queued intent, attachment association intent, and request-item director handoff state
- Expected payoff:
  - reduces split between main write success and best-effort secondary convergence
  - makes buyer-to-director handoff more trustworthy
- Risk:
  - high

### 3. Batch codename: `warehouse-request-issue-boundary`

- Exact target mutation boundary/path:
  - [`submitReqPick()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L99)
  - [`issueByRequestItem()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L321)
- What should become stable:
  - one bounded request-backed issuance contract including issue head, issue lines, ledger commit, and request-item effects
- Expected payoff:
  - reduces staged issuance fragility and refresh-dependent convergence
  - tightens stock/request truth after issuance
- Risk:
  - high

### 4. Batch codename: `request-submit-boundary`

- Exact target mutation boundary/path:
  - [`requestSubmit()`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L463)
- What should become stable:
  - one stable request submit/status-transition contract with final head and item statuses already reconciled
- Expected payoff:
  - reduces fallback divergence in request lifecycle
  - gives downstream buyer/warehouse flows a more reliable transition point
- Risk:
  - high

### 5. Batch codename: `accounting-handoff-boundary`

- Exact target mutation boundary/path:
  - [`sendToAccountingAction()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L762)
- What should become stable:
  - one bounded accountant handoff envelope for send transition, invoice metadata, flags, and required attachment state
- Expected payoff:
  - reduces side-effect split between main accounting state and supporting docs/meta
  - lowers downstream handoff mismatch risk
- Risk:
  - medium

## Part E. Final Verdict

- Главный confirmed mutation-boundary blocker:
  - proposal creation orchestration in [`createProposalsBySupplier()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092), because one business operation is spread across approval reads, parent create, child linking, binding sync, submit, and request-item status progression
- Главный parent/child write risk:
  - proposal head plus `proposal_items` creation/linking in `createProposalsBySupplier()`
- Главный status-transition risk:
  - `requestSubmit()` in [`src/lib/api/requests.ts`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L463), because final request semantics depend on staged fallback writes and reconciliation
- Главный stock/issuance write risk:
  - request-backed issuance in [`submitReqPick()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L99) and [`issueByRequestItem()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L321)
- Главный side-effect split risk:
  - buyer commercial submit in [`handleCreateProposalsBySupplierAction()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L310), because attachments and request-item director handoff are completed only after the core proposal write
- Главный maintainability-only mutation debt:
  - bounded single-RPC warehouse receive/free-issue flows and compact accountant return/payment actions
- Что нужно solidify first and why:
  - first solidify the proposal creation boundary
  - reason: this is the widest confirmed client-side mutation contract in the codebase and it already sits at the intersection of approval gating, parent/child writes, status progression, and downstream role handoff
