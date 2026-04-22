# STRICT_NULLCHECKS_PHASE_4 Notes

## Shortlist probe

- Candidate A: `src/lib/catalog/catalog.transport.ts`
  - Result: 4 local strict-null blockers only
  - Verdict: chosen for phase 4
- Candidate B: `app/pdf-viewer.tsx`
  - Result: 3 local blockers only
  - Verdict: locally isolated, but rejected because it is a higher-risk viewer entry path than the catalog transport boundary
- Candidate C: `src/screens/office/officeHub.sections.tsx`
  - Result: strict-null probe also pulled `src/screens/profile/profile.services.ts`
  - Verdict: blocked by cross-owner dependency
- Candidate D: `src/screens/foreman/foreman.manualRecovery.model.ts`
  - Result: strict-null probe also pulled:
    - `src/screens/foreman/foreman.localDraft.ts`
    - `src/lib/catalog/catalog.transport.ts`
    - `src/lib/api/buyer.ts`
    - `src/lib/api/director.ts`
    - `src/lib/pdf/directorSupplierSummary.shared.ts`
  - Verdict: too wide for phase 4
- Candidate E: `src/lib/offline/mutationQueue.ts`
  - Result: broad blocker surface across offline and adjacent domains
  - Verdict: too wide and too risky for a narrow phase slice

## Chosen slice

- `src/lib/catalog/catalog.transport.ts`

## Why this slice was chosen

- The blocker class was local to the transport boundary.
- The fix did not require cross-domain rollout into UI, auth, offline, or release tooling.
- Existing catalog service tests already covered the successful consumer contract.
- The nullable risk was infrastructure-shaped:
  - typed Supabase select rows exposed nullable DB fields
  - the transport layer was promising normalized domain rows too early

## Exact blocker class

- `loadCatalogGroupsRows`
  - raw select rows could carry nullable required fields
- `loadUomRows`
  - raw select rows could carry nullable required fields
- `loadIncomingItemRows`
  - raw select rows could carry nullable ids and numeric fields
- `runSuppliersListRpc`
  - omitted search arg was still typed as nullable instead of omitted optional RPC payload

## Exact fix

- Added one local pure helper module:
  - `src/lib/catalog/catalog.transport.normalize.ts`
- Explicitly normalized transport rows before returning domain-typed arrays:
  - `normalizeCatalogGroupRows`
  - `normalizeUomRows`
  - `normalizeIncomingItemRows`
- Explicitly normalized optional RPC payload shaping:
  - `normalizeSuppliersListRpcArgs`

## Intentionally out of scope

- no global `strictNullChecks`
- no `catalog.lookup.service.ts` redesign
- no viewer, office, foreman, or offline nullable rollout
- no SQL/RPC semantic changes
- no UI or business-logic changes
