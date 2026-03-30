# Director Fact Contract Map

## Scope

Wave 1E covers the director finance truth-path only. The selected family is the director finance panel path consumed by `loadDirectorFinanceScreenScope()` in [directorFinanceScope.service.ts](/c:/dev/rik-expo-app/src/lib/api/directorFinanceScope.service.ts).

## Source Entities

- `public.list_accountant_inbox_fact(null)`
  Current invoice/proposal-level finance source rows used for obligations and paid/outstanding truth.
- `public.v_director_finance_spend_kinds_v3`
  Allocation-level spend source used for spend header and spend kind rows.
- `public.request_object_identity_scope_v1`
  Stable request-to-construction-object identity mapping used for object grouping.
- `public.proposal_items`
  Proposal-to-request chain linkage for request recovery in the finance panel scope.
- `public.request_items`
  Request chain linkage for proposal/request identity stitching.
- `public.requests`
  Legacy request object ref fallback for finance identity enrichment.
- `public.purchases`
  Legacy supplier/object fallback enrichment retained only as controlled compatibility input inside the server read model.

## Canonical Source

- Primary canonical source: `public.director_finance_panel_scope_v4(...)`
  Defined in [20260330234500_director_canonical_fact_read_model_v1.sql](/c:/dev/rik-expo-app/supabase/migrations/20260330234500_director_canonical_fact_read_model_v1.sql).
- Client RPC entrypoint: `fetchDirectorFinancePanelScopeV4ViaRpc()` in [director.finance.rpc.ts](/c:/dev/rik-expo-app/src/screens/director/director.finance.rpc.ts).
- Primary screen loader: `loadDirectorFinancePrimaryScope()` and `loadDirectorFinanceScreenScope()` in [directorFinanceScope.service.ts](/c:/dev/rik-expo-app/src/lib/api/directorFinanceScope.service.ts).
- RN adapter: `adaptDirectorFinancePanelScopeV4Payload()` in [director.finance.shared.ts](/c:/dev/rik-expo-app/src/screens/director/director.finance.shared.ts).

## Derived Aggregates Now Owned By Server

- Finance grouped totals
  Source path: `canonical.summary.*`
  Fields: `approvedTotal`, `paidTotal`, `debtTotal`, `overpaymentTotal`, `overdueAmount`, `criticalAmount`, `debtCount`, `partialCount`.
- Supplier summaries
  Source path: `canonical.suppliers[]`
  Fields: supplier identity, approved/paid/debt/overpayment, invoice count, overdue/critical counts and amounts.
- Object summaries
  Source path: `canonical.objects[]`
  Fields: stable object grouping key, object ref, approved/paid/debt/overpayment, invoice count, overdue/critical counts and amounts.
- Spend aggregates
  Source path: `spend.header`, `spend.kindRows`, `spend.overpaySuppliers`
  Purpose: allocation-level spend panel remains server-owned and transport-ready.

## Downstream UI Consumers

- Director finance screen canonical loader
  [directorFinanceScope.service.ts](/c:/dev/rik-expo-app/src/lib/api/directorFinanceScope.service.ts)
- Director finance transport types
  [director.finance.types.ts](/c:/dev/rik-expo-app/src/screens/director/director.finance.types.ts)
- Director finance read-model diagnostics
  [director.readModels.ts](/c:/dev/rik-expo-app/src/screens/director/director.readModels.ts)
- AI assistant finance grounding compatibility consumer
  [assistantScopeContext.ts](/c:/dev/rik-expo-app/src/features/ai/assistantScopeContext.ts)

## Fallback Demotion Notes

- `director_finance_panel_scope_v3`
  Retained only for parity verification and compatibility proof. It is no longer the primary owner truth-path for the director finance screen.
- Legacy support rows
  `financeRows` and `spendRows` are no longer loaded in the primary finance path for the screen scope. `supportRowsLoaded` must remain `false` in the primary gate.
- Client-side aggregation
  The client still adapts payload shape for RN compatibility, but no longer owns supplier/object/summary aggregation as primary truth.

## Known Limitations

- Legacy `v3` remains available for parity compare until Wave 1E proof is complete in production rollout.
- Compatibility summary/report fields are still exposed in the v4 payload for RN stability, but they are derived from `canonical.*` inside the adapter and are not a second source of truth.
