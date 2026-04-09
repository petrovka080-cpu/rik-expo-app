# Wave 3 Parity Proof

## Goal

Prove that removing client-owned compatibility `finRep` from the live director finance runtime path did **not** change product math or visible semantics for the migrated scope.

## Automated parity checks

### `src/lib/api/directorFinanceScope.service.test.ts`
Verifies backend-owned canonical scope remains the primary owner and preserves representative finance values:
- `canonicalScope.obligations.approved = 1000`
- `canonicalScope.obligations.debt = 300`
- canonical supplier row includes:
  - `supplierName = "Supplier A"`
  - `approvedTotal = 1000`
  - `debtTotal = 300`
- cutover metadata stays:
  - `primaryOwner = rpc_v4`
  - `backendFirstPrimary = true`
  - `summaryCompatibilityOverlay = false`

This proves the server-owned summary and supplier truth remain intact after removing `finRep`.

### `src/screens/director/DirectorFinanceContent.wave3.test.tsx`
Verifies live UI consumers now read canonical values directly:
- home debt card renders canonical obligations totals
- home spend card renders canonical spend totals
- debt modal renders canonical supplier debt rows

Representative assertions:
- approved obligations `1200`
- debt obligations `300`
- spend approved `777`
- spend to pay `222`
- supplier row shows `Supplier Canonical`

## Structural parity evidence

`rg -n "finRep|buildCompatibilityFinRep|EMPTY_FIN_REP" src app scripts`
- no live runtime references remain after cutover

This proves the old compatibility truth is no longer an active owner in the migrated runtime path.

## Parity statement

For the migrated director finance panel scope:
- old client compatibility projection was removed;
- displayed totals and supplier debt truth still match the canonical server contract;
- product math/semantics were preserved.
