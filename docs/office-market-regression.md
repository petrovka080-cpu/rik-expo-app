# Office Market Regression Harness

Run `npm run ci:office-market` after focused changes that can affect office,
market, PDF, media, role routing, or request status handoff behavior.

## What It Covers

- Foreman subcontracts use `ProfessionalEstimateComposer` and do not return to
  the legacy picker path.
- Director request, lifecycle, realtime refresh, and PDF contracts.
- Buyer procurement, full item visibility, ready-options, and accounting modal
  contracts.
- Office auth, route scope, warehouse child route, and downstream role access.
- Consumer repair no-hooks and sticky action/capture contracts.
- Market media/listing contracts.
- Platform-visible markers and hotspot contracts that previously regressed
  during office/market repair work.

## What It Does Not Cover

- Native builds, EAS, App Store/TestFlight, or release verification.
- Full Jest coverage for unrelated domains.
- Live Supabase business acceptance with real role credentials.
- Screenshots, proof markdown, or tracked runtime artifacts.

## Adding A Suite

Add the path to `scripts/ci/officeMarketRegressionManifest.ts` with a clear
`owner`, `coverage` key, and `required` policy. Directory paths may be optional
so older branches can report `SKIPPED_MISSING_SUITE`. Point files that encode a
platform contract should be required.

## When It Fails

Treat the first failed suite as the local root-cause pointer. Fix that product
or contract issue, then rerun only `npm run ci:office-market` before broader
checks. Do not jump straight to full Jest for every UI fix.

## Product Failure Vs Stale Contract

A product failure means the user-visible office/market behavior is wrong or a
role boundary is unsafe. A stale contract means the test still asserts a removed
implementation detail while the product behavior remains correct. Update stale
contracts narrowly and keep the manifest coverage key intact.

## Impact Map

`scripts/ci/impact-map.ts` marks office-market impact when changed files touch:

- `src/screens/director/**`
- `src/screens/buyer/**`
- `src/screens/foreman/**`
- `src/features/consumerRepair/**`
- `src/features/market/**`
- `src/lib/pdf/**`
- `src/lib/api/buyer.ts`
- `src/lib/api/requests.status.ts`

When affected, the required command is `npm run ci:office-market`.
