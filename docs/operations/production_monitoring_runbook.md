# Production Monitoring Runbook

S-DASH-1 adds local, read-only dashboard/report generation for production health.

## Commands

```bash
node scripts/monitoring/checkProductionHealth.mjs --target production --dry-run
node scripts/monitoring/production-health-dashboard.js --window 24h --out artifacts/S_DASH_1_production_health_snapshot.json
```

## Required Environment

- `PROD_SUPABASE_URL`
- `PROD_SUPABASE_READONLY_KEY`

If either key is missing, the scripts must report `env_missing` and must not fall back to app config, anon keys, or service-role keys.

## Covered Signals

- `app_errors` totals and top domains.
- Release lineage from `updateGroupId` and `runtimeVersion` fields when present.
- Offline queue/replay and circuit-breaker signals from redacted app error contexts/messages.
- Realtime duplicate/budget/leak signals from redacted app error contexts/messages.
- PDF/WebView/document failure signals.
- RPC validation and JSON/storage corruption signals.

## Safety Rules

- Do not run production writes.
- Do not print or commit secrets.
- Do not log raw signed URLs, tokens, queue payloads, or document contents.
- Use only explicit read-only production credentials provided through environment variables.
- If read-only production access is unavailable, keep the status as `env_missing` and open S-DASH-1B for live verification.
