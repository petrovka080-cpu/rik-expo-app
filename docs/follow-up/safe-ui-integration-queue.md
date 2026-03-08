# Safe UI Integration Queue (Read-Only Governance)

## Purpose
This document defines an executable queue of safe UI micro-integrations for role screens.

It explicitly does **not** allow:
- mass refactor
- batch visual pass across multiple screens
- mixed visual + behavior patches

It allows only controlled, reversible, reviewable micro-patches.

## Scope Rules
- One patch = one role target
- One patch = one file
- One patch = one integration point
- One patch = one primitive
- Minimal diff only

If scope expands, stop and move to separate task.

## Task Template (Mandatory)
Use this template for every micro-patch:

- **Role:**
- **Screen/File:**
- **Zone:**
- **Slot type:**
- **Primitive:**
- **Change type:**
- **Risk level:** (low/medium/high)
- **Why safe:**
- **Forbidden touch points:**
- **Expected diff size:**
- **Accept criteria:**
- **Stop conditions:**

## Example Task Card
- **Role:** Accountant
- **Zone:** Summary/status
- **Slot:** read-only badge slot
- **Primitive:** `StatusBadge`
- **Risk:** low
- **Expected diff:** 1 file, 2-5 insertions, 1-3 deletions
- **Forbidden:** layout changes, wrapper insertion, conditional changes, CTA changes

## Priority Queue (Conservative)

### 1) Accountant
- Target: one read-only status badge slot
- Primitive: `StatusBadge`
- Risk: low
- Constraint: no row/layout/condition changes

### 2) Buyer
- Target: one static section wrapper in safe non-dynamic block
- Primitive: `SectionBlock`
- Risk: low/medium
- Constraint: no list container wrapping

### 3) Warehouse
- Target: one ultra-small passive status/counter replacement
- Primitive: `StatusBadge`
- Risk: low/medium
- Constraint: no header hierarchy changes

### 4) Foreman
- Target: read-only status token only if zero structure change
- Primitive: `StatusBadge`
- Risk: medium
- Constraint: no 4-input context flow touch

### 5) Contractor
- Target: only after separate review gate
- Primitive: TBD (likely StatusBadge first)
- Risk: medium/high
- Constraint: keep subcontract/QR flow untouched

### 6) Director
- Status: blocked until later phase
- Reason: high interaction sensitivity

## Blocked Components (Until Later Phase)
- `AppRoleCard`
- `PrimaryButton`
- `ScreenHeader`
- `ListRow`
- tab trigger shells
- draft footers
- CTA containers
- navigation cards

## Integration Rules
One micro-patch must satisfy all:
- 1 file
- 1 slot
- 1 primitive
- minimal diff
- no layout drift
- no interaction drift

If diff expands beyond micro scope:
- stop patch
- mark as separate task

## Acceptance Contract (Per Patch)
Patch accepted only if:
- logic unchanged
- routing unchanged
- state/data-flow unchanged
- interaction unchanged
- layout contract unchanged
- scroll behavior unchanged
- `tsc` passes
- diff is small and reviewable

## Stop Rules (Hard)
Stop immediately if patch requires:
- wrapper hierarchy changes
- spacing contract changes
- conditional rendering order changes
- row structure changes
- tab shell changes
- CTA shell changes

## Suggested Execution Ladder
- **Phase Q1:** StatusBadge only
- **Phase Q2:** SectionBlock only
- **Phase Q3:** passive typography normalization
- **Phase Q4:** later controlled CTA phase

Additional guard:
- Director and `AppRoleCard` remain blocked until separate approved phase.

## Operational Note
Every executed micro-patch must be logged with:
- verdict (`ACCEPT` / `MOVE TO SEPARATE TASK` / `REJECT`)
- exact file path
- diff size
- risk outcome
