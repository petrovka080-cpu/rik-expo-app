# A6.3b Foreman Copy Hygiene Notes

Status: GREEN candidate

## Risk

Foreman PDF/subcontract paths still had mojibake in user-facing copy:

- request PDF descriptor title
- subcontract draft PDF descriptor title
- subcontract request history PDF descriptor title
- subcontract Excel placeholder alert

This does not change business behavior, but it weakens supportability and user trust during document/export flows.

## Fix Scope

Changed only Foreman copy surfaces and focused tests:

- `src/screens/foreman/useForemanScreenController.ts`
- `src/screens/foreman/hooks/useForemanSubcontractController.tsx`
- `src/screens/foreman/useForemanScreenController.test.tsx`
- `src/screens/foreman/ForemanSubcontractPdfGuard.test.ts`

## Production-Safe Contract

- PDF/open flow remains unchanged.
- Descriptor factory usage remains lazy.
- Modal close/navigation behavior remains unchanged.
- Business data, formulas, totals, grouping, queue/recovery semantics, and viewer behavior are unchanged.
- Tests now assert readable Russian copy in touched PDF/export paths.

## What Did Not Change

- Foreman draft ownership semantics
- Offline queue/retry behavior
- Request/subcontract PDF template semantics
- PDF viewer routing
- Any non-Foreman screen
