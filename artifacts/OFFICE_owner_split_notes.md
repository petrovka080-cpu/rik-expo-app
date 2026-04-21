# OFFICE_OWNER_SPLIT notes

## Initial ownership map

### `app/(tabs)/office/_layout.tsx`
- Stack configuration for Office child routes.
- Safe child back orchestration for `/office/foreman` and `/office/warehouse`.
- Route-owner audit hooks and `beforeRemove` breadcrumbs.

### `app/(tabs)/office/index.tsx`
- Exact `/office` scope gating.
- Route-owner identity/focus/blur breadcrumbs.
- Reentry receipt consumption and mount/focus handoff into `OfficeHubScreen`.

### `src/screens/office/OfficeHubScreen.tsx`
- Bootstrap and focus-refresh orchestration.
- Warm-return TTL decisions.
- Developer override refresh actions.
- Office shell UI composition.
- Scroll/layout/reentry tracing wiring.

## Main risks confirmed during audit

- Route scope logic was inline in `index.tsx`, making exact `/office` activation and fallback reasoning harder to verify in isolation.
- Safe child-route resolution lived inside `_layout.tsx`, mixing stack orchestration with route decision logic.
- `OfficeHubScreen.tsx` still mixed focus-refresh decision logic, load orchestration, and final shell rendering.
- `OfficeHubScreen.tsx` carried a local `eslint-disable` for hook deps because load orchestration depended on a later hook-owned callback.

## Extracted owner boundaries

### `src/screens/office/office.route.ts`
- Owns pure Office route decisions:
- exact `/office` scope activation
- inactive scope skip reason normalization
- safe child-route classification for Office back handling

### `src/screens/office/office.reentry.ts`
- Owns pure Office reentry/focus-refresh planning:
- bootstrap pending vs inflight
- joined focus refresh
- warehouse warm-return skip path
- stale TTL refresh path

### `src/screens/office/office.layout.model.ts`
- Owns pure Office shell render-state derivation:
- loading shell model
- content shell title/subtitle rules
- company/developer-override visibility flags

### `src/screens/office/OfficeShellContent.tsx`
- Owns Office shell presenter/UI composition only:
- loading branch
- content branch
- summary/details/invites/members/company-create sections
- modal and refresh UI wiring

## What stayed in orchestrators

### `_layout.tsx`
- navigation side effects
- Android hardware back subscription
- Office stack screen registration

### `index.tsx`
- route-owner lifecycle breadcrumbs
- pending return receipt consume/clear
- exact route orchestration into `OfficeHubScreen`

### `OfficeHubScreen.tsx`
- `loadScreen(...)` async execution
- Office post-return tracing hook wiring
- developer override side effects
- router push for Office cards
- final presenter composition call

## Semantics intentionally unchanged

- Office child routes and titles remain unchanged.
- Safe back still lands on `/office` with `navigate`, then `replace` fallback.
- Reentry breadcrumbs and focus-refresh observability remain on the same contracts.
- Warehouse warm-return TTL skip behavior remains unchanged.
- Office UI sections and role access visibility stay owned by existing helpers/sections.

## Auto-fixes completed inside exact Office scope

- Removed the local `eslint-disable react-hooks/exhaustive-deps` from `OfficeHubScreen.tsx`.
- Added exact hook dependency coverage in `app/(tabs)/office/index.tsx`.
- Updated the performance budget threshold to account for the exact new Office split files and their focused src-owned regression tests.

## Residual risk intentionally left out

- `src/lib/navigation/officeReentryBreadcrumbs.ts` remains large and observability-heavy by design in this wave; it was audited but not split here to avoid broad navigation/diagnostics churn.
- No Office business-role workflow logic was changed.
- No auth, PDF, SQL/RPC, queue, or unrelated tab semantics were touched.
