# AI Estimate Production Pilot Observability

## Daily Verify

Run without native builds or release actions:

```bash
npm run verify:estimate-product-pilot
```

The command checks artifact lineage, regression sentinel, product health dashboard, quality drift, support package redaction, estimator feedback workflow, real web browser smoke, and Android Chrome smoke.

## Runtime Flags

- `AI_ESTIMATE_RUNTIME_ENABLED=0` disables AI estimate generation and routes to safe manual triage.
- `AI_ESTIMATE_DISABLE_ALL=1` is the global kill switch.
- `AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING=1` blocks expanded infrastructure and industrial estimates only.
- `AI_ESTIMATE_FORCE_QUANTITY_ONLY_MODE=1` keeps rows but clears generated prices.
- `AI_ESTIMATE_DISABLE_PDF=1` blocks PDF generation in policy checks.
- `AI_ESTIMATE_DISABLE_BUYER_HANDOFF=1` blocks buyer handoff in policy checks.
- `AI_ESTIMATE_PILOT_MODE=0` removes pilot badge and PDF watermark.

## Recovery

1. Enable `AI_ESTIMATE_DISABLE_ALL=1` if pilot estimates regress.
2. Export a support package with `tsx scripts/estimate/exportEstimateSupportPackage.ts --verify`.
3. Run `tsx scripts/estimate/assertNoEstimateProductRegression.ts`.
4. If artifacts are stale, regenerate the relevant acceptance artifact before claiming green.

## Non Goals

This runbook does not start native builds, EAS, release publication, production DB writes, destructive migrations, marketplace/RFQ/warehouse/payment changes, or full Jest.
