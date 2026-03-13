# Contractor Architecture Audit

Date: 2026-03-06
Scope: `src/screens/contractor/*` and `app/(tabs)/contractor.tsx`
Goal: stabilize modular boundaries without changing business logic.

## 1) Current module map

### Screen shell
- `app/(tabs)/contractor.tsx`
Role: screen composition + orchestration glue.
Must contain: route-level state wiring, callbacks to services, modal open/close state.
Must not contain: domain calculations, payload building, SQL details.

### Domain/data mapping
- `contractor.rows.ts`
Role: linking rows with approved subcontracts, visibility filtering, synthetic rows.
- `contractor.viewModels.ts`
Role: card-level view-model building for list rendering.
- `contractor.status.ts`
Role: status predicates.
- `contractor.utils.ts`
Role: generic stateless helpers (normalize/guards/date/string/debounce).
- `types.ts`
Role: shared contractor domain types.

### Infra/data access
- `contractor.data.ts`
Role: Supabase reads for work/material/summary/log datasets.
- `contractor.resolvers.ts`
Role: ID resolution for request/job (query-level lookup helpers).

### Orchestration/services
- `contractor.loadWorksService.ts`
Role: map + enrich `v_works_fact` to normalized row model.
- `contractor.openCard.ts`
Role: resolve card click target row from unified card sources.
- `contractor.search.ts`
Role: search-response mapping for work materials.
- `contractor.workModalService.ts`
Role: data loading for work modal sections.
- `contractor.workModalBootstrap.ts`
Role: single-entry work-modal bootstrap (header/log/stages/materials/issued).
- `contractor.progressService.ts`
Role: work fact/progress submit path.
- `contractor.submitHelpers.ts`
Role: pure payload/warnings building for act submit.
- `contractor.actSubmitService.ts`
Role: act persistence orchestration.

### Act/PDF
- `contractor.actBuilder.ts`
Role: act-builder row/material shaping and scope resolution.
- `contractor.actBuilderReducer.ts`
Role: act-builder local state transitions.
- `contractor.pdfService.ts`
Role: PDF entrypoints for screen actions.
- `contractorPdf.ts`
Role: PDF document generation implementation.

### UI components/styles
- `components/*`
Role: presentational components and modal section UI.
- `contractor.styles.ts`
Role: screen/style constants.

## 2) Boundary violations to remove next

1. `contractor.tsx` still owns too much async orchestration.
Action: move remaining load/open/submit flows into one controller hook/service.

2. `contractor.utils.ts` is mixed utility bucket.
Action: split by responsibility when touching:
- `contractor.formatters.ts`
- `contractor.guards.ts`
- `contractor.normalizers.ts`

3. Work-modal flow has dual service layers (`workModalService` + `workModalBootstrap`) with partial overlap risk.
Action: keep bootstrap as only public orchestrator; lower-level service only for isolated fetch units.

4. PDF naming is ambiguous (`contractor.pdfService.ts` vs `contractorPdf.ts`).
Action: rename in next pass for explicit layering:
- `contractor.pdfData.ts` (optional)
- `contractor.pdfTemplate.ts` (optional)
- `contractor.pdfExport.ts`

## 3) Source-of-truth matrix

- Approved subcontract visibility rules: `contractor.rows.ts`
- Contractor card title/object/work projection: `contractor.viewModels.ts`
- Work/material availability aggregates: `contractor.data.ts`
- Act submit payload and warnings: `contractor.submitHelpers.ts`
- Act persistence transaction: `contractor.actSubmitService.ts`
- Work-modal bootstrap readiness: `contractor.workModalBootstrap.ts`

Rule: each domain rule must have one source-of-truth file only.

## 4) Refactor order (safe, no business-logic change)

1. Extract `useContractorScreenController` from `contractor.tsx`.
2. Move all non-UI async flows behind controller methods:
- `loadScreen`
- `openCard`
- `openWorkModal`
- `openActBuilder`
- `submitProgress`
- `submitAct`
- `generatePdf`
3. Keep components dumb: render only, no fetching/derivation logic.
4. Split `contractor.utils.ts` by domain.
5. Normalize PDF layer naming and explicit dependencies.

## 5) Acceptance criteria for architecture pass

- `contractor.tsx` reduced to screen composition and event wiring.
- No duplicated business rules across `rows/viewModels/submitHelpers`.
- Services do not import UI components.
- Components do not call Supabase directly.
- One flow owner per async scenario (screen load, work modal bootstrap, act submit).

