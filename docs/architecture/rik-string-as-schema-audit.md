# String-as-Schema Audit Pass

Read-only audit. No code changes, no migration proposals, no schema edits.

## Part A. Executive Summary

### 1. Общая оценка string-as-schema debt в приложении

Debt есть, но он не равномерный.

- Самый load-bearing слой находится в [`src/lib/api/director_reports.ts`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts): здесь приложение реально восстанавливает `object/work/level` из `warehouse_issues.note` и потом использует результат в object filtering, KPI, material rows, discipline grouping и purchase-cost matching.
- Второй слой находится в [`src/screens/warehouse/warehouse.api.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts): `requests.note/comment` и `request_items.note` используются как fallback carrier для `contractor_name`, `contractor_phone`, `planned_volume`. Это operational debt, но не core reporting/grouping contract.
- Есть и presentation-only string parsing, но он локальный и не участвует в business identity.

### 2. Топ confirmed patterns

1. `warehouse_issues.note` -> `object/work/level` reconstruction for director facts and discipline reports.
2. `canonicalObjectName()` tail stripping and canonicalization used as object identity for report grouping/filtering and purchase-cost matching.
3. Request header parsing from `note/comment` into contractor/phone/volume in warehouse request flows.

### 3. Где string parsing уже влияет на business/report correctness

- Director materials report payload: [`buildPayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2386) consumes normalized `object_name` and `work_name` for KPI, `discipline_who`, and `report_options`.
- Director discipline payload: [`buildDisciplinePayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2929) groups by normalized `work_name` and `level_name`.
- Director fact-source fetchers parse free-issue notes before rows are admitted into the result set:
  - [`fetchDirectorFactViaAccRpc()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1533)
  - [`fetchAllFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1780)
  - [`fetchDisciplineFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2020)
- Purchase cost matching for selected object also canonicalizes text names instead of using a stable relational key: [`src/lib/api/director_reports.ts:2890-2902`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2890).

### 4. Где это пока только maintainability debt

- Warehouse request meta enrichment parses `note/comment` only after trying explicit fields first, so the parsing path is a fallback, not the primary contract: [`enrichReqHeadsMeta()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L443), [`fetchWarehouseRequestMeta()`](/c:/dev/rik-expo-app/src/screens/warehouse/hooks/useWarehouseRequestMeta.ts#L23).
- Buyer note utilities split and hide note fragments for UX only; they do not drive grouping, joins, report math, or entity identity: [`src/screens/buyer/buyerUtils.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyerUtils.ts).

### 5. Verdict: local problem or systemic pattern

Verdict: systemic repeated pattern, but concentrated in two hotspots.

- `director_reports.ts` is the main blocker because string-derived contracts directly affect report semantics.
- Warehouse request note parsing is repeated across API, hooks, and modal code, but its blast radius is mostly local UI/operational metadata.

## Part B. Inventory of Exact Findings

### Finding 1

- Priority: `P1 string-schema blocker`
- Status: `confirmed`
- File: [`src/lib/api/director_reports.ts`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts)
- Exact function/path:
  - [`parseFreeIssueContext()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1458)
  - consumed in [`fetchDirectorFactViaAccRpc()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1533)
  - consumed in [`fetchAllFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1780)
  - consumed in [`fetchDisciplineFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2020)
- Source text field: `warehouse_issues.note`
- Reconstructed structured fields: `object_name`, `work_name`, `level_name`, effectively also `is_without_request` context for free issues
- Parsing mechanism:
  - regex field extraction for `Объект:`, `Система:` / `Контекст:`, `Этаж:` / `Уровень:`
  - tail stripping for `· Контекст: ... · Система: ... · Зона: ...`
  - fallback normalization to `WITHOUT_OBJECT`, `WITHOUT_WORK`, `WITHOUT_LEVEL`
- Downstream dependency:
  - source rows admitted or excluded under object filter in `fetchDirectorFactViaAccRpc()`
  - report material payload in [`buildPayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2386)
  - discipline grouping in [`buildDisciplinePayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2929)
  - `issues_without_object`, `discipline_who`, `report_options`
