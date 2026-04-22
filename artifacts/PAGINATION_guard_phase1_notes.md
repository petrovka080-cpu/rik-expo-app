# PAGINATION_GUARD_PHASE_1 Notes

## Status

- Start status: `NOT GREEN`
- Wave type: one narrow pagination guard slice
- Chosen path: Office company members list

## Shortlist

- Candidate A - safe, but lower value
  - Path: `src/components/map/CatalogSearchModal.tsx`
  - Shape: catalog search already uses `.limit(60)`
  - Why not chosen: already bounded; weak scalability value for this wave

- Candidate B - blocked by contract coupling
  - Path: `src/components/foreman/WorkTypePicker.tsx`
  - Shape: reads the full `v_work_types_picker` set and builds family chips client-side
  - Why not chosen: pagination would change which top-level families appear and would risk breaking selector semantics

- Candidate C - too wide
  - Path: `src/components/map/useMapListingsQuery.ts`
  - Shape: reads active map listings and feeds the full marker surface
  - Why not chosen: marker completeness is an all-at-once map contract; pagination would change visible map semantics

- Candidate D - chosen
  - Path: `src/screens/office/officeAccess.services.ts`
  - UI boundary: `src/screens/office/useOfficeMembersSection.ts` and `src/screens/office/officeHub.sections.tsx`
  - Shape before: unbounded `company_members` read followed by unbounded `user_profiles` lookup for the same set
  - Why chosen: isolated Office-only blast radius, deterministic sort contract, focused test seams, and clear future-growth risk without cross-domain coupling

## Why This Slice

- It was the only candidate that combined real uncontrolled-read risk with a small, testable UI/data boundary.
- The first page has a clear business meaning: the current visible member list in `created_at ASC` order.
- The path already has a dedicated owner hook, so pagination state could stay inside the members boundary instead of leaking into the full screen controller.

## Scope Kept Intentionally Narrow

- No pagination rollout outside Office members
- No changes to invites, company summary, directions, map, work types, warehouse, or RPC read paths
- No business-rule changes to role assignment or access behavior
- No sort/filter redesign

## Exact Contract

- Pagination type: explicit `limit + offset`
- First page limit: `25`
- Bootstrap payload now returns:
  - `members`
  - `membersPagination { limit, nextOffset, total, hasMore }`
- Follow-up pages use the same contract through the members owner hook only

## Live Probe Context

Read-only linked DB snapshot captured on `2026-04-22`:

- `company_members_total = 8`
- `company_members_max_per_company = 3`
- `company_invites_total = 14`
- `company_invites_max_per_company = 14`
- `market_listings_map_active_total = 20`
- `work_types_picker_total = 173`
- `wh_ledger_total = 252`

This means the current live Office dataset is still below the new first-page limit, so the wave hardens future growth without changing today's first-page output.
