# Role Visual Unification Spec

## 1. Purpose
Unify visual system across all role screens without changing business logic, routing, data-flow, or behavior.
This is a visual-system specification, not a logic refactor.

## 2. Scope
Roles in scope:
- Director
- Foreman
- Buyer / Снабженец
- Contractor / Подрядчик
- Supplier Goods / Поставщик товаров
- Supplier Services / Поставщик услуг
- Warehouse / Склад
- Accountant / Бухгалтер

UI scope includes:
- headers
- screen shells
- cards
- lists / rows
- buttons
- tabs / segments
- search / filter blocks
- badges / chips
- empty / loading / error states
- spacing / radius / typography / visual tokens

## 3. Core Principle
Primary rule: **change visuals, do not change logic**.

If a workaround exists in code, do not remove it for visual cleanliness until its protected behavior is understood.
Only replace with a safe equivalent preserving behavior.
If that is not possible in current visual phase, move to separate task.

## 4. Allowed in Current Visual Phase
Allowed changes:
- spacing alignment
- radius unification
- typography unification
- color system unification
- visual shell unification
- neutral shared UI primitives
- header/layout visual alignment
- search/filter visual block unification
- button and badge unification only if interaction contract is unchanged

## 5. Forbidden in Current Visual Phase
Forbidden changes:
- routing changes
- role access changes
- approve/reject/create/send flow changes
- QR/code flow changes
- contract/subcontract logic changes
- supplier flow changes
- marketplace flow changes
- warehouse ledger behavior changes
- accountant payment/act logic changes
- buyer filtering/data mapping changes
- legacy/non-UUID compatibility changes
- hidden screen rewiring
- hidden interaction changes
- implicit CTA changes
- loading/disabled semantics drift

## 6. Role-Specific Invariants

### Director
- Keep single-screen "Контроль" model.
- No drift into full role screens of other roles.

### Foreman
- Preserve object/level/system/zone context.
- Preserve request creation, history, draft/PDF flow.

### Buyer
- Preserve procurement flow, contract flow.
- Preserve supplier linkage and director approval linkage.

### Contractor
- Preserve approved subcontract visibility.
- Preserve QR/code access, execution flow, acts flow.

### Supplier Goods
- Preserve catalog, offers, pricing, availability.
- Preserve marketplace participation semantics.

### Supplier Services
- Preserve service catalog, timelines, conditions.
- Preserve marketplace participation semantics.

### Warehouse
- Preserve receiving/issue/stock/ledger behavior.

### Accountant
- Preserve payments/returns/acts/period flow.

## 7. Shared Primitives Policy
Shared components are allowed only if neutral.

Allowed neutral primitives:
- containers
- section shells
- header shells
- title/subtitle blocks
- badges
- amount blocks
- search input shells
- filter chip shells

Forbidden in visual phase:
- opinionated interactive wrappers
- default embedded press-scale effects
- embedded chevron-navigation behavior
- hidden CTA behavior
- data-aware shared components
- hidden loading/disabled contracts

## 8. Phase Model
- Phase 0 - Visual audit
- Phase 1 - Shared visual tokens
- Phase 2 - Neutral shared primitives
- Phase 3 - Role-by-role visual pass

## 9. Recommended Role Order
1. Director
2. Warehouse
3. Accountant
4. Buyer
5. Foreman
6. Contractor
7. Supplier Goods
8. Supplier Services

## 10. Review Format
For each changed file, document:
- File
- Change type
- Visual-only or behavior-affecting
- What changed
- What remained stable
- Risk
- Verdict:
  - ACCEPT FOR CURRENT VISUAL PHASE
  - MOVE TO SEPARATE TASK
  - REJECT FOR CURRENT PHASE

## 11. Acceptance Rule
A change is acceptable only if it does not:
- change interaction contract
- change CTA contract
- change loading/disabled semantics
- change navigation behavior
- change data dependencies
- require rewiring
- introduce hidden shared behavior
- change role model

## 12. Final Agent Rule
All role screens (Director, Foreman, Buyer, Contractor, Supplier Goods, Supplier Services, Warehouse, Accountant) must be unified visually only in phased manner and strictly without logic changes.
Any change affecting interaction contract, CTA contract, loading/disabled semantics, routing, data-flow, approval flows, QR/code flows, supplier/marketplace flows, subcontract logic, or legacy compatibility must not be accepted in current visual phase and must be moved to separate task or rejected.
