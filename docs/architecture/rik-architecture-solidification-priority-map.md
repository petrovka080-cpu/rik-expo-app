# Architecture Solidification Priority Map

Read-only synthesis document. No code changes, no refactors, no migration proposals, no DB/view/RPC edits.

Built from:

- [rik-string-as-schema-audit.md](/c:/dev/rik-expo-app/docs/architecture/rik-string-as-schema-audit.md)
- [rik-client-side-relational-glue-audit.md](/c:/dev/rik-expo-app/docs/architecture/rik-client-side-relational-glue-audit.md)
- [rik-write-path-boundary-audit.md](/c:/dev/rik-expo-app/docs/architecture/rik-write-path-boundary-audit.md)

## Part A. Executive Summary

### 1. Общая synthesis-оценка архитектурной ситуации после трех аудитов

После трех аудитов картина уже достаточно ясна.

- Главный системный риск сосредоточен не в UI и не в локальных helper debt, а в нескольких load-bearing contracts, через которые проходят report semantics, object identity, proposal lifecycle, request lifecycle и warehouse issuance truth.
- Самая важная проблема: приложение в критичных местах сначала восстанавливает бизнес-смысл из строк и client-side joins, а затем на этой же реконструкции строит write decisions и downstream handoff.
- Поэтому priority map должен идти не “по файлам”, а по немногим bounded targets, которые одновременно режут `string-as-schema`, `client-side relational glue` и `write-path boundary`.

### 2. Какие 3-5 targets реально заслуживают first solidification wave

1. `director-fact-contract`
2. `object-identity-contract`
3. `proposal-creation-boundary`
4. `request-submit-boundary`

`warehouse-issuance-contract` тоже high-value, но логичнее ставить сразу после foundation request/proposal boundaries, а не раньше них.

### 3. Что является foundation

- `director-fact-contract` is the reporting foundation.
- `object-identity-contract` is the grouping/filtering foundation for director reporting.
- `proposal-creation-boundary` is the write-side commercial foundation.
- `request-submit-boundary` is the lifecycle foundation for downstream buyer/warehouse eligibility.

### 4. Что high-payoff but should not go first

- `warehouse-issuance-contract` is high-payoff, but it sits on top of request lifecycle and operational read truth, so it should follow request-side foundations.
- `buyer-inbox-read-model` is high-payoff for procurement actionability, but it should follow proposal/request foundations to avoid stabilizing a derived queue on top of unstable lifecycle semantics.

### 5. Что можно сознательно отложить без немедленного системного ущерба

- `request-head-meta-contract` for contractor/phone/volume note parsing
- `buyer-proposal-detail-model`
- unified buyer counterparty read model
- bounded proposal low-level helper cleanup
- accounting handoff envelope

These are real debts, but they are not the best first-wave leverage points.

## Part B. Consolidated Solidification Targets

### Target 1

- Target name: `director-fact-contract`
- Priority wave: `Wave 1 — foundational`
- Debt classes resolved:
  - `string-as-schema`
  - `client-side relational glue`
- Exact code footprint:
  - [`parseFreeIssueContext()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1458)
  - [`fetchDirectorFactViaAccRpc()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1533)
  - [`fetchAllFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1780)
  - [`fetchDisciplineFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2020)
  - [`buildPayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2386)
  - [`buildDisciplinePayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2929)
- Why it matters:
  - stabilizes report correctness for object/work/level resolution
  - removes the heaviest report dependence on string-derived context and client-side fact reconstruction
- Dependency order:
  - foundation target
  - should precede `object-identity-contract`
  - unlocks safer director report grouping and downstream report-option logic
- Expected payoff:
  - fewer repeated joins
  - fewer string-derived semantics in report assembly
  - lower fallback divergence across RPC/view/table paths
- Touch risk:
  - `high`
  - because it touches the widest reporting contract with several fallback sources
