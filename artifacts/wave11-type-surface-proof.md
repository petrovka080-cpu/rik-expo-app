**Wave 11 Proof**

- Scope stayed narrow: only generated type containment in selected hot paths.
- No DB schema, RPC contract, or business logic changes.

**Before / After**

- Direct `database.types.ts` imports before containment: `52`
- Direct `database.types.ts` imports after containment: `43`
- Hotspots contained in this wave: `9`

**Contained Hotspots**

- `src/screens/director/director.proposal.ts`
- `src/screens/director/director.data.ts`
- `src/screens/warehouse/warehouse.issue.ts`
- `src/screens/accountant/accountant.attachments.ts`
- `src/screens/contractor/hooks/useContractorPdfActions.ts`
- `src/features/market/marketHome.types.ts`
- `src/features/market/marketHome.data.ts`
- `src/features/auctions/auctions.types.ts`
- `src/components/map/mapContracts.ts`

**Boundary Rules**

- Full generated DB types stay at DB-adjacent boundaries, low-level API/repository internals, and narrow `*.db.ts` facades.
- UI screens, hooks, and feature/shared contracts should prefer `AppSupabaseClient`, `DbJson`, or domain-scoped row/view aliases.
- Runtime semantics remain unchanged because all replacements preserve the same underlying generated contract.

**Proof Commands**

```powershell
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/jest/bin/jest.js src/screens/accountant/accountant.attachments.test.ts --runInBand --json --outputFile artifacts/wave11-type-surface-jest.json
```

**Results**

- `tsc --noEmit`: passed
- `accountant.attachments.test.ts`: passed (`1` suite, `2` tests)

**Why no broader smoke was required**

- This wave changed only type aliases and compile-time import boundaries.
- No runtime branches, payload shapes, or product flow handlers changed.
- The closest affected runtime test remained green after containment.
