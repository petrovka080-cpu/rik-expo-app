# Wave 3 Canonical Boundary

## Chosen server-owned boundary

- Boundary: `director_finance_panel_scope_v4`
- Loader: `src/lib/api/directorFinanceScope.service.ts`
- Runtime owner after cutover: **server**

## Why this boundary

- It already exposes canonical finance totals, supplier rows, object rows, spend header, diagnostics, and filters echo.
- It already carried the mature semantics used by the screen.
- The remaining risk was not missing server truth, but the client still re-projecting that truth into a second compatibility object.

## Canonical contract used by the client after cutover

Client runtime now consumes:
- `canonicalScope.summary`
- `canonicalScope.obligations`
- `canonicalScope.suppliers`
- `canonicalScope.spend`
- `canonicalScope.diagnostics`
- `canonicalScope.workInclusion`
- `finSpendSummary` from `panelScope.spend`

Client runtime no longer consumes:
- `finRep`
- `buildCompatibilityFinRep(...)`

## Thin client adapter rule after cutover

Client responsibilities:
- fetch scope
- store loading/error state
- map canonical scope to UI labels/cards/modals
- keep visual formatting and screen interaction

Client no longer owns:
- compatibility finance summary truth
- compatibility supplier debt truth
- duplicated obligations totals

## Business semantics preserved

- obligations remain invoice-level
- spend remains allocation-level
- server payload semantics unchanged
- no approval / payment / access / auth logic changed
