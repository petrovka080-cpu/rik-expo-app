# Contractor Typing Hardening Audit

Date: 2026-03-06
Scope: `app/(tabs)/contractor.tsx`, `src/screens/contractor/*`
Constraint: no business-logic change.

## 1) What was found (priority view)

High-risk clusters:
- Screen-level orchestration casts in `contractor.tsx` (`as any` across service boundaries).
- Service boundary weak typing in `contractor.loadWorksService.ts` and modal controller chain.
- Legacy Supabase payload casts (`from("... " as any)` and response array casts).

Main categories:
- `as any` at screen-service call boundaries.
- `as any` in raw DB response mapping.
- weak callback/input typing (controller inputs, item render callbacks).
- component prop `styles: any` (left for dedicated UI typing pass).

## 2) Safe cleanup performed now

1. Added explicit domain export types in load service:
- `ContractorWorkRow`
- `ContractorSubcontractCard`
File: `src/screens/contractor/contractor.loadWorksService.ts`

2. Switched screen aliases to shared types:
- `type WorkRow = ContractorWorkRow`
- `type SubcontractLite = ContractorSubcontractCard`
File: `app/(tabs)/contractor.tsx`

3. Removed unsafe screen casts for list state updates:
- `setSubcontractCards(bundle.subcontractCards as any)` -> typed assignment
- `setRows(bundle.rows as WorkRow[])` -> typed assignment
File: `app/(tabs)/contractor.tsx`

4. Hardened modal controller contract:
- Introduced `WorkModalControllerRow`
- Removed `row as any` and resolver cast chaining
File: `src/screens/contractor/contractor.workModalController.ts`

5. Removed redundant array casts from issued refresh:
- `setIssuedItems(data.issuedItems as IssuedItemRow[])` -> typed assignment
- `setLinkedReqCards(data.linkedReqCards as LinkedReqCard[])` -> typed assignment
File: `app/(tabs)/contractor.tsx`

## 3) What remains (intentional, next pass)

A. Supabase SDK cast layer (technical debt, localized):
- `.from("table" as any)` and result casts in data-access files.
Reason: typed table schema not yet wired in project-wide Supabase generics.

B. Some screen call-site casts still present:
- bootstrap/submit/open-card/view-model integration points.
Reason: heterogeneous raw/domain DTO contracts still being normalized.

C. UI components style props typed as `any`:
- several contractor components accept style bag as `any`.
Reason: requires coordinated style prop contract extraction; safe but larger pass.

## 4) Why business logic is unchanged

- No status rules changed.
- No visibility/approval lifecycle changed.
- No calculation formulas changed (`issued/used/available`, act totals, submit semantics).
- Only type contracts and data-flow surfaces were tightened.

## 5) Verification

- Type check passed: `npx tsc --noEmit`.
- Runtime flow not altered by control-branch edits (only typing and boundary cleanup).

