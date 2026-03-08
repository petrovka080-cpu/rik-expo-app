# Control Patterns Spec

## Purpose
Define a unified control hierarchy for all role screens and prevent semantic mixing of control types during visual unification.

Roles in scope:
- Director
- Foreman
- Buyer
- Contractor
- Supplier Goods
- Supplier Services
- Warehouse
- Accountant

This document is architecture/spec only.

## 1. Problem Statement
A critical UI architecture issue is present when the same visual layer mixes:
- tabs
- filters
- counters
- actions

This causes semantic ambiguity and scaling problems:
- users cannot distinguish navigation vs filtering vs information vs actions
- control bars become role-specific one-off patterns
- visual unification becomes brittle and high-risk

## 2. Definitions

### Section Tabs
Navigation inside a screen between major sections.
Examples: `Заявки / Подряды / Финансы / Склад / Отчёты`.

### View Filters
Filter state of current content view.
Examples: `К оплате / Частично / Оплачено / На доработке`.

### Counters
Informational numeric indicators.
Examples: `33`, `327`, `6`, `376`.
Counters do not own navigation or filter behavior.

### Actions
Explicit action controls.
Examples: refresh, period picker, notifications, create, export.

## 3. Rules
1. Tabs must not be styled/used as filters.
2. Filters must not be styled/used as navigation tabs.
3. Counters must not behave like tabs or filters.
4. Actions must not be disguised as state filters.
5. One visual style must not encode multiple control semantics without explicit distinction.
6. Interaction semantics and visual semantics must remain aligned.

## 4. Role-Specific Mapping

### Director
- Section Tabs: `Заявки / Подряды / Финансы / Склад / Отчёты`
- View Filters: `Прораб / Снабженец` (scope filter within requests context)
- Counters: `Предложений`, `Позиций`, KPI values
- Actions: refresh/export/PDF/modal opens

### Foreman
- Section Tabs: materials vs subcontracts mode switch
- View Filters: local list/modal filters only (where applicable)
- Counters: item counts, history counts, draft counts
- Actions: catalog open, calc open, PDF, send/delete draft

### Buyer
- Section Tabs: screen-level mode tabs (including subcontract mode)
- View Filters: `Вход / Контроль / Готово / Правки` state filters
- Counters: per-tab counts, supplier/item counters
- Actions: RFQ publish, send, open sheets, attach docs

### Warehouse
- Section Tabs: `К приходу / Склад факт / Расход / Отчёты`
- View Filters: tab-local filters in modal/list contexts
- Counters: tab counts, incoming/stock metrics
- Actions: receive/issue/open reports/open pickers

### Accountant
- Section Tabs: high-level accounting sections + subcontracts
- View Filters: payment state slices
- Counters: rows count, unpaid/paid summaries
- Actions: period picker, refresh, notifications, document actions

### Contractor
- Section Tabs: no global classic tabs in home (mode/state is modal-driven)
- View Filters: local work/act views in modal contexts
- Counters: work/material selection stats, progress counts
- Actions: activate, open work, open act builder, submit acts

### Supplier Goods
- Section Tabs: not a dedicated tab-screen role in current architecture
- View Filters: marketplace-side filters (kind/side/city/price/catalog)
- Counters: listing counts/cluster counts where shown
- Actions: marketplace search/filter/open listing flows

### Supplier Services
- Section Tabs: not a dedicated tab-screen role in current architecture
- View Filters: marketplace-side service filters
- Counters: listing/cluster metrics where shown
- Actions: marketplace search/filter/open listing flows

## 5. Layout Hierarchy
Recommended visual order:
1. Header
2. Section Tabs
3. View Filters
4. Summary/Counters
5. Content list/grid
6. Actions

Notes:
- Actions may be top-right or bottom action bars, but must remain semantically explicit.
- Counters should visually support context, not compete with controls.

## 6. Safe UI Implications
Further visual unification must preserve this separation:
- no control-semantic drift
- no interaction-contract drift
- no CTA-contract drift
- no loading/disabled semantic drift

Any integration that needs behavior rewiring moves to separate task.

## 7. Non-Goals
This spec does not:
- change code
- change screen behavior
- refactor existing control bars directly
- modify role flows
- alter routing, data-flow, approval, QR/code, supplier/marketplace, subcontract, or legacy compatibility logic

## 8. Phase Note
Current phase is visual-system stabilization.
Use neutral primitives (`StatusBadge`, `SectionBlock`) and docs-driven control semantics before any risky integration.
