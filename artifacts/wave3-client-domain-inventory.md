# Wave 3 Client Domain Inventory

## In scope

### `src/lib/api/directorFinanceScope.service.ts`
- Domain zone: director finance panel.
- Client-owned logic before this wave:
  - built compatibility `finRep` from canonical server scope;
  - returned both canonical truth and legacy client-shaped truth to runtime consumers.
- Classification:
  - `canonicalScope` is server-owned truth.
  - `finRep` compatibility projection was client-owned domain duplication and should not remain in the live runtime path.
- Decision:
  - keep `director_finance_panel_scope_v4` as canonical server boundary;
  - remove `finRep` from the live runtime contract.

### `src/screens/director/useDirectorScreenController.ts`
- Domain zone: director finance screen orchestration.
- Client-owned logic before this wave:
  - stored `finRep` alongside canonical scope and pushed both into the screen tree.
- Classification:
  - orchestration should stay on client;
  - duplicated finance truth should not.
- Decision:
  - controller keeps only canonical `finScope` and server spend summary.

### `src/screens/director/DirectorFinanceContent.tsx`
- Domain zone: director finance home/debt/spend display.
- Client-owned logic before this wave:
  - home cards and modals could fall back from canonical values to `finRep`.
- Classification:
  - display formatting may stay on client;
  - fallback to duplicated totals/supplier debt truth should not.
- Decision:
  - use only canonical scope for obligations/supplier truth;
  - keep spend kind rows from server-owned `finSpendSummary`.

### `src/screens/director/DirectorFinanceDebtModal.tsx`
- Domain zone: debt modal display.
- Client-owned logic before this wave:
  - supplier debt list and summary counters came from `finRep`.
- Classification:
  - supplier debt list is canonical domain truth and should come from server-owned scope.
- Decision:
  - map modal rows from `canonicalScope.suppliers` and `canonicalScope.summary`.

### `src/screens/director/DirectorFinanceSpendModal.tsx`
- Domain zone: spend modal display.
- Client-owned logic before this wave:
  - accepted legacy `sum` prop even though spend truth already came from server scope.
- Classification:
  - server-owned spend summary header is canonical;
  - legacy `sum` prop is dead compatibility surface.
- Decision:
  - remove `sum` prop from runtime path.

## Explicitly out of scope for this wave

### `src/screens/director/director.finance.compute.ts`
- Still contains legacy client computations:
  - `computeFinanceRep`
  - `computeFinanceSpendSummary`
  - `computeFinanceSupplierPanel`
  - `computeFinanceByKind`
- Current status:
  - no longer part of the live director finance screen runtime path after this cutover;
  - retained for parity verification and adjacent legacy helpers, not migrated wholesale in this wave.

### Other domains not touched
- buyer
- warehouse
- reports rewrite outside director finance scope
- backend semantics and SQL contracts outside `director_finance_panel_scope_v4`

## Migration scope chosen

One canonical domain boundary only:
- **Director finance panel canonicalization via `director_finance_panel_scope_v4`**

This wave intentionally did not spread into multiple domains.
