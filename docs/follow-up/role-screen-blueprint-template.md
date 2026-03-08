# Role Screen Blueprint Template (Read-Only)

## Purpose
This template defines a reusable composition blueprint for all role screens to support safe visual unification without behavior changes.

This document is a planning artifact only:
- does not change current screens
- does not trigger refactor
- does not alter routing/state/data-flow

## Standard Role-Screen Zones

### 1. Header Zone
Purpose:
- screen title/subtitle
- role context identity
- top-level passive info

Safe visual scope:
- spacing, typography, visual shell, icon alignment

Logic-bound scope:
- role-specific actions, navigation callbacks, state-driven title switching

Can be unified:
- header padding/rhythm, title/subtitle styles, neutral container shell

Must not be touched in visual phase:
- routing actions, tab-mode switching logic, role access behavior

### 2. Top Actions Zone
Purpose:
- high-level mode selectors or role-local quick entries

Safe visual scope:
- button geometry, spacing, visual grouping

Logic-bound scope:
- mode selection behavior, guards/permissions, branch switching

Can be unified:
- neutral action-row shell, visual hierarchy for primary vs secondary

Must not be touched in visual phase:
- action handlers, mode semantics, enabled/disabled rules

### 3. Section Tabs Zone
Purpose:
- navigation inside current screen between major sections

Safe visual scope:
- tab sizing, radius, typography, active/inactive styling

Logic-bound scope:
- selected section state, tab routing within screen

Can be unified:
- neutral segmented/tabs shell

Must not be touched in visual phase:
- tab meaning, section wiring, navigation contract

### 4. Filters Zone
Purpose:
- filter current content view/state

Safe visual scope:
- chips/buttons style, spacing, wrapping, label text style

Logic-bound scope:
- filter predicates, query params, state transitions

Can be unified:
- neutral filter bar shell and chip visuals

Must not be touched in visual phase:
- filter logic, default filter behavior, data dependencies

### 5. Work/Context Zone
Purpose:
- scoped context inputs or selected context summary (object/level/system/zone etc.)

Safe visual scope:
- field labels, wrapper spacing, neutral section framing

Logic-bound scope:
- validation, canonical dictionaries, derived context, dependency resets

Can be unified:
- field block shells, section headings, helper text styles

Must not be touched in visual phase:
- object/level/system/zone flow, validation contracts, context adapters

### 6. Summary/Counters Zone
Purpose:
- compact informational metrics (counts, totals, state summaries)

Safe visual scope:
- badge/counter presentation, spacing, typography emphasis

Logic-bound scope:
- computation source, aggregation, status derivation

Can be unified:
- neutral counter row shell, StatusBadge usage where already safe

Must not be touched in visual phase:
- metric formulas, status derivation rules, data mapping

### 7. Content Zone
Purpose:
- main list/grid/cards and row-level information

Safe visual scope:
- row/card shell styling, type scale, neutral spacing

Logic-bound scope:
- row actions, list rendering branches, data transforms, paging/virtualization

Can be unified:
- neutral visual wrappers and text hierarchy

Must not be touched in visual phase:
- list structure semantics, interaction contract, conditional rendering logic

### 8. Bottom CTA Zone
Purpose:
- explicit main action area for the screen

Safe visual scope:
- button shell, spacing to safe area, visual prominence

Logic-bound scope:
- CTA semantics, handler wiring, loading/disabled behavior

Can be unified:
- neutral bottom action container, Primary/Secondary button visual rhythm

Must not be touched in visual phase:
- action meaning, loading/disabled contract, CTA routing/flow

### 9. Modal / Overlay Zone
Purpose:
- context dialogs, history sheets, draft previews, pickers

Safe visual scope:
- modal shell, header/footer spacing, typography, passive visual polish

Logic-bound scope:
- open/close triggers, submission flows, async side effects, guard checks

Can be unified:
- neutral modal framing patterns

Must not be touched in visual phase:
- modal flow logic, confirmation semantics, data mutations

## Safe Visual Layers (Global)
Reusable in visual phase:
- spacing/radius/typography token alignment
- section titles and neutral wrappers
- status/counter badge visuals
- non-interactive shell components
- passive visual hierarchy cleanup

## Logic-Bound Layers (Global)
Do not modify in visual phase:
- request creation and submit flows
- draft flows
- PDF/share flows
- object/level/system/zone context logic
- approval workflows
- QR/code workflows
- supplier/marketplace workflows
- accounting/warehouse operational state logic

## Role Mapping (Template Application)

### Director
- Strong emphasis: Section Tabs, Filters, Counters, Content
- Preserve: single-screen control model and role boundaries

### Foreman
- Strong emphasis: Work/Context, Content, Bottom CTA, Modal flows
- Preserve: object/level/system/zone, draft, history, PDF flows

### Buyer
- Strong emphasis: Filters, Content, Bottom CTA, supplier linkage context
- Preserve: procurement and approval-linked behavior

### Warehouse
- Strong emphasis: Section Tabs, Counters, Content, Bottom CTA
- Preserve: receiving/issue/ledger behavior

### Accountant
- Strong emphasis: Filters, Counters, Content, Bottom CTA, period controls
- Preserve: payment/return/acts semantics

### Contractor
- Strong emphasis: Content, status indicators, action area, overlays
- Preserve: subcontract execution and access flows

### Supplier Goods
- Strong emphasis: Content/catalog, filters, action area
- Preserve: offers/prices/availability marketplace semantics

### Supplier Services
- Strong emphasis: Content/services, filters, action area
- Preserve: timelines/conditions marketplace semantics

## Template Usage Rule
This blueprint template is mandatory guidance for future safe visual work.
It:
- standardizes composition zones
- accelerates per-role UI pass
- reduces accidental behavior drift

It does not:
- modify existing code
- force immediate migration
- approve mixed visual+logic refactors

## Phase Note
Apply this template only through controlled, minimal patches with explicit review verdicts:
- ACCEPT FOR CURRENT VISUAL PHASE
- MOVE TO SEPARATE TASK
- REJECT FOR CURRENT PHASE
