# Phase Roadmap After Style-Pass

**File:** `docs/follow-up/phase-roadmap-after-style-pass.md`

## Purpose

This roadmap defines the **safe sequence of post-style-pass work**.
Goal is to avoid mixing:

- UI primitives
- screen interaction changes
- feature rewiring
- data-layer refactors

Each phase has **entry criteria**, **scope**, and **exit criteria**.

---

# Phase 1 - UI Primitives Stabilization

### Goal

Introduce reusable UI primitives **without changing screen behavior**.

### Scope

Components like:

- `AppRoleCard.tsx`
- potential shared UI wrappers
- visual card containers
- badge/amount presentation blocks

### Rules

UI primitives **must remain presentation-oriented**.

Allowed:

- layout
- typography
- colors
- visual shells
- optional icons

Not allowed:

- navigation logic
- data fetching
- implicit interaction contracts
- hidden behavioral changes

### Entry Criteria

- Style-pass completed
- No active screen rewiring
- Components introduced as **optional primitives**

### Exit Criteria

- Primitive APIs documented
- Interaction contract defined
- Safe usage boundaries written

---

# Phase 2 - Director Interaction Refactor

### Goal

Stabilize interaction model of the **Director "Контроль" screen**.

### Files in Scope

- `DirectorProposalRow.tsx`
- `DirectorDashboard.tsx`

### Focus

Review and refine:

- press contract
- CTA clarity
- loading affordances
- disabled states
- iconography hierarchy

### Important Constraint

Director screen must preserve the **single-screen control model**:

```text
Контроль
 ├ Заявки
 ├ Финансы
 ├ Склад
 └ Отчёты
```

No navigation drift into role screens.

### Entry Criteria

- UI primitives stabilized
- No dependency on unfinished shared components

### Exit Criteria

- Interaction model documented
- Director screen behavior stable

---

# Phase 3 - Buyer Screen Cleanup

### Goal

Improve Buyer screen architecture **without altering business logic**.

### Files in Scope

- `BuyerSearchBar.tsx`
- `app/(tabs)/buyer.tsx`
- `useBuyerRequestLabels.ts`

### Focus

- isolate UI blocks
- simplify rendering
- remove inline UI duplication
- keep request flow unchanged

### Explicit Rule

Buyer business logic must **not be modified**.

### Entry Criteria

- Director screen stabilized
- No data-layer changes

### Exit Criteria

- Buyer UI structure simplified
- Hooks contracts documented

---

# Phase 4 - Data-Layer Modernization

### Goal

Refactor data layer **with full awareness of legacy compatibility**.

### Files in Scope

Examples:

- `buyer.ts`
- API adapters
- legacy compatibility layers

### Risks

Data-layer changes can affect:

- UUID compatibility
- legacy ID mapping
- request history
- warehouse/material flows

### Requirements

Changes must include:

- migration notes
- backward compatibility
- clear rollback strategy

### Entry Criteria

- UI layers stabilized
- no active screen rewiring

### Exit Criteria

- data contracts documented
- legacy compatibility verified

---

# General Engineering Rules

1. **Never mix phases in a single PR.**
2. Behavior changes must not be hidden inside UI commits.
3. Screen rewiring must not be mixed with data-layer refactors.
4. Each phase should produce **clear documentation and stable APIs**.
