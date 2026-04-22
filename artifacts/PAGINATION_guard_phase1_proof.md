# PAGINATION_GUARD_PHASE_1 Proof

## Probe Result

- Inventory completed across four candidate large-read paths
- Chosen path: Office members list
- Exact files:
  - `src/screens/office/officeAccess.services.ts`
  - `src/screens/office/useOfficeMembersSection.ts`
  - `src/screens/office/officeHub.sections.tsx`
  - `src/screens/office/officeAccess.types.ts`

## Before

- `loadCompanyMembers(company)` read every `company_members` row for the company
- The same call then loaded every matching `user_profiles` row for the full member set
- There was no explicit page contract, no `hasMore`, and no bounded first-load guarantee
- The UI always assumed the first payload contained the full list

Load shape before:

- `company_members`: unbounded `N`
- `user_profiles`: up to `N`
- Total first-load row surface: unbounded `2N`

## After

- `loadOfficeMembersPage({ company, limit, offset })` is now the single members pagination boundary
- Request normalization clamps malformed input and oversized limits
- Query contract is now:
  - `.select("user_id,role,created_at", { count: "exact" })`
  - `.eq("company_id", company.id)`
  - `.order("created_at", { ascending: true })`
  - `.order("user_id", { ascending: true })`
  - `.range(offset, offset + limit - 1)`
- Bootstrap screen load returns the first page only plus `membersPagination`
- `useOfficeMembersSection` owns load-more and appends only within the members slice
- Page append de-duplicates by `userId`, so the rendered list cannot show duplicates even if a repeated row is returned

Load shape after:

- First page `company_members`: bounded to `min(N, 25)`
- First page `user_profiles`: bounded to `25`
- Total first-load row surface: bounded to `50`

## First-Page Semantics

- Current linked DB snapshot shows `company_members_max_per_company = 3`
- New first-page limit is `25`
- Therefore the current live first page still contains the full company member set for every observed company
- Existing success-path behavior on today's data stays unchanged

## Sort / Gap / Duplicate Proof

- Primary order remains `created_at ASC`
- `user_id ASC` was added only as a stable tiebreaker for equal timestamps
- No member filter semantics were changed because the path did not expose member filtering
- Focused tests prove:
  - first page stays intact
  - second page appends deterministically
  - overlapping pages do not duplicate rows
  - out-of-range pages terminate with `hasMore: false`
  - refreshed screen data resets the list to the new first page instead of keeping stale appended rows

## Regression Proof

Focused tests passed:

- `tests/office/officeMembersPagination.contract.test.ts`
- `tests/office/officeAccess.members.service.pagination.test.ts`
- `tests/office/useOfficeMembersSection.pagination.test.tsx`
- `tests/office/useOfficeHubRoleAccess.test.tsx`
- `tests/office/officeHub.extraction.test.ts`
- `src/screens/office/OfficeHubScreen.test.tsx`
- `src/screens/office/officeHubBootstrapSnapshot.test.ts`
- `src/screens/office/officePostReturnTracing.model.test.ts`
- `src/screens/office/officeAccess.services.contract.test.ts`

Compile / lint proof:

- `npx tsc --noEmit --pretty false` - PASS
- `npx expo lint` - PASS

## Unchanged Runtime Semantics

- Role assignment flow is unchanged; it still refreshes screen data through `loadScreen({ mode: "refresh" })`
- Company/invite sections were untouched
- Valid first-page Office member output is unchanged on the current dataset
- The only new runtime behavior is a scoped `Load more` control that appears when `hasMore` is true
- No sort/filter/business-permission semantics were changed