- Why not later / why not earlier:
  - not later, because report semantics already depend on it
  - not earlier than anything else, because this is the main reporting foundation

### Target 2

- Target name: `object-identity-contract`
- Priority wave: `Wave 1 — foundational`
- Debt classes resolved:
  - `string-as-schema`
  - `client-side relational glue`
- Exact code footprint:
  - [`canonicalObjectName()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L452)
  - [`filterDisciplineRowsByObject()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L568)
  - [`buildPayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2386)
  - purchase-cost object match at [`director_reports.ts:2890`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2890)
- Why it matters:
  - stabilizes grouping, filtering, and purchase-cost matching on object identity
  - removes canonicalized display text as a load-bearing join key
- Dependency order:
  - depends on `director-fact-contract`
  - unlocks cleaner director object filters, report options, and cost attribution
- Expected payoff:
  - less grouping drift
  - less filter/report divergence
  - lower repeated tail stripping and canonicalization
- Touch risk:
  - `high`
  - because it spans report grouping, filtering, and cost enrichment
- Why not later / why not earlier:
  - not later, because director reporting still depends on unstable object buckets
  - not earlier than `director-fact-contract`, because object identity sits on top of resolved fact semantics

### Target 3

- Target name: `proposal-creation-boundary`
- Priority wave: `Wave 1 — foundational`
- Debt classes resolved:
  - `client-side relational glue`
  - `write-path boundary`
- Exact code footprint:
  - [`loadCounterpartyBinding()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2059)
  - [`createProposalsBySupplier()`](/c:/dev/rik-expo-app/src/lib/catalog_api.ts#L2092)
  - low-level helpers in [`proposalCreateFull()`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts#L255), [`proposalAddItems()`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts#L276), [`proposalSubmit()`](/c:/dev/rik-expo-app/src/lib/api/proposals.ts#L293)
- Why it matters:
  - stabilizes the main commercial mutation boundary for proposal head, child items, bindings, submit state, and request-item progression
  - removes the heaviest client-side orchestration chain in write semantics
- Dependency order:
  - foundation target
  - should precede `buyer-inbox-read-model`
  - should precede `buyer-commercial-submit-envelope`
- Expected payoff:
  - more bounded write flow
  - less fallback divergence
  - less parent/child write fragility
  - more predictable role handoff
- Touch risk:
  - `high`
  - because it crosses approval gating, parent/child writes, binding logic, and status progression
- Why not later / why not earlier:
  - not later, because it is the core write-side blocker
  - not earlier than the reporting foundations by much; both can start in Wave 1 because they address separate systemic pillars

### Target 4

- Target name: `request-submit-boundary`
- Priority wave: `Wave 1 — foundational`
- Debt classes resolved:
  - `write-path boundary`
  - `client-side relational glue`
- Exact code footprint:
  - [`requestSubmit()`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L463)
  - [`requestHasPostDraftItems()`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L427)
  - [`reconcileRequestHeadStatus()`](/c:/dev/rik-expo-app/src/lib/api/requests.ts#L440)
- Why it matters:
  - stabilizes request lifecycle consistency before buyer and warehouse flows consume it
  - removes staged status reconciliation as the effective source of lifecycle truth
- Dependency order:
  - foundation target
  - should precede `warehouse-issuance-contract`
  - should precede `buyer-inbox-read-model`
- Expected payoff:
  - less status progression drift
  - more predictable downstream eligibility
  - fewer lifecycle fallback branches leaking into operational screens
- Touch risk:
  - `high`
  - because multiple roles depend on request status semantics
- Why not later / why not earlier:
  - not later, because it gates both procurement and issuance truth
  - not earlier than Wave 1, because it is itself a foundation

### Target 5

- Target name: `warehouse-issuance-contract`
- Priority wave: `Wave 2 — high-payoff after foundations`
- Debt classes resolved:
  - `client-side relational glue`
  - `write-path boundary`
  - partially `string-as-schema`
- Exact code footprint:
  - read side: [`apiFetchReqHeads()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L841), [`apiFetchReqItems()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L1166)
  - write side: [`submitReqPick()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L99), [`issueByRequestItem()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L321)
  - local note/meta parsing: [`enrichReqHeadsMeta()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L443)
- Why it matters:
  - stabilizes what warehouse sees as issuable truth and what gets committed as issued truth
  - reduces split between operational read model and request-backed issuance mutation chain
- Dependency order:
  - depends on `request-submit-boundary`
  - benefits from `proposal-creation-boundary` indirectly through cleaner request-item lifecycle semantics
- Expected payoff:
  - less staged hydration before issuance
  - tighter issuance truth
  - lower parent/child issuance fragility
- Touch risk:
  - `high`
  - because it combines operational reads, issue creation, ledger commit, and request-item effects
- Why not later / why not earlier:
  - not earlier, because fixing warehouse issuance before request lifecycle stabilizes would optimize on unstable upstream state
  - not much later, because it is the main operational-truth layer after foundations

### Target 6

- Target name: `buyer-inbox-read-model`
- Priority wave: `Wave 2 — high-payoff after foundations`
- Debt classes resolved:
  - `client-side relational glue`
- Exact code footprint:
  - [`listBuyerInbox()`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts#L265)
  - [`filterInboxByRequestStatus()`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts#L184)
  - [`loadLatestProposalLifecycleByRequestItem()`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts#L73)
  - [`enrichRejectedRows()`](/c:/dev/rik-expo-app/src/lib/api/buyer.ts#L124)
- Why it matters:
  - stabilizes buyer actionability and queue trust
  - reduces post-filter/post-enrich client assembly in the procurement entry point
- Dependency order:
  - depends on `proposal-creation-boundary`
  - depends on `request-submit-boundary`
  - parallelizable with `warehouse-issuance-contract` after foundations
- Expected payoff:
  - less repeated joins in buyer queue
  - less fallback divergence
  - more predictable buyer worklist semantics
- Touch risk:
  - `medium`
  - because blast radius is role-critical but narrower than proposal creation or request submit
- Why not later / why not earlier:
  - not earlier, because otherwise inbox semantics would still rest on unstable request/proposal lifecycle contracts
  - can wait until Wave 2 because it is downstream-facing, not the main mutation foundation

### Target 7

- Target name: `buyer-commercial-submit-envelope`
- Priority wave: `Wave 2 — high-payoff after foundations`
- Debt classes resolved:
  - `write-path boundary`
- Exact code footprint:
  - [`handleCreateProposalsBySupplierAction()`](/c:/dev/rik-expo-app/src/screens/buyer/buyer.actions.ts#L310)
- Why it matters:
  - stabilizes the handoff envelope around queue intent, proposal creation result, attachment association, and director-facing status updates
- Dependency order:
  - depends on `proposal-creation-boundary`
  - can run in parallel with `buyer-inbox-read-model` after `proposal-creation-boundary`
- Expected payoff:
  - more predictable role handoff
  - less side-effect split after submit
- Touch risk:
  - `medium`
  - because it is a high-value orchestration wrapper, but the core mutation risk sits one layer lower in proposal creation
- Why not later / why not earlier:
  - not earlier, because stabilizing the wrapper before the underlying proposal mutation would be false optimization
  - not too late, because buyer-to-director handoff remains semantically split otherwise

### Target 8

- Target name: `request-head-meta-contract`
- Priority wave: `Wave 3 — bounded/local cleanup later`
- Debt classes resolved:
  - `string-as-schema`
  - partially `client-side relational glue`
- Exact code footprint:
  - [`parseReqHeaderContext()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L391)
  - [`enrichReqHeadsMeta()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L443)
  - duplicated parsing in [`warehouse.utils.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.utils.ts#L199) and [`ReqIssueModal.tsx`](/c:/dev/rik-expo-app/src/screens/warehouse/components/ReqIssueModal.tsx#L122)
- Why it matters:
  - stabilizes local warehouse metadata display and removes duplicated note parsing
- Dependency order:
  - no hard dependency
  - can be deferred until after Wave 1 and Wave 2 systemic contracts
- Expected payoff:
  - less duplicated parsing
  - less local formatting drift
- Touch risk:
  - `medium`
  - because it is repeated locally, but blast radius is bounded
- Why not later / why not earlier:
  - can go later because it does not drive report correctness or core lifecycle semantics
  - should not go earlier because it is local cleanup, not a foundation

## Part C. Dependency Graph

- `director-fact-contract` -> `object-identity-contract`
- `request-submit-boundary` -> `warehouse-issuance-contract`
- `request-submit-boundary` -> `buyer-inbox-read-model`
- `proposal-creation-boundary` -> `buyer-inbox-read-model`
- `proposal-creation-boundary` -> `buyer-commercial-submit-envelope`
- `warehouse-issuance-contract` parallel to `buyer-inbox-read-model`
- `director-fact-contract` parallel to `proposal-creation-boundary`
- `request-submit-boundary` parallel to `director-fact-contract`
- `object-identity-contract` blocked by `director-fact-contract`
- `buyer-commercial-submit-envelope` blocked by `proposal-creation-boundary`
- `request-head-meta-contract` parallel to everything, but should be deferred because it is not a foundational leverage point

## Part D. First Implementation Wave Recommendation

### Exact targets in Wave 1

- `director-fact-contract`
- `object-identity-contract`
- `proposal-creation-boundary`
- `request-submit-boundary`

### Почему именно они

- They remove the two main systemic foundations:
  - unstable report semantics on the director side
  - unstable lifecycle and mutation semantics on the request/proposal side
- They cut across all three debt classes with the highest leverage.
- Everything else either depends on them or would risk stabilizing downstream projections on top of still-unstable foundations.

### Какой systemic risk they remove first

- report correctness drift
- object grouping/filter instability
- proposal parent/child write fragility
- request lifecycle status drift

### Какой expected payoff

- more stable report assembly
- more stable object-scoped reporting
- more bounded commercial write flow
- more predictable downstream eligibility for buyer and warehouse roles

### Что сознательно НЕ включаем в Wave 1 и почему

- `warehouse-issuance-contract`
  - important, but should follow request lifecycle foundation
- `buyer-inbox-read-model`
  - valuable, but should not stabilize a downstream queue before request/proposal foundations
- `buyer-commercial-submit-envelope`
  - should follow `proposal-creation-boundary`
- `request-head-meta-contract`
  - local and bounded compared with Wave 1 leverage

## Part E. Deferred / Not-Now Items

- `request-head-meta-contract`
  - real debt, but local operational metadata only
- `buyer-proposal-detail-model`
  - proposal detail/title/rework hydration is unpleasant, but not a first-wave systemic blocker
- unified buyer counterparty read model
  - repeated merge logic, but mainly selection UX
- low-level proposal helper cleanup outside the main creation boundary
  - real adapter debt, but lower value than stabilizing the top mutation boundary itself
- accounting handoff envelope
  - role-critical, but narrower than proposal creation and request submit
- bounded warehouse free-issue/receive RPC paths
  - already acceptable enough and should stay out of the first wave

## Part F. Final Verdict

- главный foundation target:
  - `director-fact-contract`
- главный report-stability target:
  - `object-identity-contract`
- главный write-boundary target:
  - `proposal-creation-boundary`
- главный operational-truth target:
  - `warehouse-issuance-contract`
- главный deferred-but-real target:
  - `buyer-inbox-read-model`
- recommended first wave in one sentence:
  - first solidify `director-fact-contract`, `object-identity-contract`, `proposal-creation-boundary`, and `request-submit-boundary`, because they remove the main report, identity, mutation, and lifecycle foundations that every later optimization currently depends on