- Failure mode:
  - grouping drift
  - partial report mismatch
  - wrong aggregation key
  - schema fragility under formatting drift
- Blast radius:
  - Director warehouse report
  - Director discipline report
  - any object-filtered report run that includes free issues without `request_id`
  - repeated across multiple fact-source fallback paths, so this is systemic, not local
- Suggested future solidification target:
  - stable fact contract with explicit resolved fields: `resolved_object_name`, `resolved_work_name`, `resolved_level_name`, `resolved_is_without_request`
  - likely home: stable view/RPC output or normalized adapter contract that every report path consumes
  - current effective source-of-truth lives partly in `warehouse_issues.note` text format and partly in request joins
- Touch risk: `high`

### Finding 2

- Priority: `P1 string-schema blocker`
- Status: `confirmed`
- File: [`src/lib/api/director_reports.ts`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts)
- Exact function/path:
  - [`canonicalObjectName()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L452)
  - [`filterDisciplineRowsByObject()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L568)
  - [`buildPayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2386)
  - purchase-cost object matching at [`src/lib/api/director_reports.ts:2890-2902`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2890)
- Source text field:
  - `object_name` from director fact rows / issue rows / purchases rows
  - text may include appended diagnostic tails
- Reconstructed structured fields:
  - canonical object identity bucket
  - selected-object matching key for report filtering and purchase-cost inclusion
- Parsing mechanism:
  - normalization via `normalizeRuText()`
  - regex tail stripping for `Контекст|Система|Зона|Вид|Этаж|Оси`
  - canonicalized string equality
- Downstream dependency:
  - `report_options.objects` in `buildPayloadFromFactRows()`
  - discipline cache slicing in `filterDisciplineRowsByObject()`
  - `issues_without_object` KPI in legacy path via `normObjectName()`
  - selected-object purchase-cost computation
- Failure mode:
  - grouping drift
  - wrong aggregation key
  - partial report mismatch
  - schema fragility under formatting drift
- Blast radius:
  - all director report modes that group or filter by object name
  - purchase cost side of discipline report
  - repeated pattern across legacy RPC, table fallbacks, and in-memory report builders
- Suggested future solidification target:
  - stable object identity contract, ideally `resolved_object_id` plus `resolved_object_name`
  - if source systems cannot provide IDs everywhere, at minimum a single normalized adapter field produced once upstream instead of repeated tail stripping in report code
  - current effective source-of-truth is canonicalized display text
- Touch risk: `high`

### Finding 3

- Priority: `P2 string-schema debt`
- Status: `confirmed`
- File:
  - [`src/screens/warehouse/warehouse.api.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts)
  - [`src/screens/warehouse/warehouse.utils.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.utils.ts)
  - [`src/screens/warehouse/hooks/useWarehouseReqModalFlow.ts`](/c:/dev/rik-expo-app/src/screens/warehouse/hooks/useWarehouseReqModalFlow.ts)
  - [`src/screens/warehouse/components/ReqIssueModal.tsx`](/c:/dev/rik-expo-app/src/screens/warehouse/components/ReqIssueModal.tsx)
- Exact function/path:
  - [`parseReqHeaderContext()` in warehouse.api.ts](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L391)
  - [`enrichReqHeadsMeta()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L443)
  - fallback request-head builder at [`src/screens/warehouse/warehouse.api.ts:1063-1122`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L1063)
  - duplicated parser in [`warehouse.utils.ts:199`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.utils.ts#L199)
  - duplicated parser in [`ReqIssueModal.tsx:122`](/c:/dev/rik-expo-app/src/screens/warehouse/components/ReqIssueModal.tsx#L122)
- Source text field:
  - `requests.note`
  - `requests.comment`
  - `request_items.note`
- Reconstructed structured fields:
  - `contractor_name`
  - `contractor_phone`
  - `planned_volume`
- Parsing mechanism:
  - split by newline / `;`
  - colon-based `key: value` parsing
  - keyword matching for contractor / phone / volume
  - phone canonicalization via regex and digit-count filtering
- Downstream dependency:
  - request-head enrichment in warehouse request list
  - request modal hydration in [`useWarehouseReqModalFlow()`](/c:/dev/rik-expo-app/src/screens/warehouse/hooks/useWarehouseReqModalFlow.ts#L20)
  - request issue modal display in [`ReqIssueModal.tsx`](/c:/dev/rik-expo-app/src/screens/warehouse/components/ReqIssueModal.tsx#L180)
- Failure mode:
  - missing display fields
  - reconstructed metadata failure
  - silent UI degradation
- Blast radius:
  - warehouse request list and request issue modal
  - repeated locally across API, hook, and modal parser copies
  - does not currently drive grouping, joins, or report totals
- Suggested future solidification target:
  - stable request-head projection fields such as `effective_contractor_name`, `effective_contractor_phone`, `effective_planned_volume`
  - current effective source-of-truth is split between explicit request columns and fallback text headers in `note/comment`
- Touch risk: `medium`

### Finding 4

- Priority: `P2 string-schema debt`
- Status: `plausible`
- File: [`src/lib/api/director_reports.ts`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts)
- Exact function/path:
  - [`fetchAllFactRowsFromView()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1673)
  - [`fetchAllFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1780)
  - [`fetchDisciplineFactRowsFromTables()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2020)
- Source text field: raw `object_name` in source view/table rows
- Reconstructed structured fields: none directly; the concern is pre-canonical filtering on a raw text field before later canonical merging
- Parsing mechanism:
  - direct `.eq("object_name", p.objectName)` on raw string
  - later in-memory canonicalization via `canonicalObjectName()`
- Downstream dependency:
  - object-filtered report result sets
- Failure mode:
  - partial report mismatch if raw stored name carries a diagnostic tail but selected filter uses canonical name
- Blast radius:
  - director report runs with object filter enabled
  - applies to multiple source backends
- Suggested future solidification target:
  - source fact contract should expose the same resolved object key used by filtering and grouping
  - current source-of-truth is ambiguous between raw `object_name` and canonicalized `object_name`
- Touch risk: `high`
- Why only plausible:
  - code clearly mixes raw equality and later canonicalization, but repository evidence alone does not prove that raw persisted rows actually carry the stripped tails in these sources

### Finding 5

- Priority: `acceptable presentation-only pattern`
- Status: `confirmed`
- File:
  - [`src/screens/buyer/buyerUtils.ts`](/c:/dev/rik-expo-app/src/screens/buyer/buyerUtils.ts)
  - [`src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx`](/c:/dev/rik-expo-app/src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx)
  - [`src/screens/buyer/components/BuyerItemRow.tsx`](/c:/dev/rik-expo-app/src/screens/buyer/components/BuyerItemRow.tsx)
- Exact function/path:
  - [`splitNote()`](/c:/dev/rik-expo-app/src/screens/buyer/buyerUtils.ts#L19)
  - [`mergeNote()`](/c:/dev/rik-expo-app/src/screens/buyer/buyerUtils.ts#L54)
  - [`isReqContextNote()`](/c:/dev/rik-expo-app/src/screens/buyer/buyerUtils.ts#L62)
  - [`extractReqContextLines()`](/c:/dev/rik-expo-app/src/screens/buyer/buyerUtils.ts#L74)
- Source text field: buyer proposal/item `note`
- Reconstructed structured fields:
  - none used as business identity
  - only UI slices: user-authored note vs auto note, request-context lines for display suppression/header rendering
- Parsing mechanism:
  - split by newline / `;`
  - keyword detection
- Downstream dependency:
  - note rendering
  - hiding duplicated context from the visible note body
- Failure mode:
  - display loss
  - silent UI degradation
- Blast radius:
  - buyer screens only
  - no evidence of grouping/filtering/join/report dependency
- Suggested future solidification target:
  - none needed now
- Touch risk: `low`

## Part C. Pattern Clusters

### 1. Note/header parsing

- `warehouse_issues.note` -> `object/work/level` in [`parseFreeIssueContext()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1458)
- `requests.note/comment` and `request_items.note` -> `contractor/phone/volume` in [`parseReqHeaderContext()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L391) and duplicated helpers
- write-side producer exists in warehouse issue creation:
  - request issue note builder in [`src/screens/warehouse/warehouse.issue.ts:127`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L127)
  - point issue note builder with `Объект/Этаж/Система/Зона` headers in [`src/screens/warehouse/warehouse.issue.ts:352-366`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.issue.ts#L352)

### 2. Object tail stripping / canonicalization

- central function: [`canonicalObjectName()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L452)
- same normalized text then acts as object identity in:
  - `report_options`
  - object-filter slicing
  - purchase-cost object matching

### 3. Report grouping by canonicalized string

- materials payload groups by canonical `object_name` and normalized `work_name` in [`buildPayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2386)
- discipline payload groups by normalized `work_name` and `level_name` in [`buildDisciplinePayloadFromFactRows()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L2929)

### 4. Fallback metadata extraction from text

- warehouse request list/modal only: `contractor/phone/volume`
- bounded fallback because structured columns are tried first in both [`fetchWarehouseRequestMeta()`](/c:/dev/rik-expo-app/src/screens/warehouse/hooks/useWarehouseRequestMeta.ts#L23) and [`enrichReqHeadsMeta()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L443)

### 5. Other repeated patterns

- duplicated parsing logic instead of one authoritative adapter:
  - `warehouse.api.ts`
  - `warehouse.utils.ts`
  - `ReqIssueModal.tsx`
- this duplication increases formatting-drift risk even where current blast radius is local

## Part D. Solidification Priority Map

### 1. Batch codename: `issue-context-contract`

- Exact target field/path:
  - director fact source consumed by [`fetchDirectorWarehouseReport()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L3183) and [`fetchDirectorWarehouseReportDiscipline()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L3293)
- What should become structured:
  - `resolved_object_name`
  - `resolved_work_name`
  - `resolved_level_name`
  - `resolved_is_without_request`
- Expected payoff:
  - removes report correctness dependence on `warehouse_issues.note` formatting
  - unifies legacy/view/table fallbacks under one semantic contract
- Risk:
  - high, because multiple report source paths depend on current reconstruction logic

### 2. Batch codename: `object-identity-contract`

- Exact target field/path:
  - director report options, object filters, purchase-cost matching
- What should become structured:
  - stable object identity key used consistently for filtering, grouping, and cost matching
  - `resolved_object_id` plus display name if available
- Expected payoff:
  - removes canonicalized string equality as the object join key
  - reduces grouping drift and object-filter/report divergence
- Risk:
  - high, because the contract spans reporting and purchase-cost enrichment

### 3. Batch codename: `request-head-meta-contract`

- Exact target field/path:
  - warehouse request-head adapter consumed by [`apiFetchReqHeads()`](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.api.ts#L841) and request modal flow
- What should become structured:
  - effective contractor name
  - effective contractor phone
  - effective planned volume
- Expected payoff:
  - removes duplicated note parsing from API/hook/modal code
  - stabilizes warehouse operational metadata display
- Risk:
  - medium, because current impact is local and structured fields already partially exist

## Part E. Final Verdict

- Главный confirmed string-as-schema blocker:
  - free-issue report context reconstructed from `warehouse_issues.note` in [`parseFreeIssueContext()`](/c:/dev/rik-expo-app/src/lib/api/director_reports.ts#L1458), because it directly feeds report rows, object filters, KPI, and discipline grouping
- Главный grouping risk:
  - object identity based on `canonicalObjectName()` tail stripping and normalized string equality instead of a stable object key
- Главный report risk:
  - director report fallback paths can derive materially different `object/work/level` buckets if note formatting drifts
- Главный maintainability-only string debt:
  - warehouse request header parsing for contractor/phone/volume, because it is repeated and brittle but currently stays in local UI metadata scope
- Что нужно solidify first and why:
  - first solidify the director issue context contract
  - reason: this is the only confirmed string-derived contract in this audit that already affects report correctness, grouping semantics, and object-scoped cost attribution across multiple data-source paths
