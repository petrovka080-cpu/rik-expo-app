# Director Canonical Fact Proof

- Old primary-compatible parity source: `director_finance_panel_scope_v3`
- New canonical source: `director_finance_panel_scope_v4`
- Primary screen loader: `loadDirectorFinanceScreenScope()` from `src/lib/api/directorFinanceScope.service.ts`
- Client adapter: `adaptDirectorFinancePanelScopeV4Payload()` from `src/screens/director/director.finance.shared.ts`

## What changed

- Supplier summaries, object summaries, grouped totals, and paid/outstanding aggregates now come from the server-owned canonical payload under `canonical`.
- The primary director finance path now loads `rpc_v4` without support-row composition in the main truth path.
- RN compatibility is preserved by the v4 adapter without re-aggregating finance truth on the client.

## Why this is safer

- The primary screen no longer depends on client-owned finance composition.
- Stable object grouping comes from `request_object_identity_scope_v1` via `director_finance_panel_scope_v4`.
- Legacy `v3` remains only for parity verification and compatibility proof, not as primary owner truth.
- Legacy `v3` object grouping did not expose stable object refs on row payloads, so object parity is gated against legacy header totals plus canonical object rollup coverage.

## Conscious non-changes

- No director UI rewrite.
- No request/proposal/accountant lifecycle changes.
- No new fallback-heavy client truth paths.

## Gate

- safeSwitchVerdict: `true`
- supportRowsLoaded: `false`
- sourceMeta.panelScope: `rpc_v4`
- summaryCompatibilityOverlay: `false`
