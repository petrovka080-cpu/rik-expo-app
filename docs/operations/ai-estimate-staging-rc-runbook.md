# AI Estimate Staging RC Runbook

This runbook is for the staging release candidate operations seal only. It does not approve production release, public beta, marketplace, RFQ, warehouse mutation, payment, native build, EAS, TestFlight, or owner approval.

## Source SHA

1. Get local source: `git rev-parse HEAD`.
2. Check staging: `npx tsx scripts/e2e/checkStagingVersionLineage.ts --url=https://rik-expo-app-staging.onrender.com`.
3. Green is allowed only when `staging_source_sha_matches_head=true`, `staging_runtime_is_staging=true`, and `staging_catalog_version_matches_11610=true`.

## Health

Run:

```bash
npx tsx scripts/e2e/checkAiEstimateStagingHealth.ts --url=https://rik-expo-app-staging.onrender.com
```

Required probes are `/`, `/request`, `/api/version`, optional `/api/health`, and optional `/__version`. Localhost and route-equivalent proof are not staging proof.

## Kill Switch

Use the staging-only AI estimate kill switch flag. It must block new AI estimate creation while preserving approved history, old PDF reads, and old buyer package reads.

Run:

```bash
npx tsx scripts/estimate/rehearseStagingAiEstimateKillSwitch.ts
```

## Rollback

Rollback only staging pilot flags. Do not run destructive migrations. Approved history and the sandbox ledger must remain readable.

Run:

```bash
npx tsx scripts/estimate/rehearseStagingAiEstimateRollback.ts
```

## Approved History And Artifacts

Use the durable ledger sandbox audit to verify draft creation, revision append, approval idempotency, approved history pagination, PDF refs, and buyer package refs:

```bash
npx tsx scripts/estimate/auditStagingDurableLedgerSandbox.ts
```

## Telemetry

Use the staging telemetry namespace `rik-staging`. Full prompts, raw tokens, phone numbers, email addresses, and token-like values must be redacted.

```bash
npx tsx scripts/estimate/auditStagingAiEstimateObservability.ts
```

## Redacted Support Bundle

Collect only generated summaries from `.release-runtime/ai-estimate-staging-release-candidate-operations-seal`. Do not include `.env`, tokens, raw prompts, raw PDFs, screenshots, logs with secrets, or production DB dumps.

## Production DB

Do not connect to, migrate, write, dump, or inspect production DB as part of this staging RC seal. If staging URL, source SHA, storage isolation, or Android emulator evidence is missing, report STOP with blocking reasons.
